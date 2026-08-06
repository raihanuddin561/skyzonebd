/**
 * @jest-environment node
 */
// __tests__/admin/users-route-auth.test.ts
// Verifies the P0-1 security fix: GET/PATCH/DELETE /api/admin/users must not be
// reachable without a valid, sufficiently-privileged token, and the generic
// PATCH `update` action must not be usable to bypass the dedicated role/status
// endpoints' protections (mass-assignment of `role`/`isActive`/etc).
//
// This file runs under the "node" Jest environment (not the project's default
// jsdom) because it imports the real route.ts module, which in turn imports
// next/server — next/server's NextRequest/NextResponse reference the Fetch API
// (Request/Response/Headers), which jsdom does not provide but Node 18+ does
// natively. No project-wide Jest config change was needed for this.

import jwt from 'jsonwebtoken';

// lib/prisma.ts exports the SAME PrismaClient instance as both a named export
// (`prisma`, used by this route) and a default export (used by lib/auth.ts's
// authenticateUser). The mock must mirror that — otherwise requireAuth's user
// lookup silently hits an unmocked function and every "authenticated" test
// looks unauthenticated.
jest.mock('@/lib/prisma', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  return { __esModule: true, prisma: mockPrismaClient, default: mockPrismaClient };
});

import { prisma } from '@/lib/prisma';
import { GET, PATCH, DELETE } from '@/app/api/admin/users/route';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

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
    const normalizedHeaders: Record<string, string> = {};
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        normalizedHeaders[key.toLowerCase()] = value;
      });
    }
    this.headers = new MockHeaders(normalizedHeaders);
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

function mockActor(role: string, id = 'actor-1', overrides: Record<string, any> = {}) {
  (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
    id,
    email: 'actor@example.com',
    name: 'Actor',
    role,
    userType: 'WHOLESALE',
    isActive: true,
    ...overrides,
  });
}

