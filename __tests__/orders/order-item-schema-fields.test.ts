/**
 * @jest-environment node
 */
// __tests__/orders/order-item-schema-fields.test.ts
//
// CRITICAL, pre-existing bug found during Amazon-style gap-closure Phase 2
// part 3's live end-to-end verification (not caught by any existing test,
// since they all mock Prisma and never validate against the real schema):
// POST /api/orders passed `originalPrice`/`discountApplied`/`finalPrice`
// into OrderItem.create — three fields that have NEVER existed on the
// OrderItem model in this repo's history (confirmed via `git log -p` on
// prisma/schema.prisma). Every real checkout attempt failed with
// "Unknown argument `originalPrice`" and a 500. This locks the fix in by
// asserting the exact create-data shape sent to Prisma, so a future
// change can't silently reintroduce a field that doesn't exist on the
// model.

const mockPrismaClient: any = {
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
  stockQuantity: 50, basePrice: 60, costPerUnit: 60, platformProfitPercentage: 15,
  wholesaleTiers: [],
};

function req(body: any) {
  return { headers: { get: () => null }, json: async () => body } as any;
}

const orderBody = {
  items: [{ productId: 'prod-1', quantity: 2, price: 100 }],
  shippingAddress: 'x', billingAddress: 'x',
  paymentMethod: 'cash_on_delivery',
  guestInfo: { name: 'Guest', mobile: '017xxxxxxxx' },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.product.findUnique.mockResolvedValue(product);
});

it('never sends originalPrice/discountApplied/finalPrice to OrderItem.create (those fields do not exist on the model)', async () => {
  const orderCreate = jest.fn().mockResolvedValue({
    id: 'o1', orderNumber: 'ORD-1', total: 200, user: null, status: 'PENDING', paymentStatus: 'PENDING',
    shippingAddress: 'x', billingAddress: 'x', paymentMethod: 'cash_on_delivery', notes: null,
    subtotal: 200, shipping: 0, tax: 0, createdAt: new Date(), updatedAt: new Date(),
    orderItems: [{ id: 'oi-1', productId: 'prod-1', quantity: 2, price: 100, costPerUnit: 60, total: 200, product: { name: 'Test Product' } }],
  });
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) =>
    cb({
      order: { create: orderCreate },
      product: { findUnique: jest.fn().mockResolvedValue({ stockQuantity: 50 }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      stockLot: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      stockAllocation: { create: jest.fn() },
      orderItem: { update: jest.fn().mockResolvedValue({}) },
      inventoryLog: { create: jest.fn().mockResolvedValue({}) },
    })
  );

  const res = await POST(req(orderBody));

  expect(res.status).toBe(201);
  const createArg = orderCreate.mock.calls[0][0];
  const itemData = createArg.data.orderItems.create[0];
  expect(itemData).not.toHaveProperty('originalPrice');
  expect(itemData).not.toHaveProperty('discountApplied');
  expect(itemData).not.toHaveProperty('finalPrice');
  // Fields that DO exist on OrderItem and should still be sent:
  expect(itemData).toMatchObject({
    productId: 'prod-1', quantity: 2, price: 100, total: 200,
    costPerUnit: 60,
  });
});
