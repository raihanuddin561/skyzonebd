// utils/profitCalculation.ts - Profit Sharing Calculation System

export interface ProductProfitConfig {
  basePrice: number;              // Cost price
  wholesalePrice: number;         // Selling price
  platformProfitPercentage: number; // Admin-set platform profit %
  sellerCommissionPercentage?: number; // Seller's commission %
  costPerUnit?: number;           // Detailed cost tracking
  shippingCost?: number;
  handlingCost?: number;
}

export interface ProfitBreakdown {
  revenue: number;
  totalCost: number;
  grossProfit: number;
  platformProfit: number;
  sellerProfit: number;
  platformProfitPercentage: number;
  sellerProfitPercentage: number;
  profitMargin: number;
}

export interface OrderProfitCalculation {
  subtotal: number;
  totalCost: number;
  grossProfit: number;
  platformProfit: number;
  sellerProfit: number;
  profitMargin: number;
  itemBreakdowns: Array<{
    productId: string;
    quantity: number;
    profit: ProfitBreakdown;
  }>;
}

/**
 * Calculate profit breakdown for a single product
 * Following Amazon/Alibaba wholesale profit sharing model
 */
export function calculateProductProfit(
  quantity: number,
  config: ProductProfitConfig
): ProfitBreakdown {
  const { 
    basePrice, 
    wholesalePrice, 
    platformProfitPercentage,
    sellerCommissionPercentage = 0,
    costPerUnit = basePrice,
    shippingCost = 0,
    handlingCost = 0
  } = config;

  // Total revenue from sale
  const revenue = wholesalePrice * quantity;

  // Total cost including base cost and operational costs
  const totalCost = (costPerUnit + shippingCost + handlingCost) * quantity;

  // Gross profit (before distribution)
  const grossProfit = revenue - totalCost;

  // Calculate profit distribution
  // Platform gets its percentage of gross profit
  const platformProfit = (grossProfit * platformProfitPercentage) / 100;

  // Seller/Partner gets remaining profit (if applicable)
  const remainingProfit = grossProfit - platformProfit;
  const sellerProfit = sellerCommissionPercentage > 0 
    ? (remainingProfit * sellerCommissionPercentage) / 100 
    : 0;

  // Adjusted platform profit if seller takes a share
  const finalPlatformProfit = platformProfit + (remainingProfit - sellerProfit);

  // Profit margin as percentage of revenue
  const profitMargin = (grossProfit / revenue) * 100;

  return {
    revenue,
    totalCost,
    grossProfit,
    platformProfit: finalPlatformProfit,
    sellerProfit,
    platformProfitPercentage,
    sellerProfitPercentage: sellerCommissionPercentage,
    profitMargin
  };
}

/**
 * Calculate profit for an entire order with multiple products
 */
export function calculateOrderProfit(
  items: Array<{
    productId: string;
    quantity: number;
    config: ProductProfitConfig;
  }>
): OrderProfitCalculation {
  let totalRevenue = 0;
  let totalCost = 0;
  let totalGrossProfit = 0;
  let totalPlatformProfit = 0;
  let totalSellerProfit = 0;

  const itemBreakdowns = items.map(item => {
    const profit = calculateProductProfit(item.quantity, item.config);
    
    totalRevenue += profit.revenue;
    totalCost += profit.totalCost;
    totalGrossProfit += profit.grossProfit;
    totalPlatformProfit += profit.platformProfit;
    totalSellerProfit += profit.sellerProfit;

    return {
      productId: item.productId,
      quantity: item.quantity,
      profit
    };
  });

  const profitMargin = (totalGrossProfit / totalRevenue) * 100;

  return {
    subtotal: totalRevenue,
    totalCost,
    grossProfit: totalGrossProfit,
    platformProfit: totalPlatformProfit,
    sellerProfit: totalSellerProfit,
    profitMargin,
    itemBreakdowns
  };
}

/**
 * Calculate tier-based pricing profit
 * Used when product has volume-based tiers
 */
export function calculateTierProfit(
  quantity: number,
  basePrice: number,
  tiers: Array<{
    minQuantity: number;
    maxQuantity: number | null;
    price: number;
    discount: number;
  }>,
  platformProfitPercentage: number
): ProfitBreakdown | null {
  // Find applicable tier
  const applicableTier = tiers.find(tier => {
    const meetsMin = quantity >= tier.minQuantity;
    const meetsMax = tier.maxQuantity === null || quantity <= tier.maxQuantity;
    return meetsMin && meetsMax;
  });

  if (!applicableTier) {
    return null;
  }

  return calculateProductProfit(quantity, {
    basePrice,
    wholesalePrice: applicableTier.price,
    platformProfitPercentage
  });
}

/**
 * Calculate suggested wholesale price based on desired profit margin
 * Helps admin set competitive prices while maintaining profit targets
 */
export function calculateSuggestedWholesalePrice(
  basePrice: number,
  targetProfitMargin: number, // Desired profit margin %
  operationalCosts: {
    shippingCost?: number;
    handlingCost?: number;
    marketingCost?: number;
  } = {}
): number {
  const { shippingCost = 0, handlingCost = 0, marketingCost = 0 } = operationalCosts;
  
  const totalCost = basePrice + shippingCost + handlingCost + marketingCost;
  
  // Calculate price to achieve target margin
  // Formula: Price = Cost / (1 - (Margin% / 100))
  const suggestedPrice = totalCost / (1 - (targetProfitMargin / 100));
  
  return Math.ceil(suggestedPrice); // Round up to nearest whole number
}

/**
 * Analyze profit performance for reporting
 */
export function analyzeProfitPerformance(
  orders: Array<{
    orderId: string;
    date: Date;
    revenue: number;
    cost: number;
    profit: number;
  }>
): {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageProfitMargin: number;
  profitGrowth: number; // % growth from first to last order
  bestPerformingDay: { date: Date; profit: number } | null;
} {
  if (orders.length === 0) {
    return {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      averageProfitMargin: 0,
      profitGrowth: 0,
      bestPerformingDay: null
    };
  }

  const totalRevenue = orders.reduce((sum, o) => sum + o.revenue, 0);
  const totalCost = orders.reduce((sum, o) => sum + o.cost, 0);
  const totalProfit = orders.reduce((sum, o) => sum + o.profit, 0);
  const averageProfitMargin = (totalProfit / totalRevenue) * 100;

  // Calculate profit growth
  const firstProfit = orders[0].profit;
  const lastProfit = orders[orders.length - 1].profit;
  const profitGrowth = ((lastProfit - firstProfit) / firstProfit) * 100;

  // Find best performing day
  const bestDay = orders.reduce((best, current) => 
    current.profit > (best?.profit || 0) ? current : best
  );

  return {
    totalRevenue,
    totalCost,
    totalProfit,
    averageProfitMargin,
    profitGrowth,
    bestPerformingDay: { date: bestDay.date, profit: bestDay.profit }
  };
}

/**
 * Calculate break-even quantity for a product
 * Helps determine minimum sales needed to cover costs
 */
export function calculateBreakEvenQuantity(
  basePrice: number,
  wholesalePrice: number,
  fixedCosts: number // One-time costs (setup, marketing, etc.)
): number {
  const profitPerUnit = wholesalePrice - basePrice;
  
  if (profitPerUnit <= 0) {
    return Infinity; // Cannot break even if selling below cost
  }
  
  return Math.ceil(fixedCosts / profitPerUnit);
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'BDT'): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: currency === 'BDT' ? 'BDT' : 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Format profit percentage for display
 */
export function formatProfitPercentage(percentage: number): string {
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
}
