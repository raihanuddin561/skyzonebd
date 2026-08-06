/**
 * @jest-environment node
 */
// __tests__/orders/order-status-update-email.test.ts
//
// Amazon-style gap-closure Phase 4 part 1: no shipped/delivered
// notification email existed at all — a customer had no way to learn
// their order shipped or arrived except by manually checking the order
// page. Both PATCH /api/orders (bulk) and PATCH /api/orders/[id] (single)
// now fire one, using the same transition-detection idiom already proven
// for autoGenerateProfitReport.

const mockPrismaClient: any = {
  order: { findUnique: jest.fn(), update: jest.fn() },
  user: { findUnique: jest.fn() },
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

jest.mock('@/lib/activityLogger', () => ({ logActivity: jest.fn().mockResolvedValue(undefined) }));

const mockRequireAdmin = jest.fn();
jest.mock('@/lib/auth', () => ({
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
  getJwtSecret: () => 'test-secret',
}));

const sendOrderStatusUpdate = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/email', () => ({
  emailService: { sendOrderStatusUpdate: (...args: any[]) => sendOrderStatusUpdate(...args) },
}));

import { PATCH } from '@/app/api/orders/[id]/route';

function req(body: any) {
  return { json: async () => body } as any;
}

const params = Promise.resolve({ id: 'order-1' });

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireAdmin.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
});

it('sends a SHIPPED email to a registered user on the PENDING -> SHIPPED transition', async () => {
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({ id: 'order-1', status: 'PENDING' });
  mockPrismaClient.order.update.mockResolvedValueOnce({
    id: 'order-1', orderNumber: 'ORD-1', status: 'SHIPPED', paymentStatus: 'PAID', updatedAt: new Date(),
    orderItems: [], guestEmail: null, user: { email: 'buyer@example.com' },
  });

  const res = await PATCH(req({ status: 'shipped' }), { params });

  expect(res.status).toBe(200);
  expect(sendOrderStatusUpdate).toHaveBeenCalledWith('buyer@example.com', 'ORD-1', 'SHIPPED');
});

it('sends a DELIVERED email to a guest via guestEmail when there is no linked user', async () => {
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({ id: 'order-1', status: 'SHIPPED' });
  mockPrismaClient.order.update.mockResolvedValueOnce({
    id: 'order-1', orderNumber: 'ORD-2', status: 'DELIVERED', paymentStatus: 'PAID', updatedAt: new Date(),
    orderItems: [], guestEmail: 'guest@example.com', user: null,
  });

  const res = await PATCH(req({ status: 'delivered' }), { params });

  expect(res.status).toBe(200);
  expect(sendOrderStatusUpdate).toHaveBeenCalledWith('guest@example.com', 'ORD-2', 'DELIVERED');
});

it('does not send an email for a non-shipped/delivered status change', async () => {
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({ id: 'order-1', status: 'PENDING' });
  mockPrismaClient.order.update.mockResolvedValueOnce({
    id: 'order-1', orderNumber: 'ORD-3', status: 'PROCESSING', paymentStatus: 'PAID', updatedAt: new Date(),
    orderItems: [], guestEmail: 'guest@example.com', user: null,
  });

  await PATCH(req({ status: 'processing' }), { params });

  expect(sendOrderStatusUpdate).not.toHaveBeenCalled();
});

it('does not re-send when the order was already SHIPPED (idempotent repeat PATCH)', async () => {
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({ id: 'order-1', status: 'SHIPPED' });
  mockPrismaClient.order.update.mockResolvedValueOnce({
    id: 'order-1', orderNumber: 'ORD-4', status: 'SHIPPED', paymentStatus: 'PAID', updatedAt: new Date(),
    orderItems: [], guestEmail: 'guest@example.com', user: null,
  });

  await PATCH(req({ status: 'shipped', notes: 'no-op update' }), { params });

  expect(sendOrderStatusUpdate).not.toHaveBeenCalled();
});

it('does not send when there is no email available at all', async () => {
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({ id: 'order-1', status: 'PENDING' });
  mockPrismaClient.order.update.mockResolvedValueOnce({
    id: 'order-1', orderNumber: 'ORD-5', status: 'SHIPPED', paymentStatus: 'PAID', updatedAt: new Date(),
    orderItems: [], guestEmail: null, user: null,
  });

  const res = await PATCH(req({ status: 'shipped' }), { params });

  expect(res.status).toBe(200);
  expect(sendOrderStatusUpdate).not.toHaveBeenCalled();
});
