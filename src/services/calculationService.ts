/**
 * Central Calculation Service — Single Source of Truth for SkyzoneBD
 *
 * Implements strict integer poisha money handling (1 BDT = 100 poisha).
 * Eliminates floating-point rounding drift and ensures exact penny/poisha accounting.
 *
 * All formulas follow the SkyzoneBD Master Financial Specification (Phase 2).
 */

// ============================================================================
// MONEY HANDLING CONSTANTS & HELPERS
// ============================================================================

export const POISHA_PER_BDT = 100;

/**
 * Converts a floating-point or decimal BDT amount into integer poisha.
 * Standard Round Half Up rule applied: ৳100.505 -> 10051 poisha.
 */
export function toPoisha(bdt: number): number {
  if (typeof bdt !== 'number' || Number.isNaN(bdt)) {
    return 0;
  }
  return Math.round(bdt * POISHA_PER_BDT);
}

/**
 * Converts integer poisha back to BDT (with 2 decimal places).
 * 10050 poisha -> 100.50 BDT.
 */
export function fromPoisha(poisha: number): number {
  if (typeof poisha !== 'number' || Number.isNaN(poisha)) {
    return 0;
  }
  return poisha / POISHA_PER_BDT;
}

/**
 * Canonical Round Half Up for positive numbers.
 * Round 0.5 up towards positive infinity.
 */
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

/**
 * Formats poisha as human-readable BDT string with currency symbol.
 * Example: 150075 poisha -> "৳1,500.75"
 */
