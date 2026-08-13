// utils/cartPricing.ts
// Applies a product's wholesale volume-pricing tiers to a given quantity so
// the cart/checkout preview matches what the server will actually charge
// (src/utils/pricingEngine.ts's calculateItemPrice, used at order-creation
// time). Previously read a `bulkPricing` field the products API never
// populated (the real field is `wholesaleTiers`), so cart/checkout always
// silently fell back to the flat price even when a lower tier applied.

import type { Product } from '@/types/cart';

/**
 * Returns the best matching wholesale tier for `quantity`, mirroring
 * pricingEngine.ts's findApplicableTier: the highest `minQuantity` tier
 * whose range (`minQuantity` to `maxQuantity`, inclusive, unbounded if
 * `maxQuantity` is null) contains `quantity`.
 */
function findApplicableTier(
  tiers: NonNullable<Product['wholesaleTiers']>,
  quantity: number
) {
  const sorted = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
  for (const tier of sorted) {
    if (quantity >= tier.minQuantity && (tier.maxQuantity === null || tier.maxQuantity === undefined || quantity <= tier.maxQuantity)) {
      return tier;
    }
  }
  return null;
}

/**
 * Returns the per-unit price for `quantity` of `product`, applying the best
 * matching wholesale tier if one exists, otherwise the product's flat price.
 */
export function getUnitPrice(product: Product, quantity: number): number {
  if (product.wholesaleTiers && product.wholesaleTiers.length > 0) {
    const applicableTier = findApplicableTier(product.wholesaleTiers, quantity);
    if (applicableTier) {
      return applicableTier.price;
    }
  }

  if (product.bulkPricing && product.bulkPricing.length > 0) {
    const applicableTier = product.bulkPricing
      .filter(tier => quantity >= tier.quantity)
      .sort((a, b) => b.quantity - a.quantity)[0];

    if (applicableTier) {
      return applicableTier.price;
    }
  }

  return typeof product.price === 'number' && !Number.isNaN(product.price) ? product.price : 0;
}

/** Returns the tier-aware line total for one cart item. */
export function getLineTotal(product: Product, quantity: number): number {
  return getUnitPrice(product, quantity) * quantity;
}
