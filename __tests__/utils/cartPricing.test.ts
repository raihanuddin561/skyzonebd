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
