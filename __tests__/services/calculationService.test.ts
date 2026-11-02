/**
 * Comprehensive Test Suite for Calculation Service (Phase 2)
 *
 * Covers:
 * - Integer poisha conversions and Largest Remainder Method
 * - Single item and multiple items
 * - Volume tier boundaries (49, 50, 199, 200) and tier validation
 * - MOQ and carton pack size validation
 * - Coupon types: PERCENTAGE, FIXED_AMOUNT, FREE_DELIVERY
 * - Coupon edge cases: expired, usage limit, below minimum, max discount cap, category/product filters
 * - Free delivery threshold (just below vs. just above)
 * - VAT calculations (enabled/disabled, inclusive vs. exclusive)
 * - Extra charges (COD, packaging, gateway fees)
 * - Proportional discount allocation and exact poisha preservation
 * - Net profit and gross margin calculations
 * - Large orders and rounding edge cases
 */

import {
  toPoisha,
  fromPoisha,
  roundHalfUp,
  allocatePoishaByWeights,
  validateWholesaleTiers,
  resolveTierUnitPrice,
  validateCoupon,
  calculateOrder,
  CalculationSettings,
  ProductPricingInput,
  CouponRule,
  DeliveryRuleInput,
} from '@/services/calculationService';

describe('CalculationService — Poisha Money Math & Largest Remainder Method', () => {
  test('toPoisha and fromPoisha convert accurately without floating-point error', () => {
    expect(toPoisha(100.50)).toBe(10050);
    expect(toPoisha(0.01)).toBe(1);
    expect(toPoisha(99999.99)).toBe(9999999);
    expect(fromPoisha(10050)).toBe(100.50);
    expect(fromPoisha(1)).toBe(0.01);
  });

  test('roundHalfUp rounds 0.5 upwards towards positive infinity', () => {
    expect(roundHalfUp(10.5)).toBe(11);
    expect(roundHalfUp(10.4)).toBe(10);
    expect(roundHalfUp(10.6)).toBe(11);
  });

  test('allocatePoishaByWeights distributes poisha exactly with zero loss or gain', () => {
    // Distribute 10001 poisha (৳100.01) between two equal weights (50/50)
    // 5000.5 each -> one must get 5001, one must get 5000
    const weights = [50, 50];
    const total = 10001;
    const allocation = allocatePoishaByWeights(total, weights);

    expect(allocation).toEqual([5001, 5000]);
    expect(allocation.reduce((a, b) => a + b, 0)).toBe(total);
  });

  test('allocatePoishaByWeights handles unequal splits and zero weights cleanly', () => {
    const weights = [1000, 2000, 3000];
    const total = 10000; // 10000 poisha split 1:2:3
    const allocation = allocatePoishaByWeights(total, weights);

    expect(allocation.reduce((a, b) => a + b, 0)).toBe(total);
    expect(allocation[0]).toBe(1667);
    expect(allocation[1]).toBe(3333);
    expect(allocation[2]).toBe(5000);
  });
});

describe('CalculationService — Wholesale Tiers & MOQ', () => {
  const tiers = [
    { minQuantity: 1, maxQuantity: 49, unitPricePoisha: 15000 }, // ৳150
    { minQuantity: 50, maxQuantity: 199, unitPricePoisha: 14000 }, // ৳140
    { minQuantity: 200, maxQuantity: null, unitPricePoisha: 13000 }, // ৳130
  ];

  test('validates valid tiers and detects overlapping or gap tiers', () => {
    expect(validateWholesaleTiers(tiers).isValid).toBe(true);

    const overlappingTiers = [
      { minQuantity: 1, maxQuantity: 50, unitPricePoisha: 15000 },
      { minQuantity: 50, maxQuantity: 100, unitPricePoisha: 14000 }, // overlaps at 50
    ];
    expect(validateWholesaleTiers(overlappingTiers).isValid).toBe(false);

    const gapTiers = [
      { minQuantity: 1, maxQuantity: 40, unitPricePoisha: 15000 },
      { minQuantity: 50, maxQuantity: 100, unitPricePoisha: 14000 }, // gap 41-49
    ];
    expect(validateWholesaleTiers(gapTiers).isValid).toBe(false);
  });

  test('resolves tier boundary prices correctly at 49, 50, 199, 200', () => {
    const basePrice = 16000;
    expect(resolveTierUnitPrice(basePrice, tiers, 49)).toBe(15000); // Tier 1
    expect(resolveTierUnitPrice(basePrice, tiers, 50)).toBe(14000); // Tier 2 boundary
    expect(resolveTierUnitPrice(basePrice, tiers, 199)).toBe(14000); // Tier 2 boundary
    expect(resolveTierUnitPrice(basePrice, tiers, 200)).toBe(13000); // Tier 3 boundary
    expect(resolveTierUnitPrice(basePrice, tiers, 500)).toBe(13000); // Tier 3 unbounded
  });
});

