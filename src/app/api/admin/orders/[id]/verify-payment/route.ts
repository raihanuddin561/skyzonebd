import { NextRequest, NextResponse } from 'next/server';
import { verify, JwtPayload } from 'jsonwebtoken';
import { logActivity } from '@/lib/activityLogger';
import { prisma } from '@/lib/db';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


interface DecodedToken extends JwtPayload {
  userId: string;
  role: string;
}

/**
 * PATCH /api/admin/orders/[id]/verify-payment
 * Admin verifies or rejects manual payment (bKash, Bank Transfer)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Missing or invalid token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: DecodedToken;

    try {
      decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret') as DecodedToken;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (decoded.role !== 'ADMIN' && decoded.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get admin user details
    const admin = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin user not found' },
        { status: 404 }
      );
    }

    // Get order ID from params
    const { id: orderId } = await context.params;

    // Parse request body
    const body = await request.json();
    const { status, note } = body;

    // Validate status
    if (!status || !['PAID', 'FAILED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be PAID or FAILED' },
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

    // Check if order is eligible for payment verification
    const eligibleStatuses = ['PENDING_VERIFICATION', 'PENDING'];
    if (!eligibleStatuses.includes(order.paymentStatus)) {
      return NextResponse.json(
        { success: false, error: `Order payment status is ${order.paymentStatus}. Only PENDING_VERIFICATION orders can be verified.` },
        { status: 400 }
      );
    }

    // Update order payment status
    const updateData: any = {
      paymentStatus: status,
      paymentVerifiedAt: new Date(),
      paymentVerifiedBy: admin.id,
      paymentNotes: note || null,
    };
    
    // If payment is verified as PAID, also update order status if it's still PENDING
    if (status === 'PAID' && order.status === 'PENDING') {
      updateData.status = 'CONFIRMED';
    }
    
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

    // Log the verification activity
    const orderWithRef = order as any;
    await logActivity({
      userId: admin.id,
      userName: admin.name || admin.email,
      action: 'UPDATE',
      entityType: 'Order',
      entityId: order.id,
      entityName: order.orderNumber,
      description: status === 'PAID'
        ? `Payment verified and marked as PAID. Transaction ID: ${orderWithRef.paymentReference || 'N/A'}${note ? ` | Note: ${note}` : ''}`
        : `Payment verification FAILED/REJECTED. Transaction ID: ${orderWithRef.paymentReference || 'N/A'}${note ? ` | Reason: ${note}` : ''}`
    });

    const updatedOrderWithRef = updatedOrder as any;
    return NextResponse.json({
      success: true,
      message: `Payment ${status === 'PAID' ? 'verified successfully' : 'marked as failed'}`,
      data: {
        order: {
          id: updatedOrder.id,
          orderNumber: updatedOrder.orderNumber,
          paymentStatus: updatedOrder.paymentStatus,
          paymentMethod: updatedOrder.paymentMethod,
          paymentReference: updatedOrderWithRef.paymentReference || null,
          paymentVerifiedAt: updatedOrderWithRef.paymentVerifiedAt || null,
          paymentVerifiedBy: updatedOrderWithRef.paymentVerifiedBy || null,
          paymentNotes: updatedOrderWithRef.paymentNotes || null,
          status: updatedOrder.status,
          total: updatedOrder.total
        }
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while verifying payment' },
      { status: 500 }
    );
  }
}
