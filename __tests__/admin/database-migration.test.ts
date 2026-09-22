/**
 * @jest-environment node
 */
// __tests__/admin/database-migration.test.ts
// Covers the admin Database Management "Schema Migrations" card.
//
// GET migration-status deliberately does NOT shell out to the Prisma CLI —
// two separate attempts at invoking it from a deployed Vercel function each
// hit a different Lambda-runtime-specific failure (see the comment at the
// top of src/lib/dbMigrationStatus.ts). It instead compares migration
// folder names read off disk against the _prisma_migrations table read via
// Prisma Client — this file mocks fs.readdirSync and prisma.$queryRaw
// accordingly, not child_process.
//
// POST /migrate still shells `prisma migrate deploy` (a real schema change,
// not yet moved off the CLI) — that part of this file still mocks exec.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn().mockResolvedValue(null) },
  activityLog: { create: jest.fn().mockResolvedValue({}) },
  $queryRaw: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

jest.mock('@/lib/activityLogger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

// Two migration folders on disk; which ones count as "applied" is
// controlled per-test via mockPrismaClient.$queryRaw's return value.
const ALL_MIGRATION_FOLDERS = ['20251031162814_add_hero_slides', '20260101000000_add_thing'];

jest.mock('fs', () => ({
  __esModule: true,
  default: {
    readdirSync: jest.fn((_dir: string, _opts: any) =>
      ALL_MIGRATION_FOLDERS.map((name) => ({ name, isDirectory: () => true }))
    ),
  },
}));

let execFailure: 'connection_error' | null = null;
jest.mock('child_process', () => ({
  exec: jest.fn((cmd: string, _opts: any, cb: any) => {
    if (cmd.includes('migrate deploy')) {
      if (execFailure === 'connection_error') return cb(new Error("Can't reach database server"));
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

// Both migrations applied -> up_to_date. Tests override with mockResolvedValueOnce for other cases.
beforeEach(() => {
  jest.clearAllMocks();
  execFailure = null;
  mockPrismaClient.$queryRaw.mockResolvedValue(
    ALL_MIGRATION_FOLDERS.map((migration_name) => ({ migration_name }))
  );
});

describe('GET /api/admin/database/migration-status', () => {
  it('rejects no token (401)', async () => {
    expect((await GET(req())).status).toBe(401);
  });

  it('rejects non-admin (403)', async () => {
    expect((await GET(req({ nonAdminRole: 'BUYER' }))).status).toBe(403);
  });

  it('reports up_to_date when every folder on disk has a matching applied row', async () => {
    const res = await GET(req({ admin: true }));
    const body = await res.json();
    expect(body.status).toBe('up_to_date');
    expect(body.pendingMigrations).toEqual([]);
  });

  it('reports pending with the folder name missing from _prisma_migrations', async () => {
    mockPrismaClient.$queryRaw.mockResolvedValueOnce([{ migration_name: ALL_MIGRATION_FOLDERS[0] }]);
    const res = await GET(req({ admin: true }));
    const body = await res.json();
    expect(body.status).toBe('pending');
    expect(body.pendingMigrations).toEqual([ALL_MIGRATION_FOLDERS[1]]);
  });

  it('queries only finished, non-rolled-back rows as "applied"', async () => {
    await GET(req({ admin: true }));
    const sqlCall = mockPrismaClient.$queryRaw.mock.calls[0].join(' ');
    expect(sqlCall).toMatch(/finished_at IS NOT NULL/);
    expect(sqlCall).toMatch(/rolled_back_at IS NULL/);
  });

  it('reports unknown (not up_to_date) when the database query fails — fails closed', async () => {
    mockPrismaClient.$queryRaw.mockRejectedValueOnce(new Error('relation "_prisma_migrations" does not exist'));
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
    const res = await POST(req({ admin: true }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('applies migrations and logs activity when genuinely pending', async () => {
    mockPrismaClient.$queryRaw.mockResolvedValueOnce([{ migration_name: ALL_MIGRATION_FOLDERS[0] }]);
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
    mockPrismaClient.$queryRaw.mockRejectedValueOnce(new Error('connection error'));
    const res = await POST(req({ admin: true }));
    expect(res.status).toBe(409);
  });
});
