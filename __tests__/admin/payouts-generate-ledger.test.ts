/**
 * @jest-environment node
 */
// __tests__/admin/payouts-generate-ledger.test.ts
//
// Amazon-style gap-closure Phase 2 part 2: POST /api/admin/payouts/generate
// used to recompute revenue/COGS/operational-costs from Order/
// OperationalCost directly — a fifth independent profit formula. Now
// sourced from getFinancialSummary; the returns/tax adjustment layer is
// still applied on top since the ledger doesn't yet post RETURN/TAX
// entries.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  partner: { findUnique: jest.fn() },
  profitDistribution: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() },
  order: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const getFinancialSummary = jest.fn();
jest.mock('@/lib/financialLedger', () => ({ getFinancialSummary: (...args: any[]) => getFinancialSummary(...args) }));

import { POST } from '@/app/api/admin/payouts/generate/route';

function req(body: any) {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
  mockPrismaClient.partner.findUnique.mockResolvedValue({
    id: 'p1', name: 'Acme Partner', email: 'p1@x.com', profitSharePercentage: 25, isActive: true,
  });
  mockPrismaClient.profitDistribution.findFirst.mockResolvedValue(null);
  mockPrismaClient.order.findMany.mockResolvedValue([]); // returns query
  mockPrismaClient.profitDistribution.create.mockImplementation(async ({ data }: any) => ({ ...data, partner: { id: 'p1', name: 'Acme Partner' } }));
});

it('derives revenue/COGS/operational costs from getFinancialSummary', async () => {
  getFinancialSummary.mockResolvedValue({
    revenue: 10000, cogs: 6000, grossProfit: 4000, operationalCosts: 500, operationalCostsByCategory: {},
    salaryExpenses: 300, netProfitBeforeDistribution: 3200, distributionsPaid: 0, platformRetainedProfit: 3200,
  });
  // deliveredOrders (for display fields only) then returnedOrders (for the deduction)
  mockPrismaClient.order.findMany
    .mockResolvedValueOnce([{ id: 'o1', subtotal: 9500, shipping: 500 }])
    .mockResolvedValueOnce([]); // no returns

  const res = await POST(req({ partnerId: 'p1', startDate: '2026-08-01', endDate: '2026-08-31' }));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(getFinancialSummary).toHaveBeenCalledTimes(1);
  expect(body.data.calculation.totalRevenue).toBe(10000);
  expect(body.data.calculation.totalCOGS).toBe(6000);
  expect(body.data.calculation.totalOperationalCosts).toBe(800); // 500 + 300
  expect(body.data.calculation.grossProfit).toBe(4000); // 10000 - 6000
  // netProfit = operatingProfit(3200) - totalReturns(0) - netShippingImpact(0) - tax(0)
  expect(body.data.calculation.netProfit).toBe(3200);
  expect(body.data.payout.distributionAmount).toBeCloseTo(800); // 3200 * 25%
});

it('still deducts real returns on top of the ledger-derived operating profit', async () => {
  getFinancialSummary.mockResolvedValue({
    revenue: 10000, cogs: 6000, grossProfit: 4000, operationalCosts: 0, operationalCostsByCategory: {},
    salaryExpenses: 0, netProfitBeforeDistribution: 4000, distributionsPaid: 0, platformRetainedProfit: 4000,
  });
  mockPrismaClient.order.findMany
    .mockResolvedValueOnce([]) // deliveredOrders
    .mockResolvedValueOnce([{ total: 1000 }]); // one returned order in period

  const res = await POST(req({ partnerId: 'p1', startDate: '2026-08-01', endDate: '2026-08-31' }));
  const body = await res.json();

  expect(body.data.calculation.netProfit).toBe(3000); // 4000 - 1000 return
});

it('rejects generating a distribution for a period on/after the partner\'s exit date (Amazon-style gap-closure Phase 3 part 4)', async () => {
  mockPrismaClient.partner.findUnique.mockResolvedValue({
    id: 'p1', name: 'Acme Partner', email: 'p1@x.com', profitSharePercentage: 25, isActive: true,
    exitDate: new Date('2026-07-15'),
  });

  const res = await POST(req({ partnerId: 'p1', startDate: '2026-08-01', endDate: '2026-08-31' }));
  const body = await res.json();

  expect(res.status).toBe(400);
  expect(body.error).toMatch(/exit date/i);
  expect(mockPrismaClient.profitDistribution.create).not.toHaveBeenCalled();
});

it('still allows generation for a period entirely before the exit date', async () => {
  mockPrismaClient.partner.findUnique.mockResolvedValue({
    id: 'p1', name: 'Acme Partner', email: 'p1@x.com', profitSharePercentage: 25, isActive: true,
    exitDate: new Date('2026-09-15'),
  });
  getFinancialSummary.mockResolvedValue({
    revenue: 1000, cogs: 0, grossProfit: 1000, operationalCosts: 0, operationalCostsByCategory: {},
    salaryExpenses: 0, netProfitBeforeDistribution: 1000, distributionsPaid: 0, platformRetainedProfit: 1000,
  });
  mockPrismaClient.order.findMany.mockResolvedValue([]);

  const res = await POST(req({ partnerId: 'p1', startDate: '2026-08-01', endDate: '2026-08-31' }));

  expect(res.status).toBe(200);
});