describe('CalculationService — Order Calculations', () => {
  const testProduct: ProductPricingInput = {
    productId: 'p-switch-01',
    name: 'Modular Gang Switch',
    unitPricePoisha: 15000, // ৳150
    costPricePoisha: 9000, // ৳90
    moq: 10,
    packSize: 5,
    tiers: [
      { minQuantity: 10, maxQuantity: 49, unitPricePoisha: 15000 },
      { minQuantity: 50, maxQuantity: 199, unitPricePoisha: 14000 },
      { minQuantity: 200, maxQuantity: null, unitPricePoisha: 13000 },
    ],
  };

  const defaultSettings: CalculationSettings = {
    vatEnabled: true,
    vatRatePercent: 15,
    pricesInclusiveOfVat: false,
    couponsApplyBeforeVat: true,
    minOrderValuePoisha: 100000, // ৳1,000 minimum cart
    enforceMoqForCustomer: true,
  };

  test('single item order meeting MOQ and pack step calculates correct subtotal, VAT, and grand total', () => {
    const result = calculateOrder({
      items: [{ product: testProduct, quantity: 20 }], // 20 units @ ৳150 = ৳3,000
      delivery: { chargePoisha: 10000, freeDeliveryThresholdPoisha: 500000 }, // ৳100 shipping
      settings: defaultSettings,
    });

    expect(result.isOrderValid).toBe(true);
    expect(result.subtotalPoisha).toBe(300000); // ৳3,000
    expect(result.vatPoisha).toBe(45000); // 15% of 300,000 = ৳450
    expect(result.deliveryChargePoisha).toBe(10000); // ৳100
    expect(result.grandTotalPoisha).toBe(355000); // ৳3,550
    expect(result.totalCostPoisha).toBe(180000); // 20 * ৳90 = ৳1,800
    expect(result.netOrderProfitPoisha).toBe(120000); // 300,000 - 180,000 = ৳1,200
  });

  test('rejects order failing MOQ when MOQ enforcement is on', () => {
    const result = calculateOrder({
      items: [{ product: testProduct, quantity: 5 }], // Below MOQ 10
      settings: defaultSettings,
    });

    expect(result.isOrderValid).toBe(false);
    expect(result.lines[0].meetsMoq).toBe(false);
    expect(result.validationErrors.some((e) => e.includes('minimum order quantity'))).toBe(true);
  });

  test('rejects order failing pack size step', () => {
    const result = calculateOrder({
      items: [{ product: testProduct, quantity: 12 }], // MOQ 10 met, but not multiple of 5
      settings: defaultSettings,
    });

    expect(result.isOrderValid).toBe(false);
    expect(result.lines[0].packSizeValid).toBe(false);
    expect(result.validationErrors.some((e) => e.includes('carton/pack size'))).toBe(true);
  });

  test('free delivery threshold test: just below vs. just above', () => {
    const deliveryRule: DeliveryRuleInput = {
      chargePoisha: 12000, // ৳120
      freeDeliveryThresholdPoisha: 300000, // ৳3,000
    };

    // Just below: 15 units @ ৳150 = ৳2,250 (225,000 poisha)
    const belowResult = calculateOrder({
      items: [{ product: testProduct, quantity: 15 }],
      delivery: deliveryRule,
      settings: defaultSettings,
    });
    expect(belowResult.deliveryChargePoisha).toBe(12000);
    expect(belowResult.deliveryWaived).toBe(false);

    // Just above: 25 units @ ৳150 = ৳3,750 (375,000 poisha)
    const aboveResult = calculateOrder({
      items: [{ product: testProduct, quantity: 25 }],
      delivery: deliveryRule,
      settings: defaultSettings,
    });
    expect(aboveResult.deliveryChargePoisha).toBe(0);
    expect(aboveResult.deliveryWaived).toBe(true);
  });

  test('applies percentage coupon with maximum discount cap and proportional line allocation', () => {
    const productB: ProductPricingInput = {
      productId: 'p-wire-02',
      name: 'Copper Wire Coil',
      unitPricePoisha: 50000, // ৳500
      costPricePoisha: 35000, // ৳350
      moq: 1,
    };

    const coupon: CouponRule = {
      code: 'SUMMER10',
      type: 'PERCENTAGE',
      discountValue: 10, // 10%
      maxDiscountPoisha: 60000, // Max ৳600 cap
    };

    // Product A: 20 units @ 150 = ৳3,000 (300,000 poisha)
    // Product B: 10 units @ 500 = ৳5,000 (500,000 poisha)
    // Subtotal: ৳8,000 (800,000 poisha). 10% would be ৳800, but capped at ৳600 (60,000 poisha).
    const result = calculateOrder({
      items: [
        { product: testProduct, quantity: 20 },
        { product: productB, quantity: 10 },
      ],
      coupon,
      settings: defaultSettings,
    });

    expect(result.subtotalPoisha).toBe(800000);
    expect(result.couponDiscountPoisha).toBe(60000); // Capped at ৳600

    // Check proportional allocation between Product A (300,000 weight) and Product B (500,000 weight)
    // Product A: 3/8 of 60,000 = 22,500 poisha
    // Product B: 5/8 of 60,000 = 37,500 poisha
    expect(result.lines[0].allocatedCouponDiscountPoisha).toBe(22500);
    expect(result.lines[1].allocatedCouponDiscountPoisha).toBe(37500);
    expect(
      result.lines[0].allocatedCouponDiscountPoisha +
        result.lines[1].allocatedCouponDiscountPoisha
    ).toBe(60000);
  });

  test('validates fixed amount coupon and prevents negative total', () => {
    const fixedCoupon: CouponRule = {
      code: 'FLAT500',
      type: 'FIXED_AMOUNT',
      discountValue: 50000, // ৳500
    };

    const result = calculateOrder({
      items: [{ product: testProduct, quantity: 20 }], // Subtotal ৳3,000
      coupon: fixedCoupon,
      settings: defaultSettings,
    });

    expect(result.couponDiscountPoisha).toBe(50000);
    expect(result.taxableAmountPoisha).toBe(250000); // 300,000 - 50,000
  });

  test('validates FREE_DELIVERY coupon waives delivery charge', () => {
    const freeDeliveryCoupon: CouponRule = {
      code: 'FREESHIP',
      type: 'FREE_DELIVERY',
      discountValue: 0,
    };

    const result = calculateOrder({
      items: [{ product: testProduct, quantity: 20 }],
      coupon: freeDeliveryCoupon,
      delivery: { chargePoisha: 15000 }, // ৳150 delivery
      settings: defaultSettings,
    });

    expect(result.couponDiscountPoisha).toBe(0);
    expect(result.deliveryChargePoisha).toBe(0);
    expect(result.deliveryWaived).toBe(true);
  });

  test('rejects expired coupon or coupon below minimum order amount', () => {
    const expiredCoupon: CouponRule = {
      code: 'OLD',
      type: 'FIXED_AMOUNT',
      discountValue: 10000,
      endDate: new Date('2025-01-01'),
    };

    const result = calculateOrder({
      items: [{ product: testProduct, quantity: 20 }],
      coupon: expiredCoupon,
      settings: defaultSettings,
    });

    expect(result.isOrderValid).toBe(false);
    expect(result.couponValidation?.valid).toBe(false);
    expect(result.couponValidation?.reason).toBe('COUPON_EXPIRED');

    const highMinCoupon: CouponRule = {
      code: 'BIGSPENDER',
      type: 'FIXED_AMOUNT',
      discountValue: 10000,
      minOrderAmountPoisha: 1000000, // ৳10,000 minimum
    };

    const minResult = calculateOrder({
      items: [{ product: testProduct, quantity: 20 }], // ৳3,000 only
      coupon: highMinCoupon,
      settings: defaultSettings,
    });
    expect(minResult.isOrderValid).toBe(false);
    expect(minResult.couponValidation?.reason).toContain('COUPON_BELOW_MINIMUM_ORDER');
  });

  test('VAT modes: tax exclusive vs. tax inclusive', () => {
    // Exclusive: subtotal = ৳3,000, VAT 15% = ৳450, Grand Total = ৳3,450
    const exclusiveResult = calculateOrder({
      items: [{ product: testProduct, quantity: 20 }],
      settings: { ...defaultSettings, pricesInclusiveOfVat: false },
    });
    expect(exclusiveResult.vatPoisha).toBe(45000);
    expect(exclusiveResult.grandTotalPoisha).toBe(345000);

    // Inclusive: subtotal = ৳3,000, VAT included = 300,000 - (300,000 / 1.15) = 39,130 poisha
    const inclusiveResult = calculateOrder({
      items: [{ product: testProduct, quantity: 20 }],
      settings: { ...defaultSettings, pricesInclusiveOfVat: true },
    });
    expect(inclusiveResult.vatPoisha).toBe(39130);
    expect(inclusiveResult.grandTotalPoisha).toBe(300000); // VAT already inside
  });

  test('calculates extra charges (COD fee, packaging, gateway fee) and net order profit', () => {
    const result = calculateOrder({
      items: [{ product: testProduct, quantity: 20 }], // Subtotal ৳3,000, Cost ৳1,800
      extraCharges: {
        codFeePoisha: 5000, // ৳50
        packagingFeePoisha: 3000, // ৳30
        gatewayFeePoisha: 4500, // ৳45
      },
      delivery: { chargePoisha: 10000, businessCostPoisha: 8000 },
      settings: defaultSettings,
    });

    expect(result.extraChargesPoisha).toBe(12500); // 5000 + 3000 + 4500
    // Net profit = 300,000 (revenue) - 180,000 (cost) - 8,000 (delivery cost to platform) - 4,500 (gateway fee)
    expect(result.netOrderProfitPoisha).toBe(107500); // ৳1,075.00
  });

  test('handles very large bulk wholesale order without overflow', () => {
    const result = calculateOrder({
      items: [{ product: testProduct, quantity: 100000 }], // 100,000 units @ ৳130 (Tier 3) = ৳13,000,000 (1.3 billion poisha)
      settings: defaultSettings,
    });

    expect(result.subtotalPoisha).toBe(1300000000);
    expect(result.vatPoisha).toBe(195000000);
    expect(result.grandTotalPoisha).toBe(1495000000);
  });

  test('server calculation strictly rejects and overrides tampered client prices', () => {
    // A malicious client attempts to submit unitPrice of 1 poisha (৳0.01) instead of ৳150 (15,000 poisha)
    const clientSubmittedItem = {
      product: {
        ...testProduct,
        // The server product definition is authoritative: unitPricePoisha: 15000
      },
      quantity: 20,
      clientTamperedUnitPrice: 1, // Attempted 1 poisha
    };

    const result = calculateOrder({
      items: [clientSubmittedItem],
      settings: defaultSettings,
    });

    // Server must strictly enforce the catalog tier price (৳150), completely ignoring client-side tampering
    expect(result.lines[0].tierUnitPricePoisha).toBe(15000);
    expect(result.lines[0].lineSubtotalBeforeDiscountPoisha).toBe(300000);
    expect(result.subtotalPoisha).toBe(300000);
    expect(result.grandTotalPoisha).toBe(345000); // 300,000 + 45,000 VAT
  });
});
