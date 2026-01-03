// utils/inventoryManagement.ts - Inventory Management System

export interface InventoryItem {
  productId: string;
  productName: string;
  sku?: string;
  currentStock: number;
  reorderLevel: number;
  reorderQuantity: number;
  moq: number;
  unit: string;
}

export interface InventoryMovement {
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reference: string;
  reason: string;
  performedBy?: string;
  timestamp: Date;
}

export interface StockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  reorderLevel: number;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestedAction: string;
}

/**
 * Check if product needs reordering
 */
export function needsReorder(inventory: InventoryItem): boolean {
  return inventory.currentStock <= inventory.reorderLevel;
}

/**
 * Calculate reorder quantity
 * Based on MOQ, current stock, and reorder quantity
 */
export function calculateReorderQuantity(
  currentStock: number,
  reorderLevel: number,
  reorderQuantity: number,
  moq: number
): number {
  if (currentStock > reorderLevel) {
    return 0; // No reorder needed
  }

  // Calculate deficit
  const deficit = reorderLevel - currentStock;
  
  // Start with suggested reorder quantity
  let orderQty = Math.max(reorderQuantity, deficit);
  
  // Ensure it meets MOQ
  if (orderQty < moq) {
    orderQty = moq;
  }
  
  // Round up to nearest MOQ multiple for efficiency
  if (orderQty % moq !== 0) {
    orderQty = Math.ceil(orderQty / moq) * moq;
  }
  
  return orderQty;
}

/**
 * Generate stock alerts
 */
