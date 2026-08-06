/**
 * @jest-environment node
 */
// __tests__/admin/manual-sales-ledger-cogs.test.ts
//
// Amazon-style gap-closure Phase 0: POST /api/admin/manual-sales posted
// only a revenue CREDIT to FinancialLedger despite computing totalCost for
// the same sale — every manual/offline sale's COGS was invisible to
// financial reporting, and the ledger was unbalanced for this entire sales
// channel (contrast with lib/financialLedger.ts's createOrderLedgerEntries,
// which always posts both legs for online orders). Fixed to post a
// matching DEBIT/COGS entry in the same transaction.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient = {
  product: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));
jest.mock('@/lib/activityLogger', () => ({ logActivity: jest.fn().mockResolvedValue(undefined) }));

import { POST } from '@/app/api/admin/manual-sales/route';

function req(body: any) {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

const saleBody = {
  saleDate: new Date().toISOString(),
  items: [{ productId: 'prod-1', quantity: 2, unitPrice: 100 }],
  adjustInventory: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.product.findUnique.mockResolvedValue({
    id: 'prod-1', name: 'Widget', sku: 'SKU-1', stockQuantity: 50, costPerUnit: 60, basePrice: 60,
  });
});

it('posts a matching COGS debit entry alongside the existing revenue credit entry', async () => {
  const ledgerCreate = jest.fn().mockResolvedValue({});
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) =>
    cb({
      manualSalesEntry: {
        create: jest.fn().mockResolvedValue({
          id: 'sale-1', total: 200, items: [{ productId: 'prod-1' }], referenceNumber: null, saleDate: new Date(),
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      product: { findUnique: jest.fn(), updateMany: jest.fn() },
      inventoryLog: { create: jest.fn() },
      financialLedger: { create: ledgerCreate },
    })
  );

  const res = await POST(req(saleBody));
  expect(res.status).toBe(201);

  expect(ledgerCreate).toHaveBeenCalledTimes(2);
  expect(ledgerCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({
    data: expect.objectContaining({ direction: 'CREDIT', category: 'REVENUE' }),
  }));
  expect(ledgerCreate).toHaveBeenNthCalledWith(2, expect.objectContaining({
    data: expect.objectContaining({ direction: 'DEBIT', category: 'COGS', amount: 120 }), // 2 units * costPerUnit 60
  }));
});

it('does not post a zero-amount COGS entry when the sale has no cost basis', async () => {
  mockPrismaClient.product.findUnique.mockResolvedValue({
    id: 'prod-1', name: 'Widget', sku: 'SKU-1', stockQuantity: 50, costPerUnit: 0, basePrice: 0,
  });
  const ledgerCreate = jest.fn().mockResolvedValue({});
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) =>
    cb({
      manualSalesEntry: {
        create: jest.fn().mockResolvedValue({
          id: 'sale-1', total: 200, items: [{ productId: 'prod-1' }], referenceNumber: null, saleDate: new Date(),
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      product: { findUnique: jest.fn(), updateMany: jest.fn() },
      inventoryLog: { create: jest.fn() },
      financialLedger: { create: ledgerCreate },
    })
  );

  const res = await POST(req(saleBody));
  expect(res.status).toBe(201);
  expect(ledgerCreate).toHaveBeenCalledTimes(1); // revenue only, no COGS entry for zero cost
});
