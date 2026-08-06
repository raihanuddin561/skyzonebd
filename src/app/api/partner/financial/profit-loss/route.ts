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
    
    // Find partner record. Prefer the explicit userId link (ADR-008); fall
    // back to matching by email for any Partner rows that predate the link.
    // (Previously matched `{ id: user.id }` instead of `{ userId: user.id }`
    // — Partner.id and User.id are different id spaces, so that branch
    // never matched a real link — Amazon-Style Wholesale Platform Gap
    // Closure — Phase 4 part 4.) A pure SELLER with no linked Partner row
    // no longer 404s — see the seller-scoped branch below.
    const partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { email: user.email }
        ]
      }
    });

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

    let totalOrders: number, totalRevenue: number, deliveredRevenue: number, pendingRevenue: number,
      totalCOGS: number, averageCostPerOrder: number, shippingRevenue: number,
      estimatedShippingCost: number, estimatedPaymentFees: number, totalExpenses: number,
      grossProfit: number, netProfit: number, profitMargin: number, partnerShare: number,
      approvedAmount: number, paidAmount: number, pendingAmount: number;
    let orderBreakdown: Array<{ orderNumber: string; date: string; revenue: number; cost: number; profit: number; margin: number }> = [];

    if (partner) {
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
      totalOrders = deliveredOrders.length;
      totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
      deliveredRevenue = totalRevenue;
      pendingRevenue = pendingOrders.reduce((sum, o) => sum + o.total, 0);

      // Calculate costs
      totalCOGS = deliveredOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
      averageCostPerOrder = totalOrders > 0 ? totalCOGS / totalOrders : 0;

      // Calculate shipping revenue (what customers paid)
      shippingRevenue = deliveredOrders.reduce((sum, o) => sum + o.shipping, 0);

      // Estimate shipping costs (assume 70% of shipping revenue is actual cost)
      estimatedShippingCost = shippingRevenue * 0.7;

      // Estimate payment gateway fees (2% of total)
      estimatedPaymentFees = totalRevenue * 0.02;

      // Total expenses
      totalExpenses = estimatedShippingCost + estimatedPaymentFees;

      // Calculate profit
      grossProfit = deliveredOrders.reduce((sum, o) => sum + (o.grossProfit || 0), 0);
      netProfit = grossProfit - totalExpenses;
      profitMargin = calculateProfitMargin(netProfit, totalRevenue);

      // Partner's share
      partnerShare = netProfit * (partner.profitSharePercentage / 100);

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

      approvedAmount = approvedDistributions.reduce((sum, d) => sum + d.distributionAmount, 0);
      paidAmount = paidDistributions.reduce((sum, d) => sum + d.distributionAmount, 0);
      pendingAmount = pendingDistributions.reduce((sum, d) => sum + d.distributionAmount, 0);

      if (format === 'detailed') {
        orderBreakdown = deliveredOrders.map(order => ({
          orderNumber: order.orderNumber,
          date: order.createdAt.toISOString(),
          revenue: order.total,
          cost: order.totalCost || 0,
          profit: order.grossProfit || 0,
          margin: order.profitMargin || 0
        }));
      }
    } else {
      // Seller-scoped fallback (no linked Partner record): Order-level
      // totals mix in other sellers' items on the same order, so this
      // scopes via OrderItem instead — the same technique already used by
      // partner/analytics/route.ts (Amazon-Style Wholesale Platform Gap
      // Closure — Phase 4 part 4). Shipping isn't itemized per line, so it's
      // not attributable to a single seller and is reported as 0 here.
      const deliveredItems = await prisma.orderItem.findMany({
        where: {
          product: { sellerId: user.id },
          order: { status: 'DELIVERED', createdAt: { gte: startDate, lte: endDate } }
        },
        select: {
          orderId: true, total: true, totalProfit: true, costPerUnit: true, quantity: true,
          order: { select: { orderNumber: true, createdAt: true } }
        }
      });
      const pendingItems = await prisma.orderItem.findMany({
        where: {
          product: { sellerId: user.id },
          order: { status: { in: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'] }, createdAt: { gte: startDate, lte: endDate } }
        },
        select: { total: true }
      });

      totalOrders = new Set(deliveredItems.map(i => i.orderId)).size;
      totalRevenue = deliveredItems.reduce((sum, i) => sum + i.total, 0);
      deliveredRevenue = totalRevenue;
      pendingRevenue = pendingItems.reduce((sum, i) => sum + i.total, 0);
      totalCOGS = deliveredItems.reduce((sum, i) => sum + (i.costPerUnit || 0) * i.quantity, 0);
      averageCostPerOrder = totalOrders > 0 ? totalCOGS / totalOrders : 0;
      shippingRevenue = 0;
      estimatedShippingCost = 0;
      estimatedPaymentFees = totalRevenue * 0.02;
      totalExpenses = estimatedShippingCost + estimatedPaymentFees;
      grossProfit = deliveredItems.reduce((sum, i) => sum + (i.totalProfit || 0), 0);
      netProfit = grossProfit - totalExpenses;
      profitMargin = calculateProfitMargin(netProfit, totalRevenue);
      partnerShare = 0;
      approvedAmount = 0;
      paidAmount = 0;
      pendingAmount = 0;

      if (format === 'detailed') {
        const byOrder = new Map<string, { orderNumber: string; date: string; revenue: number; cost: number; profit: number }>();
        deliveredItems.forEach(item => {
          if (!byOrder.has(item.orderId)) {
            byOrder.set(item.orderId, { orderNumber: item.order.orderNumber, date: item.order.createdAt.toISOString(), revenue: 0, cost: 0, profit: 0 });
          }
          const entry = byOrder.get(item.orderId)!;
          entry.revenue += item.total;
          entry.cost += (item.costPerUnit || 0) * item.quantity;
          entry.profit += item.totalProfit || 0;
        });
        orderBreakdown = Array.from(byOrder.values()).map(o => ({
          ...o, margin: o.revenue > 0 ? (o.profit / o.revenue) * 100 : 0
        }));
      }
    }

    // Build response
    const response: any = {
      success: true,
      data: {
        partner: partner ? {
          id: partner.id,
          name: partner.name,
          profitSharePercentage: partner.profitSharePercentage
        } : null,
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
          partnerSharePercent: partner?.profitSharePercentage ?? null
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
      response.data['orderBreakdown'] = orderBreakdown;
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
