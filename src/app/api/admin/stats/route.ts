import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';
import { getDhakaPeriodRange } from '@/lib/dhakaTime';
import { OrderStatus } from '@prisma/client';

// Vercel / Node.js configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// Order statuses that represent realized commercial revenue (excludes cancelled, refunded, returned)
const REALIZED_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.SHIPPED,
  OrderStatus.IN_TRANSIT,
  OrderStatus.PACKED,
  OrderStatus.PROCESSING,
  OrderStatus.CONFIRMED,
];

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters for date filtering
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30'; // days
    const daysAgo = parseInt(period) || 30;

    // Use exact Bangladesh time (Asia/Dhaka UTC+6) boundaries
    const { start: startDate, prevStart: prevStartDate, end: endDate } = getDhakaPeriodRange(daysAgo);

    // Parallel atomic database aggregations — O(1) server memory, executes directly in PostgreSQL engine
    const [
      totalRevenueAgg,
      periodRevenueAgg,
      prevPeriodRevenueAgg,
      totalOrders,
      periodOrdersCount,
      prevPeriodOrdersCount,
      totalUsers,
      periodUsers,
      prevPeriodUsers,
      totalProducts,
      periodProducts,
      prevPeriodProducts,
      recentOrders,
      pendingVerifications,
      pendingApplications,
      ordersByStatus,
    ] = await Promise.all([
      // Total realized revenue all-time
      prisma.order.aggregate({
        where: {
          status: { in: REALIZED_STATUSES },
        },
        _sum: { total: true },
      }),

      // Period realized revenue
      prisma.order.aggregate({
        where: {
          status: { in: REALIZED_STATUSES },
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { total: true },
        _count: true,
      }),

      // Previous period realized revenue for growth %
      prisma.order.aggregate({
        where: {
          status: { in: REALIZED_STATUSES },
          createdAt: { gte: prevStartDate, lt: startDate },
        },
        _sum: { total: true },
        _count: true,
      }),

      // Total orders count
      prisma.order.count(),

      // Period orders count
      prisma.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Previous period orders count
      prisma.order.count({
        where: {
          createdAt: { gte: prevStartDate, lt: startDate },
        },
      }),

      // Total users count
      prisma.user.count(),

      // Period users
      prisma.user.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Prev period users
      prisma.user.count({
        where: {
          createdAt: { gte: prevStartDate, lt: startDate },
        },
      }),

      // Total products count
      prisma.product.count(),

      // Period products
      prisma.product.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),

      // Prev period products
      prisma.product.count({
        where: {
          createdAt: { gte: prevStartDate, lt: startDate },
        },
      }),

      // Recent 10 orders
      prisma.order.findMany({
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      }),

      // Pending B2B verification count
      prisma.user.count({
        where: {
          userType: 'WHOLESALE',
          isVerified: false,
        },
      }),

      // Pending B2B applications
      prisma.user.findMany({
        where: {
          userType: 'WHOLESALE',
          isVerified: false,
        },
        select: {
          id: true,
          companyName: true,
          createdAt: true,
          userType: true,
        },
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
      }),

      // Order status distribution
      prisma.order.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
    ]);

    const totalRevenue = totalRevenueAgg?._sum?.total ?? 0;
    const periodRevenue = periodRevenueAgg?._sum?.total ?? 0;
    const prevPeriodRevenue = prevPeriodRevenueAgg?._sum?.total ?? 0;

    const revenueChangeNum = prevPeriodRevenue > 0
      ? ((periodRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100
      : 0;
    const revenueChange = revenueChangeNum.toFixed(1);

    const ordersChangeNum = prevPeriodOrdersCount > 0
      ? ((periodOrdersCount - prevPeriodOrdersCount) / prevPeriodOrdersCount) * 100
      : 0;
    const ordersChange = ordersChangeNum.toFixed(1);

    const usersChangeNum = prevPeriodUsers > 0
      ? ((periodUsers - prevPeriodUsers) / prevPeriodUsers) * 100
      : 0;
    const usersChange = usersChangeNum.toFixed(1);

    const productsChange = prevPeriodProducts > 0
      ? `${(((periodProducts - prevPeriodProducts) / prevPeriodProducts) * 100).toFixed(0)}%`
      : `+${periodProducts}`;

    return NextResponse.json({
      success: true,
      data: {
        stats: [
          {
            title: 'Total Revenue',
            value: `৳${Math.round(totalRevenue).toLocaleString()}`,
            change: `${revenueChangeNum >= 0 ? '+' : ''}${revenueChange}%`,
            icon: '💰',
            color: 'blue',
          },
          {
            title: 'Total Orders',
            value: totalOrders.toLocaleString(),
            change: `${ordersChangeNum >= 0 ? '+' : ''}${ordersChange}%`,
            icon: '🛒',
            color: 'green',
          },
          {
            title: 'Total Users',
            value: totalUsers.toLocaleString(),
            change: `${usersChangeNum >= 0 ? '+' : ''}${usersChange}%`,
            icon: '👥',
            color: 'purple',
          },
          {
            title: 'Products',
            value: totalProducts.toLocaleString(),
            change: productsChange,
            icon: '📦',
            color: 'orange',
          },
        ],
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          customer: order.user?.name || 'Guest',
          amount: order.total,
          status: order.status,
          date: order.createdAt.toISOString().split('T')[0],
        })),
        pendingVerifications: pendingApplications.map((user) => ({
          id: user.id,
          company: user.companyName || 'N/A',
          submitted: user.createdAt.toISOString().split('T')[0],
          type: 'Wholesale',
        })),
        ordersByStatus,
        pendingVerificationsCount: pendingVerifications,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}
