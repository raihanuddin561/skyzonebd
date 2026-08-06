/**
 * @jest-environment node
 */
// __tests__/admin/payouts-maker-checker.test.ts
//
// Amazon-style gap-closure Phase 3 part 2: PATCH /api/admin/payouts/[id]
// previously auto-approved when marking a PENDING distribution straight to
// PAID in one action — meaning one admin could unilaterally approve-and-
// pay. PAID is now only reachable from an already-APPROVED distribution;
// PENDING -> PAID directly is rejected. A `paidBy` field is now recorded
// on the real PAID transition, mirroring `approvedBy`. Per the confirmed
// scope, this does not require the approver and payer to be different
// admin accounts — only that APPROVED happened as a genuinely distinct,
// prior action.

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
});

it('rejects PENDING -> PAID directly (400) — no more unilateral approve-and-pay in one action', async () => {
  mockPrismaClient.profitDistribution.findUnique.mockResolvedValue({
    id: 'pay1', partnerId: 'p1', distributionAmount: 7000, status: 'PENDING', notes: null, partner: { name: 'Beta Partner', email: 'b@x.com' },
  });

  const res = await PATCH(req({ status: 'PAID' }), params('pay1'));

  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toMatch(/must be approved first/i);
  expect(mockPrismaClient.profitDistribution.update).not.toHaveBeenCalled();
});

it('rejects REJECTED -> PAID directly (400)', async () => {
  mockPrismaClient.profitDistribution.findUnique.mockResolvedValue({
    id: 'pay1', partnerId: 'p1', distributionAmount: 7000, status: 'REJECTED', notes: null, partner: { name: 'Beta Partner', email: 'b@x.com' },
  });

  const res = await PATCH(req({ status: 'PAID' }), params('pay1'));

  expect(res.status).toBe(400);
});

it('allows APPROVED -> PAID and records paidBy from the authenticated session', async () => {
  mockPrismaClient.profitDistribution.findUnique.mockResolvedValue({
    id: 'pay1', partnerId: 'p1', distributionAmount: 7000, status: 'APPROVED', notes: null, partner: { name: 'Beta Partner', email: 'b@x.com' },
  });
  mockPrismaClient.profitDistribution.update.mockResolvedValue({
    id: 'pay1', partnerId: 'p1', distributionAmount: 7000, status: 'PAID', paidBy: 'admin-1', partner: { name: 'Beta Partner' },
  });

  const res = await PATCH(req({ status: 'PAID' }), params('pay1'));

  expect(res.status).toBe(200);
  const updateArg = mockPrismaClient.profitDistribution.update.mock.calls[0][0];
  expect(updateArg.data.paidBy).toBe('admin-1');
  expect(updateArg.data.approvedBy).toBeUndefined(); // already approved — not re-set
});

it('allows an idempotent repeat PATCH against an already-PAID distribution without erroring', async () => {
  mockPrismaClient.profitDistribution.findUnique.mockResolvedValue({
    id: 'pay1', partnerId: 'p1', distributionAmount: 7000, status: 'PAID', notes: null, partner: { name: 'Beta Partner', email: 'b@x.com' },
  });
  mockPrismaClient.profitDistribution.update.mockResolvedValue({
    id: 'pay1', partnerId: 'p1', distributionAmount: 7000, status: 'PAID', partner: { name: 'Beta Partner' },
  });

  const res = await PATCH(req({ status: 'PAID' }), params('pay1'));

  expect(res.status).toBe(200);
  // Ledger/totalProfitReceived guard from Phase 2/3 part 1 still applies —
  // no double-post on the repeat call.
  expect(mockPrismaClient.financialLedger.create).not.toHaveBeenCalled();
});

it('clears approvedBy/paidBy/paidAt on REJECTED', async () => {
  mockPrismaClient.profitDistribution.findUnique.mockResolvedValue({
    id: 'pay1', partnerId: 'p1', distributionAmount: 7000, status: 'APPROVED', notes: null, partner: { name: 'Beta Partner', email: 'b@x.com' },
  });
  mockPrismaClient.profitDistribution.update.mockResolvedValue({
    id: 'pay1', partnerId: 'p1', distributionAmount: 7000, status: 'REJECTED', partner: { name: 'Beta Partner' },
  });

  await PATCH(req({ status: 'REJECTED' }), params('pay1'));

  const updateArg = mockPrismaClient.profitDistribution.update.mock.calls[0][0];
  expect(updateArg.data.approvedBy).toBeNull();
  expect(updateArg.data.paidBy).toBeNull();
  expect(updateArg.data.paidAt).toBeNull();
});
