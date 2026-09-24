import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { autoGenerateProfitReport } from '@/utils/profitReportGeneration';
import { requireAdmin, requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';
import { logInfo, logError } from '@/lib/logger';
import { restoreStockForCancelledOrder } from '@/services/inventoryService';
import { emailService } from '@/lib/email';
import { isAllowedOrderStatusTransition, resolveOrderStatusUpdate } from '@/lib/orderStatusTransitions';

// Full PaymentStatus enum (prisma/schema.prisma) — the bulk PATCH
// /api/orders endpoint's whitelist is intentionally narrower (a known,
// separate gap); this endpoint validates against the real, complete list.
const VALID_PAYMENT_STATUSES = ['PENDING', 'PENDING_VERIFICATION', 'PAID', 'PARTIAL', 'FAILED', 'REFUNDED'];

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


// GET - Get single order details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const orderInclude = {
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
      },
      payments: {
        select: {
          amount: true,
          status: true
        }
      }
    };

    // Accept either the internal id or the human-readable order number (e.g.
    // the checkout/order-confirmation flow only has the order number on
    // hand) — try the id first since that's the common case everywhere else
    // in the app, then fall back to a orderNumber lookup.
    let order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) {
      order = await prisma.order.findUnique({ where: { orderNumber: id }, include: orderInclude });
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Guest orders (no linked account — order.userId is null) are readable
    // by anyone holding the order id, since there is no account to
    // authenticate against; this is how guest-checkout customers view their
    // own order today. Orders placed by a registered user require the
    // requester to be that user or an admin — this order previously had no
    // auth check at all, leaking customer PII to anyone with the order id.
    if (order.userId) {
      const authUser = await requireAuth(request);
      const isOwner = order.userId === authUser.id;
      if (!isOwner && !isAdmin(authUser.role as UserRole)) {
        return NextResponse.json(
          { success: false, error: 'You are not authorized to view this order' },
          { status: 403 }
        );
      }
    }

    // Real amount paid/due from actual Payment records — the order-detail
    // page used to show a fabricated 60%/40% paid/due split as a
    // "placeholder" for PARTIAL orders, presenting made-up numbers as fact.
    const amountPaid = order.payments
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);
    const amountDue = Math.max(0, order.total - amountPaid);

    // Format response
    const formattedOrder = {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      guestInfo: order.guestName ? {
        name: order.guestName,
        email: order.guestEmail,
        mobile: order.guestPhone
      } : null,
      items: order.orderItems.map(item => ({
        id: item.id,
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
      paymentReference: order.paymentReference,
      paymentProofUrl: order.paymentProofUrl,
      paymentVerifiedAt: order.paymentVerifiedAt?.toISOString() || null,
      paymentVerifiedBy: order.paymentVerifiedBy,
      paymentNotes: order.paymentNotes,
      notes: order.notes,
      subtotal: order.subtotal,
      shipping: order.shipping,
      tax: order.tax,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      amountPaid,
      amountDue,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: formattedOrder
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Get Order Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

// PATCH - Update order status (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const admin = await requireAdmin(request);

    const { id } = await params;
    const body = await request.json();

    // Validate order exists
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { orderItems: true }
    });

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update order — the transition/payment-gate decision logic is shared
    // with PATCH /api/orders (see resolveOrderStatusUpdate's doc comment)
    // so the two endpoints can't silently drift apart again.
    const resolved = resolveOrderStatusUpdate({
      requestedStatus: body.status,
      requestedPaymentStatus: body.paymentStatus,
      currentStatus: existingOrder.status,
      paymentMethod: existingOrder.paymentMethod,
      currentPaymentStatus: existingOrder.paymentStatus,
      validPaymentStatuses: VALID_PAYMENT_STATUSES,
    });

    if (!resolved.ok) {
      return NextResponse.json({ success: false, error: resolved.error }, { status: resolved.statusCode });
    }

    const updateData: any = { ...resolved.updateData };
    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    const isCancelling = resolved.isCancelling;

    let updatedOrder;
    try {
      updatedOrder = await prisma.$transaction(async (tx) => {
        // Cancelling via this dropdown must restore stock exactly like the
        // dedicated cancel endpoints — previously this just flipped the
        // status column with no inventory reversal at all, silently
        // corrupting stock counts for every admin-dropdown cancellation.
        if (isCancelling) {
          // Guarded updateMany re-checks the order isn't already CANCELLED
          // at write time — the same race class already fixed for
          // returns/refunds (admin/returns/[id]/route.ts and .../refund/
          // route.ts). Without this, two concurrent cancel requests for the
          // same order could both pass the plain findUnique read above and
          // both restore stock, double-crediting it back into inventory.
          const guard = await tx.order.updateMany({
            where: { id, status: { not: 'CANCELLED' } },
            data: updateData,
          });
          if (guard.count === 0) {
            throw new Error('ORDER_ALREADY_CANCELLED');
          }

          await restoreStockForCancelledOrder(tx, id, existingOrder.orderItems, admin.id, existingOrder.orderNumber);

          return tx.order.findUniqueOrThrow({
            where: { id },
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
              },
              user: {
                select: { email: true }
              }
            }
          });
        }

        return tx.order.update({
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
            },
            user: {
              select: { email: true }
            }
          }
        });
      });
    } catch (txError) {
      if (txError instanceof Error && txError.message === 'ORDER_ALREADY_CANCELLED') {
        return NextResponse.json(
          { success: false, error: 'This order was already cancelled by another request' },
          { status: 409 }
        );
      }
      throw txError;
    }

    // Auto-generate profit report if order is now DELIVERED
    if (updateData.status === 'DELIVERED' && existingOrder.status !== 'DELIVERED') {
      const profitResult = await autoGenerateProfitReport(updatedOrder.id);
      if (profitResult.success) {
        if (profitResult.ledgerPosted === false) {
          logError(profitResult.message, new Error('Ledger posting failed'), 'Orders API');
        } else {
          logInfo(profitResult.message, 'Orders API');
        }
      } else {
        logError(`Profit report generation did not succeed for order ${updatedOrder.id}`, new Error(profitResult.message), 'Orders API');
      }
    }

    // Best-effort shipped/delivered notification email (Amazon-style
    // gap-closure Phase 4 part 1) — same transition-detection idiom as the
    // DELIVERED -> autoGenerateProfitReport hook above.
    if (
      (updateData.status === 'SHIPPED' && existingOrder.status !== 'SHIPPED') ||
      (updateData.status === 'DELIVERED' && existingOrder.status !== 'DELIVERED')
    ) {
      const recipientEmail = updatedOrder.user?.email || updatedOrder.guestEmail;
      if (recipientEmail) {
        const emailResult = await emailService.sendOrderStatusUpdate(recipientEmail, updatedOrder.orderNumber, updateData.status);
        if (!emailResult.success) {
          console.error(`Order status email failed for order ${updatedOrder.orderNumber}: ${emailResult.error}`);
        }
      }
    }

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
    if (error instanceof Response) {
      return error;
    }
    console.error('Update Order Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const admin = await requireAdmin(request);

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

    // Shares the same transition rule as every other cancellation-capable
    // endpoint (POST /api/orders/cancel, the status-dropdown PATCH-to-
    // CANCELLED branches) via ALLOWED_ORDER_STATUS_TRANSITIONS as the single
    // source of truth — previously this only blocked SHIPPED/DELIVERED,
    // silently allowing an IN_TRANSIT order (a physical package already in
    // a courier's hands) to be cancelled here even though every other
    // cancellation endpoint blocks it.
    if (!isAllowedOrderStatusTransition(order.status, 'CANCELLED')) {
      return NextResponse.json(
        { success: false, error: `Cannot cancel an order with status ${order.status}` },
        { status: 400 }
      );
    }

    // Restore stock and update the order status atomically. The previous
    // read-then-write (`findUnique` then `stockQuantity: product.stockQuantity
    // + item.quantity`) was both non-atomic (a failure partway through a
    // multi-item order left some products restored and others not, with the
    // order never marked cancelled) and race-prone (two concurrent
    // cancellations could read the same stale stockQuantity and lose an
    // update). Atomic `increment` inside one transaction fixes both.
    let cancelledOrder;
    try {
      cancelledOrder = await prisma.$transaction(async (tx) => {
        // Guarded updateMany re-checks the order isn't already CANCELLED at
        // write time — the same concurrent-double-cancellation race already
        // fixed for returns/refunds (admin/returns/[id]/route.ts). Without
        // this, two concurrent DELETE calls for the same order could both
        // pass the plain findUnique read above and both restore stock,
        // double-crediting it back into inventory.
        const guard = await tx.order.updateMany({
          where: { id, status: { not: 'CANCELLED' } },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date()
          }
        });
        if (guard.count === 0) {
          throw new Error('ORDER_ALREADY_CANCELLED');
        }

        await restoreStockForCancelledOrder(tx, id, order.orderItems, admin.id, order.orderNumber);

        return tx.order.findUniqueOrThrow({ where: { id } });
      });
    } catch (txError) {
      if (txError instanceof Error && txError.message === 'ORDER_ALREADY_CANCELLED') {
        return NextResponse.json(
          { success: false, error: 'This order was already cancelled by another request' },
          { status: 409 }
        );
      }
      throw txError;
    }

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
    if (error instanceof Response) {
      return error;
    }
    console.error('Cancel Order Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel order' },
      { status: 500 }
    );
  }
}
