import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for date filtering
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '7d';

    // Convert range to days
    let daysAgo = 7;
    if (range === '30d') daysAgo = 30;
    else if (range === '90d') daysAgo = 90;
    else if (range === '1y') daysAgo = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get total orders and revenue
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      select: {
        total: true,
        status: true,
        createdAt: true,
      },
    });

    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - daysAgo);
    const prevOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: prevStartDate,
          lt: startDate,
        },
      },
      select: {
        total: true,
      },
    });

    const prevRevenue = prevOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const revenueGrowth = prevRevenue > 0 
      ? parseFloat(((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1))
      : 0;

    const ordersGrowth = prevOrders.length > 0
      ? parseFloat(((totalOrders - prevOrders.length) / prevOrders.length * 100).toFixed(1))
      : 0;

    const prevAverageOrderValue = prevOrders.length > 0 
      ? prevOrders.reduce((sum, order) => sum + order.total, 0) / prevOrders.length 
      : 0;
    const averageOrderValueGrowth = prevAverageOrderValue > 0
      ? parseFloat(((averageOrderValue - prevAverageOrderValue) / prevAverageOrderValue * 100).toFixed(1))
      : 0;

    // Get customer stats
    const totalCustomers = await prisma.user.count({
      where: {
        role: 'BUYER',
        createdAt: {
          gte: startDate,
        },
      },
    });

    const prevCustomers = await prisma.user.count({
      where: {
        role: 'BUYER',
        createdAt: {
          gte: prevStartDate,
          lt: startDate,
        },
      },
    });

    const customerGrowth = prevCustomers > 0
      ? parseFloat(((totalCustomers - prevCustomers) / prevCustomers * 100).toFixed(1))
      : 0;

    // Get order status distribution
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        status: true,
      },
    });

    const orderDistribution = ordersByStatus.map(item => ({
      status: item.status,
      count: item._count.status,
      percentage: totalOrders > 0 ? ((item._count.status / totalOrders) * 100).toFixed(1) : '0',
    }));

    // Get top selling products
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        total: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    });

    // Fetch product details for top products
    const productIds = topProducts.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    const topSellingProducts = topProducts.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        id: item.productId,
        name: product?.name || 'Unknown Product',
        category: product?.category?.name || 'Uncategorized',
        unitsSold: item._sum.quantity || 0,
        revenue: item._sum.total || 0,
        imageUrl: product?.imageUrl || '',
      };
    });

    // Daily revenue data for chart (last 7-30 days based on range)
    const chartDays = Math.min(daysAgo, 30);
    const dailyRevenue = [];
    for (let i = chartDays - 1; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayOrders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        select: {
          total: true,
        },
      });

      const dayRevenue = dayOrders.reduce((sum, order) => sum + order.total, 0);
      
      dailyRevenue.push({
        date: dayStart.toISOString().split('T')[0],
        revenue: dayRevenue,
        orders: dayOrders.length,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalRevenue: {
            value: totalRevenue,
            formatted: `৳${totalRevenue.toLocaleString()}`,
            growth: revenueGrowth,
          },
          totalOrders: {
            value: totalOrders,
            growth: ordersGrowth,
          },
          averageOrderValue: {
            value: averageOrderValue,
            formatted: `৳${averageOrderValue.toFixed(2)}`,
            growth: averageOrderValueGrowth,
          },
          newCustomers: {
            value: totalCustomers,
            growth: customerGrowth,
          },
        },
        orderDistribution,
        topSellingProducts,
        dailyRevenue,
        period: {
          range,
          days: daysAgo,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}
