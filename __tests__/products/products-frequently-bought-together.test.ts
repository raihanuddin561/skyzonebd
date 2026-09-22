/**
 * @jest-environment node
 */
// __tests__/products/products-frequently-bought-together.test.ts
//
// GET /api/products/[id]/frequently-bought-together — "customers who bought
// this also bought", computed via a raw self-join over OrderItem grouped by
// the *other* productId sharing an order with this one (Prisma's groupBy
// can't pair products within the same order natively). Scoped to DELIVERED
// orders only, same signal-quality bar as the partner top-products report.

const mockPrismaClient: any = {
  product: { findFirst: jest.fn(), findMany: jest.fn() },
  $queryRaw: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { GET } from '@/app/api/products/[id]/frequently-bought-together/route';

function req(url: string) {
  return { nextUrl: new URL(url) } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/products/[id]/frequently-bought-together', () => {
  it('returns 404 when the product does not exist', async () => {
    mockPrismaClient.product.findFirst.mockResolvedValue(null);

    const res: any = await GET(req('http://localhost/api/products/no-such-id/frequently-bought-together'), {
      params: Promise.resolve({ id: 'no-such-id' }),
    });

    expect(res.status).toBe(404);
    expect(mockPrismaClient.$queryRaw).not.toHaveBeenCalled();
  });

  it('returns an empty list without a second query when there are no co-occurrences', async () => {
    mockPrismaClient.product.findFirst.mockResolvedValue({ id: 'p1' });
    mockPrismaClient.$queryRaw.mockResolvedValue([]);

    const res: any = await GET(req('http://localhost/api/products/p1/frequently-bought-together'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.frequentlyBoughtTogether).toEqual([]);
    expect(mockPrismaClient.product.findMany).not.toHaveBeenCalled();
  });

  it('resolves co-occurring product ids to full products, ranked by co-occurrence count', async () => {
    mockPrismaClient.product.findFirst.mockResolvedValue({ id: 'p1' });
    mockPrismaClient.$queryRaw.mockResolvedValue([
      { productId: 'p3', coOccurrenceCount: 5 },
      { productId: 'p2', coOccurrenceCount: 2 },
    ]);
    // findMany doesn't guarantee input order — deliberately return them
    // reversed to prove the route re-sorts by the ranking, not DB order.
    mockPrismaClient.product.findMany.mockResolvedValue([
      {
        id: 'p2', name: 'Second', wholesalePrice: 50, basePrice: 40, unit: 'pc', moq: 1,
        imageUrl: 'img2.jpg', imageUrls: [], thumbnailUrl: null, description: null,
        category: { name: 'Cables', slug: 'cables' }, brand: null, tags: [],
        wholesaleTiers: [], stockQuantity: 5, availability: 'in_stock', sku: 'SKU-2',
        rating: 4, reviewCount: 1, isFeatured: false, isActive: true, createdAt: new Date(),
      },
      {
        id: 'p3', name: 'First', wholesalePrice: 100, basePrice: 90, unit: 'pc', moq: 1,
        imageUrl: 'img3.jpg', imageUrls: [], thumbnailUrl: null, description: null,
        category: { name: 'Cables', slug: 'cables' }, brand: null, tags: [],
        wholesaleTiers: [], stockQuantity: 3, availability: 'in_stock', sku: 'SKU-3',
        rating: 5, reviewCount: 2, isFeatured: false, isActive: true, createdAt: new Date(),
      },
    ]);

    const res: any = await GET(req('http://localhost/api/products/p1/frequently-bought-together'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrismaClient.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ['p3', 'p2'] }, isActive: true } ) })
    );
    expect(body.data.frequentlyBoughtTogether.map((p: any) => p.id)).toEqual(['p3', 'p2']);
  });

  it('clamps the requested limit to a maximum of 10', async () => {
    mockPrismaClient.product.findFirst.mockResolvedValue({ id: 'p1' });
    mockPrismaClient.$queryRaw.mockResolvedValue([]);

    await GET(req('http://localhost/api/products/p1/frequently-bought-together?limit=500'), {
      params: Promise.resolve({ id: 'p1' }),
    });

    const tagged = mockPrismaClient.$queryRaw.mock.calls[0];
    // Prisma.sql tagged-template calls pass (strings, ...values) — the limit
    // is the last interpolated value.
    const values = tagged.slice(1);
    expect(values[values.length - 1]).toBe(10);
  });
});
