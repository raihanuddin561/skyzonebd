import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { validateStockAdjustment } from '@/utils/stockCalculations';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * POST /api/admin/stock/adjust
 * Adjust stock levels for a product
 * Creates InventoryLog entries and updates stock atomically
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    const body = await request.json();
    const {
      productId,
      adjustmentType, // 'add', 'remove', 'set'
      quantity,
      reason,
      notes,
    } = body;

    // Validate inputs
    if (!productId || !adjustmentType || quantity === undefined || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, adjustmentType, quantity, reason' },
        { status: 400 }
      );
    }

    // Fetch current product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const currentStock = product.stockQuantity || 0;

    // Validate adjustment
    const validation = validateStockAdjustment(
      currentStock,
      quantity,
      adjustmentType as 'add' | 'remove' | 'set',
      reason
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Perform stock adjustment in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update product stock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          stockQuantity: validation.newStock,
        },
        select: {
          id: true,
          name: true,
          sku: true,
          stockQuantity: true,
        },
      });

      // Create inventory log
      const inventoryLog = await tx.inventoryLog.create({
        data: {
          productId,
          action: 'ADJUSTMENT', // Use ADJUSTMENT for manual stock changes
          quantity: adjustmentType === 'remove' ? -quantity : quantity,
          previousStock: currentStock,
          newStock: validation.newStock,
          notes: `${reason}${notes ? ' - ' + notes : ''}`,
          performedBy: admin.id,
        },
      });

      return {
        product: updatedProduct,
        log: inventoryLog,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Stock adjusted successfully',
      previousStock: currentStock,
      newStock: validation.newStock,
      adjustment: quantity,
      product: result.product,
      log: result.log,
    });

  } catch (error) {
    console.error('❌ Error adjusting stock:', error);

    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { 
        error: 'Failed to adjust stock',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
