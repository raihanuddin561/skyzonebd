// utils/cartPricing.ts
// Applies a product's bulk-pricing tiers (types/cart.ts's `Product.bulkPricing`
// — a simple { quantity, price }[] list distinct from the wholesale-tier
// shape utils/pricingEngine.ts expects) to a given quantity. Extracted from
// duplicated inline logic that previously existed only on the product
// detail page's pre-add-to-cart preview — the cart itself ignored bulk
// pricing entirely and summed a flat `price * quantity`.

import type { Product } from '@/types/cart';

/**
 * Returns the per-unit price for `quantity` of `product`, applying the best
 * matching bulk-pricing tier (highest `quantity` threshold at or below the
 * requested quantity) if one exists, otherwise the product's flat price.
 */
export function getUnitPrice(product: Product, quantity: number): number {
  if (product.bulkPricing && product.bulkPricing.length > 0) {
    const applicableTier = product.bulkPricing
      .filter(tier => quantity >= tier.quantity)
      .sort((a, b) => b.quantity - a.quantity)[0];

    if (applicableTier) {
      return applicableTier.price;
    }
  }

  return product.price;
}

/** Returns the bulk-pricing-aware line total for one cart item. */
export function getLineTotal(product: Product, quantity: number): number {
  return getUnitPrice(product, quantity) * quantity;
}
