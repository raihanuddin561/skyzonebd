import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { validateStockAdjustment } from '@/utils/stockCalculations';
import { addStockLot } from '@/services/inventoryService';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

/**
 * Deplete real stock lots FIFO (oldest purchaseDate first) for a
 * 'remove'/decreasing-'set' correction (damage, shrinkage, recount write-off)
 * — mirrors how `depleteStockLotsForSale` in inventoryService.ts consumes
 * lots for a sale, but this is a correction, not a sale: no StockAllocation
 * (that ties a depletion to an order/orderItem, which doesn't apply here),
 * and Product.stockQuantity's decrement (already validated by the caller
 * via `validateStockAdjustment`) remains the authoritative availability
 * check. If the removed quantity exceeds what's available across all lots
 * (pre-existing drift — Product.stockQuantity higher than real lot backing),
 * deplete whatever lot quantity IS available and don't error out, exactly
 * matching depleteStockLotsForSale's own documented behavior for products
 * with a lot-tracking coverage gap.
 */
async function depleteLotsForCorrection(
  tx: Prisma.TransactionClient,
  productId: string,
  quantityToRemove: number
): Promise<void> {
  if (quantityToRemove <= 0) return;

  const lots = await tx.stockLot.findMany({
    where: { productId, quantityRemaining: { gt: 0 } },
    orderBy: { purchaseDate: 'asc' },
  });

  let remaining = quantityToRemove;
  for (const lot of lots) {
    if (remaining <= 0) break;
    const qtyToDeplete = Math.min(remaining, lot.quantityRemaining);

    await tx.stockLot.update({
      where: { id: lot.id },
      data: { quantityRemaining: { decrement: qtyToDeplete } },
    });

    remaining -= qtyToDeplete;
  }
}


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

        // Keep StockLot.quantityRemaining in sync with Product.stockQuantity
        // for corrections, so the two stop drifting apart.
        if (adjustmentType === 'remove') {
          await depleteLotsForCorrection(tx, productId, quantity);
        } else if (adjustmentType === 'set') {
          const delta = validation.newStock - currentStock;
          if (delta < 0) {
            // Recount found LESS than expected — deplete lots FIFO for the
            // shortfall, same as 'remove'.
            await depleteLotsForCorrection(tx, productId, Math.abs(delta));
          }
          // A positive 'set' delta (recount found MORE than expected) is
          // intentionally left untouched on the lot side: we have no cost
          // basis for the extra units and inventing one would corrupt
          // future weighted-average-cost calculations. Administrators
          // should use 'add' (with a real cost per unit) instead of 'set'
          // when the intent is genuinely adding new stock — 'set' is meant
          // for recount corrections. This is a documented limitation, not
          // fixed here.
        }

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
