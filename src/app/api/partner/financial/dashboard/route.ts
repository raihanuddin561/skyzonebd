/**
 * Partner Financial Dashboard - Overview
 * GET /api/partner/financial/dashboard
 * 
 * Consolidated dashboard with key financial metrics
 * Combines revenue, profit, orders, and distribution status
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePartner } from '@/lib/auth';
import { calculateDateRange, formatCurrency, calculatePercentageChange } from '@/lib/financialCalculator';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


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
    
    // Parse query parameters for date range
    const searchParams = request.nextUrl.searchParams;
    const periodParam = searchParams.get('period') || 'thisMonth';
    
    // Map period strings to valid types
    const periodMap: Record<string, 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'> = {
      'today': 'today',
      'thisWeek': 'week',
      'week': 'week',
      'thisMonth': 'month',
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
    
    const dateRange = calculateDateRange(
      period, 
      startDateParam ? new Date(startDateParam) : undefined,
      endDateParam ? new Date(endDateParam) : undefined
    );
    
    // Get previous period for comparison
    const previousPeriod = calculatePreviousPeriod(dateRange.startDate, dateRange.endDate);
    
    // === CURRENT PERIOD DATA ===
    const currentOrders = await prisma.order.findMany({
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
        grossProfit: true,
        orderItems: {
          select: {
            quantity: true,
            costPerUnit: true,
            totalProfit: true
          }
        }
      }
    });
    
    const currentRevenue = currentOrders.reduce((sum, o) => sum + o.total, 0);
    const currentProfit = currentOrders.reduce((sum, o) => sum + (o.grossProfit || 0), 0);
    const currentOrderCount = currentOrders.length;
    const currentUnits = currentOrders.reduce((sum, o) => 
      sum + o.orderItems.reduce((itemSum, i) => itemSum + i.quantity, 0), 0
    );
    const currentCosts = currentOrders.reduce((sum, o) =>
      sum + o.orderItems.reduce((itemSum, i) => itemSum + (i.costPerUnit || 0) * i.quantity, 0), 0
    );
    
    // === PREVIOUS PERIOD DATA ===
    const previousOrders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: previousPeriod.startDate,
          lte: previousPeriod.endDate
        }
      },
      select: {
        id: true,
        total: true,
        grossProfit: true
      }
    });
    
    const previousRevenue = previousOrders.reduce((sum, o) => sum + o.total, 0);
    const previousProfit = previousOrders.reduce((sum, o) => sum + (o.grossProfit || 0), 0);
    const previousOrderCount = previousOrders.length;
    
    // === DISTRIBUTION DATA ===
    const distributions = await prisma.profitDistribution.findMany({
      where: {
        partnerId: partner.id
      },
      select: {
        distributionAmount: true,
        status: true,
        createdAt: true
      }
    });
    
    const totalPaid = distributions
      .filter(d => d.status === 'PAID')
      .reduce((sum, d) => sum + d.distributionAmount, 0);
    
    const totalApproved = distributions
      .filter(d => d.status === 'APPROVED')
      .reduce((sum, d) => sum + d.distributionAmount, 0);
    
    const totalPending = distributions
      .filter(d => d.status === 'PENDING')
      .reduce((sum, d) => sum + d.distributionAmount, 0);
    
    const outstandingPayouts = totalApproved; // Approved but not yet paid
    
    // Get recent distributions
    const recentDistributions = await prisma.profitDistribution.findMany({
      where: {
        partnerId: partner.id
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        distributionAmount: true,
        status: true,
        periodType: true,
        startDate: true,
        endDate: true,
        createdAt: true
      }
    });
    
    // === TOP PRODUCTS ===
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: 'DELIVERED',
          createdAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        }
      },
      _sum: {
        quantity: true,
        total: true,
        totalProfit: true
      },
      _avg: {
        profitMargin: true
      },
      orderBy: {
        _sum: {
          totalProfit: 'desc'
        }
      },
      take: 5
    });
    
    // Enrich top products with product details
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            sku: true,
            imageUrl: true,
            imageUrls: true
          }
        });
        
        return {
          productId: item.productId,
          productName: product?.name || 'Unknown',
          sku: product?.sku || '',
          image: product?.imageUrl || null,
          unitsSold: item._sum.quantity || 0,
          revenue: item._sum.total || 0,
          profit: item._sum.totalProfit || 0,
          profitMargin: item._avg.profitMargin || 0
        };
      })
    );
    
    // === CALCULATE METRICS ===
    const currentAOV = currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;
    const previousAOV = previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;
    const currentProfitMargin = currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0;
    const previousProfitMargin = previousRevenue > 0 ? (previousProfit / previousRevenue) * 100 : 0;
    
    const partnerCurrentShare = currentProfit * (partner.profitSharePercentage / 100);
    const partnerPreviousShare = previousProfit * (partner.profitSharePercentage / 100);
    
    // Calculate percentage changes
    const revenueChange = calculatePercentageChange(previousRevenue, currentRevenue);
    const profitChange = calculatePercentageChange(previousProfit, currentProfit);
    const ordersChange = calculatePercentageChange(previousOrderCount, currentOrderCount);
    const aovChange = calculatePercentageChange(previousAOV, currentAOV);
    const profitMarginChange = calculatePercentageChange(previousProfitMargin, currentProfitMargin);
    const partnerShareChange = calculatePercentageChange(partnerPreviousShare, partnerCurrentShare);
    
    return NextResponse.json({
      success: true,
      data: {
        overview: {
          revenue: {
            current: currentRevenue,
            previous: previousRevenue,
            change: revenueChange,
            formatted: formatCurrency(currentRevenue)
          },
          profit: {
            current: currentProfit,
            previous: previousProfit,
            change: profitChange,
            formatted: formatCurrency(currentProfit)
          },
          partnerShare: {
            current: partnerCurrentShare,
            previous: partnerPreviousShare,
            change: partnerShareChange,
            percentage: partner.profitSharePercentage,
            formatted: formatCurrency(partnerCurrentShare)
          },
          orders: {
            current: currentOrderCount,
            previous: previousOrderCount,
            change: ordersChange
          },
          averageOrderValue: {
            current: currentAOV,
            previous: previousAOV,
            change: aovChange,
            formatted: formatCurrency(currentAOV)
          },
          profitMargin: {
            current: currentProfitMargin,
            previous: previousProfitMargin,
            change: profitMarginChange
          }
        },
        distributions: {
          totalPaid,
          totalApproved,
          totalPending,
          outstandingPayouts,
          recent: recentDistributions,
          totalPaidFormatted: formatCurrency(totalPaid),
          outstandingFormatted: formatCurrency(outstandingPayouts)
        },
        topProducts: topProductsWithDetails,
        costs: {
          current: currentCosts,
          formatted: formatCurrency(currentCosts)
        },
        units: {
          current: currentUnits
        },
        dateRange: {
          current: {
            start: dateRange.startDate,
            end: dateRange.endDate
          },
          previous: {
            start: previousPeriod.startDate,
            end: previousPeriod.endDate
          },
          period
        }
      },
      meta: {
        generatedAt: new Date().toISOString(),
        partnerName: partner.name
      }
    });
    
  } catch (error) {
    console.error('Partner Dashboard Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function calculatePreviousPeriod(startDate: Date, endDate: Date): { startDate: Date; endDate: Date } {
  const duration = endDate.getTime() - startDate.getTime();
  
  return {
    startDate: new Date(startDate.getTime() - duration),
    endDate: new Date(startDate.getTime() - 1) // One millisecond before current period
  };
}
