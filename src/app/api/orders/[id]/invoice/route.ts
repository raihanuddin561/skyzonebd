/**
 * GET /api/orders/[id]/invoice
 *
 * Fetches the Invoice for a NET30/60/90 order, if one exists (Amazon-style
 * gap-closure Phase 2 part 3) — feeds the customer-facing printable
 * invoice view and the fixed "Download Invoice" button in /orders.
 * Ownership check mirrors GET /api/orders/[id]: guest orders (no linked
 * account) are readable by anyone holding the order id; orders placed by
 * a registered user require the requester to be that user or an admin.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (order.userId) {
      const authUser = await requireAuth(request);
      const isOwner = order.userId === authUser.id;
      if (!isOwner && !isAdmin(authUser.role as UserRole)) {
        return NextResponse.json(
          { success: false, error: 'You are not authorized to view this invoice' },
          { status: 403 }
        );
      }
    }

    const invoice = await prisma.invoice.findUnique({
      where: { orderId: id },
      include: {
        order: {
          select: {
            orderNumber: true,
            createdAt: true,
            shippingAddress: true,
            billingAddress: true,
            subtotal: true,
            tax: true,
            shipping: true,
            total: true,
            orderItems: {
              select: {
                quantity: true,
                price: true,
                total: true,
                product: { select: { name: true, sku: true } },
              },
            },
          },
        },
        customer: { select: { name: true, email: true, phone: true, companyName: true } },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, error: 'This order has no invoice — only NET30/60/90 orders generate one' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoice' }, { status: 500 });
  }
}
