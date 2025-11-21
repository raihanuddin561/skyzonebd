import { NextRequest, NextResponse } from 'next/server';
import { verify, JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logActivity } from '@/lib/activityLogger';

const prisma = new PrismaClient();

interface DecodedToken extends JwtPayload {
  userId: string;
  role: string;
}

/**
 * POST /api/orders/cancel
 * Cancel an order
 * Can be done by admin or the customer who placed the order
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📥 POST /api/orders/cancel - Request received');
    
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

    const body = await request.json();
    const { orderId, reason } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true
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

    // Check authorization
    const isAdmin = decoded.role.toUpperCase() === 'ADMIN';
    const isOrderOwner = order.userId === decoded.userId;

    if (!isAdmin && !isOrderOwner) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to cancel this order' },
        { status: 403 }
      );
    }

    // Check if order can be cancelled
    if (order.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Order is already cancelled' },
        { status: 400 }
      );
    }

    if (order.status === 'DELIVERED') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel a delivered order. Please request a return instead.' },
        { status: 400 }
      );
    }

    // Cancel the order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: decoded.userId,
        cancellationReason: reason || 'No reason provided'
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });

    // Restore stock for cancelled order items
    console.log('📦 Restoring stock for cancelled order items...');
    for (const item of updatedOrder.orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            increment: item.quantity
          }
        }
      });
      console.log(`  ✅ Stock restored for ${item.product.name}: +${item.quantity}`);
    }

    // Get user info for logging
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { name: true }
    });

    // Log cancellation activity
    await logActivity({
      userId: decoded.userId,
      userName: user?.name || (isAdmin ? 'Admin' : 'Customer'),
      action: 'CANCEL',
      entityType: 'Order',
      entityId: updatedOrder.id,
      entityName: updatedOrder.orderNumber,
      description: `${isAdmin ? 'Admin' : 'Customer'} cancelled order ${updatedOrder.orderNumber}${reason ? `: ${reason}` : ''}`,
      metadata: {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        cancelledBy: isAdmin ? 'admin' : 'customer',
        reason: reason || 'No reason provided',
        orderTotal: updatedOrder.total,
        itemsCount: updatedOrder.orderItems.length
      },
      request
    });

    console.log('✅ Order cancelled successfully:', {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      cancelledBy: isAdmin ? 'admin' : 'customer',
      reason: reason || 'No reason provided'
    });

    // Format response
    const responseOrder = {
      id: updatedOrder.id,
      orderId: updatedOrder.orderNumber,
      orderNumber: updatedOrder.orderNumber,
      userId: updatedOrder.userId,
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
      cancelledAt: updatedOrder.cancelledAt?.toISOString(),
      cancellationReason: updatedOrder.cancellationReason,
      createdAt: updatedOrder.createdAt.toISOString(),
      updatedAt: updatedOrder.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: responseOrder,
      message: 'Order cancelled successfully. Stock has been restored.'
    });

  } catch (error) {
    console.error('Cancel Order API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
