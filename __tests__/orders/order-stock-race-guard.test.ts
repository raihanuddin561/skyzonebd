/**
 * @jest-environment node
 */
// __tests__/orders/order-stock-race-guard.test.ts
//
// Production Readiness Audit (2026-07-18) confirmed a P1: order creation
// (POST /api/orders) decremented Product.stockQuantity via an unguarded
// `update` inside its transaction. The stock-sufficiency check reads stock
// before the transaction opens — two concurrent checkouts for the last few
// units of a product could both pass that check and both reach the
// decrement, taking stock negative (Prisma's atomic `decrement` keeps the
// arithmetic correct but doesn't stop it crossing zero). Fixed by guarding
// the update's `where` with `stockQuantity: { gte: quantity }` (as
// `updateMany`) and throwing inside the transaction — which rolls
// everything back — if the affected row count is 0, i.e. a concurrent
// request already consumed the stock.

const mockPrismaClient = {
  product: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  $transaction: jest.fn(),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));
jest.mock('@/lib/activityLogger', () => ({ logActivity: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/email', () => ({ emailService: { sendOrderConfirmation: jest.fn().mockResolvedValue({ success: true }) } }));

import { POST } from '@/app/api/orders/route';

const product = {
  id: 'prod-1', name: 'Test Product', wholesalePrice: 100, moq: 1,
  stockQuantity: 5, basePrice: 60, costPerUnit: 60, platformProfitPercentage: 15,
  wholesaleTiers: [],
};

const orderBody = {
  items: [{ productId: 'prod-1', quantity: 2, price: 100 }],
  shippingAddress: { line1: 'x' }, billingAddress: { line1: 'x' },
  paymentMethod: 'cash_on_delivery',
  guestInfo: { name: 'Guest', mobile: '017xxxxxxxx' },
};

function req() {
  return { headers: { get: () => null }, json: async () => orderBody } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.product.findUnique.mockResolvedValue(product);
});

it('rolls back the whole order when a concurrent request already consumed the stock (guarded updateMany returns count 0)', async () => {
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) =>
    cb({
      order: { create: jest.fn().mockResolvedValue({ id: 'o1', orderItems: [], user: null }) },
      product: { findUnique: jest.fn().mockResolvedValue({ stockQuantity: 2 }), updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    })
  );

  const res = await POST(req());
  expect(res.status).toBe(500);
});

it('succeeds when the guarded updateMany reports the row was actually decremented (count 1)', async () => {
  const orderCreate = jest.fn().mockResolvedValue({
    id: 'o1', orderNumber: 'ORD-1', total: 200, user: null, status: 'PENDING', paymentStatus: 'PENDING',
    shippingAddress: {}, billingAddress: {}, paymentMethod: 'cash_on_delivery', notes: null,
    subtotal: 200, shipping: 0, tax: 0, createdAt: new Date(), updatedAt: new Date(),
    orderItems: [{ id: 'oi-1', productId: 'prod-1', quantity: 2, price: 100, costPerUnit: 60, total: 200, product: { name: 'Test Product' } }],
  });
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) =>
    cb({
      order: { create: orderCreate },
      product: { findUnique: jest.fn().mockResolvedValue({ stockQuantity: 5 }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      // No stock-lot history for this product — depleteStockLotsForSale
      // falls back to the flat snapshotted cost already on the order item.
      stockLot: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      stockAllocation: { create: jest.fn() },
      orderItem: { update: jest.fn().mockResolvedValue({}) },
      inventoryLog: { create: jest.fn().mockResolvedValue({}) },
    })
  );

  const res = await POST(req());
  expect(res.status).toBe(201);
});
