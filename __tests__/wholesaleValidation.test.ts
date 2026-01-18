// __tests__/wholesaleValidation.test.ts - Test Suite for Wholesale Validation

import {
  validateWholesalePricing,
  validateBasicPricing,
  formatValidationErrors,
  type ProductValidationData
} from '@/utils/wholesaleValidation';

describe('Wholesale Pricing Validation', () => {
  
  describe('Rule 1: wholesalePrice > basePrice', () => {
    test('should pass when wholesalePrice > basePrice', () => {
      const result = validateBasicPricing(100, 150);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should fail when wholesalePrice <= basePrice', () => {
      const result = validateBasicPricing(100, 100);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be greater than base price');
    });

    test('should fail when wholesalePrice < basePrice', () => {
      const result = validateBasicPricing(100, 90);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be greater than base price');
    });
  });

  describe('Rule 2: MOQ > 0', () => {
    test('should pass when MOQ > 0', () => {
      const result = validateBasicPricing(100, 150, 10);
      expect(result.isValid).toBe(true);
    });

    test('should fail when MOQ = 0', () => {
      const result = validateBasicPricing(100, 150, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be greater than 0');
    });

    test('should fail when MOQ < 0', () => {
      const result = validateBasicPricing(100, 150, -5);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be greater than 0');
    });

    test('should pass when MOQ is undefined/null', () => {
      const result1 = validateBasicPricing(100, 150, undefined);
      const result2 = validateBasicPricing(100, 150, null);
      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });
  });

  describe('Rule 3: No overlapping WholesaleTier ranges', () => {
    test('should pass with non-overlapping tiers', () => {
      const data: ProductValidationData = {
        basePrice: 100,
        wholesalePrice: 150,
        moq: 10,
        wholesaleTiers: [
          { minQuantity: 10, maxQuantity: 49, price: 145, discount: 3.33 },
          { minQuantity: 50, maxQuantity: 199, price: 135, discount: 10 },
          { minQuantity: 200, maxQuantity: null, price: 120, discount: 20 }
        ]
      };
      const result = validateWholesalePricing(data);
      expect(result.isValid).toBe(true);
    });

    test('should fail with overlapping tiers', () => {
      const data: ProductValidationData = {
        basePrice: 100,
        wholesalePrice: 150,
        moq: 10,
        wholesaleTiers: [
          { minQuantity: 10, maxQuantity: 50, price: 145, discount: 3.33 },
          { minQuantity: 50, maxQuantity: 199, price: 135, discount: 10 } // Overlaps at 50
        ]
      };
      const result = validateWholesalePricing(data);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Overlapping tier ranges');
    });

    test('should fail when tier max > next tier min', () => {
      const data: ProductValidationData = {
        basePrice: 100,
        wholesalePrice: 150,
        moq: 10,
        wholesaleTiers: [
          { minQuantity: 10, maxQuantity: 100, price: 145, discount: 3.33 },
          { minQuantity: 80, maxQuantity: null, price: 135, discount: 10 } // Overlaps 80-100
        ]
      };
      const result = validateWholesalePricing(data);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Overlapping tier ranges');
    });
  });

  describe('Rule 4: No negative margins (tier prices > basePrice)', () => {
    test('should pass when all tier prices > basePrice', () => {
      const data: ProductValidationData = {
        basePrice: 100,
        wholesalePrice: 150,
        moq: 10,
        wholesaleTiers: [
          { minQuantity: 10, maxQuantity: 49, price: 145, discount: 3.33 },
          { minQuantity: 50, maxQuantity: null, price: 120, discount: 20 }
        ]
      };
      const result = validateWholesalePricing(data);
      expect(result.isValid).toBe(true);
    });

    test('should fail when tier price <= basePrice', () => {
      const data: ProductValidationData = {
        basePrice: 100,
        wholesalePrice: 150,
        moq: 10,
        wholesaleTiers: [
          { minQuantity: 10, maxQuantity: 49, price: 100, discount: 33.33 } // Equal to basePrice
        ]
      };
      const result = validateWholesalePricing(data);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be greater than base price');
    });

    test('should fail when tier price < basePrice', () => {
      const data: ProductValidationData = {
        basePrice: 100,
        wholesalePrice: 150,
        moq: 10,
        wholesaleTiers: [
          { minQuantity: 10, maxQuantity: null, price: 90, discount: 40 } // Below basePrice - negative margin!
        ]
      };
      const result = validateWholesalePricing(data);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be greater than base price');
    });
  });

  describe('Additional tier validations', () => {
    test('should fail when tier price > wholesalePrice', () => {
      const data: ProductValidationData = {
        basePrice: 100,
        wholesalePrice: 150,
        moq: 10,
        wholesaleTiers: [
          { minQuantity: 10, maxQuantity: null, price: 160, discount: -6.67 } // Above wholesalePrice
        ]
      };
      const result = validateWholesalePricing(data);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('cannot exceed wholesale price');
    });

    test('should fail when minQuantity <= 0', () => {
      const data: ProductValidationData = {
        basePrice: 100,
        wholesalePrice: 150,
        moq: 10,
        wholesaleTiers: [
          { minQuantity: 0, maxQuantity: 49, price: 145, discount: 3.33 }
        ]
      };
      const result = validateWholesalePricing(data);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be greater than 0');
    });

    test('should fail when maxQuantity < minQuantity', () => {
      const data: ProductValidationData = {
        basePrice: 100,
        wholesalePrice: 150,
        moq: 10,
        wholesaleTiers: [
          { minQuantity: 100, maxQuantity: 50, price: 145, discount: 3.33 }
        ]
      };
      const result = validateWholesalePricing(data);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('cannot be less than minimum quantity');
    });

    test('should fail when higher quantity tier has higher price', () => {
      const data: ProductValidationData = {
        basePrice: 100,
        wholesalePrice: 150,
        moq: 10,
        wholesaleTiers: [
          { minQuantity: 10, maxQuantity: 49, price: 120, discount: 20 },
          { minQuantity: 50, maxQuantity: null, price: 145, discount: 3.33 } // Higher price for more quantity - illogical!
        ]
      };
      const result = validateWholesalePricing(data);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Bulk discounts should decrease prices');
    });

    test('should fail when discount is out of range', () => {
      const data: ProductValidationData = {
        basePrice: 100,
        wholesalePrice: 150,
        moq: 10,
        wholesaleTiers: [
          { minQuantity: 10, maxQuantity: null, price: 145, discount: 150 } // > 100%
        ]
      };
      const result = validateWholesalePricing(data);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be between 0 and 100');
    });
  });

  describe('Complex scenarios', () => {
    test('should accumulate multiple errors', () => {
      const data: ProductValidationData = {
        basePrice: 100,
        wholesalePrice: 90, // Error 1: <= basePrice
        moq: -5, // Error 2: MOQ <= 0
        wholesaleTiers: [
          { minQuantity: 0, maxQuantity: 49, price: 80, discount: 11.11 } // Error 3: minQty=0, Error 4: price < basePrice
        ]
      };
      const result = validateWholesalePricing(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });

    test('should pass with valid complex tier structure', () => {
      const data: ProductValidationData = {
        basePrice: 100,
        wholesalePrice: 150,
        moq: 10,
        wholesaleTiers: [
          { minQuantity: 10, maxQuantity: 49, price: 145, discount: 3.33 },
          { minQuantity: 50, maxQuantity: 99, price: 140, discount: 6.67 },
          { minQuantity: 100, maxQuantity: 199, price: 135, discount: 10 },
          { minQuantity: 200, maxQuantity: 499, price: 125, discount: 16.67 },
          { minQuantity: 500, maxQuantity: null, price: 120, discount: 20 }
        ]
      };
      const result = validateWholesalePricing(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Utility functions', () => {
    test('formatValidationErrors should return proper structure', () => {
      const result = validateBasicPricing(100, 90);
      const formatted = formatValidationErrors(result);
      
      expect(formatted).toHaveProperty('error');
      expect(formatted).toHaveProperty('details');
      expect(Array.isArray(formatted.details)).toBe(true);
      expect(formatted.error).toBe('Wholesale pricing validation failed');
    });
  });
});

/**
 * Example Test Cases for API Integration
 */
describe('API Integration Examples', () => {
  test('Valid product creation payload', () => {
    const productData: ProductValidationData = {
      basePrice: 100,
      wholesalePrice: 150,
      moq: 10,
      wholesaleTiers: [
        { minQuantity: 10, maxQuantity: 49, price: 145, discount: 3.33 },
        { minQuantity: 50, maxQuantity: 199, price: 135, discount: 10 },
        { minQuantity: 200, maxQuantity: null, price: 120, discount: 20 }
      ]
    };

    const result = validateWholesalePricing(productData);
    expect(result.isValid).toBe(true);
  });

  test('Invalid product - negative margin', () => {
    const productData: ProductValidationData = {
      basePrice: 100,
      wholesalePrice: 95, // Loss!
      moq: 10
    };

    const result = validateWholesalePricing(productData);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('must be greater than base price');
  });

  test('Invalid product - overlapping tiers', () => {
    const productData: ProductValidationData = {
      basePrice: 80,
      wholesalePrice: 120,
      moq: 5,
      wholesaleTiers: [
        { minQuantity: 5, maxQuantity: 20, price: 115, discount: 4.17 },
        { minQuantity: 15, maxQuantity: null, price: 110, discount: 8.33 } // Overlaps at 15-20
      ]
    };

    const result = validateWholesalePricing(productData);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Overlapping'))).toBe(true);
  });
});
