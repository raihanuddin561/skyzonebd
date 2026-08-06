/**
 * @jest-environment node
 */
// __tests__/wishlist/wishlist-api.test.ts
// Verifies the new persistent-wishlist API (Amazon-Style Wholesale Platform
// Gap Closure — Phase 4 part 2): GET/POST /api/wishlist and
// DELETE /api/wishlist/[productId], all requiring authentication and scoped
// to the caller's own wishlist.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient = {
  user: { findUnique: jest.fn() },
  product: { findUnique: jest.fn() },
  wishlist: { findUnique: jest.fn(), upsert: jest.fn() },
  wishlistItem: { upsert: jest.fn(), deleteMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { prisma } from '@/lib/prisma';
import { GET, POST } from '@/app/api/wishlist/route';
import { DELETE } from '@/app/api/wishlist/[productId]/route';

class MockHeaders {
  private headers: Map<string, string>;
  constructor(init?: Record<string, string>) {
    this.headers = new Map(Object.entries(init || {}));
  }
  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }
}

class MockNextRequest {
  public headers: MockHeaders;
  private body: any;

  constructor(url: string, options?: { headers?: Record<string, string>; body?: any }) {
    const normalized: Record<string, string> = {};
    Object.entries(options?.headers || {}).forEach(([k, v]) => { normalized[k.toLowerCase()] = v; });
    this.headers = new MockHeaders(normalized);
    this.body = options?.body;
  }

  async json() {
    return this.body;
  }
}

function tokenFor(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET);
}

function mockActor(id: string) {
  (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
    id, email: `${id}@example.com`, name: 'Actor', role: 'BUYER', userType: 'WHOLESALE', isActive: true,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/wishlist', () => {
  it('rejects an unauthenticated request (401)', async () => {
    const request = new MockNextRequest('http://x/api/wishlist') as any;
    const res = await GET(request);
    expect(res.status).toBe(401);
  });

  it('returns an empty item list when the user has no wishlist yet', async () => {
    mockActor('buyer-1');
    (prisma.wishlist.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const request = new MockNextRequest('http://x/api/wishlist', {
      headers: { Authorization: `Bearer ${tokenFor('buyer-1')}` },
    }) as any;
    const res = await GET(request);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.items).toEqual([]);
  });

  it('returns formatted product data for each wishlisted item', async () => {
    mockActor('buyer-1');
    (prisma.wishlist.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'wl-1',
      items: [
        {
          product: {
            id: 'p1', name: 'Widget', wholesalePrice: 100, moq: 10, unit: 'pc',
            imageUrl: 'img.jpg', imageUrls: [], description: 'd', brand: 'B',
            tags: [], stockQuantity: 5, availability: 'in_stock', rating: 4.5,
            reviewCount: 3, category: { name: 'Tools' },
          },
        },
      ],
    });
    const request = new MockNextRequest('http://x/api/wishlist', {
      headers: { Authorization: `Bearer ${tokenFor('buyer-1')}` },
    }) as any;
    const res = await GET(request);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.items).toEqual([
      expect.objectContaining({ id: 'p1', name: 'Widget', price: 100, minOrderQuantity: 10, category: 'Tools' }),
    ]);
  });
});

