/**
 * @jest-environment node
 */
// __tests__/admin/purchase-orders.test.ts
//
// Amazon-style gap-closure Phase 1: real Supplier/PurchaseOrder models and
// workflow, replacing the free-text StockLot.supplierId/supplierName/
// purchaseOrderRef scalars with a queryable purchase-order lifecycle
// (DRAFT -> SENT -> PARTIALLY_RECEIVED/RECEIVED, or -> CANCELLED).

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  supplier: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn() },
  purchaseOrder: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
  purchaseOrderItem: { update: jest.fn(), findMany: jest.fn() },
  product: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
  stockLot: { create: jest.fn() },
  inventoryLog: { create: jest.fn() },
  financialLedger: { create: jest.fn() },
  $transaction: jest.fn((cb: any) => cb(mockPrismaClient)),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

function req(body?: any, url = 'http://x/api/admin/purchase-orders') {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
    nextUrl: { searchParams: new URL(url).searchParams },
    url,
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
});

describe('POST /api/admin/suppliers', () => {
  it('rejects a blank supplier name', async () => {
    const { POST } = require('@/app/api/admin/suppliers/route');
    const res = await POST(req({ name: '   ' }));
    expect(res.status).toBe(400);
  });

  it('creates a supplier', async () => {
    const { POST } = require('@/app/api/admin/suppliers/route');
    (mockPrismaClient.supplier.create as jest.Mock).mockResolvedValueOnce({ id: 's1', name: 'Acme Wholesale' });
    const res = await POST(req({ name: 'Acme Wholesale' }));
    expect(res.status).toBe(201);
  });
});

