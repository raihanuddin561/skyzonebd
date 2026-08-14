/**
 * @jest-environment node
 */
// __tests__/auth/password-reset.test.ts
// Verifies P0-9: the forgot-password/reset-password flow the frontend has
// always called now actually exists and behaves correctly and securely —
// generic responses that don't leak account existence, hashed tokens,
// expiry/single-use enforcement, and a real password update at the end.

import { createHash } from 'crypto';

const mockPrismaClient = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  passwordResetToken: {
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const mockSendPasswordReset = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/email', () => ({
  emailService: { sendPasswordReset: (...args: any[]) => mockSendPasswordReset(...args) },
}));

// Both forgot-password and reset-password (P2-6: reset-password previously
// had no rate limiting at all, unlike every other auth-adjacent endpoint)
// share the real rateLimiters.auth singleton (10 requests/15min per
// identifier). This file's many it() blocks all funnel through the same
// mock identifier, which would otherwise exhaust that limit partway
// through the suite and turn later assertions into 429s instead of the
// 400/200s they're actually testing.
jest.mock('@/lib/rate-limiter', () => ({
  rateLimiters: { auth: {} },
  withRateLimit: (_req: any, _limiter: any, handler: () => Promise<any>) => handler(),
}));

import { prisma } from '@/lib/prisma';
import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route';
import { POST as resetPassword } from '@/app/api/auth/reset-password/route';

function makeRequest(body: any) {
  return {
    json: async () => body,
    headers: { get: () => null }, // forgot-password is now rate-limited (P2-6); its identifier lookup calls request.headers.get(...)
  } as any;
}

function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrismaClient.$transaction as jest.Mock).mockImplementation((ops: any[]) => Promise.all(ops));
});

describe('POST /api/auth/forgot-password', () => {
  it('returns the same generic success message whether or not the account exists (no enumeration)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const resNoAccount = await forgotPassword(makeRequest({ email: 'nobody@example.com' }));
    const bodyNoAccount = await resNoAccount.json();

    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'user-1', email: 'real@example.com', name: 'Real User', isActive: true,
    });
    (prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (prisma.passwordResetToken.create as jest.Mock).mockResolvedValueOnce({});
    const resRealAccount = await forgotPassword(makeRequest({ email: 'real@example.com' }));
    const bodyRealAccount = await resRealAccount.json();

    expect(resNoAccount.status).toBe(200);
    expect(resRealAccount.status).toBe(200);
    expect(bodyNoAccount.message).toBe(bodyRealAccount.message);
    expect(bodyNoAccount.success).toBe(true);
    expect(bodyRealAccount.success).toBe(true);
  });

  it('does not call the email service when no account exists for the email', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);
    await forgotPassword(makeRequest({ email: 'nobody@example.com' }));
    expect(mockSendPasswordReset).not.toHaveBeenCalled();
  });

  it('creates a token record and sends the reset email for a real, active account', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'user-1', email: 'real@example.com', name: 'Real User', isActive: true,
    });
    (prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 0 });
    (prisma.passwordResetToken.create as jest.Mock).mockResolvedValueOnce({});

    await forgotPassword(makeRequest({ email: 'real@example.com' }));

    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-1' }),
      })
    );
    // The email is sent with a RAW token, not the hash stored in the DB.
    const createArgs = (prisma.passwordResetToken.create as jest.Mock).mock.calls[0][0].data;
    expect(mockSendPasswordReset).toHaveBeenCalledWith('real@example.com', expect.any(String));
    const emailedRawToken = mockSendPasswordReset.mock.calls[0][1];
    expect(createArgs.tokenHash).toBe(hashToken(emailedRawToken));
    expect(createArgs.tokenHash).not.toBe(emailedRawToken);
  });

  it('invalidates previously-issued unused tokens before creating a new one', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'user-1', email: 'real@example.com', name: 'Real User', isActive: true,
    });
    (prisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValueOnce({ count: 1 });
    (prisma.passwordResetToken.create as jest.Mock).mockResolvedValueOnce({});

    await forgotPassword(makeRequest({ email: 'real@example.com' }));

    expect(prisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', usedAt: null },
    });
  });
});

describe('POST /api/auth/reset-password', () => {
  it('rejects a missing token or password (400)', async () => {
    const res = await resetPassword(makeRequest({ token: '', newPassword: '' }));
    expect(res.status).toBe(400);
  });

  it('rejects a password shorter than 6 characters (400)', async () => {
    const res = await resetPassword(makeRequest({ token: 'abc', newPassword: '123' }));
    expect(res.status).toBe(400);
  });

  it('rejects an unknown token (400, generic message)', async () => {
    (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const res = await resetPassword(makeRequest({ token: 'not-a-real-token', newPassword: 'newpass123' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid or has expired/i);
  });

  it('rejects an expired token (400)', async () => {
    (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'prt-1', userId: 'user-1', usedAt: null, expiresAt: new Date(Date.now() - 1000),
    });
    const res = await resetPassword(makeRequest({ token: 'expired-token', newPassword: 'newpass123' }));
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects an already-used token (400) — enforces single use', async () => {
    (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'prt-1', userId: 'user-1', usedAt: new Date(), expiresAt: new Date(Date.now() + 1000 * 60),
    });
    const res = await resetPassword(makeRequest({ token: 'already-used-token', newPassword: 'newpass123' }));
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('accepts a valid, unexpired, unused token — updates the password and marks the token used', async () => {
    (prisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'prt-1', userId: 'user-1', usedAt: null, expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    });
    (prisma.user.update as jest.Mock).mockResolvedValueOnce({ id: 'user-1' });
    (prisma.passwordResetToken.update as jest.Mock).mockResolvedValueOnce({ id: 'prt-1', usedAt: new Date() });

    const res = await resetPassword(makeRequest({ token: 'a-valid-token', newPassword: 'newpass123' }));
    expect(res.status).toBe(200);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } })
    );
    // The stored password must be a bcrypt hash, never the plaintext.
    const updateArgs = (prisma.user.update as jest.Mock).mock.calls[0][0];
    expect(updateArgs.data.password).not.toBe('newpass123');
    expect(updateArgs.data.password.length).toBeGreaterThan(20);

    expect(prisma.passwordResetToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'prt-1' }, data: expect.objectContaining({ usedAt: expect.any(Date) }) })
    );
  });
});
