/**
 * @jest-environment node
 */
// __tests__/config/migration-secret-fallback.test.ts
//
// Fresh Production Readiness Audit (2026-07-18) confirmed a P0: both
// src/app/api/migrate/route.ts and src/app/api/db-sync/route.ts guarded
// themselves with `process.env.MIGRATION_SECRET_KEY || 'your-secret-key-here'`
// — a hardcoded fallback literal (published in .env.example) that would
// become a public, unauthenticated bearer token for triggering
// `prisma migrate deploy` or dumping table/record counts if the real env
// var was ever unset in a deployed environment. This was flagged as a
// "Medium" finding in the original docs/architecture-review/08_Security_Assessment.md
// §3 but never carried into the P0 remediation wave (which only fixed
// JWT_SECRET's equivalent fallback) — it fell through the process.
//
// Fixed to match lib/auth.ts's getJwtSecret() fail-closed doctrine: no
// MIGRATION_SECRET_KEY configured means every request is rejected, even one
// that supplies the literal former-fallback string.

// Mock only child_process.exec (callback-style) and let the real util.promisify
// wrap it — mocking the whole `util` module is unsafe, since Node internals and
// other dependencies rely on its other exports.
const execMock = jest.fn((_cmd: string, callback: (err: any, stdout: string, stderr: string) => void) => {
  callback(null, 'ok', '');
});
jest.mock('child_process', () => ({ exec: (...args: any[]) => (execMock as any)(...args) }));

const mockPrismaClient = {
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $queryRaw: jest.fn().mockResolvedValue([]),
  user: { count: jest.fn().mockResolvedValue(0) },
  product: { count: jest.fn().mockResolvedValue(0) },
  category: { count: jest.fn().mockResolvedValue(0) },
  order: { count: jest.fn().mockResolvedValue(0) },
};
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

function makeRequest(authHeader: string | null) {
  return {
    headers: { get: (name: string) => (name.toLowerCase() === 'authorization' ? authHeader : null) },
  } as any;
}

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  execMock.mockImplementation((_cmd: string, callback: (err: any, stdout: string, stderr: string) => void) => {
    callback(null, 'ok', '');
  });
  process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('POST/GET /api/migrate — fails closed when MIGRATION_SECRET_KEY is unset', () => {
  it('rejects every request, including the former hardcoded-fallback literal, when the env var is unset', async () => {
    delete process.env.MIGRATION_SECRET_KEY;
    const { POST, GET } = require('@/app/api/migrate/route');

    const withFormerFallback = await POST(makeRequest('Bearer your-secret-key-here'));
    expect(withFormerFallback.status).toBe(401);

    const withNoHeader = await GET(makeRequest(null));
    expect(withNoHeader.status).toBe(401);

    expect(execMock).not.toHaveBeenCalled();
  });

  it('accepts the correct token and rejects an incorrect one once the env var is set', async () => {
    process.env.MIGRATION_SECRET_KEY = 'a-real-secret';
    const { POST } = require('@/app/api/migrate/route');

    const wrong = await POST(makeRequest('Bearer not-the-real-secret'));
    expect(wrong.status).toBe(401);
    expect(execMock).not.toHaveBeenCalled();

    const correct = await POST(makeRequest('Bearer a-real-secret'));
    expect(correct.status).toBe(200);
    expect(execMock).toHaveBeenCalledWith('npx prisma migrate deploy', expect.any(Function));
  });
});

describe('POST/GET /api/db-sync — fails closed when MIGRATION_SECRET_KEY is unset', () => {
  it('rejects every request, including the former hardcoded-fallback literal, when the env var is unset', async () => {
    delete process.env.MIGRATION_SECRET_KEY;
    const { POST, GET } = require('@/app/api/db-sync/route');

    const withFormerFallback = await POST(makeRequest('Bearer your-secret-key-here'));
    expect(withFormerFallback.status).toBe(401);

    const withNoHeader = await GET(makeRequest(null));
    expect(withNoHeader.status).toBe(401);

    expect(mockPrismaClient.$connect).not.toHaveBeenCalled();
  });

  it('accepts the correct token once the env var is set', async () => {
    process.env.MIGRATION_SECRET_KEY = 'a-real-secret';
    const { GET } = require('@/app/api/db-sync/route');

    const res = await GET(makeRequest('Bearer a-real-secret'));
    expect(res.status).toBe(200);
    expect(mockPrismaClient.$connect).toHaveBeenCalled();
  });
});
