/**
 * @jest-environment node
 */
// __tests__/partner/partner-auth-consolidation.test.ts
// Verifies P2-4 (ADR-009): partner/dashboard and partner/profits no longer
// use a bespoke, hand-duplicated verifyPartner() (JWT-only, no DB
// active-status check) — both now use the canonical requirePartner()
// (lib/auth.ts), which re-verifies the account against the database.

const mockPrismaClient = {
  partner: { findFirst: jest.fn() },
  profitDistribution: { findMany: jest.fn(), count: jest.fn() },
  profitReport: { findMany: jest.fn(), count: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const mockRequirePartner = jest.fn();
jest.mock('@/lib/auth', () => ({
  requirePartner: (...args: any[]) => mockRequirePartner(...args),
}));

import { GET as dashboardGET } from '@/app/api/partner/dashboard/route';
import { GET as profitsGET } from '@/app/api/partner/profits/route';

function req(url: string) {
  return {
    headers: { get: () => 'Bearer faketoken' },
    nextUrl: new URL(url),
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default resolved values so a null Partner record (the case these tests
  // exercise) exercises the real seller-tolerant code path instead of
  // crashing on an unmocked `undefined` return (Amazon-Style Wholesale
  // Platform Gap Closure — Phase 4 part 4 stopped short-circuiting to a 404
  // here, so these routes now reach further into their query logic).
  mockPrismaClient.profitReport.findMany.mockResolvedValue([]);
  mockPrismaClient.profitDistribution.findMany.mockResolvedValue([]);
  mockPrismaClient.profitDistribution.count.mockResolvedValue(0);
});

describe('GET /api/partner/dashboard', () => {
  it('rejects when requirePartner throws (unauthenticated / wrong role)', async () => {
    mockRequirePartner.mockRejectedValueOnce(
      new Response(JSON.stringify({ error: 'Partner/Seller access required' }), { status: 403 })
    );

    const response = await dashboardGET(req('http://localhost/api/partner/dashboard'));
    expect(response.status).toBe(403);
  });

  it("looks up the Partner record by the authenticated user's userId (preferred) or email (fallback), and no longer 404s when none is linked", async () => {
    mockRequirePartner.mockResolvedValueOnce({ id: 'user-1', email: 'partner@example.com' });
    mockPrismaClient.partner.findFirst.mockResolvedValueOnce(null);

    const response = await dashboardGET(req('http://localhost/api/partner/dashboard'));

    expect(mockPrismaClient.partner.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ userId: 'user-1' }, { email: 'partner@example.com' }] },
      })
    );
    expect(response.status).toBe(200);
  });
});

describe('GET /api/partner/profits', () => {
  it('rejects when requirePartner throws (unauthenticated / wrong role)', async () => {
    mockRequirePartner.mockRejectedValueOnce(
      new Response(JSON.stringify({ error: 'Partner/Seller access required' }), { status: 403 })
    );

    const response = await profitsGET(req('http://localhost/api/partner/profits'));
    expect(response.status).toBe(403);
  });

  it("looks up the Partner record by the authenticated user's userId (preferred) or email (fallback), and no longer 404s when none is linked", async () => {
    mockRequirePartner.mockResolvedValueOnce({ id: 'user-2', email: 'partner2@example.com' });
    mockPrismaClient.partner.findFirst.mockResolvedValueOnce(null);

    const response = await profitsGET(req('http://localhost/api/partner/profits'));

    expect(mockPrismaClient.partner.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ userId: 'user-2' }, { email: 'partner2@example.com' }] },
      })
    );
    expect(response.status).toBe(200);
  });
});
