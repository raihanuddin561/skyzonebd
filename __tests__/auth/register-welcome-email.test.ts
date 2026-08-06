/**
 * @jest-environment node
 */
// __tests__/auth/register-welcome-email.test.ts
//
// Amazon-style gap-closure Phase 4 part 1: sendWelcomeEmail existed but
// was never called from anywhere — confirmed dead code. Now wired into
// registration, best-effort (a failed send must not fail registration).

const mockPrismaClient: any = {
  user: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn() },
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

jest.mock('@/lib/rate-limiter', () => ({
  rateLimiters: { auth: {} },
  withRateLimit: (_req: any, _limiter: any, handler: () => Promise<any>) => handler(),
}));

jest.mock('@/lib/auth', () => ({ getJwtSecret: () => 'test-secret' }));

const sendWelcomeEmail = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/email', () => ({
  emailService: { sendWelcomeEmail: (...args: any[]) => sendWelcomeEmail(...args) },
}));

import { POST } from '@/app/api/auth/register/route';

function req(body: any) {
  return { json: async () => body } as any;
}

const validBody = { name: 'New User', email: 'new@example.com', password: 'password123', companyName: 'Acme', phone: '017xxxxxxxx' };

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.user.findUnique.mockResolvedValue(null);
});

it('sends a welcome email with the new user\'s name/email/userType after successful registration', async () => {
  mockPrismaClient.user.create.mockResolvedValue({
    id: 'user-1', name: 'New User', email: 'new@example.com', companyName: 'Acme', phone: '017xxxxxxxx',
    role: 'BUYER', userType: 'RETAIL', isVerified: false, isActive: true, createdAt: new Date(),
  });

  const res = await POST(req(validBody));

  expect(res.status).toBe(201);
  expect(sendWelcomeEmail).toHaveBeenCalledWith('new@example.com', 'New User', 'RETAIL');
});

it('still returns 201 even if the welcome email fails to send', async () => {
  mockPrismaClient.user.create.mockResolvedValue({
    id: 'user-2', name: 'New User', email: 'new2@example.com', companyName: 'Acme', phone: '017xxxxxxxx',
    role: 'BUYER', userType: 'RETAIL', isVerified: false, isActive: true, createdAt: new Date(),
  });
  sendWelcomeEmail.mockResolvedValueOnce({ success: false, error: 'provider down' });

  const res = await POST(req({ ...validBody, email: 'new2@example.com' }));

  expect(res.status).toBe(201);
  const body = await res.json();
  expect(body.success).toBe(true);
});

it('does not attempt registration (or send an email) when the email already exists', async () => {
  mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'existing-user' });

  const res = await POST(req(validBody));

  expect(res.status).toBe(409);
  expect(sendWelcomeEmail).not.toHaveBeenCalled();
});