describe('POST /api/admin/purchase-orders', () => {
  it('rejects an order with no line items', async () => {
    const { POST } = require('@/app/api/admin/purchase-orders/route');
    const res = await POST(req({ supplierId: 's1', items: [] }));
    expect(res.status).toBe(400);
  });

  it('rejects a nonexistent supplier', async () => {
    const { POST } = require('@/app/api/admin/purchase-orders/route');
    (mockPrismaClient.supplier.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const res = await POST(req({ supplierId: 'nope', items: [{ productId: 'p1', quantityOrdered: 10, costPerUnit: 5 }] }));
    expect(res.status).toBe(404);
  });

  it('creates a DRAFT purchase order with line items', async () => {
    const { POST } = require('@/app/api/admin/purchase-orders/route');
    (mockPrismaClient.supplier.findUnique as jest.Mock).mockResolvedValueOnce({ id: 's1', name: 'Acme' });
    (mockPrismaClient.purchaseOrder.create as jest.Mock).mockResolvedValueOnce({
      id: 'po1', poNumber: 'PO-1', status: 'DRAFT', supplier: { id: 's1', name: 'Acme' }, items: [],
    });

    const res = await POST(req({ supplierId: 's1', items: [{ productId: 'p1', quantityOrdered: 10, costPerUnit: 5 }] }));
    expect(res.status).toBe(201);
    const createArg = (mockPrismaClient.purchaseOrder.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data.status).toBe('DRAFT');
    expect(createArg.data.createdBy).toBe('admin-1');
  });
});

describe('PATCH /api/admin/purchase-orders/[id]', () => {
  const params = Promise.resolve({ id: 'po1' });

  it('rejects an invalid status transition (DRAFT -> RECEIVED)', async () => {
    const { PATCH } = require('@/app/api/admin/purchase-orders/[id]/route');
    (mockPrismaClient.purchaseOrder.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'po1', status: 'DRAFT' });
    const res = await PATCH(req({ status: 'RECEIVED' }), { params });
    expect(res.status).toBe(400);
  });

  it('allows DRAFT -> SENT', async () => {
    const { PATCH } = require('@/app/api/admin/purchase-orders/[id]/route');
    (mockPrismaClient.purchaseOrder.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'po1', status: 'DRAFT' });
    (mockPrismaClient.purchaseOrder.update as jest.Mock).mockResolvedValueOnce({ id: 'po1', status: 'SENT', supplier: {}, items: [] });
    const res = await PATCH(req({ status: 'SENT' }), { params });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/admin/purchase-orders/[id]/receive', () => {
  const params = Promise.resolve({ id: 'po1' });
  const basePO = {
    id: 'po1', poNumber: 'PO-1', supplierId: 's1', status: 'SENT',
    supplier: { id: 's1', name: 'Acme' },
    items: [{ id: 'poi-1', productId: 'p1', quantityOrdered: 10, quantityReceived: 0, costPerUnit: 5 }],
  };

  function mockStockLotCreation() {
    (mockPrismaClient.product.findUnique as jest.Mock).mockResolvedValue({ stockQuantity: 20, name: 'Widget' });
    (mockPrismaClient.stockLot.create as jest.Mock).mockResolvedValue({ id: 'lot-1', totalCost: 50 });
  }

  it('rejects receiving against a DRAFT purchase order', async () => {
    const { POST } = require('@/app/api/admin/purchase-orders/[id]/receive/route');
    (mockPrismaClient.purchaseOrder.findUnique as jest.Mock).mockResolvedValueOnce({ ...basePO, status: 'DRAFT' });
    const res = await POST(req({ items: [{ purchaseOrderItemId: 'poi-1', quantityReceived: 5 }] }), { params });
    expect(res.status).toBe(400);
  });

  it('rejects receiving more than the remaining ordered quantity', async () => {
    const { POST } = require('@/app/api/admin/purchase-orders/[id]/receive/route');
    (mockPrismaClient.purchaseOrder.findUnique as jest.Mock).mockResolvedValueOnce(basePO);
    const res = await POST(req({ items: [{ purchaseOrderItemId: 'poi-1', quantityReceived: 999 }] }), { params });
    expect(res.status).toBe(400);
  });

  it('marks the PO PARTIALLY_RECEIVED when only some units are received', async () => {
    const { POST } = require('@/app/api/admin/purchase-orders/[id]/receive/route');
    mockStockLotCreation();
    (mockPrismaClient.purchaseOrder.findUnique as jest.Mock).mockResolvedValueOnce(basePO);
    (mockPrismaClient.purchaseOrderItem.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 'poi-1', quantityOrdered: 10, quantityReceived: 6 },
    ]);
    (mockPrismaClient.purchaseOrder.update as jest.Mock).mockResolvedValueOnce({ id: 'po1', status: 'PARTIALLY_RECEIVED', supplier: {}, items: [] });

    const res = await POST(req({ items: [{ purchaseOrderItemId: 'poi-1', quantityReceived: 6 }] }), { params });
    expect(res.status).toBe(200);
    const updateArg = (mockPrismaClient.purchaseOrder.update as jest.Mock).mock.calls[0][0];
    expect(updateArg.data.status).toBe('PARTIALLY_RECEIVED');
    expect(mockPrismaClient.purchaseOrderItem.update).toHaveBeenCalledWith({
      where: { id: 'poi-1' }, data: { quantityReceived: { increment: 6 } },
    });
  });

  it('marks the PO RECEIVED once every line item is fully received', async () => {
    const { POST } = require('@/app/api/admin/purchase-orders/[id]/receive/route');
    mockStockLotCreation();
    (mockPrismaClient.purchaseOrder.findUnique as jest.Mock).mockResolvedValueOnce(basePO);
    (mockPrismaClient.purchaseOrderItem.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 'poi-1', quantityOrdered: 10, quantityReceived: 10 },
    ]);
    (mockPrismaClient.purchaseOrder.update as jest.Mock).mockResolvedValueOnce({ id: 'po1', status: 'RECEIVED', supplier: {}, items: [] });

    const res = await POST(req({ items: [{ purchaseOrderItemId: 'poi-1', quantityReceived: 10 }] }), { params });
    expect(res.status).toBe(200);
    const updateArg = (mockPrismaClient.purchaseOrder.update as jest.Mock).mock.calls[0][0];
    expect(updateArg.data.status).toBe('RECEIVED');
  });
});
