/**
 * @jest-environment node
 */
// __tests__/admin/stock-adjust-cost-required.test.ts
//
// Adding stock via POST /api/admin/stock/adjust represents a real purchase
// — this covers the fix requiring a cost per unit for 'add' (routing
// through the existing, already-correct addStockLot() so the batch gets a
// real StockLot/InventoryLog(PURCHASE)/FinancialLedger entry, instead of a
// bare quantity bump with no cost basis) while 'remove'/'set' (corrections,
// not purchases) stay cost-free.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  product: { findUnique: jest.fn(), update: jest.fn() },
  inventoryLog: { create: jest.fn() },
  stockLot: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
  financialLedger: { create: jest.fn() },
  $transaction: jest.fn((cb: any) => cb(mockPrismaClient)),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { POST } from '@/app/api/admin/stock/adjust/route';

function req(body: any) {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.user.findUnique.mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
  mockPrismaClient.product.findUnique.mockResolvedValue({
    id: 'p1', name: 'Widget', sku: 'SKU-1', stockQuantity: 20,
  });
  mockPrismaClient.product.update.mockResolvedValue({ id: 'p1', name: 'Widget', sku: 'SKU-1', stockQuantity: 50 });
  mockPrismaClient.stockLot.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'lot-1', ...data }));
  mockPrismaClient.inventoryLog.create.mockResolvedValue({ id: 'log-1' });
  mockPrismaClient.financialLedger.create.mockResolvedValue({ id: 'ledger-1' });
});

describe('POST /api/admin/stock/adjust — adding stock (a purchase)', () => {
  it('rejects an add with no costPerUnit at all', async () => {
    const res = await POST(req({ productId: 'p1', adjustmentType: 'add', quantity: 30, reason: 'New shipment arrived' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/cost per unit/i);
    expect(mockPrismaClient.stockLot.create).not.toHaveBeenCalled();
    expect(mockPrismaClient.product.update).not.toHaveBeenCalled();
  });

  it('rejects an add with a zero or negative costPerUnit', async () => {
    const res = await POST(req({ productId: 'p1', adjustmentType: 'add', quantity: 30, reason: 'New shipment arrived', costPerUnit: 0 }));
    expect(res.status).toBe(400);
    expect(mockPrismaClient.stockLot.create).not.toHaveBeenCalled();
  });

  it('rejects an add with a non-numeric costPerUnit', async () => {
    const res = await POST(req({ productId: 'p1', adjustmentType: 'add', quantity: 30, reason: 'New shipment arrived', costPerUnit: 'free' }));
    expect(res.status).toBe(400);
  });

  it('creates a real StockLot, PURCHASE inventory log, and ledger entry when cost is provided', async () => {
    const res = await POST(req({
      productId: 'p1', adjustmentType: 'add', quantity: 30, reason: 'New shipment from supplier', costPerUnit: 125.5,
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    expect(mockPrismaClient.stockLot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ productId: 'p1', quantityReceived: 30, costPerUnit: 125.5, totalCost: 30 * 125.5 }),
      })
    );
    expect(mockPrismaClient.inventoryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ productId: 'p1', action: 'PURCHASE', quantity: 30 }) })
    );
    expect(mockPrismaClient.financialLedger.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ direction: 'DEBIT', category: 'INVENTORY' }) })
    );
    // Product stock actually incremented via addStockLot's own transaction.
    expect(mockPrismaClient.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p1' }, data: { stockQuantity: 50 } })
    );
  });

  it('passes optional supplier/PO reference through to the stock lot when provided', async () => {
    await POST(req({
      productId: 'p1', adjustmentType: 'add', quantity: 10, reason: 'Restock', costPerUnit: 100,
      supplierName: 'Acme Traders', purchaseOrderRef: 'PO-2026-001',
    }));
    expect(mockPrismaClient.stockLot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ supplierName: 'Acme Traders', purchaseOrderRef: 'PO-2026-001' }),
      })
    );
  });
});

describe('POST /api/admin/stock/adjust — remove/set (corrections, not purchases)', () => {
  it('does not require a cost for "remove"', async () => {
    const res = await POST(req({ productId: 'p1', adjustmentType: 'remove', quantity: 5, reason: 'Damaged units' }));
    expect(res.status).toBe(200);
    expect(mockPrismaClient.stockLot.create).not.toHaveBeenCalled();
    expect(mockPrismaClient.inventoryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'ADJUSTMENT', quantity: -5 }) })
    );
  });

  it('does not require a cost for "set"', async () => {
    const res = await POST(req({ productId: 'p1', adjustmentType: 'set', quantity: 40, reason: 'Physical recount' }));
    expect(res.status).toBe(200);
    expect(mockPrismaClient.stockLot.create).not.toHaveBeenCalled();
  });

  it('ignores a costPerUnit if one is accidentally sent for "remove"', async () => {
    const res = await POST(req({ productId: 'p1', adjustmentType: 'remove', quantity: 5, reason: 'Damaged units', costPerUnit: 999 }));
    expect(res.status).toBe(200);
    expect(mockPrismaClient.stockLot.create).not.toHaveBeenCalled();
  });
});
