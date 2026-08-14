/**
 * @jest-environment node
 */
// __tests__/products/products-category-counts.test.ts
//
// GET /api/products' category filter list used to count ALL products per
// category regardless of isActive, while the product list itself (and this
// same route) only ever returns active products to non-admins. That let a
// category show e.g. "Baby Items — 7 products" while clicking into it
// returned zero results, because every one of those 7 was inactive.

import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  product: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
  category: { findMany: jest.fn().mockResolvedValue([]) },
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { GET } from '@/app/api/products/route';

function req(url: string, token?: string) {
  return {
    url,
    headers: { get: (n: string) => (token && n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
  } as any;
}

const adminToken = () => sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.product.findMany.mockResolvedValue([]);
  mockPrismaClient.product.count.mockResolvedValue(0);
  mockPrismaClient.category.findMany.mockResolvedValue([]);
});

describe('GET /api/products — category product counts', () => {
  it('scopes the category product count to isActive:true for a regular (non-admin) request', async () => {
    await GET(req('http://localhost/api/products'));

    expect(mockPrismaClient.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          _count: { select: { products: { where: { isActive: true } } } },
        }),
      })
    );
  });

  it('counts all products (active and inactive) for an admin request', async () => {
    await GET(req('http://localhost/api/products', adminToken()));

    expect(mockPrismaClient.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          _count: { select: { products: { where: {} } } },
        }),
      })
    );
  });
});