describe('Admin Users route — authentication & authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET (list users)', () => {
    it('rejects a request with no token (401)', async () => {
      const request = new MockNextRequest('http://localhost:3000/api/admin/users') as any;
      const res = await GET(request);
      expect(res.status).toBe(401);
    });

    it('rejects an authenticated non-admin user (403)', async () => {
      const token = tokenFor('BUYER');
      mockActor('BUYER');
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      }) as any;
      const res = await GET(request);
      expect(res.status).toBe(403);
    });

    it('allows an authenticated ADMIN to list users', async () => {
      const token = tokenFor('ADMIN');
      mockActor('ADMIN');
      (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([]);
      (prisma.user.count as jest.Mock).mockResolvedValueOnce(0);
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      }) as any;
      const res = await GET(request);
      expect(res.status).toBe(200);
    });
  });

  describe('PATCH (suspend/activate/verify/update)', () => {
    it('rejects a request with no token (401)', async () => {
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        body: { userId: 'target-1', action: 'suspend' },
      }) as any;
      const res = await PATCH(request);
      expect(res.status).toBe(401);
    });

    it('rejects an authenticated non-admin user (403)', async () => {
      const token = tokenFor('BUYER');
      mockActor('BUYER');
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        body: { userId: 'target-1', action: 'suspend' },
      }) as any;
      const res = await PATCH(request);
      expect(res.status).toBe(403);
    });

    it('prevents an admin from suspending their own account', async () => {
      const token = tokenFor('ADMIN', 'actor-1');
      mockActor('ADMIN', 'actor-1');
      // target lookup resolves to the same user as the actor
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'actor-1', role: 'ADMIN' });
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        body: { userId: 'actor-1', action: 'suspend' },
      }) as any;
      const res = await PATCH(request);
      expect(res.status).toBe(400);
    });

    it('prevents a plain ADMIN from suspending another admin account (super-admin only)', async () => {
      const token = tokenFor('ADMIN', 'actor-1');
      mockActor('ADMIN', 'actor-1');
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'target-1', role: 'ADMIN' });
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        body: { userId: 'target-1', action: 'suspend' },
      }) as any;
      const res = await PATCH(request);
      expect(res.status).toBe(403);
    });

    it('rejects the `update` action if it tries to set `role` (must use the dedicated role endpoint)', async () => {
      const token = tokenFor('ADMIN', 'actor-1');
      mockActor('ADMIN', 'actor-1');
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'target-1', role: 'BUYER' });
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        body: { userId: 'target-1', action: 'update', data: { role: 'SUPER_ADMIN' } },
      }) as any;
      const res = await PATCH(request);
      expect(res.status).toBe(400);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects the `update` action if it tries to set `password` or `isActive`', async () => {
      const token = tokenFor('ADMIN', 'actor-1');
      mockActor('ADMIN', 'actor-1');
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'target-1', role: 'BUYER' });
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        body: { userId: 'target-1', action: 'update', data: { password: 'hacked', isActive: true } },
      }) as any;
      const res = await PATCH(request);
      expect(res.status).toBe(400);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('allows the `update` action for safe fields (e.g. phone, companyName)', async () => {
      const token = tokenFor('ADMIN', 'actor-1');
      mockActor('ADMIN', 'actor-1');
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'target-1', role: 'BUYER' });
      (prisma.user.update as jest.Mock).mockResolvedValueOnce({ id: 'target-1', role: 'BUYER' });
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        body: { userId: 'target-1', action: 'update', data: { phone: '01700000000' } },
      }) as any;
      const res = await PATCH(request);
      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { phone: '01700000000' } })
      );
    });

    it('supports `reset-to-pending` as a named action (deactivate + unverify), replacing the old update{isActive,isVerified} bypass', async () => {
      const token = tokenFor('ADMIN', 'actor-1');
      mockActor('ADMIN', 'actor-1');
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'target-1', role: 'BUYER' });
      (prisma.user.update as jest.Mock).mockResolvedValueOnce({ id: 'target-1', role: 'BUYER' });
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        body: { userId: 'target-1', action: 'reset-to-pending' },
      }) as any;
      const res = await PATCH(request);
      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false, isVerified: false } })
      );
    });

    it('applies the same self-account/admin-protection guard to `reset-to-pending` as to suspend/activate', async () => {
      const token = tokenFor('ADMIN', 'actor-1');
      mockActor('ADMIN', 'actor-1');
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'actor-1', role: 'ADMIN' });
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        body: { userId: 'actor-1', action: 'reset-to-pending' },
      }) as any;
      const res = await PATCH(request);
      expect(res.status).toBe(400);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE (bulk user delete)', () => {
    it('rejects a request with no token (401)', async () => {
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        body: { userIds: ['target-1'] },
      }) as any;
      const res = await DELETE(request);
      expect(res.status).toBe(401);
    });

    it('rejects a plain ADMIN (super-admin required for destructive bulk delete)', async () => {
      const token = tokenFor('ADMIN');
      mockActor('ADMIN');
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        body: { userIds: ['target-1'] },
      }) as any;
      const res = await DELETE(request);
      expect(res.status).toBe(403);
    });

    it('allows a SUPER_ADMIN to delete other users, but strips their own id from the list', async () => {
      const token = tokenFor('SUPER_ADMIN', 'actor-1');
      mockActor('SUPER_ADMIN', 'actor-1');
      (prisma.user.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        body: { userIds: ['actor-1', 'target-1'] },
      }) as any;
      const res = await DELETE(request);
      expect(res.status).toBe(200);
      expect(prisma.user.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['target-1'] } } });
    });

    it('rejects if the only id supplied is the caller\'s own account', async () => {
      const token = tokenFor('SUPER_ADMIN', 'actor-1');
      mockActor('SUPER_ADMIN', 'actor-1');
      const request = new MockNextRequest('http://localhost:3000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        body: { userIds: ['actor-1'] },
      }) as any;
      const res = await DELETE(request);
      expect(res.status).toBe(400);
      expect(prisma.user.deleteMany).not.toHaveBeenCalled();
    });
  });
});
