// __tests__/utils/pricingEngine.test.ts
// Comprehensive tests for pricing engine with tier + customer discount

import {
  calculateItemPrice,
  calculateCartTotal,
  validateCustomerDiscount,
  getPriceBreakdown,
  getTierPricingTable,
  formatPrice,
  roundPrice,
  type PriceCalculationInput,
  type PriceCalculationResult
} from '@/utils/pricingEngine';
import { Product, WholesaleTier } from '@/utils/pricing';

describe('Pricing Engine - Tier + Customer Discount', () => {
  const mockProduct: Product = {
    id: 'prod-123',
    name: 'Test Widget',
    wholesalePrice: 100,
    moq: 10,
    wholesaleTiers: [
      { minQuantity: 10, maxQuantity: 49, price: 95, discount: 5 },
      { minQuantity: 50, maxQuantity: 99, price: 90, discount: 10 },
      { minQuantity: 100, maxQuantity: null, price: 85, discount: 15 }
    ]
  };

  describe('calculateItemPrice - Basic Tier Selection', () => {
    it('should reject orders below MOQ', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 5
      });

      expect(result.meetsMinimum).toBe(false);
      expect(result.finalTotal).toBe(0);
      expect(result.minimumRequired).toBe(10);
    });

    it('should apply first tier (10-49) correctly', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 30
      });

      expect(result.meetsMinimum).toBe(true);
      expect(result.tierApplied?.minQuantity).toBe(10);
      expect(result.tierPrice).toBe(95);
      expect(result.tierDiscountPercent).toBe(5);
      expect(result.subtotalBeforeDiscount).toBe(2850); // 95 * 30
      expect(result.finalTotal).toBe(2850); // No customer discount
    });

    it('should apply second tier (50-99) correctly', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 75
      });

      expect(result.tierApplied?.minQuantity).toBe(50);
      expect(result.tierPrice).toBe(90);
      expect(result.tierDiscountPercent).toBe(10);
      expect(result.subtotalBeforeDiscount).toBe(6750); // 90 * 75
      expect(result.finalTotal).toBe(6750);
    });

    it('should apply highest tier (100+) correctly', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 150
      });

      expect(result.tierApplied?.minQuantity).toBe(100);
      expect(result.tierPrice).toBe(85);
      expect(result.tierDiscountPercent).toBe(15);
      expect(result.subtotalBeforeDiscount).toBe(12750); // 85 * 150
      expect(result.finalTotal).toBe(12750);
    });
  });

  describe('calculateItemPrice - Customer Discount Application', () => {
    it('should apply 10% customer discount on top of tier pricing', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 30,
        customerDiscount: 10,
        customerDiscountValid: true
      });

      expect(result.tierPrice).toBe(95); // Tier price
      expect(result.subtotalBeforeDiscount).toBe(2850); // 95 * 30
      expect(result.customerDiscountPercent).toBe(10);
      expect(result.customerDiscountAmount).toBe(285); // 2850 * 10%
      expect(result.subtotalAfterDiscount).toBe(2565); // 2850 - 285
      expect(result.finalTotal).toBe(2565);
      expect(result.finalUnitPrice).toBe(85.5); // 2565 / 30
    });

    it('should apply 15% customer discount with tier pricing', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 50,
        customerDiscount: 15,
        customerDiscountValid: true
      });

      expect(result.tierPrice).toBe(90); // Tier price
      expect(result.subtotalBeforeDiscount).toBe(4500); // 90 * 50
      expect(result.customerDiscountPercent).toBe(15);
      expect(result.customerDiscountAmount).toBe(675); // 4500 * 15%
      expect(result.subtotalAfterDiscount).toBe(3825); // 4500 - 675
      expect(result.finalTotal).toBe(3825);
    });

    it('should NOT apply customer discount when invalid (expired)', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 30,
        customerDiscount: 10,
        customerDiscountValid: false // Expired or invalid
      });

      expect(result.tierPrice).toBe(95);
      expect(result.customerDiscountPercent).toBe(0); // Not applied
      expect(result.customerDiscountAmount).toBe(0);
      expect(result.finalTotal).toBe(2850); // Just tier pricing
    });

    it('should handle 20% customer discount correctly', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 100,
        customerDiscount: 20,
        customerDiscountValid: true
      });

      expect(result.tierPrice).toBe(85); // Best tier
      expect(result.subtotalBeforeDiscount).toBe(8500); // 85 * 100
      expect(result.customerDiscountPercent).toBe(20);
      expect(result.customerDiscountAmount).toBe(1700); // 8500 * 20%
      expect(result.finalTotal).toBe(6800); // 8500 - 1700
      expect(result.finalUnitPrice).toBe(68); // Effective price per unit
    });
  });

  describe('calculateItemPrice - Savings Calculation', () => {
    it('should calculate total savings correctly (tier + customer)', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 50,
        customerDiscount: 10,
        customerDiscountValid: true
      });

      const baseTotal = 100 * 50; // 5000
      const tierTotal = 90 * 50;  // 4500
      const finalTotal = result.finalTotal; // 4050

      expect(result.totalSavings).toBe(baseTotal - finalTotal); // 950
      expect(result.totalSavingsPercent).toBeCloseTo(19, 0); // 19% total savings
    });

    it('should show 0 savings when no tier and no discount', () => {
      const simpleProduct: Product = {
        ...mockProduct,
        wholesaleTiers: []
      };

      const result = calculateItemPrice({
        product: simpleProduct,
        quantity: 10
      });

      expect(result.totalSavings).toBe(0);
      expect(result.totalSavingsPercent).toBe(0);
    });
  });

  describe('calculateItemPrice - Edge Cases', () => {
    it('should handle product with no tiers', () => {
      const noTierProduct: Product = {
        ...mockProduct,
        wholesaleTiers: []
      };

      const result = calculateItemPrice({
        product: noTierProduct,
        quantity: 20,
        customerDiscount: 10,
        customerDiscountValid: true
      });

      expect(result.tierApplied).toBeNull();
      expect(result.tierPrice).toBe(100); // Base price
      expect(result.customerDiscountPercent).toBe(10);
      expect(result.finalTotal).toBe(1800); // (100 * 20) * 0.9
    });

    it('should handle 0% customer discount', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 30,
        customerDiscount: 0,
        customerDiscountValid: true
      });

      expect(result.customerDiscountPercent).toBe(0);
      expect(result.customerDiscountAmount).toBe(0);
      expect(result.finalTotal).toBe(2850); // Just tier price
    });

    it('should handle undefined customer discount', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 30
      });

      expect(result.customerDiscountPercent).toBe(0);
      expect(result.customerDiscountAmount).toBe(0);
    });

    it('should handle exact tier boundaries', () => {
      // Exactly 50 units (tier boundary)
      const result1 = calculateItemPrice({
        product: mockProduct,
        quantity: 50
      });
      expect(result1.tierApplied?.minQuantity).toBe(50);

      // Exactly 100 units (tier boundary)
      const result2 = calculateItemPrice({
        product: mockProduct,
        quantity: 100
      });
      expect(result2.tierApplied?.minQuantity).toBe(100);
    });
  });

  describe('calculateCartTotal', () => {
    const product1: Product = {
      id: 'p1',
      name: 'Product 1',
      wholesalePrice: 100,
      moq: 10,
      wholesaleTiers: [
        { minQuantity: 10, maxQuantity: 49, price: 95, discount: 5 }
      ]
    };

    const product2: Product = {
      id: 'p2',
      name: 'Product 2',
      wholesalePrice: 50,
      moq: 5,
      wholesaleTiers: []
    };

    it('should calculate cart total for multiple products', () => {
      const items = [
        { product: product1, quantity: 20 },
        { product: product2, quantity: 10 }
      ];

      const result = calculateCartTotal(items);

      expect(result.itemDetails).toHaveLength(2);
      expect(result.subtotal).toBe(2400); // (95*20) + (50*10)
      expect(result.total).toBe(2400);
      expect(result.totalCustomerDiscount).toBe(0);
    });

    it('should apply customer discount to entire cart', () => {
      const items = [
        { product: product1, quantity: 20 },
        { product: product2, quantity: 10 }
      ];

      const result = calculateCartTotal(items, 10, true);

      expect(result.subtotal).toBe(2400); // Before discount
      expect(result.totalCustomerDiscount).toBe(240); // 10% of 2400
      expect(result.total).toBe(2160); // After discount
    });

    it('should calculate total savings across cart', () => {
      const items = [
        { product: product1, quantity: 20 },
        { product: product2, quantity: 10 }
      ];

      const result = calculateCartTotal(items, 15, true);

      // Product 1: base 2000, tier 1900, with 15% discount = 1615
      // Product 2: base 500, no tier, with 15% discount = 425
      // Total savings: (2000 + 500) - (1615 + 425) = 460
      expect(result.totalSavings).toBeCloseTo(460, 0);
    });
  });

  describe('validateCustomerDiscount', () => {
    it('should validate active discount', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const result = validateCustomerDiscount(15, futureDate);

      expect(result.isValid).toBe(true);
      expect(result.applicablePercent).toBe(15);
    });

    it('should reject expired discount', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const result = validateCustomerDiscount(15, pastDate);

      expect(result.isValid).toBe(false);
      expect(result.applicablePercent).toBe(0);
      expect(result.reason).toBe('Discount expired');
    });

    it('should reject invalid percentage (>100)', () => {
      const result = validateCustomerDiscount(150, null);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid discount percentage');
    });

    it('should reject negative percentage', () => {
      const result = validateCustomerDiscount(-10, null);

      expect(result.isValid).toBe(false);
      expect(result.reason).toBe('Invalid discount percentage');
    });

    it('should accept discount with no expiration', () => {
      const result = validateCustomerDiscount(10, null);

      expect(result.isValid).toBe(true);
      expect(result.applicablePercent).toBe(10);
    });
  });

  describe('getPriceBreakdown', () => {
    it('should format price breakdown for display', () => {
      const breakdown = getPriceBreakdown(mockProduct, 50, 10, true);

      expect(breakdown.basePrice).toBe('৳100');
      expect(breakdown.tierInfo).toContain('10% off');
      expect(breakdown.customerDiscountInfo).toContain('10% off');
      expect(breakdown.finalPrice).toBe('৳81');
      expect(breakdown.savings).toBeTruthy();
    });

    it('should show MOQ message when below minimum', () => {
      const breakdown = getPriceBreakdown(mockProduct, 5);

      expect(breakdown.tierInfo).toContain('Minimum order: 10');
      expect(breakdown.finalPrice).toBe('N/A');
    });
  });

  describe('getTierPricingTable', () => {
    it('should generate tier pricing table', () => {
      const table = getTierPricingTable(mockProduct);

      expect(table).toHaveLength(3);
      expect(table[0].range).toBe('10-49');
      expect(table[1].range).toBe('50-99');
      expect(table[2].range).toBe('100+');
    });

    it('should include customer discount in tier table', () => {
      const table = getTierPricingTable(mockProduct, 10, true);

      // First tier: 5% (tier) + 10% (customer) = 15% total
      expect(table[0].totalDiscount).toContain('15');
    });
  });

  describe('Utility Functions', () => {
    it('should format price correctly', () => {
      expect(formatPrice(1234.56)).toBe('৳1,234.56');
      expect(formatPrice(1000)).toBe('৳1,000');
      expect(formatPrice(5.5)).toBe('৳5.5');
    });

    it('should round price to 2 decimals', () => {
      expect(roundPrice(10.123456)).toBe(10.12);
      expect(roundPrice(10.126)).toBe(10.13);
      expect(roundPrice(10)).toBe(10);
    });
  });

  describe('Real-World Scenarios', () => {
    it('Scenario 1: VIP customer with 15% discount orders 60 units', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 60,
        customerDiscount: 15,
        customerDiscountValid: true
      });

      // Tier: 50-99 units at ৳90 (10% off)
      // Subtotal: ৳5400
      // Customer discount: 15% = ৳810
      // Final: ৳4590
      expect(result.tierPrice).toBe(90);
      expect(result.subtotalBeforeDiscount).toBe(5400);
      expect(result.customerDiscountAmount).toBe(810);
      expect(result.finalTotal).toBe(4590);
      expect(result.finalUnitPrice).toBe(76.5); // Effective price per unit
    });

    it('Scenario 2: Guest checkout (no discount) orders 25 units', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 25,
        customerDiscount: 0,
        customerDiscountValid: false
      });

      // Tier: 10-49 units at ৳95
      // No customer discount
      // Final: ৳2375
      expect(result.tierPrice).toBe(95);
      expect(result.finalTotal).toBe(2375);
      expect(result.customerDiscountAmount).toBe(0);
    });

    it('Scenario 3: Customer with expired discount orders 100 units', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 100,
        customerDiscount: 20, // But expired
        customerDiscountValid: false
      });

      // Tier: 100+ at ৳85 (15% off)
      // Expired discount NOT applied
      // Final: ৳8500
      expect(result.tierPrice).toBe(85);
      expect(result.customerDiscountPercent).toBe(0); // Not applied
      expect(result.finalTotal).toBe(8500);
    });

    it('Scenario 4: Bulk order with 20% customer discount at highest tier', () => {
      const result = calculateItemPrice({
        product: mockProduct,
        quantity: 200,
        customerDiscount: 20,
        customerDiscountValid: true
      });

      // Tier: 100+ at ৳85 (15% off base)
      // Subtotal: ৳17000
      // Customer discount: 20% = ৳3400
      // Final: ৳13600
      // Effective price: ৳68/unit
      expect(result.tierPrice).toBe(85);
      expect(result.subtotalBeforeDiscount).toBe(17000);
      expect(result.customerDiscountAmount).toBe(3400);
      expect(result.finalTotal).toBe(13600);
      expect(result.finalUnitPrice).toBe(68);

      // Total savings: ৳20000 - ৳13600 = ৳6400 (32% off)
      expect(result.totalSavings).toBe(6400);
      expect(result.totalSavingsPercent).toBe(32);
    });
  });
});
