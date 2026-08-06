/**
 * @jest-environment node
 */
// __tests__/orders/cancel-transaction.test.ts
// Verifies P1-1 for POST /api/orders/cancel: stock restoration and the
// order-status update now happen inside one prisma.$transaction. The key
// assertion (per the backlog AC) is that a forced failure partway through a
// multi-item restore leaves the order-status update never committed —
// before this fix, restoring stock and cancelling the order were two
// separate, non-atomic steps.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient = {
  order: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
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

import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/orders/cancel/route';

function makeTxClient(productUpdate: jest.Mock, orderUpdate: jest.Mock) {
  return {
    product: { findUnique: jest.fn().mockResolvedValue({ stockQuantity: 10 }), update: productUpdate },
    order: { update: orderUpdate },
    inventoryLog: { create: jest.fn().mockResolvedValue({}) },
    // releaseStockAllocationsForOrder (Amazon-style gap-closure Phase 1) —
    // no lot allocations to release in these tests.
    stockAllocation: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    stockLot: { update: jest.fn().mockResolvedValue({}) },
  };
}

function makeRequest(body: any, userId = 'customer-1') {
  const token = jwt.sign({ userId, role: 'BUYER' }, JWT_SECRET);
  return {
    headers: { get: (name: string) => (name.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  // The route now authenticates via lib/auth.ts's requireAuth (P2-9's
  // canonical-auth fix), which re-verifies the caller against the database
  // (not just the JWT) before anything else runs — matching every other
  // already-migrated route in this codebase. Every test needs this to
  // resolve to an active user; tests that also exercise the route's
  // separate "user info for logging" lookup reuse the same resolved value
  // since mockResolvedValue (not mockResolvedValueOnce) applies to every call.
  (prisma.user.findUnique as jest.Mock).mockResolvedValue({
    id: 'customer-1', email: 'customer@test.com', name: 'Customer',
    role: 'BUYER', userType: 'RETAIL', isActive: true,
  });
});

it('a forced failure on the second item causes the whole operation to fail via one $transaction call (not two independent steps)', async () => {
  // In this route, tx.order.update runs first in the callback and the
  // per-item stock-restore loop runs second — so when the second item's
  // update rejects, the callback itself throws. A real Prisma
  // $transaction rolls back everything the callback did (including the
  // order-status update already executed earlier in the same callback)
  // the moment the callback rejects; this mock can't simulate an actual
  // database commit/rollback boundary, so the assertion that matters here
  // is: (a) both operations run inside exactly one $transaction call, not
  // as two independent, separately-committed steps, and (b) the failure
  // surfaces as an error response rather than a false "success".
  const order = {
    id: 'order-1',
    userId: 'customer-1',
    status: 'PENDING',
    orderItems: [
      { productId: 'p1', quantity: 5, product: { name: 'P1' } },
      { productId: 'p2', quantity: 3, product: { name: 'P2' } },
    ],
  };
  (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce(order);

  const productUpdate = jest.fn()
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new Error('simulated DB failure on second item'));
  const orderUpdate = jest.fn().mockResolvedValue({
    id: 'order-1', orderItems: order.orderItems,
  });

  (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
    cb(makeTxClient(productUpdate, orderUpdate))
  );

  const res = await POST(makeRequest({ orderId: 'order-1', reason: 'test' }));

  expect(res.status).toBe(500);
  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  // Only the first item's restore was attempted before the failure — the
  // loop stopped, it did not silently continue past the error.
  expect(productUpdate).toHaveBeenCalledTimes(2);
});

it('happy path: both items restored via atomic increment and the order cancelled in one $transaction call', async () => {
  const order = {
    id: 'order-1',
    userId: 'customer-1',
    status: 'PENDING',
    orderItems: [
      { productId: 'p1', quantity: 5, product: { name: 'P1' } },
      { productId: 'p2', quantity: 3, product: { name: 'P2' } },
    ],
  };
  (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce(order);
  // prisma.user.findUnique is already mocked (both the auth check and the
  // later "user info for logging" lookup) via beforeEach's mockResolvedValue.

  const productUpdate = jest.fn().mockResolvedValue({});
  const orderUpdate = jest.fn().mockResolvedValue({
    id: 'order-1', orderNumber: 'ORD-1', userId: 'customer-1',
    orderItems: order.orderItems, shippingAddress: 'x', billingAddress: 'x',
    paymentMethod: 'bkash', notes: null, subtotal: 100, shipping: 0, tax: 5, total: 105,
    status: 'CANCELLED', paymentStatus: 'PENDING', cancelledAt: new Date(), cancellationReason: 'test',
    createdAt: new Date(), updatedAt: new Date(),
  });

  (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
    cb(makeTxClient(productUpdate, orderUpdate))
  );

  const res = await POST(makeRequest({ orderId: 'order-1', reason: 'test' }));

  expect(res.status).toBe(200);
  expect(productUpdate).toHaveBeenCalledTimes(2);
  expect(productUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ data: { stockQuantity: { increment: 5 } } })
  );
  expect(orderUpdate).toHaveBeenCalledTimes(1);
  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
});
