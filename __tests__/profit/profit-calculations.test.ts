/**
 * @jest-environment node
 */
// __tests__/profit/profit-calculations.test.ts
// Rewritten for P2-7. The previous version of this file computed its
// expected values with the same inline arithmetic it then asserted against
// — it never imported or called any real function from the codebase, so it
// provided zero regression protection (a bug in the real profit-calculation
// code could never make this file fail). It now calls the real functions:
// utils/partnerProfitDistribution.ts's calculateProfitForPeriod (revenue/
// cost/margin aggregation) and distributeProfitToPartners (partner
// commission split). The platform/seller profit-split formula itself is
// covered separately in __tests__/utils/profitCalculation.test.ts (P2-2),
// which already tests the real splitGrossProfit/calculateProductProfit.
//
// Dropped from the old file, deliberately: "Tiered Pricing Profit", "ROI
// Calculation", and "Profit with Tax" sections had no corresponding real
// implementation anywhere in the codebase to call instead (the tiered-
// pricing calculator was confirmed dead code and deleted in P2-2; ROI and
// a flat tax-on-profit calculation are not implemented features). Testing
// invented arithmetic with no source function to call is the same
// tautology this rewrite exists to fix — see 15_Implementation_Backlog.md
// P2-7 for the full reasoning.
//
// Updated for Amazon-style gap-closure Phase 2 part 2:
// calculateProfitForPeriod/distributeProfitToPartners now derive from
// getFinancialSummary (FinancialLedger-based) instead of the Sale model —
// fixtures below mock that dependency instead of sale.aggregate.

const mockPrismaClient = {
  financialLedger: { findMany: jest.fn() },
  partner: { findMany: jest.fn() },
  profitDistribution: { create: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const getFinancialSummary = jest.fn();
jest.mock('@/lib/financialLedger', () => ({ getFinancialSummary: (...args: any[]) => getFinancialSummary(...args) }));

import { calculateProfitForPeriod, distributeProfitToPartners } from '@/utils/partnerProfitDistribution';

const start = new Date('2026-01-01');
const end = new Date('2026-01-31');

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.financialLedger.findMany.mockResolvedValue([]);
});

describe('calculateProfitForPeriod (real function, not reimplemented arithmetic)', () => {
  it('derives net profit and margin from the ledger-based financial summary', async () => {
    getFinancialSummary.mockResolvedValueOnce({
      revenue: 1000,
      cogs: 700,
      grossProfit: 300,
      operationalCosts: 60,
      operationalCostsByCategory: { RENT: 60, UTILITIES: 40 },
      salaryExpenses: 40,
      netProfitBeforeDistribution: 200, // 300 - 60 - 40
      distributionsPaid: 0,
      platformRetainedProfit: 200,
    });
    mockPrismaClient.financialLedger.findMany.mockResolvedValueOnce(
      Array.from({ length: 12 }, (_, i) => ({ sourceId: `order-${i}` }))
    );

    const result = await calculateProfitForPeriod(start, end);

    expect(result.totalRevenue).toBe(1000);
    expect(result.grossProfit).toBe(300);
    expect(result.totalOperationalCosts).toBe(100); // operationalCosts + salaryExpenses
    expect(result.netProfit).toBe(200);
    expect(result.netMargin).toBeCloseTo(20); // netProfit / totalRevenue * 100
    expect(result.salesCount).toBe(12);
    expect(result.costsByCategory).toEqual({ RENT: 60, UTILITIES: 40 });
  });

  it('does not divide by zero when there is no revenue in the period', async () => {
    getFinancialSummary.mockResolvedValueOnce({
      revenue: 0, cogs: 0, grossProfit: 0, operationalCosts: 0, operationalCostsByCategory: {},
      salaryExpenses: 0, netProfitBeforeDistribution: 0, distributionsPaid: 0, platformRetainedProfit: 0,
    });

    const result = await calculateProfitForPeriod(start, end);

    expect(result.totalRevenue).toBe(0);
    expect(result.netMargin).toBe(0);
    expect(Number.isNaN(result.netMargin)).toBe(false);
  });
});

describe('distributeProfitToPartners (real function, not reimplemented arithmetic)', () => {
  it("splits net profit across active partners by each partner's profitSharePercentage", async () => {
    getFinancialSummary.mockResolvedValueOnce({
      revenue: 1000, cogs: 600, grossProfit: 400, operationalCosts: 100, operationalCostsByCategory: {},
      salaryExpenses: 0, netProfitBeforeDistribution: 300, distributionsPaid: 0, platformRetainedProfit: 300,
    });
    // netProfit = 300
    mockPrismaClient.partner.findMany.mockResolvedValueOnce([
      { id: 'p1', profitSharePercentage: 30 },
      { id: 'p2', profitSharePercentage: 20 },
    ]);
    mockPrismaClient.profitDistribution.create
      .mockImplementationOnce(async ({ data }: any) => data)
      .mockImplementationOnce(async ({ data }: any) => data);

    const result = await distributeProfitToPartners('MONTHLY', start, end);

    expect(result.success).toBe(true);
    expect(result.distributions).toHaveLength(2);
    expect(result.distributions[0].distributionAmount).toBeCloseTo(90); // 300 * 30%
    expect(result.distributions[1].distributionAmount).toBeCloseTo(60); // 300 * 20%
  });

  it('returns success:false and creates nothing when there are no active partners', async () => {
    getFinancialSummary.mockResolvedValueOnce({
      revenue: 1000, cogs: 600, grossProfit: 400, operationalCosts: 100, operationalCostsByCategory: {},
      salaryExpenses: 0, netProfitBeforeDistribution: 300, distributionsPaid: 0, platformRetainedProfit: 300,
    });
    mockPrismaClient.partner.findMany.mockResolvedValueOnce([]);

    const result = await distributeProfitToPartners('MONTHLY', start, end);

    expect(result.success).toBe(false);
    expect(result.distributions).toHaveLength(0);
    expect(mockPrismaClient.profitDistribution.create).not.toHaveBeenCalled();
  });

  it("excludes partners who exited on or before this period's start date (Amazon-style gap-closure Phase 3 part 4)", async () => {
    getFinancialSummary.mockResolvedValueOnce({
      revenue: 1000, cogs: 600, grossProfit: 400, operationalCosts: 100, operationalCostsByCategory: {},
      salaryExpenses: 0, netProfitBeforeDistribution: 300, distributionsPaid: 0, platformRetainedProfit: 300,
    });
    mockPrismaClient.partner.findMany.mockResolvedValueOnce([]);

    await distributeProfitToPartners('MONTHLY', start, end);

    const whereArg = mockPrismaClient.partner.findMany.mock.calls[0][0].where;
    expect(whereArg.isActive).toBe(true);
    expect(whereArg.OR).toEqual([{ exitDate: null }, { exitDate: { gt: start } }]);
  });
});
