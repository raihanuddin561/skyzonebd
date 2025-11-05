import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for date filtering
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30'; // days

    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get total revenue from all orders
    const orders = await prisma.order.findMany({
      select: {
        total: true,
        status: true,
        createdAt: true,
      },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Calculate revenue for the period
    const periodOrders = orders.filter(order => new Date(order.createdAt) >= startDate);
    const periodRevenue = periodOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Calculate previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - daysAgo);
    const prevPeriodOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= prevStartDate && orderDate < startDate;
    });
    const prevPeriodRevenue = prevPeriodOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    const revenueChange = prevPeriodRevenue > 0 
      ? ((periodRevenue - prevPeriodRevenue) / prevPeriodRevenue * 100).toFixed(1)
      : '0';

    // Get total orders count
    const totalOrders = await prisma.order.count();
    const periodOrdersCount = periodOrders.length;
    const prevPeriodOrdersCount = prevPeriodOrders.length;
    const ordersChange = prevPeriodOrdersCount > 0
      ? ((periodOrdersCount - prevPeriodOrdersCount) / prevPeriodOrdersCount * 100).toFixed(1)
      : '0';

    // Get total users count
    const totalUsers = await prisma.user.count();
    const periodUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });
    const prevPeriodUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: prevStartDate,
          lt: startDate,
        },
      },
    });
    const usersChange = prevPeriodUsers > 0
      ? ((periodUsers - prevPeriodUsers) / prevPeriodUsers * 100).toFixed(1)
      : '0';

    // Get total products count
    const totalProducts = await prisma.product.count();
    const periodProducts = await prisma.product.count({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
    });
    const prevPeriodProducts = await prisma.product.count({
      where: {
        createdAt: {
          gte: prevStartDate,
          lt: startDate,
        },
      },
    });
    const productsChange = prevPeriodProducts > 0
      ? `${((periodProducts - prevPeriodProducts) / prevPeriodProducts * 100).toFixed(0)}%`
      : `+${periodProducts}`;

    // Get recent orders
    const recentOrders = await prisma.order.findMany({
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
    });

    // Get pending verification count
    const pendingVerifications = await prisma.user.count({
      where: {
        userType: 'WHOLESALE',
        isVerified: false,
      },
    });

    // Get pending B2B applications (users who need verification)
    const pendingApplications = await prisma.user.findMany({
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
    });

    // Get order status distribution
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: [
          {
            title: 'Total Revenue',
            value: `৳${totalRevenue.toLocaleString()}`,
            change: `${revenueChange >= '0' ? '+' : ''}${revenueChange}%`,
            icon: '💰',
            color: 'blue',
          },
          {
            title: 'Total Orders',
            value: totalOrders.toLocaleString(),
            change: `${ordersChange >= '0' ? '+' : ''}${ordersChange}%`,
            icon: '🛒',
            color: 'green',
          },
          {
            title: 'Total Users',
            value: totalUsers.toLocaleString(),
            change: `${usersChange >= '0' ? '+' : ''}${usersChange}%`,
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
        recentOrders: recentOrders.map(order => ({
          id: order.id,
          customer: order.user?.name || 'Guest',
          amount: order.total,
          status: order.status,
          date: order.createdAt.toISOString().split('T')[0],
        })),
        pendingVerifications: pendingApplications.map(user => ({
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
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch admin statistics' },
      { status: 500 }
    );
  }
}
