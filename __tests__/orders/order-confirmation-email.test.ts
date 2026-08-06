/**
 * @jest-environment node
 */
// __tests__/orders/order-confirmation-email.test.ts
// Verifies P3-4: order creation now sends a confirmation email via the
// already-built (but previously never called) emailService.sendOrderConfirmation.
// Covers guest checkout (email from guestInfo) and that a failed send is
// logged but does not fail the already-committed order.

const mockPrismaClient = {
  user: { findUnique: jest.fn() },
  product: { findUnique: jest.fn(), updateMany: jest.fn() },
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

const mockSendOrderConfirmation = jest.fn();
jest.mock('@/lib/email', () => ({
  emailService: { sendOrderConfirmation: (...args: any[]) => mockSendOrderConfirmation(...args) },
}));

import { POST } from '@/app/api/orders/route';

function req(body: any) {
  return {
    headers: { get: () => null }, // no Authorization header -> guest checkout
    json: async () => body,
  } as any;
}

const product = {
  id: 'prod-1',
  name: 'Test Product',
  wholesalePrice: 100,
  moq: 1,
  stockQuantity: 50,
  basePrice: 60,
  costPerUnit: 60,
  platformProfitPercentage: 15,
  wholesaleTiers: [],
};

const guestOrderBody = {
  items: [{ productId: 'prod-1', quantity: 2, price: 100 }],
  shippingAddress: { line1: 'x' },
  billingAddress: { line1: 'x' },
  paymentMethod: 'cash_on_delivery',
  guestInfo: { name: 'Guest Buyer', mobile: '017xxxxxxxx', email: 'guest@example.com' },
};

function makeOrder(overrides: any = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-123',
    userId: null,
    total: 200,
    subtotal: 200,
    shipping: 0,
    tax: 0,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    paymentMethod: 'cash_on_delivery',
    notes: null,
    shippingAddress: {},
    billingAddress: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    user: null,
    orderItems: [{ id: 'oi-1', productId: 'prod-1', quantity: 2, price: 100, costPerUnit: 60, total: 200, product: { name: 'Test Product' } }],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.product.findUnique.mockResolvedValue(product);
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) =>
    cb({
      order: { create: jest.fn().mockResolvedValue(makeOrder()) },
      product: { findUnique: jest.fn().mockResolvedValue({ stockQuantity: 50 }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      // No stock-lot history — depleteStockLotsForSale falls back to the
      // flat snapshotted cost (Amazon-style gap-closure Phase 1).
      stockLot: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
      stockAllocation: { create: jest.fn() },
      orderItem: { update: jest.fn().mockResolvedValue({}) },
      inventoryLog: { create: jest.fn().mockResolvedValue({}) },
    })
  );
});

it('sends an order-confirmation email to the guest email on successful guest checkout', async () => {
  mockSendOrderConfirmation.mockResolvedValueOnce({ success: true, messageId: 'm1' });

  const res = await POST(req(guestOrderBody));

  expect(res.status).toBe(201);
  expect(mockSendOrderConfirmation).toHaveBeenCalledWith(
    'guest@example.com',
    'ORD-123',
    200,
    expect.any(Array)
  );
});

it('does not attempt to send an email when no email is available (guest with no email given)', async () => {
  const bodyNoEmail = { ...guestOrderBody, guestInfo: { ...guestOrderBody.guestInfo, email: undefined } };

  const res = await POST(req(bodyNoEmail));

  expect(res.status).toBe(201);
  expect(mockSendOrderConfirmation).not.toHaveBeenCalled();
});

it('a failed email send is logged but does not fail the already-created order', async () => {
  mockSendOrderConfirmation.mockResolvedValueOnce({ success: false, error: 'provider down' });

  const res = await POST(req(guestOrderBody));

  expect(res.status).toBe(201);
  const body = await res.json();
  expect(body.success).toBe(true);
});
