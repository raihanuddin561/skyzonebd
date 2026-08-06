/**
 * @jest-environment node
 */
// __tests__/lib/financialLedger-summary.test.ts
//
// Amazon-style gap-closure Phase 2 part 2: getFinancialSummary is the
// single, canonical ledger-derived period profit calculation every other
// profit-calculation path is being migrated to call, replacing five
// independent, mutually-inconsistent formulas. This proves its arithmetic
// directly against raw FinancialLedger rows.

const mockPrismaClient: any = {
  financialLedger: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { getFinancialSummary } from '@/lib/financialLedger';

const entry = (overrides: any) => ({
  id: 'e', amount: 0, direction: 'CREDIT', sourceType: 'ORDER', category: 'REVENUE', subcategory: null, createdAt: new Date(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

it('sums revenue/COGS from ORDER and MANUAL_SALE entries only', async () => {
  mockPrismaClient.financialLedger.findMany.mockResolvedValue([
    entry({ amount: 1000, direction: 'CREDIT', sourceType: 'ORDER', category: 'REVENUE' }),
    entry({ amount: 400, direction: 'DEBIT', sourceType: 'ORDER', category: 'COGS' }),
    entry({ amount: 500, direction: 'CREDIT', sourceType: 'MANUAL_SALE', category: 'REVENUE' }),
    entry({ amount: 200, direction: 'DEBIT', sourceType: 'MANUAL_SALE', category: 'COGS' }),
    // Not revenue/COGS at all — must be excluded from both.
    entry({ amount: 999, direction: 'CREDIT', sourceType: 'ADJUSTMENT', category: 'REVENUE' }),
  ]);

  const summary = await getFinancialSummary(new Date('2026-08-01'), new Date('2026-08-31'));

  expect(summary.revenue).toBe(1500);
  expect(summary.cogs).toBe(600);
  expect(summary.grossProfit).toBe(900);
});

it('aggregates operational costs by subcategory and subtracts them (with salaries) from gross profit', async () => {
  mockPrismaClient.financialLedger.findMany.mockResolvedValue([
    entry({ amount: 2000, direction: 'CREDIT', sourceType: 'ORDER', category: 'REVENUE' }),
    entry({ amount: 500, direction: 'DEBIT', sourceType: 'ORDER', category: 'COGS' }),
    entry({ amount: 300, direction: 'DEBIT', sourceType: 'EXPENSE', category: 'OPERATING_EXPENSE', subcategory: 'RENT' }),
    entry({ amount: 100, direction: 'DEBIT', sourceType: 'EXPENSE', category: 'OPERATING_EXPENSE', subcategory: 'UTILITIES' }),
    entry({ amount: 600, direction: 'DEBIT', sourceType: 'SALARY', category: 'OPERATING_EXPENSE' }),
  ]);

  const summary = await getFinancialSummary(new Date('2026-08-01'), new Date('2026-08-31'));

  expect(summary.grossProfit).toBe(1500);
  expect(summary.operationalCosts).toBe(400);
  expect(summary.operationalCostsByCategory).toEqual({ RENT: 300, UTILITIES: 100 });
  expect(summary.salaryExpenses).toBe(600);
  expect(summary.netProfitBeforeDistribution).toBe(500); // 1500 - 400 - 600
});

it('treats partner-distribution commission payouts as a distribution of profit, not an expense', async () => {
  mockPrismaClient.financialLedger.findMany.mockResolvedValue([
    entry({ amount: 1000, direction: 'CREDIT', sourceType: 'ORDER', category: 'REVENUE' }),
    entry({ amount: 300, direction: 'DEBIT', sourceType: 'COMMISSION', category: 'PARTNER_DISTRIBUTION' }),
  ]);

  const summary = await getFinancialSummary(new Date('2026-08-01'), new Date('2026-08-31'));

  expect(summary.netProfitBeforeDistribution).toBe(1000); // commission does NOT reduce this
  expect(summary.distributionsPaid).toBe(300);
  expect(summary.platformRetainedProfit).toBe(700); // netProfitBeforeDistribution - distributionsPaid
});

it('nets a processed refund\'s reversal pair against revenue and COGS (Amazon-Style Wholesale Platform Gap Closure — Phase 4 part 5)', async () => {
  // The dead processRefund() this replaces only ever posted a cash-out
  // DEBIT under a separate "REFUNDS" category that this formula never
  // read — so a refund never actually reduced reported revenue/profit.
  // createRefundReversalEntries posts within the REVENUE/COGS categories
  // instead, which this formula must now net against the original entries.
  mockPrismaClient.financialLedger.findMany.mockResolvedValue([
    entry({ amount: 1000, direction: 'CREDIT', sourceType: 'ORDER', category: 'REVENUE' }),
    entry({ amount: 400, direction: 'DEBIT', sourceType: 'ORDER', category: 'COGS' }),
    // Return of a $300 (at cost $120) portion of that order.
    entry({ amount: 300, direction: 'DEBIT', sourceType: 'REFUND', category: 'REVENUE' }),
    entry({ amount: 120, direction: 'CREDIT', sourceType: 'RETURN', category: 'COGS' }),
  ]);

  const summary = await getFinancialSummary(new Date('2026-08-01'), new Date('2026-08-31'));

  expect(summary.revenue).toBe(700); // 1000 - 300
  expect(summary.cogs).toBe(280); // 400 - 120
  expect(summary.grossProfit).toBe(420);
});

it('returns all zeros when there are no entries in range', async () => {
  mockPrismaClient.financialLedger.findMany.mockResolvedValue([]);

  const summary = await getFinancialSummary(new Date('2026-08-01'), new Date('2026-08-31'));

  expect(summary.revenue).toBe(0);
  expect(summary.cogs).toBe(0);
  expect(summary.netProfitBeforeDistribution).toBe(0);
  expect(summary.platformRetainedProfit).toBe(0);
});
