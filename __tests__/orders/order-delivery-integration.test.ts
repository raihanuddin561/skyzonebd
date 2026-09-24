/**
 * @jest-environment node
 */
// __tests__/orders/order-delivery-integration.test.ts
// P2-7's AC calls for integration tests covering order creation,
// cancellation, and delivery. Creation (order-creation.test.ts) and
// cancellation (cancel-transaction.test.ts, delete-cancel-transaction.test.ts)
// already existed; this closes the "delivery" gap — verifies
// PATCH /api/orders/[id] triggers autoGenerateProfitReport exactly when an
// order transitions INTO DELIVERED (not on other status changes, and not
// when it was already DELIVERED), end-to-end through the real route.

const mockPrismaClient: any = {
  order: { findUnique: jest.fn(), update: jest.fn() },
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $transaction: jest.fn((cb: any) => cb(mockPrismaClient)),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const mockRequireAdmin = jest.fn();
jest.mock('@/lib/auth', () => ({
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}));

const mockAutoGenerateProfitReport = jest.fn();
jest.mock('@/utils/profitReportGeneration', () => ({
  autoGenerateProfitReport: (...args: any[]) => mockAutoGenerateProfitReport(...args),
}));

import { PATCH } from '@/app/api/orders/[id]/route';

function req(body: any) {
  return { json: async () => body } as any;
}

const params = Promise.resolve({ id: 'order-1' });

beforeEach(() => {
  jest.resetAllMocks();
  mockRequireAdmin.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
  // resetAllMocks wipes the $transaction implementation set at module load
  // (not just its call history) — re-establish it every test.
  mockPrismaClient.$transaction.mockImplementation((cb: any) => cb(mockPrismaClient));
});

it('triggers autoGenerateProfitReport when an order transitions into DELIVERED', async () => {
  // paymentStatus: PAID satisfies the delivery-payment gate (P0/Bug1) —
  // this test is about the profit-report side effect, not payment
  // verification.
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({ id: 'order-1', status: 'SHIPPED', paymentMethod: 'bkash', paymentStatus: 'PAID' });
  mockPrismaClient.order.update.mockResolvedValueOnce({
    id: 'order-1', orderNumber: 'ORD-1', status: 'DELIVERED', paymentStatus: 'PAID', updatedAt: new Date(), orderItems: [],
  });
  mockAutoGenerateProfitReport.mockResolvedValueOnce({ success: true, message: 'ok', reportId: 'r1' });

  const res = await PATCH(req({ status: 'delivered' }), { params });

  expect(res.status).toBe(200);
  expect(mockAutoGenerateProfitReport).toHaveBeenCalledWith('order-1');
});

it('does not trigger a profit report for a non-delivery status change', async () => {
  // PROCESSING (not PENDING) — PENDING -> SHIPPED isn't itself a legal
  // transition under ALLOWED_ORDER_STATUS_TRANSITIONS, and this test is
  // about the profit-report side effect, not transition validation.
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({ id: 'order-1', status: 'PROCESSING' });
  mockPrismaClient.order.update.mockResolvedValueOnce({
    id: 'order-1', orderNumber: 'ORD-1', status: 'SHIPPED', paymentStatus: 'PAID', updatedAt: new Date(), orderItems: [],
  });

  const res = await PATCH(req({ status: 'shipped' }), { params });

  expect(res.status).toBe(200);
  expect(mockAutoGenerateProfitReport).not.toHaveBeenCalled();
});

it('does not re-trigger a profit report for an order that was already DELIVERED', async () => {
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({ id: 'order-1', status: 'DELIVERED' });
  mockPrismaClient.order.update.mockResolvedValueOnce({
    id: 'order-1', orderNumber: 'ORD-1', status: 'DELIVERED', paymentStatus: 'PAID', updatedAt: new Date(), orderItems: [],
  });

  // e.g. an admin only changing paymentStatus/notes on an already-delivered order
  const res = await PATCH(req({ status: 'delivered', notes: 'updated notes' }), { params });

  expect(res.status).toBe(200);
  expect(mockAutoGenerateProfitReport).not.toHaveBeenCalled();
});

it('P0/Bug1: blocks the transition to DELIVERED for a bKash order whose payment was never verified', async () => {
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({
    id: 'order-1', status: 'SHIPPED', paymentMethod: 'bkash', paymentStatus: 'PENDING_VERIFICATION',
  });

  const res = await PATCH(req({ status: 'delivered' }), { params });

  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toMatch(/payment has not been verified/i);
  expect(mockPrismaClient.order.update).not.toHaveBeenCalled();
  expect(mockAutoGenerateProfitReport).not.toHaveBeenCalled();
});

it('P0/Bug1: allows DELIVERED for a NET-terms invoice order with no payment check at all', async () => {
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({
    id: 'order-1', status: 'SHIPPED', paymentMethod: 'INVOICE_NET30', paymentStatus: 'PENDING',
  });
  mockPrismaClient.order.update.mockResolvedValueOnce({
    id: 'order-1', orderNumber: 'ORD-1', status: 'DELIVERED', paymentStatus: 'PENDING', updatedAt: new Date(), orderItems: [],
  });
  mockAutoGenerateProfitReport.mockResolvedValueOnce({ success: true, message: 'ok', reportId: 'r1' });

  const res = await PATCH(req({ status: 'delivered' }), { params });

  expect(res.status).toBe(200);
  expect(mockAutoGenerateProfitReport).toHaveBeenCalledWith('order-1');
  // paymentStatus was never touched for a NET-terms order.
  expect(mockPrismaClient.order.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.not.objectContaining({ paymentStatus: expect.anything() }) })
  );
});

it('P0/Bug1: a COD order transitioning to DELIVERED is automatically marked PAID in the same update', async () => {
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({
    id: 'order-1', status: 'SHIPPED', paymentMethod: 'cash_on_delivery', paymentStatus: 'PENDING',
  });
  mockPrismaClient.order.update.mockResolvedValueOnce({
    id: 'order-1', orderNumber: 'ORD-1', status: 'DELIVERED', paymentStatus: 'PAID', updatedAt: new Date(), orderItems: [],
  });
  mockAutoGenerateProfitReport.mockResolvedValueOnce({ success: true, message: 'ok', reportId: 'r1' });

  const res = await PATCH(req({ status: 'delivered' }), { params });

  expect(res.status).toBe(200);
  expect(mockPrismaClient.order.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ status: 'DELIVERED', paymentStatus: 'PAID' }) })
  );
});

it("a failed profit-report generation does not fail the order-status update itself", async () => {
  // paymentStatus: PAID satisfies the delivery-payment gate (P0/Bug1).
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({ id: 'order-1', status: 'SHIPPED', paymentMethod: 'bkash', paymentStatus: 'PAID' });
  mockPrismaClient.order.update.mockResolvedValueOnce({
    id: 'order-1', orderNumber: 'ORD-1', status: 'DELIVERED', paymentStatus: 'PAID', updatedAt: new Date(), orderItems: [],
  });
  mockAutoGenerateProfitReport.mockResolvedValueOnce({ success: false, message: 'boom' });

  const res = await PATCH(req({ status: 'delivered' }), { params });

  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
});
