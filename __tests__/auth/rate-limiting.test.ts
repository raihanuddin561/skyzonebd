/**
 * @jest-environment node
 */
// __tests__/auth/rate-limiting.test.ts
// Verifies P2-6: login, register, and forgot-password are now wired through
// rateLimiters.auth (10 requests / 15 min per IP+UA), which previously
// existed fully built in lib/rate-limiter.ts but was wired into zero
// routes. Exercises the real limiter (no mocking of lib/rate-limiter) to
// prove actual throttling behavior, not just that a function was called.

const mockPrismaClient = {
  user: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({
      id: 'user-1', name: 'A', email: 'a@example.com', companyName: 'Co',
      phone: '123', role: 'BUYER', userType: 'RETAIL', isVerified: false,
      isActive: true, createdAt: new Date(),
    }),
  },
  passwordResetToken: { deleteMany: jest.fn(), create: jest.fn() },
  $transaction: jest.fn().mockResolvedValue([{}, {}]),
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

jest.mock('@/lib/email', () => ({
  emailService: {
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: jest.fn().mockResolvedValue({ success: true }),
  },
}));

import { POST as loginPOST } from '@/app/api/auth/login/route';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as forgotPasswordPOST } from '@/app/api/auth/forgot-password/route';

// Each test uses a distinct fake IP so the in-memory rate-limit bucket
// (module-level, shared across this whole test file) doesn't leak between
// cases.
function req(body: any, ip: string) {
  return {
    headers: {
      get: (key: string) => {
        if (key.toLowerCase() === 'x-forwarded-for') return ip;
        if (key.toLowerCase() === 'user-agent') return 'jest-test-agent';
        return null;
      },
    },
    json: async () => body,
  } as any;
}

describe('auth rate limiting (P2-6)', () => {
  it('login: the 11th request within the window is rejected with 429', async () => {
    const ip = '10.0.0.1';
    const results = [];
    for (let i = 0; i < 11; i++) {
      results.push(await loginPOST(req({ email: 'x@example.com', password: 'wrong' }, ip)));
    }

    const statuses = results.map(r => r.status);
    expect(statuses.slice(0, 10).every(s => s === 401)).toBe(true); // "Invalid credentials", not rate-limited
    expect(statuses[10]).toBe(429);
  });

  it('register: the 11th request within the window is rejected with 429', async () => {
    const ip = '10.0.0.2';
    const results = [];
    for (let i = 0; i < 11; i++) {
      results.push(
        await registerPOST(
          req({ name: 'A', email: `a${i}@example.com`, password: 'pw', companyName: 'Co', phone: '123' }, ip)
        )
      );
    }

    const statuses = results.map(r => r.status);
    expect(statuses.slice(0, 10).every(s => s === 201)).toBe(true); // registration succeeded, not rate-limited
    expect(statuses[10]).toBe(429);
  });

  it('forgot-password: the 11th request within the window is rejected with 429', async () => {
    const ip = '10.0.0.3';
    const results = [];
    for (let i = 0; i < 11; i++) {
      results.push(await forgotPasswordPOST(req({ email: 'x@example.com' }, ip)));
    }

    const statuses = results.map(r => r.status);
    expect(statuses.slice(0, 10).every(s => s === 200)).toBe(true); // generic "if an account exists" response, not rate-limited
    expect(statuses[10]).toBe(429);
  });

  it('different IPs get independent rate-limit buckets', async () => {
    const first = await loginPOST(req({ email: 'x@example.com', password: 'wrong' }, '10.0.0.100'));
    const second = await loginPOST(req({ email: 'x@example.com', password: 'wrong' }, '10.0.0.101'));

    expect(first.status).toBe(401); // both reach normal handling, neither rate-limited
    expect(second.status).toBe(401);
  });
});
