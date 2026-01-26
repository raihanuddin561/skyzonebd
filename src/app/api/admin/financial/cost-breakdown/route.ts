/**
 * Admin Financial Reports - Cost Breakdown
 * GET /api/admin/financial/cost-breakdown
 * 
 * Detailed expense analysis by category, trends, and cost optimization insights
 * Includes COGS and operational costs breakdown
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { calculateDateRange, formatCurrency, calculatePercentageChange } from '@/lib/financialCalculator';
import { getPaginationParams, createPaginationResponse } from '@/lib/paginationHelper';
import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


type GroupBy = 'day' | 'week' | 'month';

export async function GET(request: NextRequest) {
  const notices: string[] = [];

  try {
    // Authenticate admin
    await requireAdmin(request);
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const periodParam = searchParams.get('period') || 'month';
    const period = (periodParam === 'thisMonth' ? 'month' : periodParam) as 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
    const groupBy = (searchParams.get('groupBy') || 'month') as GroupBy;
    const category = searchParams.get('category'); // Filter by specific category
    
    // Calculate date range
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateRange = calculateDateRange(period, 
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    // === COGS CALCULATION ===
    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        }
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
        orderItems: {
          select: {
            quantity: true,
            costPerUnit: true,
            price: true,
            productId: true,
            product: {
              select: {
                name: true,
                category: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Calculate COGS by product category
    const cogsByCategory = new Map<string, number>();
    let totalCOGS = 0;
    let missingCostCount = 0;
    
    deliveredOrders.forEach(order => {
      order.orderItems.forEach(item => {
        const costPerUnit = item.costPerUnit || 0;
        if (!costPerUnit || costPerUnit === 0) {
          missingCostCount++;
        }
        const cost = costPerUnit * (item.quantity || 0);
        const categoryName = item.product?.category?.name || 'Uncategorized';
        
        cogsByCategory.set(
          categoryName,
          (cogsByCategory.get(categoryName) || 0) + cost
        );
        
        totalCOGS += cost;
      });
    });
    
    if (deliveredOrders.length === 0) {
      notices.push('No delivered orders in the selected period');
    }
    
    if (missingCostCount > 0) {
      notices.push(`${missingCostCount} order items missing costPerUnit - COGS may be inaccurate`);
    }
    
    // === OPERATIONAL COSTS ===
    const whereClause: any = {
      date: {
        gte: dateRange.startDate,
        lte: dateRange.endDate
      }
    };
    
    if (category) {
      whereClause.category = category;
    }
    
    // Get pagination params
    const { skip, take, page, limit } = getPaginationParams(searchParams);
    
    const operationalCosts = await prisma.operationalCost.findMany({
      where: whereClause,
      select: {
        id: true,
        category: true,
        subCategory: true,
        amount: true,
        description: true,
        date: true,
        createdAt: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    if (operationalCosts.length === 0) {
      notices.push('No operational costs recorded for the selected period');
    }
    
    // Calculate total operational costs
    const totalOperationalCosts = operationalCosts.reduce((sum, c) => sum + c.amount, 0);
    
    // Group operational costs by category
    const operationalByCategory = operationalCosts.reduce((acc, cost) => {
      if (!acc[cost.category]) {
        acc[cost.category] = {
          category: cost.category,
          total: 0,
          count: 0,
          items: []
        };
      }
      acc[cost.category].total += cost.amount;
      acc[cost.category].count += 1;
      acc[cost.category].items.push(cost);
      return acc;
    }, {} as Record<string, any>);
    
    // Group operational costs by subcategory
    const operationalBySubcategory = operationalCosts.reduce((acc, cost) => {
      if (cost.subCategory) {
        if (!acc[cost.subCategory]) {
          acc[cost.subCategory] = {
            subcategory: cost.subCategory,
            category: cost.category,
            total: 0,
            count: 0
          };
        }
        acc[cost.subCategory].total += cost.amount;
        acc[cost.subCategory].count += 1;
      }
      return acc;
    }, {} as Record<string, any>);
    
    // Group costs by time period
    const timeSeriesData = new Map<string, {
      date: Date;
      cogs: number;
      operational: number;
      total: number;
    }>();
    
    // Add COGS to time series
    deliveredOrders.forEach(order => {
      let periodStart: Date;
      
      switch (groupBy) {
        case 'week':
          periodStart = startOfWeek(order.createdAt, { weekStartsOn: 6 });
          break;
        case 'month':
          periodStart = startOfMonth(order.createdAt);
          break;
        case 'day':
        default:
          periodStart = startOfDay(order.createdAt);
          break;
      }
      
      const key = periodStart.toISOString();
      
      if (!timeSeriesData.has(key)) {
        timeSeriesData.set(key, {
          date: periodStart,
          cogs: 0,
          operational: 0,
          total: 0
        });
      }
      
      const group = timeSeriesData.get(key)!;
      const orderCOGS = order.orderItems.reduce((sum, i) => sum + (i.costPerUnit || 0) * i.quantity, 0);
      group.cogs += orderCOGS;
      group.total += orderCOGS;
    });
    
    // Add operational costs to time series
    operationalCosts.forEach(cost => {
      let periodStart: Date;
      
      switch (groupBy) {
        case 'week':
          periodStart = startOfWeek(cost.date, { weekStartsOn: 6 });
          break;
        case 'month':
          periodStart = startOfMonth(cost.date);
          break;
        case 'day':
        default:
          periodStart = startOfDay(cost.date);
          break;
      }
      
      const key = periodStart.toISOString();
      
      if (!timeSeriesData.has(key)) {
        timeSeriesData.set(key, {
          date: periodStart,
          cogs: 0,
          operational: 0,
          total: 0
        });
      }
      
      const group = timeSeriesData.get(key)!;
      group.operational += cost.amount;
      group.total += cost.amount;
    });
    
    // Convert to sorted array with enrichment
    const timeSeries = Array.from(timeSeriesData.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((period, index, array) => {
        // Calculate growth from previous period
        let growth = 0;
        if (index > 0) {
          const prevTotal = array[index - 1].total;
          growth = calculatePercentageChange(prevTotal, period.total);
        }
        
        return {
          date: period.date,
          formattedDate: formatGroupedDate(period.date, groupBy),
          cogs: period.cogs,
          operational: period.operational,
          total: period.total,
          growth,
          cogsPercentage: period.total > 0 ? (period.cogs / period.total) * 100 : 0,
          operationalPercentage: period.total > 0 ? (period.operational / period.total) * 100 : 0,
          // Formatted
          cogsFormatted: formatCurrency(period.cogs),
          operationalFormatted: formatCurrency(period.operational),
          totalFormatted: formatCurrency(period.total)
        };
      });
    
    // Calculate total costs
    const totalCosts = totalCOGS + totalOperationalCosts;
    const cogsPercentage = totalCosts > 0 ? (totalCOGS / totalCosts) * 100 : 0;
    const operationalPercentage = totalCosts > 0 ? (totalOperationalCosts / totalCosts) * 100 : 0;
    
    // Calculate revenue for cost ratios
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
    const cogsToRevenueRatio = totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 0;
    const operationalToRevenueRatio = totalRevenue > 0 ? (totalOperationalCosts / totalRevenue) * 100 : 0;
    
    // Prepare category summaries
    const cogsCategorySummary = Array.from(cogsByCategory.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalCOGS > 0 ? (amount / totalCOGS) * 100 : 0,
      amountFormatted: formatCurrency(amount)
    })).sort((a, b) => b.amount - a.amount);
    
    const operationalCategorySummary = Object.values(operationalByCategory).map((cat: any) => ({
      category: cat.category,
      amount: cat.total,
      count: cat.count,
      percentage: totalOperationalCosts > 0 ? (cat.total / totalOperationalCosts) * 100 : 0,
      averagePerTransaction: cat.count > 0 ? cat.total / cat.count : 0,
      amountFormatted: formatCurrency(cat.total)
    })).sort((a, b) => b.amount - a.amount);
    
    const subcategorySummary = Object.values(operationalBySubcategory).map((sub: any) => ({
      subcategory: sub.subCategory,
      category: sub.category,
      amount: sub.total,
      count: sub.count,
      amountFormatted: formatCurrency(sub.total)
    })).sort((a, b) => b.amount - a.amount);
    
    // Apply pagination to detailed operational costs
    const totalOperationalItems = operationalCosts.length;
    const paginatedCosts = operationalCosts.slice(skip, skip + take);
    const pagination = createPaginationResponse(totalOperationalItems, page, limit);
    
    // Cost optimization insights
    const insights = {
      highestCostCategory: operationalCategorySummary[0]?.category || null,
      lowestCostCategory: operationalCategorySummary[operationalCategorySummary.length - 1]?.category || null,
      averageDailyCost: timeSeries.length > 0 
        ? totalCosts / timeSeries.length 
        : 0,
      costTrend: timeSeries.length >= 2
        ? timeSeries[timeSeries.length - 1].total > timeSeries[0].total 
          ? 'increasing' 
          : 'decreasing'
        : 'stable'
    };
    
    return NextResponse.json({
      success: true,
      notices,
      data: {
        summary: {
          totalCosts,
          totalCOGS,
          totalOperationalCosts,
          cogsPercentage,
          operationalPercentage,
          cogsToRevenueRatio,
          operationalToRevenueRatio,
          totalRevenue,
          // Formatted
          totalCostsFormatted: formatCurrency(totalCosts),
          totalCOGSFormatted: formatCurrency(totalCOGS),
          totalOperationalFormatted: formatCurrency(totalOperationalCosts)
        },
        timeSeries,
        cogs: {
          total: totalCOGS,
          byCategory: cogsCategorySummary
        },
        operational: {
          total: totalOperationalCosts,
          byCategory: operationalCategorySummary,
          bySubcategory: subcategorySummary,
          detailedCosts: paginatedCosts.map(c => ({
            id: c.id,
            category: c.category,
            subcategory: c.subCategory,
            amount: c.amount,
            description: c.description,
            date: c.date,
            amountFormatted: formatCurrency(c.amount)
          }))
        },
        insights,
        dateRange: {
          start: dateRange.startDate,
          end: dateRange.endDate,
          period,
          groupBy
        }
      },
      pagination,
      meta: {
        generatedAt: new Date().toISOString(),
        categoryFilter: category || 'all'
      }
    });
    
  } catch (error) {
    console.error('Cost Breakdown Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch cost breakdown',
        details: error instanceof Error ? error.message : 'Unknown error',
        notices: ['Server error occurred']
      },
      { status: 500 }
    );
  }
}

function formatGroupedDate(date: Date, groupBy: GroupBy): string {
  switch (groupBy) {
    case 'month':
      return format(date, 'MMMM yyyy');
    case 'week':
      return `Week of ${format(date, 'MMM dd, yyyy')}`;
    case 'day':
    default:
      return format(date, 'MMM dd, yyyy');
  }
}
