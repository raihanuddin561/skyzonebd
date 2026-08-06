/**
 * @jest-environment node
 */
// __tests__/admin/partners-capital-contribution.test.ts
//
// Amazon-style gap-closure Phase 3 part 3: POST /api/admin/partners now
// posts a real INVESTMENT ledger entry for the starting capital when
// initialInvestment is provided at creation — Partner.initialInvestment
// itself is never edited again after this.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  partner: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
  financialLedger: { create: jest.fn().mockResolvedValue({ id: 'ledger-1' }) },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { POST } from '@/app/api/admin/partners/route';

function req(body: any) {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
  mockPrismaClient.partner.findMany.mockResolvedValue([]);
});

it('posts a CREDIT INVESTMENT ledger entry when initialInvestment is provided', async () => {
  mockPrismaClient.partner.create.mockResolvedValue({
    id: 'p1', name: 'Acme Partner', profitSharePercentage: 20, initialInvestment: 10000,
  });

  const res = await POST(req({ name: 'Acme Partner', profitSharePercentage: 20, initialInvestment: 10000 }));

  expect(res.status).toBe(200);
  expect(mockPrismaClient.financialLedger.create).toHaveBeenCalledTimes(1);
  const entry = mockPrismaClient.financialLedger.create.mock.calls[0][0].data;
  expect(entry.sourceType).toBe('INVESTMENT');
  expect(entry.direction).toBe('CREDIT');
  expect(entry.amount).toBe(10000);
  expect(entry.sourceId).toBe('p1');
});

it('does not post a ledger entry when no initialInvestment is provided', async () => {
  mockPrismaClient.partner.create.mockResolvedValue({
    id: 'p2', name: 'No-Capital Partner', profitSharePercentage: 10, initialInvestment: null,
  });

  const res = await POST(req({ name: 'No-Capital Partner', profitSharePercentage: 10 }));

  expect(res.status).toBe(200);
  expect(mockPrismaClient.financialLedger.create).not.toHaveBeenCalled();
});
