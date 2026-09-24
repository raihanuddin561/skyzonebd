// app/api/user/profile/route.ts - User Profile Management

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * GET /api/user/profile
 * Get current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user from JWT token
    const authUser = await requireAuth(request);
    const userId = authUser.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        role: true,
        userType: true,
        isVerified: true,
        isActive: true,
        discountPercent: true,
        discountReason: true,
        discountValidUntil: true,
        createdAt: true,
        updatedAt: true,
        // password is deliberately excluded — this endpoint previously had
        // no `select`/`include` filter at all and shipped the bcrypt hash
        // to the browser on every profile load.
        businessInfo: true,
        addresses: {
          orderBy: {
            isDefault: 'desc'
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/profile
 * Update user profile (name, email, phone, company)
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user from JWT token
    const user = await requireAuth(request);
    const userId = user.id;

    const body = await request.json();
    const { name, email, phone, companyName } = body;

    // Validate required fields
    if (!name || !email || !phone) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and phone are required' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId }
        }
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: 'Email already in use' },
          { status: 400 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone,
        companyName: companyName || null
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        companyName: true,
        role: true,
        userType: true,
        isVerified: true,
        isActive: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

// Note: password changes are handled by PUT /api/user/profile/password
// (src/app/api/user/profile/password/route.ts), which is what the frontend
// actually calls (API_ENDPOINTS.USER.CHANGE_PASSWORD in src/config/apiConfig.ts,
// invoked via apiService.changePassword -> apiService.put). A duplicate
// PATCH handler used to live here, but nothing sends PATCH to
// /api/user/profile (its doc comment even claimed the wrong path,
// "/api/user/profile/password") — it was unreachable dead code and has been
// removed.
