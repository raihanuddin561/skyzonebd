// utils/pricing.ts - WHOLESALE-ONLY Price calculation utilities
// Single source of truth for all pricing logic

export interface WholesaleTier {
  minQuantity: number;
  maxQuantity: number | null;
  price: number;
  discount: number;
  profitMargin?: number;
}

export interface Product {
  id: string | number;
  name: string;
  wholesalePrice: number;
  moq: number;
  minOrderQuantity?: number; // Backward compat alias
  stockQuantity?: number;
  platformProfitPercentage?: number;
  wholesaleTiers?: WholesaleTier[];
}

export interface PriceInfo {
  price: number;
  originalPrice?: number;
  discount?: number;
  tier?: WholesaleTier;
  savings?: number;
  priceType: 'wholesale' | 'tier';
}

export interface PriceCalculation {
  unitPrice: number;
  totalPrice: number;
  quantity: number;
  appliedTier: WholesaleTier | null;
  savings: number;
  savingsPercentage: number;
  meetsMinimum: boolean;
  minimumRequired: number;
}

/**
 * Calculate the wholesale price for a product based on quantity
 * WHOLESALE ONLY - No retail pricing
 * Alibaba-style tiered pricing model
 */
export function calculatePrice(
  product: Product,
  quantity: number
): PriceInfo {
  const { wholesalePrice, wholesaleTiers = [], moq = 10 } = product;

  // Check if quantity meets MOQ
  if (quantity < moq) {
    return {
      price: 0,
      discount: 0,
      priceType: 'wholesale',
    };
  }

  // Check for tiered pricing
  if (wholesaleTiers && wholesaleTiers.length > 0) {
    const tier = findApplicableTier(wholesaleTiers, quantity);
    
    if (tier) {
      return {
        price: tier.price,
        originalPrice: wholesalePrice,
        discount: tier.discount,
        tier,
        savings: (wholesalePrice - tier.price) * quantity,
        priceType: 'tier',
      };
    }
  }

  // Base wholesale price (no tier applied)
  return {
    price: wholesalePrice || 0,
    discount: 0,
    priceType: 'wholesale',
  };
}

/**
 * Calculate wholesale price with full details
 * Returns comprehensive pricing breakdown
 */
export function calculateWholesalePrice(
  product: Product,
  quantity: number
): PriceCalculation {
  const { moq, wholesalePrice, wholesaleTiers = [] } = product;

  // Check if quantity meets MOQ
  const meetsMinimum = quantity >= moq;

  if (!meetsMinimum) {
    return {
      unitPrice: 0,
      totalPrice: 0,
      quantity,
      appliedTier: null,
      savings: 0,
      savingsPercentage: 0,
      meetsMinimum: false,
      minimumRequired: moq,
    };
  }

  // Find applicable tier
  let appliedTier: WholesaleTier | null = null;
  let unitPrice = wholesalePrice;

  if (wholesaleTiers.length > 0) {
    appliedTier = findApplicableTier(wholesaleTiers, quantity);
    if (appliedTier) {
      unitPrice = appliedTier.price;
    }
  }

  const totalPrice = unitPrice * quantity;
  const baseTotal = wholesalePrice * quantity;
  const savings = baseTotal - totalPrice;
  const savingsPercentage = baseTotal > 0 ? (savings / baseTotal) * 100 : 0;

  return {
    unitPrice,
    totalPrice,
    quantity,
    appliedTier,
    savings,
    savingsPercentage,
    meetsMinimum: true,
    minimumRequired: moq,
  };
}

/**
 * Find the applicable wholesale tier for a given quantity
 */
export function findApplicableTier(
  tiers: WholesaleTier[],
  quantity: number
): WholesaleTier | null {
  if (!tiers || tiers.length === 0) return null;

  // Sort tiers by minQuantity descending to find the best tier
  const sortedTiers = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);

  for (const tier of sortedTiers) {
    if (quantity >= tier.minQuantity) {
      if (tier.maxQuantity === null || quantity <= tier.maxQuantity) {
        return tier;
      }
    }
  }

  return null;
}

/**
 * Get all wholesale tiers for display
 */
export function getWholesaleTiers(product: Product): WholesaleTier[] {
  return product.wholesaleTiers || [];
}

/**
 * Get all available tiers for display with formatting
 * Shows customer how much they can save with larger quantities
 */
export function getAvailableTiers(
  product: Product
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

  return wholesaleTiers.map((tier) => {
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
 * Calculate total price for cart items (wholesale only)
 */
export function calculateCartTotal(
  items: Array<{ product: Product; quantity: number }>
): number {
  return items.reduce((total, item) => {
    const priceInfo = calculatePrice(item.product, item.quantity);
    return total + (priceInfo.price * item.quantity);
  }, 0);
}

/**
 * Calculate bulk order savings
 */
export function calculateBulkSavings(
  product: Product,
  quantity: number
): number {
  if (!product.wholesaleTiers || product.wholesaleTiers.length === 0) {
    return 0;
  }

  const basePrice = product.wholesalePrice || 0;
  const priceInfo = calculatePrice(product, quantity);

  if (priceInfo.tier) {
    return (basePrice - priceInfo.price) * quantity;
  }

  return 0;
}

/**
 * Calculate next tier benefits
 * Shows customer how much more they need to order to unlock better pricing
 */
export function getNextTierBenefit(
  product: Product,
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
  product: Product,
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

  // Check stock availability if provided
  if (product.stockQuantity !== undefined) {
    if (quantity > product.stockQuantity) {
      if (product.stockQuantity === 0) {
        errors.push('Product is out of stock');
      } else {
        errors.push(`Only ${product.stockQuantity} units available in stock`);
      }
    } else if (quantity > product.stockQuantity * 0.8) {
      warnings.push(`Low stock: Only ${product.stockQuantity} units remaining`);
    }
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
  products: Array<{ product: Product; quantity: number }>,
  shippingCost: number = 0,
  taxRate: number = 0
): {
  items: Array<{
    productId: string | number;
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
 * Get minimum order quantity (MOQ)
 */
export function getMinimumOrderQuantity(
  product: Product
): number {
  return product.moq || product.minOrderQuantity || 10;
}

/**
 * Get recommended order quantity
 * Suggests optimal quantity based on tiers and stock
 */
export function getRecommendedQuantity(
  product: Product
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
  const availableTiers = stockQuantity !== undefined
    ? wholesaleTiers.filter(tier => tier.minQuantity <= stockQuantity)
    : wholesaleTiers;
  
  if (availableTiers.length === 0) {
    const safeQuantity = stockQuantity !== undefined ? Math.min(moq, stockQuantity) : moq;
    return {
      quantity: safeQuantity,
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
 * Format price with currency
 */
export function formatPrice(price: number, currency: string = 'BDT'): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
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
 * Format discount percentage
 */
export function formatDiscount(discount: number): string {
  return `${discount}% OFF`;
}

