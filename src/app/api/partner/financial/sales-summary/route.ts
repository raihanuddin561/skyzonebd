/**
 * Partner Financial Dashboard - Sales Summary
 * GET /api/partner/financial/sales-summary
 * 
 * Provides daily/weekly/monthly sales breakdown with trends
 * Includes revenue, orders, average order value, and growth metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePartner } from '@/lib/auth';
import { calculateDateRange, calculatePercentageChange, formatCurrency } from '@/lib/financialCalculator';
import { getPaginationParams, createPaginationResponse } from '@/lib/paginationHelper';
import { startOfDay, startOfWeek, startOfMonth, endOfDay, format } from 'date-fns';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


type GroupBy = 'day' | 'week' | 'month';

export async function GET(request: NextRequest) {
  try {
    // Authenticate partner
    const user = await requirePartner(request);
    
    // Find partner record
    const partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { email: user.email },
          { id: user.id }
        ]
      }
    });
    
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner record not found' },
        { status: 404 }
      );
    }
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const groupBy = (searchParams.get('groupBy') || 'day') as GroupBy;
    const periodParam = searchParams.get('period') || 'last30days'; // last7days, last30days, thisMonth, lastMonth, custom
    
    // Map period strings to valid types
    const periodMap: Record<string, 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'> = {
      'today': 'today',
      'last7days': 'week',
      'thisWeek': 'week',
      'week': 'week',
      'last30days': 'month',
      'thisMonth': 'month',
      'lastMonth': 'month',
      'month': 'month',
      'thisQuarter': 'quarter',
      'quarter': 'quarter',
      'thisYear': 'year',
      'year': 'year',
      'custom': 'custom'
    };
    
    const period = periodMap[periodParam] || 'month';
    
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    // Calculate date range
    const dateRange = calculateDateRange(
      period, 
      startDateParam ? new Date(startDateParam) : undefined,
      endDateParam ? new Date(endDateParam) : undefined
    );
    
    if (!dateRange.startDate || !dateRange.endDate) {
      return NextResponse.json(
        { success: false, error: 'Invalid date range' },
        { status: 400 }
      );
    }
    
    // Get pagination params
    const { skip, take, page, limit } = getPaginationParams(searchParams);
    
    // Get all delivered orders in the date range
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
        grossProfit: true,
        createdAt: true,
        orderItems: {
          select: {
            quantity: true,
            price: true,
            total: true,
            totalProfit: true,
            costPerUnit: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Group orders by time period
    const grouped = new Map<string, {
      date: Date;
      orderCount: number;
      revenue: number;
      profit: number;
      costs: number;
      units: number;
    }>();
    
    orders.forEach(order => {
      let periodStart: Date;
      
      switch (groupBy) {
        case 'week':
          periodStart = startOfWeek(order.createdAt, { weekStartsOn: 6 }); // Saturday
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
          profit: 0,
          costs: 0,
          units: 0
        });
      }
      
      const group = grouped.get(key)!;
      group.orderCount += 1;
      group.revenue += order.total;
      group.profit += order.grossProfit || 0;
      
      // Sum up item-level data
      order.orderItems.forEach(item => {
        group.costs += (item.costPerUnit || 0) * item.quantity;
        group.units += item.quantity;
      });
    });
    
    // Convert map to sorted array
    let salesData = Array.from(grouped.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Calculate total count before pagination
    const total = salesData.length;
    
    // Apply pagination
    salesData = salesData.slice(skip, skip + take);
    
    // Calculate metrics for each period
    const enrichedData = salesData.map(period => {
      const aov = period.orderCount > 0 ? period.revenue / period.orderCount : 0;
      const profitMargin = period.revenue > 0 ? (period.profit / period.revenue) * 100 : 0;
      const partnerShare = period.profit * (partner.profitSharePercentage / 100);
      
      return {
        date: period.date,
        formattedDate: formatGroupedDate(period.date, groupBy),
        orderCount: period.orderCount,
        revenue: period.revenue,
        costs: period.costs,
        profit: period.profit,
        profitMargin,
        partnerShare,
        units: period.units,
        averageOrderValue: aov,
        revenueFormatted: formatCurrency(period.revenue),
        profitFormatted: formatCurrency(period.profit),
        partnerShareFormatted: formatCurrency(partnerShare)
      };
    });
    
    // Calculate overall summary for the entire date range
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalProfit = orders.reduce((sum, o) => sum + (o.grossProfit || 0), 0);
    const totalOrders = orders.length;
    const totalUnits = orders.reduce((sum, o) => 
      sum + o.orderItems.reduce((itemSum, i) => itemSum + i.quantity, 0), 0
    );
    const totalCosts = orders.reduce((sum, o) =>
      sum + o.orderItems.reduce((itemSum, i) => itemSum + (i.costPerUnit || 0) * i.quantity, 0), 0
    );
    
    const overallAOV = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const overallProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const partnerTotalShare = totalProfit * (partner.profitSharePercentage / 100);
    
    // Calculate comparison with previous period (if applicable)
    let comparison = null;
    if (enrichedData.length >= 2) {
      const latest = enrichedData[0];
      const previous = enrichedData[1];
      
      comparison = {
        revenueChange: calculatePercentageChange(previous.revenue, latest.revenue),
        profitChange: calculatePercentageChange(previous.profit, latest.profit),
        ordersChange: calculatePercentageChange(previous.orderCount, latest.orderCount),
        aovChange: calculatePercentageChange(previous.averageOrderValue, latest.averageOrderValue)
      };
    }
    
    // Create pagination metadata
    const pagination = createPaginationResponse(total, page, limit);
    
    return NextResponse.json({
      success: true,
      data: {
        periods: enrichedData,
        summary: {
          totalRevenue,
          totalCosts,
          totalProfit,
          totalOrders,
          totalUnits,
          averageOrderValue: overallAOV,
          profitMargin: overallProfitMargin,
          partnerShare: partnerTotalShare,
          partnerSharePercentage: partner.profitSharePercentage
        },
        comparison,
        dateRange: {
          start: dateRange.startDate,
          end: dateRange.endDate,
          groupBy,
          period
        }
      },
      pagination,
      meta: {
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Partner Sales Summary Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch sales summary',
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
