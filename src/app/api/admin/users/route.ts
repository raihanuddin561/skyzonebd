import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin, isSuperAdmin } from '@/types/roles';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// Fields an admin may change via the generic `update` action on this endpoint.
// Sensitive fields (role, password, isActive, isVerified, email) are deliberately
// excluded — they have dedicated, more tightly-guarded endpoints:
//   role      -> PATCH /api/admin/users/[id]/role   (super-admin + hierarchy checked)
//   isActive  -> PATCH /api/admin/users/[id]/status  (admin-account protections)
//   isVerified-> the `verify` action below, or the same status endpoint
//   password  -> user-initiated password change flow (never admin-set directly)
//   email     -> not editable here; has uniqueness implications not checked in this route
const UPDATABLE_FIELDS = [
  'name',
  'phone',
  'companyName',
  'discountPercent',
  'discountReason',
  'discountValidUntil',
] as const;

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get('role');
    const userType = searchParams.get('userType');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (role && role !== 'all') {
      where.role = role.toUpperCase();
    }

    if (userType && userType !== 'all') {
      where.userType = userType.toUpperCase();
    }

    if (status && status !== 'all') {
      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'suspended') {
        where.isActive = false;
      } else if (status === 'pending') {
        where.isVerified = false;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { not: null, contains: search, mode: 'insensitive' } },
        { companyName: { not: null, contains: search, mode: 'insensitive' } },
      ];
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          userType: true,
          isActive: true,
          isVerified: true,
          companyName: true,
          discountPercent: true,
          discountReason: true,
          discountValidUntil: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
          orders: {
            select: {
              total: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Format users data
    const formattedUsers = users.map(user => {
      const totalSpent = user.orders.reduce((sum, order) => sum + (order.total || 0), 0);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || 'N/A',
        role: user.role.toLowerCase(),
        userType: user.userType.toLowerCase(),
        status: !user.isActive ? 'suspended' : (!user.isVerified && user.userType === 'WHOLESALE') ? 'pending' : 'active',
        businessVerified: user.isVerified,
        businessName: user.companyName,
        totalOrders: user._count.orders,
        totalSpent,
        discountPercent: user.discountPercent,
        discountReason: user.discountReason,
        discountValidUntil: user.discountValidUntil?.toISOString(),
        createdAt: user.createdAt.toISOString(),
        lastLogin: user.updatedAt.toISOString(), // Using updatedAt as proxy for lastLogin
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Update user status / verification / limited profile fields
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, action, data } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Status-changing actions may not be used to lock the acting admin out of
    // their own account, and only a super admin may act on another admin account
    // (mirrors the same protections already enforced in [id]/status/route.ts).
    if (action === 'suspend' || action === 'activate' || action === 'verify' || action === 'reset-to-pending') {
      if (userId === authUser.id) {
        return NextResponse.json(
          { success: false, error: 'Cannot change your own status' },
          { status: 400 }
        );
      }
      if ((targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') && !isSuperAdmin(authUser.role as UserRole)) {
        return NextResponse.json(
          { success: false, error: 'Only super admin can manage admin accounts' },
          { status: 403 }
        );
      }
    }

    let updateData: any = {};

    switch (action) {
      case 'suspend':
        updateData = { isActive: false };
        break;
      case 'activate':
        updateData = { isActive: true, isVerified: true };
        break;
      case 'verify':
        updateData = { isVerified: true };
        break;
      case 'reset-to-pending':
        // Used by the admin UI to move a user back into the pending-verification
        // state (deactivate + unverify) without going through the generic,
        // arbitrary-field `update` action.
        updateData = { isActive: false, isVerified: false };
        break;
      case 'update': {
        if (!data || typeof data !== 'object') {
          return NextResponse.json(
            { success: false, error: 'data object is required for the update action' },
            { status: 400 }
          );
        }
        const disallowedFields = Object.keys(data).filter(
          (key) => !UPDATABLE_FIELDS.includes(key as (typeof UPDATABLE_FIELDS)[number])
        );
        if (disallowedFields.length > 0) {
          return NextResponse.json(
            {
              success: false,
              error: `Field(s) not editable via this endpoint: ${disallowedFields.join(', ')}. ` +
                'Use /api/admin/users/[id]/role for role changes or /api/admin/users/[id]/status for activation status.',
            },
            { status: 400 }
          );
        }
        updateData = data;
        break;
      }
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: `User ${action}d successfully`,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// Delete users (destructive, bulk — restricted to super admin)
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isSuperAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User IDs array is required' },
        { status: 400 }
      );
    }

    // Never allow a self-delete through the bulk endpoint.
    const idsToDelete = userIds.filter((id: string) => id !== authUser.id);
    if (idsToDelete.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // deleteMany compiles to a single DELETE ... WHERE id IN (...) statement
    // — if ANY selected user has a related row that blocks deletion (e.g.
    // RFQ.user is a required relation with no onDelete, defaulting to
    // RESTRICT), Postgres rejects the whole statement and NONE of the
    // selected users are deleted, not just the blocked one. That used to
    // surface as an opaque 500 "Failed to delete users" with no indication
    // of which user or relation caused it.
    let result;
    try {
      result = await prisma.user.deleteMany({
        where: {
          id: { in: idsToDelete },
        },
      });
    } catch (deleteError) {
      if (deleteError instanceof Prisma.PrismaClientKnownRequestError && deleteError.code === 'P2003') {
        return NextResponse.json(
          {
            success: false,
            error: 'One or more selected users have related records (RFQs, orders, reviews, etc.) that must be removed or reassigned first — no users were deleted.',
          },
          { status: 409 }
        );
      }
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      message: `${result.count} user(s) deleted successfully`,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error deleting users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete users' },
      { status: 500 }
    );
  }
}
