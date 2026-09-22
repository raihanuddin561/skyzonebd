import { NextRequest, NextResponse } from 'next/server';
import { PaymentStatus } from '@prisma/client';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger';
import { prisma } from '@/lib/prisma';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * PATCH /api/admin/orders/[id]/verify-payment
 * Admin verifies or rejects manual payment (bKash, Bank Transfer)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication (DB-verified role/isActive, not a raw JWT claim)
    const admin = await requireAdmin(request);

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
    const eligibleStatuses: PaymentStatus[] = ['PENDING_VERIFICATION', 'PENDING'];
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

    // A verified manual payment (bKash/bank transfer) previously only ever
    // flipped Order.paymentStatus — no Payment row was ever created for it.
    // That left GET /api/orders/[id]'s amountPaid/amountDue (computed by
    // summing real Payment rows) showing ৳0 paid for every order verified
    // this way, even though the customer's money had, in fact, been
    // received and confirmed. This only creates the Payment row itself —
    // it deliberately does NOT post a FinancialLedger revenue entry, since
    // this app recognizes order revenue at the DELIVERED transition
    // (createOrderLedgerEntries, triggered via autoGenerateProfitReport),
    // not at payment time. Posting a second REVENUE entry here would
    // double-count that order's revenue once delivered.
    //
    // The eligibility check above reads order.paymentStatus before this
    // transaction opens, so two concurrent/double-click verify calls could
    // both pass that check and both create a Payment row, double-recording
    // the payment. Guarding this update's `where` with the same
    // paymentStatus-in-eligibleStatuses condition and checking the affected
    // row count makes this the actual point that prevents double-verification:
    // if a concurrent request already changed the status, `count` is 0 here
    // and the whole transaction is rolled back instead of committing a
    // duplicate Payment.
    let updatedOrder;
    try {
      updatedOrder = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.order.updateMany({
          where: { id: orderId, paymentStatus: { in: eligibleStatuses } },
          data: updateData
        });

        if (updateResult.count === 0) {
          throw new Response(
            JSON.stringify({ success: false, error: 'Payment status already changed' }),
            { status: 409, headers: { 'Content-Type': 'application/json' } }
          );
        }

        const result = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          include: {
            orderItems: {
              include: {
                product: true
              }
            }
          }
        });

        if (status === 'PAID') {
          const validMethods = ['BANK_TRANSFER', 'BKASH', 'NAGAD', 'ROCKET', 'CREDIT_CARD', 'INVOICE_NET30', 'INVOICE_NET60', 'INVOICE_NET90', 'LC'];
          const normalizedMethod = order.paymentMethod?.toUpperCase();
          const paymentMethod = validMethods.includes(normalizedMethod || '') ? normalizedMethod : 'BANK_TRANSFER';

          await tx.payment.create({
            data: {
              orderId,
              amount: order.total,
              method: paymentMethod as any,
              status: 'PAID',
              transactionId: (order as any).paymentReference || undefined,
              notes: note || 'Manually verified by admin',
              receivedBy: admin.id,
              paidAt: new Date(),
              confirmedAt: new Date(),
            },
          });
        }

        return result;
      });
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      throw error;
    }

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
    if (error instanceof Response) {
      return error;
    }
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error while verifying payment' },
      { status: 500 }
    );
  }
}
