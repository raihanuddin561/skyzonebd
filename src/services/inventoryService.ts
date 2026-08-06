/**
 * Inventory Service
 * 
 * Handles stock lot management, FIFO/WAC costing, and stock allocation
 * for accurate COGS (Cost of Goods Sold) calculation.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export type CostingMethod = 'FIFO' | 'WAC'; // FIFO = First In First Out, WAC = Weighted Average Cost

/**
 * Add stock lot (restock/purchase entry)
 * Creates a new stock lot with buying cost and updates product stock quantity
 */
export async function addStockLot({
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
}) {
  return await prisma.$transaction(async (tx) => {
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
  });
}

/**
 * Allocate stock using FIFO method
 * Consumes oldest stock lots first
 */
export async function allocateStockFIFO({
  productId,
  quantity,
  orderId,
  orderItemId,
}: {
  productId: string;
  quantity: number;
  orderId: string;
  orderItemId: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // Get available lots ordered by purchase date (FIFO - oldest first)
    const lots = await tx.stockLot.findMany({
      where: {
        productId,
        quantityRemaining: { gt: 0 },
      },
      orderBy: {
        purchaseDate: 'asc', // Oldest first
      },
    });
    
    if (lots.length === 0) {
      throw new Error('No stock available');
    }
    
    // Get current product stock
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true, name: true },
    });
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    let remainingQty = quantity;
    let totalCost = 0;
    const allocations = [];
    
    // Allocate from lots
    for (const lot of lots) {
      if (remainingQty <= 0) break;
      
      const qtyToAllocate = Math.min(remainingQty, lot.quantityRemaining);
      const cost = qtyToAllocate * lot.costPerUnit;
      
      // Create allocation record
      const allocation = await tx.stockAllocation.create({
        data: {
          lotId: lot.id,
          orderId,
          orderItemId,
          quantity: qtyToAllocate,
          costPerUnit: lot.costPerUnit,
        },
      });
      
      // Update lot remaining quantity
      await tx.stockLot.update({
        where: { id: lot.id },
        data: {
          quantityRemaining: { decrement: qtyToAllocate },
        },
      });
      
      totalCost += cost;
      remainingQty -= qtyToAllocate;
      allocations.push(allocation);
    }
    
    if (remainingQty > 0) {
      throw new Error(`Insufficient stock. Short by ${remainingQty} units`);
    }
    
    const previousStock = product.stockQuantity;
    const newStock = previousStock - quantity;
    
    // Update product stock
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
        action: 'SALE',
        quantity: -quantity, // Negative for reduction
        previousStock,
        newStock,
        reference: orderId,
        notes: `Allocated for order ${orderId} using FIFO`,
      },
    });
    
    return {
      allocations,
      totalCost,
      averageCost: totalCost / quantity,
    };
  });
}

/**
 * Calculate weighted average cost for a product.
 * Averages cost across all available lots. Accepts an optional Prisma
 * client/transaction client so callers already inside a `$transaction` can
 * reuse it instead of issuing a query against the outer client.
 */
export async function calculateWeightedAverageCost(
  productId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<number> {
  const lots = await client.stockLot.findMany({
    where: {
      productId,
      quantityRemaining: { gt: 0 },
    },
  });

  if (lots.length === 0) return 0;

  const totalValue = lots.reduce((sum, lot) => sum + (lot.quantityRemaining * lot.costPerUnit), 0);
  const totalQty = lots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);

  return totalQty > 0 ? totalValue / totalQty : 0;
}

/**
 * Deplete stock lots for a sale using Weighted-Average Cost, for callers
 * that are already inside their own `$transaction` and already own
 * `Product.stockQuantity`'s decrement/guard and `InventoryLog` write
 * (e.g. order creation's existing race-safe guarded decrement). This is
 * deliberately narrower than `allocateStockWAC` above: it never touches
 * `Product.stockQuantity` and never writes `InventoryLog` itself — it only
 * creates `StockAllocation` records against real `StockLot`s and reports
 * back the real per-unit cost, so the caller can snapshot an accurate
 * `OrderItem.costPerUnit` instead of a flat `Product.costPerUnit`/`basePrice`
 * guess.
 *
 * Returns `costPerUnit: null` if the product has no stock lots yet (e.g. it
 * was never restocked through `addStockLot`) — callers should fall back to
 * the product's own `costPerUnit`/`basePrice` in that case, exactly as
 * before this function existed. This keeps the rollout additive: existing
 * products with no lot history behave exactly as they did previously.
 */
