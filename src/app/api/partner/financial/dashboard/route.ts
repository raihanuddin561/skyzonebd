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
    
    // Find the Partner record for this user. Prefer the explicit userId
    // link (ADR-008); fall back to matching by email for any Partner rows
    // that predate the link and haven't been connected yet. (Previously
    // matched `{ id: user.id }` instead of `{ userId: user.id }` — Partner.id
    // and User.id are different id spaces, so that branch never matched a
    // real link; fixed as part of the Amazon-style gap-closure Phase 0.)
    const partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { email: user.email }
        ]
      }
    });

    // A pure SELLER with no linked Partner row no longer 404s — the
    // revenue/profit/topProducts sections below are scoped to this seller's
    // own products instead of the whole platform's, and the
    // partnerShare/distributions sections are zeroed (Amazon-Style
    // Wholesale Platform Gap Closure — Phase 4 part 4).
    const sellerScoped = !partner;

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
        },
        ...(sellerScoped ? { orderItems: { some: { product: { sellerId: user.id } } } } : {})
      },
      select: {
        id: true,
        total: true,
        grossProfit: true,
        orderItems: {
          where: sellerScoped ? { product: { sellerId: user.id } } : undefined,
          select: {
            quantity: true,
            costPerUnit: true,
            totalProfit: true,
            total: true
          }
        }
      }
    });

    // Seller-scoped: revenue/profit come from this seller's own items only,
    // since order.total/grossProfit cover every seller on the order.
    const currentRevenue = sellerScoped
      ? currentOrders.reduce((sum, o) => sum + o.orderItems.reduce((s, i) => s + i.total, 0), 0)
      : currentOrders.reduce((sum, o) => sum + o.total, 0);
    const currentProfit = sellerScoped
      ? currentOrders.reduce((sum, o) => sum + o.orderItems.reduce((s, i) => s + (i.totalProfit || 0), 0), 0)
      : currentOrders.reduce((sum, o) => sum + (o.grossProfit || 0), 0);
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
        },
        ...(sellerScoped ? { orderItems: { some: { product: { sellerId: user.id } } } } : {})
      },
      select: {
        id: true,
        total: true,
        grossProfit: true,
        orderItems: sellerScoped ? { where: { product: { sellerId: user.id } }, select: { total: true, totalProfit: true } } : false
      }
    });

    const previousRevenue = sellerScoped
      ? previousOrders.reduce((sum, o: any) => sum + o.orderItems.reduce((s: number, i: any) => s + i.total, 0), 0)
      : previousOrders.reduce((sum, o) => sum + o.total, 0);
    const previousProfit = sellerScoped
      ? previousOrders.reduce((sum, o: any) => sum + o.orderItems.reduce((s: number, i: any) => s + (i.totalProfit || 0), 0), 0)
      : previousOrders.reduce((sum, o) => sum + (o.grossProfit || 0), 0);
    const previousOrderCount = previousOrders.length;

    // === DISTRIBUTION DATA === (a Partner-only concept — empty for a
    // seller with no linked Partner record)
    const distributions = partner
      ? await prisma.profitDistribution.findMany({
          where: { partnerId: partner.id },
          select: { distributionAmount: true, status: true, createdAt: true }
        })
      : [];

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
    const recentDistributions = partner
      ? await prisma.profitDistribution.findMany({
          where: { partnerId: partner.id },
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            distributionAmount: true,
            status: true,
            periodType: true,
            startDate: true,
            endDate: true,
            createdAt: true
          }
        })
      : [];

    // === TOP PRODUCTS === (seller-scoped to this seller's own products
    // when there's no linked Partner record)
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        ...(sellerScoped ? { product: { sellerId: user.id } } : {}),
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
    
    const partnerCurrentShare = partner ? currentProfit * (partner.profitSharePercentage / 100) : 0;
    const partnerPreviousShare = partner ? previousProfit * (partner.profitSharePercentage / 100) : 0;
    
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
            percentage: partner?.profitSharePercentage ?? null,
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
        partnerName: partner?.name ?? user.name
      }
    });
    
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
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
