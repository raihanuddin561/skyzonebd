/**
 * @jest-environment node
 */
// __tests__/admin/partners-contributions-endpoint.test.ts
//
// Amazon-style gap-closure Phase 3 part 3: POST /api/admin/partners/[id]/
// contributions records additional capital events (after the initial
// investment) as real ledger entries, not Partner field edits.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  partner: { findUnique: jest.fn() },
  financialLedger: { create: jest.fn().mockResolvedValue({ id: 'ledger-1' }), findMany: jest.fn().mockResolvedValue([]) },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { GET, POST } from '@/app/api/admin/partners/[id]/contributions/route';

function req(body?: any) {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
  mockPrismaClient.partner.findUnique.mockResolvedValue({ id: 'p1', name: 'Acme Partner' });
});

it('records a contribution and returns 201', async () => {
  const res = await POST(req({ amount: 3000, direction: 'INVESTMENT', notes: 'Q3 top-up' }), params('p1'));

  expect(res.status).toBe(201);
  expect(mockPrismaClient.financialLedger.create).toHaveBeenCalledTimes(1);
  const entry = mockPrismaClient.financialLedger.create.mock.calls[0][0].data;
  expect(entry.sourceType).toBe('INVESTMENT');
  expect(entry.amount).toBe(3000);
});

it('records a withdrawal and returns 201', async () => {
  const res = await POST(req({ amount: 1000, direction: 'WITHDRAWAL' }), params('p1'));

  expect(res.status).toBe(201);
  const entry = mockPrismaClient.financialLedger.create.mock.calls[0][0].data;
  expect(entry.sourceType).toBe('WITHDRAWAL');
  expect(entry.direction).toBe('DEBIT');
});

it('rejects a non-positive amount (400)', async () => {
  const res = await POST(req({ amount: 0, direction: 'INVESTMENT' }), params('p1'));
  expect(res.status).toBe(400);
  expect(mockPrismaClient.financialLedger.create).not.toHaveBeenCalled();
});

it('rejects an invalid direction (400)', async () => {
  const res = await POST(req({ amount: 100, direction: 'REFUND' }), params('p1'));
  expect(res.status).toBe(400);
});

it('404s for a nonexistent partner', async () => {
  mockPrismaClient.partner.findUnique.mockResolvedValue(null);
  const res = await POST(req({ amount: 100, direction: 'INVESTMENT' }), params('nonexistent'));
  expect(res.status).toBe(404);
});

it('GET lists the partner\'s capital-event history from the ledger', async () => {
  mockPrismaClient.financialLedger.findMany.mockResolvedValue([
    { id: 'l1', sourceType: 'INVESTMENT', amount: 5000 },
  ]);

  const res = await GET(req(), params('p1'));
  const body = await res.json();

  expect(res.status).toBe(200);
  expect(body.data).toHaveLength(1);
  const whereArg = mockPrismaClient.financialLedger.findMany.mock.calls[0][0].where;
  expect(whereArg.sourceId).toBe('p1');
  expect(whereArg.sourceType.in).toEqual(['INVESTMENT', 'WITHDRAWAL']);
});
