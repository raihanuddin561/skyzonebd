import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getPaginationParams, createPaginationResponse } from '@/lib/paginationHelper';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/admin/suppliers
 * List suppliers (Amazon-style gap-closure Phase 1 — replaces the free-text
 * StockLot.supplierName field with a real, queryable master-data entity).
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const { skip, take, page, limit } = getPaginationParams(searchParams);

    const where = activeOnly ? { isActive: true } : {};

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      prisma.supplier.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: suppliers,
      pagination: createPaginationResponse(total, page, limit),
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/suppliers
 * Create a new supplier.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { name, contactName, email, phone, address, paymentTerms, notes } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier name is required' },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactName: contactName || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        paymentTerms: paymentTerms || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(
      { success: true, data: supplier, message: 'Supplier created successfully' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error creating supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}
