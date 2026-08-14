// app/api/admin/profit-reports/route.ts - Profit Reporting API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { autoGenerateProfitReport } from '@/utils/profitReportGeneration';

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
    if (error instanceof Response) {
      return error;
    }
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
 * Manually (re)generate the profit report for a delivered order — a backfill
 * tool for orders that somehow missed the automatic generation that runs
 * when an order transitions to DELIVERED (src/app/api/orders/[id]/route.ts).
 *
 * This used to independently reimplement the entire profit calculation —
 * a second, divergent copy of autoGenerateProfitReport's logic that never
 * called createOrderLedgerEntries at all (so a manually-generated report
 * updated Order.grossProfit/etc. but posted nothing to the ledger) and had
 * no idempotency check, so clicking "Generate Report" twice on the same
 * order — or once manually after the automatic path already ran — created
 * a second ProfitReport row and double-counted that order's revenue/COGS.
 * Delegating to the single canonical implementation fixes both at once.
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

    const result = await autoGenerateProfitReport(orderId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      notices: result.ledgerPosted === false ? [result.message] : [],
      report: { id: result.reportId },
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error generating profit report:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate profit report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
