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

  product: WholesaleProduct
): Array<{
  range: string;
  unitPrice: number;
  savings: string;
  recommended: boolean;
}> {
  const { wholesalePrice, wholesaleTiers = [], moq } = product;

  if (wholesaleTiers.length === 0) {
    return [{
      range: `${moq}+`,
      unitPrice: wholesalePrice,
      savings: 'Base Price',
      recommended: true
    }];
  }

  return wholesaleTiers.map((tier, index) => {
    const maxQty = tier.maxQuantity ? tier.maxQuantity.toString() : '+';
    const range = `${tier.minQuantity}-${maxQty}`;
    const savings = tier.discount > 0 ? `${tier.discount}% OFF` : 'Base Price';
    
    // Recommend the tier with best value (highest discount)
    const bestDiscount = Math.max(...wholesaleTiers.map(t => t.discount));
    const recommended = tier.discount === bestDiscount;

    return {
      range,
      unitPrice: tier.price,
      savings,
      recommended
    };
  });
}

/**
 * Calculate next tier benefits
 * Shows customer how much more they need to order to unlock better pricing
 */
export function getNextTierBenefit(
  product: WholesaleProduct,
  currentQuantity: number
): {
  nextTier: WholesaleTier | null;
  quantityNeeded: number;
  potentialSavings: number;
  currentUnitPrice: number;
  nextUnitPrice: number;
} | null {
  const { wholesaleTiers = [] } = product;

  if (wholesaleTiers.length === 0) {
    return null;
  }

  // Sort tiers by minQuantity ascending
  const sortedTiers = [...wholesaleTiers].sort((a, b) => a.minQuantity - b.minQuantity);

  // Find current tier
  const currentTier = sortedTiers.find(tier => {
    const meetsMin = currentQuantity >= tier.minQuantity;
    const meetsMax = tier.maxQuantity === null || currentQuantity <= tier.maxQuantity;
    return meetsMin && meetsMax;
  });

  if (!currentTier) {
    return null;
  }

  // Find next tier
  const currentIndex = sortedTiers.indexOf(currentTier);
  const nextTier = sortedTiers[currentIndex + 1];

  if (!nextTier) {
    return null; // Already at highest tier
  }

  const quantityNeeded = nextTier.minQuantity - currentQuantity;
  const currentUnitPrice = currentTier.price;
  const nextUnitPrice = nextTier.price;
  const potentialSavings = (currentUnitPrice - nextUnitPrice) * nextTier.minQuantity;

  return {
    nextTier,
    quantityNeeded,
    potentialSavings,
    currentUnitPrice,
    nextUnitPrice
  };
}

/**
 * Validate wholesale order
 * Ensures order meets all requirements
 */
export function validateWholesaleOrder(
  product: WholesaleProduct,
  quantity: number
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check MOQ
  if (quantity < product.moq) {
    errors.push(`Minimum order quantity is ${product.moq} units`);
  }

  // Check stock availability
  if (quantity > product.stockQuantity) {
    if (product.stockQuantity === 0) {
      errors.push('Product is out of stock');
    } else {
      errors.push(`Only ${product.stockQuantity} units available in stock`);
    }
  } else if (quantity > product.stockQuantity * 0.8) {
    warnings.push(`Low stock: Only ${product.stockQuantity} units remaining`);
  }

  // Check if quantity could benefit from next tier
  const nextTierBenefit = getNextTierBenefit(product, quantity);
  if (nextTierBenefit && nextTierBenefit.quantityNeeded <= product.moq) {
    warnings.push(
      `Order ${nextTierBenefit.quantityNeeded} more units to save ${nextTierBenefit.potentialSavings.toFixed(2)} BDT`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate wholesale quote
 * Creates a detailed quote for customer review
 */
export function generateWholesaleQuote(
  products: Array<{ product: WholesaleProduct; quantity: number }>,
  shippingCost: number = 0,
  taxRate: number = 0
): {
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    tier: string;
    savings: number;
  }>;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  totalSavings: number;
  validUntil: Date;
} {
  const items = products.map(({ product, quantity }) => {
    const calculation = calculateWholesalePrice(product, quantity);
    const tierRange = calculation.appliedTier
      ? `${calculation.appliedTier.minQuantity}-${calculation.appliedTier.maxQuantity || '+'}`
      : 'Base';

    return {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: calculation.unitPrice,
      subtotal: calculation.totalPrice,
      tier: tierRange,
      savings: calculation.savings
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalSavings = items.reduce((sum, item) => sum + item.savings, 0);
  const tax = (subtotal + shippingCost) * (taxRate / 100);
  const total = subtotal + shippingCost + tax;

  // Quote valid for 7 days (industry standard)
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 7);

  return {
    items,
    subtotal,
    shipping: shippingCost,
    tax,
    total,
    totalSavings,
    validUntil
  };
}

/**
 * Calculate bulk discount percentage
 * Shows customer their effective discount
 */
export function calculateBulkDiscount(
  basePrice: number,
  actualPrice: number
): number {
  if (basePrice === 0) return 0;
  return ((basePrice - actualPrice) / basePrice) * 100;
}

/**
 * Format price range for display
 */
export function formatPriceRange(
  minPrice: number,
  maxPrice: number,
  currency: string = 'BDT'
): string {
  if (minPrice === maxPrice) {
    return `${currency} ${minPrice.toLocaleString()}`;
  }
  return `${currency} ${minPrice.toLocaleString()} - ${maxPrice.toLocaleString()}`;
}

/**
 * Get recommended order quantity
 * Suggests optimal quantity based on tiers and stock
 */
export function getRecommendedQuantity(
  product: WholesaleProduct
): {
  quantity: number;
  reason: string;
  savings: number;
} {
  const { moq, wholesaleTiers = [], stockQuantity } = product;

  // If no tiers, recommend MOQ
  if (wholesaleTiers.length === 0) {
    return {
      quantity: moq,
      reason: 'Minimum order quantity',
      savings: 0
    };
  }

  // Find tier with best value (highest discount) that's within stock
  const availableTiers = wholesaleTiers.filter(tier => tier.minQuantity <= stockQuantity);
  
  if (availableTiers.length === 0) {
    return {
      quantity: Math.min(moq, stockQuantity),
      reason: 'Based on available stock',
      savings: 0
    };
  }

  const bestTier = availableTiers.reduce((best, current) =>
    current.discount > best.discount ? current : best
  );

  const calculation = calculateWholesalePrice(product, bestTier.minQuantity);

  return {
    quantity: bestTier.minQuantity,
    reason: `Best value: ${bestTier.discount}% discount`,
    savings: calculation.savings
  };
}
