import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper to verify JWT and check admin role
function verifyAdmin(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'No authorization token' };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string; role: string };

    if (decoded.role !== 'ADMIN') {
      return { authorized: false, error: 'Admin access required' };
    }

    return { authorized: true, userId: decoded.userId };
  } catch {
    return { authorized: false, error: 'Invalid token' };
  }
}

// GET - Get single order details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const order = await prisma.order.findUnique({
      where: { id },
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
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Format response
    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
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
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: formattedOrder
    });

  } catch (error) {
    console.error('Get Order Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH - Update order status (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id }
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update order
    const updateData: any = {};
    
    if (body.status) {
      updateData.status = body.status.toUpperCase();
    }
    
    if (body.paymentStatus) {
      updateData.paymentStatus = body.paymentStatus.toUpperCase();
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        updatedAt: updatedOrder.updatedAt.toISOString()
      },
      message: 'Order updated successfully'
    });

  } catch (error) {
    console.error('Update Order Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Cancel order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const { id } = await params;

    // Check if order exists
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // If order is already shipped or delivered, don't allow cancellation
    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel shipped or delivered orders' },
        { status: 400 }
      );
    }

    // Restore stock for cancelled orders
    for (const item of order.orderItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      });

      if (product) {
        await prisma.product.update({
          where: { id: product.id },
          data: { stockQuantity: product.stockQuantity + item.quantity }
        });
      }
    }

    // Update order status to cancelled instead of deleting
    const cancelledOrder = await prisma.order.update({
      where: { id },
      data: { 
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: cancelledOrder.id,
        orderNumber: cancelledOrder.orderNumber,
        status: cancelledOrder.status
      },
      message: 'Order cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel Order Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
