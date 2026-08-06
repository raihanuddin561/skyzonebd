import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// GET /api/admin/returns — the return queue, filterable by status.
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const status = request.nextUrl.searchParams.get('status');
    const where = status && status !== 'all' ? { status: status as any } : {};

    const returns = await prisma.return.findMany({
      where,
      include: {
        order: { select: { id: true, orderNumber: true } },
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            orderItem: {
              include: { product: { select: { id: true, name: true, imageUrl: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: returns });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('List Returns Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch returns' },
      { status: 500 }
    );
  }
}
