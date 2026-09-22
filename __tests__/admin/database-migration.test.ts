/**
 * @jest-environment node
 */
// __tests__/admin/database-migration.test.ts
// Covers the admin Database Management "Schema Migrations" card:
// GET migration-status reports pending vs up-to-date vs unknown, and
// POST migrate is admin-gated, re-checks status server-side (never trusts
// the client), and only actually shells `prisma migrate deploy` when
// genuinely pending.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn().mockResolvedValue(null) },
  activityLog: { create: jest.fn().mockResolvedValue({}) },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

jest.mock('@/lib/activityLogger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

const UP_TO_DATE_OUTPUT = '21 migrations found in prisma/migrations\n\nDatabase schema is up to date!\n';
const PENDING_OUTPUT =
  '21 migrations found in prisma/migrations\n\nFollowing migration(s) have not yet been applied:\nmigrations/\n  └─ 20260101000000_add_thing\n\nTo apply migrations run `prisma migrate deploy`.\n';

let execBehavior: 'up_to_date' | 'pending' | 'connection_error' = 'up_to_date';

jest.mock('child_process', () => ({
  exec: jest.fn((cmd: string, _opts: any, cb: any) => {
    if (cmd.includes('migrate status')) {
      if (execBehavior === 'connection_error') {
        const err: any = new Error('P1001');
        err.stdout = '';
        err.stderr = "Can't reach database server";
        return cb(err);
      }
      if (execBehavior === 'pending') {
        const err: any = new Error('exit 1');
        err.stdout = PENDING_OUTPUT;
        err.stderr = '';
        return cb(err);
      }
      return cb(null, { stdout: UP_TO_DATE_OUTPUT, stderr: '' });
    }
    if (cmd.includes('migrate deploy')) {
      return cb(null, { stdout: 'Applied 1 migration.', stderr: '' });
    }
    return cb(new Error(`unexpected command in test: ${cmd}`));
  }),
}));

const { GET } = require('@/app/api/admin/database/migration-status/route');
const { POST } = require('@/app/api/admin/database/migrate/route');

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
  constructor(url: string, options?: { headers?: Record<string, string>; body?: any }) {
    const normalized: Record<string, string> = {};
    if (options?.headers) Object.entries(options.headers).forEach(([k, v]) => { normalized[k.toLowerCase()] = v; });
    this.headers = new MockHeaders(normalized);
    this.url = url;
    this.body = options?.body;
  }
  async json() { return this.body; }
}

function tokenFor() {
  return jwt.sign({ userId: 'actor-1' }, JWT_SECRET);
}

function mockActor(role: string) {
  mockPrismaClient.user.findUnique.mockResolvedValueOnce({
    id: 'actor-1', email: 'actor@example.com', name: 'Actor', role, userType: 'WHOLESALE', isActive: true,
  });
}

function req(opts?: { admin?: boolean; nonAdminRole?: string; body?: any }) {
  if (!opts || (!opts.admin && !opts.nonAdminRole)) {
    return new MockNextRequest('http://x/api/admin/database/migrate', { body: opts?.body }) as any;
  }
  const role = opts.admin ? 'ADMIN' : (opts.nonAdminRole as string);
  mockActor(role);
  return new MockNextRequest('http://x/api/admin/database/migrate', {
    headers: { Authorization: `Bearer ${tokenFor()}` },
    body: opts.body,
  }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  execBehavior = 'up_to_date';
});

describe('GET /api/admin/database/migration-status', () => {
  it('rejects no token (401)', async () => {
    expect((await GET(req())).status).toBe(401);
  });

  it('rejects non-admin (403)', async () => {
    expect((await GET(req({ nonAdminRole: 'BUYER' }))).status).toBe(403);
  });

  it('reports up_to_date when the schema has nothing pending', async () => {
    execBehavior = 'up_to_date';
    const res = await GET(req({ admin: true }));
    const body = await res.json();
    expect(body.status).toBe('up_to_date');
  });

  it('reports pending with migration names when something is unapplied', async () => {
    execBehavior = 'pending';
    const res = await GET(req({ admin: true }));
    const body = await res.json();
    expect(body.status).toBe('pending');
    expect(body.pendingMigrations).toContain('20260101000000_add_thing');
  });

  it('reports unknown (not up_to_date) on a connection/parse failure — fails closed', async () => {
    execBehavior = 'connection_error';
    const res = await GET(req({ admin: true }));
    const body = await res.json();
    expect(body.status).toBe('unknown');
  });
});

describe('POST /api/admin/database/migrate', () => {
  it('rejects no token (401)', async () => {
    expect((await POST(req())).status).toBe(401);
  });

  it('rejects non-admin (403)', async () => {
    expect((await POST(req({ nonAdminRole: 'BUYER' }))).status).toBe(403);
  });

  it('refuses to run (409) when the server-side check finds nothing pending, even if asked to run', async () => {
    execBehavior = 'up_to_date';
    const res = await POST(req({ admin: true }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('applies migrations and logs activity when genuinely pending', async () => {
    execBehavior = 'pending';
    const res = await POST(req({ admin: true }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    const { logActivity } = require('@/lib/activityLogger');
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', entityType: 'Database' })
    );
  });

  it('refuses to run (409) when status cannot be determined — fails closed', async () => {
    execBehavior = 'connection_error';
    const res = await POST(req({ admin: true }));
    expect(res.status).toBe(409);
  });
});
