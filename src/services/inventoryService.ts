/**
 * Inventory Service
 * 
 * Handles stock lot management, FIFO/WAC costing, and stock allocation
 * for accurate COGS (Cost of Goods Sold) calculation.
 */

import { prisma } from '@/lib/db';
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
 * Calculate weighted average cost for a product
 * Averages cost across all available lots
 */
export async function calculateWeightedAverageCost(productId: string): Promise<number> {
  const lots = await prisma.stockLot.findMany({
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
