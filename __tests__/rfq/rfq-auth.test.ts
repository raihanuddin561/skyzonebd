/**
 * @jest-environment node
 */
// __tests__/rfq/rfq-auth.test.ts
// Verifies the P0-5 security fix for the RFQ endpoints:
// - GET/POST /api/rfq now require authentication; non-admins only see/act on
//   their own RFQs, and a create request always uses the caller's own id
//   (a client-supplied `userId` can no longer be used to impersonate someone
//   else, since it's not read from the body at all anymore).
// - POST /api/rfq/[id]/respond (quoting) is now admin-only.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient = {
  user: { findUnique: jest.fn() },
  rFQ: { findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { prisma } from '@/lib/prisma';
import { GET, POST } from '@/app/api/rfq/route';
import { POST as RESPOND } from '@/app/api/rfq/[id]/respond/route';

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
  private body: any;

  constructor(url: string, options?: { headers?: Record<string, string>; body?: any }) {
    const normalized: Record<string, string> = {};
    Object.entries(options?.headers || {}).forEach(([k, v]) => { normalized[k.toLowerCase()] = v; });
    this.headers = new MockHeaders(normalized);
    this.nextUrl = { searchParams: new URL(url).searchParams };
    this.body = options?.body;
  }

  async json() {
    return this.body;
  }
}

function tokenFor(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET);
}

function mockActor(id: string, role: string) {
  (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
    id, email: `${id}@example.com`, name: 'Actor', role, userType: 'WHOLESALE', isActive: true,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GET /api/rfq', () => {
  it('rejects an unauthenticated request (401) — previously leaked every customer\'s RFQs to anyone', async () => {
    const request = new MockNextRequest('http://x/api/rfq') as any;
    const res = await GET(request);
    expect(res.status).toBe(401);
  });

  it('scopes results to the caller\'s own RFQs for a non-admin', async () => {
    mockActor('buyer-1', 'BUYER');
    (prisma.rFQ.findMany as jest.Mock).mockResolvedValueOnce([]);
    const request = new MockNextRequest('http://x/api/rfq', {
      headers: { Authorization: `Bearer ${tokenFor('buyer-1')}` },
    }) as any;
    const res = await GET(request);
    expect(res.status).toBe(200);
    expect(prisma.rFQ.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'buyer-1' }) })
    );
  });

  it('returns all RFQs (no userId filter) for an admin', async () => {
    mockActor('admin-1', 'ADMIN');
    (prisma.rFQ.findMany as jest.Mock).mockResolvedValueOnce([]);
    const request = new MockNextRequest('http://x/api/rfq', {
      headers: { Authorization: `Bearer ${tokenFor('admin-1')}` },
    }) as any;
    const res = await GET(request);
    expect(res.status).toBe(200);
    const whereArg = (prisma.rFQ.findMany as jest.Mock).mock.calls[0][0].where;
    expect(whereArg.userId).toBeUndefined();
  });
});

describe('POST /api/rfq', () => {
  it('rejects an unauthenticated request (401)', async () => {
    const request = new MockNextRequest('http://x/api/rfq', {
      body: { userId: 'someone-else', subject: 'x', items: [{ productId: 'p1', quantity: 10 }] },
    }) as any;
    const res = await POST(request);
    expect(res.status).toBe(401);
  });

  it('creates the RFQ under the CALLER\'s own id, ignoring any client-supplied userId — closes the impersonation hole', async () => {
    mockActor('real-caller', 'BUYER');
    (prisma.rFQ.count as jest.Mock).mockResolvedValueOnce(0);
    (prisma.rFQ.create as jest.Mock).mockResolvedValueOnce({ id: 'rfq-1', rfqNumber: 'RFQ-000001', items: [] });
    const request = new MockNextRequest('http://x/api/rfq', {
      headers: { Authorization: `Bearer ${tokenFor('real-caller')}` },
      body: {
        userId: 'someone-else-impersonated', // must be ignored
        subject: 'Bulk order',
        items: [{ productId: 'p1', quantity: 100 }],
      },
    }) as any;
    const res = await POST(request);
    expect(res.status).toBe(200);
    expect(prisma.rFQ.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'real-caller' }) })
    );
  });
});

describe('POST /api/rfq/[id]/respond', () => {
  const params = Promise.resolve({ id: 'rfq-1' });

  it('rejects an unauthenticated request (401)', async () => {
    const request = new MockNextRequest('http://x/api/rfq/rfq-1/respond', {
      body: { response: 'Here is your quote' },
    }) as any;
    const res = await RESPOND(request, { params });
    expect(res.status).toBe(401);
  });

  it('rejects a non-admin (403) — quoting is a staff-only action', async () => {
    mockActor('buyer-1', 'BUYER');
    const request = new MockNextRequest('http://x/api/rfq/rfq-1/respond', {
      headers: { Authorization: `Bearer ${tokenFor('buyer-1')}` },
      body: { response: 'Here is your quote' },
    }) as any;
    const res = await RESPOND(request, { params });
    expect(res.status).toBe(403);
  });

  it('allows an admin to respond', async () => {
    mockActor('admin-1', 'ADMIN');
    (prisma.rFQ.update as jest.Mock).mockResolvedValueOnce({ id: 'rfq-1', user: { name: 'Customer' } });
    const request = new MockNextRequest('http://x/api/rfq/rfq-1/respond', {
      headers: { Authorization: `Bearer ${tokenFor('admin-1')}` },
      body: { response: 'Here is your quote' },
    }) as any;
    const res = await RESPOND(request, { params });
    expect(res.status).toBe(200);
  });
});
