// app/api/admin/profit-reports/dashboard/route.ts - Profit Dashboard API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

/**
 * GET /api/admin/profit-reports/dashboard
 * Get comprehensive profit dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin(request);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get all sales for current month
    const sales = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    // Calculate total revenue
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    // Calculate COGS (Cost of Goods Sold)
    const cogs = sales.reduce((sum, sale) => sum + (sale.costPrice || 0) * sale.quantity, 0);

    // Get all operational costs for current month
    const costs = await prisma.operationalCost.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    const totalOperationalCosts = costs.reduce((sum, cost) => sum + cost.amount, 0);
    
    // Get salary costs
    const salaries = await prisma.salary.findMany({
      where: {
        month: now.getMonth() + 1,
        year: now.getFullYear()
      }
    });

    const totalSalaries = salaries.reduce((sum, salary) => sum + salary.netSalary, 0);

    // Calculate total costs
    const totalCosts = cogs + totalOperationalCosts + totalSalaries;

    // Calculate profits
    const grossProfit = totalRevenue - cogs;
    const operatingProfit = grossProfit - totalOperationalCosts;
    const netProfit = totalRevenue - totalCosts;
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

    // Get cost breakdown by category
    const costsByCategory = await prisma.operationalCost.groupBy({
      by: ['category'],
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
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
      count: sales.length,
      percentage: totalCosts > 0 ? (cogs / totalCosts) * 100 : 0
    });

    costSummary.push({
      category: 'SALARIES' as any,
      total: totalSalaries,
      count: salaries.length,
      percentage: totalCosts > 0 ? (totalSalaries / totalCosts) * 100 : 0
    });

    // Get monthly trends for last 6 months
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const trendMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const trendMonthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthSales = await prisma.sale.findMany({
        where: {
          saleDate: {
            gte: trendMonth,
            lte: trendMonthEnd
          }
        }
      });

      const monthCosts = await prisma.operationalCost.findMany({
        where: {
          date: {
            gte: trendMonth,
            lte: trendMonthEnd
          }
        }
      });

      const monthSalaries = await prisma.salary.findMany({
        where: {
          month: trendMonth.getMonth() + 1,
          year: trendMonth.getFullYear()
        }
      });

      const revenue = monthSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const monthCogs = monthSales.reduce((sum, sale) => sum + (sale.costPrice || 0) * sale.quantity, 0);
      const costs = monthCosts.reduce((sum, cost) => sum + cost.amount, 0) 
        + monthSalaries.reduce((sum, salary) => sum + salary.netSalary, 0)
        + monthCogs;
      const profit = revenue - costs;

      monthlyTrends.push({
        month: trendMonth.toLocaleString('default', { month: 'short', year: 'numeric' }),
        revenue,
        costs,
        profit
      });
    }

    // Get recent transactions (last 10)
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
      stats,
      revenueBreakdown: {
        directSales: sales.filter(s => s.saleType === 'DIRECT').reduce((sum, s) => sum + s.totalAmount, 0),
        orderSales: sales.filter(s => s.saleType === 'ORDER_BASED').reduce((sum, s) => sum + s.totalAmount, 0),
        totalSales: totalRevenue,
        returns: 0, // TODO: Implement returns tracking
        netRevenue: totalRevenue
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
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
