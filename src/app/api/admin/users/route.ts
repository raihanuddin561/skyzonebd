import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function GET(request: NextRequest) {
  try {
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
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Update user status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, data } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
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
      case 'update':
        updateData = data;
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: `User ${action}d successfully`,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// Delete users
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User IDs array is required' },
        { status: 400 }
      );
    }

    await prisma.user.deleteMany({
      where: {
        id: { in: userIds },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${userIds.length} user(s) deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete users' },
      { status: 500 }
    );
  }
}
