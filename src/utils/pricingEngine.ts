/**
 * Pricing Engine - Single Source of Truth for Price Calculations
 * 
 * This utility handles all pricing logic for the wholesale e-commerce platform.
 * It combines:
 * 1. Wholesale tier pricing (quantity-based discounts)
 * 2. Customer-specific discount percentages
 * 3. Rounding and final price calculation
 * 
 * Used by both client (preview) and server (enforcement).
 * Server MUST use this for final price calculation during order creation.
 */

import { WholesaleTier, Product } from './pricing';

export interface PriceCalculationInput {
  product: Product;
  quantity: number;
  customerDiscount?: number; // Percentage (0-100)
  customerDiscountValid?: boolean;
}

export interface PriceCalculationResult {
  // Base pricing
  basePrice: number; // Wholesale price before any discounts
  quantity: number;
  
  // Tier pricing
  tierApplied: WholesaleTier | null;
  tierPrice: number; // Price after tier discount
  tierDiscount: number; // Discount amount from tier
  tierDiscountPercent: number; // Discount percentage from tier
  
  // Customer discount
  customerDiscountPercent: number; // Applied customer discount %
  customerDiscountAmount: number; // Dollar amount of customer discount
  
  // Final pricing
  subtotalBeforeDiscount: number; // tierPrice * quantity
  subtotalAfterDiscount: number; // After customer discount
  finalUnitPrice: number; // Final price per unit
  finalTotal: number; // Final total price
  
  // Savings
  totalSavings: number; // Total saved vs base price
  totalSavingsPercent: number; // Percentage saved
  
  // Validation
  meetsMinimum: boolean;
  minimumRequired: number;
}

/**
 * Calculate final price with tier pricing and customer discount
 * This is the MASTER pricing function - use this everywhere!
 */
export function calculateItemPrice(input: PriceCalculationInput): PriceCalculationResult {
  const {
    product,
    quantity,
    customerDiscount = 0,
    customerDiscountValid = false
  } = input;

  const { wholesalePrice, moq, wholesaleTiers = [] } = product;

  // Check MOQ
  const meetsMinimum = quantity >= moq;
  if (!meetsMinimum) {
    return {
      basePrice: wholesalePrice,
      quantity,
      tierApplied: null,
      tierPrice: 0,
      tierDiscount: 0,
      tierDiscountPercent: 0,
      customerDiscountPercent: 0,
      customerDiscountAmount: 0,
      subtotalBeforeDiscount: 0,
      subtotalAfterDiscount: 0,
      finalUnitPrice: 0,
      finalTotal: 0,
      totalSavings: 0,
      totalSavingsPercent: 0,
      meetsMinimum: false,
      minimumRequired: moq
    };
  }

  // Step 1: Find applicable wholesale tier
  const tierApplied = findApplicableTier(wholesaleTiers, quantity);
  const tierPrice = tierApplied ? tierApplied.price : wholesalePrice;
  const tierDiscountPercent = tierApplied ? tierApplied.discount : 0;
  const tierDiscount = wholesalePrice - tierPrice;

  // Step 2: Calculate subtotal with tier pricing
  const subtotalBeforeDiscount = tierPrice * quantity;

  // Step 3: Apply customer discount if valid
  const applicableCustomerDiscount = customerDiscountValid ? customerDiscount : 0;
  const customerDiscountAmount = (subtotalBeforeDiscount * applicableCustomerDiscount) / 100;
  const subtotalAfterDiscount = subtotalBeforeDiscount - customerDiscountAmount;

  // Step 4: Calculate final prices
  const finalUnitPrice = subtotalAfterDiscount / quantity;
  const finalTotal = subtotalAfterDiscount;

  // Step 5: Calculate total savings
  const baseTotal = wholesalePrice * quantity;
  const totalSavings = baseTotal - finalTotal;
  const totalSavingsPercent = baseTotal > 0 ? (totalSavings / baseTotal) * 100 : 0;

  return {
    basePrice: wholesalePrice,
    quantity,
    tierApplied,
    tierPrice,
    tierDiscount: tierDiscount * quantity,
    tierDiscountPercent,
    customerDiscountPercent: applicableCustomerDiscount,
    customerDiscountAmount,
    subtotalBeforeDiscount,
    subtotalAfterDiscount,
    finalUnitPrice: roundPrice(finalUnitPrice),
    finalTotal: roundPrice(finalTotal),
    totalSavings: roundPrice(totalSavings),
    totalSavingsPercent: roundPercent(totalSavingsPercent),
    meetsMinimum: true,
    minimumRequired: moq
  };
}

/**
 * Calculate cart total with tier pricing and customer discount
 */
export function calculateCartTotal(
  items: Array<{ product: Product; quantity: number }>,
  customerDiscount: number = 0,
  customerDiscountValid: boolean = false
): {
  itemDetails: Array<PriceCalculationResult & { productId: string | number; productName: string }>;
  subtotal: number;
  totalCustomerDiscount: number;
  total: number;
  totalSavings: number;
} {
  const itemDetails = items.map(({ product, quantity }) => {
    const priceInfo = calculateItemPrice({
      product,
      quantity,
      customerDiscount,
      customerDiscountValid
    });

    return {
      ...priceInfo,
      productId: product.id,
      productName: product.name
    };
  });

  const subtotal = itemDetails.reduce((sum, item) => sum + item.subtotalBeforeDiscount, 0);
  const totalCustomerDiscount = itemDetails.reduce((sum, item) => sum + item.customerDiscountAmount, 0);
  const total = itemDetails.reduce((sum, item) => sum + item.finalTotal, 0);
  const totalSavings = itemDetails.reduce((sum, item) => sum + item.totalSavings, 0);

  return {
    itemDetails,
    subtotal: roundPrice(subtotal),
    totalCustomerDiscount: roundPrice(totalCustomerDiscount),
    total: roundPrice(total),
    totalSavings: roundPrice(totalSavings)
  };
}

