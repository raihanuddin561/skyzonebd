// Permission Management API
import { NextRequest, NextResponse } from 'next/server';
import { 
  grantPermission, 
  revokePermission, 
  getUserPermissions,
  grantRolePermissions,
  revokeAllPermissions
} from '@/utils/permissions';
import { checkPermission } from '@/middleware/permissionMiddleware';

/**
 * GET /api/admin/permissions?userId=xxx
 * Get all permissions for a user
 */
export async function GET(request: NextRequest) {
  try {
    // Check if requester has permission to view permissions
    const permCheck = await checkPermission(request, 'PERMISSIONS_MANAGE', 'view');
    if (!permCheck.authorized) {
      return permCheck.response;
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'userId parameter required' },
        { status: 400 }
      );
    }

    const permissions = await getUserPermissions(targetUserId);

    return NextResponse.json({
      success: true,
      data: permissions
    });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/permissions
 * Grant a permission to a user
 * Body: {
 *   userId: string,
 *   module: string,
 *   canView?: boolean,
 *   canCreate?: boolean,
 *   canEdit?: boolean,
 *   canDelete?: boolean,
 *   canApprove?: boolean,
 *   canExport?: boolean,
 *   expiresAt?: Date
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
    const { 
      userId, 
      module, 
      canView = false,
      canCreate = false,
      canEdit = false,
      canDelete = false,
      canApprove = false,
      canExport = false,
      expiresAt
    } = body;

    if (!userId || !module) {
      return NextResponse.json(
        { success: false, error: 'userId and module are required' },
        { status: 400 }
      );
    }

    const permission = await grantPermission(
      userId,
      module,
      {
        canView,
        canCreate,
        canEdit,
        canDelete,
        canApprove,
        canExport
      },
      granterId,
      expiresAt ? new Date(expiresAt) : undefined
    );

    return NextResponse.json({
      success: true,
      data: permission,
      message: 'Permission granted successfully'
    });
  } catch (error) {
    console.error('Error granting permission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to grant permission' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/permissions?userId=xxx&module=xxx
 * Revoke a specific permission from a user
 */
export async function DELETE(request: NextRequest) {
  try {
    // Check if requester has permission to revoke permissions
    const permCheck = await checkPermission(request, 'PERMISSIONS_MANAGE', 'delete');
    if (!permCheck.authorized) {
      return permCheck.response;
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const module = searchParams.get('module');

    if (!userId || !module) {
      return NextResponse.json(
        { success: false, error: 'userId and module parameters required' },
        { status: 400 }
      );
    }

    await revokePermission(userId, module);

    return NextResponse.json({
      success: true,
      message: 'Permission revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking permission:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke permission' },
      { status: 500 }
    );
  }
}
