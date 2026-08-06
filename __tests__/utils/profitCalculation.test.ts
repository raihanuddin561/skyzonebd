// __tests__/utils/profitCalculation.test.ts
// Verifies P2-2: the platform/seller profit-split formula that was
// previously hand-duplicated between this file's calculateProductProfit
// (dead code — zero callers anywhere) and the live order-delivery path in
// utils/profitReportGeneration.ts is now one canonical function
// (splitGrossProfit), used by both.

import { splitGrossProfit, calculateProductProfit } from '@/utils/profitCalculation';

describe('splitGrossProfit', () => {
  it('gives the platform 100% when there is no seller commission', () => {
    const result = splitGrossProfit(1000, 15, 0);
    expect(result.sellerProfit).toBe(0);
    expect(result.platformProfit).toBe(1000);
  });

  it('splits the remaining profit (after the platform cut) by the seller commission percentage', () => {
    // grossProfit=1000, platform takes 15% (150), remaining 850, seller takes 10% of that (85)
    const result = splitGrossProfit(1000, 15, 10);
    expect(result.sellerProfit).toBeCloseTo(85);
    expect(result.platformProfit).toBeCloseTo(1000 - 85); // platform absorbs everything the seller doesn't take
  });

  it('platform + seller always sum back to the original gross profit', () => {
    const result = splitGrossProfit(2537.5, 22, 33);
    expect(result.platformProfit + result.sellerProfit).toBeCloseTo(2537.5);
  });

  it('defaults sellerCommissionPercentage to 0 when omitted', () => {
    const result = splitGrossProfit(500, 20);
    expect(result.sellerProfit).toBe(0);
  });
});

describe('calculateProductProfit', () => {
  it('computes revenue, cost, and margin for a simple product', () => {
    const result = calculateProductProfit(10, {
      basePrice: 50,
      wholesalePrice: 80,
      platformProfitPercentage: 20,
    });

    expect(result.revenue).toBe(800);
    expect(result.totalCost).toBe(500);
    expect(result.grossProfit).toBe(300);
    expect(result.profitMargin).toBeCloseTo(37.5);
  });

  it('does not divide by zero when revenue is 0 (quantity 0)', () => {
    const result = calculateProductProfit(0, {
      basePrice: 50,
      wholesalePrice: 80,
      platformProfitPercentage: 20,
    });

    expect(result.profitMargin).toBe(0);
    expect(Number.isNaN(result.profitMargin)).toBe(false);
  });

  it('falls back to basePrice for costPerUnit when not explicitly provided', () => {
    const result = calculateProductProfit(1, {
      basePrice: 40,
      wholesalePrice: 60,
      platformProfitPercentage: 10,
    });

    expect(result.totalCost).toBe(40);
  });
});
