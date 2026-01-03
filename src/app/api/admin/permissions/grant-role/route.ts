// Grant Role Permissions API
import { NextRequest, NextResponse } from 'next/server';
import { grantRolePermissions } from '@/utils/permissions';
import { checkPermission } from '@/middleware/permissionMiddleware';

/**
 * POST /api/admin/permissions/grant-role
 * Grant a predefined role's permissions to a user
 * Body: {
 *   userId: string,
 *   role: 'INVENTORY_MANAGER' | 'HR_MANAGER' | 'FINANCE_MANAGER' | 'SALES_MANAGER' | 'OPERATIONS_MANAGER'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if requester has permission to grant permissions
    const permCheck = await checkPermission(request, 'PERMISSIONS_MANAGE', 'create');
    if (!permCheck.authorized) {
      return permCheck.response;
    }
    const granterId = permCheck.userId!;

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: 'userId and role are required' },
        { status: 400 }
      );
    }

    const validRoles = [
      'INVENTORY_MANAGER',
      'HR_MANAGER',
      'FINANCE_MANAGER',
      'SALES_MANAGER',
      'OPERATIONS_MANAGER'
    ];

    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid role',
          validRoles 
        },
        { status: 400 }
      );
    }

    const permissions = await grantRolePermissions(userId, role, granterId);

    return NextResponse.json({
      success: true,
      data: {
        userId,
        role,
        permissions
      },
      message: `${role} permissions granted successfully`
    });
  } catch (error) {
    console.error('Error granting role permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to grant role permissions' },
      { status: 500 }
    );
  }
}
