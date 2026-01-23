/**
 * Admin Financial Reports - Platform-Wide P&L
 * GET /api/admin/financial/profit-loss
 * 
 * Comprehensive platform profit & loss statement
 * Includes all revenue, costs, expenses, and partner distributions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { calculateDateRange, formatCurrency } from '@/lib/financialCalculator';

export async function GET(request: NextRequest) {
  const notices: string[] = [];

  try {
    // Authenticate admin
    await requireAdmin(request);
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const periodParam = searchParams.get('period') || 'month';
    const period = (periodParam === 'thisMonth' ? 'month' : periodParam) as 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
    const format = searchParams.get('format') || 'summary'; // summary or detailed
    
    // Calculate date range
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const dateRange = calculateDateRange(period, 
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    
    // === REVENUE CALCULATION ===
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
        subtotal: true,
        shipping: true,
        grossProfit: true,
        orderItems: {
          select: {
            quantity: true,
            price: true,
            costPerUnit: true,
            total: true,
            totalProfit: true
          }
        }
      }
    });
    
    if (deliveredOrders.length === 0) {
      notices.push('No delivered orders in the selected period');
    }
    
    // Calculate revenue components
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const subtotalRevenue = deliveredOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const shippingRevenue = deliveredOrders.reduce((sum, o) => sum + (o.shipping || 0), 0);
    const discountsGiven = 0; // No discount field in Order model
    
    // === COGS CALCULATION ===
    let totalCOGS = 0;
    let totalUnits = 0;
    let missingCostCount = 0;
    
    deliveredOrders.forEach(order => {
      order.orderItems.forEach(item => {
        const costPerUnit = item.costPerUnit || 0;
        if (!costPerUnit || costPerUnit === 0) {
          missingCostCount++;
        }
        totalCOGS += costPerUnit * (item.quantity || 0);
        totalUnits += item.quantity || 0;
      });
    });
    
    if (missingCostCount > 0) {
      notices.push(`${missingCostCount} order items missing costPerUnit - COGS may be inaccurate`);
    }
    
    // === OPERATIONAL COSTS ===
    const operationalCosts = await prisma.operationalCost.findMany({
      where: {
        date: {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        }
      },
      select: {
        id: true,
        category: true,
        amount: true,
        description: true,
        date: true
      }
    });
    
    if (operationalCosts.length === 0) {
      notices.push('No operational costs recorded for the selected period');
    }
    
    const totalOperationalCosts = operationalCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
    
    // Group operational costs by category
    const costsByCategory = operationalCosts.reduce((acc, cost) => {
      if (!acc[cost.category]) {
        acc[cost.category] = 0;
      }
      acc[cost.category] += cost.amount;
      return acc;
    }, {} as Record<string, number>);
    
    // === PROFIT DISTRIBUTIONS ===
    const distributions = await prisma.profitDistribution.findMany({
      where: {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        }
      },
      select: {
        id: true,
        partnerId: true,
        distributionAmount: true,
        status: true,
        partner: {
          select: {
            name: true,
            profitSharePercentage: true
          }
        }
      }
    });
    
    const totalDistributions = distributions.reduce((sum, d) => sum + d.distributionAmount, 0);
    const approvedDistributions = distributions
      .filter(d => d.status === 'APPROVED' || d.status === 'PAID')
      .reduce((sum, d) => sum + d.distributionAmount, 0);
    const paidDistributions = distributions
      .filter(d => d.status === 'PAID')
      .reduce((sum, d) => sum + d.distributionAmount, 0);
    const pendingDistributions = distributions
      .filter(d => d.status === 'PENDING')
      .reduce((sum, d) => sum + d.distributionAmount, 0);
    
    // === PROFIT CALCULATIONS ===
    const grossProfit = totalRevenue - totalCOGS;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    
    const operatingProfit = grossProfit - totalOperationalCosts;
    const operatingProfitMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;
    
    const netProfit = operatingProfit - approvedDistributions;
    const netProfitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    const platformRetainedProfit = operatingProfit - totalDistributions;
    
    // === ORDER METRICS ===
    const totalOrders = deliveredOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const averageProfit = totalOrders > 0 ? grossProfit / totalOrders : 0;
    
    // Build response based on format
    const response: any = {
      success: true,
      notices,
      data: {
        summary: {
          totalRevenue,
          totalCOGS,
          grossProfit,
          grossProfitMargin,
          totalOperationalCosts,
          operatingProfit,
          operatingProfitMargin,
          totalDistributions: approvedDistributions,
          netProfit,
          netProfitMargin,
          platformRetainedProfit,
          // Formatted values
          totalRevenueFormatted: formatCurrency(totalRevenue),
          grossProfitFormatted: formatCurrency(grossProfit),
          netProfitFormatted: formatCurrency(netProfit),
          platformRetainedFormatted: formatCurrency(platformRetainedProfit)
        },
        revenue: {
          subtotal: subtotalRevenue,
          shipping: shippingRevenue,
          discounts: discountsGiven,
          total: totalRevenue
        },
        costs: {
          cogs: totalCOGS,
          operational: totalOperationalCosts,
          total: totalCOGS + totalOperationalCosts,
          byCategory: costsByCategory
        },
        distributions: {
          total: totalDistributions,
          approved: approvedDistributions,
          paid: paidDistributions,
          pending: pendingDistributions,
          outstanding: approvedDistributions - paidDistributions
        },
        metrics: {
          totalOrders,
          totalUnits,
          averageOrderValue,
          averageProfit,
          averageOrderValueFormatted: formatCurrency(averageOrderValue)
        },
        dateRange: {
          start: dateRange.startDate,
          end: dateRange.endDate,
          period
        }
      },
      meta: {
        generatedAt: new Date().toISOString(),
        format
      }
    };
    
    // Add detailed breakdown if requested
    if (format === 'detailed') {
      // Top revenue-generating orders
      const topOrders = deliveredOrders
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map(o => ({
          id: o.id,
          total: o.total,
          profit: o.grossProfit || 0,
          items: o.orderItems.length
        }));
      
      // Distribution breakdown by partner
      const distributionsByPartner = distributions.reduce((acc, d) => {
        const partnerName = d.partner.name;
        if (!acc[partnerName]) {
          acc[partnerName] = {
            partnerId: d.partnerId,
            partnerName,
            sharePercentage: d.partner.profitSharePercentage,
            total: 0,
            count: 0
          };
        }
        acc[partnerName].total += d.distributionAmount;
        acc[partnerName].count += 1;
        return acc;
      }, {} as Record<string, any>);
      
      response.data.detailed = {
        topOrders,
        distributionsByPartner: Object.values(distributionsByPartner),
        operationalCostsList: operationalCosts.map(c => ({
          id: c.id,
          category: c.category,
          amount: c.amount,
          description: c.description,
          date: c.date
        }))
      };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Admin P&L Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch platform P&L',
        details: error instanceof Error ? error.message : 'Unknown error',
        notices: notices.length > 0 ? notices : ['Server error occurred']
      },
      { status: 500 }
    );
  }
}
