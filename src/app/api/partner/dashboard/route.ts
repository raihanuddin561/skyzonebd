// app/api/partner/dashboard/route.ts
// Partner Dashboard - Overview of profit data

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';

// Helper to verify partner authentication
function verifyPartner(request: NextRequest): { 
  authorized: true; 
  userId: string; 
  partnerId?: string;
} | { 
  authorized: false; 
  error: string 
} {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'No authorization token' };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { 
      userId: string; 
      role: string;
      partnerId?: string;
    };

    // Partner role required
    if (decoded.role.toUpperCase() !== 'PARTNER') {
      return { authorized: false, error: 'Partner access required' };
    }

    return { 
      authorized: true, 
      userId: decoded.userId,
      partnerId: decoded.partnerId 
    };
  } catch {
    return { authorized: false, error: 'Invalid token' };
  }
}

/**
 * GET /api/partner/dashboard
 * Get partner dashboard overview with profit summary
 */
export async function GET(request: NextRequest) {
  try {
    const auth = verifyPartner(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    // Find partner by userId or partnerId
    let partner = null;
    if (auth.partnerId) {
      partner = await prisma.partner.findUnique({
        where: { id: auth.partnerId }
      });
    } else {
      // Try to find partner by user ID (if partner is also a user)
      partner = await prisma.partner.findFirst({
        where: { 
          OR: [
            { email: (await prisma.user.findUnique({ where: { id: auth.userId }, select: { email: true } }))?.email },
            { id: auth.userId }
          ]
        }
      });
    }

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner record not found' },
        { status: 404 }
      );
    }

    // Get profit distributions for this partner
    const distributions = await prisma.profitDistribution.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: 'desc' },
      take: 10 // Last 10 distributions
    });

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

    // Get profit reports for partner's products
    const profitReports = await prisma.profitReport.findMany({
      where: { sellerId: partner.id },
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
    let ledgerSummary = null;
    try {
      const ledgerEntries = await prisma.financialLedger.findMany({
        where: { 
          partyId: partner.id,
          partyType: 'PARTNER'
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });

      const credits = ledgerEntries
        .filter(e => e.direction === 'CREDIT')
        .reduce((sum, e) => sum + e.amount, 0);

      const debits = ledgerEntries
        .filter(e => e.direction === 'DEBIT')
        .reduce((sum, e) => sum + e.amount, 0);

      ledgerSummary = {
        totalCredits: credits,
        totalDebits: debits,
        netBalance: credits - debits,
        entryCount: ledgerEntries.length
      };
    } catch (error) {
      // FinancialLedger might not exist yet - ignore error
      ledgerSummary = null;
    }

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
        // Partner Info
        partner: {
          id: partner.id,
          name: partner.name,
          profitSharePercentage: partner.profitSharePercentage,
          isActive: partner.isActive,
          joinDate: partner.joinDate,
          totalProfitReceived: partner.totalProfitReceived
        },

        // Summary Statistics
        summary: {
          totalPending,
          totalApproved,
          totalPaid,
          totalEarned: totalPaid + totalApproved + totalPending,
          currentMonthProfit,
          lifetimeProfit: partner.totalProfitReceived
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
    console.error('Partner Dashboard Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load dashboard' },
      { status: 500 }
    );
  }
}
