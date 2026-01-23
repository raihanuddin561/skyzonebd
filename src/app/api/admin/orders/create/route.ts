import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken, type AdminAuthResult } from '@/lib/auth';

// Use shared auth helper
const verifyAdmin = verifyAdminToken;

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

        }
      }
    }

    // Validate and calculate items
    let subtotal = 0;
    const orderItemsData: Array<{
      productId: string;
      quantity: number;
      price: number;
      total: number;
      costPerUnit: number;
      profitPerUnit: number;
      totalProfit: number;
      profitMargin: number;
    }> = [];

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
          basePrice: true,
          costPerUnit: true,
          platformProfitPercentage: true
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

      // Determine price: custom price > product wholesale price
      let itemPrice = product.wholesalePrice;
      
      if (item.customPrice !== undefined && item.customPrice !== null) {
        // Admin provided custom price for this order
        itemPrice = item.customPrice;
      }
      
      // Apply customer discount to the item price if no custom price
      if (item.customPrice === undefined && customerDiscount > 0) {
        itemPrice = itemPrice * (1 - customerDiscount / 100);
      }

      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      // Calculate profit metrics (snapshot at order time)
      const costPerUnit = product.costPerUnit || product.basePrice;
      const profitPerUnit = itemPrice - costPerUnit;
      const totalProfit = profitPerUnit * item.quantity;
      const profitMargin = itemTotal > 0 ? (totalProfit / itemTotal) * 100 : 0;

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        price: itemPrice,
        total: itemTotal,
        // Snapshot profit configuration
        costPerUnit: costPerUnit,
        profitPerUnit: profitPerUnit,
        totalProfit: totalProfit,
        profitMargin: profitMargin
      });
    }

    const total = subtotal + shipping + tax;

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Create order, update stock, and log activity in a single transaction
    const order: any = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
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
            create: orderItemsData.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              total: item.total,
              costPerUnit: item.costPerUnit,
              profitPerUnit: item.profitPerUnit,
              totalProfit: item.totalProfit,
              profitMargin: item.profitMargin
            }))
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
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: auth.userId!,
          userName: 'Admin',
          action: 'CREATE',
          entityType: 'Order',
          entityId: newOrder.id,
          entityName: newOrder.orderNumber,
          description: `Manually created order ${newOrder.orderNumber}${customer ? ` for ${customer.name}` : ''}`,
          metadata: {
            customerId: customerId,
            itemCount: items.length,
            total: total
          }
        }
      });
      
      return newOrder;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.userId,
        customerName: customer?.name,
        items: (order.orderItems).map((item: any) => ({
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
