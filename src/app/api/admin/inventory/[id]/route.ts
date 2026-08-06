import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { stockQuantity } = body;

    if (typeof stockQuantity !== 'number' || stockQuantity < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid stock quantity' },
        { status: 400 }
      );
    }

    // Update product stock and record the movement in the same transaction
    // — this is the audit trail (`InventoryLog`) every stock-quantity change
    // is supposed to produce; this route previously wrote none at all
    // (Amazon-style gap-closure Phase 0).
    const updatedProduct = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id },
        select: { stockQuantity: true, name: true },
      });

      if (!existing) {
        throw new Response(
          JSON.stringify({ success: false, error: 'Product not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const product = await tx.product.update({
        where: { id },
        data: {
          stockQuantity,
          availability: stockQuantity === 0
            ? 'out_of_stock'
            : stockQuantity <= 10
            ? 'limited'
            : 'in_stock',
          updatedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          availability: true,
        },
      });

      await tx.inventoryLog.create({
        data: {
          productId: id,
          action: 'ADJUSTMENT',
          quantity: stockQuantity - existing.stockQuantity,
          previousStock: existing.stockQuantity,
          newStock: stockQuantity,
          notes: 'Manual stock update via admin inventory page',
          performedBy: authUser.id,
        },
      });

      return product;
    });

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: `Stock updated to ${stockQuantity} for ${updatedProduct.name}`,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error updating stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update stock quantity' },
      { status: 500 }
    );
  }
}
