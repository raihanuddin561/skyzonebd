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
});

it('uses getFinancialSummary\'s cogs, not openingStock+purchases-closingStock', async () => {
  // Snapshot inputs that would produce a materially different OLD-formula
  // result (openingStock=500 + purchases=200 - closingStock=300 = 400)...
  mockPrismaClient.product.findMany
    .mockResolvedValueOnce([{ stockQuantity: 10, basePrice: 50 }]) // opening: 500
    .mockResolvedValueOnce([{ stockQuantity: 6, basePrice: 50 }]); // closing: 300
  // ...but the ledger says the real COGS for the period is 150.
  getFinancialSummary.mockResolvedValue({ cogs: 150 });

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
