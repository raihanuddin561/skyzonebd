/**
 * @jest-environment node
 */
// __tests__/utils/partnerProfitDistribution-ledger.test.ts
//
// Amazon-style gap-closure Phase 2 part 2: calculateProfitForPeriod and
// getProfitTrends used to read the `Sale` model, which is only populated
// by a manual per-order admin action — if skipped, partner distributions
// silently under-reported. Both now derive from FinancialLedger, fixing
// that gap as a side effect of the "one true ledger" consolidation.

const mockPrismaClient: any = {
  financialLedger: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const getFinancialSummary = jest.fn();
jest.mock('@/lib/financialLedger', () => ({ getFinancialSummary: (...args: any[]) => getFinancialSummary(...args) }));

import { calculateProfitForPeriod, getProfitTrends } from '@/utils/partnerProfitDistribution';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('calculateProfitForPeriod', () => {
  it('derives revenue/costs/netProfit from getFinancialSummary, not the Sale model', async () => {
    getFinancialSummary.mockResolvedValue({
      revenue: 5000,
      cogs: 2000,
      grossProfit: 3000,
      operationalCosts: 500,
      operationalCostsByCategory: { RENT: 500 },
      salaryExpenses: 300,
      netProfitBeforeDistribution: 2200,
      distributionsPaid: 0,
      platformRetainedProfit: 2200,
    });
    mockPrismaClient.financialLedger.findMany.mockResolvedValue([
      { sourceId: 'order-1' }, { sourceId: 'order-2' },
    ]);

    const result = await calculateProfitForPeriod(new Date('2026-08-01'), new Date('2026-08-31'));

    expect(getFinancialSummary).toHaveBeenCalledTimes(1);
    expect(result.totalRevenue).toBe(5000);
    expect(result.grossProfit).toBe(3000);
    expect(result.totalOperationalCosts).toBe(800); // operationalCosts + salaryExpenses
    expect(result.netProfit).toBe(2200); // this is what distributeProfitToPartners splits among partners
    expect(result.salesCount).toBe(2);
    expect(result.costsByCategory).toEqual({ RENT: 500 });
  });

  it('does not query the Sale model at all', async () => {
    getFinancialSummary.mockResolvedValue({
      revenue: 0, cogs: 0, grossProfit: 0, operationalCosts: 0, operationalCostsByCategory: {},
      salaryExpenses: 0, netProfitBeforeDistribution: 0, distributionsPaid: 0, platformRetainedProfit: 0,
    });
    mockPrismaClient.financialLedger.findMany.mockResolvedValue([]);

    await calculateProfitForPeriod(new Date('2026-08-01'), new Date('2026-08-31'));

    expect(mockPrismaClient.sale).toBeUndefined();
  });
});

describe('getProfitTrends', () => {
  it('buckets revenue/profit/costs by day from raw ledger entries', async () => {
    mockPrismaClient.financialLedger.findMany.mockResolvedValue([
      { createdAt: new Date('2026-08-01T10:00:00Z'), amount: 1000, direction: 'CREDIT', sourceType: 'ORDER', category: 'REVENUE' },
      { createdAt: new Date('2026-08-01T10:05:00Z'), amount: 400, direction: 'DEBIT', sourceType: 'ORDER', category: 'COGS' },
      { createdAt: new Date('2026-08-01T11:00:00Z'), amount: 100, direction: 'DEBIT', sourceType: 'EXPENSE', category: 'OPERATING_EXPENSE' },
      { createdAt: new Date('2026-08-02T09:00:00Z'), amount: 500, direction: 'CREDIT', sourceType: 'MANUAL_SALE', category: 'REVENUE' },
    ]);

    const trends = await getProfitTrends(new Date('2026-08-01'), new Date('2026-08-02'), 'DAY');

    expect(trends).toHaveLength(2);
    const day1 = trends.find((t) => t.date === '2026-08-01')!;
    expect(day1.revenue).toBe(1000);
    expect(day1.profit).toBe(600); // 1000 - 400
    expect(day1.costs).toBe(100);
    expect(day1.netProfit).toBe(500); // 600 - 100
    const day2 = trends.find((t) => t.date === '2026-08-02')!;
    expect(day2.revenue).toBe(500);
    expect(day2.profit).toBe(500);
  });
});
