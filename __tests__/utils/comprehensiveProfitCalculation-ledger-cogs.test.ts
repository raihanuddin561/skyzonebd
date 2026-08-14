/**
 * @jest-environment node
 */
// __tests__/utils/comprehensiveProfitCalculation-ledger-cogs.test.ts
//
// Amazon-style gap-closure Phase 2 part 2: calculateComprehensiveProfit
// (feeds the main /admin/profit-loss dashboard) used to derive COGS from
// an inventory-valuation snapshot (openingStock + purchases - closingStock)
// instead of the ledger. Per the confirmed decision, it now calls
// getFinancialSummary for COGS — this proves the ledger's number is what
// actually ends up in the result, not the snapshot formula (which, with
// the fixture data below, would produce a different number).

const mockPrismaClient: any = {
  order: { findMany: jest.fn().mockResolvedValue([]) },
  product: { findMany: jest.fn().mockResolvedValue([]) },
  operationalCost: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }), findMany: jest.fn().mockResolvedValue([]) },
  salary: { findMany: jest.fn().mockResolvedValue([]) },
  financialLedger: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const getFinancialSummary = jest.fn();
jest.mock('@/lib/financialLedger', () => ({ getFinancialSummary: (...args: any[]) => getFinancialSummary(...args) }));

import { calculateComprehensiveProfit } from '@/utils/comprehensiveProfitCalculation';

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.order.findMany.mockResolvedValue([]);
  mockPrismaClient.product.findMany.mockResolvedValue([]);
  mockPrismaClient.operationalCost.aggregate.mockResolvedValue({ _sum: { amount: 200 } }); // "purchases" — would feed the OLD formula
  mockPrismaClient.operationalCost.findMany.mockResolvedValue([]);
  mockPrismaClient.salary.findMany.mockResolvedValue([]);
  mockPrismaClient.financialLedger.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
});

it('uses getFinancialSummary\'s cogs, not openingStock+purchases-closingStock', async () => {
  // Snapshot inputs that would produce a materially different OLD-formula
  // result (openingStock=500 + purchases=200 - closingStock=300 = 400)...
  mockPrismaClient.product.findMany
    .mockResolvedValueOnce([{ stockQuantity: 10, basePrice: 50 }]) // opening: 500
    .mockResolvedValueOnce([{ stockQuantity: 6, basePrice: 50 }]); // closing: 300
  // ...but the ledger says the real COGS for the period is 150.
  getFinancialSummary.mockResolvedValue({ cogs: 150, revenue: 1000 });

  const result = await calculateComprehensiveProfit({ month: 8, year: 2026 });

  expect(getFinancialSummary).toHaveBeenCalledTimes(1);
  expect(result.cogs).toBe(150);
  expect(result.cogs).not.toBe(400);
  // Opening/closing/purchases are still computed and returned informationally.
  expect(result.openingStock).toBe(500);
  expect(result.closingStock).toBe(300);
  expect(result.purchases).toBe(200);
  // Gross profit derives from the ledger cogs, not the snapshot one.
  expect(result.grossProfit).toBe(result.netRevenue - 150);
});

// The P&L report previously summed order.total for every non-cancelled
// order PLACED in the period, regardless of whether it had shipped, been
// paid for, or been delivered — while cogs only ever reflected DELIVERED
// orders (COGS is posted at the DELIVERED transition). A month full of
// unpaid PENDING orders and zero deliveries reported real revenue with
// zero cost, i.e. a fabricated 100% gross margin. returnRevenue also
// always read as 0, since nothing in the app ever sets Order.status to
// 'RETURNED' (refunds keep the order DELIVERED and only change
// paymentStatus) — so a refunded order's full total stayed counted as
// revenue while its COGS had already shrunk from the refund's reversal.
describe('revenue recognition matches cogs\'s basis (both ledger-derived)', () => {
  it('uses getFinancialSummary\'s revenue, not a raw sum of order.total for orders placed in the period', async () => {
    // Two PENDING orders were placed this month (would sum to 5000 under
    // the old formula) but neither has been delivered, so the ledger has
    // recognized none of it yet.
    mockPrismaClient.order.findMany.mockResolvedValue([
      { id: 'o1', userId: 'u1', total: 3000, status: 'PENDING' },
      { id: 'o2', userId: 'u2', total: 2000, status: 'PENDING' },
    ]);
    getFinancialSummary.mockResolvedValue({ cogs: 0, revenue: 0 });
    mockPrismaClient.financialLedger.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

    const result = await calculateComprehensiveProfit({ month: 8, year: 2026 });

    expect(result.netRevenue).toBe(0);
    expect(result.totalRevenue).toBe(0);
    expect(result.grossMargin).toBe(0); // not a fabricated 100%
  });

  it('nets a refund out of reported revenue instead of leaving it counted as pure profit', async () => {
    getFinancialSummary.mockResolvedValue({ cogs: 400, revenue: 800 }); // already net of the refund reversal
    mockPrismaClient.financialLedger.aggregate.mockResolvedValue({ _sum: { amount: 200 } }); // the refunded amount

    const result = await calculateComprehensiveProfit({ month: 8, year: 2026 });

    expect(result.netRevenue).toBe(800);
    expect(result.returnRevenue).toBe(200);
    expect(result.totalRevenue).toBe(1000); // gross before the refund
    expect(mockPrismaClient.financialLedger.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ direction: 'DEBIT', sourceType: 'REFUND', category: 'REVENUE' }),
      })
    );
  });
});
