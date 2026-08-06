/**
 * @jest-environment node
 */
// __tests__/orders/delete-cancel-transaction.test.ts
// Verifies P1-1 for DELETE /api/orders/[id]: the previous read-then-write
// stock restoration (`findUnique` then `stockQuantity: product.stockQuantity
// + item.quantity`, with no transaction) is now an atomic `increment` inside
// one prisma.$transaction alongside the order-status update.

const mockPrismaClient = {
  order: { findUnique: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));
jest.mock('@/lib/auth', () => ({
  __esModule: true,
  requireAdmin: jest.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN' }),
  requireAuth: jest.fn(),
}));
jest.mock('@/utils/profitReportGeneration', () => ({
  autoGenerateProfitReport: jest.fn().mockResolvedValue({ success: false }),
}));

import { prisma } from '@/lib/prisma';
import { DELETE } from '@/app/api/orders/[id]/route';

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

function makeRequest() {
  return { headers: { get: (name: string) => (name.toLowerCase() === 'authorization' ? 'Bearer admintoken' : null) } } as any;
}

const params = Promise.resolve({ id: 'order-1' });

beforeEach(() => {
  jest.clearAllMocks();
});

it('a forced failure restoring the second item leaves the order-status update uncommitted', async () => {
  (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce({
    id: 'order-1',
    status: 'PENDING',
    orderItems: [
      { productId: 'p1', quantity: 4 },
      { productId: 'p2', quantity: 2 },
    ],
  });

  const productUpdate = jest.fn()
    .mockResolvedValueOnce({})
    .mockRejectedValueOnce(new Error('simulated DB failure on second item'));
  const orderUpdate = jest.fn();

  (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
    cb(makeTxClient(productUpdate, orderUpdate))
  );

  const res = await DELETE(makeRequest(), { params });

  expect(res.status).toBe(500);
  expect(orderUpdate).not.toHaveBeenCalled();
});

it('happy path: atomic increment used, order cancelled in the same transaction, no read-then-write', async () => {
  (prisma.order.findUnique as jest.Mock).mockResolvedValueOnce({
    id: 'order-1',
    status: 'PENDING',
    orderItems: [{ productId: 'p1', quantity: 4 }],
  });

  const productUpdate = jest.fn().mockResolvedValue({});
  const orderUpdate = jest.fn().mockResolvedValue({ id: 'order-1', orderNumber: 'ORD-1', status: 'CANCELLED' });
  (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
    cb(makeTxClient(productUpdate, orderUpdate))
  );

  const res = await DELETE(makeRequest(), { params });

  expect(res.status).toBe(200);
  expect(productUpdate).toHaveBeenCalledWith(
    expect.objectContaining({ data: { stockQuantity: { increment: 4 } } })
  );
  expect(prisma.$transaction).toHaveBeenCalledTimes(1);
});