export function generateStockAlerts(
  inventory: InventoryItem[]
): StockAlert[] {
  const alerts: StockAlert[] = [];
  
  for (const item of inventory) {
    const stockPercentage = (item.currentStock / item.reorderLevel) * 100;
    
    // Out of stock
    if (item.currentStock === 0) {
      alerts.push({
        productId: item.productId,
        productName: item.productName,
        currentStock: item.currentStock,
        reorderLevel: item.reorderLevel,
        severity: 'critical' as const,
        message: 'OUT OF STOCK',
        suggestedAction: `Order ${calculateReorderQuantity(
          item.currentStock,
          item.reorderLevel,
          item.reorderQuantity,
          item.moq
        )} ${item.unit} immediately`
      });
      continue;
    }
    
    // Critical low (below reorder level)
    if (item.currentStock <= item.reorderLevel) {
      alerts.push({
        productId: item.productId,
        productName: item.productName,
        currentStock: item.currentStock,
        reorderLevel: item.reorderLevel,
        severity: 'critical' as const,
        message: 'CRITICAL LOW STOCK',
        suggestedAction: `Reorder ${calculateReorderQuantity(
          item.currentStock,
          item.reorderLevel,
          item.reorderQuantity,
          item.moq
        )} ${item.unit} now`
      });
      continue;
    }
    
    // Warning (within 20% above reorder level)
    if (stockPercentage <= 120) {
      alerts.push({
        productId: item.productId,
        productName: item.productName,
        currentStock: item.currentStock,
        reorderLevel: item.reorderLevel,
        severity: 'warning' as const,
        message: 'LOW STOCK',
        suggestedAction: `Consider ordering ${item.reorderQuantity} ${item.unit} soon`
      });
    }
  }
  
  return alerts
    .sort((a, b) => {
      // Sort by severity
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
}

/**
 * Calculate stock turnover rate
 * Helps identify fast-moving vs slow-moving products
 */
export function calculateStockTurnover(
  soldQuantity: number,
  averageStock: number,
  periodDays: number = 30
): {
  turnoverRate: number;
  daysToSellOut: number;
  velocity: 'fast' | 'medium' | 'slow';
} {
  if (averageStock === 0) {
    return {
      turnoverRate: 0,
      daysToSellOut: Infinity,
      velocity: 'slow'
    };
  }

  const turnoverRate = soldQuantity / averageStock;
  const daysToSellOut = periodDays / turnoverRate;

  let velocity: 'fast' | 'medium' | 'slow';
  if (daysToSellOut <= 7) {
    velocity = 'fast';
  } else if (daysToSellOut <= 30) {
    velocity = 'medium';
  } else {
    velocity = 'slow';
  }

  return {
    turnoverRate,
    daysToSellOut,
    velocity
  };
}

/**
 * Validate inventory movement
 */
export function validateInventoryMovement(
  currentStock: number,
  movement: InventoryMovement,
  moq: number
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  newStock: number;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let newStock = currentStock;

  switch (movement.type) {
    case 'IN':
      // Adding stock
      if (movement.quantity <= 0) {
        errors.push('Quantity must be positive for stock additions');
      }
      if (movement.quantity < moq) {
        warnings.push(`Quantity is below MOQ (${moq}). Consider ordering in MOQ multiples for better pricing.`);
      }
      newStock = currentStock + movement.quantity;
      break;

    case 'OUT':
      // Removing stock
      if (movement.quantity <= 0) {
        errors.push('Quantity must be positive for stock removals');
      }
      if (movement.quantity > currentStock) {
        errors.push(`Cannot remove ${movement.quantity} units. Only ${currentStock} available.`);
      }
      newStock = currentStock - movement.quantity;
      break;

    case 'ADJUSTMENT':
      // Manual adjustment (can be positive or negative)
      newStock = currentStock + movement.quantity;
      if (newStock < 0) {
        errors.push('Adjustment would result in negative stock');
        newStock = 0;
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    newStock
  };
}

/**
 * Calculate optimal stock level
 * Based on sales velocity and lead time
 */
export function calculateOptimalStockLevel(
  averageDailySales: number,
  leadTimeDays: number,
  safetyStockDays: number = 7,
  moq: number = 1
): {
  reorderLevel: number;
  reorderQuantity: number;
  maxStockLevel: number;
} {
  // Reorder level = (average daily sales × lead time) + safety stock
  const reorderLevel = Math.ceil(
    averageDailySales * leadTimeDays + averageDailySales * safetyStockDays
  );

  // Reorder quantity = average daily sales × (lead time + review period)
  const reviewPeriodDays = 30; // Monthly review
  let reorderQuantity = Math.ceil(
    averageDailySales * (leadTimeDays + reviewPeriodDays)
  );

  // Ensure reorder quantity meets MOQ
  if (reorderQuantity < moq) {
    reorderQuantity = moq;
  }

  // Round to MOQ multiple
  if (reorderQuantity % moq !== 0) {
    reorderQuantity = Math.ceil(reorderQuantity / moq) * moq;
  }

  // Max stock level = reorder level + reorder quantity
  const maxStockLevel = reorderLevel + reorderQuantity;

  return {
    reorderLevel,
    reorderQuantity,
    maxStockLevel
  };
}

/**
 * Batch stock check for multiple products
 */
export function batchStockCheck(
  orders: Array<{ productId: string; quantity: number }>,
  inventory: Map<string, number>
): {
  canFulfill: boolean;
  insufficientStock: Array<{
    productId: string;
    requested: number;
    available: number;
    shortage: number;
  }>;
} {
  const insufficientStock: Array<{
    productId: string;
    requested: number;
    available: number;
    shortage: number;
  }> = [];

  for (const order of orders) {
    const available = inventory.get(order.productId) || 0;
    
    if (available < order.quantity) {
      insufficientStock.push({
        productId: order.productId,
        requested: order.quantity,
        available,
        shortage: order.quantity - available
      });
    }
  }

  return {
    canFulfill: insufficientStock.length === 0,
    insufficientStock
  };
}

/**
 * Calculate inventory value
 */
export function calculateInventoryValue(
  items: Array<{
    productId: string;
    quantity: number;
    costPerUnit: number;
    wholesalePrice: number;
  }>
): {
  totalCost: number;
  totalValue: number;
  potentialProfit: number;
  profitMargin: number;
} {
  let totalCost = 0;
  let totalValue = 0;

  for (const item of items) {
    totalCost += item.quantity * item.costPerUnit;
    totalValue += item.quantity * item.wholesalePrice;
  }

  const potentialProfit = totalValue - totalCost;
  const profitMargin = totalValue > 0 ? (potentialProfit / totalValue) * 100 : 0;

  return {
    totalCost,
    totalValue,
    potentialProfit,
    profitMargin
  };
}

/**
 * Forecast stock requirements
 * Based on historical sales data
 */
export function forecastStockRequirements(
  historicalSales: Array<{ date: Date; quantity: number }>,
  forecastDays: number = 30,
  moq: number = 1
): {
  forecastedDemand: number;
  recommendedOrder: number;
  confidence: 'high' | 'medium' | 'low';
} {
  if (historicalSales.length === 0) {
    return {
      forecastedDemand: moq,
      recommendedOrder: moq,
      confidence: 'low'
    };
  }

  // Calculate average daily sales
  const totalSales = historicalSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const averageDailySales = totalSales / historicalSales.length;

  // Forecast demand
  const forecastedDemand = Math.ceil(averageDailySales * forecastDays);

  // Add safety buffer (20%)
  let recommendedOrder = Math.ceil(forecastedDemand * 1.2);

  // Ensure MOQ compliance
  if (recommendedOrder < moq) {
    recommendedOrder = moq;
  } else if (recommendedOrder % moq !== 0) {
    recommendedOrder = Math.ceil(recommendedOrder / moq) * moq;
  }

  // Determine confidence based on data availability
  let confidence: 'high' | 'medium' | 'low';
  if (historicalSales.length >= 30) {
    confidence = 'high';
  } else if (historicalSales.length >= 10) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    forecastedDemand,
    recommendedOrder,
    confidence
  };
}

/**
 * Generate inventory report
 */
export function generateInventoryReport(
  inventory: InventoryItem[],
  sales: Map<string, number> // productId -> quantity sold
): {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
  fastMoving: string[];
  slowMoving: string[];
  criticalAlerts: number;
} {
  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  const fastMoving: string[] = [];
  const slowMoving: string[] = [];

  for (const item of inventory) {
    if (item.currentStock === 0) {
      outOfStock++;
    } else if (item.currentStock <= item.reorderLevel) {
      lowStock++;
    } else {
      inStock++;
    }

    // Categorize by velocity
    const soldQty = sales.get(item.productId) || 0;
    const turnover = calculateStockTurnover(soldQty, item.currentStock);
    
    if (turnover.velocity === 'fast') {
      fastMoving.push(item.productId);
    } else if (turnover.velocity === 'slow') {
      slowMoving.push(item.productId);
    }
  }

  const alerts = generateStockAlerts(inventory);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

  return {
    totalProducts: inventory.length,
    inStock,
    lowStock,
    outOfStock,
    totalValue: 0, // Would need price data
    fastMoving,
    slowMoving,
    criticalAlerts
  };
}
