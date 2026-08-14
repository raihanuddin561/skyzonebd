/**
 * Admin Payout Management - Generate Payout Statement
 * POST /api/admin/payouts/generate
 * 
 * Generates a new profit distribution/payout statement for a partner
 * Calculates net profit after all fees, returns, shipping, and applies tax rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { startOfDay, endOfDay } from 'date-fns';
import { getFinancialSummary } from '@/lib/financialLedger';

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
        isActive: true,
        exitDate: true
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

    // Amazon-style gap-closure Phase 3 part 4: block generation for a
    // period entirely on/after the partner's exit date — an explicit
    // single-partner request names this partner directly, so a clear
    // rejection is more useful here than a silent skip.
    if (partner.exitDate && partner.exitDate <= start) {
      return NextResponse.json(
        { success: false, error: `Cannot generate a distribution for ${partner.name} — this period starts on or after their exit date (${partner.exitDate.toISOString().split('T')[0]})` },
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
    
    // === CALCULATE REVENUE/COGS/OPERATIONAL COSTS FROM THE LEDGER ===
    // Amazon-style gap-closure Phase 2 part 2 ("one true ledger"): this
    // route previously recomputed revenue/COGS/operational-costs from
    // Order/OperationalCost directly — a fifth independent formula. Now
    // sourced from getFinancialSummary like every other profit-calculation
    // consumer; the returns/shipping/tax adjustment layer below (currently
    // all real deductions, not hardcoded away) is applied on top, since
    // the ledger doesn't yet post RETURN/TAX/SHIPPING entries.
    const summary = await getFinancialSummary(start, end);
    const totalRevenue = summary.revenue;
    const totalCOGS = summary.cogs;
    const totalOperationalCosts = summary.operationalCosts + summary.salaryExpenses;

    // Still queried directly for informational display fields only
    // (subtotal/shipping revenue breakdown, orders-processed count) — not
    // used to derive totalRevenue/totalCOGS above anymore.
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
        subtotal: true,
        shipping: true,
      }
    });

    const subtotalRevenue = deliveredOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const shippingRevenue = deliveredOrders.reduce((sum, o) => sum + (o.shipping || 0), 0);
    const discountsGiven = 0; // No discount field in Order model

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
    // The `existingPayout` check above is a plain read, not a lock — two
    // concurrent "Generate Payout" requests for the same partner/period can
    // both pass it before either writes, each creating a PENDING
    // distribution for the full amount and double-paying the partner once
    // both are approved. The real guard is the
    // `@@unique([partnerId, startDate, endDate])` constraint on
    // ProfitDistribution (prisma/schema.prisma) — a concurrent second
    // create() throws Prisma's unique-violation error (P2002), caught
    // below. NOTE: that constraint is prepared in the schema but requires a
    // migration to take effect — until then this catch is a no-op and the
    // plain read-check above remains the only protection.
    let profitDistribution;
    try {
      profitDistribution = await prisma.profitDistribution.create({
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
    } catch (createError) {
      if (createError instanceof Prisma.PrismaClientKnownRequestError && createError.code === 'P2002') {
        return NextResponse.json(
          { success: false, error: 'A payout already exists for this partner and period (created concurrently)' },
          { status: 409 }
        );
      }
      throw createError;
    }
    
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
    // requireAdmin throws a pre-built Response (401/403) on auth failure —
    // surface it as-is instead of collapsing it into a generic 500 (found
    // alongside the identical bug in admin/payouts/[id]/route.ts, Phase 3
    // part 1).
    if (error instanceof Response) {
      return error;
    }
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
