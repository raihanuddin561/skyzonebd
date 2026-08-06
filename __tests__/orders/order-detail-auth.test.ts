/**
 * @jest-environment node
 */
// __tests__/orders/order-detail-auth.test.ts
// Verifies the P0-4 security fix: GET /api/orders/[id] no longer leaks any
// registered user's order (PII: name/email/phone/address) to an
// unauthenticated caller or to a different logged-in user, while guest
// orders (no linked account) remain readable by anyone holding the order id
// — that's the intended behavior of guest checkout, not a regression.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient = {
  order: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

// Both the route's own Prisma calls (order.findUnique) and lib/auth.ts's
// requireAuth (user.findUnique) now go through this one client — the two
// singletons (P1-4) were consolidated to src/lib/prisma.ts.
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));
jest.mock('@/utils/profitReportGeneration', () => ({
  autoGenerateProfitReport: jest.fn().mockResolvedValue({ success: false }),
}));

import { GET } from '@/app/api/orders/[id]/route';

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
  constructor(init?: Record<string, string>) {
    const normalized: Record<string, string> = {};
    Object.entries(init || {}).forEach(([k, v]) => { normalized[k.toLowerCase()] = v; });
    this.headers = new MockHeaders(normalized);
  }
}

function tokenFor(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET);
}

function mockActor(id: string, role: string) {
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValueOnce({
    id, email: `${id}@example.com`, name: 'Actor', role, userType: 'WHOLESALE', isActive: true,
  });
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
    user: null,
    shippingAddress: '123 St',
    billingAddress: '123 St',
    paymentMethod: 'bkash',
    notes: null,
    subtotal: 100,
    shipping: 0,
    tax: 5,
    total: 105,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const params = Promise.resolve({ id: 'order-1' });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/orders/[id]', () => {
  it('returns 404 when the order does not exist', async () => {
    (mockPrismaClient.order.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const request = new MockNextRequest() as any;
    const res = await GET(request, { params });
    expect(res.status).toBe(404);
  });

  describe('guest orders (order.userId is null)', () => {
    it('are readable with no token at all — this is guest checkout, not a regression', async () => {
      (mockPrismaClient.order.findUnique as jest.Mock).mockResolvedValueOnce(baseOrder({ userId: null }));
      const request = new MockNextRequest() as any;
      const res = await GET(request, { params });
      expect(res.status).toBe(200);
      expect(mockPrismaClient.user.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('orders belonging to a registered user (order.userId is set) — this is the vulnerability being closed', () => {
    it('rejects an unauthenticated request with 401 (previously: no check at all, full PII leaked)', async () => {
      (mockPrismaClient.order.findUnique as jest.Mock).mockResolvedValueOnce(baseOrder({ userId: 'customer-1' }));
      const request = new MockNextRequest() as any;
      const res = await GET(request, { params });
      expect(res.status).toBe(401);
    });

    it('rejects a different logged-in customer (403) — proves this closes the IDOR, not just requires "any" login', async () => {
      (mockPrismaClient.order.findUnique as jest.Mock).mockResolvedValueOnce(baseOrder({ userId: 'customer-1' }));
      mockActor('customer-2', 'BUYER');
      const request = new MockNextRequest({ Authorization: `Bearer ${tokenFor('customer-2')}` }) as any;
      const res = await GET(request, { params });
      expect(res.status).toBe(403);
    });

    it('allows the order owner', async () => {
      (mockPrismaClient.order.findUnique as jest.Mock).mockResolvedValueOnce(baseOrder({ userId: 'customer-1' }));
      mockActor('customer-1', 'BUYER');
      const request = new MockNextRequest({ Authorization: `Bearer ${tokenFor('customer-1')}` }) as any;
      const res = await GET(request, { params });
      expect(res.status).toBe(200);
    });

    it('allows an ADMIN to view any customer\'s order', async () => {
      (mockPrismaClient.order.findUnique as jest.Mock).mockResolvedValueOnce(baseOrder({ userId: 'customer-1' }));
      mockActor('admin-1', 'ADMIN');
      const request = new MockNextRequest({ Authorization: `Bearer ${tokenFor('admin-1')}` }) as any;
      const res = await GET(request, { params });
      expect(res.status).toBe(200);
    });

    it('allows a SUPER_ADMIN to view any customer\'s order', async () => {
      (mockPrismaClient.order.findUnique as jest.Mock).mockResolvedValueOnce(baseOrder({ userId: 'customer-1' }));
      mockActor('superadmin-1', 'SUPER_ADMIN');
      const request = new MockNextRequest({ Authorization: `Bearer ${tokenFor('superadmin-1')}` }) as any;
      const res = await GET(request, { params });
      expect(res.status).toBe(200);
    });

    it('rejects an invalid/forged token with 401', async () => {
      (mockPrismaClient.order.findUnique as jest.Mock).mockResolvedValueOnce(baseOrder({ userId: 'customer-1' }));
      const request = new MockNextRequest({ Authorization: 'Bearer not-a-real-token' }) as any;
      const res = await GET(request, { params });
      expect(res.status).toBe(401);
    });
  });
});
