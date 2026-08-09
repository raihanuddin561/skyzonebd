/**
 * @jest-environment node
 */
// __tests__/products/products-moq.test.ts
//
// Covers two things: (1) the field-name bug where PUT /api/products/[id]
// only persisted a MOQ edit if the request body contained a `moq` key —
// but the admin edit form (src/app/admin/products/[id]/edit/page.tsx) sends
// `minOrderQuantity`, so every MOQ edit from that page was silently dropped;
// (2) the new PATCH /api/admin/products/bulk-moq endpoint that sets MOQ
// across a selection or the whole catalog at once.

import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  product: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  wholesaleTier: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }), createMany: jest.fn().mockResolvedValue({ count: 0 }) },
  $disconnect: jest.fn().mockResolvedValue(undefined),
};
// PUT wraps the product update (and, when tiers are sent, a tier replace) in
// prisma.$transaction — the callback receives a tx client, which here is
// just the same mock object so assertions against e.g. product.update work
// whether or not the code path goes through the transaction.
mockPrismaClient.$transaction = jest.fn((fn: any) => fn(mockPrismaClient));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

jest.mock('@/lib/activityLogger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

import { PUT } from '@/app/api/products/[id]/route';
import { PATCH } from '@/app/api/admin/products/bulk-moq/route';

function req(body: any, token?: string) {
  return {
    headers: { get: (n: string) => (token && n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const adminToken = () => sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
const customerToken = () => sign({ userId: 'cust-1', role: 'CUSTOMER' }, JWT_SECRET);

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.user.findUnique.mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
});

describe('PUT /api/products/[id] — MOQ field mapping', () => {
  const existingProduct = {
    id: 'prod-1', slug: 'widget', sku: 'SKU-1', name: 'Widget',
    basePrice: 60, wholesalePrice: 100, moq: 1,
  };

  beforeEach(() => {
    mockPrismaClient.product.findUnique.mockResolvedValue(existingProduct);
    mockPrismaClient.product.update.mockImplementation(({ data }: any) => Promise.resolve({
      ...existingProduct, ...data, category: { name: 'Cat' }, wholesaleTiers: [],
    }));
  });

  it('persists MOQ when the request only sends minOrderQuantity (the admin edit form shape)', async () => {
    const res: any = await PUT(req({ minOrderQuantity: 25 }, adminToken()), params('prod-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrismaClient.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ moq: 25 }) })
    );
    expect(body.data.moq).toBe(25);
  });

  it('still works when the request sends moq directly', async () => {
    await PUT(req({ moq: 10 }, adminToken()), params('prod-1'));

    expect(mockPrismaClient.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ moq: 10 }) })
    );
  });

  it('rejects a MOQ of 0 or less via the wholesale validation rules', async () => {
    const res: any = await PUT(req({ minOrderQuantity: 0 }, adminToken()), params('prod-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(mockPrismaClient.product.update).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).toMatch(/Minimum Order Quantity/i);
  });
});

describe('PUT /api/products/[id] — pricing fields (the "no pricing fields, validation error" bug)', () => {
  const existingProduct = {
    id: 'prod-1', slug: 'widget', sku: 'SKU-1', name: 'Widget',
    basePrice: 60, wholesalePrice: 100, moq: 5,
  };

  beforeEach(() => {
    mockPrismaClient.product.findUnique.mockResolvedValue(existingProduct);
    mockPrismaClient.product.update.mockImplementation(({ data }: any) => Promise.resolve({
      ...existingProduct, ...data, category: { name: 'Cat' }, wholesaleTiers: [],
    }));
  });

  it('saves real basePrice and wholesalePrice edits together', async () => {
    const res: any = await PUT(req({ basePrice: 70, wholesalePrice: 120, minOrderQuantity: 5 }, adminToken()), params('prod-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrismaClient.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ basePrice: 70, wholesalePrice: 120, moq: 5 }) })
    );
    expect(body.data.wholesalePrice).toBe(120);
  });

  it('rejects a wholesale price that is not greater than the base price', async () => {
    const res: any = await PUT(req({ basePrice: 100, wholesalePrice: 100 }, adminToken()), params('prod-1'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(mockPrismaClient.product.update).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).toMatch(/Wholesale price/i);
  });

  it('replaces wholesale tiers when a tier list is sent (delete-then-recreate)', async () => {
    const res: any = await PUT(
      req({
        wholesaleTiers: [
          { minQuantity: 10, maxQuantity: 49, price: 90, discount: 10 },
          { minQuantity: 50, maxQuantity: null, price: 80, discount: 20 },
        ],
      }, adminToken()),
      params('prod-1')
    );

    expect(res.status).toBe(200);
    expect(mockPrismaClient.wholesaleTier.deleteMany).toHaveBeenCalledWith({ where: { productId: 'prod-1' } });
    expect(mockPrismaClient.wholesaleTier.createMany).toHaveBeenCalledWith({
      data: [
        { productId: 'prod-1', minQuantity: 10, maxQuantity: 49, price: 90, discount: 10 },
        { productId: 'prod-1', minQuantity: 50, maxQuantity: null, price: 80, discount: 20 },
      ],
    });
  });

  it('clears all tiers when an empty tier list is sent, without recreating any', async () => {
    await PUT(req({ wholesaleTiers: [] }, adminToken()), params('prod-1'));

    expect(mockPrismaClient.wholesaleTier.deleteMany).toHaveBeenCalledWith({ where: { productId: 'prod-1' } });
    expect(mockPrismaClient.wholesaleTier.createMany).not.toHaveBeenCalled();
  });

  it('leaves tiers untouched when wholesaleTiers is omitted from the request', async () => {
    await PUT(req({ name: 'Widget v2' }, adminToken()), params('prod-1'));

    expect(mockPrismaClient.wholesaleTier.deleteMany).not.toHaveBeenCalled();
    expect(mockPrismaClient.wholesaleTier.createMany).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/admin/products/bulk-moq', () => {
  it('rejects non-admin callers', async () => {
    mockPrismaClient.user.findUnique.mockResolvedValue({
      id: 'cust-1', email: 'c@example.com', name: 'Customer', role: 'CUSTOMER', userType: 'RETAIL', isActive: true,
    });

    const res: any = await PATCH(req({ productIds: ['p1'], minOrderQuantity: 5 }, customerToken()));
    expect(res.status).toBe(403);
    expect(mockPrismaClient.product.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a non-integer or sub-1 minOrderQuantity', async () => {
    const res1: any = await PATCH(req({ productIds: ['p1'], minOrderQuantity: 0 }, adminToken()));
    expect(res1.status).toBe(400);

    const res2: any = await PATCH(req({ productIds: ['p1'], minOrderQuantity: 2.5 }, adminToken()));
    expect(res2.status).toBe(400);

    expect(mockPrismaClient.product.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a selection update with no productIds and no applyToAll', async () => {
    const res: any = await PATCH(req({ minOrderQuantity: 5 }, adminToken()));
    expect(res.status).toBe(400);
    expect(mockPrismaClient.product.updateMany).not.toHaveBeenCalled();
  });

  it('updates only the selected products', async () => {
    mockPrismaClient.product.updateMany.mockResolvedValue({ count: 3 });

    const res: any = await PATCH(req({ productIds: ['p1', 'p2', 'p3'], minOrderQuantity: 12 }, adminToken()));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrismaClient.product.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['p1', 'p2', 'p3'] } },
      data: { moq: 12 },
    });
    expect(body.data.updatedCount).toBe(3);
  });

  it('updates every product when applyToAll is set', async () => {
    mockPrismaClient.product.updateMany.mockResolvedValue({ count: 250 });

    const res: any = await PATCH(req({ applyToAll: true, minOrderQuantity: 5 }, adminToken()));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrismaClient.product.updateMany).toHaveBeenCalledWith({
      where: {},
      data: { moq: 5 },
    });
    expect(body.data.updatedCount).toBe(250);
  });
});
