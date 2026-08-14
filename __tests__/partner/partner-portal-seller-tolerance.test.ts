/**
 * @jest-environment node
 */
// __tests__/partner/partner-portal-seller-tolerance.test.ts
// Amazon-Style Wholesale Platform Gap Closure — Phase 4 part 4.
//
// Fresh research found 4 more live instances of the Phase 0 Partner.id-vs-
// User.id bug (financial/profit-loss, financial/sales-summary,
// financial/top-products, reviews — all matched `{ id: user.id }` instead
// of `{ userId: user.id }`), plus a fifth, previously-undiscovered instance
// of the same bug CLASS: partner/dashboard and partner/profits queried
// `ProfitReport.sellerId: partner.id`, but ProfitReport.sellerId is
// populated from Product.sellerId (a User.id, per
// profitReportGeneration.ts) — a different id space, so a real partner's
// own profit reports never matched.
//
// Separately, 6 of 9 partner/* routes hard-404'd for a pure SELLER with no
// linked Partner record, even though their underlying data (Product.sellerId
// -scoped) was perfectly reachable. This file proves both fixes.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient = {
  user: { findUnique: jest.fn() },
  partner: { findFirst: jest.fn() },
  order: { findMany: jest.fn().mockResolvedValue([]), groupBy: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  orderItem: {
    findMany: jest.fn().mockResolvedValue([]),
    groupBy: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue({ _sum: {}, _count: 0 }),
  },
  product: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  profitDistribution: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue({ _sum: { distributionAmount: 0 } }),
  },
  profitReport: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  review: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  operationalCost: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

function tokenFor(userId: string) {
  return jwt.sign({ userId, role: 'SELLER' }, JWT_SECRET);
}

function mockActiveUser(id = 'user-1') {
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({
    id, email: 'seller@example.com', name: 'A Seller', role: 'SELLER', userType: 'WHOLESALE', isActive: true,
  });
}

function req(url: string) {
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${tokenFor('user-1')}` : null) },
    nextUrl: { searchParams: new URL(url).searchParams },
    url,
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockActiveUser();
});

describe.each([
  ['financial/profit-loss', '@/app/api/partner/financial/profit-loss/route', 'http://x/api/partner/financial/profit-loss?startDate=2026-01-01&endDate=2026-01-31'],
  ['financial/sales-summary', '@/app/api/partner/financial/sales-summary/route', 'http://x/api/partner/financial/sales-summary'],
  ['financial/top-products', '@/app/api/partner/financial/top-products/route', 'http://x/api/partner/financial/top-products?startDate=2026-01-01&endDate=2026-01-31'],
])('GET /api/partner/%s', (_name, modulePath, url) => {
  it('resolves the Partner record via userId, not id (the Phase 0 bug class)', async () => {
    const { GET } = require(modulePath);
    (mockPrismaClient.partner.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'partner-record-1', userId: 'user-1', name: 'A Partner', profitSharePercentage: 20,
    });

    const res = await GET(req(url));
    expect(res.status).toBe(200);

    const findFirstArg = (mockPrismaClient.partner.findFirst as jest.Mock).mock.calls[0][0];
    expect(findFirstArg.where.OR).toEqual(expect.arrayContaining([{ userId: 'user-1' }]));
  });

  it('does not 404 for a SELLER with no linked Partner record', async () => {
    const { GET } = require(modulePath);
    (mockPrismaClient.partner.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const res = await GET(req(url));
    expect(res.status).toBe(200);
  });
});

describe('GET /api/partner/reviews', () => {
  it('no longer requires (or even queries) a Partner record at all — data is scoped by Product.sellerId directly', async () => {
    const { GET } = require('@/app/api/partner/reviews/route');
    (mockPrismaClient.product.findMany as jest.Mock).mockResolvedValueOnce([{ id: 'p1' }]);

    const res = await GET(req('http://x/api/partner/reviews'));
    expect(res.status).toBe(200);
    expect(mockPrismaClient.partner.findFirst).not.toHaveBeenCalled();

    const productCall = (mockPrismaClient.product.findMany as jest.Mock).mock.calls[0][0];
    expect(productCall.where.sellerId).toBe('user-1');
  });
});

describe('GET /api/partner/dashboard', () => {
  it('scopes ProfitReport by the real User.id, not Partner.id (previously always returned empty for a real partner)', async () => {
    const { GET } = require('@/app/api/partner/dashboard/route');
    (mockPrismaClient.partner.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'partner-record-1', userId: 'user-1', name: 'A Partner', profitSharePercentage: 20,
      totalProfitReceived: 0, isActive: true, joinDate: new Date(),
    });

    const res = await GET(req('http://x/api/partner/dashboard'));
    expect(res.status).toBe(200);

    const reportCall = (mockPrismaClient.profitReport.findMany as jest.Mock).mock.calls[0][0];
    expect(reportCall.where.sellerId).toBe('user-1');
    expect(reportCall.where.sellerId).not.toBe('partner-record-1');
  });

  it('does not 404 for a SELLER with no linked Partner record — partner is null in the response, not an error', async () => {
    const { GET } = require('@/app/api/partner/dashboard/route');
    (mockPrismaClient.partner.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const res = await GET(req('http://x/api/partner/dashboard'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.partner).toBeNull();
  });
});

describe('GET /api/partner/profits', () => {
  it('scopes ProfitReport by the real User.id, not Partner.id', async () => {
    const { GET } = require('@/app/api/partner/profits/route');
    (mockPrismaClient.partner.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'partner-record-1', userId: 'user-1', name: 'A Partner', profitSharePercentage: 20,
    });

    const res = await GET(req('http://x/api/partner/profits?type=reports'));
    expect(res.status).toBe(200);

    const reportCall = (mockPrismaClient.profitReport.findMany as jest.Mock).mock.calls[0][0];
    expect(reportCall.where.sellerId).toBe('user-1');
  });

  it('does not 404 for a SELLER with no linked Partner record — distributions are empty, not an error', async () => {
    const { GET } = require('@/app/api/partner/profits/route');
    (mockPrismaClient.partner.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const res = await GET(req('http://x/api/partner/profits'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.partner).toBeNull();
    expect(body.data.distributions.items).toEqual([]);
    expect(mockPrismaClient.profitDistribution.findMany).not.toHaveBeenCalled();
  });
});

describe.each([
  ['financial/dashboard', '@/app/api/partner/financial/dashboard/route', 'http://x/api/partner/financial/dashboard'],
  ['financial/distributions', '@/app/api/partner/financial/distributions/route', 'http://x/api/partner/financial/distributions'],
])('GET /api/partner/%s', (_name, modulePath, url) => {
  it('does not 404 for a SELLER with no linked Partner record', async () => {
    const { GET } = require(modulePath);
    (mockPrismaClient.partner.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const res = await GET(req(url));
    expect(res.status).toBe(200);
  });
});
