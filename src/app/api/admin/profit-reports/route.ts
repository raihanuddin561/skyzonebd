// app/api/admin/profit-reports/route.ts - Profit Reporting API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

/**
 * GET /api/admin/profit-reports
 * Get profit reports with filtering
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const productId = searchParams.get('productId');
    const sellerId = searchParams.get('sellerId');

    const where: any = {};

    // Date filtering
    if (startDate && endDate) {
      where.reportDate = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Product filtering
    if (productId) {
      where.productId = productId;
    }

    // Seller filtering
    if (sellerId) {
      where.sellerId = sellerId;
    }

    const reports = await prisma.profitReport.findMany({
      where,
      include: {
        order: {
          select: {
            orderNumber: true,
            createdAt: true
          }
        },
        product: {
          select: {
            name: true,
            sku: true
          }
        }
      },
      orderBy: {
        reportDate: 'desc'
      }
    });

    // Calculate totals
    const totals = reports.reduce((acc, report) => ({
      revenue: acc.revenue + report.revenue,
      costOfGoods: acc.costOfGoods + report.costOfGoods,
      grossProfit: acc.grossProfit + report.grossProfit,
      totalExpenses: acc.totalExpenses + report.totalExpenses,
      netProfit: acc.netProfit + report.netProfit,
      platformProfit: acc.platformProfit + report.platformProfit,
      sellerProfit: acc.sellerProfit + report.sellerProfit
    }), {
      revenue: 0,
      costOfGoods: 0,
      grossProfit: 0,
      totalExpenses: 0,
      netProfit: 0,
      platformProfit: 0,
      sellerProfit: 0
    });

    const averageProfitMargin = totals.revenue > 0 
      ? (totals.netProfit / totals.revenue) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      reports,
      summary: {
        ...totals,
        averageProfitMargin,
        reportCount: reports.length
      }
    });

  } catch (error) {
    console.error('Error fetching profit reports:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profit reports' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/profit-reports
 * Generate profit report for an order
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin(request);
    
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Fetch order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Calculate totals
    let totalRevenue = 0;
    let totalCost = 0;
    let totalPlatformProfit = 0;
    let totalSellerProfit = 0;

    for (const item of order.orderItems) {
      const revenue = item.total;
      const costPerUnit = item.product.costPerUnit || item.product.basePrice || 0;
      const cost = costPerUnit * item.quantity;
      const grossProfit = revenue - cost;

      // Calculate profit distribution
      const platformProfitPercent = item.product.platformProfitPercentage || 0;
      const sellerCommissionPercent = item.product.sellerCommissionPercentage || 0;

      const platformProfit = (grossProfit * platformProfitPercent) / 100;
      const remainingProfit = grossProfit - platformProfit;
      const sellerProfit = (remainingProfit * sellerCommissionPercent) / 100;

      totalRevenue += revenue;
      totalCost += cost;
      totalPlatformProfit += platformProfit + (remainingProfit - sellerProfit);
      totalSellerProfit += sellerProfit;

      // Update order item with profit info
      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          costPerUnit,
          profitPerUnit: grossProfit / item.quantity,
          totalProfit: grossProfit,
          profitMargin: (grossProfit / revenue) * 100
        }
      });
    }

    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit; // Simplified, could subtract other expenses
    const profitMargin = (netProfit / totalRevenue) * 100;

    // Create profit report
    const report = await prisma.profitReport.create({
      data: {
        orderId,
        revenue: totalRevenue,
        costOfGoods: totalCost,
        grossProfit,
        totalExpenses: 0,
        netProfit,
        profitMargin,
        platformProfit: totalPlatformProfit,
        platformProfitPercent: (totalPlatformProfit / grossProfit) * 100,
        sellerProfit: totalSellerProfit,
        sellerProfitPercent: (totalSellerProfit / grossProfit) * 100,
        reportPeriod: 'daily',
        reportDate: new Date()
      }
    });

    // Update order with profit info
    await prisma.order.update({
      where: { id: orderId },
      data: {
        totalCost,
        grossProfit,
        platformProfit: totalPlatformProfit,
        sellerProfit: totalSellerProfit,
        profitMargin
      }
    });

    return NextResponse.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Error generating profit report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate profit report' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/profit-reports/dashboard
 * Get dashboard summary statistics
 */
export async function GET_DASHBOARD(request: NextRequest) {
  try {
    // Get last 30 days of reports
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reports = await prisma.profitReport.findMany({
      where: {
        reportDate: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Calculate statistics
    const totalRevenue = reports.reduce((sum, r) => sum + r.revenue, 0);
    const totalCost = reports.reduce((sum, r) => sum + r.costOfGoods, 0);
    const totalProfit = reports.reduce((sum, r) => sum + r.netProfit, 0);
    const totalPlatformProfit = reports.reduce((sum, r) => sum + r.platformProfit, 0);
    const totalSellerProfit = reports.reduce((sum, r) => sum + r.sellerProfit, 0);
    const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Get top performing products
    const productReports = await prisma.profitReport.findMany({
      where: {
        reportDate: { gte: thirtyDaysAgo },
        productId: { not: null }
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true
          }
        }
      },
      orderBy: {
        netProfit: 'desc'
      },
      take: 10
    });

    return NextResponse.json({
      success: true,
      dashboard: {
        totalRevenue,
        totalCost,
        totalProfit,
        totalPlatformProfit,
        totalSellerProfit,
        avgProfitMargin,
        orderCount: reports.length,
        topProducts: productReports
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
