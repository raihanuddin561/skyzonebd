// __tests__/utils/cartPricing.test.ts
// Verifies P3-6: cart/checkout/product-detail pricing previews use real
// bulk-pricing tiers instead of a naive price * quantity that silently
// ignored them. Covers the extracted, shared getUnitPrice/getLineTotal.

import { getUnitPrice, getLineTotal } from '@/utils/cartPricing';
import type { Product } from '@/types/cart';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Test Product',
    price: 100,
    companyName: 'Test Co',
    imageUrl: 'x.jpg',
    ...overrides,
  };
}

describe('getUnitPrice', () => {
  it('returns the flat price when there is no bulk pricing', () => {
    expect(getUnitPrice(product(), 5)).toBe(100);
  });

  it('applies the highest bulk-pricing tier the quantity qualifies for', () => {
    const p = product({
      bulkPricing: [
        { quantity: 10, price: 90 },
        { quantity: 50, price: 75 },
      ],
    });

    expect(getUnitPrice(p, 5)).toBe(100); // below the lowest tier threshold
    expect(getUnitPrice(p, 10)).toBe(90);
    expect(getUnitPrice(p, 49)).toBe(90);
    expect(getUnitPrice(p, 50)).toBe(75);
    expect(getUnitPrice(p, 1000)).toBe(75); // highest tier has no upper bound
  });
});

describe('getLineTotal', () => {
  it('multiplies the tier-aware unit price by quantity, not the flat price', () => {
    const p = product({ bulkPricing: [{ quantity: 10, price: 90 }] });
    expect(getLineTotal(p, 10)).toBe(900); // NOT 1000 (10 * flat price)
  });

  it('falls back to flat price * quantity with no bulk pricing', () => {
    expect(getLineTotal(product(), 3)).toBe(300);
  });
});

// wholesaleTiers is the field the products API actually returns
// (src/app/api/products/route.ts, src/app/api/products/[id]/route.ts) —
// `bulkPricing` above is a legacy shape nothing populates. Cart/checkout
// used to read `bulkPricing` exclusively, so a wholesale customer would see
// a higher, wrong total in the cart than the server (which correctly uses
// wholesaleTiers via pricingEngine.calculateItemPrice) actually charged.
describe('getUnitPrice / getLineTotal — wholesaleTiers (the real field)', () => {
  it('falls back to the flat price when there are no tiers', () => {
    expect(getUnitPrice(product(), 50)).toBe(100);
  });

  it('applies the matching tier for a bounded range and an unbounded top tier', () => {
    const p = product({
      wholesaleTiers: [
        { minQuantity: 10, maxQuantity: 49, price: 90 },
        { minQuantity: 50, maxQuantity: null, price: 80 },
      ],
    });

    expect(getUnitPrice(p, 5)).toBe(100); // below first tier -> flat price
    expect(getUnitPrice(p, 10)).toBe(90); // bottom of bounded tier
    expect(getUnitPrice(p, 49)).toBe(90); // top of bounded tier
    expect(getUnitPrice(p, 50)).toBe(80); // next tier, unbounded
    expect(getUnitPrice(p, 1000)).toBe(80);
  });

  it('computes line totals using the tier-applied unit price', () => {
    const p = product({ wholesaleTiers: [{ minQuantity: 20, maxQuantity: null, price: 75 }] });
    expect(getLineTotal(p, 20)).toBe(1500);
    expect(getLineTotal(p, 5)).toBe(500); // below tier, flat price
  });

  it('prefers wholesaleTiers over the legacy bulkPricing field when both are present', () => {
    const p = product({
      wholesaleTiers: [{ minQuantity: 10, maxQuantity: null, price: 85 }],
      bulkPricing: [{ quantity: 10, price: 999 }],
    });
    expect(getUnitPrice(p, 10)).toBe(85);
  });
});
