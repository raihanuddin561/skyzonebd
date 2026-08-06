import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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
    const { name, email, password, companyName, phone } = await request.json();

    if (!name || !email || !password || !companyName || !phone) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
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
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        companyName,
        phone,
        role: 'BUYER',
        userType: 'RETAIL',
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

    // Best-effort welcome email (Amazon-style gap-closure Phase 4 part 1) —
    // emailService.sendEmail never throws (returns { success, error }), so
    // no try/catch is needed, but a failure here must never fail a
    // registration that already committed to the database.
    const emailResult = await emailService.sendWelcomeEmail(newUser.email, newUser.name, 'RETAIL');
    if (!emailResult.success) {
      console.error(`Welcome email failed for ${newUser.email}: ${emailResult.error}`);
    }

    // Generate JWT token
    const token = sign(
      { 
        userId: newUser.id, 
        email: newUser.email, 
        role: newUser.role.toLowerCase()
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      user: {
        ...newUser,
        role: newUser.role.toLowerCase(),
        userType: newUser.userType.toLowerCase()
      },
      token
    }, { status: 201 });

  } catch (error) {
    console.error('Register API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}