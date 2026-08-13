/**
 * @jest-environment node
 */
// __tests__/products/products-related.test.ts
//
// The product detail page's "Related Products" section has called
// GET /api/products/[id]/related since it was built (via useRelatedProducts),
// but the route never existed — every product page's Related Products
// section silently rendered nothing (masked by its own `.length > 0` guard),
// confirmed via a live Playwright check that surfaced a 404 on this path.

const mockPrismaClient: any = {
  product: { findFirst: jest.fn(), findMany: jest.fn() },
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { GET } from '@/app/api/products/[id]/related/route';

function req(url: string) {
  return { nextUrl: new URL(url) } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/products/[id]/related', () => {
  it('returns 404 when the product does not exist', async () => {
    mockPrismaClient.product.findFirst.mockResolvedValue(null);

    const res: any = await GET(req('http://localhost/api/products/no-such-id/related'), {
      params: Promise.resolve({ id: 'no-such-id' }),
    });

    expect(res.status).toBe(404);
  });

  it('finds other active products in the same category, excluding itself', async () => {
    mockPrismaClient.product.findFirst.mockResolvedValue({ id: 'p1', categoryId: 'cat-1' });
    mockPrismaClient.product.findMany.mockResolvedValue([
      {
        id: 'p2', name: 'Related Item', wholesalePrice: 100, basePrice: 90, unit: 'pc', moq: 5,
        imageUrl: 'img.jpg', imageUrls: [], thumbnailUrl: null, description: null,
        category: { name: 'Cables', slug: 'cables' }, brand: null, tags: [],
        wholesaleTiers: [], stockQuantity: 10, availability: 'IN_STOCK', sku: 'SKU-2',
        rating: 4.5, reviewCount: 2, isFeatured: false, isActive: true, createdAt: new Date(),
      },
    ]);

    const res: any = await GET(req('http://localhost/api/products/p1/related'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: 'cat-1', id: { not: 'p1' }, isActive: true }),
      })
    );
    expect(body.data.relatedProducts).toHaveLength(1);
    expect(body.data.relatedProducts[0].id).toBe('p2');
  });

  it('caps the result at the requested limit (max 20)', async () => {
    mockPrismaClient.product.findFirst.mockResolvedValue({ id: 'p1', categoryId: 'cat-1' });
    mockPrismaClient.product.findMany.mockResolvedValue([]);

    await GET(req('http://localhost/api/products/p1/related?limit=500'), {
      params: Promise.resolve({ id: 'p1' }),
    });

    expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 })
    );
  });
});
