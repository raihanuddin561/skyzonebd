import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getJwtSecret } from '@/lib/auth';
import { rateLimiters, withRateLimit } from '@/lib/rate-limiter';
import { emailService } from '@/lib/email';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function POST(request: NextRequest) {
  return withRateLimit(request, rateLimiters.auth, () => handleRegister(request));
}

async function handleRegister(request: NextRequest): Promise<NextResponse> {
  try {
    const { name, email, password, companyName, phone, role, userType } = await request.json();

    if (!name || !email || !password || !companyName || !phone) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Self-registration may only create BUYER or SELLER accounts with
    // RETAIL or WHOLESALE pricing — ADMIN/GUEST and other roles/types have
    // their own creation paths and must never be reachable from this public
    // endpoint. Previously this ignored the request body entirely and
    // hardcoded every signup to BUYER/RETAIL, silently discarding the
    // register page's account-type choice and its explicit WHOLESALE intent.
    const requestedRole = typeof role === 'string' ? role.toUpperCase() : 'BUYER';
    const requestedUserType = typeof userType === 'string' ? userType.toUpperCase() : 'RETAIL';
    const finalRole: 'BUYER' | 'SELLER' = requestedRole === 'SELLER' ? 'SELLER' : 'BUYER';
    const finalUserType: 'RETAIL' | 'WHOLESALE' = requestedUserType === 'WHOLESALE' ? 'WHOLESALE' : 'RETAIL';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    let newUser;
    try {
      newUser = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          password: hashedPassword,
          companyName,
          phone,
          role: finalRole,
          userType: finalUserType,
          isVerified: false,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          companyName: true,
          phone: true,
          role: true,
          userType: true,
          isVerified: true,
          isActive: true,
          createdAt: true
        }
      });
    } catch (createError) {
      // Two concurrent registrations for the same email can both pass the
      // findUnique check above; the loser of the race hits this unique
      // constraint violation instead. Surface it as the same clean 409 a
      // sequential duplicate gets, rather than a raw 500.
      if (
        createError instanceof Prisma.PrismaClientKnownRequestError &&
        createError.code === 'P2002'
      ) {
        return NextResponse.json(
          { success: false, error: 'User with this email already exists' },
          { status: 409 }
        );
      }
      throw createError;
    }

    // Best-effort welcome email (Amazon-style gap-closure Phase 4 part 1) —
    // emailService.sendEmail never throws (returns { success, error }), so
    // no try/catch is needed, but a failure here must never fail a
    // registration that already committed to the database.
    const emailResult = await emailService.sendWelcomeEmail(newUser.email, newUser.name, finalUserType as 'RETAIL' | 'WHOLESALE');
    if (!emailResult.success) {
      console.error(`Welcome email failed for ${newUser.email}: ${emailResult.error}`);
    }

    // Generate JWT token
    const token = sign(
      {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role // Keep original case (ADMIN, SUPER_ADMIN, etc.), matching login
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      user: {
        ...newUser,
        role: newUser.role, // Keep original case
        userType: newUser.userType // Keep original case
      },
      token
    }, { status: 201 });

  } catch (error) {
    console.error('Register API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}