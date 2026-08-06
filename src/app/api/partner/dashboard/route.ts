// app/api/partner/dashboard/route.ts
// Partner Dashboard - Overview of profit data

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePartner } from '@/lib/auth';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * GET /api/partner/dashboard
 * Get partner dashboard overview with profit summary
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requirePartner(request);

    // Find the Partner record for this user. Prefer the explicit userId
    // link (ADR-008); fall back to matching by email for any Partner rows
    // that predate the link and haven't been connected yet. A pure SELLER
    // with no linked Partner row is expected (ADR-008) and no longer 404s —
    // distribution/profit-share data is simply empty, since there is none
    // to show (Amazon-Style Wholesale Platform Gap Closure — Phase 4 part 4).
    const partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { email: user.email }
        ]
      }
    });

    // Get profit distributions for this partner (none exist for a seller
    // with no Partner record — ProfitDistribution is a Partner-only concept)
    const distributions = partner
      ? await prisma.profitDistribution.findMany({
          where: { partnerId: partner.id },
          orderBy: { createdAt: 'desc' },
          take: 10 // Last 10 distributions
        })
      : [];

    // Calculate summary statistics
    const totalPending = distributions
      .filter(d => d.status === 'PENDING')
      .reduce((sum, d) => sum + d.distributionAmount, 0);

    const totalApproved = distributions
      .filter(d => d.status === 'APPROVED')
      .reduce((sum, d) => sum + d.distributionAmount, 0);

    const totalPaid = distributions
      .filter(d => d.status === 'PAID')
      .reduce((sum, d) => sum + d.distributionAmount, 0);

    // Get profit reports for this seller's products. ProfitReport.sellerId
    // is populated from Product.sellerId (a User.id, per
    // profitReportGeneration.ts) — a real bug here queried `partner.id`
    // instead, a different id space, so this always returned empty for any
    // real partner (Amazon-Style Wholesale Platform Gap Closure — Phase 4
    // part 4).
    const profitReports = await prisma.profitReport.findMany({
      where: { sellerId: user.id },
      orderBy: { reportDate: 'desc' },
      take: 20,
      include: {
        order: {
          select: {
            orderNumber: true,
            createdAt: true,
            total: true
          }
        },
        product: {
          select: {
            name: true,
            sku: true
          }
        }
      }
    });

    const totalSellerProfit = profitReports.reduce((sum, r) => sum + r.sellerProfit, 0);

    // Get financial ledger entries (if any)
    // Note: FinancialLedger model not yet implemented
    const ledgerSummary = null;

    // Current month statistics
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const currentMonthDistributions = distributions.filter(
      d => new Date(d.createdAt) >= currentMonthStart
    );

    const currentMonthProfit = currentMonthDistributions.reduce(
      (sum, d) => sum + d.distributionAmount, 
      0
    );

    // Response
    return NextResponse.json({
      success: true,
      data: {
        // Partner Info (null for a pure seller with no linked Partner record)
        partner: partner ? {
          id: partner.id,
          name: partner.name,
          profitSharePercentage: partner.profitSharePercentage,
          isActive: partner.isActive,
          joinDate: partner.joinDate,
          totalProfitReceived: partner.totalProfitReceived
        } : null,

        // Summary Statistics
        summary: {
          totalPending,
          totalApproved,
          totalPaid,
          totalEarned: totalPaid + totalApproved + totalPending,
          currentMonthProfit,
          lifetimeProfit: partner?.totalProfitReceived || 0
        },

        // Recent Distributions
        recentDistributions: distributions.slice(0, 5).map(d => ({
          id: d.id,
          period: d.periodType,
          startDate: d.startDate,
          endDate: d.endDate,
          amount: d.distributionAmount,
          status: d.status,
          paidAt: d.paidAt,
          createdAt: d.createdAt
        })),

        // Profit Reports Summary
        profitReports: {
          totalSellerProfit,
          reportCount: profitReports.length,
          recentReports: profitReports.slice(0, 5).map(r => ({
            id: r.id,
            orderNumber: r.order.orderNumber,
            productName: r.product?.name,
            sellerProfit: r.sellerProfit,
            profitMargin: r.profitMargin,
            reportDate: r.reportDate
          }))
        },

        // Ledger Summary (if available)
        ledgerSummary,

        // Metadata
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Partner Dashboard Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load dashboard' },
      { status: 500 }
    );
  }
}
