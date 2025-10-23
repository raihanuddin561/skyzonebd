// utils/pricing.ts - Price calculation utilities for B2C/B2B

import { Product, WholesaleTier } from '@/types/product';
import { UserType } from '@/types/auth';

export interface PriceInfo {
  price: number;
  originalPrice?: number;
  discount?: number;
  tier?: WholesaleTier;
  savings?: number;
  priceType: 'retail' | 'sale' | 'wholesale';
}

/**
 * Calculate the effective price for a product based on user type and quantity
 */
export function calculatePrice(
  product: Product,
  quantity: number,
  userType: UserType = 'guest'
): PriceInfo {
  // Guest and retail customers get retail pricing
  if (userType === 'guest' || userType === 'retail') {
    const retailPrice = product.salePrice || product.retailPrice || product.price;
    const originalPrice = product.salePrice ? product.retailPrice : undefined;
    const discount = originalPrice 
      ? Math.round(((originalPrice - retailPrice) / originalPrice) * 100)
      : 0;

    return {
      price: retailPrice,
      originalPrice,
      discount,
      priceType: product.salePrice ? 'sale' : 'retail',
    };
  }

  // Wholesale customers get tiered pricing
  if (userType === 'wholesale' && product.wholesaleEnabled) {
    // Check if quantity meets wholesale MOQ
    if (product.wholesaleMOQ && quantity >= product.wholesaleMOQ) {
      const tier = findApplicableTier(product.wholesaleTiers || [], quantity);
      
      if (tier) {
        const retailPrice = product.retailPrice || product.price;
        const savings = (retailPrice - tier.price) * quantity;
        
        return {
          price: tier.price,
          originalPrice: retailPrice,
          discount: tier.discount,
          tier,
          savings,
          priceType: 'wholesale',
        };
      }
    }

    // If wholesale enabled but quantity below MOQ, show retail with note
    const retailPrice = product.retailPrice || product.price;
    return {
      price: retailPrice,
      priceType: 'retail',
    };
  }

  // Fallback to retail price
  return {
    price: product.retailPrice || product.price,
    priceType: 'retail',
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
 * Get all applicable tiers for display
 */
export function getWholesaleTiers(product: Product): WholesaleTier[] {
  if (!product.wholesaleEnabled || !product.wholesaleTiers) {
    return [];
  }

  return [...product.wholesaleTiers].sort((a, b) => a.minQuantity - b.minQuantity);
}

/**
 * Calculate total price for cart items
 */
export function calculateCartTotal(
  items: Array<{ product: Product; quantity: number }>,
  userType: UserType = 'guest'
): number {
  return items.reduce((total, item) => {
    const priceInfo = calculatePrice(item.product, item.quantity, userType);
    return total + (priceInfo.price * item.quantity);
  }, 0);
}

/**
 * Calculate potential savings if customer upgrades to wholesale
 */
export function calculateWholesaleSavings(
  product: Product,
  quantity: number
): number {
  if (!product.wholesaleEnabled || !product.wholesaleTiers) {
    return 0;
  }

  const retailPrice = product.retailPrice || product.price;
  const tier = findApplicableTier(product.wholesaleTiers, quantity);

  if (tier) {
    const retailTotal = retailPrice * quantity;
    const wholesaleTotal = tier.price * quantity;
    return retailTotal - wholesaleTotal;
  }

  return 0;
}

/**
 * Get minimum order quantity based on user type
 */
export function getMinimumOrderQuantity(
  product: Product,
  userType: UserType = 'guest'
): number {
  if (userType === 'wholesale' && product.wholesaleEnabled) {
    return product.wholesaleMOQ || product.minOrderQuantity || 1;
  }
  
  return product.retailMOQ || product.minOrderQuantity || 1;
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
