/**
 * @jest-environment node
 */
// __tests__/lib/jwt-secret.test.ts
// Verifies the P0-7 fix: getJwtSecret() throws (rather than silently
// returning a guessable, hardcoded literal) when JWT_SECRET is unset, and
// verifyToken() fails closed (returns null, not a forged-secret-verified
// token) in that situation.

import jwt from 'jsonwebtoken';

// This file intentionally does NOT mock @/lib/prisma with a full client,
// since getJwtSecret()/verifyToken() never touch the database.
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: {},
  default: {},
}));

import { getJwtSecret, verifyToken } from '@/lib/auth';

describe('getJwtSecret', () => {
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('returns the configured secret when JWT_SECRET is set', () => {
    process.env.JWT_SECRET = 'a-real-configured-secret';
    expect(getJwtSecret()).toBe('a-real-configured-secret');
  });

  it('throws — never returns a hardcoded fallback — when JWT_SECRET is unset', () => {
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow('JWT_SECRET is not configured');
  });

  it('never returns any of the previously-hardcoded fallback literals', () => {
    process.env.JWT_SECRET = 'whatever-is-actually-configured';
    const result = getJwtSecret();
    expect(result).not.toBe('fallback-secret');
    expect(result).not.toBe('secret');
  });
});

describe('verifyToken — fails closed when JWT_SECRET is unset', () => {
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('returns null (not a verified payload) for a real token if JWT_SECRET is unset at verify time', () => {
    process.env.JWT_SECRET = 'secret-used-to-sign';
    const token = jwt.sign({ userId: 'user-1' }, 'secret-used-to-sign');

    delete process.env.JWT_SECRET;
    expect(verifyToken(token)).toBeNull();
  });

  it('a token forged with the old literal fallback secret is rejected once a real secret is configured', () => {
    process.env.JWT_SECRET = 'the-real-production-secret';
    const forgedToken = jwt.sign({ userId: 'attacker-controlled', role: 'SUPER_ADMIN' }, 'fallback-secret');
    expect(verifyToken(forgedToken)).toBeNull();
  });

  it('correctly verifies a token signed with the real, currently-configured secret', () => {
    process.env.JWT_SECRET = 'the-real-production-secret';
    const token = jwt.sign({ userId: 'user-1' }, 'the-real-production-secret');
    expect(verifyToken(token)).toMatchObject({ userId: 'user-1' });
  });
});
