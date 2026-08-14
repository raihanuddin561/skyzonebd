/**
 * @jest-environment node
 */
// __tests__/returns/return-refund.test.ts
// Amazon-Style Wholesale Platform Gap Closure — Phase 4 part 5.
// Verifies POST /api/admin/returns/[id]/refund: only from APPROVED (a
// distinct second step from approval — ADR-016); creates the negative-
// Payment-row reversal; posts the full ledger reversal pair (fixing the
// dead processRefund()'s defect of only logging a cash-out, never
// reversing revenue/COGS); and sets Order.paymentStatus REFUNDED only once
// every item on the order has been returned+refunded.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  // updateMany is the actual concurrency guard (conditional on
  // status='APPROVED'); update is only used afterward, to set
  // paymentReference. Defaults to count:1 (guard passes) — tests that need
  // to simulate a lost race can override with mockResolvedValueOnce({count:0}).
  return: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  payment: { create: jest.fn() },
  financialLedger: { create: jest.fn().mockResolvedValue({ id: 'ledger-entry' }) },
  returnItem: { findMany: jest.fn().mockResolvedValue([]) },
  order: { update: jest.fn() },
  $transaction: jest.fn((cb: any) => cb(mockPrismaClient)),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const sendReturnStatusUpdate = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/email', () => ({
  emailService: { sendReturnStatusUpdate: (...args: any[]) => sendReturnStatusUpdate(...args) },
}));

import { POST } from '@/app/api/admin/returns/[id]/refund/route';

class MockHeaders {
  private headers: Map<string, string>;
  constructor(init?: Record<string, string>) { this.headers = new Map(Object.entries(init || {})); }
  get(name: string): string | null { return this.headers.get(name.toLowerCase()) || null; }
}

class MockNextRequest {
  public headers: MockHeaders;
  private body: any;
  constructor(options?: { headers?: Record<string, string>; body?: any }) {
    const normalized: Record<string, string> = {};
    Object.entries(options?.headers || {}).forEach(([k, v]) => { normalized[k.toLowerCase()] = v; });
    this.headers = new MockHeaders(normalized);
    this.body = options?.body;
  }
  async json() { return this.body ?? {}; }
}

function tokenFor(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET);
}

function mockAdmin(id: string) {
  mockPrismaClient.user.findUnique.mockResolvedValueOnce({
    id, email: `${id}@example.com`, name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
}

function req(adminId: string, body: any = {}) {
  return new MockNextRequest({ headers: { Authorization: `Bearer ${tokenFor(adminId)}` }, body }) as any;
}

const params = (id: string) => Promise.resolve({ id });

function existingReturn(overrides: any = {}) {
  return {
    id: 'ret-1',
    returnNumber: 'RET-000001',
    orderId: 'order-1',
    status: 'APPROVED',
    refundAmount: 200,
    order: {
      id: 'order-1', orderNumber: 'ORD-001', userId: 'buyer-1', guestName: null, paymentMethod: 'BANK_TRANSFER',
      orderItems: [{ id: 'oi-1', quantity: 5 }],
    },
    user: { id: 'buyer-1', name: 'Customer', email: 'customer@example.com' },
    items: [
      { orderItemId: 'oi-1', quantity: 2, refundAmount: 200, orderItem: { id: 'oi-1', quantity: 5, costPerUnit: 60 } },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.$transaction.mockImplementation((cb: any) => cb(mockPrismaClient));
  mockPrismaClient.returnItem.findMany.mockResolvedValue([]);
  mockPrismaClient.return.updateMany.mockResolvedValue({ count: 1 });
});

it('rejects an unauthenticated request (401)', async () => {
  const request = new MockNextRequest({}) as any;
  const res = await POST(request, { params: params('ret-1') });
  expect(res.status).toBe(401);
});

it('rejects refunding a return that is not APPROVED (400)', async () => {
  mockAdmin('admin-1');
  mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn({ status: 'REQUESTED' }));
  const res = await POST(req('admin-1'), { params: params('ret-1') });
  expect(res.status).toBe(400);
});

it('404s for an unknown return', async () => {
  mockAdmin('admin-1');
  mockPrismaClient.return.findUnique.mockResolvedValueOnce(null);
  const res = await POST(req('admin-1'), { params: params('ret-1') });
  expect(res.status).toBe(404);
});

it('creates a negative Payment row for the refund amount', async () => {
  mockAdmin('admin-1');
  mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn());
  mockPrismaClient.payment.create.mockResolvedValueOnce({ id: 'pay-1' });
  mockPrismaClient.return.update.mockResolvedValueOnce({ id: 'ret-1', status: 'REFUNDED' });

  const res = await POST(req('admin-1'), { params: params('ret-1') });
  expect(res.status).toBe(200);

  expect(mockPrismaClient.payment.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ orderId: 'order-1', amount: -200, status: 'REFUNDED' }),
    })
  );
});

