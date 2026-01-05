import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper to verify JWT and check admin role
function verifyAdmin(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'No authorization token', userId: null };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string; role: string };

    if (decoded.role.toUpperCase() !== 'ADMIN') {
      return { authorized: false, error: 'Admin access required', userId: null };
    }

    return { authorized: true, userId: decoded.userId };
  } catch {
    return { authorized: false, error: 'Invalid token', userId: null };
  }
}

// Generate unique order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

// POST - Admin creates order manually
export async function POST(request: NextRequest) {
  try {
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const {
      customerId,
      items, // Array of { productId, quantity, customPrice? }
      shippingAddress,
      billingAddress,
      paymentMethod,
      notes,
      shipping = 0,
      tax = 0,
      status = 'PENDING'
    } = body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order items are required' },
        { status: 400 }
      );
    }

    if (!shippingAddress || !billingAddress) {
      return NextResponse.json(
        { success: false, error: 'Shipping and billing addresses are required' },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Payment method is required' },
        { status: 400 }
      );
    }

    // Verify customer if provided
    let customer = null;
    let customerDiscount = 0;
    
    if (customerId) {
      customer = await prisma.user.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          discountPercent: true,
          discountValidUntil: true
        }
      });

      if (!customer) {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }
      
      // Apply customer discount if valid
      if (customer.discountPercent && customer.discountPercent > 0) {
        if (!customer.discountValidUntil || customer.discountValidUntil > new Date()) {
          customerDiscount = customer.discountPercent;
          console.log(`💰 Customer discount applied: ${customerDiscount}%`);
        }
      }
    }

    // Validate and calculate items
    let subtotal = 0;
    const orderItemsData = [];

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid item data' },
          { status: 400 }
        );
      }

      // Get product details
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: {
          id: true,
          name: true,
          wholesalePrice: true,
          stockQuantity: true,
          customerPricing: customerId ? {
            where: {
              userId: customerId,
              isActive: true,
              OR: [
                { validUntil: null },
                { validUntil: { gte: new Date() } }
              ]
            }
          } : false
        }
      });

      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product ${item.productId} not found` },
          { status: 404 }
        );
      }

      // Check stock availability
      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}` },
          { status: 400 }
        );
      }

      // Determine price: custom price > customer-specific price > product wholesale price
      let itemPrice = product.wholesalePrice;
      
      if (item.customPrice !== undefined && item.customPrice !== null) {
        // Admin provided custom price for this order
        itemPrice = item.customPrice;
      } else if (customerId && product.customerPricing && product.customerPricing.length > 0) {
        // Use customer-specific pricing if available
        itemPrice = product.customerPricing[0].customPrice;
      }
      
      // Apply customer discount to the item price if no custom price
      if (item.customPrice === undefined && customerDiscount > 0) {
        itemPrice = itemPrice * (1 - customerDiscount / 100);
      }

      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        price: itemPrice,
        total: itemTotal
      });
    }

    const total = subtotal + shipping + tax;

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: customerId || null,
        subtotal,
        tax,
        shipping,
        total,
        status,
        paymentStatus: 'PENDING',
        paymentMethod,
        shippingAddress,
        billingAddress,
        notes,
        orderItems: {
          create: orderItemsData
        }
      },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                sku: true
              }
            }
          }
        }
      }
    });

    // Update stock quantities
    for (const item of orderItemsData) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: item.quantity
          }
        }
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: auth.userId!,
        userName: 'Admin',
        action: 'CREATE',
        entityType: 'Order',
        entityId: order.id,
        entityName: order.orderNumber,
        description: `Manually created order ${order.orderNumber}${customer ? ` for ${customer.name}` : ''}`,
        metadata: {
          customerId: customerId,
          itemCount: items.length,
          total: total
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.userId,
        customerName: customer?.name,
        items: order.orderItems.map(item => ({
          productId: item.productId,
          name: item.product.name,
          imageUrl: item.product.imageUrl,
          sku: item.product.sku,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        })),
        subtotal: order.subtotal,
        shipping: order.shipping,
        tax: order.tax,
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
      },
      message: 'Order created successfully'
    });

  } catch (error) {
    console.error('Create Order Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
