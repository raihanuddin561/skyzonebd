/**
 * @jest-environment node
 */
// __tests__/admin/orders-edit-items.test.ts
//
// PATCH /api/admin/orders/[id]/items lets an admin correct quantity/price on
// a PENDING order's existing line items (the frontend's "Edit Items" flow on
// src/app/orders/[id]/page.tsx was calling this endpoint with no backend
// route behind it — a live 404). Covers: auth gate, order/state guards, the
// same-line-set invariant, stock adjustment on quantity change, and totals
// recomputation.

import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  order: { findUnique: jest.fn() },
  $transaction: jest.fn(),
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

import { PATCH } from '@/app/api/admin/orders/[id]/items/route';

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

function baseOrder(overrides: any = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-1',
    status: 'PENDING',
    subtotal: 200,
    tax: 0,
    shipping: 50,
    total: 250,
    orderItems: [
      { id: 'oi-1', productId: 'prod-1', quantity: 2, price: 100, total: 200, costPerUnit: 60 },
    ],
    ...overrides,
  };
}

function txMock(overrides: any = {}) {
  return {
    product: {
      findUnique: jest.fn().mockResolvedValue({ stockQuantity: 50, name: 'Test Product' }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    inventoryLog: { create: jest.fn().mockResolvedValue({}) },
    orderItem: { update: jest.fn().mockResolvedValue({}) },
    order: {
      update: jest.fn().mockResolvedValue({
        id: 'order-1', orderNumber: 'ORD-1', subtotal: 300, tax: 0, shipping: 50, total: 350,
        orderItems: [{ id: 'oi-1', productId: 'prod-1', quantity: 3, price: 100, total: 300, product: { name: 'Test Product' } }],
      }),
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.user.findUnique.mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
});

describe('PATCH /api/admin/orders/[id]/items', () => {
  it('rejects non-admin callers', async () => {
    mockPrismaClient.user.findUnique.mockResolvedValue({
      id: 'cust-1', email: 'c@example.com', name: 'Customer', role: 'CUSTOMER', userType: 'RETAIL', isActive: true,
    });

    const res: any = await PATCH(
      req({ items: [{ productId: 'prod-1', quantity: 3, price: 100 }] }, customerToken()),
      params('order-1')
    );

    expect(res.status).toBe(403);
    expect(mockPrismaClient.order.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when the order does not exist', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValue(null);

    const res: any = await PATCH(
      req({ items: [{ productId: 'prod-1', quantity: 3, price: 100 }] }, adminToken()),
      params('missing-order')
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
  });

  it('rejects edits on orders that are no longer PENDING', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValue(baseOrder({ status: 'CONFIRMED' }));

    const res: any = await PATCH(
      req({ items: [{ productId: 'prod-1', quantity: 3, price: 100 }] }, adminToken()),
      params('order-1')
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/CONFIRMED/);
    expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a payload that adds or removes line items', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValue(baseOrder());

    const res: any = await PATCH(
      req({ items: [{ productId: 'prod-1', quantity: 3, price: 100 }, { productId: 'prod-2', quantity: 1, price: 50 }] }, adminToken()),
      params('order-1')
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/existing line items exactly/);
  });

  it('rejects a quantity increase when there is not enough stock', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValue(baseOrder());
    const tx = txMock({
      product: {
        findUnique: jest.fn().mockResolvedValue({ stockQuantity: 0, name: 'Test Product' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        update: jest.fn(),
      },
    });
    mockPrismaClient.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const res: any = await PATCH(
      req({ items: [{ productId: 'prod-1', quantity: 5, price: 100 }] }, adminToken()),
      params('order-1')
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Insufficient stock/);
    expect(tx.orderItem.update).not.toHaveBeenCalled();
  });

  it('increases quantity, decrements stock, recomputes profit and totals', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValue(baseOrder());
    const tx = txMock();
    mockPrismaClient.$transaction.mockImplementation(async (fn: any) => fn(tx));

    const res: any = await PATCH(
      req({ items: [{ productId: 'prod-1', quantity: 3, price: 100 }] }, adminToken()),
      params('order-1')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    // quantity delta = 3 - 2 = 1, decremented from stock
    expect(tx.product.updateMany).toHaveBeenCalledWith(
      { where: { id: 'prod-1', stockQuantity: { gte: 1 } }, data: { stockQuantity: { decrement: 1 } } }
    );
    expect(tx.inventoryLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'ADJUSTMENT', quantity: -1 }),
    }));

    // total = 3 * 100 = 300; profit = (100 - 60) * 3 = 120
    expect(tx.orderItem.update).toHaveBeenCalledWith({
      where: { id: 'oi-1' },
      data: { quantity: 3, price: 100, total: 300, profitPerUnit: 40, totalProfit: 120, profitMargin: 40 },
    });

    // order subtotal recomputed to 300, total = 300 + shipping(50) + tax(0) = 350
    expect(tx.order.update).toHaveBeenCalledWith({
      where: { id: 'order-1' },
      data: { subtotal: 300, tax: 0, total: 350 },
      include: { orderItems: { include: { product: true } } },
    });
  });

  it('decreasing quantity releases stock back', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValue(baseOrder());
    const tx = txMock();
    mockPrismaClient.$transaction.mockImplementation(async (fn: any) => fn(tx));

    await PATCH(
      req({ items: [{ productId: 'prod-1', quantity: 1, price: 100 }] }, adminToken()),
      params('order-1')
    );

    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { stockQuantity: { increment: 1 } },
    });
    expect(tx.inventoryLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'ADJUSTMENT', quantity: 1 }),
    }));
  });

  it('rejects an invalid quantity or price', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValue(baseOrder());

    const res: any = await PATCH(
      req({ items: [{ productId: 'prod-1', quantity: 0, price: 100 }] }, adminToken()),
      params('order-1')
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/valid productId/);
  });
});
