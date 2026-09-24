// app/api/admin/super-admin/dashboard/route.ts - Super Admin Dashboard API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { isSuperAdmin } from '@/types/roles';
import { UserRole } from '@/types/roles';
import { getFinancialSummary } from '@/lib/financialLedger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


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

    // Get current month revenue/profit — derived from the shared
    // FinancialLedger-based calculation (getFinancialSummary) instead of
    // the legacy, manually-populated Sale table, which silently
    // under-reports whenever the per-order "generate sale" admin action is
    // skipped (see /api/admin/profit-loss, /api/admin/profits, and
    // /api/admin/profit-reports/dashboard for the same fix).
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const financialSummary = await getFinancialSummary(startOfMonth, endOfMonth);

    const totalRevenue = financialSummary.revenue;
    // grossProfit (revenue - COGS) mirrors the original Sale.profitAmount
    // semantics ((unitPrice - costPrice) x quantity) rather than
    // netProfitBeforeDistribution, which additionally subtracts operational
    // costs/salaries.
    const totalProfit = financialSummary.grossProfit;

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
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching super admin dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
