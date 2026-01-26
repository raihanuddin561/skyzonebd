// Revoke All Permissions API
import { NextRequest, NextResponse } from 'next/server';
import { revokeAllPermissions } from '@/utils/permissions';
import { checkPermission } from '@/middleware/permissionMiddleware';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * DELETE /api/admin/permissions/revoke-all?userId=xxx
 * Revoke all permissions from a user
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

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId parameter required' },
        { status: 400 }
      );
    }

    await revokeAllPermissions(userId);

    return NextResponse.json({
      success: true,
      message: 'All permissions revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking all permissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke all permissions' },
      { status: 500 }
    );
  }
}