describe('POST /api/wishlist', () => {
  it('rejects an unauthenticated request (401)', async () => {
    const request = new MockNextRequest('http://x/api/wishlist', { body: { productId: 'p1' } }) as any;
    const res = await POST(request);
    expect(res.status).toBe(401);
  });

  it('rejects a missing productId (400)', async () => {
    mockActor('buyer-1');
    const request = new MockNextRequest('http://x/api/wishlist', {
      headers: { Authorization: `Bearer ${tokenFor('buyer-1')}` },
      body: {},
    }) as any;
    const res = await POST(request);
    expect(res.status).toBe(400);
  });

  it('404s for a nonexistent product', async () => {
    mockActor('buyer-1');
    (prisma.product.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const request = new MockNextRequest('http://x/api/wishlist', {
      headers: { Authorization: `Bearer ${tokenFor('buyer-1')}` },
      body: { productId: 'missing' },
    }) as any;
    const res = await POST(request);
    expect(res.status).toBe(404);
  });

  it('creates the wishlist (if needed) and upserts the item, scoped to the caller', async () => {
    mockActor('buyer-1');
    (prisma.product.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'p1', name: 'Widget', wholesalePrice: 100, moq: 10, unit: 'pc',
      imageUrl: 'img.jpg', imageUrls: [], description: 'd', brand: 'B',
      tags: [], stockQuantity: 5, availability: 'in_stock', rating: 4.5,
      reviewCount: 3, category: { name: 'Tools' },
    });
    (prisma.wishlist.upsert as jest.Mock).mockResolvedValueOnce({ id: 'wl-1', userId: 'buyer-1' });
    (prisma.wishlistItem.upsert as jest.Mock).mockResolvedValueOnce({ id: 'wi-1' });

    const request = new MockNextRequest('http://x/api/wishlist', {
      headers: { Authorization: `Bearer ${tokenFor('buyer-1')}` },
      body: { productId: 'p1' },
    }) as any;
    const res = await POST(request);
    expect(res.status).toBe(200);
    expect(prisma.wishlist.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'buyer-1' } })
    );
    expect(prisma.wishlistItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { wishlistId_productId: { wishlistId: 'wl-1', productId: 'p1' } },
      })
    );
  });

  it('re-adding an already-wishlisted product is idempotent (no error)', async () => {
    mockActor('buyer-1');
    (prisma.product.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'p1', name: 'Widget', wholesalePrice: 100, moq: 10, unit: 'pc',
      imageUrl: 'img.jpg', imageUrls: [], description: 'd', brand: 'B',
      tags: [], stockQuantity: 5, availability: 'in_stock', rating: 4.5,
      reviewCount: 3, category: { name: 'Tools' },
    });
    (prisma.wishlist.upsert as jest.Mock).mockResolvedValueOnce({ id: 'wl-1', userId: 'buyer-1' });
    (prisma.wishlistItem.upsert as jest.Mock).mockResolvedValueOnce({ id: 'wi-1' });

    const request = new MockNextRequest('http://x/api/wishlist', {
      headers: { Authorization: `Bearer ${tokenFor('buyer-1')}` },
      body: { productId: 'p1' },
    }) as any;
    const res = await POST(request);
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/wishlist/[productId]', () => {
  const params = (productId: string) => Promise.resolve({ productId });

  it('rejects an unauthenticated request (401)', async () => {
    const request = new MockNextRequest('http://x/api/wishlist/p1') as any;
    const res = await DELETE(request, { params: params('p1') });
    expect(res.status).toBe(401);
  });

  it('removes the item scoped to the caller\'s own wishlist', async () => {
    mockActor('buyer-1');
    (prisma.wishlist.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'wl-1', userId: 'buyer-1' });
    (prisma.wishlistItem.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 });

    const request = new MockNextRequest('http://x/api/wishlist/p1', {
      headers: { Authorization: `Bearer ${tokenFor('buyer-1')}` },
    }) as any;
    const res = await DELETE(request, { params: params('p1') });
    expect(res.status).toBe(200);
    expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
      where: { wishlistId: 'wl-1', productId: 'p1' },
    });
  });

  it('is a no-op (200, not 404) when the user has no wishlist row yet', async () => {
    mockActor('buyer-1');
    (prisma.wishlist.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const request = new MockNextRequest('http://x/api/wishlist/p1', {
      headers: { Authorization: `Bearer ${tokenFor('buyer-1')}` },
    }) as any;
    const res = await DELETE(request, { params: params('p1') });
    expect(res.status).toBe(200);
    expect(prisma.wishlistItem.deleteMany).not.toHaveBeenCalled();
  });
});
