/**
 * @jest-environment node
 */
// __tests__/admin/orders-verify-payment-creates-payment.test.ts
//
// PATCH /api/admin/orders/[id]/verify-payment used to only flip
// Order.paymentStatus when an admin verified a manual payment (bKash/bank
// transfer) — no Payment row was ever created. GET /api/orders/[id]'s
// amountPaid/amountDue (computed by summing real Payment rows, fixed
// earlier this session) then always showed ৳0 paid for a normally-verified
// order, even though the money had genuinely been received and confirmed.
// This does NOT post a FinancialLedger revenue entry (that happens once, at
// the DELIVERED transition) — only the Payment row itself, to avoid
// double-counting revenue.

import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  order: { findUnique: jest.fn(), update: jest.fn() },
  payment: { create: jest.fn() },
  $disconnect: jest.fn().mockResolvedValue(undefined),
};
mockPrismaClient.$transaction = jest.fn((fn: any) => fn(mockPrismaClient));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

jest.mock('@/lib/activityLogger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

import { PATCH } from '@/app/api/admin/orders/[id]/verify-payment/route';

function req(body: any, token?: string) {
  return {
    headers: { get: (n: string) => (token && n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

const adminToken = () => sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
const params = Promise.resolve({ id: 'order-1' });

function baseOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-1',
    total: 1500,
    status: 'PENDING',
    paymentStatus: 'PENDING_VERIFICATION',
    paymentMethod: 'bkash',
    paymentReference: 'TXN-987',
    orderItems: [],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.user.findUnique.mockResolvedValue({
    id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN',
  });
});

describe('PATCH /api/admin/orders/[id]/verify-payment', () => {
  it('creates a real Payment row for the full order total when verified as PAID', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValue(baseOrder());
    mockPrismaClient.order.update.mockResolvedValue(baseOrder({ paymentStatus: 'PAID', status: 'CONFIRMED' }));

    const res: any = await PATCH(req({ status: 'PAID', note: 'Confirmed via bKash statement' }, adminToken()), { params });

    expect(res.status).toBe(200);
    expect(mockPrismaClient.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-1',
        amount: 1500,
        method: 'BKASH',
        status: 'PAID',
        transactionId: 'TXN-987',
        receivedBy: 'admin-1',
      }),
    });
  });

  it('does not create a Payment row when the payment is rejected as FAILED', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValue(baseOrder());
    mockPrismaClient.order.update.mockResolvedValue(baseOrder({ paymentStatus: 'FAILED' }));

    await PATCH(req({ status: 'FAILED', note: 'No matching transaction found' }, adminToken()), { params });

    expect(mockPrismaClient.payment.create).not.toHaveBeenCalled();
  });

  it('falls back to BANK_TRANSFER for a payment method with no matching PaymentMethod enum value', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValue(baseOrder({ paymentMethod: 'cash_on_delivery' }));
    mockPrismaClient.order.update.mockResolvedValue(baseOrder({ paymentStatus: 'PAID' }));

    await PATCH(req({ status: 'PAID' }, adminToken()), { params });

    expect(mockPrismaClient.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ method: 'BANK_TRANSFER' }),
    });
  });
});
