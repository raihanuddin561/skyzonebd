// app/api/admin/users/[id]/role/route.ts - User Role Management

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canAssignRoles } from '@/lib/permissions';
import { UserRole, isSuperAdmin } from '@/types/roles';

/**
 * PATCH /api/admin/users/[id]/role
 * Update user role (Super Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request);
    const { id } = await params;
    
    // Check if user is super admin
    if (!isSuperAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role is required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Check if user can assign this role
    if (!canAssignRoles(authUser.role as UserRole, role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to assign this role' },
        { status: 403 }
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

    // Prevent changing own role
    if (id === authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role as any },
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
      message: `User role updated to ${role}`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
