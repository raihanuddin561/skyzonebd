/**
 * @jest-environment node
 */
// __tests__/admin/partners-settlement.test.ts
//
// Amazon-style gap-closure Phase 3 part 4: GET /api/admin/partners/[id]/
// settlement reports a partner's total distributions earned/paid/
// outstanding and net capital contribution — a read-only report, not an
// automated payout action.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  partner: { findUnique: jest.fn() },
  profitDistribution: { findMany: jest.fn() },
  financialLedger: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { GET } from '@/app/api/admin/partners/[id]/settlement/route';

function req() {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
  return { headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) } } as any;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
});

it('404s for an unknown partner', async () => {
  mockPrismaClient.partner.findUnique.mockResolvedValue(null);
  const res = await GET(req(), params('nope'));
  expect(res.status).toBe(404);
});

it('reports earned/paid/outstanding distribution totals and net capital contribution', async () => {
  mockPrismaClient.partner.findUnique.mockResolvedValue({ id: 'p1', name: 'Acme Partner', exitDate: null });
  mockPrismaClient.profitDistribution.findMany.mockResolvedValue([
    { status: 'PAID', distributionAmount: 500 },
    { status: 'APPROVED', distributionAmount: 200 },
    { status: 'PENDING', distributionAmount: 100 },
    { status: 'REJECTED', distributionAmount: 50 },
  ]);
  mockPrismaClient.financialLedger.findMany.mockResolvedValue([
    { sourceType: 'INVESTMENT', amount: 10000 },
    { sourceType: 'WITHDRAWAL', amount: 2000 },
  ]);

  const res = await GET(req(), params('p1'));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.data.distributions.totalEarned).toBe(850); // 500+200+100+50
  expect(body.data.distributions.totalPaid).toBe(500);
  expect(body.data.distributions.totalOutstanding).toBe(300); // 200+100 (APPROVED+PENDING only)
  expect(body.data.capital.totalContributed).toBe(10000);
  expect(body.data.capital.totalWithdrawn).toBe(2000);
  expect(body.data.capital.netContribution).toBe(8000);
  expect(body.data.finalSettlementDue).toBe(false); // no exitDate
});

it('flags finalSettlementDue when the partner has exited and still has outstanding distributions', async () => {
  mockPrismaClient.partner.findUnique.mockResolvedValue({ id: 'p1', name: 'Acme Partner', exitDate: new Date('2026-07-01') });
  mockPrismaClient.profitDistribution.findMany.mockResolvedValue([
    { status: 'APPROVED', distributionAmount: 200 },
  ]);
  mockPrismaClient.financialLedger.findMany.mockResolvedValue([]);

  const res = await GET(req(), params('p1'));
  const body = await res.json();

  expect(body.data.finalSettlementDue).toBe(true);
});
