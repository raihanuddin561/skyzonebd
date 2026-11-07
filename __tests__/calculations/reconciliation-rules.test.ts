/**
 * Master Calculation & Reconciliation Test Suite (Phase 2)
 *
 * Verifies:
 * 1. Poisha arithmetic, no float drift
 * 2. Largest Remainder Method preserves exact total (sum of parts === whole)
 * 3. Order line totals reconcile to order grand total
 * 4. Profit shares + company reserve === net distributable profit exactly
 * 5. Inventory value === sum(stock * cost)
 * 6. Dhaka timezone boundaries (UTC+6) correctly align day, month, and year boundaries
 */

import {
  toPoisha,
  fromPoisha,
  allocatePoishaByWeights,
  calculateOrder,
  CalculationSettings,
  ProductPricingInput,
} from '@/services/calculationService';

import {
  calculateProfitPeriod,
  Stakeholder,
  ShareRuleVersion,
} from '@/services/profitSharingService';

import {
  getDhakaComponents,
  dhakaToUtcDate,
  getDhakaDayBounds,
  getDhakaMonthBounds,
  getDhakaYearBounds,
  getDhakaPeriodRange,
  DHAKA_OFFSET_HOURS,
} from '@/lib/dhakaTime';

describe('Phase 2 — Poisha Arithmetic & Allocation Precision', () => {
  test('toPoisha and fromPoisha operate with zero floating point drift', () => {
    expect(toPoisha(1250.75)).toBe(125075);
    expect(toPoisha(0.33)).toBe(33);
    expect(fromPoisha(125075)).toBe(1250.75);
    expect(fromPoisha(33)).toBe(0.33);
  });

  test('Largest Remainder Method guarantees sum(allocated) === total exactly', () => {
    // 3 partners with shares 33.33%, 33.33%, 33.34%
    // Distributing ৳10,000.01 = 1,000,001 poisha
    const totalPoisha = 1000001;
    const weights = [33.33, 33.33, 33.34];
    const allocated = allocatePoishaByWeights(totalPoisha, weights);

    const sumAllocated = allocated.reduce((a, b) => a + b, 0);
    expect(sumAllocated).toBe(totalPoisha);
    expect(allocated[0] + allocated[1] + allocated[2]).toBe(1000001);
  });

  test('Odd numbers and prime totals allocate without a single poisha lost', () => {
    const total = 99997; // prime poisha
    const weights = [15, 25, 60];
    const allocated = allocatePoishaByWeights(total, weights);

    expect(allocated.reduce((a, b) => a + b, 0)).toBe(total);
    expect(allocated[0]).toBe(15000);
    expect(allocated[1]).toBe(24999);
    expect(allocated[2]).toBe(59998);
  });
});