export async function depleteStockLotsForSale(
  tx: Prisma.TransactionClient,
  { productId, quantity, orderId, orderItemId }: {
    productId: string;
    quantity: number;
    orderId: string;
    orderItemId: string;
  }
): Promise<{ costPerUnit: number | null }> {
  const wac = await calculateWeightedAverageCost(productId, tx);
  if (wac === 0) {
    return { costPerUnit: null };
  }

  const lots = await tx.stockLot.findMany({
    where: { productId, quantityRemaining: { gt: 0 } },
    orderBy: { purchaseDate: 'asc' },
  });

  let remainingQty = quantity;
  for (const lot of lots) {
    if (remainingQty <= 0) break;
    const qtyToAllocate = Math.min(remainingQty, lot.quantityRemaining);

    await tx.stockAllocation.create({
      data: {
        lotId: lot.id,
        orderId,
        orderItemId,
        quantity: qtyToAllocate,
        costPerUnit: wac,
      },
    });
    await tx.stockLot.update({
      where: { id: lot.id },
      data: { quantityRemaining: { decrement: qtyToAllocate } },
    });

    remainingQty -= qtyToAllocate;
  }

  // If lot quantities don't fully cover this sale (e.g. some units were
  // never formally restocked through addStockLot), that's a lot-tracking
  // data gap, not a stock-availability failure — Product.stockQuantity
  // remains the authoritative availability check, already enforced by the
  // caller's guarded decrement before this function runs. Report the WAC
  // for the whole quantity regardless of partial lot coverage.
  return { costPerUnit: wac };
}

/**
 * Reverse a previously-depleted allocation (order cancellation) — restores
 * each StockAllocation's quantity back onto its StockLot and deletes the
 * allocation records, keeping StockLot.quantityRemaining consistent with
 * Product.stockQuantity's own restoration on cancellation.
 */
export async function releaseStockAllocationsForOrder(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<void> {
  const allocations = await tx.stockAllocation.findMany({ where: { orderId } });
  for (const allocation of allocations) {
    await tx.stockLot.update({
      where: { id: allocation.lotId },
      data: { quantityRemaining: { increment: allocation.quantity } },
    });
  }
  await tx.stockAllocation.deleteMany({ where: { orderId } });
}

/**
 * Allocate stock using WAC method
 * Uses weighted average cost instead of specific lot costs
 */
export async function allocateStockWAC({
  productId,
  quantity,
  orderId,
  orderItemId,
}: {
  productId: string;
  quantity: number;
  orderId: string;
  orderItemId: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // Calculate current WAC
    const wac = await calculateWeightedAverageCost(productId);
    
    if (wac === 0) {
      throw new Error('No stock available or unable to calculate cost');
    }
    
    // Get available lots
    const lots = await tx.stockLot.findMany({
      where: {
        productId,
        quantityRemaining: { gt: 0 },
      },
      orderBy: {
        purchaseDate: 'asc', // Still consume oldest first physically
      },
    });
    
    // Get current product stock
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true, name: true },
    });
    
    if (!product) {
      throw new Error('Product not found');
    }
    
    let remainingQty = quantity;
    const allocations = [];
    
    // Allocate from lots (proportionally or FIFO-style for physical stock)
    for (const lot of lots) {
      if (remainingQty <= 0) break;
      
      const qtyToAllocate = Math.min(remainingQty, lot.quantityRemaining);
      
      // Create allocation with WAC
      const allocation = await tx.stockAllocation.create({
        data: {
          lotId: lot.id,
          orderId,
          orderItemId,
          quantity: qtyToAllocate,
          costPerUnit: wac, // Use WAC instead of lot-specific cost
        },
      });
      
      await tx.stockLot.update({
        where: { id: lot.id },
        data: {
          quantityRemaining: { decrement: qtyToAllocate },
        },
      });
      
      remainingQty -= qtyToAllocate;
      allocations.push(allocation);
    }
    
    if (remainingQty > 0) {
      throw new Error(`Insufficient stock. Short by ${remainingQty} units`);
    }
    
    const previousStock = product.stockQuantity;
    const newStock = previousStock - quantity;
    
    // Update product stock
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
        action: 'SALE',
        quantity: -quantity,
        previousStock,
        newStock,
        reference: orderId,
        notes: `Allocated for order ${orderId} using WAC (${wac.toFixed(2)}/unit)`,
      },
    });
    
    return {
      allocations,
      totalCost: quantity * wac,
      averageCost: wac,
    };
  });
}

/**
 * Get stock lots for a product
 */
export async function getProductStockLots(productId: string) {
  return await prisma.stockLot.findMany({
    where: { productId },
    orderBy: {
      purchaseDate: 'desc',
    },
  });
}

/**
 * Get stock allocation history for an order
 */
export async function getOrderStockAllocations(orderId: string) {
  return await prisma.stockAllocation.findMany({
    where: { orderId },
    include: {
      lot: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Check if product has sufficient stock
 */
export async function checkStockAvailability(productId: string, quantity: number): Promise<boolean> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { stockQuantity: true },
  });
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  return product.stockQuantity >= quantity;
}
