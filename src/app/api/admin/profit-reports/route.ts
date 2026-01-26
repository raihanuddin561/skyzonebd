// app/api/admin/profit-reports/route.ts - Profit Reporting API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * GET /api/admin/profit-reports
 * Get profit reports with filtering
 */
export async function GET(request: NextRequest) {
  const notices: string[] = [];

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

    if (reports.length === 0) {
      notices.push('No profit reports found for the specified period');
    }

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
      notices,
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
      { 
        success: false, 
        error: 'Failed to fetch profit reports',
        details: error instanceof Error ? error.message : 'Unknown error',
        notices: ['Server error occurred']
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/profit-reports
 * Generate profit report for an order
 */
export async function POST(request: NextRequest) {
  const notices: string[] = [];

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
      const revenue = item.total || 0;
      
      // Use snapshotted values from order item if available (preferred)
      // Fall back to current product prices only for old orders without snapshots
      const costPerUnit = item.costPerUnit ?? item.product.costPerUnit ?? item.product.basePrice ?? 0;
      
      if (!costPerUnit || costPerUnit === 0) {
        notices.push(`Order item ${item.id} missing costPerUnit - using 0 for calculation`);
      }
      
      const cost = costPerUnit * (item.quantity || 0);
      const grossProfit = item.totalProfit ?? (revenue - cost);

      // Calculate profit distribution using current product config
      // (This is for distribution, not recalculation of profit amount)
      const platformProfitPercent = item.product.platformProfitPercentage || 0;
      const sellerCommissionPercent = item.product.sellerCommissionPercentage || 0;

      const platformProfit = (grossProfit * platformProfitPercent) / 100;
      const remainingProfit = grossProfit - platformProfit;
      const sellerProfit = (remainingProfit * sellerCommissionPercent) / 100;

      totalRevenue += revenue;
      totalCost += cost;
      totalPlatformProfit += platformProfit + (remainingProfit - sellerProfit);
      totalSellerProfit += sellerProfit;

      // Only update order item if profit data is missing (don't overwrite historical snapshots)
      if (item.costPerUnit === null || item.totalProfit === null) {
        await prisma.orderItem.update({
          where: { id: item.id },
          data: {
            costPerUnit,
            profitPerUnit: grossProfit / (item.quantity || 1),
            totalProfit: grossProfit,
            profitMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0
          }
        });
      }
    }

    const grossProfit = totalRevenue - totalCost;
    const netProfit = grossProfit; // Simplified, could subtract other expenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

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
        platformProfitPercent: grossProfit > 0 ? (totalPlatformProfit / grossProfit) * 100 : 0,
        sellerProfit: totalSellerProfit,
        sellerProfitPercent: grossProfit > 0 ? (totalSellerProfit / grossProfit) * 100 : 0,
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
      notices,
      report
    });

  } catch (error) {
    console.error('Error generating profit report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate profit report',
        details: error instanceof Error ? error.message : 'Unknown error',
        notices: ['Server error occurred']
      },
      { status: 500 }
    );
  }
}
