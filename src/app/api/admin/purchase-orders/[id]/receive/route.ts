import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { addStockLot } from '@/services/inventoryService';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/purchase-orders/[id]/receive
 * Receive some or all of a purchase order's line items — creates a
 * StockLot per received line (via the existing addStockLot(), which
 * atomically increments Product.stockQuantity and writes the InventoryLog
 * + FinancialLedger entries), records the received quantity against the
 * PurchaseOrderItem, and advances the PO's status to PARTIALLY_RECEIVED or
 * RECEIVED once every line is fully received (Amazon-style gap-closure
 * Phase 1 — replaces the free-text StockLot.purchaseOrderRef workflow with
 * a real, queryable purchase-order lifecycle).
 *
 * Body: { items: [{ purchaseOrderItemId, quantityReceived, lotNumber?, expiryDate?, warehouseId? }] }
 *
 * Each line item's StockLot creation is its own atomic transaction (via
 * addStockLot) — not perfectly atomic across the whole receive call, but
 * each individual stock movement is safe, and this is a low-frequency,
 * human-supervised admin action, not a high-throughput path.
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
    const receivedLots = [];

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

      const lot = await addStockLot({
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

      await prisma.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: { quantityReceived: { increment: receipt.quantityReceived } },
      });
    }

    // Recompute the PO's overall status from every line item's up-to-date
    // received quantity (not just the lines touched in this call).
    const refreshedItems = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: id } });
    const allFullyReceived = refreshedItems.every(item => item.quantityReceived >= item.quantityOrdered);
    const anyReceived = refreshedItems.some(item => item.quantityReceived > 0);

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: allFullyReceived ? 'RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : purchaseOrder.status },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
      },
    });

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
