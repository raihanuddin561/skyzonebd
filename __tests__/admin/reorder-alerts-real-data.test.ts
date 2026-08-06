/**
 * @jest-environment node
 */
// __tests__/admin/reorder-alerts-real-data.test.ts
//
// Amazon-style gap-closure Phase 0: GET /api/admin/stock/reorder-alerts and
// GET /api/admin/stock both used a hardcoded stock-level filter/threshold
// and a hardcoded `averageDailySales: 2` for every product, ignoring each
// product's own `reorderLevel` and real order history entirely. Fixed to
// filter/compute from real data.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient = {
  user: { findUnique: jest.fn() },
  product: { findMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

function req(url: string) {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    url,
    nextUrl: { searchParams: new URL(url).searchParams },
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
});

describe('GET /api/admin/stock/reorder-alerts', () => {
  it('includes a product whose stock is below its own real reorderLevel, even above the old hardcoded 20 threshold', async () => {
    const { GET } = require('@/app/api/admin/stock/reorder-alerts/route');
    (mockPrismaClient.product.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: 'p1', name: 'High-velocity product', sku: 'SKU1', stockQuantity: 45,
        moq: 10, reorderLevel: 50, reorderQuantity: 100, // 45 < 50 -> should alert, even though 45 > the old hardcoded 20
        category: { name: 'Cat' }, orderItems: [],
      },
    ]);

    const res = await GET(req('http://x/api/admin/stock/reorder-alerts'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.alerts).toHaveLength(1);
    expect(body.alerts[0].productId).toBe('p1');
  });

  it('excludes a product whose stock is above its own reorderLevel, even if it would have matched the old hardcoded 20 threshold', async () => {
    const { GET } = require('@/app/api/admin/stock/reorder-alerts/route');
    (mockPrismaClient.product.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: 'p2', name: 'Low-velocity product', sku: 'SKU2', stockQuantity: 15,
        moq: 10, reorderLevel: 5, reorderQuantity: 20, // 15 > 5 -> should NOT alert, even though 15 <= the old hardcoded 20
        category: { name: 'Cat' }, orderItems: [],
      },
    ]);

    const res = await GET(req('http://x/api/admin/stock/reorder-alerts'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.alerts).toHaveLength(0);
  });

  it('computes averageDailySales from real order-item history instead of a hardcoded constant', async () => {
    const { GET } = require('@/app/api/admin/stock/reorder-alerts/route');
    (mockPrismaClient.product.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: 'p3', name: 'Fast seller', sku: 'SKU3', stockQuantity: 10,
        moq: 5, reorderLevel: 50, reorderQuantity: 100,
        category: { name: 'Cat' },
        orderItems: [{ quantity: 300 }], // 300 units / 30 days = 10/day -> 1 day of stock left
      },
    ]);

    const res = await GET(req('http://x/api/admin/stock/reorder-alerts'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.alerts[0].daysOfStock).toBe(1);
  });
});

describe('GET /api/admin/stock', () => {
  it('computes averageDailySales from real order-item history instead of a hardcoded constant', async () => {
    const { GET } = require('@/app/api/admin/stock/route');
    (mockPrismaClient.product.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: 'p1', name: 'Product', sku: 'SKU1', stockQuantity: 20, moq: 5,
        reorderLevel: 10, reorderQuantity: 50, categoryId: 'c1', category: { name: 'Cat' },
        orderItems: [{ quantity: 60 }], // 60/30 = 2/day -> 10 days of stock
      },
    ]);

    const res = await GET(req('http://x/api/admin/stock'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.items[0].daysOfStock).toBe(10);
  });
});
