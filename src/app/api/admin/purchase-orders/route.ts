import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getPaginationParams, createPaginationResponse } from '@/lib/paginationHelper';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function generatePoNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PO-${y}${m}${d}-${random}`;
}

/**
 * GET /api/admin/purchase-orders
 * List purchase orders (Amazon-style gap-closure Phase 1).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const supplierId = searchParams.get('supplierId');
    const { skip, take, page, limit } = getPaginationParams(searchParams);

    const where: any = {};
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          items: {
            include: { product: { select: { id: true, name: true, sku: true } } },
          },
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: purchaseOrders,
      pagination: createPaginationResponse(total, page, limit),
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching purchase orders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch purchase orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/purchase-orders
 * Create a new purchase order (status: DRAFT) with line items.
 * Body: { supplierId, expectedDate?, notes?, items: [{ productId, quantityOrdered, costPerUnit }] }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    const body = await request.json();
    const { supplierId, expectedDate, notes, items } = body;

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: 'Supplier is required' },
        { status: 400 }
      );
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one line item is required' },
        { status: 400 }
      );
    }
    for (const item of items) {
      if (!item.productId || !item.quantityOrdered || item.quantityOrdered <= 0 || item.costPerUnit === undefined || item.costPerUnit < 0) {
        return NextResponse.json(
          { success: false, error: 'Each item requires a productId, a positive quantityOrdered, and a non-negative costPerUnit' },
          { status: 400 }
        );
      }
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        poNumber: generatePoNumber(),
        supplierId,
        status: 'DRAFT',
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes: notes || null,
        createdBy: admin.id,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            costPerUnit: item.costPerUnit,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });

    return NextResponse.json(
      { success: true, data: purchaseOrder, message: 'Purchase order created successfully' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create purchase order' },
      { status: 500 }
    );
  }
}
