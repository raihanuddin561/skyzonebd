/**
 * Admin Financial Reports - Revenue Analytics
 * GET /api/admin/financial/revenue-analytics
 * 
 * Detailed revenue analysis with trends, forecasting, and breakdown
 * Includes revenue sources, growth metrics, and predictive insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { calculateDateRange, formatCurrency, calculatePercentageChange, calculateGrowthRate } from '@/lib/financialCalculator';
import { startOfDay, startOfWeek, startOfMonth, format, addDays, addWeeks, addMonths } from 'date-fns';

type GroupBy = 'day' | 'week' | 'month';

export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    await requireAdmin(request);
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const periodParam = searchParams.get('period') || 'month';
    const period = (periodParam === 'last30days' ? 'month' : periodParam) as 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
    const groupBy = (searchParams.get('groupBy') || 'day') as GroupBy;
    const includeForecast = searchParams.get('forecast') === 'true';
    
    // Calculate date range
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateRange = calculateDateRange(period, 
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    // Get all delivered orders in date range
    const orders = await prisma.order.findMany({
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
        subtotal: true,
        shipping: true,
        grossProfit: true,
        createdAt: true,
        paymentMethod: true,
        orderItems: {
          select: {
            quantity: true,
            productId: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Group orders by time period
    const grouped = new Map<string, {
      date: Date;
      orderCount: number;
      revenue: number;
      subtotal: number;
      shipping: number;
      discounts: number;
      profit: number;
      units: number;
    }>();
    
    orders.forEach(order => {
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
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          date: periodStart,
          orderCount: 0,
          revenue: 0,
          subtotal: 0,
          shipping: 0,
          discounts: 0,
          profit: 0,
          units: 0
        });
      }
      
      const group = grouped.get(key)!;
      group.orderCount += 1;
      group.revenue += order.total;
      group.subtotal += order.subtotal;
      group.shipping += order.shipping || 0;
      group.discounts += 0;
      group.profit += order.grossProfit || 0;
      group.units += order.orderItems.reduce((sum, i) => sum + i.quantity, 0);
    });
    
    // Convert to sorted array
    const timeSeriesData = Array.from(grouped.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((period, index, array) => {
        const aov = period.orderCount > 0 ? period.revenue / period.orderCount : 0;
        const profitMargin = period.revenue > 0 ? (period.profit / period.revenue) * 100 : 0;
        
        // Calculate growth from previous period
        let growth = 0;
        if (index > 0) {
          const prevRevenue = array[index - 1].revenue;
          growth = calculatePercentageChange(prevRevenue, period.revenue);
        }
        
        return {
          date: period.date,
          formattedDate: formatGroupedDate(period.date, groupBy),
          orderCount: period.orderCount,
          revenue: period.revenue,
          subtotal: period.subtotal,
          shipping: period.shipping,
          discounts: period.discounts,
          profit: period.profit,
          profitMargin,
          units: period.units,
          averageOrderValue: aov,
          growth,
          // Formatted
          revenueFormatted: formatCurrency(period.revenue),
          profitFormatted: formatCurrency(period.profit)
        };
      });
    
    // Calculate overall statistics
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalSubtotal = orders.reduce((sum, o) => sum + o.subtotal, 0);
    const totalShipping = orders.reduce((sum, o) => sum + (o.shipping || 0), 0);
    const totalDiscounts = orders.reduce((sum, o) => sum + 0, 0);
    const totalProfit = orders.reduce((sum, o) => sum + (o.grossProfit || 0), 0);
    const totalOrders = orders.length;
    const totalUnits = orders.reduce((sum, o) => 
      sum + o.orderItems.reduce((itemSum, i) => itemSum + i.quantity, 0), 0
    );
    
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const averageProfit = totalOrders > 0 ? totalProfit / totalOrders : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    // Revenue sources breakdown
    const byPaymentMethod = orders.reduce((acc, order) => {
      const method = order.paymentMethod || 'UNKNOWN';
      if (!acc[method]) {
        acc[method] = {
          count: 0,
          revenue: 0
        };
      }
      acc[method].count += 1;
      acc[method].revenue += order.total;
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);
    
    // Calculate growth rate for forecasting
    let forecast = null;
    if (includeForecast && timeSeriesData.length >= 3) {
      // Calculate average growth rate from all periods
      let totalGrowth = 0;
      let growthCount = 0;
      
      for (let i = 1; i < timeSeriesData.length; i++) {
        const prevRevenue = timeSeriesData[i - 1].revenue;
        const currRevenue = timeSeriesData[i].revenue;
        if (prevRevenue > 0) {
          totalGrowth += (currRevenue - prevRevenue) / prevRevenue;
          growthCount++;
        }
      }
      
      const avgGrowthRate = growthCount > 0 ? totalGrowth / growthCount : 0;
      
      // Generate forecast for next 3 periods
      const lastPeriod = timeSeriesData[timeSeriesData.length - 1];
      const forecastPeriods = [];
      
      for (let i = 1; i <= 3; i++) {
        let nextDate: Date;
        
        switch (groupBy) {
          case 'week':
            nextDate = addWeeks(lastPeriod.date, i);
            break;
          case 'month':
            nextDate = addMonths(lastPeriod.date, i);
            break;
          case 'day':
          default:
            nextDate = addDays(lastPeriod.date, i);
            break;
        }
        
        const forecastedRevenue = lastPeriod.revenue * Math.pow(1 + avgGrowthRate, i);
        
        forecastPeriods.push({
          date: nextDate,
          formattedDate: formatGroupedDate(nextDate, groupBy),
          forecastedRevenue,
          forecastedRevenueFormatted: formatCurrency(forecastedRevenue),
          confidence: 'medium' // Could be calculated based on variance
        });
      }
      
      forecast = {
        growthRate: avgGrowthRate * 100, // Convert to percentage
        periods: forecastPeriods,
        notes: 'Forecast based on historical growth rate. Actual results may vary.'
      };
    }
    
    // Identify trends
    const trends = {
      isGrowing: timeSeriesData.length >= 2 && 
        timeSeriesData[timeSeriesData.length - 1].revenue > timeSeriesData[0].revenue,
      averageGrowthRate: timeSeriesData.length >= 2
        ? calculatePercentageChange(
            timeSeriesData[0].revenue,
            timeSeriesData[timeSeriesData.length - 1].revenue
          )
        : 0,
      peakRevenue: Math.max(...timeSeriesData.map(d => d.revenue)),
      lowestRevenue: Math.min(...timeSeriesData.map(d => d.revenue)),
      mostProductiveDay: timeSeriesData.reduce((max, d) => 
        d.revenue > max.revenue ? d : max, timeSeriesData[0] || { revenue: 0, date: new Date(), formattedDate: '' }
      )
    };
    
    return NextResponse.json({
      success: true,
      data: {
        timeSeries: timeSeriesData,
        summary: {
          totalRevenue,
          totalSubtotal,
          totalShipping,
          totalDiscounts,
          totalProfit,
          totalOrders,
          totalUnits,
          averageOrderValue,
          averageProfit,
          profitMargin,
          // Formatted
          totalRevenueFormatted: formatCurrency(totalRevenue),
          totalProfitFormatted: formatCurrency(totalProfit),
          averageOrderValueFormatted: formatCurrency(averageOrderValue)
        },
        breakdown: {
          byPaymentMethod: Object.entries(byPaymentMethod).map(([method, data]) => ({
            method,
            count: data.count,
            revenue: data.revenue,
            percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
            revenueFormatted: formatCurrency(data.revenue)
          }))
        },
        trends,
        forecast,
        dateRange: {
          start: dateRange.startDate,
          end: dateRange.endDate,
          period,
          groupBy
        }
      },
      meta: {
        generatedAt: new Date().toISOString(),
        dataPoints: timeSeriesData.length
      }
    });
    
  } catch (error) {
    console.error('Revenue Analytics Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch revenue analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
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
