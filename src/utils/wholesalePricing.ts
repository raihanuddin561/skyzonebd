// utils/wholesalePricing.ts - DEPRECATED
// This file is deprecated. Use @/utils/pricing instead.
// Re-exporting for backward compatibility only.

export {
  type WholesaleTier,
  type Product,
  type PriceInfo,
  type PriceCalculation,
  calculatePrice,
  calculateWholesalePrice,
  findApplicableTier,
  getWholesaleTiers,
  getAvailableTiers,
  calculateCartTotal,
  calculateBulkSavings,
  getNextTierBenefit,
  validateWholesaleOrder,
  generateWholesaleQuote,
  getMinimumOrderQuantity,
  getRecommendedQuantity,
  calculateBulkDiscount,
  formatPrice,
  formatPriceRange,
  formatDiscount,
} from './pricing';

// Backward compat type alias
export type WholesaleProduct = import('./pricing').Product;
