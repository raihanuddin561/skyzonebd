/**
 * Admin Financial Reports - Partner Comparison
 * GET /api/admin/financial/partner-comparison
 * 
 * Compare financial performance across all partners
 * Shows revenue contribution, profit share, and growth metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { calculateDateRange, formatCurrency, calculatePercentageChange } from '@/lib/financialCalculator';
import { getPaginationParams, createPaginationResponse } from '@/lib/paginationHelper';

export async function GET(request: NextRequest) {
  const notices: string[] = [];

  try {
    // Authenticate admin
    await requireAdmin(request);
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const periodParam = searchParams.get('period') || 'month';
    const period = (periodParam === 'thisMonth' ? 'month' : periodParam) as 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
    const sortBy = searchParams.get('sortBy') || 'revenue'; // revenue, profit, distributions, orders
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Calculate date range
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateRange = calculateDateRange(period, 
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    // Get previous period for comparison
    const previousPeriod = calculatePreviousPeriod(dateRange.startDate, dateRange.endDate);
    
    // Get pagination params
    const { skip, take, page, limit } = getPaginationParams(searchParams);
    
    // Get all partners
    const allPartners = await prisma.partner.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        profitSharePercentage: true,
        isActive: true,
        createdAt: true
      }
    });
    
    if (allPartners.length === 0) {
      notices.push('No partners found in the system');
    }
    
    // Calculate metrics for each partner
    const partnerMetrics = await Promise.all(
      allPartners.map(async (partner) => {
        // Current period data
        const currentOrders = await prisma.order.findMany({
          where: {
            status: 'DELIVERED',
            createdAt: {
              gte: dateRange.startDate,
              lte: dateRange.endDate
            }
          },
          select: {
            total: true,
            grossProfit: true,
            orderItems: {
              select: {
                quantity: true
              }
            }
          }
        });
        
        const currentRevenue = currentOrders.reduce((sum, o) => sum + o.total, 0);
        const currentProfit = currentOrders.reduce((sum, o) => sum + (o.grossProfit || 0), 0);
        const currentOrders_count = currentOrders.length;
        const currentUnits = currentOrders.reduce((sum, o) => 
          sum + o.orderItems.reduce((itemSum, i) => itemSum + i.quantity, 0), 0
        );
        
        // Previous period data
        const previousOrders = await prisma.order.findMany({
          where: {
            status: 'DELIVERED',
            createdAt: {
              gte: previousPeriod.startDate,
              lte: previousPeriod.endDate
            }
          },
          select: {
            total: true,
            grossProfit: true
          }
        });
        
        const previousRevenue = previousOrders.reduce((sum, o) => sum + o.total, 0);
        const previousProfit = previousOrders.reduce((sum, o) => sum + (o.grossProfit || 0), 0);
        
        // Distributions
        const distributions = await prisma.profitDistribution.findMany({
          where: {
            partnerId: partner.id,
            createdAt: {
              gte: dateRange.startDate,
              lte: dateRange.endDate
            }
          },
          select: {
            distributionAmount: true,
            status: true
          }
        });
        
        const totalDistributions = distributions.reduce((sum, d) => sum + d.distributionAmount, 0);
        const paidDistributions = distributions
          .filter(d => d.status === 'PAID')
          .reduce((sum, d) => sum + d.distributionAmount, 0);
        const pendingDistributions = distributions
          .filter(d => d.status === 'PENDING')
          .reduce((sum, d) => sum + d.distributionAmount, 0);
        const approvedDistributions = distributions
          .filter(d => d.status === 'APPROVED')
          .reduce((sum, d) => sum + d.distributionAmount, 0);
        
        // Calculate metrics
        const partnerShare = currentProfit * (partner.profitSharePercentage / 100);
        const averageOrderValue = currentOrders_count > 0 ? currentRevenue / currentOrders_count : 0;
        const profitMargin = currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0;
        
        // Calculate growth
        const revenueGrowth = calculatePercentageChange(previousRevenue, currentRevenue);
        const profitGrowth = calculatePercentageChange(previousProfit, currentProfit);
        
        return {
          partnerId: partner.id,
          partnerName: partner.name,
          email: partner.email,
          profitSharePercentage: partner.profitSharePercentage,
          isActive: partner.isActive,
          revenue: {
            current: currentRevenue,
            previous: previousRevenue,
            growth: revenueGrowth
          },
          profit: {
            current: currentProfit,
            previous: previousProfit,
            growth: profitGrowth
          },
          partnerShare: {
            entitled: partnerShare,
            distributed: totalDistributions,
            paid: paidDistributions,
            pending: pendingDistributions,
            approved: approvedDistributions,
            outstanding: approvedDistributions // Approved but not paid
          },
          orders: {
            count: currentOrders_count,
            averageValue: averageOrderValue
          },
          units: currentUnits,
          profitMargin,
          // Formatted values
          revenueFormatted: formatCurrency(currentRevenue),
          profitFormatted: formatCurrency(currentProfit),
          partnerShareFormatted: formatCurrency(partnerShare),
          distributedFormatted: formatCurrency(totalDistributions)
        };
      })
    );
    
    // Sort partners
    let sortedPartners = [...partnerMetrics];
    
    switch (sortBy) {
      case 'profit':
        sortedPartners.sort((a, b) => 
          sortOrder === 'desc' 
            ? b.profit.current - a.profit.current
            : a.profit.current - b.profit.current
        );
        break;
      case 'distributions':
        sortedPartners.sort((a, b) => 
          sortOrder === 'desc'
            ? b.partnerShare.distributed - a.partnerShare.distributed
            : a.partnerShare.distributed - b.partnerShare.distributed
        );
        break;
      case 'orders':
        sortedPartners.sort((a, b) => 
          sortOrder === 'desc'
            ? b.orders.count - a.orders.count
            : a.orders.count - b.orders.count
        );
        break;
      case 'revenue':
      default:
        sortedPartners.sort((a, b) => 
          sortOrder === 'desc'
            ? b.revenue.current - a.revenue.current
            : a.revenue.current - b.revenue.current
        );
        break;
    }
    
    // Calculate totals
    const totalRevenue = partnerMetrics.reduce((sum, p) => sum + p.revenue.current, 0);
    const totalProfit = partnerMetrics.reduce((sum, p) => sum + p.profit.current, 0);
    const totalDistributions = partnerMetrics.reduce((sum, p) => sum + p.partnerShare.distributed, 0);
    const totalOrders = partnerMetrics.reduce((sum, p) => sum + p.orders.count, 0);
    const totalUnits = partnerMetrics.reduce((sum, p) => sum + p.units, 0);
    
    // Calculate platform retained profit
    const totalPartnerShares = partnerMetrics.reduce((sum, p) => sum + p.partnerShare.entitled, 0);
    const platformRetained = totalProfit - totalPartnerShares;
    
    // Apply pagination
    const total = sortedPartners.length;
    const paginatedPartners = sortedPartners.slice(skip, skip + take);
    
    // Calculate each partner's contribution percentage
    const enrichedPartners = paginatedPartners.map(p => ({
      ...p,
      contribution: {
        revenuePercentage: totalRevenue > 0 ? (p.revenue.current / totalRevenue) * 100 : 0,
        profitPercentage: totalProfit > 0 ? (p.profit.current / totalProfit) * 100 : 0,
        ordersPercentage: totalOrders > 0 ? (p.orders.count / totalOrders) * 100 : 0
      }
    }));
    
    // Create pagination metadata
    const pagination = createPaginationResponse(total, page, limit);
    
    return NextResponse.json({
      success: true,
      notices,
      data: {
        partners: enrichedPartners,
        summary: {
          totalRevenue,
          totalProfit,
          totalDistributions,
          totalOrders,
          totalUnits,
          platformRetained,
          totalPartnerShares,
          averageRevenuePerPartner: allPartners.length > 0 ? totalRevenue / allPartners.length : 0,
          averageProfitPerPartner: allPartners.length > 0 ? totalProfit / allPartners.length : 0,
          // Formatted
          totalRevenueFormatted: formatCurrency(totalRevenue),
          totalProfitFormatted: formatCurrency(totalProfit),
          platformRetainedFormatted: formatCurrency(platformRetained)
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
      pagination,
      meta: {
        generatedAt: new Date().toISOString(),
        sortBy,
        sortOrder
      }
    });
    
  } catch (error) {
    console.error('Partner Comparison Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch partner comparison',
        details: error instanceof Error ? error.message : 'Unknown error',
        notices: ['Server error occurred']
      },
      { status: 500 }
    );
  }
}

function calculatePreviousPeriod(startDate: Date, endDate: Date): { startDate: Date; endDate: Date } {
  const duration = endDate.getTime() - startDate.getTime();
  
  return {
    startDate: new Date(startDate.getTime() - duration),
    endDate: new Date(startDate.getTime() - 1)
  };
}
