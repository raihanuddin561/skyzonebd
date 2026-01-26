/**
 * Partner Financial Dashboard - Profit & Loss Statement
 * GET /api/partner/financial/profit-loss
 * 
 * Provides comprehensive P&L statement for authenticated partner
 * Shows revenue, costs, expenses, and profit breakdown for specified date range
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePartner } from '@/lib/auth';
import { calculateProfit, validateDateRange, calculateProfitMargin } from '@/lib/financialCalculator';

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
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const format = searchParams.get('format') || 'summary';
    
    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // Validate date range
    const validation = validateDateRange(startDate, endDate);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }
    
    // Note: Partners in this system are profit-sharing co-owners
    // They can view ALL business data, not just their specific transactions
    // This is different from a multi-tenant vendor system
    
    // Get orders in date range (delivered orders only for accurate P&L)
    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        id: true,
        orderNumber: true,
        total: true,
        totalCost: true,
        grossProfit: true,
        platformProfit: true,
        sellerProfit: true,
        profitMargin: true,
        shipping: true,
        tax: true,
        subtotal: true,
        createdAt: true
      }
    });
    
    // Get pending orders (for reference)
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: {
          in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED']
        },
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        total: true,
        totalCost: true
      }
    });
    
    // Calculate revenue metrics
    const totalOrders = deliveredOrders.length;
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
    const deliveredRevenue = totalRevenue;
    const pendingRevenue = pendingOrders.reduce((sum, o) => sum + o.total, 0);
    
    // Calculate costs
    const totalCOGS = deliveredOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
    const averageCostPerOrder = totalOrders > 0 ? totalCOGS / totalOrders : 0;
    
    // Calculate shipping revenue (what customers paid)
    const shippingRevenue = deliveredOrders.reduce((sum, o) => sum + o.shipping, 0);
    
    // Estimate shipping costs (assume 70% of shipping revenue is actual cost)
    const estimatedShippingCost = shippingRevenue * 0.7;
    
    // Estimate payment gateway fees (2% of total)
    const estimatedPaymentFees = totalRevenue * 0.02;
    
    // Total expenses
    const totalExpenses = estimatedShippingCost + estimatedPaymentFees;
    
    // Calculate profit
    const grossProfit = deliveredOrders.reduce((sum, o) => sum + (o.grossProfit || 0), 0);
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = calculateProfitMargin(netProfit, totalRevenue);
    
    // Partner's share
    const partnerShare = netProfit * (partner.profitSharePercentage / 100);
    
    // Get distributions for this period
    const distributions = await prisma.profitDistribution.findMany({
      where: {
        partnerId: partner.id,
        startDate: {
          gte: startDate
        },
        endDate: {
          lte: endDate
        }
      },
      select: {
        id: true,
        distributionAmount: true,
        status: true,
        approvedAt: true,
        paidAt: true
      }
    });
    
    const approvedDistributions = distributions.filter(d => d.status === 'APPROVED' || d.status === 'PAID');
    const paidDistributions = distributions.filter(d => d.status === 'PAID');
    const pendingDistributions = distributions.filter(d => d.status === 'PENDING');
    
    const approvedAmount = approvedDistributions.reduce((sum, d) => sum + d.distributionAmount, 0);
    const paidAmount = paidDistributions.reduce((sum, d) => sum + d.distributionAmount, 0);
    const pendingAmount = pendingDistributions.reduce((sum, d) => sum + d.distributionAmount, 0);
    
    // Build response
    const response: any = {
      success: true,
      data: {
        partner: {
          id: partner.id,
          name: partner.name,
          profitSharePercentage: partner.profitSharePercentage
        },
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        revenue: {
          totalOrders,
          grossRevenue: totalRevenue,
          shippingRevenue,
          deliveredRevenue,
          pendingRevenue
        },
        costs: {
          totalCOGS,
          averageCostPerOrder,
          shippingCosts: estimatedShippingCost,
          paymentGatewayFees: estimatedPaymentFees
        },
        expenses: {
          shippingCosts: estimatedShippingCost,
          platformFees: estimatedPaymentFees,
          total: totalExpenses
        },
        profit: {
          grossProfit,
          netProfit,
          profitMargin,
          partnerShare,
          partnerSharePercent: partner.profitSharePercentage
        },
        distributions: {
          approved: approvedAmount,
          pending: pendingAmount,
          paid: paidAmount,
          outstanding: approvedAmount - paidAmount
        }
      },
      meta: {
        generatedAt: new Date().toISOString(),
        format
      }
    };
    
    // Add detailed breakdown if requested
    if (format === 'detailed') {
      response.data['orderBreakdown'] = deliveredOrders.map(order => ({
        orderNumber: order.orderNumber,
        date: order.createdAt.toISOString(),
        revenue: order.total,
        cost: order.totalCost || 0,
        profit: order.grossProfit || 0,
        margin: order.profitMargin || 0
      }));
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Partner P&L Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate P&L statement',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
