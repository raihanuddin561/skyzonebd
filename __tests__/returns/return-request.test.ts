/**
 * @jest-environment node
 */
// __tests__/returns/return-request.test.ts
// Amazon-Style Wholesale Platform Gap Closure — Phase 4 part 5.
// Verifies POST /api/orders/[id]/return: only the owning customer, only for
// DELIVERED orders, and item-level partial-return validation against each
// line's remaining returnable quantity (not the order as a whole).

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  order: { findUnique: jest.fn() },
  returnItem: { findMany: jest.fn().mockResolvedValue([]) },
  return: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { POST } from '@/app/api/orders/[id]/return/route';

class MockHeaders {
  private headers: Map<string, string>;
  constructor(init?: Record<string, string>) {
    this.headers = new Map(Object.entries(init || {}));
  }
  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }
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
  async json() { return this.body; }
}

function tokenFor(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET);
}

function mockActor(id: string) {
  mockPrismaClient.user.findUnique.mockResolvedValueOnce({
    id, email: `${id}@example.com`, name: 'Customer', role: 'BUYER', userType: 'RETAIL', isActive: true,
  });
}

function req(userId: string, body: any) {
  return new MockNextRequest({
    headers: { Authorization: `Bearer ${tokenFor(userId)}` },
    body,
  }) as any;
}

const params = (id: string) => Promise.resolve({ id });

const orderItem = (id: string, quantity: number, price: number) => ({ id, quantity, price });

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.returnItem.findMany.mockResolvedValue([]);
});

it('rejects an unauthenticated request (401)', async () => {
  const request = new MockNextRequest({ body: { reason: 'x', items: [] } }) as any;
  const res = await POST(request, { params: params('order-1') });
  expect(res.status).toBe(401);
});

it('rejects a request from someone other than the order owner (403)', async () => {
  mockActor('buyer-1');
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({
    id: 'order-1', userId: 'someone-else', status: 'DELIVERED', orderItems: [orderItem('oi-1', 2, 100)],
  });

  const res = await POST(req('buyer-1', { reason: 'defective', items: [{ orderItemId: 'oi-1', quantity: 1 }] }), { params: params('order-1') });
  expect(res.status).toBe(403);
});

it('rejects a return request for a non-DELIVERED order (400)', async () => {
  mockActor('buyer-1');
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({
    id: 'order-1', userId: 'buyer-1', status: 'SHIPPED', orderItems: [orderItem('oi-1', 2, 100)],
  });

  const res = await POST(req('buyer-1', { reason: 'defective', items: [{ orderItemId: 'oi-1', quantity: 1 }] }), { params: params('order-1') });
  expect(res.status).toBe(400);
});

it('rejects a requested quantity exceeding the remaining returnable quantity', async () => {
  mockActor('buyer-1');
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({
    id: 'order-1', userId: 'buyer-1', status: 'DELIVERED', orderItems: [orderItem('oi-1', 2, 100)],
  });

  const res = await POST(req('buyer-1', { reason: 'defective', items: [{ orderItemId: 'oi-1', quantity: 3 }] }), { params: params('order-1') });
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toMatch(/exceeds remaining returnable quantity/);
});

it('accounts for quantity already tied up in an active (REQUESTED/APPROVED/REFUNDED) return on the same line', async () => {
  mockActor('buyer-1');
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({
    id: 'order-1', userId: 'buyer-1', status: 'DELIVERED', orderItems: [orderItem('oi-1', 5, 100)],
  });
  // 3 of the 5 units are already tied up in an existing active return.
  mockPrismaClient.returnItem.findMany.mockResolvedValueOnce([{ orderItemId: 'oi-1', quantity: 3 }]);

  const res = await POST(req('buyer-1', { reason: 'defective', items: [{ orderItemId: 'oi-1', quantity: 3 }] }), { params: params('order-1') });
  expect(res.status).toBe(400);

  const findManyArg = mockPrismaClient.returnItem.findMany.mock.calls[0][0];
  expect(findManyArg.where.return.status.in).toEqual(expect.arrayContaining(['REQUESTED', 'APPROVED', 'REFUNDED']));
});

it('does not count a REJECTED/CANCELLED return against the remaining quantity (implicitly, by excluding them from the active-status filter)', async () => {
  mockActor('buyer-1');
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({
    id: 'order-1', userId: 'buyer-1', status: 'DELIVERED', orderItems: [orderItem('oi-1', 2, 100)],
  });
  mockPrismaClient.return.create.mockResolvedValueOnce({ id: 'ret-1', returnNumber: 'RET-000001', items: [] });

  const res = await POST(req('buyer-1', { reason: 'defective', items: [{ orderItemId: 'oi-1', quantity: 2 }] }), { params: params('order-1') });
  expect(res.status).toBe(201);
});

it('creates the return with each line\'s refundAmount snapshotted from price × quantity', async () => {
  mockActor('buyer-1');
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({
    id: 'order-1', userId: 'buyer-1', status: 'DELIVERED',
    orderItems: [orderItem('oi-1', 5, 150), orderItem('oi-2', 3, 80)],
  });
  mockPrismaClient.return.create.mockResolvedValueOnce({ id: 'ret-1', returnNumber: 'RET-000001', items: [] });

  const res = await POST(req('buyer-1', {
    reason: 'wrong size',
    items: [{ orderItemId: 'oi-1', quantity: 2 }, { orderItemId: 'oi-2', quantity: 1 }],
  }), { params: params('order-1') });

  expect(res.status).toBe(201);
  expect(mockPrismaClient.return.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        userId: 'buyer-1',
        orderId: 'order-1',
        status: 'REQUESTED',
        items: {
          create: [
            { orderItemId: 'oi-1', quantity: 2, refundAmount: 300 },
            { orderItemId: 'oi-2', quantity: 1, refundAmount: 80 },
          ],
        },
      }),
    })
  );
});

it('rejects an item that does not belong to the order (400)', async () => {
  mockActor('buyer-1');
  mockPrismaClient.order.findUnique.mockResolvedValueOnce({
    id: 'order-1', userId: 'buyer-1', status: 'DELIVERED', orderItems: [orderItem('oi-1', 2, 100)],
  });

  const res = await POST(req('buyer-1', { reason: 'x', items: [{ orderItemId: 'not-on-this-order', quantity: 1 }] }), { params: params('order-1') });
  expect(res.status).toBe(400);
});
