/**
 * @jest-environment node
 */
// __tests__/partner/partner-userid-link.test.ts
// Verifies ADR-008's implementation: Partner.userId (optional, nullable FK
// to User) lets an admin link a Partner record to a login account. Covers
// the validation added to admin/partners' create (POST) and update (PATCH)
// — the linked user must exist, and a user can't be linked to two Partner
// records at once.

const mockPrismaClient = {
  user: { findUnique: jest.fn() },
  partner: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
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

import { POST as createPartner } from '@/app/api/admin/partners/route';
import { PATCH as updatePartner } from '@/app/api/admin/partners/[id]/route';

function req(body: any) {
  return { json: async () => body } as any;
}

const params = Promise.resolve({ id: 'partner-1' });

beforeEach(() => {
  jest.resetAllMocks();
  mockRequireAuth.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
  mockPrismaClient.partner.findMany.mockResolvedValue([]); // no existing partners for the 100%-share check
});

describe('POST /api/admin/partners — userId link validation', () => {
  it('rejects a userId that does not correspond to any real user', async () => {
    mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);

    const res = await createPartner(req({
      name: 'Jane Investor', profitSharePercentage: 10, userId: 'does-not-exist',
    }));

    expect(res.status).toBe(400);
    expect(mockPrismaClient.partner.create).not.toHaveBeenCalled();
  });

  it('rejects a userId already linked to a different partner', async () => {
    mockPrismaClient.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });
    mockPrismaClient.partner.findUnique.mockResolvedValueOnce({ id: 'existing-partner', userId: 'user-1' });

    const res = await createPartner(req({
      name: 'Jane Investor', profitSharePercentage: 10, userId: 'user-1',
    }));

    expect(res.status).toBe(409);
    expect(mockPrismaClient.partner.create).not.toHaveBeenCalled();
  });

  it('creates the partner with the link when userId points to a real, unlinked user', async () => {
    mockPrismaClient.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });
    mockPrismaClient.partner.findUnique.mockResolvedValueOnce(null);
    mockPrismaClient.partner.create.mockResolvedValueOnce({ id: 'partner-1', userId: 'user-1' });

    const res = await createPartner(req({
      name: 'Jane Investor', profitSharePercentage: 10, userId: 'user-1',
    }));

    expect(res.status).toBe(200);
    expect(mockPrismaClient.partner.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1' }) })
    );
  });

  it('creates the partner with no link when userId is omitted (unchanged default behavior)', async () => {
    mockPrismaClient.partner.create.mockResolvedValueOnce({ id: 'partner-1', userId: null });

    const res = await createPartner(req({ name: 'Silent Partner', profitSharePercentage: 5 }));

    expect(res.status).toBe(200);
    expect(mockPrismaClient.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrismaClient.partner.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: null }) })
    );
  });
});

describe('PATCH /api/admin/partners/[id] — userId link validation', () => {
  it('rejects a userId that does not correspond to any real user', async () => {
    mockPrismaClient.user.findUnique.mockResolvedValueOnce(null);

    const res = await updatePartner(req({ userId: 'does-not-exist' }), { params });

    expect(res.status).toBe(400);
    expect(mockPrismaClient.partner.update).not.toHaveBeenCalled();
  });

  it('rejects a userId already linked to a DIFFERENT partner', async () => {
    mockPrismaClient.user.findUnique.mockResolvedValueOnce({ id: 'user-2' });
    mockPrismaClient.partner.findFirst.mockResolvedValueOnce({ id: 'some-other-partner', userId: 'user-2' });

    const res = await updatePartner(req({ userId: 'user-2' }), { params });

    expect(res.status).toBe(409);
    expect(mockPrismaClient.partner.update).not.toHaveBeenCalled();
  });

  it('allows re-saving the same partner with the same userId it already has (not a conflict with itself)', async () => {
    mockPrismaClient.user.findUnique.mockResolvedValueOnce({ id: 'user-2' });
    mockPrismaClient.partner.findFirst.mockResolvedValueOnce(null); // NOT: { id } excludes itself
    mockPrismaClient.partner.update.mockResolvedValueOnce({ id: 'partner-1', userId: 'user-2' });

    const res = await updatePartner(req({ userId: 'user-2' }), { params });

    expect(res.status).toBe(200);
  });

  it('unlinks the partner when userId is explicitly set to null', async () => {
    mockPrismaClient.partner.update.mockResolvedValueOnce({ id: 'partner-1', userId: null });

    const res = await updatePartner(req({ userId: null }), { params });

    expect(res.status).toBe(200);
    expect(mockPrismaClient.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrismaClient.partner.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: null }) })
    );
  });
});
