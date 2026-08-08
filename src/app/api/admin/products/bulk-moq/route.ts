import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

/**
 * PATCH /api/admin/products/bulk-moq
 * Sets the Minimum Order Quantity (MOQ) across many products at once —
 * either a specific selection (`productIds`) or every product in the
 * catalog (`applyToAll`). Complements the existing per-product MOQ field on
 * the product edit page for bulk catalog maintenance.
 */
export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    const body = await request.json();
    const { productIds, applyToAll, minOrderQuantity } = body;

    if (!Number.isFinite(minOrderQuantity) || minOrderQuantity < 1 || !Number.isInteger(minOrderQuantity)) {
      return NextResponse.json(
        { success: false, error: 'minOrderQuantity must be a whole number of at least 1' },
        { status: 400 }
      );
    }

    if (!applyToAll && (!Array.isArray(productIds) || productIds.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Provide productIds to update a selection, or set applyToAll to update every product' },
        { status: 400 }
      );
    }

    const where = applyToAll ? {} : { id: { in: productIds as string[] } };

    const result = await prisma.product.updateMany({
      where,
      data: { moq: minOrderQuantity },
    });

    await logActivity({
      userId: admin.id,
      userName: admin.name,
      action: 'UPDATE',
      entityType: 'Product',
      entityName: applyToAll ? 'All Products' : `${result.count} selected products`,
      description: applyToAll
        ? `Set Minimum Order Quantity to ${minOrderQuantity} for all ${result.count} products in the catalog`
        : `Set Minimum Order Quantity to ${minOrderQuantity} for ${result.count} selected products`,
      metadata: {
        applyToAll: Boolean(applyToAll),
        productIds: applyToAll ? undefined : productIds,
        minOrderQuantity,
        updatedCount: result.count,
      },
      request,
    });

    return NextResponse.json({
      success: true,
      data: { updatedCount: result.count },
      message: `Updated Minimum Order Quantity for ${result.count} product${result.count === 1 ? '' : 's'}`,
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Bulk MOQ Update Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update Minimum Order Quantity' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