export function formatPoisha(poisha: number, currencySymbol: string = '৳'): string {
  const bdt = fromPoisha(poisha);
  return `${currencySymbol}${bdt.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Largest Remainder Method (Hare-Niemeyer Method) for allocating poisha
 * across a list of weights.
 *
 * Guarantees that sum(allocated) === totalToAllocate exactly, with zero leftover poisha!
 */
export function allocatePoishaByWeights(
  totalToAllocatePoisha: number,
  weights: number[]
): number[] {
  if (weights.length === 0 || totalToAllocatePoisha === 0) {
    return weights.map(() => 0);
  }

  const totalWeight = weights.reduce((sum, w) => sum + Math.max(0, w), 0);
  if (totalWeight === 0) {
    // If weights sum to 0, distribute equally
    const base = Math.floor(totalToAllocatePoisha / weights.length);
    let remainder = totalToAllocatePoisha - base * weights.length;
    return weights.map(() => {
      const share = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      return share;
    });
  }

  const rawShares = weights.map((w) => (Math.max(0, w) / totalWeight) * totalToAllocatePoisha);
  const integerParts = rawShares.map((s) => Math.floor(s));
  const fractionalParts = rawShares.map((s, idx) => ({
    index: idx,
    fraction: s - Math.floor(s),
    weight: weights[idx],
  }));

  const allocatedSum = integerParts.reduce((a, b) => a + b, 0);
  let remainder = totalToAllocatePoisha - allocatedSum;

  // Sort by largest fractional remainder; tie-break by higher weight, then earliest index
  fractionalParts.sort((a, b) => {
    if (Math.abs(b.fraction - a.fraction) > 1e-9) {
      return b.fraction - a.fraction;
    }
    if (b.weight !== a.weight) {
      return b.weight - a.weight;
    }
    return a.index - b.index;
  });

  const result = [...integerParts];
  for (let i = 0; i < remainder; i++) {
    const targetIdx = fractionalParts[i % fractionalParts.length].index;
    result[targetIdx] += 1;
  }

  return result;
}

// ============================================================================
// DATA TYPES & INTERFACES
// ============================================================================

export interface TierPriceRule {
  minQuantity: number;
  maxQuantity: number | null; // null means unbounded (e.g. 200+)
  unitPricePoisha: number;
}

export interface ProductPricingInput {
  productId: string;
  name: string;
  unitPricePoisha: number; // Base wholesale selling price in poisha
  costPricePoisha: number; // Purchase/COGS price in poisha
  moq: number; // Minimum order quantity (e.g. 10)
  packSize?: number; // Step/carton size (e.g. sold in dozens = 12)
  tiers?: TierPriceRule[];
  categoryId?: string;
  taxRatePercent?: number; // Optional product-level VAT % (e.g. 15 for 15%)
  isTaxInclusive?: boolean; // Wholesale price includes VAT?
}

export interface CartItemInput {
  product: ProductPricingInput;
  quantity: number;
  customerDiscountPercent?: number; // Special discount % assigned to customer profile
}

export type CouponType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY';

export interface CouponRule {
  code: string;
  type: CouponType;
  discountValue: number; // For PERCENTAGE: 0-100; For FIXED_AMOUNT: amount in poisha
  maxDiscountPoisha?: number | null; // Cap for percentage discount
  minOrderAmountPoisha?: number; // Minimum qualifying cart subtotal
  startDate?: Date | null;
  endDate?: Date | null;
  totalUsageLimit?: number | null;
  currentUsageCount?: number;
  perCustomerUsageLimit?: number | null;
  customerUsageCount?: number;
  allowedProductIds?: string[];
  excludedProductIds?: string[];
  allowedCategoryIds?: string[];
  excludedCategoryIds?: string[];
  isFirstOrderOnly?: boolean;
  canReduceDelivery?: boolean;
}

export interface DeliveryRuleInput {
  zoneId?: string;
  zoneName?: string;
  chargePoisha: number;
  freeDeliveryThresholdPoisha?: number | null;
  businessCostPoisha?: number; // What SkyzoneBD pays the courier
}

export interface ExtraChargesInput {
  codFeePoisha?: number;
  packagingFeePoisha?: number;
  gatewayFeePoisha?: number;
  customFeesPoisha?: number;
}

export interface CalculationSettings {
  vatEnabled: boolean;
  vatRatePercent: number; // e.g. 15 for 15%
  pricesInclusiveOfVat: boolean; // default false (B2B wholesale typically exclusive)
  couponsApplyBeforeVat: boolean; // default true
  minOrderValuePoisha?: number; // Global cart minimum
  enforceMoqForCustomer?: boolean; // false for RETAIL/guest, true for WHOLESALE
}

// Result models
export interface OrderLineResult {
  productId: string;
  productName: string;
  quantity: number;
  baseUnitPricePoisha: number;
  tierUnitPricePoisha: number;
  tierDiscountPoishaPerUnit: number;
  lineSubtotalBeforeDiscountPoisha: number;
  customerDiscountPoisha: number;
  lineSubtotalAfterCustomerDiscountPoisha: number;
  allocatedCouponDiscountPoisha: number;
  lineNetRevenuePoisha: number;
  unitCostPoisha: number;
  totalCostPoisha: number;
  lineGrossProfitPoisha: number;
  grossMarginPercent: number;
  vatPoisha: number;
  meetsMoq: boolean;
  packSizeValid: boolean;
}

export interface OrderCalculationResult {
  lines: OrderLineResult[];
  subtotalPoisha: number; // Sum of line totals before coupon & order-level discounts
  customerDiscountTotalPoisha: number;
  couponDiscountPoisha: number;
  eligibleSubtotalForCouponPoisha: number;
  taxableAmountPoisha: number;
  vatPoisha: number;
  deliveryChargePoisha: number;
  deliveryWaived: boolean;
  extraChargesPoisha: number;
  grandTotalPoisha: number;
  totalCostPoisha: number;
  businessBorneDeliveryCostPoisha: number;
  gatewayFeePoisha: number;
  netOrderProfitPoisha: number;
  grossProfitMarginPercent: number;
  couponValidation?: {
    valid: boolean;
    reason?: string;
  };
  validationErrors: string[];
  isOrderValid: boolean;
}

// ============================================================================
// CORE CALCULATION ENGINE
// ============================================================================

/**
 * Validates and sorts pricing tiers.
 * Ensures tiers do not overlap, leaving no ambiguity for quantity lookups.
 */
export function validateWholesaleTiers(tiers: TierPriceRule[]): {
  isValid: boolean;
  error?: string;
} {
  if (!tiers || tiers.length === 0) {
    return { isValid: true };
  }

  // Sort ascending by minQuantity
  const sorted = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];

    if (current.minQuantity <= 0) {
      return { isValid: false, error: 'Tier minimum quantity must be greater than 0' };
    }

    if (current.maxQuantity !== null && current.maxQuantity < current.minQuantity) {
      return { isValid: false, error: `Tier maximum quantity (${current.maxQuantity}) cannot be less than minimum (${current.minQuantity})` };
    }

    if (i > 0) {
      const prev = sorted[i - 1];
      if (prev.maxQuantity === null) {
        return { isValid: false, error: 'Unbounded tier (maxQuantity = null) must be the highest tier' };
      }
      if (current.minQuantity <= prev.maxQuantity) {
        return { isValid: false, error: `Tier overlap detected between [${prev.minQuantity}-${prev.maxQuantity}] and minQuantity ${current.minQuantity}` };
      }
      if (current.minQuantity > prev.maxQuantity + 1) {
        return { isValid: false, error: `Tier gap detected between [${prev.minQuantity}-${prev.maxQuantity}] and minQuantity ${current.minQuantity}` };
      }
    }
  }

  return { isValid: true };
}

/**
 * Resolves the applicable tier unit price for a given quantity.
 */
export function resolveTierUnitPrice(
  baseUnitPricePoisha: number,
  tiers: TierPriceRule[] | undefined,
  quantity: number
): number {
  if (!tiers || tiers.length === 0 || quantity <= 0) {
    return baseUnitPricePoisha;
  }

  const sorted = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
  for (const tier of sorted) {
    if (quantity >= tier.minQuantity) {
      if (tier.maxQuantity === null || quantity <= tier.maxQuantity) {
        return tier.unitPricePoisha;
      }
    }
  }

  return baseUnitPricePoisha;
}

/**
 * Evaluates coupon validity against order context and returns eligibility details.
 */
export function validateCoupon(
  coupon: CouponRule,
  eligibleSubtotalPoisha: number,
  customerOrderCount: number = 0,
  currentDate: Date = new Date()
): { valid: boolean; reason?: string } {
  // 1. Date window
  if (coupon.startDate && currentDate < coupon.startDate) {
    return { valid: false, reason: 'COUPON_NOT_YET_ACTIVE' };
  }
  if (coupon.endDate && currentDate > coupon.endDate) {
    return { valid: false, reason: 'COUPON_EXPIRED' };
  }

  // 2. Global usage limit
  if (
    coupon.totalUsageLimit !== null &&
    coupon.totalUsageLimit !== undefined &&
    (coupon.currentUsageCount ?? 0) >= coupon.totalUsageLimit
  ) {
    return { valid: false, reason: 'COUPON_USAGE_LIMIT_REACHED' };
  }

  // 3. Per-customer usage limit
  if (
    coupon.perCustomerUsageLimit !== null &&
    coupon.perCustomerUsageLimit !== undefined &&
    (coupon.customerUsageCount ?? 0) >= coupon.perCustomerUsageLimit
  ) {
    return { valid: false, reason: 'COUPON_CUSTOMER_LIMIT_REACHED' };
  }

  // 4. First-order only restriction
  if (coupon.isFirstOrderOnly && customerOrderCount > 0) {
    return { valid: false, reason: 'COUPON_FIRST_ORDER_ONLY' };
  }

  // 5. Eligible items subtotal minimum
  if (eligibleSubtotalPoisha <= 0) {
    return { valid: false, reason: 'COUPON_NOT_APPLICABLE_TO_ITEMS' };
  }

  if (coupon.minOrderAmountPoisha && eligibleSubtotalPoisha < coupon.minOrderAmountPoisha) {
    return {
      valid: false,
      reason: `COUPON_BELOW_MINIMUM_ORDER: Minimum order of ${formatPoisha(coupon.minOrderAmountPoisha)} required`,
    };
  }

  return { valid: true };
}

/**
 * MASTER ORDER CALCULATION SERVICE
 *
 * Runs the complete order of operations on server:
 * 1. Line pricing (tiers, MOQ, pack step, customer discount)
 * 2. Cart subtotal
 * 3. Coupon validation & discount calculation
 * 4. Proportional allocation of order-level discount across items
 * 5. Taxable amount & VAT
 * 6. Delivery charge & waiver check
 * 7. Extra charges (COD, gateway fees, etc.)
 * 8. Grand total & cost/profit snapshots
 */
export function calculateOrder(input: {
  items: CartItemInput[];
  coupon?: CouponRule | null;
  customerOrderCount?: number;
  delivery?: DeliveryRuleInput | null;
  extraCharges?: ExtraChargesInput | null;
  settings: CalculationSettings;
}): OrderCalculationResult {
  const { items, coupon, customerOrderCount = 0, delivery, extraCharges, settings } = input;
  const validationErrors: string[] = [];

  // ==========================================================================
  // Step 1: Line Pricing (Tiers, MOQ, Customer Discount)
  // ==========================================================================
  const lineCalculations = items.map(({ product, quantity, customerDiscountPercent = 0 }) => {
    const meetsMoq =
      !settings.enforceMoqForCustomer || quantity >= (product.moq || 1);
    if (!meetsMoq) {
      validationErrors.push(
        `${product.name} requires a minimum order quantity of ${product.moq} units`
      );
    }

    // Step size / pack size validation (e.g. sold in cartons of 12)
    const packSize = product.packSize && product.packSize > 1 ? product.packSize : 1;
    const packSizeValid = quantity % packSize === 0;
    if (!packSizeValid) {
      validationErrors.push(
        `${product.name} must be ordered in increments of ${packSize} units (carton/pack size)`
      );
    }

    const tierUnitPrice = resolveTierUnitPrice(product.unitPricePoisha, product.tiers, quantity);
    const tierDiscountPoishaPerUnit = product.unitPricePoisha - tierUnitPrice;
    const lineSubtotalBeforeDiscount = tierUnitPrice * quantity;

    // Apply Customer Profile Discount (VIP / special terms)
    let customerDiscountPoisha = 0;
    if (customerDiscountPercent > 0 && customerDiscountPercent <= 100) {
      customerDiscountPoisha = roundHalfUp(
        (lineSubtotalBeforeDiscount * customerDiscountPercent) / 100
      );
    }
    const lineSubtotalAfterCustomerDiscount = lineSubtotalBeforeDiscount - customerDiscountPoisha;

    return {
      product,
      quantity,
      baseUnitPricePoisha: product.unitPricePoisha,
      tierUnitPricePoisha: tierUnitPrice,
      tierDiscountPoishaPerUnit,
      lineSubtotalBeforeDiscountPoisha: lineSubtotalBeforeDiscount,
      customerDiscountPoisha,
      lineSubtotalAfterCustomerDiscountPoisha: lineSubtotalAfterCustomerDiscount,
      unitCostPoisha: product.costPricePoisha,
      totalCostPoisha: product.costPricePoisha * quantity,
      meetsMoq,
      packSizeValid,
    };
  });

  const subtotalPoisha = lineCalculations.reduce(
    (sum, l) => sum + l.lineSubtotalAfterCustomerDiscountPoisha,
    0
  );
  const customerDiscountTotalPoisha = lineCalculations.reduce(
    (sum, l) => sum + l.customerDiscountPoisha,
    0
  );

  // Check global minimum order value
  if (settings.minOrderValuePoisha && subtotalPoisha < settings.minOrderValuePoisha) {
    validationErrors.push(
      `Cart total is below minimum order value of ${formatPoisha(settings.minOrderValuePoisha)}`
    );
  }

  // ==========================================================================
  // Step 2: Coupon Evaluation & Discount Calculation
  // ==========================================================================
  let couponValidation: { valid: boolean; reason?: string } | undefined;
  let totalCouponDiscountPoisha = 0;
  let couponIsFreeDelivery = false;

  // Filter items eligible for coupon
  const eligibleItemsIndices: number[] = [];
  lineCalculations.forEach((l, idx) => {
    const p = l.product;
    if (coupon) {
      const isAllowedProduct = !coupon.allowedProductIds || coupon.allowedProductIds.includes(p.productId);
      const isNotExcludedProduct = !coupon.excludedProductIds || !coupon.excludedProductIds.includes(p.productId);
      const isAllowedCategory = !coupon.allowedCategoryIds || (p.categoryId && coupon.allowedCategoryIds.includes(p.categoryId));
      const isNotExcludedCategory = !coupon.excludedCategoryIds || (!p.categoryId || !coupon.excludedCategoryIds.includes(p.categoryId));

      if (isAllowedProduct && isNotExcludedProduct && isAllowedCategory && isNotExcludedCategory) {
        eligibleItemsIndices.push(idx);
      }
    }
  });

  const eligibleSubtotalForCouponPoisha = eligibleItemsIndices.reduce(
    (sum, idx) => sum + lineCalculations[idx].lineSubtotalAfterCustomerDiscountPoisha,
    0
  );

  if (coupon) {
    couponValidation = validateCoupon(
      coupon,
      eligibleSubtotalForCouponPoisha,
      customerOrderCount
    );

    if (couponValidation.valid) {
      if (coupon.type === 'FREE_DELIVERY') {
        couponIsFreeDelivery = true;
      } else if (coupon.type === 'PERCENTAGE') {
        let rawDiscount = roundHalfUp(
          (eligibleSubtotalForCouponPoisha * coupon.discountValue) / 100
        );
        if (coupon.maxDiscountPoisha && coupon.maxDiscountPoisha > 0) {
          rawDiscount = Math.min(rawDiscount, coupon.maxDiscountPoisha);
        }
        totalCouponDiscountPoisha = Math.min(rawDiscount, eligibleSubtotalForCouponPoisha);
      } else if (coupon.type === 'FIXED_AMOUNT') {
        totalCouponDiscountPoisha = Math.min(
          coupon.discountValue,
          eligibleSubtotalForCouponPoisha
        );
      }
    } else {
      validationErrors.push(couponValidation.reason || 'Invalid coupon code');
    }
  }

  // ==========================================================================
  // Step 3: Proportional Allocation of Coupon Discount Across Items
  // (Using Largest Remainder Method in Poisha)
  // ==========================================================================
  const allocatedDiscounts = new Array(lineCalculations.length).fill(0);
  if (totalCouponDiscountPoisha > 0 && eligibleItemsIndices.length > 0) {
    const eligibleWeights = eligibleItemsIndices.map(
      (idx) => lineCalculations[idx].lineSubtotalAfterCustomerDiscountPoisha
    );
    const allocated = allocatePoishaByWeights(totalCouponDiscountPoisha, eligibleWeights);
    eligibleItemsIndices.forEach((lineIdx, i) => {
      allocatedDiscounts[lineIdx] = allocated[i];
    });
  }

  // ==========================================================================
  // Step 4: Taxable Amount & VAT Calculation
  // ==========================================================================
  // Determine if coupon applies before or after VAT
  const taxableAmountPoisha = Math.max(
    0,
    subtotalPoisha - (settings.couponsApplyBeforeVat ? totalCouponDiscountPoisha : 0)
  );

  let vatPoisha = 0;
  if (settings.vatEnabled && settings.vatRatePercent > 0) {
    if (settings.pricesInclusiveOfVat) {
      // VAT is already included in product prices: VAT = Taxable - (Taxable / (1 + Rate))
      const rateFraction = settings.vatRatePercent / 100;
      vatPoisha = roundHalfUp(taxableAmountPoisha - taxableAmountPoisha / (1 + rateFraction));
    } else {
      // VAT is added on top
      vatPoisha = roundHalfUp((taxableAmountPoisha * settings.vatRatePercent) / 100);
    }
  }

  // ==========================================================================
  // Step 5: Delivery Charge & Waiver Evaluation
  // ==========================================================================
  let deliveryChargePoisha = delivery ? delivery.chargePoisha : 0;
  let deliveryWaived = false;

  // Free delivery threshold check
  if (
    delivery?.freeDeliveryThresholdPoisha !== null &&
    delivery?.freeDeliveryThresholdPoisha !== undefined &&
    subtotalPoisha >= delivery.freeDeliveryThresholdPoisha
  ) {
    deliveryChargePoisha = 0;
    deliveryWaived = true;
  } else if (couponIsFreeDelivery) {
    deliveryChargePoisha = 0;
    deliveryWaived = true;
  }

  // ==========================================================================
  // Step 6: Extra Charges & Grand Total
  // ==========================================================================
  const extraChargesPoisha =
    (extraCharges?.codFeePoisha || 0) +
    (extraCharges?.packagingFeePoisha || 0) +
    (extraCharges?.gatewayFeePoisha || 0) +
    (extraCharges?.customFeesPoisha || 0);

  // If prices are VAT inclusive, VAT is already in taxableAmountPoisha
  const grandTotalPoisha =
    taxableAmountPoisha +
    (settings.pricesInclusiveOfVat ? 0 : vatPoisha) +
    deliveryChargePoisha +
    extraChargesPoisha;

  // ==========================================================================
  // Step 7: Line-Level Snapshots & Profit Calculations
  // ==========================================================================
  const lines: OrderLineResult[] = lineCalculations.map((l, idx) => {
    const allocatedCoupon = allocatedDiscounts[idx];
    const lineNetRevenue = l.lineSubtotalAfterCustomerDiscountPoisha - allocatedCoupon;
    const lineGrossProfit = lineNetRevenue - l.totalCostPoisha;
    const grossMarginPercent =
      lineNetRevenue > 0
        ? Math.round(((lineGrossProfit / lineNetRevenue) * 100) * 10) / 10
        : 0;

    // Line VAT attribution
    const lineVat = settings.vatEnabled && settings.vatRatePercent > 0
      ? roundHalfUp((lineNetRevenue * settings.vatRatePercent) / 100)
      : 0;

    return {
      productId: l.product.productId,
      productName: l.product.name,
      quantity: l.quantity,
      baseUnitPricePoisha: l.baseUnitPricePoisha,
      tierUnitPricePoisha: l.tierUnitPricePoisha,
      tierDiscountPoishaPerUnit: l.tierDiscountPoishaPerUnit,
      lineSubtotalBeforeDiscountPoisha: l.lineSubtotalBeforeDiscountPoisha,
      customerDiscountPoisha: l.customerDiscountPoisha,
      lineSubtotalAfterCustomerDiscountPoisha: l.lineSubtotalAfterCustomerDiscountPoisha,
      allocatedCouponDiscountPoisha: allocatedCoupon,
      lineNetRevenuePoisha: lineNetRevenue,
      unitCostPoisha: l.unitCostPoisha,
      totalCostPoisha: l.totalCostPoisha,
      lineGrossProfitPoisha: lineGrossProfit,
      grossMarginPercent,
      vatPoisha: lineVat,
      meetsMoq: l.meetsMoq,
      packSizeValid: l.packSizeValid,
    };
  });

  const totalCostPoisha = lines.reduce((sum, l) => sum + l.totalCostPoisha, 0);
  const businessBorneDeliveryCostPoisha = delivery?.businessCostPoisha || 0;
  const gatewayFeePoisha = extraCharges?.gatewayFeePoisha || 0;

  // Net Order Profit = Revenue after discounts - Total COGS - Delivery Cost borne by platform - Gateway fee
  const netOrderProfitPoisha =
    subtotalPoisha -
    totalCouponDiscountPoisha -
    totalCostPoisha -
    businessBorneDeliveryCostPoisha -
    gatewayFeePoisha;

  const totalRevenueAfterDiscount = subtotalPoisha - totalCouponDiscountPoisha;
  const grossProfitMarginPercent =
    totalRevenueAfterDiscount > 0
      ? Math.round(((netOrderProfitPoisha / totalRevenueAfterDiscount) * 100) * 10) / 10
      : 0;

  return {
    lines,
    subtotalPoisha,
    customerDiscountTotalPoisha,
    couponDiscountPoisha: totalCouponDiscountPoisha,
    eligibleSubtotalForCouponPoisha,
    taxableAmountPoisha,
    vatPoisha,
    deliveryChargePoisha,
    deliveryWaived,
    extraChargesPoisha,
    grandTotalPoisha,
    totalCostPoisha,
    businessBorneDeliveryCostPoisha,
    gatewayFeePoisha,
    netOrderProfitPoisha,
    grossProfitMarginPercent,
    couponValidation,
    validationErrors,
    isOrderValid: validationErrors.length === 0,
  };
}

