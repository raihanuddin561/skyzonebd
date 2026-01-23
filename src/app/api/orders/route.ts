import { NextRequest, NextResponse } from 'next/server';
import { verify, JwtPayload } from 'jsonwebtoken';
import { logActivity } from '@/lib/activityLogger';
import { prisma } from '@/lib/db';
import { autoGenerateProfitReport } from '@/utils/profitReportGeneration';
import { calculateItemPrice, validateCustomerDiscount } from '@/utils/pricingEngine';

interface DecodedToken extends JwtPayload {
  userId: string;
  role: string;
}

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      items, 
      shippingAddress, 
      billingAddress, 
      paymentMethod, 
      notes,
      // Guest checkout fields
      guestInfo
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order items are required' },
        { status: 400 }
      );
    }

    if (!shippingAddress || !billingAddress || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Shipping address, billing address, and payment method are required' },
        { status: 400 }
      );
    }

    let userId = null;
    let guestData = null;
    let customerDiscount = 0; // Customer's special discount percentage
    let user = null; // Store user info for later use

    // Check if user is authenticated
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret') as DecodedToken;
        userId = decoded.userId;
        
        // Get customer discount if user is logged in
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: { 
            discountPercent: true,
            discountValidUntil: true,
            discountReason: true
          }
        });
        
        // Apply discount if valid
        if (user && user.discountPercent && user.discountPercent > 0) {
          // Check if discount has not expired
          if (!user.discountValidUntil || user.discountValidUntil > new Date()) {
            customerDiscount = user.discountPercent;
          }
        }
      } catch {
        // Token invalid, treat as guest order
      }
    }

    // For guest checkout, validate guest info
    if (!userId) {
      if (!guestInfo || !guestInfo.name || !guestInfo.mobile) {
        return NextResponse.json(
          { success: false, error: 'Guest name and mobile number are required' },
          { status: 400 }
        );
      }
      guestData = {
        name: guestInfo.name,
        email: guestInfo.email || null,
        mobile: guestInfo.mobile,
        companyName: guestInfo.companyName || null
      };
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}`;
    
    // SERVER-SIDE PRICING ENFORCEMENT
    // Fetch all products with tiers and recalculate prices using pricing engine
    const productDataMap = new Map();
    const pricingResults = [];
    
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId.toString() },
        select: { 
          id: true, 
          name: true, 
          wholesalePrice: true,
          moq: true,
          stockQuantity: true,
          basePrice: true,
          costPerUnit: true,
          platformProfitPercentage: true,
          wholesaleTiers: {
            orderBy: { minQuantity: 'asc' }
          }
        }
      });
      
      if (!product) {
        console.error(`❌ Product not found in database: ${item.productId}`);
        const isNumericId = typeof item.productId === 'number' || !isNaN(Number(item.productId));
        const errorMsg = isNumericId 
          ? 'Your cart contains outdated product references. Please clear your cart and add products again.'
          : `Product with ID ${item.productId} not found in database`;
        
        return NextResponse.json(
          { success: false, error: errorMsg },
          { status: 400 }
        );
      }
      
      // Check stock availability
      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}` },
          { status: 400 }
        );
      }
      
      // Validate customer discount
      const discountValidation = validateCustomerDiscount(
        customerDiscount || 0,
        user?.discountValidUntil || null
      );
      
      // Calculate correct price using pricing engine (SERVER IS SOURCE OF TRUTH)
      const priceInfo = calculateItemPrice({
        product: {
          id: product.id,
          name: product.name,
          wholesalePrice: product.wholesalePrice,
          moq: product.moq || 1, // Default to 1 if not set
          wholesaleTiers: product.wholesaleTiers.map(tier => ({
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity,
            price: tier.price,
            discount: tier.discount,
            profitMargin: tier.profitMargin ?? undefined
          }))
        },
        quantity: item.quantity,
        customerDiscount: discountValidation.applicablePercent,
        customerDiscountValid: discountValidation.isValid
      });
      
      if (!priceInfo.meetsMinimum) {
        return NextResponse.json(
          { 
            success: false, 
            error: `${product.name} does not meet minimum order quantity of ${priceInfo.minimumRequired} units` 
          },
          { status: 400 }
        );
      }
      
      productDataMap.set(item.productId.toString(), {
        product,
        priceInfo
      });
      
      pricingResults.push(priceInfo);
    }
    
    // Calculate order totals using pricing engine results
    const subtotal = pricingResults.reduce((sum, info) => sum + info.subtotalBeforeDiscount, 0);
    const totalCustomerDiscount = pricingResults.reduce((sum, info) => sum + info.customerDiscountAmount, 0);
    const subtotalAfterDiscount = pricingResults.reduce((sum, info) => sum + info.finalTotal, 0);
    
    // Only add charges if configured by admin (via env vars)
    const shippingCharge = process.env.SHIPPING_CHARGE ? parseFloat(process.env.SHIPPING_CHARGE) : 0;
    const taxRate = process.env.TAX_RATE ? parseFloat(process.env.TAX_RATE) : 0;
    
    const shipping = shippingCharge;
    const tax = subtotalAfterDiscount * taxRate;
    const total = subtotalAfterDiscount + shipping + tax;
    
    // Create order in database and deduct stock in a single transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order with order items
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: userId || undefined,
          guestName: guestData?.name,
          guestEmail: guestData?.email,
          guestPhone: guestData?.mobile,
          subtotal,
          tax,
          shipping,
          total,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod,
          shippingAddress,
          billingAddress,
          notes: notes || undefined,
          orderItems: {
            create: items.map((item: OrderItem) => {
              const data = productDataMap.get(item.productId.toString());
              const { product, priceInfo } = data;
              
              // Calculate profit based on ACTUAL final price
              const costPerUnit = product.costPerUnit || product.basePrice || 0;
              const profitPerUnit = priceInfo.finalUnitPrice - costPerUnit;
              const totalProfit = profitPerUnit * item.quantity;
              const profitMargin = priceInfo.finalTotal > 0 
                ? (totalProfit / priceInfo.finalTotal) * 100 
                : 0;
              
              return {
                productId: item.productId.toString(),
                quantity: item.quantity,
                price: priceInfo.finalUnitPrice, // Use calculated price, not client price
                total: priceInfo.finalTotal,
                // Snapshot profit configuration (HIDDEN FROM CUSTOMERS)
                costPerUnit: costPerUnit,
                profitPerUnit: profitPerUnit,
                totalProfit: totalProfit,
                profitMargin: profitMargin,
                // Store original & tier info for audit
                originalPrice: priceInfo.basePrice,
                discountApplied: priceInfo.totalSavings / item.quantity,
                finalPrice: priceInfo.finalUnitPrice
              };
            })
          }
        },
        include: {
          orderItems: {
            include: {
              product: true
            }
          }
        }
      });

      // Deduct stock for each ordered item
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId.toString() },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        });
      }
      
      return newOrder;
    });
    
    // Log order creation activity
    await logActivity({
      userId: userId || 'guest',
      userName: guestData?.name || 'Customer',
      action: 'CREATE',
      entityType: 'Order',
      entityId: order.id,
      entityName: order.orderNumber,
      description: `Order created for ${order.orderItems.length} items. Total: ৳${total.toFixed(2)}${customerDiscount > 0 ? ` (${customerDiscount}% customer discount applied)` : ''}`
    });
    
    // Format response to match frontend expectations
    const responseOrder = {
      id: order.id,
      orderId: order.orderNumber,
      userId: order.userId,
      guestInfo: guestData,
      items: order.orderItems.map(item => ({
        productId: item.productId,
        name: item.product.name,
        price: item.price,
        quantity: item.quantity,
        total: item.total
      })),
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      paymentMethod: order.paymentMethod,
      notes: order.notes,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      status: order.status.toLowerCase(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: {
        order: responseOrder,
        message: 'Order placed successfully'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Create Order API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: DecodedToken;
    try {
      decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret') as DecodedToken;
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }
    
    const userId = decoded.userId;
    const userRole = decoded.role.toLowerCase(); // Case-insensitive role check

    let dbOrders;
    // If admin, return all orders
    if (userRole === 'admin' || userRole === 'super_admin') {
      dbOrders = await prisma.order.findMany({
        include: {
          orderItems: {
            include: {
              product: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Get user's orders only
      dbOrders = await prisma.order.findMany({
        where: {
          userId: userId
        },
        include: {
          orderItems: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }

    // Format orders to match frontend expectations
    const orders = dbOrders.map(order => ({
      id: order.id,
      orderId: order.orderNumber,
      userId: order.userId,
      guestInfo: order.guestName ? {
        name: order.guestName,
        email: order.guestEmail,
        mobile: order.guestPhone
      } : null,
      items: order.orderItems.map(item => ({
        productId: item.productId,
        name: item.product.name,
        imageUrl: item.product.imageUrl,
        sku: item.product.sku,
        price: item.price,
        quantity: item.quantity,
        total: item.total
      })),
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      paymentMethod: order.paymentMethod,
      notes: order.notes,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      status: order.status.toLowerCase(),
      paymentStatus: order.paymentStatus.toLowerCase(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: orders
    });

  } catch (error) {
    console.error('Get Orders API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: DecodedToken;
    try {
      decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret') as DecodedToken;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Only admin can update order status (case-insensitive check)
    if (decoded.role.toUpperCase() !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { orderId, status, paymentStatus } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Validate status values
    const validOrderStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const validPaymentStatuses = ['PENDING', 'PAID', 'FAILED'];

    if (status && !validOrderStatuses.includes(status.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: 'Invalid order status' },
        { status: 400 }
      );
    }

    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus.toUpperCase())) {
      return NextResponse.json(
        { success: false, error: 'Invalid payment status' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: {
      status?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
      paymentStatus?: 'PENDING' | 'PAID' | 'FAILED';
    } = {};
    if (status) updateData.status = status.toUpperCase() as 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    if (paymentStatus) updateData.paymentStatus = paymentStatus.toUpperCase() as 'PENDING' | 'PAID' | 'FAILED';

    // Get current order state before update
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, status: true, paymentStatus: true }
    });

    if (!currentOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });

    // Get admin user info for logging
    const admin = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { name: true }
    });

    // Log status change activity
    const changes: string[] = [];
    if (status && currentOrder.status !== updateData.status) {
      changes.push(`Order status: ${currentOrder.status} → ${updateData.status}`);
    }
    if (paymentStatus && currentOrder.paymentStatus !== updateData.paymentStatus) {
      changes.push(`Payment status: ${currentOrder.paymentStatus} → ${updateData.paymentStatus}`);
    }

    if (changes.length > 0) {
      await logActivity({
        userId: decoded.userId,
        userName: admin?.name || 'Admin',
        action: 'STATUS_CHANGE',
        entityType: 'Order',
        entityId: updatedOrder.id,
        entityName: updatedOrder.orderNumber,
        description: `Updated order ${updatedOrder.orderNumber}: ${changes.join(', ')}`,
        metadata: {
          orderId: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          oldStatus: currentOrder.status,
          newStatus: updatedOrder.status,
          oldPaymentStatus: currentOrder.paymentStatus,
          newPaymentStatus: updatedOrder.paymentStatus
        },
        request
      });
    }

    // Auto-generate profit report if order is now DELIVERED
    if (updateData.status === 'DELIVERED' && currentOrder.status !== 'DELIVERED') {
      const profitResult = await autoGenerateProfitReport(updatedOrder.id);
      if (profitResult.success) {
        console.log(profitResult.message);
      }
    }

    // Format response
    const responseOrder = {
      id: updatedOrder.id,
      orderId: updatedOrder.orderNumber,
      orderNumber: updatedOrder.orderNumber,
      userId: updatedOrder.userId,
      guestInfo: updatedOrder.guestName ? {
        name: updatedOrder.guestName,
        email: updatedOrder.guestEmail,
        mobile: updatedOrder.guestPhone
      } : null,
      items: updatedOrder.orderItems.map(item => ({
        productId: item.productId,
        name: item.product.name,
        price: item.price,
        quantity: item.quantity,
        total: item.total
      })),
      shippingAddress: updatedOrder.shippingAddress,
      billingAddress: updatedOrder.billingAddress,
      paymentMethod: updatedOrder.paymentMethod,
      notes: updatedOrder.notes,
      subtotal: updatedOrder.subtotal,
      shipping: updatedOrder.shipping,
      tax: updatedOrder.tax,
      total: updatedOrder.total,
      status: updatedOrder.status.toLowerCase(),
      paymentStatus: updatedOrder.paymentStatus.toLowerCase(),
      createdAt: updatedOrder.createdAt.toISOString(),
      updatedAt: updatedOrder.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: responseOrder,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    console.error('Update Order API Error:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}