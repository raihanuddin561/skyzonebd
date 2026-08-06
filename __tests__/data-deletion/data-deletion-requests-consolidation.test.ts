/**
 * @jest-environment node
 */
// __tests__/data-deletion/data-deletion-requests-consolidation.test.ts
// Verifies P1-6: three duplicate data-deletion endpoints are consolidated
// down to one canonical, authenticated, rate-limited, audit-logged route
// (`/api/data-deletion-requests`). The other two (`/api/data-deletion` and
// the unauthenticated `/api/data-deletion-request`, previously the ONLY one
// with a live frontend consumer — an account-deletion request required no
// verification beyond a client-supplied email + made-up phone number) are
// removed.

const mockPrismaClient = {
  dataDeletionRequest: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  dataDeletionAuditLog: {
    create: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const mockRequireAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}));

const sendDataDeletionConfirmation = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/email', () => ({
  emailService: { sendDataDeletionConfirmation: (...args: any[]) => sendDataDeletionConfirmation(...args) },
}));

import { prisma } from '@/lib/prisma';
import { POST, GET } from '@/app/api/data-deletion-requests/route';

beforeEach(() => {
  jest.clearAllMocks();
});

function req(body?: any) {
  const headers = new Map([
    ['authorization', 'Bearer faketoken'],
    ['user-agent', 'jest'],
  ]);
  return {
    headers: { get: (key: string) => headers.get(key.toLowerCase()) ?? null },
    json: async () => body,
  } as any;
}

describe('POST /api/data-deletion-requests (canonical, authenticated)', () => {
  it('rejects an unauthenticated caller before touching the database', async () => {
    mockRequireAuth.mockRejectedValueOnce(
      new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401 })
    );

    const response = await POST(req({ reason: 'I no longer need this account' }));

    expect(response.status).toBe(401);
    expect(prisma.dataDeletionRequest.create).not.toHaveBeenCalled();
  });

  it('derives the requester identity from the verified token, not the request body', async () => {
    mockRequireAuth.mockResolvedValueOnce({ id: 'user-1', email: 'real-owner@example.com' });
    (prisma.dataDeletionRequest.findFirst as jest.Mock).mockResolvedValueOnce(null);
    (prisma.dataDeletionRequest.create as jest.Mock).mockResolvedValueOnce({
      id: 'req-1', status: 'PENDING', user: { name: 'Real Owner', email: 'real-owner@example.com' },
    });

    await POST(req({ reason: 'Switching to a different platform', email: 'attacker-supplied@example.com' }));

    expect(prisma.dataDeletionRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1', email: 'real-owner@example.com' }),
      })
    );
  });

  it('sends a best-effort deletion-confirmation email (Amazon-style gap-closure Phase 4 part 1)', async () => {
    mockRequireAuth.mockResolvedValueOnce({ id: 'user-1', email: 'real-owner@example.com' });
    (prisma.dataDeletionRequest.findFirst as jest.Mock).mockResolvedValueOnce(null);
    (prisma.dataDeletionRequest.create as jest.Mock).mockResolvedValueOnce({
      id: 'req-1', status: 'PENDING', user: { name: 'Real Owner', email: 'real-owner@example.com' },
    });

    const res = await POST(req({ reason: 'Switching to a different platform' }));

    expect(res.status).toBe(201);
    expect(sendDataDeletionConfirmation).toHaveBeenCalledWith('real-owner@example.com', 'Real Owner');
  });

  it('rejects a reason shorter than 10 characters', async () => {
    mockRequireAuth.mockResolvedValueOnce({ id: 'user-1', email: 'user@example.com' });

    const response = await POST(req({ reason: 'short' }));

    expect(response.status).toBe(400);
    expect(prisma.dataDeletionRequest.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/data-deletion-requests (canonical, authenticated)', () => {
  it('rejects an unauthenticated caller', async () => {
    mockRequireAuth.mockRejectedValueOnce(
      new Response(JSON.stringify({ error: 'Authentication failed' }), { status: 401 })
    );

    const response = await GET(req());

    expect(response.status).toBe(401);
    expect(prisma.dataDeletionRequest.findMany).not.toHaveBeenCalled();
  });

  it("returns only the authenticated caller's own requests", async () => {
    mockRequireAuth.mockResolvedValueOnce({ id: 'user-1', email: 'user@example.com' });
    (prisma.dataDeletionRequest.findMany as jest.Mock).mockResolvedValueOnce([{ id: 'req-1' }]);

    await GET(req());

    expect(prisma.dataDeletionRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    );
  });
});
