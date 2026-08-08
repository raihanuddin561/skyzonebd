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
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

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
