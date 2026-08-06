import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { createRefundReversalEntries } from '@/lib/financialLedger';
import { emailService } from '@/lib/email';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// POST /api/admin/returns/[id]/refund — the distinct second step after
// approval (ADR-016): only from APPROVED, never a shortcut off REQUESTED.
// Creates the negative-Payment-row reversal (the one reusable pattern from
// the dead processRefund()) plus a full ledger reversal pair — a defect in
// that dead code, which only ever logged the cash-out and never reversed
// the original order's revenue/COGS entries.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const { paymentReference } = body;

    const existingReturn = await prisma.return.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true, orderNumber: true, userId: true, guestName: true, paymentMethod: true,
            orderItems: { select: { id: true, quantity: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
        items: { include: { orderItem: { select: { id: true, quantity: true, costPerUnit: true } } } },
      },
    });

    if (!existingReturn) {
      return NextResponse.json(
        { success: false, error: 'Return not found' },
        { status: 404 }
      );
    }

    if (existingReturn.status !== 'APPROVED') {
      return NextResponse.json(
        { success: false, error: `Cannot refund a return that is ${existingReturn.status} — it must be APPROVED first` },
        { status: 400 }
      );
    }

    const refundAmount = existingReturn.refundAmount ?? existingReturn.items.reduce((sum, i) => sum + i.refundAmount, 0);
    const returnedCOGS = existingReturn.items.reduce(
      (sum, i) => sum + (i.orderItem.costPerUnit || 0) * i.quantity,
      0
    );

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId: existingReturn.orderId,
          amount: -refundAmount,
          method: existingReturn.order.paymentMethod as any,
          status: 'REFUNDED',
          notes: `REFUND for return ${existingReturn.returnNumber}`,
          receivedBy: admin.id,
          paidAt: new Date(),
          confirmedAt: new Date(),
        },
      });

      const updatedReturn = await tx.return.update({
        where: { id },
        data: {
          status: 'REFUNDED',
          refundAmount,
          refundedBy: admin.id,
          refundedAt: new Date(),
          paymentReference: paymentReference || payment.id,
        },
      });

      return { payment, updatedReturn };
    });

    // Full ledger reversal — outside the row-update transaction above but
    // still before responding, since createRefundReversalEntries wraps its
    // own double-entry pair in a transaction (matching createOrderLedgerEntries's
    // existing convention elsewhere in this file).
    await createRefundReversalEntries({
      returnId: existingReturn.id,
      returnNumber: existingReturn.returnNumber,
      orderId: existingReturn.orderId,
      refundAmount,
      returnedCOGS,
      partyId: existingReturn.order.userId || undefined,
      partyName: existingReturn.order.userId ? existingReturn.user.name : existingReturn.order.guestName || 'Guest',
      createdBy: admin.id,
    });

    // Order.paymentStatus becomes REFUNDED only once every item on the
    // order has been returned+refunded — partial refunds stay fully
    // tracked on Return/ReturnItem without a new PARTIALLY_REFUNDED enum
    // value (per the confirmed scope; Order.status itself is never touched
    // here — it stays DELIVERED, since Return.status is its own independent
    // state machine).
    const allRefundedItems = await getAllRefundedQuantities(existingReturn.orderId);
    const fullyRefunded = existingReturn.order.orderItems.every(
      item => (allRefundedItems.get(item.id) || 0) >= item.quantity
    );
    if (fullyRefunded) {
      await prisma.order.update({
        where: { id: existingReturn.orderId },
        data: { paymentStatus: 'REFUNDED' },
      });
    }

    // Best-effort notification email.
    const emailResult = await emailService.sendReturnStatusUpdate(
      existingReturn.user.email,
      existingReturn.returnNumber,
      'REFUNDED',
      { refundAmount }
    );
    if (!emailResult.success) {
      console.error(`Return refunded email failed for ${existingReturn.user.email}: ${emailResult.error}`);
    }

    return NextResponse.json({
      success: true,
      data: result.updatedReturn,
      message: `Return ${existingReturn.returnNumber} refunded successfully`,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Process Refund Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process refund' },
      { status: 500 }
    );
  }
}

// Sums, per orderItemId, the quantity across all REFUNDED returns for this
// order — used to decide whether the whole order has now been refunded.
async function getAllRefundedQuantities(orderId: string): Promise<Map<string, number>> {
  const refundedItems = await prisma.returnItem.findMany({
    where: {
      return: { orderId, status: 'REFUNDED' },
    },
    select: { orderItemId: true, quantity: true },
  });
  const map = new Map<string, number>();
  refundedItems.forEach(ri => {
    map.set(ri.orderItemId, (map.get(ri.orderItemId) || 0) + ri.quantity);
  });
  return map;
}
