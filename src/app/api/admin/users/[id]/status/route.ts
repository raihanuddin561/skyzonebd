// app/api/admin/users/[id]/status/route.ts - User Status Management

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, isSuperAdmin, isAdmin } from '@/types/roles';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * PATCH /api/admin/users/[id]/status
 * Toggle user active status (Admin or Super Admin)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request);
    const { id } = await params;
    
    // Check if user has permission
    const userRole = authUser.role as UserRole;
    if (!isAdmin(userRole) && !isSuperAdmin(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isActive must be a boolean' },
        { status: 400 }
      );
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deactivating own account
    if (id === authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot change your own status' },
        { status: 400 }
      );
    }

    // Only super admin can change other admins or super admins
    if ((targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') && !isSuperAdmin(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Only super admin can manage admin accounts' },
        { status: 403 }
      );
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'suspended'} successfully`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user status' },
      { status: 500 }
    );
  }
}
