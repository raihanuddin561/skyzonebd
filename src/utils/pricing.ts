// utils/pricing.ts - WHOLESALE-ONLY Price calculation utilities

import { Product, WholesaleTier } from '@/types/product';

export interface PriceInfo {
  price: number;
  originalPrice?: number;
  discount?: number;
  tier?: WholesaleTier;
  savings?: number;
  priceType: 'wholesale' | 'tier';
}

/**
 * Calculate the wholesale price for a product based on quantity
 * WHOLESALE ONLY - No retail pricing
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
 * Get minimum order quantity (MOQ)
 */
export function getMinimumOrderQuantity(
  product: Product
): number {
  return product.moq || product.minOrderQuantity || 10;
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
 * Format discount percentage
 */
export function formatDiscount(discount: number): string {
  return `${discount}% OFF`;
}
