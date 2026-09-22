/**
 * @jest-environment node
 */
// __tests__/admin/database-export-import.test.ts

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn().mockResolvedValue(null) },
  product: {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-product', ...data })),
    upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve({ id: 'upserted-product', ...create })),
  },
  category: {
    count: jest.fn().mockResolvedValue(0),
    findMany: jest.fn().mockResolvedValue([{ id: 'cat-1' }]),
    create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-category', ...data })),
    upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve({ id: 'upserted-category', ...create })),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

jest.mock('@/lib/activityLogger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

const { GET: exportGET } = require('@/app/api/admin/database/export/route');
const { POST: importPOST } = require('@/app/api/admin/database/import/route');

class MockHeaders {
  private headers: Map<string, string>;
  constructor(init?: Record<string, string>) { this.headers = new Map(Object.entries(init || {})); }
  get(name: string): string | null { return this.headers.get(name.toLowerCase()) || null; }
}

class MockNextRequest {
  public headers: MockHeaders;
  public url: string;
  public nextUrl: { searchParams: URLSearchParams };
  private body: any;
  constructor(url: string, options?: { headers?: Record<string, string>; body?: any }) {
    const normalized: Record<string, string> = {};
    if (options?.headers) Object.entries(options.headers).forEach(([k, v]) => { normalized[k.toLowerCase()] = v; });
    this.headers = new MockHeaders(normalized);
    this.url = url;
    this.nextUrl = { searchParams: new URL(url).searchParams };
    this.body = options?.body;
  }
  async json() { return this.body; }
}

function tokenFor() { return jwt.sign({ userId: 'actor-1' }, JWT_SECRET); }
function mockActor(role: string) {
  mockPrismaClient.user.findUnique.mockResolvedValueOnce({
    id: 'actor-1', email: 'actor@example.com', name: 'Actor', role, userType: 'WHOLESALE', isActive: true,
  });
}
function req(url: string, opts?: { admin?: boolean; nonAdminRole?: string; body?: any }) {
  if (!opts || (!opts.admin && !opts.nonAdminRole)) {
    return new MockNextRequest(url, { body: opts?.body }) as any;
  }
  const role = opts.admin ? 'ADMIN' : (opts.nonAdminRole as string);
  mockActor(role);
  return new MockNextRequest(url, { headers: { Authorization: `Bearer ${tokenFor()}` }, body: opts.body }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/admin/database/export', () => {
  it('rejects no token (401)', async () => {
    expect((await exportGET(req('http://x/api/admin/database/export?entity=products'))).status).toBe(401);
  });

  it('rejects non-admin (403)', async () => {
    expect((await exportGET(req('http://x/api/admin/database/export?entity=products', { nonAdminRole: 'BUYER' }))).status).toBe(403);
  });

  it('rejects an unknown entity (400)', async () => {
    const res = await exportGET(req('http://x/api/admin/database/export?entity=orders', { admin: true }));
    expect(res.status).toBe(400);
  });

  it('returns products as JSON rows for a valid admin request', async () => {
    mockPrismaClient.product.findMany.mockResolvedValueOnce([{ id: 'p1', name: 'Widget' }]);
    const res = await exportGET(req('http://x/api/admin/database/export?entity=products', { admin: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows).toEqual([{ id: 'p1', name: 'Widget' }]);
  });

  it('refuses to export beyond the row cap', async () => {
    mockPrismaClient.product.count.mockResolvedValueOnce(50001);
    const res = await exportGET(req('http://x/api/admin/database/export?entity=products', { admin: true }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/database/import', () => {
  it('rejects no token (401)', async () => {
    expect((await importPOST(req('http://x/api/admin/database/import', { body: { entity: 'categories', rows: [] } }))).status).toBe(401);
  });

  it('rejects non-admin (403)', async () => {
    expect((await importPOST(req('http://x/api/admin/database/import', { nonAdminRole: 'BUYER', body: { entity: 'categories', rows: [{}] } }))).status).toBe(403);
  });

  it('rejects an empty rows array (400)', async () => {
    const res = await importPOST(req('http://x/api/admin/database/import', { admin: true, body: { entity: 'categories', rows: [] } }));
    expect(res.status).toBe(400);
  });

  it('reports a per-row error for a category missing a required field, without failing the whole batch', async () => {
    const res = await importPOST(req('http://x/api/admin/database/import', {
      admin: true,
      body: { entity: 'categories', rows: [{ name: 'Missing Slug' }, { name: 'Valid', slug: 'valid' }], mode: 'insert' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toEqual({ total: 2, succeeded: 1, failed: 1 });
    expect(body.results[0].success).toBe(false);
    expect(body.results[0].error).toMatch(/slug/i);
    expect(body.results[1].success).toBe(true);
  });

  it('rejects a product row referencing an unknown categoryId', async () => {
    const res = await importPOST(req('http://x/api/admin/database/import', {
      admin: true,
      body: {
        entity: 'products',
        rows: [{ name: 'X', slug: 'x', imageUrl: 'i.jpg', basePrice: 10, wholesalePrice: 12, categoryId: 'nonexistent' }],
        mode: 'insert',
      },
    }));
    const body = await res.json();
    expect(body.results[0].success).toBe(false);
    expect(body.results[0].error).toMatch(/Unknown categoryId/);
  });

  it('imports a valid product row referencing a real category', async () => {
    const res = await importPOST(req('http://x/api/admin/database/import', {
      admin: true,
      body: {
        entity: 'products',
        rows: [{ name: 'X', slug: 'x', imageUrl: 'i.jpg', basePrice: 10, wholesalePrice: 12, categoryId: 'cat-1' }],
        mode: 'insert',
      },
    }));
    const body = await res.json();
    expect(body.results[0].success).toBe(true);
    expect(mockPrismaClient.product.create).toHaveBeenCalled();
  });

  it('coerces CSV-sourced string values (booleans/numbers/comma lists) to the types Prisma expects', async () => {
    // A CSV import always produces plain strings for every cell — this is
    // the exact shape utils/csvImport.ts's parseCsv() hands the API, found
    // to 500 in live testing before this coercion existed (Prisma rejects
    // isActive: "true" where a real boolean is required).
    const res = await importPOST(req('http://x/api/admin/database/import', {
      admin: true,
      body: {
        entity: 'products',
        rows: [{
          name: 'X', slug: 'x', imageUrl: 'i.jpg',
          basePrice: '10', wholesalePrice: '12', categoryId: 'cat-1',
          isActive: 'true', isFeatured: '0', stockQuantity: '50',
          tags: 'a, b ,c',
        }],
        mode: 'insert',
      },
    }));
    const body = await res.json();
    expect(body.results[0].success).toBe(true);
    expect(mockPrismaClient.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          basePrice: 10,
          wholesalePrice: 12,
          isActive: true,
          isFeatured: false,
          stockQuantity: 50,
          tags: ['a', 'b', 'c'],
        }),
      })
    );
  });

  it('coerces a category isActive CSV string ("true") to a real boolean', async () => {
    await importPOST(req('http://x/api/admin/database/import', {
      admin: true,
      body: { entity: 'categories', rows: [{ name: 'Cat', slug: 'cat', isActive: 'true' }], mode: 'insert' },
    }));
    expect(mockPrismaClient.category.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: true }) })
    );
  });

  it('upserts by slug when mode is "upsert"', async () => {
    await importPOST(req('http://x/api/admin/database/import', {
      admin: true,
      body: { entity: 'categories', rows: [{ name: 'Cat', slug: 'cat' }], mode: 'upsert' },
    }));
    expect(mockPrismaClient.category.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'cat' } })
    );
  });

  it('logs an IMPORT activity entry summarizing the batch', async () => {
    await importPOST(req('http://x/api/admin/database/import', {
      admin: true,
      body: { entity: 'categories', rows: [{ name: 'Cat', slug: 'cat' }], mode: 'insert' },
    }));
    const { logActivity } = require('@/lib/activityLogger');
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'IMPORT', entityType: 'Category' }));
  });
});
