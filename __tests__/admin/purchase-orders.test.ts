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
  purchaseOrder: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), findUniqueOrThrow: jest.fn() },
  purchaseOrderItem: { update: jest.fn(), updateMany: jest.fn(), findMany: jest.fn(), findUniqueOrThrow: jest.fn() },
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
    (mockPrismaClient.purchaseOrder.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
    (mockPrismaClient.purchaseOrder.findUniqueOrThrow as jest.Mock).mockResolvedValueOnce({ id: 'po1', status: 'SENT', supplier: {}, items: [] });
    const res = await PATCH(req({ status: 'SENT' }), { params });
    expect(res.status).toBe(200);
    expect(mockPrismaClient.purchaseOrder.updateMany).toHaveBeenCalledWith({
      where: { id: 'po1', status: 'DRAFT' },
      data: { status: 'SENT' },
    });
  });

  it('rejects a status transition that was concurrently changed underneath it', async () => {
    const { PATCH } = require('@/app/api/admin/purchase-orders/[id]/route');
    (mockPrismaClient.purchaseOrder.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'po1', status: 'DRAFT' });
    // Another request already moved it off DRAFT between the read above and
    // this guarded write, so the conditional updateMany matches nothing.
    (mockPrismaClient.purchaseOrder.updateMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    const res = await PATCH(req({ status: 'SENT' }), { params });
    expect(res.status).toBe(409);
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
    // Fresh in-transaction re-check that the PO itself wasn't concurrently cancelled.
    (mockPrismaClient.purchaseOrder.findUniqueOrThrow as jest.Mock).mockResolvedValueOnce({ status: 'SENT' });
    // Guarded updateMany closes the double-receive race — count: 1 means this
    // call's increment was the one that applied.
    (mockPrismaClient.purchaseOrderItem.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
    (mockPrismaClient.purchaseOrderItem.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 'poi-1', quantityOrdered: 10, quantityReceived: 6 },
    ]);
    (mockPrismaClient.purchaseOrder.update as jest.Mock).mockResolvedValueOnce({ id: 'po1', status: 'PARTIALLY_RECEIVED', supplier: {}, items: [] });

    const res = await POST(req({ items: [{ purchaseOrderItemId: 'poi-1', quantityReceived: 6 }] }), { params });
    expect(res.status).toBe(200);
    const updateArg = (mockPrismaClient.purchaseOrder.update as jest.Mock).mock.calls[0][0];
    expect(updateArg.data.status).toBe('PARTIALLY_RECEIVED');
    expect(mockPrismaClient.purchaseOrderItem.updateMany).toHaveBeenCalledWith({
      where: { id: 'poi-1', quantityReceived: { lte: 4 } },
      data: { quantityReceived: { increment: 6 } },
    });
  });

  it('marks the PO RECEIVED once every line item is fully received', async () => {
    const { POST } = require('@/app/api/admin/purchase-orders/[id]/receive/route');
    mockStockLotCreation();
    (mockPrismaClient.purchaseOrder.findUnique as jest.Mock).mockResolvedValueOnce(basePO);
    (mockPrismaClient.purchaseOrder.findUniqueOrThrow as jest.Mock).mockResolvedValueOnce({ status: 'SENT' });
    (mockPrismaClient.purchaseOrderItem.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
    (mockPrismaClient.purchaseOrderItem.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 'poi-1', quantityOrdered: 10, quantityReceived: 10 },
    ]);
    (mockPrismaClient.purchaseOrder.update as jest.Mock).mockResolvedValueOnce({ id: 'po1', status: 'RECEIVED', supplier: {}, items: [] });

    const res = await POST(req({ items: [{ purchaseOrderItemId: 'poi-1', quantityReceived: 10 }] }), { params });
    expect(res.status).toBe(200);
    const updateArg = (mockPrismaClient.purchaseOrder.update as jest.Mock).mock.calls[0][0];
    expect(updateArg.data.status).toBe('RECEIVED');
  });

  it('rejects receiving against a purchase order that was concurrently cancelled', async () => {
    const { POST } = require('@/app/api/admin/purchase-orders/[id]/receive/route');
    mockStockLotCreation();
    (mockPrismaClient.purchaseOrder.findUnique as jest.Mock).mockResolvedValueOnce(basePO);
    // The pre-transaction check saw SENT, but a concurrent PATCH cancelled
    // the PO before this transaction's fresh in-tx read.
    (mockPrismaClient.purchaseOrder.findUniqueOrThrow as jest.Mock).mockResolvedValueOnce({ status: 'CANCELLED' });

    const res = await POST(req({ items: [{ purchaseOrderItemId: 'poi-1', quantityReceived: 6 }] }), { params });
    expect(res.status).toBe(409);
    expect(mockPrismaClient.purchaseOrderItem.updateMany).not.toHaveBeenCalled();
  });

  it('aborts if a concurrent receipt already consumed the remaining quantity before this transaction runs', async () => {
    const { POST } = require('@/app/api/admin/purchase-orders/[id]/receive/route');
    mockStockLotCreation();
    (mockPrismaClient.purchaseOrder.findUnique as jest.Mock).mockResolvedValueOnce(basePO);
    (mockPrismaClient.purchaseOrder.findUniqueOrThrow as jest.Mock).mockResolvedValueOnce({ status: 'SENT' });
    // The pre-transaction validation pass reads the stale `basePO` snapshot
    // (quantityReceived: 0, so 6 looks valid), but the guarded updateMany
    // matches nothing because another concurrent receipt already consumed
    // all 10 units before this one committed.
    (mockPrismaClient.purchaseOrderItem.updateMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (mockPrismaClient.purchaseOrderItem.findUniqueOrThrow as jest.Mock).mockResolvedValueOnce({
      id: 'poi-1', quantityOrdered: 10, quantityReceived: 10,
    });

    const res = await POST(req({ items: [{ purchaseOrderItemId: 'poi-1', quantityReceived: 6 }] }), { params });
    expect(res.status).toBe(409);
    expect(mockPrismaClient.stockLot.create).not.toHaveBeenCalled();
    expect(mockPrismaClient.purchaseOrder.update).not.toHaveBeenCalled();
  });
});
