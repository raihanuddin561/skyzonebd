// utils/stockCalculations.ts - Stock management calculation utilities
// Alibaba-inspired inventory management

export interface StockItem {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  moq: number;
  reorderPoint: number;
  reorderQuantity: number;
  averageDailySales?: number;
  daysOfStock?: number;
}

export interface StockCalculation extends StockItem {
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'reorder_needed';
  isReorderNeeded: boolean;
  suggestedReorderQuantity: number;
  estimatedStockoutDate: Date | null;
}

/**
 * Calculate stock status and metrics
 */
export function calculateStockStatus(item: StockItem): StockCalculation {
  const {
    currentStock,
    reorderPoint,
    reorderQuantity,
    averageDailySales = 0,
    moq,
  } = item;

  // Determine stock status
  let status: StockCalculation['status'];
  let isReorderNeeded = false;

  if (currentStock === 0) {
    status = 'out_of_stock';
    isReorderNeeded = true;
  } else if (currentStock <= reorderPoint) {
    status = 'reorder_needed';
    isReorderNeeded = true;
  } else if (currentStock <= reorderPoint * 1.5) {
    status = 'low_stock';
  } else {
    status = 'in_stock';
  }

  // Calculate days of stock remaining
  const daysOfStock = averageDailySales > 0
    ? Math.floor(currentStock / averageDailySales)
    : null;

  // Calculate estimated stockout date
  const estimatedStockoutDate = daysOfStock !== null && daysOfStock > 0
    ? new Date(Date.now() + daysOfStock * 24 * 60 * 60 * 1000)
    : null;

  // Calculate suggested reorder quantity
  // Ensure it meets MOQ and provides buffer stock
  const baseReorderQuantity = reorderQuantity || reorderPoint * 2;
  const suggestedReorderQuantity = Math.max(baseReorderQuantity, moq);

  return {
    ...item,
    status,
    isReorderNeeded,
    suggestedReorderQuantity,
    daysOfStock: daysOfStock || undefined,
    estimatedStockoutDate,
  };
}

/**
 * Validate stock adjustment
 */
export function validateStockAdjustment(
  currentStock: number,
  adjustmentQuantity: number,
  adjustmentType: 'add' | 'remove' | 'set',
  reason: string
): {
  isValid: boolean;
  errors: string[];
  newStock: number;
} {
  const errors: string[] = [];

  // Validate reason
  if (!reason || reason.trim().length < 5) {
    errors.push('Reason is required and must be at least 5 characters');
  }

  // Validate quantity
  if (isNaN(adjustmentQuantity) || adjustmentQuantity < 0) {
    errors.push('Adjustment quantity must be a positive number');
  }

  // Calculate new stock
  let newStock: number;

  switch (adjustmentType) {
    case 'add':
      newStock = currentStock + adjustmentQuantity;
      break;
    case 'remove':
      newStock = currentStock - adjustmentQuantity;
      if (newStock < 0) {
        errors.push('Cannot remove more stock than available');
        newStock = 0;
      }
      break;
    case 'set':
      newStock = adjustmentQuantity;
      break;
    default:
      errors.push('Invalid adjustment type');
      newStock = currentStock;
  }

  return {
    isValid: errors.length === 0,
    errors,
    newStock,
  };
}

/**
 * Calculate reorder point using lead time demand formula
 * Reorder Point = (Average Daily Sales × Lead Time) + Safety Stock
 */
export function calculateReorderPoint(
  averageDailySales: number,
  leadTimeDays: number,
  safetyStockDays: number = 7
): number {
  const leadTimeDemand = averageDailySales * leadTimeDays;
  const safetyStock = averageDailySales * safetyStockDays;
  return Math.ceil(leadTimeDemand + safetyStock);
}

/**
 * Calculate Economic Order Quantity (EOQ)
 * EOQ = √(2 × Annual Demand × Ordering Cost / Holding Cost per Unit)
 */
export function calculateEOQ(
  annualDemand: number,
  orderingCost: number,
  holdingCostPerUnit: number
): number {
  if (holdingCostPerUnit === 0) return 0;
  const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCostPerUnit);
  return Math.ceil(eoq);
}

/**
 * Calculate average daily sales from order history
 */
export function calculateAverageDailySales(
  orderHistory: Array<{ quantity: number; date: Date }>,
  days: number = 30
): number {
  if (orderHistory.length === 0) return 0;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentOrders = orderHistory.filter(order => order.date >= cutoffDate);
  const totalSold = recentOrders.reduce((sum, order) => sum + order.quantity, 0);

  return totalSold / days;
}

/**
 * Generate stock alert message
 */
export function generateStockAlert(calculation: StockCalculation): string {
  const { status, currentStock, suggestedReorderQuantity, daysOfStock, productName } = calculation;

  switch (status) {
    case 'out_of_stock':
      return `${productName} is OUT OF STOCK. Reorder ${suggestedReorderQuantity} units immediately.`;
    case 'reorder_needed':
      const daysMsg = daysOfStock ? ` (${daysOfStock} days remaining)` : '';
      return `${productName} needs reordering${daysMsg}. Suggested order: ${suggestedReorderQuantity} units.`;
    case 'low_stock':
      return `${productName} is running low (${currentStock} units). Consider reordering soon.`;
    default:
      return `${productName} stock level is healthy (${currentStock} units).`;
  }
}
