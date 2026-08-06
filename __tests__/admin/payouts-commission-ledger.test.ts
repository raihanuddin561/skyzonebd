/**
 * @jest-environment node
 */
// __tests__/admin/payouts-commission-ledger.test.ts
//
// Amazon-style gap-closure Phase 2 part 1: PATCH /api/admin/payouts/[id]
// marking a ProfitDistribution PAID had zero trace in FinancialLedger.
// Phase 3 part 1 made this route the sole canonical "mark distribution
// paid" path (the parallel admin/distributions/route.ts was dead code —
// zero UI callers — and has been removed) and fixed a gap found during
// that consolidation: this route never incremented
// Partner.totalProfitReceived at all (only the now-deleted dead route did,
// and buggily — on every PAID PATCH, not just the real transition).
// Phase 3 part 2 removed the auto-approve-on-PAID shortcut (maker-checker)
// — these tests now go PENDING -> APPROVED -> PAID rather than straight
// PENDING -> PAID, matching the new required transition.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  profitDistribution: { update: jest.fn(), findUnique: jest.fn() },
  financialLedger: { create: jest.fn().mockResolvedValue({ id: 'ledger-1' }) },
  partner: { update: jest.fn().mockResolvedValue({}) },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { PATCH } from '@/app/api/admin/payouts/[id]/route';

function req(body: any) {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
  mockPrismaClient.profitDistribution.update.mockResolvedValue({
    id: 'pay1', partnerId: 'p1', distributionAmount: 7000, status: 'PAID', partner: { name: 'Beta Partner' },
  });
});

it('posts a DEBIT commission entry on the APPROVED -> PAID transition', async () => {
  mockPrismaClient.profitDistribution.findUnique.mockResolvedValue({
    id: 'pay1', partnerId: 'p1', distributionAmount: 7000, status: 'APPROVED', notes: null, partner: { name: 'Beta Partner', email: 'b@x.com' },
  });

  const res = await PATCH(req({ status: 'PAID' }), params('pay1'));

  expect(res.status).toBe(200);
  expect(mockPrismaClient.financialLedger.create).toHaveBeenCalledTimes(1);
  const entry = mockPrismaClient.financialLedger.create.mock.calls[0][0].data;
  expect(entry.sourceType).toBe('COMMISSION');
  expect(entry.direction).toBe('DEBIT');
  expect(entry.amount).toBe(7000);
  expect(mockPrismaClient.partner.update).toHaveBeenCalledTimes(1);
  expect(mockPrismaClient.partner.update).toHaveBeenCalledWith({
    where: { id: 'p1' },
    data: { totalProfitReceived: { increment: 7000 } },
  });
});

it('does not double-post or double-increment if the payout is already PAID', async () => {
  mockPrismaClient.profitDistribution.findUnique.mockResolvedValue({
    id: 'pay1', partnerId: 'p1', distributionAmount: 7000, status: 'PAID', notes: null, partner: { name: 'Beta Partner', email: 'b@x.com' },
  });

  await PATCH(req({ status: 'PAID' }), params('pay1'));

  expect(mockPrismaClient.financialLedger.create).not.toHaveBeenCalled();
  expect(mockPrismaClient.partner.update).not.toHaveBeenCalled();
});
