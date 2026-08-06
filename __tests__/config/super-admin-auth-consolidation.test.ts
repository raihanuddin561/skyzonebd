/**
 * @jest-environment node
 */
// __tests__/config/super-admin-auth-consolidation.test.ts
//
// Verifies backlog item P2-9 (docs/architecture-review/15_Implementation_Backlog.md):
// 8 routes previously hand-rolled `role.toUpperCase() !== 'ADMIN'` (or
// equivalent) checks that rejected SUPER_ADMIN accounts outright, or (for
// products/[id] GET) never verified the token at all. Each was migrated to
// the canonical requireAuth/requireAdmin (lib/auth.ts) + isAdmin() role
// hierarchy check (types/roles.ts). This file proves, for every one of the
// 8 files, that a SUPER_ADMIN token is no longer rejected the way it used
// to be, and — for products/[id] — that an unverified "Bearer" header no
// longer silently grants admin-level product visibility.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

function mockModel() {
  return {
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
  };
}

const mockPrismaClient = {
  user: mockModel(),
  order: mockModel(),
  product: mockModel(),
  category: mockModel(),
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
  getActivityLogs: jest.fn().mockResolvedValue({ logs: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }),
  getActivityStats: jest.fn().mockResolvedValue({}),
}));

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
  public url: string;
  private body: any;
  private form: FormData | undefined;

  constructor(url: string, options?: { headers?: Record<string, string>; body?: any; form?: FormData }) {
    const normalizedHeaders: Record<string, string> = {};
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        normalizedHeaders[key.toLowerCase()] = value;
      });
    }
    this.headers = new MockHeaders(normalizedHeaders);
    this.url = url;
    this.body = options?.body;
    this.form = options?.form;
  }

  async json() {
    return this.body;
  }

  async formData() {
    return this.form ?? new FormData();
  }
}

function tokenFor(role: string, userId = 'actor-1') {
  return jwt.sign({ userId, role }, JWT_SECRET);
}

function mockActiveUser(role: string, id = 'actor-1') {
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({
    id, email: 'actor@example.com', name: 'Actor', role, userType: 'WHOLESALE', isActive: true,
  });
}

