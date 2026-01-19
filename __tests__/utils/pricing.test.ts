// __tests__/utils/pricing.test.ts
// Unit tests for wholesale pricing calculations

import {
  calculatePrice,
  calculateWholesalePrice,
  findApplicableTier,
  getNextTierBenefit,
  validateWholesaleOrder,
  calculateBulkDiscount,
  type Product,
  type WholesaleTier,
} from '@/utils/pricing';

describe('Wholesale Pricing Calculations', () => {
  const mockProduct: Product = {
    id: 'prod-1',
    name: 'Test Product',
    wholesalePrice: 100,
    moq: 10,
    wholesaleTiers: [
      { minQuantity: 10, maxQuantity: 49, price: 95, discount: 5 },
      { minQuantity: 50, maxQuantity: 99, price: 90, discount: 10 },
      { minQuantity: 100, maxQuantity: null, price: 85, discount: 15 },
    ],
  };

  describe('calculatePrice', () => {
    it('should return 0 price if quantity is below MOQ', () => {
      const result = calculatePrice(mockProduct, 5);
      expect(result.price).toBe(0);
      expect(result.discount).toBe(0);
    });

    it('should return base wholesale price if no tier applies', () => {
      const productNoTiers: Product = {
        ...mockProduct,
        wholesaleTiers: [],
      };
      const result = calculatePrice(productNoTiers, 10);
      expect(result.price).toBe(100);
      expect(result.priceType).toBe('wholesale');
    });

    it('should apply correct tier for quantity 50', () => {
      const result = calculatePrice(mockProduct, 50);
      expect(result.price).toBe(90);
      expect(result.discount).toBe(10);
      expect(result.priceType).toBe('tier');
      expect(result.savings).toBe(500); // (100 - 90) * 50
    });

    it('should apply highest tier for quantity 100+', () => {
      const result = calculatePrice(mockProduct, 150);
      expect(result.price).toBe(85);
      expect(result.discount).toBe(15);
      expect(result.savings).toBe(2250); // (100 - 85) * 150
    });
  });

  describe('calculateWholesalePrice', () => {
    it('should return full calculation details', () => {
      const result = calculateWholesalePrice(mockProduct, 50);
      expect(result.unitPrice).toBe(90);
      expect(result.totalPrice).toBe(4500);
      expect(result.quantity).toBe(50);
      expect(result.meetsMinimum).toBe(true);
      expect(result.savings).toBe(500);
      expect(result.savingsPercentage).toBeCloseTo(10);
    });

    it('should reject orders below MOQ', () => {
      const result = calculateWholesalePrice(mockProduct, 5);
      expect(result.meetsMinimum).toBe(false);
      expect(result.unitPrice).toBe(0);
      expect(result.totalPrice).toBe(0);
      expect(result.minimumRequired).toBe(10);
    });

    it('should handle products without tiers', () => {
      const simpleProduct: Product = {
        ...mockProduct,
        wholesaleTiers: [],
      };
      const result = calculateWholesalePrice(simpleProduct, 20);
      expect(result.unitPrice).toBe(100);
      expect(result.appliedTier).toBeNull();
      expect(result.savings).toBe(0);
    });
  });

  describe('findApplicableTier', () => {
    const tiers = mockProduct.wholesaleTiers!;

    it('should find correct tier for edge cases', () => {
      expect(findApplicableTier(tiers, 10)?.price).toBe(95);
      expect(findApplicableTier(tiers, 49)?.price).toBe(95);
      expect(findApplicableTier(tiers, 50)?.price).toBe(90);
      expect(findApplicableTier(tiers, 99)?.price).toBe(90);
      expect(findApplicableTier(tiers, 100)?.price).toBe(85);
      expect(findApplicableTier(tiers, 1000)?.price).toBe(85);
    });

    it('should return null if no tier applies', () => {
      expect(findApplicableTier(tiers, 5)).toBeNull();
    });

    it('should handle empty tier array', () => {
      expect(findApplicableTier([], 50)).toBeNull();
    });
  });

  describe('getNextTierBenefit', () => {
    it('should calculate next tier benefit correctly', () => {
      const result = getNextTierBenefit(mockProduct, 30);
      expect(result).not.toBeNull();
      expect(result!.quantityNeeded).toBe(20); // Need 20 more to reach 50
      expect(result!.nextTier.minQuantity).toBe(50);
      expect(result!.currentUnitPrice).toBe(95);
      expect(result!.nextUnitPrice).toBe(90);
    });

    it('should return null if already at highest tier', () => {
      const result = getNextTierBenefit(mockProduct, 100);
      expect(result).toBeNull();
    });

    it('should return null if product has no tiers', () => {
      const simpleProduct: Product = {
        ...mockProduct,
        wholesaleTiers: [],
      };
      const result = getNextTierBenefit(simpleProduct, 50);
      expect(result).toBeNull();
    });
  });

  describe('validateWholesaleOrder', () => {
    it('should validate successful order', () => {
      const productWithStock: Product = {
        ...mockProduct,
        stockQuantity: 100,
      };
      const result = validateWholesaleOrder(productWithStock, 50);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject order below MOQ', () => {
      const result = validateWholesaleOrder(mockProduct, 5);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Minimum order quantity is 10 units');
    });

    it('should reject order exceeding stock', () => {
      const productWithStock: Product = {
        ...mockProduct,
        stockQuantity: 20,
      };
      const result = validateWholesaleOrder(productWithStock, 50);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Only 20 units available');
    });

    it('should warn about low stock', () => {
      const productWithStock: Product = {
        ...mockProduct,
        stockQuantity: 100,
      };
      const result = validateWholesaleOrder(productWithStock, 85);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Low stock');
    });
  });

  describe('calculateBulkDiscount', () => {
    it('should calculate discount percentage correctly', () => {
      expect(calculateBulkDiscount(100, 85)).toBeCloseTo(15);
      expect(calculateBulkDiscount(100, 90)).toBeCloseTo(10);
      expect(calculateBulkDiscount(100, 100)).toBe(0);
    });

    it('should handle zero base price', () => {
      expect(calculateBulkDiscount(0, 50)).toBe(0);
    });
  });
});
