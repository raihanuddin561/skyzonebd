import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { emailService } from '@/lib/email';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

const RETURN_INCLUDE = {
  order: { select: { id: true, orderNumber: true } },
  user: { select: { id: true, name: true, email: true } },
  items: {
    include: {
      orderItem: {
        include: { product: { select: { id: true, name: true, imageUrl: true } } },
      },
    },
  },
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const existingReturn = await prisma.return.findUnique({
      where: { id },
      include: RETURN_INCLUDE,
    });

    if (!existingReturn) {
      return NextResponse.json(
        { success: false, error: 'Return not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: existingReturn });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Get Return Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch return' },
      { status: 500 }
    );
  }
}

// PATCH — admin decision on a REQUESTED return: APPROVED (restocks, no
// money movement) or REJECTED (records a reason, no stock/money movement).
// Refunding an APPROVED return is a distinct second step — see
// admin/returns/[id]/refund — mirroring Phase 3's maker-checker separation
// for partner payouts (ADR-016).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;

    const body = await request.json();
    const { status, rejectionReason } = body;

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return NextResponse.json(
        { success: false, error: 'status must be APPROVED or REJECTED' },
        { status: 400 }
      );
    }

    if (status === 'REJECTED' && !rejectionReason) {
      return NextResponse.json(
        { success: false, error: 'rejectionReason is required when rejecting a return' },
        { status: 400 }
      );
    }

    const existingReturn = await prisma.return.findUnique({
      where: { id },
      include: {
        items: { include: { orderItem: { select: { productId: true, quantity: true } } } },
      },
    });

    if (!existingReturn) {
      return NextResponse.json(
        { success: false, error: 'Return not found' },
        { status: 404 }
      );
    }

    if (existingReturn.status !== 'REQUESTED') {
      return NextResponse.json(
        { success: false, error: `Cannot decide a return that is already ${existingReturn.status}` },
        { status: 400 }
      );
    }

    // Both branches below re-guard the REQUESTED -> {APPROVED,REJECTED}
    // transition with a conditional updateMany INSIDE the transaction. The
    // plain existingReturn.status check above is only a fast/friendly error
    // for the common case — it does not close the race: two concurrent
    // PATCH calls on the same REQUESTED return could both pass that read
    // before either writes. Without this guard, two concurrent APPROVE
    // calls would both run the restock loop below and double-credit the
    // returned quantity back into stock.

    if (status === 'REJECTED') {
      let updated;
      try {
        updated = await prisma.$transaction(async (tx) => {
          const guard = await tx.return.updateMany({
            where: { id, status: 'REQUESTED' },
            data: { status: 'REJECTED', decidedBy: admin.id, decidedAt: new Date(), rejectionReason },
          });
          if (guard.count === 0) {
            throw new Error('RETURN_ALREADY_DECIDED');
          }
          return tx.return.findUniqueOrThrow({ where: { id }, include: RETURN_INCLUDE });
        });
      } catch (txError) {
        if (txError instanceof Error && txError.message === 'RETURN_ALREADY_DECIDED') {
          return NextResponse.json(
            { success: false, error: 'This return was already decided (possibly by a concurrent request)' },
            { status: 409 }
          );
        }
        throw txError;
      }

      const emailResult = await emailService.sendReturnStatusUpdate(
        updated.user.email, updated.returnNumber, 'REJECTED', { rejectionReason }
      );
      if (!emailResult.success) {
        console.error(`Return rejected email failed for ${updated.user.email}: ${emailResult.error}`);
      }

      return NextResponse.json({ success: true, data: updated, message: 'Return rejected' });
    }

    // APPROVED: restock each returned line and log the inventory movement,
    // all inside one transaction so a failure partway through never leaves
    // stock updated without its InventoryLog entry (or vice versa).
    const totalRefundAmount = existingReturn.items.reduce((sum, item) => sum + item.refundAmount, 0);

    let updated;
    try {
      updated = await prisma.$transaction(async (tx) => {
        const guard = await tx.return.updateMany({
          where: { id, status: 'REQUESTED' },
          data: { status: 'APPROVED', decidedBy: admin.id, decidedAt: new Date(), refundAmount: totalRefundAmount },
        });
        if (guard.count === 0) {
          throw new Error('RETURN_ALREADY_DECIDED');
        }

        for (const item of existingReturn.items) {
          const product = await tx.product.findUnique({
            where: { id: item.orderItem.productId },
            select: { stockQuantity: true },
          });
          if (!product) continue;

          const previousStock = product.stockQuantity;
          const newStock = previousStock + item.quantity;

          await tx.product.update({
            where: { id: item.orderItem.productId },
            data: { stockQuantity: newStock },
          });

          await tx.inventoryLog.create({
            data: {
              productId: item.orderItem.productId,
              action: 'RETURN',
              quantity: item.quantity,
              previousStock,
              newStock,
              reference: existingReturn.returnNumber,
              notes: `Restocked from return ${existingReturn.returnNumber}`,
              performedBy: admin.id,
            },
          });
        }

        return tx.return.findUniqueOrThrow({ where: { id }, include: RETURN_INCLUDE });
      });
    } catch (txError) {
      if (txError instanceof Error && txError.message === 'RETURN_ALREADY_DECIDED') {
        return NextResponse.json(
          { success: false, error: 'This return was already decided (possibly by a concurrent request)' },
          { status: 409 }
        );
      }
      throw txError;
    }

    const emailResult = await emailService.sendReturnStatusUpdate(
      updated.user.email, updated.returnNumber, 'APPROVED', {}
    );
    if (!emailResult.success) {
      console.error(`Return approved email failed for ${updated.user.email}: ${emailResult.error}`);
    }

    return NextResponse.json({ success: true, data: updated, message: 'Return approved and restocked' });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Decide Return Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to decide return' },
      { status: 500 }
    );
  }
}
