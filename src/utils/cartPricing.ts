// utils/cartPricing.ts
// Applies a product's wholesale volume-pricing tiers to a given quantity so
// the cart/checkout preview matches what the server will actually charge
// (src/utils/pricingEngine.ts's calculateItemPrice, used at order-creation
// time). Previously read a `bulkPricing` field the products API never
// populated (the real field is `wholesaleTiers`), so cart/checkout always
// silently fell back to the flat price even when a lower tier applied.

import type { Product } from '@/types/cart';
import { validateCustomerDiscount, roundPrice } from '@/utils/pricingEngine';

/**
 * Customer-specific discount info, as returned by GET /api/user/profile and
 * stored on AuthContext's `user` (see src/types/auth.ts's User.discountPercent
 * / discountValidUntil). `discountValidUntil` is an ISO string here (it comes
 * from JSON), unlike pricingEngine.ts's server-side Date.
 */
export interface CustomerDiscountInput {
  discountPercent?: number | null;
  discountValidUntil?: string | null;
}

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
 * Returns the per-unit tier price for `quantity` of `product` (no customer
 * discount applied), applying the best matching wholesale tier if one
 * exists, otherwise the product's flat price.
 */
function getTierUnitPrice(product: Product, quantity: number): number {
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

/**
 * Returns the applicable customer discount percentage, reusing
 * pricingEngine.ts's validateCustomerDiscount so the validity rule (no
 * discount set, out-of-range percent, or expired `discountValidUntil`)
 * exactly matches what POST /api/orders enforces server-side.
 */
function getApplicableCustomerDiscountPercent(customerDiscount?: CustomerDiscountInput | null): number {
  if (!customerDiscount) return 0;
  const validUntil = customerDiscount.discountValidUntil ? new Date(customerDiscount.discountValidUntil) : null;
  const { isValid, applicablePercent } = validateCustomerDiscount(customerDiscount.discountPercent, validUntil);
  return isValid ? applicablePercent : 0;
}

/**
 * Returns the per-unit price for `quantity` of `product`, applying the best
 * matching wholesale tier and, if provided and currently valid, the
 * customer's discount on top of it (same order of operations as
 * pricingEngine.ts's calculateItemPrice: tier price, THEN customer discount).
 */
export function getUnitPrice(
  product: Product,
  quantity: number,
  customerDiscount?: CustomerDiscountInput | null
): number {
  const tierPrice = getTierUnitPrice(product, quantity);
  const discountPercent = getApplicableCustomerDiscountPercent(customerDiscount);
  if (discountPercent <= 0 || quantity <= 0) {
    return tierPrice;
  }

  // Mirror calculateItemPrice's finalUnitPrice: round the line total first,
  // then derive the per-unit price from that already-rounded total, instead
  // of rounding the discounted unit price independently (that can disagree
  // with the rounded total by a cent — see pricingEngine.ts's finalTotal
  // comment for the concrete example).
  const subtotalBeforeDiscount = tierPrice * quantity;
  const discountAmount = (subtotalBeforeDiscount * discountPercent) / 100;
  const finalTotal = roundPrice(subtotalBeforeDiscount - discountAmount);
  return roundPrice(finalTotal / quantity);
}

/**
 * Returns the tier-aware line total for one cart item, applying the
 * customer's discount on top of tier pricing if provided and currently
 * valid — matching pricingEngine.ts's calculateItemPrice exactly (tier
 * price * quantity, then customer discount, then round).
 */
export function getLineTotal(
  product: Product,
  quantity: number,
  customerDiscount?: CustomerDiscountInput | null
): number {
  const tierPrice = getTierUnitPrice(product, quantity);
  const subtotalBeforeDiscount = tierPrice * quantity;
  const discountPercent = getApplicableCustomerDiscountPercent(customerDiscount);
  if (discountPercent <= 0) {
    return subtotalBeforeDiscount;
  }

  const discountAmount = (subtotalBeforeDiscount * discountPercent) / 100;
  return roundPrice(subtotalBeforeDiscount - discountAmount);
}
