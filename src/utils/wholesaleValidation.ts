// utils/wholesaleValidation.ts - Wholesale Pricing Validation Rules

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * WholesaleTier interface for validation
 */
interface WholesaleTier {
  minQuantity: number;
  maxQuantity: number | null;
  price: number;
  discount?: number;
}

/**
 * Product data interface for validation
 */
export interface ProductValidationData {
  basePrice: number;
  wholesalePrice: number;
  moq?: number | null;
  wholesaleTiers?: WholesaleTier[];
}

/**
 * Validate wholesale pricing rules
 * Enforces all wholesale pricing constraints
 * 
 * Rules:
 * 1. wholesalePrice > basePrice (must have positive margin)
 * 2. MOQ > 0 (if provided)
 * 3. No overlapping WholesaleTier ranges
 * 4. No negative margins (tier prices must be > basePrice)
 * 5. Tier prices must be <= wholesalePrice
 * 6. Tiers must have valid quantity ranges
 */
export function validateWholesalePricing(data: ProductValidationData): ValidationResult {
  const errors: string[] = [];

  // Rule 1: wholesalePrice > basePrice
  if (data.wholesalePrice <= data.basePrice) {
    errors.push(
      `Wholesale price (৳${data.wholesalePrice}) must be greater than base price (৳${data.basePrice}). ` +
      `Current margin: ৳${(data.wholesalePrice - data.basePrice).toFixed(2)}`
    );
  }

  // Rule 2: MOQ > 0
  if (data.moq !== undefined && data.moq !== null && data.moq <= 0) {
    errors.push(`Minimum Order Quantity (MOQ) must be greater than 0. Received: ${data.moq}`);
  }

  // Rules 3-6: Validate wholesale tiers (if provided)
  if (data.wholesaleTiers && data.wholesaleTiers.length > 0) {
    const tierErrors = validateWholesaleTiers(
      data.wholesaleTiers,
      data.basePrice,
      data.wholesalePrice
    );
    errors.push(...tierErrors);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate wholesale tier configuration
 * 
 * Checks:
 * - No overlapping ranges
 * - All tier prices > basePrice (no negative margins)
 * - All tier prices <= wholesalePrice
 * - Valid quantity ranges (min <= max)
 * - Tier discounts are logical
 */
function validateWholesaleTiers(
  tiers: WholesaleTier[],
  basePrice: number,
  wholesalePrice: number
): string[] {
  const errors: string[] = [];

  // Sort tiers by minQuantity for easier validation
  const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

  for (let i = 0; i < sortedTiers.length; i++) {
    const tier = sortedTiers[i];
    const tierLabel = `Tier ${i + 1} (${tier.minQuantity}-${tier.maxQuantity || '∞'})`;

    // Validate tier price > basePrice (no negative margins)
    if (tier.price <= basePrice) {
      errors.push(
        `${tierLabel}: Tier price (৳${tier.price}) must be greater than base price (৳${basePrice}). ` +
        `Margin: ৳${(tier.price - basePrice).toFixed(2)}`
      );
    }

    // Validate tier price <= wholesalePrice
    if (tier.price > wholesalePrice) {
      errors.push(
        `${tierLabel}: Tier price (৳${tier.price}) cannot exceed wholesale price (৳${wholesalePrice})`
      );
    }

    // Validate quantity range (minQuantity must be positive)
    if (tier.minQuantity <= 0) {
      errors.push(`${tierLabel}: Minimum quantity must be greater than 0`);
    }

    // Validate maxQuantity >= minQuantity (if maxQuantity is set)
    if (tier.maxQuantity !== null && tier.maxQuantity < tier.minQuantity) {
      errors.push(
        `${tierLabel}: Maximum quantity (${tier.maxQuantity}) cannot be less than minimum quantity (${tier.minQuantity})`
      );
    }

    // Check for overlapping ranges with next tier
    if (i < sortedTiers.length - 1) {
      const nextTier = sortedTiers[i + 1];
      
      // Current tier's max should be less than next tier's min (no overlap)
      if (tier.maxQuantity !== null) {
        if (tier.maxQuantity >= nextTier.minQuantity) {
          errors.push(
            `Overlapping tier ranges detected: ` +
            `Tier ${i + 1} (${tier.minQuantity}-${tier.maxQuantity}) overlaps with ` +
            `Tier ${i + 2} (${nextTier.minQuantity}-${nextTier.maxQuantity || '∞'})`
          );
        }
      }
    }

    // Validate discount percentage (if provided)
    if (tier.discount !== undefined) {
      if (tier.discount < 0 || tier.discount > 100) {
        errors.push(
          `${tierLabel}: Discount must be between 0 and 100. Received: ${tier.discount}%`
        );
      }

      // Verify discount matches price difference
      const expectedPrice = wholesalePrice * (1 - tier.discount / 100);
      const priceDifference = Math.abs(tier.price - expectedPrice);
      
      if (priceDifference > 0.01) { // Allow small floating point differences
        errors.push(
          `${tierLabel}: Price (৳${tier.price}) doesn't match ${tier.discount}% discount. ` +
          `Expected: ৳${expectedPrice.toFixed(2)}`
        );
      }
    }
  }

  // Verify tier pricing logic: higher quantities should have lower or equal prices
  for (let i = 0; i < sortedTiers.length - 1; i++) {
    const currentTier = sortedTiers[i];
    const nextTier = sortedTiers[i + 1];

    if (nextTier.price > currentTier.price) {
      errors.push(
        `Invalid tier pricing: Higher quantity tier (${nextTier.minQuantity}+) ` +
        `has higher price (৳${nextTier.price}) than lower quantity tier (${currentTier.minQuantity}+, ৳${currentTier.price}). ` +
        `Bulk discounts should decrease prices for larger quantities.`
      );
    }
  }

  return errors;
}

/**
 * Quick validation check - throws error if invalid
 * Use this in API routes for fail-fast validation
 */
export function validateWholesalePricingOrThrow(data: ProductValidationData): void {
  const result = validateWholesalePricing(data);
  
  if (!result.isValid) {
    throw new Error(`Wholesale pricing validation failed:\n${result.errors.join('\n')}`);
  }
}

/**
 * Validate only basic pricing (without tiers)
 * Useful for quick checks
 */
export function validateBasicPricing(
  basePrice: number,
  wholesalePrice: number,
  moq?: number | null
): ValidationResult {
  return validateWholesalePricing({
    basePrice,
    wholesalePrice,
    moq,
    wholesaleTiers: []
  });
}

/**
 * Format validation errors for API response
 */
export function formatValidationErrors(result: ValidationResult): {
  error: string;
  details: string[];
} {
  return {
    error: 'Wholesale pricing validation failed',
    details: result.errors
  };
}
