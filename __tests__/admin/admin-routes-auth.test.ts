/**
 * @jest-environment node
 */
// __tests__/admin/admin-routes-auth.test.ts
// Verifies the P0-2 security fix: the 12 previously-unauthenticated admin
// routes now require a verified admin (or, where noted, super-admin) token.
// This file tests the auth GATE added to each route, not each route's
// pre-existing business logic (which this ticket does not change) — for
// each file we confirm: no token -> 401, non-admin token -> 403, and a
// valid admin token reaches the route's normal logic (200, with minimal
// mocks standing in for its unrelated business logic).

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

// A generic mock "model" with the handful of Prisma methods used across
// these routes, each defaulting to a safe empty/zero value so routes that
// reach past the auth gate don't throw on unmocked calls.
function mockModel() {
  return {
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    groupBy: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    create: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({ key: 'x', value: '0' }),
    delete: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  };
}

const mockPrismaClient: any = {
  user: mockModel(),
  product: mockModel(),
  partner: mockModel(),
  profitDistribution: mockModel(),
  order: mockModel(),
  platformConfig: mockModel(),
  businessInfo: mockModel(),
  paymentConfig: mockModel(),
  inventoryLog: mockModel(),
};
// Several routes wrap their write in prisma.$transaction — the callback
// receives the same mock client, so a mocked `tx.product.update()` etc.
// behaves identically whether called directly or via a transaction.
mockPrismaClient.$transaction = jest.fn((cb: any) => cb(mockPrismaClient));

// lib/prisma.ts exports the same client as both named and default export;
// lib/auth.ts's requireAuth reads the default export for its user lookup.
// (admin/payment-config/[id]/route.ts previously used a second singleton,
// lib/db.ts — consolidated into this one module by P1-4.)
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

jest.mock('@/lib/activityLogger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/utils/partnerProfitDistribution', () => ({
  calculateProfitForPeriod: jest.fn().mockResolvedValue({}),
  distributeProfitToPartners: jest.fn().mockResolvedValue({ success: true, message: 'ok', profitData: {}, distributions: [] }),
  getProfitSummary: jest.fn().mockResolvedValue({}),
  getProfitTrends: jest.fn().mockResolvedValue([]),
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
  public nextUrl: { searchParams: URLSearchParams };
  public url: string;
  private body: any;

  constructor(url: string, options?: { headers?: Record<string, string>; body?: any }) {
    const normalizedHeaders: Record<string, string> = {};
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        normalizedHeaders[key.toLowerCase()] = value;
      });
    }
    this.headers = new MockHeaders(normalizedHeaders);
    this.url = url;
    this.nextUrl = { searchParams: new URL(url).searchParams };
    this.body = options?.body;
  }

  async json() {
    return this.body;
  }
}

function tokenFor(role: string, userId = 'actor-1') {
  return jwt.sign({ userId }, JWT_SECRET);
}

function mockActor(role: string, id = 'actor-1') {
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValueOnce({
    id,
    email: 'actor@example.com',
    name: 'Actor',
    role,
    userType: 'WHOLESALE',
    isActive: true,
  });
}

