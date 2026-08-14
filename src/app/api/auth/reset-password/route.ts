// app/api/auth/reset-password/route.ts - Complete a password reset
//
// Closes P0-9 alongside forgot-password/route.ts. Takes the raw token the
// user received by email, verifies it against the stored hash, and — only
// if it is unexpired and unused — updates the account's password.

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { rateLimiters, withRateLimit } from '@/lib/rate-limiter';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

// Unlike forgot-password and login, this endpoint had no rate limiting at
// all — the token itself is a random 32-byte value (low brute-force risk),
// but nothing stopped unlimited reset attempts per IP, unlike every other
// auth-adjacent endpoint in this app.
export async function POST(request: NextRequest) {
  return withRateLimit(request, rateLimiters.auth, () => handleResetPassword(request));
}

async function handleResetPassword(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const token = typeof body?.token === 'string' ? body.token : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    // A single generic error covers "no such token", "already used", and
    // "expired" — no need to help an attacker distinguish which case they
    // hit when probing token values.
    const invalidResponse = () =>
      NextResponse.json(
        { success: false, error: 'This password reset link is invalid or has expired' },
        { status: 400 }
      );

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return invalidResponse();
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
