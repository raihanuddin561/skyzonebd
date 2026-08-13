/**
 * @jest-environment node
 */
// __tests__/orders/order-detail-amount-paid.test.ts
//
// The order detail page used to show a fabricated 60%/40% paid/due split
// for PARTIAL orders ("Placeholder - will be dynamic" in a code comment) —
// invented numbers presented to the customer as real. GET /api/orders/[id]
// now computes amountPaid/amountDue from the order's actual Payment records.

const mockPrismaClient: any = {
  order: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));
jest.mock('@/utils/profitReportGeneration', () => ({
  autoGenerateProfitReport: jest.fn().mockResolvedValue({ success: false }),
}));

import { GET } from '@/app/api/orders/[id]/route';

function req() {
  return { headers: { get: () => null } } as any;
}

function baseOrder(overrides: Record<string, any> = {}) {
  return {
    id: 'order-1',
    orderNumber: 'ORD-1',
    userId: null,
    guestName: null,
    guestEmail: null,
    guestPhone: null,
    orderItems: [],
    payments: [],
    user: null,
    shippingAddress: '123 St',
    billingAddress: '123 St',
    paymentMethod: 'bkash',
    paymentReference: null,
    paymentProofUrl: null,
    paymentVerifiedAt: null,
    paymentVerifiedBy: null,
    paymentNotes: null,
    notes: null,
    subtotal: 1000,
    shipping: 0,
    tax: 0,
    total: 1000,
    status: 'PENDING',
    paymentStatus: 'PARTIAL',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const params = Promise.resolve({ id: 'order-1' });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/orders/[id] — amountPaid/amountDue', () => {
  it('sums only PAID payment records toward amountPaid, ignoring pending/failed ones', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValueOnce(baseOrder({
      total: 1000,
      payments: [
        { amount: 400, status: 'PAID' },
        { amount: 200, status: 'PENDING' },
        { amount: 100, status: 'FAILED' },
      ],
    }));

    const res: any = await GET(req(), { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.amountPaid).toBe(400);
    expect(body.data.amountDue).toBe(600);
  });

  it('reports zero paid and full amount due when there are no successful payments yet', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValueOnce(baseOrder({ total: 500, payments: [] }));

    const res: any = await GET(req(), { params });
    const body = await res.json();

    expect(body.data.amountPaid).toBe(0);
    expect(body.data.amountDue).toBe(500);
  });

  it('sums multiple PAID payments and never reports a negative amountDue', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValueOnce(baseOrder({
      total: 300,
      payments: [
        { amount: 300, status: 'PAID' },
        { amount: 50, status: 'PAID' }, // e.g. an over-payment/tip
      ],
    }));

    const res: any = await GET(req(), { params });
    const body = await res.json();

    expect(body.data.amountPaid).toBe(350);
    expect(body.data.amountDue).toBe(0);
  });

  it('passes through the real payment-verification fields instead of omitting them', async () => {
    const verifiedAt = new Date('2026-01-15T10:00:00Z');
    mockPrismaClient.order.findUnique.mockResolvedValueOnce(baseOrder({
      paymentReference: 'TXN-12345',
      paymentProofUrl: 'https://example.com/proof.jpg',
      paymentVerifiedAt: verifiedAt,
      paymentVerifiedBy: 'admin-1',
      paymentNotes: 'Verified against bank statement',
    }));

    const res: any = await GET(req(), { params });
    const body = await res.json();

    expect(body.data.paymentReference).toBe('TXN-12345');
    expect(body.data.paymentProofUrl).toBe('https://example.com/proof.jpg');
    expect(body.data.paymentVerifiedAt).toBe(verifiedAt.toISOString());
    expect(body.data.paymentVerifiedBy).toBe('admin-1');
    expect(body.data.paymentNotes).toBe('Verified against bank statement');
  });
});
