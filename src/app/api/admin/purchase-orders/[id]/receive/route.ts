import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Mirrors services/inventoryService.ts's addStockLot() exactly (StockLot
 * create + Product.stockQuantity increment + InventoryLog + FinancialLedger
 * entries), but takes an already-open Prisma.TransactionClient instead of
 * opening its own `prisma.$transaction`. addStockLot() doesn't accept an
 * external transaction client, and this route needs every line item's
 * stock-lot creation, its PurchaseOrderItem.quantityReceived update, and the
 * parent PurchaseOrder.status update to commit-or-rollback as a single
 * atomic unit — so the logic is replicated here rather than calling
 * addStockLot() per item. Keep this in sync with addStockLot() if that ever
 * changes.
 */
async function addStockLotInTx(
  tx: Prisma.TransactionClient,
  {
    productId,
    quantity,
    costPerUnit,
    lotNumber,
    supplierId,
    supplierName,
    purchaseOrderRef,
    expiryDate,
    warehouseId = 'default',
    notes,
    createdBy,
  }: {
    productId: string;
    quantity: number;
    costPerUnit: number;
    lotNumber?: string;
    supplierId?: string;
    supplierName?: string;
    purchaseOrderRef?: string;
    expiryDate?: Date;
    warehouseId?: string;
    notes?: string;
    createdBy: string;
  }
) {
  // Auto-generate lot number if not provided
  const generatedLotNumber = lotNumber || `LOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Get current product stock
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { stockQuantity: true, name: true },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  const previousStock = product.stockQuantity;
  const newStock = previousStock + quantity;

  // Create stock lot
  const stockLot = await tx.stockLot.create({
    data: {
      productId,
      lotNumber: generatedLotNumber,
      quantityReceived: quantity,
      quantityRemaining: quantity,
      costPerUnit,
      totalCost: quantity * costPerUnit,
      supplierId,
      supplierName,
      purchaseOrderRef,
      expiryDate,
      warehouseId,
      notes,
      createdBy,
    },
  });

  // Update product stock quantity
  await tx.product.update({
    where: { id: productId },
    data: {
      stockQuantity: newStock,
    },
  });

  // Create inventory log
  await tx.inventoryLog.create({
    data: {
      productId,
      action: 'PURCHASE',
      quantity,
      previousStock,
      newStock,
      reference: stockLot.id,
      notes: `Stock lot ${generatedLotNumber} added - Cost: ${costPerUnit}/unit`,
      performedBy: createdBy,
    },
  });

  // Log to financial ledger
  await tx.financialLedger.create({
    data: {
      sourceType: 'PURCHASE',
      sourceId: stockLot.id,
      sourceName: `Stock purchase - ${generatedLotNumber}`,
      amount: stockLot.totalCost,
      direction: 'DEBIT',
      category: 'INVENTORY',
      description: `Purchased ${quantity} units at ${costPerUnit} per unit for ${product.name}`,
      createdBy,
      fiscalYear: new Date().getFullYear(),
      fiscalMonth: new Date().getMonth() + 1,
    },
  });

  return stockLot;
}

/**
 * POST /api/admin/purchase-orders/[id]/receive
 * Receive some or all of a purchase order's line items — creates a
 * StockLot per received line (mirroring the existing addStockLot(), which
 * atomically increments Product.stockQuantity and writes the InventoryLog
 * + FinancialLedger entries), records the received quantity against the
 * PurchaseOrderItem, and advances the PO's status to PARTIALLY_RECEIVED or
 * RECEIVED once every line is fully received (Amazon-style gap-closure
 * Phase 1 — replaces the free-text StockLot.purchaseOrderRef workflow with
 * a real, queryable purchase-order lifecycle).
 *
 * Body: { items: [{ purchaseOrderItemId, quantityReceived, lotNumber?, expiryDate?, warehouseId? }] }
 *
 * All line items are validated against their remaining orderable quantity
 * up front, then every stock lot creation, PurchaseOrderItem.quantityReceived
 * increment, and the parent PurchaseOrder.status update happen inside a
 * single prisma.$transaction. This makes the whole receive call atomic: a
 * crash/timeout partway through can never leave a stock lot (and
 * Product.stockQuantity) durably committed without its matching
 * PurchaseOrderItem.quantityReceived increment — which would otherwise let
 * the same physical units be received/stocked again on a retry — and an
 * invalid item later in the same call can never leave earlier items' writes
 * partially committed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one received item is required' },
        { status: 400 }
      );
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true, supplier: true },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found' },
        { status: 404 }
      );
    }

    if (purchaseOrder.status === 'DRAFT' || purchaseOrder.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: `Cannot receive against a ${purchaseOrder.status} purchase order` },
        { status: 400 }
      );
    }

    const poItemsById = new Map(purchaseOrder.items.map(item => [item.id, item]));

    // First pass: validate every line item against its remaining quantity
    // before writing anything, so one invalid item in a multi-item request
    // fails the whole request with nothing committed, rather than partially
    // committing earlier items.
    const validatedReceipts: { receipt: any; poItem: (typeof purchaseOrder.items)[number] }[] = [];
    for (const receipt of items) {
      const poItem = poItemsById.get(receipt.purchaseOrderItemId);
      if (!poItem) {
        return NextResponse.json(
          { success: false, error: `Purchase order item ${receipt.purchaseOrderItemId} not found on this order` },
          { status: 400 }
        );
      }

      const remaining = poItem.quantityOrdered - poItem.quantityReceived;
      if (!receipt.quantityReceived || receipt.quantityReceived <= 0) {
        return NextResponse.json(
          { success: false, error: 'quantityReceived must be a positive number' },
          { status: 400 }
        );
      }
      if (receipt.quantityReceived > remaining) {
        return NextResponse.json(
          { success: false, error: `Cannot receive ${receipt.quantityReceived} units for ${poItem.productId} — only ${remaining} remain on this order` },
          { status: 400 }
        );
      }

      validatedReceipts.push({ receipt, poItem });
    }

    let updatedPO, receivedLots;
    try {
      ({ updatedPO, receivedLots } = await prisma.$transaction(async (tx) => {
      // Re-check the PO itself hasn't been concurrently cancelled since the
      // pre-transaction read above (e.g. a racing PATCH to
      // /purchase-orders/[id] flipping it to CANCELLED). That earlier check
      // only read a stale snapshot before this transaction opened.
      const freshPO = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      });
      if (freshPO.status === 'DRAFT' || freshPO.status === 'CANCELLED') {
        throw new Error(
          `Cannot receive against a ${freshPO.status} purchase order (concurrent status change detected)`
        );
      }

      const receivedLots = [];

      for (const { receipt, poItem } of validatedReceipts) {
        // Guarded updateMany + count-check (same idiom as orders/cancel and
        // admin/stock/adjust): only increment quantityReceived if the row's
        // CURRENT committed value still leaves enough room for this receipt,
        // evaluated atomically by Postgres at UPDATE time under a row lock.
        // A plain read-then-compare-then-write here (as this used to do)
        // would let two concurrent receive calls for the same PO line both
        // read the same stale quantityReceived, both pass validation, and
        // both commit — pushing quantityReceived past quantityOrdered and
        // double-crediting stock for units that were only physically
        // received once. quantityOrdered is immutable once the PO item is
        // created, so comparing against it here is race-free.
        const guard = await tx.purchaseOrderItem.updateMany({
          where: {
            id: poItem.id,
            quantityReceived: { lte: poItem.quantityOrdered - receipt.quantityReceived },
          },
          data: { quantityReceived: { increment: receipt.quantityReceived } },
        });

        if (guard.count === 0) {
          const freshPoItem = await tx.purchaseOrderItem.findUniqueOrThrow({ where: { id: poItem.id } });
          const freshRemaining = freshPoItem.quantityOrdered - freshPoItem.quantityReceived;
          throw new Error(
            `Cannot receive ${receipt.quantityReceived} units for ${poItem.productId} — only ${freshRemaining} remain on this order (concurrent receipt detected)`
          );
        }

        const lot = await addStockLotInTx(tx, {
          productId: poItem.productId,
          quantity: receipt.quantityReceived,
          costPerUnit: poItem.costPerUnit,
          lotNumber: receipt.lotNumber,
          supplierId: purchaseOrder.supplierId,
          supplierName: purchaseOrder.supplier.name,
          purchaseOrderRef: purchaseOrder.poNumber,
          expiryDate: receipt.expiryDate ? new Date(receipt.expiryDate) : undefined,
          warehouseId: receipt.warehouseId,
          createdBy: admin.id,
        });
        receivedLots.push(lot);
      }

      // Recompute the PO's overall status from every line item's up-to-date
      // received quantity (not just the lines touched in this call).
      const refreshedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
      const allFullyReceived = refreshedItems.every(item => item.quantityReceived >= item.quantityOrdered);
      const anyReceived = refreshedItems.some(item => item.quantityReceived > 0);

      const updatedPO = await tx.purchaseOrder.update({
        where: { id },
        data: { status: allFullyReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : purchaseOrder.status },
        include: {
          supplier: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        },
      });

      return { updatedPO, receivedLots };
      }));
    } catch (txError) {
      if (txError instanceof Error && /concurrent (receipt|status change) detected/.test(txError.message)) {
        return NextResponse.json({ success: false, error: txError.message }, { status: 409 });
      }
      throw txError;
    }

    return NextResponse.json({
      success: true,
      data: { purchaseOrder: updatedPO, stockLotsCreated: receivedLots.length },
      message: 'Purchase order receipt recorded successfully',
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error receiving purchase order:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to receive purchase order' },
      { status: 500 }
    );
  }
}