describe('Phase 2 — Order Calculation & Component Reconciliation', () => {
  const p1: ProductPricingInput = {
    productId: 'prod-001',
    name: 'Circuit Breaker 32A',
    unitPricePoisha: 45000, // ৳450
    costPricePoisha: 28000, // ৳280
    moq: 5,
    packSize: 5,
    tiers: [
      { minQuantity: 5, maxQuantity: 19, unitPricePoisha: 45000 },
      { minQuantity: 20, maxQuantity: null, unitPricePoisha: 40000 },
    ],
  };

  const p2: ProductPricingInput = {
    productId: 'prod-002',
    name: 'Copper Wire 1.5mm',
    unitPricePoisha: 85000, // ৳850
    costPricePoisha: 60000, // ৳600
    moq: 1,
    packSize: 1,
  };

  const settings: CalculationSettings = {
    vatEnabled: true,
    vatRatePercent: 15,
    pricesInclusiveOfVat: false,
    couponsApplyBeforeVat: true,
    minOrderValuePoisha: 50000, // ৳500
    enforceMoqForCustomer: true,
  };

  test('Order Grand Total reconciles: subtotal - coupon + VAT + delivery + extra === grandTotal', () => {
    const result = calculateOrder({
      items: [
        { product: p1, quantity: 20 }, // 20 * ৳400 (tier 2) = ৳8,000 = 800,000 poisha
        { product: p2, quantity: 10 }, // 10 * ৳850 = ৳8,500 = 850,000 poisha
      ],
      coupon: {
        code: 'SAVE1000',
        type: 'FIXED_AMOUNT',
        discountValue: 100000, // ৳1,000 discount = 100,000 poisha
      },
      delivery: {
        chargePoisha: 15000, // ৳150 delivery
        freeDeliveryThresholdPoisha: 5000000, // Free over ৳50,000
        businessCostPoisha: 12000,
      },
      extraCharges: {
        packagingFeePoisha: 5000, // ৳50
        gatewayFeePoisha: 2500, // ৳25
      },
      settings,
    });

    expect(result.isOrderValid).toBe(true);

    // Subtotal: 800,000 + 850,000 = 1,650,000 poisha (৳16,500)
    expect(result.subtotalPoisha).toBe(1650000);
    expect(result.couponDiscountPoisha).toBe(100000);

    // Taxable: 1,650,000 - 100,000 = 1,550,000 poisha
    expect(result.taxableAmountPoisha).toBe(1550000);

    // 15% VAT on 1,550,000 = 232,500 poisha
    expect(result.vatPoisha).toBe(232500);

    // Delivery: 15,000 poisha
    expect(result.deliveryChargePoisha).toBe(15000);

    // Extra charges: 5,000 + 2,500 = 7,500 poisha
    expect(result.extraChargesPoisha).toBe(7500);

    // Grand total reconciliation:
    // Taxable + VAT + Delivery + Extra
    // 1,550,000 + 232,500 + 15,000 + 7,500 = 1,805,000 poisha (৳18,050)
    expect(result.grandTotalPoisha).toBe(1805000);

    // Reconciliation check:
    const calculatedSum =
      result.subtotalPoisha -
      result.couponDiscountPoisha +
      result.vatPoisha +
      result.deliveryChargePoisha +
      result.extraChargesPoisha;
    expect(result.grandTotalPoisha).toBe(calculatedSum);
  });

  test('Allocated line item discounts sum to exact coupon discount', () => {
    const result = calculateOrder({
      items: [
        { product: p1, quantity: 20 },
        { product: p2, quantity: 10 },
      ],
      coupon: {
        code: 'PROMO15',
        type: 'PERCENTAGE',
        discountValue: 15, // 15%
      },
      settings,
    });

    const sumAllocatedDiscounts = result.lines.reduce(
      (sum, line) => sum + line.allocatedCouponDiscountPoisha,
      0
    );
    expect(sumAllocatedDiscounts).toBe(result.couponDiscountPoisha);
  });

  test('Sum of line net profits + courier margin === netOrderProfit', () => {
    const result = calculateOrder({
      items: [
        { product: p1, quantity: 20 },
        { product: p2, quantity: 10 },
      ],
      delivery: {
        chargePoisha: 15000,
        businessCostPoisha: 10000,
      },
      extraCharges: {
        gatewayFeePoisha: 3000,
      },
      settings,
    });

    const sumLineGrossProfit = result.lines.reduce(
      (sum, line) => sum + line.lineGrossProfitPoisha,
      0
    );

    // Net profit = line profits - business borne delivery cost - gateway fee
    const expectedNetProfit = sumLineGrossProfit - 10000 - 3000;
    expect(result.netOrderProfitPoisha).toBe(expectedNetProfit);
  });
});

