import { NextRequest, NextResponse } from 'next/server';
import { verify, JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
    console.log('📥 POST /api/orders - Request received');
    const body = await request.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));
    
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

    // Check if user is authenticated
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret') as DecodedToken;
        userId = decoded.userId;
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

    // Calculate order totals
    const subtotal = items.reduce((sum: number, item: OrderItem) => 
      sum + (item.price * item.quantity), 0);
    
    const shipping = 50; // Fixed shipping cost
    const tax = subtotal * 0.05; // 5% tax
    const total = subtotal + shipping + tax;
    
    // Generate order number
    const orderNumber = `ORD-${Date.now()}`;
    
    // Log items and their productIds for debugging
    console.log('🔍 Processing order items:');
    items.forEach((item: OrderItem, index: number) => {
      console.log(`  Item ${index + 1}:`, {
        productId: item.productId,
        type: typeof item.productId,
        name: item.name,
        quantity: item.quantity
      });
    });
    
    // Verify all products exist in database before creating order
    console.log('🔍 Verifying products exist in database...');
    for (const item of items) {
      const productExists = await prisma.product.findUnique({
        where: { id: item.productId.toString() },
        select: { id: true, name: true }
      });
      
      if (!productExists) {
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
      console.log(`  ✅ Product found:`, productExists);
    }
    
    // Create order in database and deduct stock
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: userId || undefined,
        guestName: guestData?.name,
        guestEmail: guestData?.email,
        guestPhone: guestData?.mobile,
        guestCompany: guestData?.companyName,
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
          create: items.map((item: OrderItem) => ({
            productId: item.productId.toString(),
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
          }))
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
    console.log('📦 Deducting stock for order items...');
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId.toString() },
        select: { id: true, name: true, stockQuantity: true }
      });

      if (product) {
        const newStock = Math.max(0, product.stockQuantity - item.quantity);
        await prisma.product.update({
          where: { id: product.id },
          data: { stockQuantity: newStock }
        });
        console.log(`  ✅ Stock updated for ${product.name}: ${product.stockQuantity} → ${newStock}`);
      }
    }
    
    console.log('✅ Order created successfully in database:', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      isGuest: !userId,
      customerName: guestData?.name || 'Logged-in user',
      itemsCount: items.length,
      total: order.total
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
    console.log('📥 GET /api/orders - Request received');
    
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('⚠️ No auth header found');
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
    
    const userId = decoded.userId;
    const userRole = decoded.role;

    let dbOrders;
    // If admin, return all orders
    if (userRole === 'admin') {
      console.log('👑 Admin access - fetching all orders from database');
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
      console.log('📊 Admin fetching all orders:', {
        totalOrders: dbOrders.length,
        adminId: userId,
        orderIds: dbOrders.map(o => o.orderNumber)
      });
    } else {
      // Get user's orders only
      console.log('👤 User access - fetching user orders for:', userId);
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
      console.log('📦 User fetching their orders:', {
        userId,
        ordersFound: dbOrders.length
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
        mobile: order.guestPhone,
        companyName: order.guestCompany
      } : null,
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
    console.log('📥 PATCH /api/orders - Request received');
    
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

    // Only admin can update order status
    if (decoded.role !== 'admin') {
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

    console.log('✅ Order updated successfully:', {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      newStatus: updatedOrder.status,
      newPaymentStatus: updatedOrder.paymentStatus
    });

    // Format response
    const responseOrder = {
      id: updatedOrder.id,
      orderId: updatedOrder.orderNumber,
      orderNumber: updatedOrder.orderNumber,
      userId: updatedOrder.userId,
      guestInfo: updatedOrder.guestName ? {
        name: updatedOrder.guestName,
        email: updatedOrder.guestEmail,
        mobile: updatedOrder.guestPhone,
        companyName: updatedOrder.guestCompany
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