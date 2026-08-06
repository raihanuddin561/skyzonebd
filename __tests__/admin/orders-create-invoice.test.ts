/**
 * @jest-environment node
 */
// __tests__/admin/orders-create-invoice.test.ts
//
// Amazon-style gap-closure Phase 2 part 3: POST /api/admin/orders/create
// creates a real Invoice and enforces the customer's credit limit for
// NET30/60/90 payment methods, mirroring the customer-facing checkout's
// wiring in orders/route.ts.

import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  product: { findUnique: jest.fn() },
  $transaction: jest.fn(),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { POST } from '@/app/api/admin/orders/create/route';

const product = {
  id: 'prod-1', name: 'Test Product', sku: 'SKU-1', reorderLevel: 5,
  wholesalePrice: 100, stockQuantity: 50, basePrice: 60, costPerUnit: 60, platformProfitPercentage: 15,
};

function req(body: any, token: string) {
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

const adminToken = () => sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);

function netTermsBody(customerId?: string) {
  return {
    customerId,
    items: [{ productId: 'prod-1', quantity: 2 }],
    shippingAddress: { line1: 'x' }, billingAddress: { line1: 'x' },
    paymentMethod: 'INVOICE_NET60',
  };
}

function txMock(overrides: any = {}) {
  const orderCreate = jest.fn().mockResolvedValue({
    id: 'o1', orderNumber: 'ORD-1', total: 200, userId: 'cust-1', status: 'PENDING', paymentStatus: 'PENDING',
    subtotal: 200, shipping: 0, tax: 0, createdAt: new Date(),
    orderItems: [{ id: 'oi-1', productId: 'prod-1', quantity: 2, price: 100, costPerUnit: 60, total: 200, product: { name: 'Test Product', imageUrl: null, sku: 'SKU-1' } }],
  });
  return {
    order: { create: orderCreate },
    product: { findUnique: jest.fn().mockResolvedValue({ stockQuantity: 50 }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    stockLot: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    stockAllocation: { create: jest.fn() },
    orderItem: { update: jest.fn().mockResolvedValue({}) },
    inventoryLog: { create: jest.fn().mockResolvedValue({}) },
    activityLog: { create: jest.fn().mockResolvedValue({}) },
    businessInfo: { findUnique: jest.fn().mockResolvedValue({ creditLimit: null }) },
    invoice: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.user.findUnique.mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
  mockPrismaClient.product.findUnique.mockResolvedValue(product);
});

it('rejects a NET-terms order with no customer selected', async () => {
  const res = await POST(req(netTermsBody(undefined), adminToken()));
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toMatch(/customer to be selected/i);
});

it('creates a real Invoice for a NET-terms order with a customer', async () => {
  mockPrismaClient.user.findUnique
    .mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true }) // requireAdmin
    .mockResolvedValueOnce({ id: 'cust-1', name: 'Acme Co', email: 'c@x.com', phone: null, discountPercent: 0, discountValidUntil: null }); // customer lookup
  const tx = txMock();
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) => cb(tx));

  const res = await POST(req(netTermsBody('cust-1'), adminToken()));

  expect(res.status).toBe(200);
  expect(tx.invoice.create).toHaveBeenCalledTimes(1);
  const invoiceData = tx.invoice.create.mock.calls[0][0].data;
  expect(invoiceData.customerId).toBe('cust-1');
  expect(invoiceData.paymentTerms).toBe('NET60');
});

it('rejects when the order would exceed the customer\'s credit limit', async () => {
  mockPrismaClient.user.findUnique
    .mockResolvedValueOnce({ id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true })
    .mockResolvedValueOnce({ id: 'cust-1', name: 'Acme Co', email: 'c@x.com', phone: null, discountPercent: 0, discountValidUntil: null });
  const tx = txMock({
    businessInfo: { findUnique: jest.fn().mockResolvedValue({ creditLimit: 50 }) },
    invoice: { findMany: jest.fn().mockResolvedValue([{ amount: 500, paidAmount: 0 }]), create: jest.fn() },
  });
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) => cb(tx));

  const res = await POST(req(netTermsBody('cust-1'), adminToken()));

  expect(res.status).toBe(400);
  expect(tx.invoice.create).not.toHaveBeenCalled();
});
