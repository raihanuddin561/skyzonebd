// app/api/auth/forgot-password/route.ts - Request a password reset email
//
// Closes P0-9: the frontend (src/app/auth/forgot-password/page.tsx) has
// called this endpoint since it was written, but the endpoint never existed.

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email';
import { rateLimiters, withRateLimit } from '@/lib/rate-limiter';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour, matching the email copy

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export async function POST(request: NextRequest) {
  return withRateLimit(request, rateLimiters.auth, () => handleForgotPassword(request));
}

async function handleForgotPassword(request: NextRequest): Promise<NextResponse> {
  // A single, generic response is returned in every case below (user found
  // or not, email send succeeds or fails) — this is deliberate. Returning a
  // different response for "no account with that email" vs. "reset sent"
  // would let a caller enumerate which emails have accounts, which is
  // exactly the mistake already found and fixed on a sibling endpoint
  // (POST /api/data-deletion, closed in the original security assessment).
  const genericResponse = () =>
    NextResponse.json({
      success: true,
      message: 'If an account exists for that email, password reset instructions have been sent.',
    });

  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return genericResponse();
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    // Invalidate any previous unused reset requests for this user before
    // issuing a new one, so only the most recently requested link works.
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
      }),
    ]);

    await emailService.sendPasswordReset(user.email, rawToken);

    return genericResponse();
  } catch (error) {
    console.error('Error processing forgot-password request:', error);
    // Even on an unexpected error, do not leak whether the account exists.
    return genericResponse();
  }
}
