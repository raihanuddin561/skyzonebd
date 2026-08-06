/**
 * @jest-environment node
 */
// __tests__/admin/verification-status-email.test.ts
//
// Amazon-style gap-closure Phase 4 part 1: sendBusinessVerificationStatus
// existed but was never called from the actual approve/reject route —
// confirmed dead code. Now wired in, best-effort, and only for the real
// approve/reject decisions (not the intermediate "review" action).

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
  businessInfo: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const sendBusinessVerificationStatus = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/email', () => ({
  emailService: { sendBusinessVerificationStatus: (...args: any[]) => sendBusinessVerificationStatus(...args) },
}));

import { PATCH } from '@/app/api/admin/verification/route';

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
  mockPrismaClient.businessInfo.findUnique.mockResolvedValue({
    id: 'app-1', userId: 'cust-1',
    user: { id: 'cust-1', name: 'Wholesale Buyer', email: 'buyer@example.com', phone: null, companyName: 'Acme' },
  });
});

it('sends an APPROVED email on approve', async () => {
  const res = await PATCH(req({ applicationId: 'app-1', action: 'approve' }));

  expect(res.status).toBe(200);
  expect(sendBusinessVerificationStatus).toHaveBeenCalledWith('buyer@example.com', 'Wholesale Buyer', 'APPROVED', undefined);
});

it('sends a REJECTED email with the reason on reject', async () => {
  const res = await PATCH(req({ applicationId: 'app-1', action: 'reject', reason: 'Incomplete documents' }));

  expect(res.status).toBe(200);
  expect(sendBusinessVerificationStatus).toHaveBeenCalledWith('buyer@example.com', 'Wholesale Buyer', 'REJECTED', 'Incomplete documents');
});

it('does not send an email for the intermediate "review" action', async () => {
  await PATCH(req({ applicationId: 'app-1', action: 'review' }));

  expect(sendBusinessVerificationStatus).not.toHaveBeenCalled();
});

it('still returns success even if the email fails to send', async () => {
  sendBusinessVerificationStatus.mockResolvedValueOnce({ success: false, error: 'provider down' });

  const res = await PATCH(req({ applicationId: 'app-1', action: 'approve' }));

  expect(res.status).toBe(200);
});