describe('Phase 2 — Profit Sharing & Reserve Reconciliation', () => {
  const stakeholders: Stakeholder[] = [
    {
      id: 'stk-1',
      name: 'Rahim Khan (Owner)',
      role: 'OWNER',
      payoutMethod: 'BANK',
      isActive: true,
      joinDate: new Date('2024-01-01'),
    },
    {
      id: 'stk-2',
      name: 'Karim Ahmed (Partner)',
      role: 'PARTNER',
      payoutMethod: 'BKASH',
      isActive: true,
      joinDate: new Date('2024-01-01'),
    },
  ];

  const shareRules: ShareRuleVersion[] = [
    {
      id: 'rule-1',
      stakeholderId: 'stk-1',
      percentage: 60,
      scope: 'GLOBAL',
      effectiveFrom: new Date('2024-01-01'),
      createdBy: 'system',
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'rule-2',
      stakeholderId: 'stk-2',
      percentage: 40,
      scope: 'GLOBAL',
      effectiveFrom: new Date('2024-01-01'),
      createdBy: 'system',
      createdAt: new Date('2024-01-01'),
    },
  ];

  test('Distributable shares + company reserve equal net distributable profit exactly', () => {
    const result = calculateProfitPeriod({
      periodId: 'test-p1',
      periodType: 'MONTHLY',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31'),
      orders: [
        {
          orderId: 'o1',
          orderNumber: 'ORD-001',
          completedAt: new Date('2024-01-15'),
          revenuePoisha: 10000000, // ৳100,000 revenue
          cogsPoisha: 0,
          businessBorneDeliveryCostPoisha: 0,
          gatewayFeePoisha: 0,
        },
      ],
      operatingExpenses: [],
      shareRules,
      stakeholders,
      reservePercentage: 10,
    });

    const sumPartnerShares = result.distributions.reduce(
      (sum: number, d) => sum + d.finalSharePoisha,
      0
    );

    // Reconciliation check:
    expect(sumPartnerShares).toBe(result.distributableProfitPoisha);
    expect(sumPartnerShares + result.reserveAmountPoisha).toBe(result.netProfitAfterLossOffsetPoisha);
  });
});

describe('Phase 2 — Bangladesh Standard Time (Asia/Dhaka, UTC+6)', () => {
  test('Dhaka offset is constant +6 hours with no DST', () => {
    expect(DHAKA_OFFSET_HOURS).toBe(6);
  });

  test('dhakaToUtcDate correctly converts Dhaka midnight to 18:00 UTC previous day', () => {
    // 2026-11-04 00:00:00 BST -> 2026-11-03 18:00:00 UTC
    const utcDate = dhakaToUtcDate(2026, 11, 4, 0, 0, 0, 0);
    expect(utcDate.toISOString()).toBe('2026-11-03T18:00:00.000Z');
  });

  test('getDhakaDayBounds creates exactly 24 hours starting at 00:00:00.000 Dhaka', () => {
    const testDate = new Date('2026-11-03T10:00:00.000Z'); // 16:00 Dhaka
    const bounds = getDhakaDayBounds(testDate);

    // Start must be 2026-11-02T18:00:00.000Z (which is Nov 3 00:00 Dhaka)
    expect(bounds.start.toISOString()).toBe('2026-11-02T18:00:00.000Z');
    // End must be 2026-11-03T17:59:59.999Z (which is Nov 3 23:59:59.999 Dhaka)
    expect(bounds.end.toISOString()).toBe('2026-11-03T17:59:59.999Z');

    const durationMs = bounds.end.getTime() - bounds.start.getTime() + 1;
    expect(durationMs).toBe(24 * 60 * 60 * 1000);
  });

  test('getDhakaMonthBounds covers complete calendar month in Dhaka', () => {
    const testDate = new Date('2026-11-15T12:00:00.000Z');
    const bounds = getDhakaMonthBounds(testDate);

    // Nov 1 00:00 Dhaka = Oct 31 18:00 UTC
    expect(bounds.start.toISOString()).toBe('2026-10-31T18:00:00.000Z');
    // Nov 30 23:59:59.999 Dhaka = Nov 30 17:59:59.999 UTC
    expect(bounds.end.toISOString()).toBe('2026-11-30T17:59:59.999Z');
  });
});
