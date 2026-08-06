import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// Statuses that still count against a line's returnable quantity — a
// REQUESTED return is pending decision and must not be double-requested;
// APPROVED/REFUNDED are already committed. Only REJECTED/CANCELLED free up
// the quantity again.
const ACTIVE_RETURN_STATUSES = ['REQUESTED', 'APPROVED', 'REFUNDED'] as const;

// POST /api/orders/[id]/return — customer requests a return for one or more
// line items of a DELIVERED order. Item-level partial returns are
// supported: each line is validated against its own remaining returnable
// quantity (ordered minus already-active-returned), not the order as a
// whole. This only creates the request (REQUESTED) — approval/rejection and
// the refund itself are separate steps (see admin/returns/[id] and
// admin/returns/[id]/refund).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request);
    const { id: orderId } = await params;

    const body = await request.json();
    const { reason, items } = body;

    if (!reason || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'reason and at least one item are required' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    if (order.userId !== authUser.id) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to request a return for this order' },
        { status: 403 }
      );
    }

    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { success: false, error: 'Returns can only be requested for delivered orders' },
        { status: 400 }
      );
    }

    const orderItemsById = new Map(order.orderItems.map(item => [item.id, item]));

    // Already-active-returned quantity per order item, across all of this
    // order's existing returns.
    const existingReturnItems = await prisma.returnItem.findMany({
      where: {
        orderItemId: { in: items.map((i: any) => i.orderItemId) },
        return: { status: { in: [...ACTIVE_RETURN_STATUSES] } },
      },
      select: { orderItemId: true, quantity: true },
    });
    const alreadyReturnedByItem = new Map<string, number>();
    existingReturnItems.forEach(ri => {
      alreadyReturnedByItem.set(ri.orderItemId, (alreadyReturnedByItem.get(ri.orderItemId) || 0) + ri.quantity);
    });

    const returnItemsToCreate: Array<{ orderItemId: string; quantity: number; refundAmount: number }> = [];

    for (const requested of items) {
      const orderItem = orderItemsById.get(requested.orderItemId);
      if (!orderItem) {
        return NextResponse.json(
          { success: false, error: `Order item ${requested.orderItemId} does not belong to this order` },
          { status: 400 }
        );
      }
      const quantity = Number(requested.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json(
          { success: false, error: 'Each item quantity must be a positive integer' },
          { status: 400 }
        );
      }

      const alreadyReturned = alreadyReturnedByItem.get(orderItem.id) || 0;
      const remaining = orderItem.quantity - alreadyReturned;
      if (quantity > remaining) {
        return NextResponse.json(
          { success: false, error: `Requested quantity (${quantity}) exceeds remaining returnable quantity (${remaining}) for item ${orderItem.id}` },
          { status: 400 }
        );
      }

      returnItemsToCreate.push({
        orderItemId: orderItem.id,
        quantity,
        refundAmount: orderItem.price * quantity,
      });
    }

    const returnCount = await prisma.return.count();
    const returnNumber = `RET-${String(returnCount + 1).padStart(6, '0')}`;

    const newReturn = await prisma.return.create({
      data: {
        returnNumber,
        orderId: order.id,
        userId: authUser.id,
        reason,
        status: 'REQUESTED',
        items: { create: returnItemsToCreate },
      },
      include: { items: true },
    });

    return NextResponse.json({
      success: true,
      data: newReturn,
      message: `Return request ${returnNumber} submitted successfully`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error creating return request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create return request' },
      { status: 500 }
    );
  }
}
