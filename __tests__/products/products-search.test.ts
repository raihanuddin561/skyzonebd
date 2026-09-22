/**
 * @jest-environment node
 */
// __tests__/products/products-search.test.ts
//
// Phase A (search/discovery consolidation): GET /api/products became the one
// canonical listing/search endpoint, replacing the separate, now-removed
// /api/search/products (which used a different query param, `q`, and had
// slightly broader matching). This covers the behavior added/changed for
// that consolidation: sku matching, trimmed search input, the `ids` batch
// lookup used by the "recently viewed" feature, and page/limit clamping.

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

function req(url: string) {
  return {
    url,
    headers: { get: () => null },
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.product.findMany.mockResolvedValue([]);
  mockPrismaClient.product.count.mockResolvedValue(0);
  mockPrismaClient.category.findMany.mockResolvedValue([]);
});

describe('GET /api/products — search consolidation', () => {
  it('matches on sku in addition to name/description/brand/tags', async () => {
    await GET(req('http://localhost/api/products?search=ABC-123'));

    expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ sku: { contains: 'ABC-123', mode: 'insensitive' } }]),
        }),
      })
    );
  });

  it('trims whitespace from the search param before filtering', async () => {
    await GET(req('http://localhost/api/products?search=%20%20widget%20%20'));

    expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([{ name: { contains: 'widget', mode: 'insensitive' } }]),
        }),
      })
    );
  });

  it('a blank/whitespace-only search applies no search filter at all', async () => {
    await GET(req('http://localhost/api/products?search=%20%20%20'));

    const call = mockPrismaClient.product.findMany.mock.calls[0][0];
    expect(call.where.OR).toBeUndefined();
  });

  describe('ids batch lookup', () => {
    it('filters by id: {in} and ignores category/price/featured filters', async () => {
      await GET(req('http://localhost/api/products?ids=p1,p2,p3&category=electronics&minPrice=10&featured=true'));

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ['p1', 'p2', 'p3'] } }),
        })
      );
      const call = mockPrismaClient.product.findMany.mock.calls[0][0];
      expect(call.where.category).toBeUndefined();
      expect(call.where.wholesalePrice).toBeUndefined();
      expect(call.where.isFeatured).toBeUndefined();
    });

    it('trims whitespace and drops empty entries from the ids list', async () => {
      await GET(req('http://localhost/api/products?ids=%20p1%20,,p2'));

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ['p1', 'p2'] } }),
        })
      );
    });

    it('takes every matching product (not the default 12-item limit) when more ids than the default limit are requested', async () => {
      const manyIds = Array.from({ length: 25 }, (_, i) => `p${i}`);
      await GET(req(`http://localhost/api/products?ids=${manyIds.join(',')}`));

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25, skip: 0 })
      );
    });
  });

  describe('page/limit clamping', () => {
    it('clamps limit to a maximum of 100', async () => {
      await GET(req('http://localhost/api/products?limit=9999'));

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it('clamps limit to a minimum of 1', async () => {
      await GET(req('http://localhost/api/products?limit=0'));

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 })
      );
    });

    it('clamps page to a minimum of 1', async () => {
      await GET(req('http://localhost/api/products?page=-5'));

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 })
      );
    });

    it('falls back to the default limit (12) when limit is not a number', async () => {
      await GET(req('http://localhost/api/products?limit=notanumber'));

      expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 12 })
      );
    });
  });
});
