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

    if (status === 'REJECTED') {
      const updated = await prisma.return.update({
        where: { id },
        data: {
          status: 'REJECTED',
          decidedBy: admin.id,
          decidedAt: new Date(),
          rejectionReason,
        },
        include: RETURN_INCLUDE,
      });

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

    const updated = await prisma.$transaction(async (tx) => {
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

      return tx.return.update({
        where: { id },
        data: {
          status: 'APPROVED',
          decidedBy: admin.id,
          decidedAt: new Date(),
          refundAmount: totalRefundAmount,
        },
        include: RETURN_INCLUDE,
      });
    });

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
