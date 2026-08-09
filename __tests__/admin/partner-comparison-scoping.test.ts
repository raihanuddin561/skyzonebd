/**
 * @jest-environment node
 */
// __tests__/admin/partner-comparison-scoping.test.ts
//
// GET /api/admin/financial/partner-comparison used to compute every
// partner's "revenue"/"profit"/"orders" from an unfiltered Order query (no
// partnerId, no sellerId — nothing tying it to that specific partner), so
// every partner row showed the exact same platform-wide totals. Fixed to
// scope strictly to each partner's own OrderItems via their linked
// Partner.userId -> Product.sellerId chain.

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  partner: { findMany: jest.fn() },
  order: { findMany: jest.fn(), count: jest.fn() },
  orderItem: { findMany: jest.fn() },
  profitDistribution: { findMany: jest.fn().mockResolvedValue([]) },
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { sign } from 'jsonwebtoken';
import { GET } from '@/app/api/admin/financial/partner-comparison/route';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

function req(url: string, token: string) {
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    nextUrl: new URL(url),
  } as any;
}

const adminToken = () => sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.user.findUnique.mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
  mockPrismaClient.profitDistribution.findMany.mockResolvedValue([]);
});

it('scopes each linked partner to only their own order items, not platform-wide totals', async () => {
  mockPrismaClient.partner.findMany.mockResolvedValue([
    { id: 'partner-a', name: 'Partner A', email: 'a@example.com', profitSharePercentage: 10, isActive: true, createdAt: new Date(), userId: 'user-a' },
    { id: 'partner-b', name: 'Partner B', email: 'b@example.com', profitSharePercentage: 10, isActive: true, createdAt: new Date(), userId: 'user-b' },
  ]);

  mockPrismaClient.orderItem.findMany.mockImplementation(({ where }: any) => {
    const sellerId = where.product.sellerId;
    if (sellerId === 'user-a') {
      return Promise.resolve([{ quantity: 5, total: 500, totalProfit: 100 }]);
    }
    return Promise.resolve([]); // partner-b has no sales
  });
  mockPrismaClient.order.count.mockResolvedValue(1);

  const res: any = await GET(req('http://localhost/api/admin/financial/partner-comparison?period=month', adminToken()));
  const body = await res.json();

  expect(res.status).toBe(200);
  const [partnerA, partnerB] = body.data.partners.sort((a: any, b: any) => a.partnerId.localeCompare(b.partnerId));

  expect(partnerA.revenue.current).toBe(500);
  expect(partnerA.profit.current).toBe(100);
  expect(partnerB.revenue.current).toBe(0);
  expect(partnerB.profit.current).toBe(0);

  // Every orderItem query must be scoped to the partner's own linked seller id.
  const scopedSellerIds = mockPrismaClient.orderItem.findMany.mock.calls.map(
    ([args]: any) => args.where.product.sellerId
  );
  expect(scopedSellerIds).toEqual(expect.arrayContaining(['user-a', 'user-b']));
});

it('gives a partner with no linked user account zero revenue/orders instead of platform totals', async () => {
  mockPrismaClient.partner.findMany.mockResolvedValue([
    { id: 'investor-1', name: 'Pure Investor', email: 'inv@example.com', profitSharePercentage: 20, isActive: true, createdAt: new Date(), userId: null },
  ]);

  const res: any = await GET(req('http://localhost/api/admin/financial/partner-comparison?period=month', adminToken()));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.data.partners[0].revenue.current).toBe(0);
  expect(body.data.partners[0].orders.count).toBe(0);
  // No order-level query should ever run for a partner with no seller link.
  expect(mockPrismaClient.orderItem.findMany).not.toHaveBeenCalled();
  expect(mockPrismaClient.order.count).not.toHaveBeenCalled();
});