it('posts the full ledger reversal pair: DEBIT/REVENUE for the cash refunded, CREDIT/COGS for the returned items\' cost', async () => {
  mockAdmin('admin-1');
  mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn());
  mockPrismaClient.payment.create.mockResolvedValueOnce({ id: 'pay-1' });
  mockPrismaClient.return.update.mockResolvedValueOnce({ id: 'ret-1', status: 'REFUNDED' });

  await POST(req('admin-1'), { params: params('ret-1') });

  // returnedCOGS = costPerUnit (60) * returned quantity (2) = 120
  const revenueCall = mockPrismaClient.financialLedger.create.mock.calls.find(
    (c: any) => c[0].data.direction === 'DEBIT' && c[0].data.sourceType === 'REFUND'
  );
  const cogsCall = mockPrismaClient.financialLedger.create.mock.calls.find(
    (c: any) => c[0].data.direction === 'CREDIT' && c[0].data.sourceType === 'RETURN'
  );
  expect(revenueCall[0].data).toEqual(expect.objectContaining({ amount: 200, category: 'REVENUE' }));
  expect(cogsCall[0].data).toEqual(expect.objectContaining({ amount: 120, category: 'COGS' }));
});

it('marks the Return REFUNDED with refundedBy/refundedAt/paymentReference', async () => {
  mockAdmin('admin-1');
  mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn());
  mockPrismaClient.payment.create.mockResolvedValueOnce({ id: 'pay-1' });
  mockPrismaClient.return.update.mockResolvedValueOnce({ id: 'ret-1', status: 'REFUNDED' });

  await POST(req('admin-1', { paymentReference: 'REF-XYZ' }), { params: params('ret-1') });

  // status/refundedBy/refundedAt are set by the conditional updateMany
  // guard (WHERE status='APPROVED'); paymentReference is set afterward by
  // a plain update, since it depends on the just-created Payment's id.
  expect(mockPrismaClient.return.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: 'ret-1', status: 'APPROVED' },
      data: expect.objectContaining({ status: 'REFUNDED', refundedBy: 'admin-1' }),
    })
  );
  expect(mockPrismaClient.return.update).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ paymentReference: 'REF-XYZ' }),
    })
  );
});

it('does NOT set Order.paymentStatus to REFUNDED when only part of the order has been refunded', async () => {
  mockAdmin('admin-1');
  // Order has 5 units on oi-1; this return only refunds 2 of them.
  mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn());
  mockPrismaClient.payment.create.mockResolvedValueOnce({ id: 'pay-1' });
  mockPrismaClient.return.update.mockResolvedValueOnce({ id: 'ret-1', status: 'REFUNDED' });
  // getAllRefundedQuantities query, called AFTER this return's own status
  // update — reflects only 2 units refunded (this is the only REFUNDED
  // return item at query time in this scenario).
  mockPrismaClient.returnItem.findMany.mockResolvedValueOnce([{ orderItemId: 'oi-1', quantity: 2 }]);

  await POST(req('admin-1'), { params: params('ret-1') });

  expect(mockPrismaClient.order.update).not.toHaveBeenCalled();
});

it('sets Order.paymentStatus to REFUNDED once every item on the order has been returned+refunded', async () => {
  mockAdmin('admin-1');
  mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn());
  mockPrismaClient.payment.create.mockResolvedValueOnce({ id: 'pay-1' });
  mockPrismaClient.return.update.mockResolvedValueOnce({ id: 'ret-1', status: 'REFUNDED' });
  // All 5 units of oi-1 are now refunded across all returns for this order.
  mockPrismaClient.returnItem.findMany.mockResolvedValueOnce([{ orderItemId: 'oi-1', quantity: 5 }]);

  await POST(req('admin-1'), { params: params('ret-1') });

  expect(mockPrismaClient.order.update).toHaveBeenCalledWith({
    where: { id: 'order-1' },
    data: { paymentStatus: 'REFUNDED' },
  });
});

it('never touches Order.status — Return.status is its own independent state machine', async () => {
  mockAdmin('admin-1');
  mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn());
  mockPrismaClient.payment.create.mockResolvedValueOnce({ id: 'pay-1' });
  mockPrismaClient.return.update.mockResolvedValueOnce({ id: 'ret-1', status: 'REFUNDED' });
  mockPrismaClient.returnItem.findMany.mockResolvedValueOnce([{ orderItemId: 'oi-1', quantity: 5 }]);

  await POST(req('admin-1'), { params: params('ret-1') });

  if (mockPrismaClient.order.update.mock.calls.length > 0) {
    expect(mockPrismaClient.order.update.mock.calls[0][0].data.status).toBeUndefined();
  }
});

it('returns 409 instead of double-refunding when a concurrent request already flipped the status (updateMany count=0)', async () => {
  mockAdmin('admin-1');
  mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn());
  // Simulates a second request losing the race: the conditional updateMany
  // guard (WHERE status='APPROVED') matches zero rows because a concurrent
  // request already flipped it to REFUNDED first.
  mockPrismaClient.return.updateMany.mockResolvedValueOnce({ count: 0 });

  const res = await POST(req('admin-1'), { params: params('ret-1') });

  expect(res.status).toBe(409);
  expect(mockPrismaClient.payment.create).not.toHaveBeenCalled();
  expect(mockPrismaClient.financialLedger.create).not.toHaveBeenCalled();
});

it('sends a best-effort REFUNDED notification email with the refund amount', async () => {
  mockAdmin('admin-1');
  mockPrismaClient.return.findUnique.mockResolvedValueOnce(existingReturn());
  mockPrismaClient.payment.create.mockResolvedValueOnce({ id: 'pay-1' });
  mockPrismaClient.return.update.mockResolvedValueOnce({ id: 'ret-1', status: 'REFUNDED' });

  await POST(req('admin-1'), { params: params('ret-1') });

  expect(sendReturnStatusUpdate).toHaveBeenCalledWith('customer@example.com', 'RET-000001', 'REFUNDED', { refundAmount: 200 });
});
