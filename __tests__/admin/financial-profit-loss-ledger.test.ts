/**
 * @jest-environment node
 */
// __tests__/admin/financial-profit-loss-ledger.test.ts
//
// Amazon-style gap-closure Phase 2 part 2: GET /api/admin/financial/
// profit-loss previously recomputed revenue/COGS/operational-costs from
// Order/OperationalCost directly, AND had an internal inconsistency —
// netProfit used only APPROVED+PAID distributions while
// platformRetainedProfit used ALL distributions including PENDING. Now
// both totalRevenue/totalCOGS/totalOperationalCosts and netProfit/
// platformRetainedProfit derive from the same getFinancialSummary call.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  order: { findMany: jest.fn().mockResolvedValue([]) },
  operationalCost: { findMany: jest.fn().mockResolvedValue([]) },
  profitDistribution: { findMany: jest.fn().mockResolvedValue([]) },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const getFinancialSummary = jest.fn();
jest.mock('@/lib/financialLedger', () => ({ getFinancialSummary: (...args: any[]) => getFinancialSummary(...args) }));

import { GET } from '@/app/api/admin/financial/profit-loss/route';

function req(qs = '') {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
  const url = `http://localhost/api/admin/financial/profit-loss${qs}`;
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    nextUrl: new URL(url),
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
  mockPrismaClient.order.findMany.mockResolvedValue([]);
  mockPrismaClient.operationalCost.findMany.mockResolvedValue([]);
  mockPrismaClient.profitDistribution.findMany.mockResolvedValue([]);
});

it('derives revenue/COGS/operational costs from getFinancialSummary', async () => {
  getFinancialSummary.mockResolvedValue({
    revenue: 8000, cogs: 5000, grossProfit: 3000, operationalCosts: 400, operationalCostsByCategory: { RENT: 400 },
    salaryExpenses: 200, netProfitBeforeDistribution: 2400, distributionsPaid: 500, platformRetainedProfit: 1900,
  });

  const res = await GET(req('?period=month'));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(getFinancialSummary).toHaveBeenCalledTimes(1);
  expect(body.data.summary.totalRevenue).toBe(8000);
  expect(body.data.summary.totalCOGS).toBe(5000);
  expect(body.data.summary.totalOperationalCosts).toBe(600); // 400 + 200
  expect(body.data.costs.byCategory).toEqual({ RENT: 400 });
});

it('resolves the netProfit/platformRetainedProfit inconsistency — both derive from the same distributionsPaid figure', async () => {
  getFinancialSummary.mockResolvedValue({
    revenue: 10000, cogs: 4000, grossProfit: 6000, operationalCosts: 0, operationalCostsByCategory: {},
    salaryExpenses: 0, netProfitBeforeDistribution: 6000, distributionsPaid: 1000, platformRetainedProfit: 5000,
  });

  const res = await GET(req('?period=month'));
  const body = await res.json();

  expect(body.data.summary.netProfit).toBe(6000); // before any distribution is subtracted
  expect(body.data.summary.platformRetainedProfit).toBe(5000); // 6000 - 1000 paid
  expect(body.data.summary.totalDistributions).toBe(1000);
  // The two figures are now internally consistent by construction: the
  // gap between them is exactly distributionsPaid, not two different
  // distribution subsets.
  expect(body.data.summary.netProfit - body.data.summary.platformRetainedProfit).toBe(1000);
});
