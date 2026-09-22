import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { validateStockAdjustment } from '@/utils/stockCalculations';
import { addStockLot } from '@/services/inventoryService';

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
      costPerUnit, // Required when adjustmentType === 'add' — this is a purchase/restock
      supplierName,
      purchaseOrderRef,
    } = body;

    // Validate inputs
    if (!productId || !adjustmentType || quantity === undefined || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, adjustmentType, quantity, reason' },
        { status: 400 }
      );
    }

    // Adding stock represents a real purchase — its cost must be recorded so
    // this batch is tracked as a proper StockLot (feeding accurate
    // weighted-average-cost for future sales) rather than a bare quantity
    // bump with no cost basis at all. 'remove'/'set' are corrections
    // (damage, recount, loss), not purchases, so they don't need a cost.
    if (adjustmentType === 'add') {
      if (typeof costPerUnit !== 'number' || !Number.isFinite(costPerUnit) || costPerUnit <= 0) {
        return NextResponse.json(
          { error: 'Cost per unit is required and must be a positive number when adding stock' },
          { status: 400 }
        );
      }
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

    // 'add' goes through addStockLot() — a real purchase creates a proper
    // StockLot (feeding future weighted-average-cost calculations), an
    // InventoryLog with action PURCHASE (not the generic ADJUSTMENT), and a
    // FinancialLedger DEBIT/INVENTORY entry, all inside its own transaction.
    // 'remove'/'set' stay a plain quantity change — they're corrections, not
    // purchases, so there's no cost/lot to record.
    let result: { product: { id: string; name: string; sku: string | null; stockQuantity: number }; log: unknown };

    if (adjustmentType === 'add') {
      const stockLot = await addStockLot({
        productId,
        quantity,
        costPerUnit,
        supplierName,
        purchaseOrderRef,
        notes: `${reason}${notes ? ' - ' + notes : ''}`,
        createdBy: admin.id,
      });
      const updatedProduct = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, sku: true, stockQuantity: true },
      });
      result = { product: updatedProduct!, log: stockLot };
    } else {
      result = await prisma.$transaction(async (tx) => {
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
    }

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
