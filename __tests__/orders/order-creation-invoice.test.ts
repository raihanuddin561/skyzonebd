/**
 * @jest-environment node
 */
// __tests__/orders/order-creation-invoice.test.ts
//
// Amazon-style gap-closure Phase 2 part 3: POST /api/orders creates a real
// Invoice and enforces the customer's credit limit for NET30/60/90
// payment methods — applies only to those, not prepaid/cash orders, and
// requires a registered account (no BusinessInfo/credit history exists
// for a guest).

import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

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

function req(body: any, token?: string) {
  return {
    headers: { get: (n: string) => (token && n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

function netTermsBody() {
  return {
    items: [{ productId: 'prod-1', quantity: 2, price: 100 }],
    shippingAddress: { line1: 'x' }, billingAddress: { line1: 'x' },
    paymentMethod: 'INVOICE_NET30',
  };
}

function txMock(overrides: any = {}) {
  const orderCreate = jest.fn().mockResolvedValue({
    id: 'o1', orderNumber: 'ORD-1', total: 200, user: null, status: 'PENDING', paymentStatus: 'PENDING',
    shippingAddress: {}, billingAddress: {}, paymentMethod: 'INVOICE_NET30', notes: null,
    subtotal: 200, shipping: 0, tax: 0, createdAt: new Date(), updatedAt: new Date(),
    orderItems: [{ id: 'oi-1', productId: 'prod-1', quantity: 2, price: 100, costPerUnit: 60, total: 200, product: { name: 'Test Product' } }],
  });
  return {
    order: { create: orderCreate },
    product: { findUnique: jest.fn().mockResolvedValue({ stockQuantity: 50 }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    stockLot: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    stockAllocation: { create: jest.fn() },
    orderItem: { update: jest.fn().mockResolvedValue({}) },
    inventoryLog: { create: jest.fn().mockResolvedValue({}) },
    businessInfo: { findUnique: jest.fn().mockResolvedValue({ creditLimit: null }) },
    invoice: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.product.findUnique.mockResolvedValue(product);
});

it('rejects a NET-terms order from a guest (no account to check credit history against)', async () => {
  // guestInfo satisfies the earlier "guest checkout requires name/mobile"
  // check so the request reaches the NET-terms-requires-an-account guard.
  const body = { ...netTermsBody(), guestInfo: { name: 'Guest', mobile: '017xxxxxxxx' } };
  const res = await POST(req(body)); // no token -> guest
  expect(res.status).toBe(400);
  const responseBody = await res.json();
  expect(responseBody.error).toMatch(/registered account/i);
});

it('creates a real Invoice for a NET-terms order from a logged-in customer', async () => {
  const token = sign({ userId: 'user-1', role: 'BUYER' }, JWT_SECRET);
  const tx = txMock();
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) => cb(tx));
  mockPrismaClient.user.findUnique.mockResolvedValue({ discountPercent: 0, discountValidUntil: null, discountReason: null });

  const res = await POST(req(netTermsBody(), token));

  expect(res.status).toBe(201);
  expect(tx.invoice.create).toHaveBeenCalledTimes(1);
  const invoiceData = tx.invoice.create.mock.calls[0][0].data;
  expect(invoiceData.customerId).toBe('user-1');
  expect(invoiceData.paymentTerms).toBe('NET30');
  expect(invoiceData.amount).toBe(200); // order total
});

it('rejects the order when it would exceed the customer\'s credit limit', async () => {
  const token = sign({ userId: 'user-1', role: 'BUYER' }, JWT_SECRET);
  const tx = txMock({
    businessInfo: { findUnique: jest.fn().mockResolvedValue({ creditLimit: 100 }) },
    invoice: { findMany: jest.fn().mockResolvedValue([{ amount: 500, paidAmount: 0 }]), create: jest.fn() },
  });
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) => cb(tx));
  mockPrismaClient.user.findUnique.mockResolvedValue({ discountPercent: 0, discountValidUntil: null, discountReason: null });

  const res = await POST(req(netTermsBody(), token));

  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toMatch(/credit limit/i);
  expect(tx.invoice.create).not.toHaveBeenCalled();
});

it('does not touch Invoice/BusinessInfo at all for a non-NET payment method', async () => {
  const tx = txMock();
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) => cb(tx));

  const res = await POST(req({
    items: [{ productId: 'prod-1', quantity: 2, price: 100 }],
    shippingAddress: { line1: 'x' }, billingAddress: { line1: 'x' },
    paymentMethod: 'cash_on_delivery',
    guestInfo: { name: 'Guest', mobile: '017xxxxxxxx' },
  }));

  expect(res.status).toBe(201);
  expect(tx.invoice.create).not.toHaveBeenCalled();
  expect(tx.businessInfo.findUnique).not.toHaveBeenCalled();
});
