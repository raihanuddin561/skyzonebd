/**
 * @jest-environment node
 */
// __tests__/admin/manual-sales-stock-race-guard.test.ts
//
// Production Readiness Audit (2026-07-18) confirmed a P1: manual sales
// inventory adjustment (POST /api/admin/manual-sales) decremented
// Product.stockQuantity via an unguarded `update` inside its transaction.
// The pre-fetch read of the row (for the inventory log's previousStock)
// happens inside the same transaction, but Postgres's default READ
// COMMITTED isolation doesn't by itself stop a concurrent transaction from
// consuming the same stock between that read and this write. Fixed by
// guarding the update's `where` with `stockQuantity: { gte: quantity }` (as
// `updateMany`) and throwing — rolling back the whole sale — if the
// affected row count is 0.

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
  adjustInventory: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.product.findUnique.mockResolvedValue({
    id: 'prod-1', name: 'Test Product', sku: 'SKU-1', stockQuantity: 5, costPerUnit: 60, basePrice: 60,
  });
});

it('rolls back the sale when a concurrent transaction already consumed the stock (guarded updateMany returns count 0)', async () => {
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) =>
    cb({
      manualSalesEntry: {
        create: jest.fn().mockResolvedValue({ id: 'sale-1', total: 200, items: [], saleDate: new Date() }),
        update: jest.fn(),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ stockQuantity: 5 }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      inventoryLog: { create: jest.fn() },
      financialLedger: { create: jest.fn() },
    })
  );

  const res = await POST(req(saleBody));
  expect(res.status).toBe(500);
});

it('succeeds when the guarded updateMany reports the row was actually decremented (count 1)', async () => {
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) =>
    cb({
      manualSalesEntry: {
        create: jest.fn().mockResolvedValue({
          id: 'sale-1', total: 200, items: [{ productId: 'prod-1' }], referenceNumber: null, saleDate: new Date(),
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      product: {
        findUnique: jest.fn().mockResolvedValue({ stockQuantity: 5 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      inventoryLog: { create: jest.fn().mockResolvedValue({}) },
      financialLedger: { create: jest.fn().mockResolvedValue({}) },
    })
  );

  const res = await POST(req(saleBody));
  expect(res.status).toBe(201);
});
