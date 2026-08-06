/**
 * @jest-environment node
 */
// __tests__/partner/partner-record-lookup.test.ts
//
// Amazon-style gap-closure Phase 0: three partner-facing routes resolved
// the caller's Partner record incorrectly.
// - financial/dashboard and financial/distributions matched
//   `{ id: user.id }` instead of `{ userId: user.id }` — Partner.id and
//   User.id are different id spaces (ADR-008's link is `Partner.userId`),
//   so that branch never matched a real linked partner.
// - analytics/route.ts never looked up a Partner record at all; it used
//   requirePartner()'s returned User directly as if it were a Partner,
//   which is only correct for Product.sellerId (a real FK to User.id) —
//   using the same value as ProfitDistribution.partnerId (a FK to
//   Partner.id) silently returned wrong/empty payout data.
//
// This file proves the fixed lookup: a partner linked via userId now
// resolves correctly on all three routes.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient = {
  user: { findUnique: jest.fn() },
  partner: { findFirst: jest.fn() },
  order: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]) },
  orderItem: { aggregate: jest.fn().mockResolvedValue({ _sum: {}, _count: 0 }), groupBy: jest.fn().mockResolvedValue([]) },
  product: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  profitDistribution: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({ _sum: { distributionAmount: 0 } }),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

function tokenFor(role: string, userId = 'user-1') {
  return jwt.sign({ userId, role }, JWT_SECRET);
}

function mockActiveUser(role: string, id = 'user-1') {
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({
    id, email: 'partner@example.com', name: 'A Partner', role, userType: 'WHOLESALE', isActive: true,
  });
}

function req(url: string) {
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${tokenFor('PARTNER')}` : null) },
    nextUrl: { searchParams: new URL(url).searchParams },
    url,
  } as any;
}

const linkedPartner = { id: 'partner-record-1', userId: 'user-1', name: 'A Partner', email: 'partner@example.com', profitSharePercentage: 20 };

beforeEach(() => {
  jest.clearAllMocks();
  mockActiveUser('PARTNER');
});

describe('GET /api/partner/financial/dashboard resolves Partner via userId, not id', () => {
  it('finds the partner and queries distributions scoped to the real Partner.id', async () => {
    const { GET } = require('@/app/api/partner/financial/dashboard/route');
    (mockPrismaClient.partner.findFirst as jest.Mock).mockResolvedValueOnce(linkedPartner);

    const res = await GET(req('http://x/api/partner/financial/dashboard'));
    expect(res.status).toBe(200);

    const findFirstArg = (mockPrismaClient.partner.findFirst as jest.Mock).mock.calls[0][0];
    expect(findFirstArg.where.OR).toEqual(expect.arrayContaining([{ userId: 'user-1' }]));

    const distCall = (mockPrismaClient.profitDistribution.findMany as jest.Mock).mock.calls[0][0];
    expect(distCall.where.partnerId).toBe('partner-record-1');
  });
});

describe('GET /api/partner/financial/distributions resolves Partner via userId, not id', () => {
  it('finds the partner and queries distributions scoped to the real Partner.id', async () => {
    const { GET } = require('@/app/api/partner/financial/distributions/route');
    (mockPrismaClient.partner.findFirst as jest.Mock).mockResolvedValueOnce(linkedPartner);

    const res = await GET(req('http://x/api/partner/financial/distributions'));
    expect(res.status).toBe(200);

    const findFirstArg = (mockPrismaClient.partner.findFirst as jest.Mock).mock.calls[0][0];
    expect(findFirstArg.where.OR).toEqual(expect.arrayContaining([{ userId: 'user-1' }]));

    const distCall = (mockPrismaClient.profitDistribution.findMany as jest.Mock).mock.calls[0][0];
    expect(distCall.where.partnerId).toBe('partner-record-1');
  });
});

describe('GET /api/partner/analytics no longer treats User.id as Partner.id', () => {
  it('looks up the real Partner record via userId and scopes payout queries to Partner.id, not User.id', async () => {
    const { GET } = require('@/app/api/partner/analytics/route');
    (mockPrismaClient.partner.findFirst as jest.Mock).mockResolvedValueOnce(linkedPartner);

    const res = await GET(req('http://x/api/partner/analytics'));
    expect(res.status).toBe(200);

    const findFirstArg = (mockPrismaClient.partner.findFirst as jest.Mock).mock.calls[0][0];
    expect(findFirstArg.where.OR).toEqual(expect.arrayContaining([{ userId: 'user-1' }]));

    // The payout aggregate must be scoped to the real Partner.id
    // ('partner-record-1'), not the User.id ('user-1') that the pre-fix
    // code used directly.
    const payoutAggregateCall = (mockPrismaClient.profitDistribution.aggregate as jest.Mock).mock.calls[0][0];
    expect(payoutAggregateCall.where.partnerId).toBe('partner-record-1');
    expect(payoutAggregateCall.where.partnerId).not.toBe('user-1');

    // Product-scoped queries (a real FK to User.id) still correctly use
    // the User id, unaffected by this fix.
    const productCountCall = (mockPrismaClient.product.count as jest.Mock).mock.calls[0][0];
    expect(productCountCall.where.sellerId).toBe('user-1');
  });

  it('does not error for a SELLER with no linked Partner record — payout data is simply empty', async () => {
    const { GET } = require('@/app/api/partner/analytics/route');
    (mockPrismaClient.partner.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const res = await GET(req('http://x/api/partner/analytics'));
    expect(res.status).toBe(200);

    const payoutAggregateCall = (mockPrismaClient.profitDistribution.aggregate as jest.Mock).mock.calls[0][0];
    // Scoped to a sentinel that matches no real row, rather than crashing
    // or (worse) matching every partner's distributions.
    expect(payoutAggregateCall.where.partnerId).not.toBe('user-1');
    expect(payoutAggregateCall.where.partnerId).not.toBeUndefined();
  });
});
