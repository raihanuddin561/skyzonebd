/**
 * @jest-environment node
 */
// __tests__/lib/permissionMiddleware.test.ts
// Verifies the P0-3 security fix: checkPermission()/getAuthenticatedUserId()
// derive identity from a verified JWT, and a forged `x-user-id` header (the
// vulnerability being closed) no longer grants access on its own.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

jest.mock('@/lib/prisma', () => {
  const client = {
    user: { findUnique: jest.fn() },
    userPermission: { findUnique: jest.fn() },
  };
  return { __esModule: true, prisma: client, default: client };
});

import { prisma } from '@/lib/prisma';
import { checkPermission, getAuthenticatedUserId, requirePermission, PermissionError } from '@/middleware/permissionMiddleware';

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

describe('getAuthenticatedUserId — identity source', () => {
  it('returns null when no Authorization header is present', async () => {
    const request = new MockNextRequest() as any;
    expect(await getAuthenticatedUserId(request)).toBeNull();
  });

  it('returns null for an invalid/forged token', async () => {
    const request = new MockNextRequest({ Authorization: 'Bearer not-a-real-token' }) as any;
    expect(await getAuthenticatedUserId(request)).toBeNull();
  });

  it('IGNORES a forged x-user-id header entirely — this is the vulnerability being closed', async () => {
    const request = new MockNextRequest({ 'x-user-id': 'some-admin-id-attacker-guessed' }) as any;
    expect(await getAuthenticatedUserId(request)).toBeNull();
  });

  it('returns the userId encoded in a valid, verified JWT', async () => {
    const request = new MockNextRequest({ Authorization: `Bearer ${tokenFor('user-42')}` }) as any;
    expect(await getAuthenticatedUserId(request)).toBe('user-42');
  });

  it('a valid JWT for one user cannot be paired with a forged x-user-id for a different (e.g. admin) user', async () => {
    // Even if both headers are present, the JWT's own subject wins — proving
    // the x-user-id header has no influence on the resolved identity at all.
    const request = new MockNextRequest({
      Authorization: `Bearer ${tokenFor('regular-user-1')}`,
      'x-user-id': 'super-admin-id',
    }) as any;
    expect(await getAuthenticatedUserId(request)).toBe('regular-user-1');
  });
});

describe('checkPermission — end-to-end gate behavior', () => {
  it('rejects with 401 when unauthenticated', async () => {
    const request = new MockNextRequest() as any;
    const result = await checkPermission(request, 'COSTS_VIEW', 'view');
    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(401);
  });

  it('rejects with 401 a forged x-user-id header pointing at a real admin, with no token', async () => {
    const request = new MockNextRequest({ 'x-user-id': 'admin-1' }) as any;
    const result = await checkPermission(request, 'PERMISSIONS_MANAGE', 'create');
    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(401);
    // hasPermission must never even be consulted — prisma.user.findUnique
    // should not have been called with the forged id.
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects with 403 an authenticated user without the required permission', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ role: 'BUYER', isActive: true });
    (prisma.userPermission.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const request = new MockNextRequest({ Authorization: `Bearer ${tokenFor('buyer-1')}` }) as any;
    const result = await checkPermission(request, 'COSTS_VIEW', 'view');
    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(403);
  });

  it('authorizes an ADMIN via the role short-circuit in hasPermission (no explicit grant row needed)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ role: 'ADMIN', isActive: true });
    const request = new MockNextRequest({ Authorization: `Bearer ${tokenFor('admin-1')}` }) as any;
    const result = await checkPermission(request, 'COSTS_VIEW', 'view');
    expect(result.authorized).toBe(true);
    expect(result.userId).toBe('admin-1');
  });

  it('authorizes a non-admin user who has an explicit, unexpired, matching grant', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ role: 'MANAGER', isActive: true });
    (prisma.userPermission.findUnique as jest.Mock).mockResolvedValueOnce({
      canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canExport: false, expiresAt: null,
    });
    const request = new MockNextRequest({ Authorization: `Bearer ${tokenFor('manager-1')}` }) as any;
    const result = await checkPermission(request, 'COSTS_VIEW', 'view');
    expect(result.authorized).toBe(true);
  });

  it('rejects a deactivated user even with a valid signed token and a real userId', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ role: 'ADMIN', isActive: false });
    const request = new MockNextRequest({ Authorization: `Bearer ${tokenFor('admin-1')}` }) as any;
    const result = await checkPermission(request, 'COSTS_VIEW', 'view');
    expect(result.authorized).toBe(false);
    expect(result.response?.status).toBe(403);
  });
});

describe('requirePermission — throwing variant', () => {
  it('throws a PermissionError carrying a 401 response when unauthenticated', async () => {
    const request = new MockNextRequest() as any;
    await expect(requirePermission(request, 'COSTS_VIEW', 'view')).rejects.toBeInstanceOf(PermissionError);
  });

  it('resolves with the userId when authorized', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ role: 'ADMIN', isActive: true });
    const request = new MockNextRequest({ Authorization: `Bearer ${tokenFor('admin-9')}` }) as any;
    await expect(requirePermission(request, 'COSTS_VIEW', 'view')).resolves.toBe('admin-9');
  });
});