/**
 * Find the applicable wholesale tier for a given quantity
 * (Imported from pricing.ts for consistency)
 */
function findApplicableTier(
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
 * Format price for display
 */
export function formatPrice(price: number, currency: string = '৳'): string {
  return `${currency}${roundPrice(price).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Round price to 2 decimal places
 */
export function roundPrice(price: number): number {
  return Math.round(price * 100) / 100;
}

/**
 * Round percentage to 1 decimal place
 */
export function roundPercent(percent: number): number {
  return Math.round(percent * 10) / 10;
}

/**
 * Validate customer discount
 */
export function validateCustomerDiscount(
  discountPercent: number | null | undefined,
  validUntil: Date | null | undefined
): {
  isValid: boolean;
  applicablePercent: number;
  reason?: string;
} {
  // No discount set
  if (!discountPercent || discountPercent <= 0) {
    return { isValid: false, applicablePercent: 0, reason: 'No discount set' };
  }

  // Check percentage range
  if (discountPercent < 0 || discountPercent > 100) {
    return { isValid: false, applicablePercent: 0, reason: 'Invalid discount percentage' };
  }

  // Check expiration
  if (validUntil && new Date(validUntil) < new Date()) {
    return { isValid: false, applicablePercent: 0, reason: 'Discount expired' };
  }

  return { isValid: true, applicablePercent: discountPercent };
}

/**
 * Calculate price breakdown for display
 * (User-friendly version for product pages and cart)
 */
export function getPriceBreakdown(
  product: Product,
  quantity: number,
  customerDiscount?: number,
  customerDiscountValid?: boolean
): {
  basePrice: string;
  tierInfo: string | null;
  customerDiscountInfo: string | null;
  finalPrice: string;
  savings: string | null;
  savingsPercent: string | null;
} {
  const result = calculateItemPrice({
    product,
    quantity,
    customerDiscount,
    customerDiscountValid
  });

  if (!result.meetsMinimum) {
    return {
      basePrice: formatPrice(result.basePrice),
      tierInfo: `Minimum order: ${result.minimumRequired} units`,
      customerDiscountInfo: null,
      finalPrice: 'N/A',
      savings: null,
      savingsPercent: null
    };
  }

  const tierInfo = result.tierApplied
    ? `Tier ${result.tierApplied.minQuantity}+ units: ${result.tierDiscountPercent}% off`
    : null;

  const customerDiscountInfo = result.customerDiscountPercent > 0
    ? `Customer discount: ${result.customerDiscountPercent}% off`
    : null;

  const savings = result.totalSavings > 0
    ? formatPrice(result.totalSavings)
    : null;

  const savingsPercent = result.totalSavingsPercent > 0
    ? `${result.totalSavingsPercent.toFixed(1)}%`
    : null;

  return {
    basePrice: formatPrice(result.basePrice),
    tierInfo,
    customerDiscountInfo,
    finalPrice: formatPrice(result.finalUnitPrice),
    savings,
    savingsPercent
  };
}

/**
 * Get tier pricing table for product page display
 */
export function getTierPricingTable(
  product: Product,
  customerDiscount?: number,
  customerDiscountValid?: boolean
): Array<{
  range: string;
  unitPrice: string;
  totalDiscount: string;
  finalUnitPrice: string;
  finalTotal: string;
  savings: string;
}> {
  const { wholesalePrice, wholesaleTiers = [], moq } = product;

  if (wholesaleTiers.length === 0) {
    // No tiers - just base price
    const qty = moq;
    const result = calculateItemPrice({
      product,
      quantity: qty,
      customerDiscount,
      customerDiscountValid
    });

    return [{
      range: `${moq}+`,
      unitPrice: formatPrice(wholesalePrice),
      totalDiscount: '0%',
      finalUnitPrice: formatPrice(result.finalUnitPrice),
      finalTotal: formatPrice(result.finalTotal),
      savings: result.totalSavings > 0 ? formatPrice(result.totalSavings) : '৳0'
    }];
  }

  // Build table for each tier
  return wholesaleTiers.map(tier => {
    const qty = tier.minQuantity;
    const result = calculateItemPrice({
      product,
      quantity: qty,
      customerDiscount,
      customerDiscountValid
    });

    const range = tier.maxQuantity
      ? `${tier.minQuantity}-${tier.maxQuantity}`
      : `${tier.minQuantity}+`;

    const totalDiscountPercent = tier.discount + (result.customerDiscountPercent || 0);

    return {
      range,
      unitPrice: formatPrice(tier.price),
      totalDiscount: `${totalDiscountPercent.toFixed(1)}%`,
      finalUnitPrice: formatPrice(result.finalUnitPrice),
      finalTotal: formatPrice(result.finalTotal),
      savings: formatPrice(result.totalSavings)
    };
  });
}