function req(url: string, opts?: { admin?: boolean; nonAdminRole?: string; body?: any }) {
  if (!opts || (!opts.admin && !opts.nonAdminRole)) {
    return new MockNextRequest(url, { body: opts?.body }) as any;
  }
  const role = opts.admin ? 'ADMIN' : (opts.nonAdminRole as string);
  const token = tokenFor(role);
  mockActor(role);
  return new MockNextRequest(url, {
    headers: { Authorization: `Bearer ${token}` },
    body: opts.body,
  }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('P0-2: previously-unauthenticated admin routes now require auth', () => {
  describe('/api/admin/inventory', () => {
    const { GET } = require('@/app/api/admin/inventory/route');

    it('GET rejects no token (401)', async () => {
      expect((await GET(req('http://x/api/admin/inventory'))).status).toBe(401);
    });
    it('GET rejects non-admin (403)', async () => {
      expect((await GET(req('http://x/api/admin/inventory', { nonAdminRole: 'BUYER' }))).status).toBe(403);
    });
    it('GET allows admin (200)', async () => {
      expect((await GET(req('http://x/api/admin/inventory', { admin: true }))).status).toBe(200);
    });
  });

  describe('/api/admin/inventory/[id]', () => {
    const { PATCH } = require('@/app/api/admin/inventory/[id]/route');
    const params = Promise.resolve({ id: 'p1' });

    it('PATCH rejects no token (401)', async () => {
      expect((await PATCH(req('http://x/api/admin/inventory/p1', { body: { stockQuantity: 5 } }), { params })).status).toBe(401);
    });
    it('PATCH rejects non-admin (403)', async () => {
      expect((await PATCH(req('http://x/api/admin/inventory/p1', { nonAdminRole: 'BUYER', body: { stockQuantity: 5 } }), { params })).status).toBe(403);
    });
    it('PATCH allows admin (200)', async () => {
      (mockPrismaClient.product.findUnique as jest.Mock).mockResolvedValueOnce({ stockQuantity: 3, name: 'X' });
      (mockPrismaClient.product.update as jest.Mock).mockResolvedValueOnce({ id: 'p1', name: 'X', stockQuantity: 5, availability: 'in_stock' });
      expect((await PATCH(req('http://x/api/admin/inventory/p1', { admin: true, body: { stockQuantity: 5 } }), { params })).status).toBe(200);
    });
  });

  describe('/api/admin/partners/[id]', () => {
    const { GET, PATCH, DELETE } = require('@/app/api/admin/partners/[id]/route');
    const params = Promise.resolve({ id: 'partner-1' });

    it('GET rejects no token (401)', async () => {
      expect((await GET(req('http://x/api/admin/partners/partner-1'), { params })).status).toBe(401);
    });
    it('GET rejects non-admin (403)', async () => {
      expect((await GET(req('http://x/api/admin/partners/partner-1', { nonAdminRole: 'BUYER' }), { params })).status).toBe(403);
    });
    it('GET allows admin (200 or 404, never blocked by auth)', async () => {
      const res = await GET(req('http://x/api/admin/partners/partner-1', { admin: true }), { params });
      expect([200, 404]).toContain(res.status);
    });

    it('PATCH rejects no token (401)', async () => {
      expect((await PATCH(req('http://x/api/admin/partners/partner-1', { body: { name: 'X' } }), { params })).status).toBe(401);
    });
    it('PATCH rejects non-admin (403)', async () => {
      expect((await PATCH(req('http://x/api/admin/partners/partner-1', { nonAdminRole: 'BUYER', body: { name: 'X' } }), { params })).status).toBe(403);
    });

    it('DELETE rejects no token (401)', async () => {
      expect((await DELETE(req('http://x/api/admin/partners/partner-1'), { params })).status).toBe(401);
    });
    it('DELETE rejects a plain ADMIN — super admin required for irreversible partner deletion (403)', async () => {
      expect((await DELETE(req('http://x/api/admin/partners/partner-1', { admin: true }), { params })).status).toBe(403);
    });
    it('DELETE allows SUPER_ADMIN (200)', async () => {
      const token = jwt.sign({ userId: 'actor-1' }, JWT_SECRET);
      mockActor('SUPER_ADMIN');
      const request = new MockNextRequest('http://x/api/admin/partners/partner-1', {
        headers: { Authorization: `Bearer ${token}` },
      }) as any;
      expect((await DELETE(request, { params })).status).toBe(200);
    });
  });

  describe('/api/admin/payouts/[id]', () => {
    // The canonical "mark distribution paid/approved" path as of Phase 3
    // part 1 (admin/distributions/route.ts was dead code — zero UI
    // callers anywhere — and has been removed; its auth coverage moves
    // here).
    const { GET, PATCH } = require('@/app/api/admin/payouts/[id]/route');
    const params = Promise.resolve({ id: 'pay-1' });

    it('GET rejects no token (401)', async () => {
      expect((await GET(req('http://x/api/admin/payouts/pay-1'), { params })).status).toBe(401);
    });
    it('GET rejects non-admin (403)', async () => {
      expect((await GET(req('http://x/api/admin/payouts/pay-1', { nonAdminRole: 'BUYER' }), { params })).status).toBe(403);
    });
    it('GET allows admin (200 or 404, never blocked by auth)', async () => {
      const res = await GET(req('http://x/api/admin/payouts/pay-1', { admin: true }), { params });
      expect([200, 404]).toContain(res.status);
    });

    it('PATCH rejects no token (401)', async () => {
      expect((await PATCH(req('http://x/api/admin/payouts/pay-1', { body: { status: 'APPROVED' } }), { params })).status).toBe(401);
    });
    it('PATCH rejects non-admin (403)', async () => {
      expect((await PATCH(req('http://x/api/admin/payouts/pay-1', { nonAdminRole: 'BUYER', body: { status: 'APPROVED' } }), { params })).status).toBe(403);
    });
  });

  describe('/api/admin/payments', () => {
    const { GET, PUT } = require('@/app/api/admin/payments/route');

    it('GET rejects no token (401)', async () => {
      expect((await GET(req('http://x/api/admin/payments'))).status).toBe(401);
    });
    it('GET rejects non-admin (403)', async () => {
      expect((await GET(req('http://x/api/admin/payments', { nonAdminRole: 'BUYER' }))).status).toBe(403);
    });
    it('GET allows admin (200)', async () => {
      expect((await GET(req('http://x/api/admin/payments', { admin: true }))).status).toBe(200);
    });

    it('PUT rejects no token (401)', async () => {
      expect((await PUT(req('http://x/api/admin/payments', { body: { id: 'bkash', enabled: false } }))).status).toBe(401);
    });
    it('PUT rejects non-admin (403)', async () => {
      expect((await PUT(req('http://x/api/admin/payments', { nonAdminRole: 'BUYER', body: { id: 'bkash', enabled: false } }))).status).toBe(403);
    });
  });

  describe('/api/admin/settings', () => {
    const { GET, PUT } = require('@/app/api/admin/settings/route');

    it('GET rejects no token (401)', async () => {
      expect((await GET(req('http://x/api/admin/settings'))).status).toBe(401);
    });
    it('GET rejects non-admin (403)', async () => {
      expect((await GET(req('http://x/api/admin/settings', { nonAdminRole: 'BUYER' }))).status).toBe(403);
    });
    it('GET allows admin (200)', async () => {
      expect((await GET(req('http://x/api/admin/settings', { admin: true }))).status).toBe(200);
    });

    it('PUT rejects no token (401)', async () => {
      expect((await PUT(req('http://x/api/admin/settings', { body: { system: { maintenanceMode: true } } }))).status).toBe(401);
    });
    it('PUT rejects non-admin (403)', async () => {
      expect((await PUT(req('http://x/api/admin/settings', { nonAdminRole: 'BUYER', body: { system: { maintenanceMode: true } } }))).status).toBe(403);
    });
  });

  describe('/api/admin/shipping', () => {
    const { GET, PUT } = require('@/app/api/admin/shipping/route');

    it('GET rejects no token (401)', async () => {
      expect((await GET(req('http://x/api/admin/shipping'))).status).toBe(401);
    });
    it('GET rejects non-admin (403)', async () => {
      expect((await GET(req('http://x/api/admin/shipping', { nonAdminRole: 'BUYER' }))).status).toBe(403);
    });
    it('GET allows admin (200)', async () => {
      expect((await GET(req('http://x/api/admin/shipping', { admin: true }))).status).toBe(200);
    });

    it('PUT rejects no token (401)', async () => {
      expect((await PUT(req('http://x/api/admin/shipping', { body: { type: 'zone', id: 'dhaka-city', rate: 70 } }))).status).toBe(401);
    });
    it('PUT rejects non-admin (403)', async () => {
      expect((await PUT(req('http://x/api/admin/shipping', { nonAdminRole: 'BUYER', body: { type: 'zone', id: 'dhaka-city', rate: 70 } }))).status).toBe(403);
    });
  });

  describe('/api/admin/stats', () => {
    const { GET } = require('@/app/api/admin/stats/route');

    it('GET rejects no token (401)', async () => {
      expect((await GET(req('http://x/api/admin/stats'))).status).toBe(401);
    });
    it('GET rejects non-admin (403)', async () => {
      expect((await GET(req('http://x/api/admin/stats', { nonAdminRole: 'BUYER' }))).status).toBe(403);
    });
    it('GET allows admin (200)', async () => {
      expect((await GET(req('http://x/api/admin/stats', { admin: true }))).status).toBe(200);
    });
  });

  describe('/api/admin/profit-config', () => {
    const { GET, POST, PUT, DELETE } = require('@/app/api/admin/profit-config/route');

    it('GET rejects no token (401)', async () => {
      expect((await GET(req('http://x/api/admin/profit-config'))).status).toBe(401);
    });
    it('GET rejects non-admin (403)', async () => {
      expect((await GET(req('http://x/api/admin/profit-config', { nonAdminRole: 'BUYER' }))).status).toBe(403);
    });
    it('GET allows admin (200)', async () => {
      expect((await GET(req('http://x/api/admin/profit-config', { admin: true }))).status).toBe(200);
    });

    it('POST rejects no token (401)', async () => {
      expect((await POST(req('http://x/api/admin/profit-config', { body: { key: 'k', value: '1' } }))).status).toBe(401);
    });
    it('POST rejects non-admin (403)', async () => {
      expect((await POST(req('http://x/api/admin/profit-config', { nonAdminRole: 'BUYER', body: { key: 'k', value: '1' } }))).status).toBe(403);
    });

    it('PUT rejects no token (401)', async () => {
      expect((await PUT(req('http://x/api/admin/profit-config', { body: { platformProfitPercentage: 20 } }))).status).toBe(401);
    });
    it('PUT rejects non-admin (403)', async () => {
      expect((await PUT(req('http://x/api/admin/profit-config', { nonAdminRole: 'BUYER', body: { platformProfitPercentage: 20 } }))).status).toBe(403);
    });

    it('DELETE rejects no token (401)', async () => {
      expect((await DELETE(req('http://x/api/admin/profit-config?key=k'))).status).toBe(401);
    });
    it('DELETE rejects non-admin (403)', async () => {
      expect((await DELETE(req('http://x/api/admin/profit-config?key=k', { nonAdminRole: 'BUYER' }))).status).toBe(403);
    });
  });

  describe('/api/admin/profits', () => {
    const { GET, POST } = require('@/app/api/admin/profits/route');

    it('GET rejects no token (401)', async () => {
      expect((await GET(req('http://x/api/admin/profits?action=summary'))).status).toBe(401);
    });
    it('GET rejects non-admin (403)', async () => {
      expect((await GET(req('http://x/api/admin/profits?action=summary', { nonAdminRole: 'BUYER' }))).status).toBe(403);
    });
    it('GET allows admin (200)', async () => {
      expect((await GET(req('http://x/api/admin/profits?action=summary', { admin: true }))).status).toBe(200);
    });

    it('POST rejects no token (401) — this is the endpoint that can trigger a full partner profit distribution', async () => {
      expect((await POST(req('http://x/api/admin/profits', { body: { action: 'distribute', periodType: 'MONTHLY', startDate: '2026-01-01', endDate: '2026-01-31' } }))).status).toBe(401);
    });
    it('POST rejects non-admin (403)', async () => {
      expect((await POST(req('http://x/api/admin/profits', { nonAdminRole: 'BUYER', body: { action: 'distribute', periodType: 'MONTHLY', startDate: '2026-01-01', endDate: '2026-01-31' } }))).status).toBe(403);
    });
  });

  describe('/api/admin/verification', () => {
    const { GET, PATCH, DELETE } = require('@/app/api/admin/verification/route');

    it('GET rejects no token (401)', async () => {
      expect((await GET(req('http://x/api/admin/verification'))).status).toBe(401);
    });
    it('GET rejects non-admin (403)', async () => {
      expect((await GET(req('http://x/api/admin/verification', { nonAdminRole: 'BUYER' }))).status).toBe(403);
    });
    it('GET allows admin (200)', async () => {
      expect((await GET(req('http://x/api/admin/verification', { admin: true }))).status).toBe(200);
    });

    it('PATCH rejects no token (401)', async () => {
      expect((await PATCH(req('http://x/api/admin/verification', { body: { applicationId: 'a1', action: 'approve' } }))).status).toBe(401);
    });
    it('PATCH rejects non-admin (403)', async () => {
      expect((await PATCH(req('http://x/api/admin/verification', { nonAdminRole: 'BUYER', body: { applicationId: 'a1', action: 'approve' } }))).status).toBe(403);
    });

    it('DELETE rejects no token (401)', async () => {
      expect((await DELETE(req('http://x/api/admin/verification', { body: { applicationIds: ['a1'] } }))).status).toBe(401);
    });
    it('DELETE rejects non-admin (403)', async () => {
      expect((await DELETE(req('http://x/api/admin/verification', { nonAdminRole: 'BUYER', body: { applicationIds: ['a1'] } }))).status).toBe(403);
    });
  });

  describe('/api/admin/payment-config/[id] (GET only, per ticket scope)', () => {
    const { GET } = require('@/app/api/admin/payment-config/[id]/route');
    const params = Promise.resolve({ id: 'cfg-1' });

    it('GET rejects no token (401)', async () => {
      expect((await GET(req('http://x/api/admin/payment-config/cfg-1'), { params })).status).toBe(401);
    });
    it('GET rejects non-admin (403)', async () => {
      expect((await GET(req('http://x/api/admin/payment-config/cfg-1', { nonAdminRole: 'BUYER' }), { params })).status).toBe(403);
    });
    it('GET allows admin (200 or 404, never blocked by auth)', async () => {
      const res = await GET(req('http://x/api/admin/payment-config/cfg-1', { admin: true }), { params });
      expect([200, 404]).toContain(res.status);
    });
  });
});
