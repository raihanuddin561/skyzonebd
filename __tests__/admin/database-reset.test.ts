/**
 * @jest-environment node
 */
// __tests__/admin/database-reset.test.ts
// The most destructive endpoint in the app — covers: plain ADMIN is
// rejected (super-admin only, matching the bulk-user-delete/partner-delete
// tiering elsewhere), the typed-confirmation phrase is required exactly,
// reseed is fully opt-in, and a successful reset writes the high-visibility
// audit log entry.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn().mockResolvedValue(null) },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

jest.mock('@/lib/activityLogger', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

const execCalls: string[] = [];
jest.mock('child_process', () => ({
  exec: jest.fn((cmd: string, _opts: any, cb: any) => {
    execCalls.push(cmd);
    if (cmd.includes('migrate reset')) return cb(null, { stdout: 'Database reset successfully.', stderr: '' });
    if (cmd.includes('db seed')) return cb(null, { stdout: 'Seeded.', stderr: '' });
    return cb(new Error(`unexpected command in test: ${cmd}`));
  }),
}));

const { POST } = require('@/app/api/admin/database/reset/route');

class MockHeaders {
  private headers: Map<string, string>;
  constructor(init?: Record<string, string>) { this.headers = new Map(Object.entries(init || {})); }
  get(name: string): string | null { return this.headers.get(name.toLowerCase()) || null; }
}

class MockNextRequest {
  public headers: MockHeaders;
  public url = 'http://x/api/admin/database/reset';
  private body: any;
  constructor(options?: { headers?: Record<string, string>; body?: any }) {
    const normalized: Record<string, string> = {};
    if (options?.headers) Object.entries(options.headers).forEach(([k, v]) => { normalized[k.toLowerCase()] = v; });
    this.headers = new MockHeaders(normalized);
    this.body = options?.body;
  }
  async json() { return this.body; }
}

function tokenFor() { return jwt.sign({ userId: 'actor-1' }, JWT_SECRET); }

function mockActor(role: string) {
  mockPrismaClient.user.findUnique.mockResolvedValueOnce({
    id: 'actor-1', email: 'actor@example.com', name: 'Actor', role, userType: 'WHOLESALE', isActive: true,
  });
}

function req(opts?: { role?: string; body?: any }) {
  if (!opts?.role) return new MockNextRequest({ body: opts?.body }) as any;
  mockActor(opts.role);
  return new MockNextRequest({ headers: { Authorization: `Bearer ${tokenFor()}` }, body: opts.body }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  execCalls.length = 0;
});

describe('POST /api/admin/database/reset', () => {
  it('rejects no token (401)', async () => {
    expect((await POST(req({ body: { confirmationText: 'DELETE ALL DATA' } }))).status).toBe(401);
  });

  it('rejects a plain ADMIN — this action is super-admin only', async () => {
    const res = await POST(req({ role: 'ADMIN', body: { confirmationText: 'DELETE ALL DATA' } }));
    expect(res.status).toBe(403);
    expect(execCalls.length).toBe(0);
  });

  it('rejects when confirmationText does not match exactly', async () => {
    const res = await POST(req({ role: 'SUPER_ADMIN', body: { confirmationText: 'delete all data' } }));
    expect(res.status).toBe(400);
    expect(execCalls.length).toBe(0);
  });

  it('rejects when confirmationText is missing entirely', async () => {
    const res = await POST(req({ role: 'SUPER_ADMIN', body: {} }));
    expect(res.status).toBe(400);
    expect(execCalls.length).toBe(0);
  });

  it('runs migrate reset only (no seed) when reseed is not set', async () => {
    const res = await POST(req({ role: 'SUPER_ADMIN', body: { confirmationText: 'DELETE ALL DATA' } }));
    expect(res.status).toBe(200);
    expect(execCalls.some((c) => c.includes('migrate reset'))).toBe(true);
    expect(execCalls.some((c) => c.includes('db seed'))).toBe(false);
  });

  it('runs migrate reset then db seed when reseed:true is explicitly requested', async () => {
    const res = await POST(req({ role: 'SUPER_ADMIN', body: { confirmationText: 'DELETE ALL DATA', reseed: true } }));
    expect(res.status).toBe(200);
    expect(execCalls.some((c) => c.includes('migrate reset'))).toBe(true);
    expect(execCalls.some((c) => c.includes('db seed'))).toBe(true);
    const body = await res.json();
    expect(body.message).toMatch(/well-known default password/i);
  });

  it('logs a DELETE/Database activity entry on success, naming who triggered it', async () => {
    await POST(req({ role: 'SUPER_ADMIN', body: { confirmationText: 'DELETE ALL DATA' } }));
    const { logActivity } = require('@/lib/activityLogger');
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DELETE',
        entityType: 'Database',
        metadata: expect.objectContaining({ triggeredBy: 'actor@example.com' }),
      })
    );
  });
});
