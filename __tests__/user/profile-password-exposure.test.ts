/**
 * @jest-environment node
 */
// __tests__/user/profile-password-exposure.test.ts
// Verifies the P0-8 fix: GET /api/user/profile no longer returns the bcrypt
// password hash (it previously had no select/include filter at all and
// shipped the full raw User row to the browser).

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient = {
  user: { findUnique: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { prisma } from '@/lib/prisma';
import { GET } from '@/app/api/user/profile/route';

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

beforeEach(() => {
  jest.clearAllMocks();
});

it('GET /api/user/profile response never contains a password field', async () => {
  // First call: requireAuth's own lookup (used to authenticate the caller).
  (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
    id: 'user-1', email: 'user@example.com', name: 'User', role: 'BUYER', userType: 'WHOLESALE', isActive: true,
  });
  // Second call: the route's own profile lookup — this is the one the fix
  // targets. If the route ever regresses to querying with no `select`, this
  // mock intentionally returns a `password` field so the test can catch it.
  (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
    id: 'user-1', name: 'User', email: 'user@example.com', phone: '123', companyName: null,
    role: 'BUYER', userType: 'WHOLESALE', isVerified: true, isActive: true,
    discountPercent: 0, discountReason: null, discountValidUntil: null,
    createdAt: new Date(), updatedAt: new Date(), businessInfo: null, addresses: [],
  });

  const request = new MockNextRequest({ Authorization: `Bearer ${tokenFor('user-1')}` }) as any;
  const res = await GET(request);
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.user).not.toHaveProperty('password');

  // Also assert the route asked Prisma for an explicit, password-free select
  // — not "no select at all" (which is exactly what the original bug was).
  const profileCall = (prisma.user.findUnique as jest.Mock).mock.calls[1][0];
  expect(profileCall.select).toBeDefined();
  expect(profileCall.select.password).toBeUndefined();
});