function superAdminReq(url: string, opts?: { body?: any; form?: FormData }) {
  mockActiveUser('SUPER_ADMIN');
  return new MockNextRequest(url, {
    headers: { Authorization: `Bearer ${tokenFor('SUPER_ADMIN')}` },
    body: opts?.body,
    form: opts?.form,
  }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('P2-9: SUPER_ADMIN was previously excluded by hand-rolled ADMIN-only checks', () => {
  it('GET /api/admin/activity-logs allows SUPER_ADMIN (was 403)', async () => {
    const { GET } = require('@/app/api/admin/activity-logs/route');
    const res = await GET(superAdminReq('http://x/api/admin/activity-logs'));
    expect(res.status).toBe(200);
  });

  it('GET /api/admin/activity-logs/stats allows SUPER_ADMIN (was 403)', async () => {
    const { GET } = require('@/app/api/admin/activity-logs/stats/route');
    const res = await GET(superAdminReq('http://x/api/admin/activity-logs/stats'));
    expect(res.status).toBe(200);
  });

  it('POST /api/orders/cancel allows a SUPER_ADMIN to cancel another customer\'s order (was 403)', async () => {
    const { POST } = require('@/app/api/orders/cancel/route');
    (mockPrismaClient.order.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'order-1', userId: 'someone-else', status: 'PENDING',
      orderItems: [{ productId: 'p1', quantity: 1, product: { name: 'P1' } }],
    });
    (mockPrismaClient.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
      cb({
        order: { update: jest.fn().mockResolvedValue({
          id: 'order-1', orderNumber: 'ORD-1', userId: 'someone-else',
          orderItems: [{ productId: 'p1', quantity: 1, product: { name: 'P1' }, price: 1, total: 1 }],
          shippingAddress: 'x', billingAddress: 'x', paymentMethod: 'bkash', notes: null,
          subtotal: 1, shipping: 0, tax: 0, total: 1, status: 'CANCELLED', paymentStatus: 'PENDING',
          cancelledAt: new Date(), cancellationReason: 'test', createdAt: new Date(), updatedAt: new Date(),
        }) },
        product: { findUnique: jest.fn().mockResolvedValue({ stockQuantity: 5 }), update: jest.fn().mockResolvedValue({}) },
        inventoryLog: { create: jest.fn().mockResolvedValue({}) },
        stockAllocation: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
        stockLot: { update: jest.fn().mockResolvedValue({}) },
      })
    );
    const res = await POST(superAdminReq('http://x/api/orders/cancel', { body: { orderId: 'order-1', reason: 'test' } }));
    expect(res.status).toBe(200);
  });

  it('GET /api/products shows inactive products to SUPER_ADMIN (was restricted to ADMIN only)', async () => {
    const { GET } = require('@/app/api/products/route');
    const res = await GET(superAdminReq('http://x/api/products'));
    expect(res.status).toBe(200);
    const whereArg = (mockPrismaClient.product.findMany as jest.Mock).mock.calls[0][0].where;
    expect(whereArg.isActive).toBeUndefined();
  });

  it('PATCH /api/orders allows SUPER_ADMIN to update order status (was 403)', async () => {
    const { PATCH } = require('@/app/api/orders/route');
    (mockPrismaClient.order.findUnique as jest.Mock).mockResolvedValueOnce({
      orderNumber: 'ORD-1', status: 'PENDING', paymentStatus: 'PENDING',
    });
    (mockPrismaClient.order.update as jest.Mock).mockResolvedValueOnce({
      id: 'order-1', orderNumber: 'ORD-1', userId: 'u1', guestName: null,
      orderItems: [], shippingAddress: 'x', billingAddress: 'x', paymentMethod: 'bkash',
      notes: null, subtotal: 1, shipping: 0, tax: 0, total: 1,
      status: 'PROCESSING', paymentStatus: 'PENDING', createdAt: new Date(), updatedAt: new Date(),
    });
    const res = await PATCH(superAdminReq('http://x/api/orders', { body: { orderId: 'order-1', status: 'PROCESSING' } }));
    expect(res.status).toBe(200);
  });

  it('POST /api/upload passes the auth gate for SUPER_ADMIN (was 403 before reaching upload logic)', async () => {
    const { POST } = require('@/app/api/upload/route');
    const res = await POST(superAdminReq('http://x/api/upload'));
    // Auth passed (not 403); it now fails for an unrelated, expected reason
    // (no file in the empty FormData) — proving the gate, not the whole feature.
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400);
  });

  it('POST /api/upload/multi passes the auth gate for SUPER_ADMIN (was 403)', async () => {
    const { POST } = require('@/app/api/upload/multi/route');
    const res = await POST(superAdminReq('http://x/api/upload/multi'));
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(400);
  });
});

describe('P2-9: GET /api/products/[id] no longer treats any "Bearer "-prefixed header as admin', () => {
  const params = Promise.resolve({ id: 'prod-1' });

  it('a syntactically-invalid token no longer bypasses the isActive filter', async () => {
    const { GET } = require('@/app/api/products/[id]/route');
    (mockPrismaClient.product.findFirst as jest.Mock).mockResolvedValueOnce({
      id: 'prod-1', categoryId: 'cat-1', category: { name: 'Cat', slug: 'cat' },
      wholesaleTiers: [], name: 'P', slug: 'p', wholesalePrice: 1, basePrice: 1, moq: 1,
      imageUrl: '', imageUrls: [], thumbnailUrl: null, description: '', brand: null, tags: [],
      specifications: {}, stockQuantity: 1, availability: 'in_stock', sku: null, rating: 0,
      reviewCount: 0, isFeatured: false, isActive: true, metaTitle: null, metaDescription: null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    const req = new MockNextRequest('http://x/api/products/prod-1', {
      headers: { Authorization: 'Bearer not-a-real-jwt' },
    }) as any;

    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const whereArg = (mockPrismaClient.product.findFirst as jest.Mock).mock.calls[0][0].where;
    // Previously this would have been `undefined` (isActive filter omitted)
    // for ANY string starting with "Bearer ", regardless of validity.
    expect(whereArg.isActive).toBe(true);
  });
});
