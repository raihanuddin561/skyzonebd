/**
 * @jest-environment node
 */
// __tests__/admin/payouts-approved-by.test.ts
//
// Ported from the now-deleted __tests__/admin/distributions-approved-by.test.ts
// as part of Phase 3 part 1's consolidation (admin/distributions/route.ts was
// dead code — zero UI callers — and has been removed; admin/payouts/[id]/
// route.ts is now the sole canonical "mark distribution paid/approved" path).
// Proves approvedBy is always derived from the authenticated session, never
// from the request body, on this route too.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  profitDistribution: {
    update: jest.fn().mockResolvedValue({ id: 'pay1', status: 'APPROVED', partner: {} }),
    findUnique: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { PATCH } from '@/app/api/admin/payouts/[id]/route';

function req(body: any) {
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
});

it('ignores a client-supplied approvedBy and always uses the authenticated admin id', async () => {
  mockPrismaClient.profitDistribution.findUnique.mockResolvedValue({
    id: 'pay1', status: 'PENDING', notes: null, partner: { name: 'Acme', email: 'a@x.com' },
  });

  const res = await PATCH(req({ status: 'APPROVED', approvedBy: 'someone-else-entirely' }), params('pay1'));

  expect(res.status).toBe(200);
  const updateArg = (mockPrismaClient.profitDistribution.update as jest.Mock).mock.calls[0][0];
  expect(updateArg.data.approvedBy).toBe('admin-1');
  expect(updateArg.data.approvedBy).not.toBe('someone-else-entirely');
});
