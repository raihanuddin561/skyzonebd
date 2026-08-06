/**
 * @jest-environment node
 */
// __tests__/admin/partners-ownership-history.test.ts
//
// Amazon-style gap-closure Phase 3 part 3: PATCH /api/admin/partners/[id]
// now logs an ActivityLog entry whenever profitSharePercentage actually
// changes — previously a mutable field with zero history despite being
// the basis for every partner's payout.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  partner: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const logActivity = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/activityLogger', () => ({ logActivity: (...args: any[]) => logActivity(...args) }));

import { PATCH } from '@/app/api/admin/partners/[id]/route';

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
  mockPrismaClient.partner.findMany.mockResolvedValue([]);
});

it('logs old -> new percentage when profitSharePercentage actually changes', async () => {
  mockPrismaClient.partner.findUnique.mockResolvedValue({ profitSharePercentage: 10 });
  mockPrismaClient.partner.update.mockResolvedValue({ id: 'p1', name: 'Acme Partner', profitSharePercentage: 15 });

  const res = await PATCH(req({ profitSharePercentage: 15 }), params('p1'));

  expect(res.status).toBe(200);
  expect(logActivity).toHaveBeenCalledTimes(1);
  const logArg = logActivity.mock.calls[0][0];
  expect(logArg.entityType).toBe('Partner');
  expect(logArg.metadata).toEqual({ field: 'profitSharePercentage', oldValue: 10, newValue: 15 });
  expect(logArg.description).toMatch(/10%.*15%/);
});

it('does not log when profitSharePercentage is not part of the request', async () => {
  mockPrismaClient.partner.update.mockResolvedValue({ id: 'p1', name: 'Acme Partner', profitSharePercentage: 10 });

  await PATCH(req({ name: 'New Name' }), params('p1'));

  expect(logActivity).not.toHaveBeenCalled();
  expect(mockPrismaClient.partner.findUnique).not.toHaveBeenCalled();
});

it('does not log when the new value equals the old value', async () => {
  mockPrismaClient.partner.findUnique.mockResolvedValue({ profitSharePercentage: 10 });
  mockPrismaClient.partner.update.mockResolvedValue({ id: 'p1', name: 'Acme Partner', profitSharePercentage: 10 });

  await PATCH(req({ profitSharePercentage: 10 }), params('p1'));

  expect(logActivity).not.toHaveBeenCalled();
});
