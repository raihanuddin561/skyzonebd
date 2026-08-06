// utils/profitCalculation.ts - Platform/seller profit-split calculation

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

export interface ProfitSplit {
  platformProfit: number;
  sellerProfit: number;
}

/**
 * Splits a gross profit amount between the platform and a product's seller,
 * per the product's configured commission percentage.
 *
 * Canonical implementation of this split — previously hand-duplicated
 * between this file's (unused) calculateProductProfit and the live
 * order-delivery path in utils/profitReportGeneration.ts. Both now call
 * this one function.
 */
export function splitGrossProfit(
  grossProfit: number,
  platformProfitPercentage: number,
  sellerCommissionPercentage: number = 0
): ProfitSplit {
  const platformShare = (grossProfit * platformProfitPercentage) / 100;
  const remainingProfit = grossProfit - platformShare;
  const sellerProfit = sellerCommissionPercentage > 0
    ? (remainingProfit * sellerCommissionPercentage) / 100
    : 0;
  const platformProfit = platformShare + (remainingProfit - sellerProfit);

  return { platformProfit, sellerProfit };
}

/**
 * Calculate profit breakdown for a single product/order-line.
 */
export function calculateProductProfit(
  quantity: number,
  config: ProductProfitConfig
): ProfitBreakdown {
  const {
    wholesalePrice,
    platformProfitPercentage,
    sellerCommissionPercentage = 0,
    costPerUnit = config.basePrice,
    shippingCost = 0,
    handlingCost = 0
  } = config;

  const revenue = wholesalePrice * quantity;
  const totalCost = (costPerUnit + shippingCost + handlingCost) * quantity;
  const grossProfit = revenue - totalCost;

  const { platformProfit, sellerProfit } = splitGrossProfit(
    grossProfit,
    platformProfitPercentage,
    sellerCommissionPercentage
  );

  const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  return {
    revenue,
    totalCost,
    grossProfit,
    platformProfit,
    sellerProfit,
    platformProfitPercentage,
    sellerProfitPercentage: sellerCommissionPercentage,
    profitMargin
  };
}
