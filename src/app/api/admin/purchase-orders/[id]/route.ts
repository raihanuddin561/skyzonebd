import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Valid manual status transitions. PARTIALLY_RECEIVED and RECEIVED are set
// automatically by POST /api/admin/purchase-orders/[id]/receive — never set
// directly here, since only the receive workflow knows the real per-item
// received quantities.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['CANCELLED'],
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: { select: { id: true, name: true, sku: true, stockQuantity: true } } } },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: purchaseOrder });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching purchase order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchase order' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (body.status !== undefined) {
      const allowed = ALLOWED_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: `Cannot transition a ${existing.status} purchase order to ${body.status}` },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.expectedDate !== undefined) updateData.expectedDate = body.expectedDate ? new Date(body.expectedDate) : null;

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });

    return NextResponse.json({ success: true, data: purchaseOrder, message: 'Purchase order updated successfully' });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error updating purchase order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update purchase order' },
      { status: 500 }
    );
  }
}
