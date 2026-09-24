// app/api/admin/profit-reports/dashboard/route.ts - Profit Dashboard API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getFinancialSummary } from '@/lib/financialLedger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * GET /api/admin/profit-reports/dashboard
 * Get comprehensive profit dashboard data
 *
 * Revenue/COGS/operational-costs/salary/profit figures are derived from the
 * shared FinancialLedger-based calculation (getFinancialSummary) instead of
 * independently re-aggregating Sale/OperationalCost/Salary — the same "one
 * true ledger" pattern already used by comprehensiveProfitCalculation.ts
 * (used by /api/admin/profit-loss) and partnerProfitDistribution.ts (used by
 * /api/admin/profits). Previously this route computed its own numbers from
 * those tables directly, which could silently drift from the canonical
 * figures shown on those other pages — e.g. it summed *all* Salary/
 * OperationalCost rows regardless of paymentStatus, while the ledger (and
 * every other profit endpoint) only recognizes PAID/PARTIAL ones as real
 * expenses.
 */
export async function GET(request: NextRequest) {
  const notices: string[] = [];

  try {
    // Require admin authentication
    await requireAdmin(request);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const financialSummary = await getFinancialSummary(startOfMonth, endOfMonth);

    // Revenue split by source (ORDER vs MANUAL_SALE), plus the real refund
    // total for the period — the ledger posts refund reversals as
    // DEBIT/REFUND/REVENUE entries (see createRefundReversalEntries), which
    // getFinancialSummary already nets against `revenue`. Read separately
    // here purely so the dashboard can show gross sales, returns, and net
    // revenue individually instead of a hardcoded `returns: 0`.
    const [revenueEntries, returnRevenueAgg, costsCount, salariesAll] = await Promise.all([
      prisma.financialLedger.findMany({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          direction: 'CREDIT',
          category: 'REVENUE',
          sourceType: { in: ['ORDER', 'MANUAL_SALE'] },
        },
        select: { sourceType: true, amount: true },
      }),
      prisma.financialLedger.aggregate({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          direction: 'DEBIT',
          sourceType: 'REFUND',
          category: 'REVENUE',
        },
        _sum: { amount: true },
      }),
      prisma.operationalCost.count({
        where: { date: { gte: startOfMonth, lte: endOfMonth } },
      }),
      prisma.salary.findMany({
        where: { month: now.getMonth() + 1, year: now.getFullYear() },
        select: { id: true },
      }),
    ]);

    if (revenueEntries.length === 0) {
      notices.push('No sales data available for the current month');
    }
    if (costsCount === 0) {
      notices.push('No operational costs recorded for the current month');
    }
    if (salariesAll.length === 0) {
      notices.push('No salary data recorded for the current month');
    }

    const directSalesRevenue = revenueEntries
      .filter((e) => e.sourceType === 'MANUAL_SALE')
      .reduce((sum, e) => sum + e.amount, 0);
    const orderSalesRevenue = revenueEntries
      .filter((e) => e.sourceType === 'ORDER')
      .reduce((sum, e) => sum + e.amount, 0);
    const grossRevenue = directSalesRevenue + orderSalesRevenue;
    const returns = returnRevenueAgg._sum.amount || 0;

    // Ledger-derived top-line figures (net of refunds, PAID/PARTIAL costs
    // and salaries only — see file header comment).
    const totalRevenue = financialSummary.revenue;
    const cogs = financialSummary.cogs;
    const grossProfit = financialSummary.grossProfit;
    const totalOperationalCosts = financialSummary.operationalCosts;
    const totalSalaries = financialSummary.salaryExpenses;

    // Calculate total costs
    const totalCosts = cogs + totalOperationalCosts + totalSalaries;

    // Calculate profits
    const operatingProfit = grossProfit - totalOperationalCosts;
    const netProfit = financialSummary.netProfitBeforeDistribution;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Get active partners
    const partners = await prisma.partner.findMany({
      where: { isActive: true }
    });

    const totalPartnerShare = partners.reduce((sum, p) => sum + p.profitSharePercentage, 0);
    const totalPartnerDistribution = (netProfit * totalPartnerShare) / 100;
    const remainingProfit = netProfit - totalPartnerDistribution;

    // Get order count
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    const stats = {
      totalRevenue,
      revenueGrowth: 0, // TODO: Calculate compared to previous month
      totalCosts,
      costGrowth: 0,
      netProfit,
      profitGrowth: 0,
      profitMargin,
      totalOrders: orders.length,
      ordersGrowth: 0,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      activePartners: partners.length,
      totalPartnerShare,
      remainingProfit
    };

    // Get cost breakdown by category — scoped to PAID/PARTIAL costs so the
    // per-category totals sum to `totalOperationalCosts` above (the same
    // ledger-posting scope used in costs/route.ts and
    // comprehensiveProfitCalculation.ts's calculateOperatingExpenses).
    const costsByCategory = await prisma.operationalCost.groupBy({
      by: ['category'],
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        },
        paymentStatus: { in: ['PAID', 'PARTIAL'] }
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    const costSummary = costsByCategory.map(item => ({
      category: item.category,
      total: item._sum.amount || 0,
      count: item._count.id,
      percentage: totalOperationalCosts > 0
        ? ((item._sum.amount || 0) / totalOperationalCosts) * 100
        : 0
    }));

    // Add COGS and Salaries to cost breakdown
    costSummary.push({
      category: 'INVENTORY' as any, // COGS
      total: cogs,
      count: revenueEntries.length,
      percentage: totalCosts > 0 ? (cogs / totalCosts) * 100 : 0
    });

    costSummary.push({
      category: 'SALARIES' as any,
      total: totalSalaries,
      count: salariesAll.length,
      percentage: totalCosts > 0 ? (totalSalaries / totalCosts) * 100 : 0
    });

    // Get monthly trends for last 6 months — same ledger-based calculation
    // as the current month, per month.
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const trendMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const trendMonthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const monthSummary = await getFinancialSummary(trendMonth, trendMonthEnd);
      const revenue = monthSummary.revenue;
      const costs = monthSummary.cogs + monthSummary.operationalCosts + monthSummary.salaryExpenses;
      const profit = revenue - costs;

      monthlyTrends.push({
        month: trendMonth.toLocaleString('default', { month: 'short', year: 'numeric' }),
        revenue,
        costs,
        profit
      });
    }

    // Get recent transactions (last 10) — a raw activity feed, not a
    // profit total, so still sourced from the underlying Sale/
    // OperationalCost records directly.
    const recentSales = await prisma.sale.findMany({
      take: 5,
      orderBy: { saleDate: 'desc' },
      include: {
        product: {
          select: { name: true }
        }
      }
    });

    const recentCosts = await prisma.operationalCost.findMany({
      take: 5,
      orderBy: { date: 'desc' }
    });

    const recentTransactions = [
      ...recentSales.map(sale => ({
        id: sale.id,
        type: 'SALE' as const,
        description: sale.product?.name || sale.productName,
        amount: sale.totalAmount,
        date: sale.saleDate,
        status: sale.paymentStatus
      })),
      ...recentCosts.map(cost => ({
        id: cost.id,
        type: 'COST' as const,
        description: cost.description,
        amount: -cost.amount,
        date: cost.date,
        status: cost.paymentStatus
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

    return NextResponse.json({
      success: true,
      notices,
      stats,
      revenueBreakdown: {
        directSales: directSalesRevenue,
        orderSales: orderSalesRevenue,
        totalSales: grossRevenue,
        returns,
        netRevenue: grossRevenue - returns
      },
      costsByCategory: costSummary.sort((a, b) => b.total - a.total),
      monthlyTrends,
      partners: partners.map(p => ({
        id: p.id,
        name: p.name,
        sharePercentage: p.profitSharePercentage,
        totalReceived: p.totalProfitReceived,
        isActive: p.isActive
      })),
      recentTransactions
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error',
        notices: notices.length > 0 ? notices : ['Server error occurred']
      },
      { status: 500 }
    );
  }
}
