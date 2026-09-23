import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getJwtSecret } from '@/lib/auth';
import { rateLimiters, withRateLimit } from '@/lib/rate-limiter';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// A fixed, precomputed hash used to run a dummy bcrypt.compare when no user
// is found, so the "no such account" path takes comparable time to the
// "account exists, password mismatch" path. Without this, response timing
// alone lets an attacker enumerate which emails have accounts.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('placeholder-timing-guard', 10);

export async function POST(request: NextRequest) {
  return withRateLimit(request, rateLimiters.auth, () => handleLogin(request));
}

async function handleLogin(request: NextRequest): Promise<NextResponse> {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        companyName: true,
        phone: true,
        role: true,
        userType: true,
        isVerified: true,
        isActive: true,
        createdAt: true
      }
    });
    
    if (!user) {
      // Run a dummy comparison so this branch takes comparable time to the
      // "user exists, password mismatch" branch below — otherwise the
      // faster response here leaks which emails have accounts.
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Generate JWT token
    const token = sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role // Keep original case (ADMIN, SUPER_ADMIN, etc.)
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: {
        ...userWithoutPassword,
        role: user.role, // Keep original case
        userType: user.userType // Keep original case
      },
      token
    });

  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}