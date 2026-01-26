/**
 * Admin Payout Management - Generate Payout Statement
 * POST /api/admin/payouts/generate
 * 
 * Generates a new profit distribution/payout statement for a partner
 * Calculates net profit after all fees, returns, shipping, and applies tax rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { startOfDay, endOfDay } from 'date-fns';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function POST(request: NextRequest) {
  try {
    // Authenticate admin
    const admin = await requireAdmin(request);
    
    // Parse request body
    const body = await request.json();
    const { partnerId, startDate, endDate, periodType, notes } = body;
    
    // Validate required fields
    if (!partnerId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: partnerId, startDate, endDate' },
        { status: 400 }
      );
    }
    
    // Parse dates
    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));
    
    if (start >= end) {
      return NextResponse.json(
        { success: false, error: 'Start date must be before end date' },
        { status: 400 }
      );
    }
    
    // Get partner
    const partner = await prisma.partner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        name: true,
        email: true,
        profitSharePercentage: true,
        isActive: true
      }
    });
    
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }
    
    if (!partner.isActive) {
      return NextResponse.json(
        { success: false, error: 'Cannot generate payout for inactive partner' },
        { status: 400 }
      );
    }
    
    // Check for existing payout in this period
    const existingPayout = await prisma.profitDistribution.findFirst({
      where: {
        partnerId,
        startDate: start,
        endDate: end
      }
    });
    
    if (existingPayout) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'A payout already exists for this partner and period',
          existingPayoutId: existingPayout.id
        },
        { status: 409 }
      );
    }
    
    // === CALCULATE REVENUE ===
    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        createdAt: {
          gte: start,
          lte: end
        }
      },
      select: {
        id: true,
        total: true,
        subtotal: true,
        shipping: true,
        orderItems: {
          select: {
            quantity: true,
            costPerUnit: true,
            price: true,
            totalProfit: true
          }
        }
      }
    });
    
    // Calculate revenue components
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
    const subtotalRevenue = deliveredOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const shippingRevenue = deliveredOrders.reduce((sum, o) => sum + (o.shipping || 0), 0);
    const discountsGiven = 0; // No discount field in Order model
    
    // === CALCULATE COGS ===
    let totalCOGS = 0;
    
    deliveredOrders.forEach(order => {
      order.orderItems.forEach(item => {
        totalCOGS += (item.costPerUnit || 0) * item.quantity;
      });
    });
    
    // === CALCULATE OPERATIONAL COSTS ===
    const operationalCosts = await prisma.operationalCost.findMany({
      where: {
        date: {
          gte: start,
          lte: end
        }
      },
      select: {
        amount: true
      }
    });
    
    const totalOperationalCosts = operationalCosts.reduce((sum, c) => sum + c.amount, 0);
    
    // === HANDLE RETURNS ===
    const returnedOrders = await prisma.order.findMany({
      where: {
        status: 'RETURNED',
        updatedAt: {
          gte: start,
          lte: end
        }
      },
      select: {
        total: true
      }
    });
    
    const totalReturns = returnedOrders.reduce((sum, o) => sum + o.total, 0);
    
    // === CALCULATE SHIPPING COSTS (actual shipping expenses) ===
    // Assuming shipping cost in orders is what we charge customers
    // Actual shipping expenses might be in operational costs or a separate field
    // For now, we'll assume shippingRevenue is net (customer pays for shipping)
    const netShippingImpact = 0; // Adjust if needed
    
    // === CALCULATE TAX (if applicable) ===
    // Assuming VAT or sales tax on revenue
    const taxRate = 0; // Set to 0.15 for 15% VAT if applicable
    const taxAmount = totalRevenue * taxRate;
    
    // === CALCULATE NET PROFIT ===
    const grossProfit = totalRevenue - totalCOGS;
    const operatingProfit = grossProfit - totalOperationalCosts;
    const netProfit = operatingProfit - totalReturns - netShippingImpact - taxAmount;
    
    // === CALCULATE PARTNER SHARE ===
    const partnerSharePercentage = partner.profitSharePercentage;
    const partnerShare = netProfit * (partnerSharePercentage / 100);
    
    // Ensure partner share is not negative
    const distributionAmount = Math.max(0, partnerShare);
    
    // === CREATE PROFIT DISTRIBUTION ===
    const profitDistribution = await prisma.profitDistribution.create({
      data: {
        partnerId,
        periodType: periodType || 'CUSTOM',
        startDate: start,
        endDate: end,
        totalRevenue,
        totalCosts: totalCOGS + totalOperationalCosts,
        netProfit,
        partnerShare: partnerSharePercentage,
        distributionAmount,
        status: 'PENDING',
        notes: notes || `Generated on ${new Date().toISOString()}`
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
            profitSharePercentage: true
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        payout: profitDistribution,
        calculation: {
          totalRevenue,
          subtotalRevenue,
          shippingRevenue,
          discountsGiven,
          totalCOGS,
          grossProfit,
          grossProfitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
          totalOperationalCosts,
          operatingProfit,
          totalReturns,
          taxAmount,
          netProfit,
          netProfitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
          partnerSharePercentage,
          distributionAmount,
          ordersProcessed: deliveredOrders.length,
          returnsProcessed: returnedOrders.length
        }
      },
      message: 'Payout statement generated successfully'
    });
    
  } catch (error) {
    console.error('Generate Payout Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate payout statement',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
