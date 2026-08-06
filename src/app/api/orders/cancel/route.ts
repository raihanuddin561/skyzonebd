import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin as isAdminRole } from '@/types/roles';
import { logActivity } from '@/lib/activityLogger';
import { prisma } from '@/lib/prisma';
import { releaseStockAllocationsForOrder } from '@/services/inventoryService';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

/**
 * POST /api/orders/cancel
 * Cancel an order
 * Can be done by admin or the customer who placed the order
 */
export async function POST(request: NextRequest) {
  try {
    // Canonical auth (ADR-009 / P2-9): previously a hand-rolled JWT decode +
    // `role.toUpperCase() === 'ADMIN'` check that excluded SUPER_ADMIN from
    // cancelling orders on another customer's behalf — the exact bug class
    // flagged (but not fixed) in P0-4's closure note. requireAuth + isAdmin()
    // correctly treats SUPER_ADMIN as admin-or-higher.
    const decoded = await requireAuth(request);

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
    const isAdmin = isAdminRole(decoded.role as UserRole);
    const isOrderOwner = order.userId === decoded.id;

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

    // Cancel the order and restore stock atomically — if any step fails
    // (including partway through restoring a multi-item order), the entire
    // cancellation rolls back rather than leaving the order marked
    // CANCELLED with only some items' stock restored.
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: decoded.id,
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

      for (const item of cancelled.orderItems) {
        const productBeforeRestore = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockQuantity: true },
        });
        const previousStock = productBeforeRestore?.stockQuantity ?? 0;

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantity
            }
          }
        });

        await tx.inventoryLog.create({
          data: {
            productId: item.productId,
            action: 'ADJUSTMENT',
            quantity: item.quantity,
            previousStock,
            newStock: previousStock + item.quantity,
            reference: orderId,
            notes: `Stock restored from cancelled order ${cancelled.orderNumber}`,
            performedBy: decoded.id,
          },
        });
      }

      // Release any stock-lot allocations this order consumed (Amazon-style
      // gap-closure Phase 1) — keeps StockLot.quantityRemaining consistent
      // with the Product.stockQuantity restoration above, rather than
      // leaving lots permanently under-reporting remaining stock after a
      // cancellation.
      await releaseStockAllocationsForOrder(tx, orderId);

      return cancelled;
    });

    // Get user info for logging
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { name: true }
    });

    // Log cancellation activity
    await logActivity({
      userId: decoded.id,
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
    if (error instanceof Response) {
      return error;
    }
    console.error('Cancel Order API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel order' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
