// app/api/admin/super-admin/dashboard/route.ts - Super Admin Dashboard API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { isSuperAdmin } from '@/types/roles';
import { UserRole } from '@/types/roles';

/**
 * GET /api/admin/super-admin/dashboard
 * Super admin dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    
    // Only super admin can access
    if (!isSuperAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Super admin access required' },
        { status: 403 }
      );
    }

    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get partners count
    const partners = await prisma.partner.findMany({
      where: { isActive: true }
    });

    // Get current month revenue
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const sales = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + (sale.profitAmount || 0), 0);

    // Get active orders
    const activeOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED']
        }
      }
    });

    const stats = {
      totalUsers: users.length,
      totalPartners: partners.length,
      totalRevenue,
      totalProfit,
      activeOrders: activeOrders.length
    };

    return NextResponse.json({
      success: true,
      stats,
      users: users.slice(0, 20) // Return first 20 users
    });

  } catch (error) {
    console.error('Error fetching super admin dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
