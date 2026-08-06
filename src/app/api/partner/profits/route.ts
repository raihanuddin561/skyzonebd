// app/api/partner/profits/route.ts
// Partner Profits - Detailed profit information

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePartner } from '@/lib/auth';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * GET /api/partner/profits
 * Get detailed profit information with filtering
 * 
 * Query params:
 * - type: 'distributions' | 'reports' | 'ledger' (default: all)
 * - status: Filter by status (for distributions)
 * - startDate: Filter by date range
 * - endDate: Filter by date range
 * - limit: Number of records (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requirePartner(request);

    // Find the Partner record for this user. Prefer the explicit userId
    // link (ADR-008); fall back to matching by email for any Partner rows
    // that predate the link and haven't been connected yet. A pure SELLER
    // with no linked Partner row is expected (ADR-008) and no longer 404s —
    // distribution data is simply empty (Amazon-Style Wholesale Platform
    // Gap Closure — Phase 4 part 4).
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
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const response: any = {
      success: true,
      partner: partner ? {
        id: partner.id,
        name: partner.name,
        profitSharePercentage: partner.profitSharePercentage
      } : null,
      data: {}
    };

    // Build date filter
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } : {};

    // 1. Profit Distributions — a Partner-only concept; a seller with no
    // linked Partner record simply has none (previously 404'd instead).
    if (partner && (type === 'all' || type === 'distributions')) {
      const distributionWhere: any = {
        partnerId: partner.id,
        ...dateFilter
      };

      if (status) {
        distributionWhere.status = status.toUpperCase();
      }

      const [distributions, totalCount] = await Promise.all([
        prisma.profitDistribution.findMany({
          where: distributionWhere,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.profitDistribution.count({ where: distributionWhere })
      ]);

      const totalAmount = distributions.reduce((sum, d) => sum + d.distributionAmount, 0);
      const byStatus = {
        pending: distributions.filter(d => d.status === 'PENDING').length,
        approved: distributions.filter(d => d.status === 'APPROVED').length,
        paid: distributions.filter(d => d.status === 'PAID').length
      };

      response.data.distributions = {
        items: distributions.map(d => ({
          id: d.id,
          periodType: d.periodType,
          startDate: d.startDate,
          endDate: d.endDate,
          totalRevenue: d.totalRevenue,
          totalCosts: d.totalCosts,
          netProfit: d.netProfit,
          partnerShare: d.partnerShare,
          distributionAmount: d.distributionAmount,
          status: d.status,
          approvedBy: d.approvedBy,
          approvedAt: d.approvedAt,
          paidAt: d.paidAt,
          paymentMethod: d.paymentMethod,
          paymentReference: d.paymentReference,
          notes: d.notes,
          createdAt: d.createdAt
        })),
        summary: {
          totalCount,
          totalAmount,
          byStatus,
          pagination: {
            limit,
            offset,
            hasMore: totalCount > offset + limit
          }
        }
      };
    } else if (type === 'all' || type === 'distributions') {
      response.data.distributions = {
        items: [],
        summary: { totalCount: 0, totalAmount: 0, byStatus: { pending: 0, approved: 0, paid: 0 }, pagination: { limit, offset, hasMore: false } }
      };
    }

    // 2. Profit Reports. ProfitReport.sellerId is populated from
    // Product.sellerId (a User.id, per profitReportGeneration.ts) — a real
    // bug here queried `partner.id` instead, a different id space, so this
    // always returned empty for any real partner (Amazon-Style Wholesale
    // Platform Gap Closure — Phase 4 part 4).
    if (type === 'all' || type === 'reports') {
      const reportWhere: any = {
        sellerId: user.id,
        ...dateFilter
      };

      const [reports, totalReports] = await Promise.all([
        prisma.profitReport.findMany({
          where: reportWhere,
          orderBy: { reportDate: 'desc' },
          skip: offset,
          take: limit,
          include: {
            order: {
              select: {
                orderNumber: true,
                createdAt: true,
                total: true,
                status: true
              }
            },
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                imageUrl: true
              }
            }
          }
        }),
        prisma.profitReport.count({ where: reportWhere })
      ]);

      const totalSellerProfit = reports.reduce((sum, r) => sum + r.sellerProfit, 0);
      const totalRevenue = reports.reduce((sum, r) => sum + r.revenue, 0);
      const averageProfitMargin = reports.length > 0
        ? reports.reduce((sum, r) => sum + r.profitMargin, 0) / reports.length
        : 0;

      response.data.profitReports = {
        items: reports.map(r => ({
          id: r.id,
          orderId: r.orderId,
          orderNumber: r.order.orderNumber,
          orderDate: r.order.createdAt,
          orderTotal: r.order.total,
          orderStatus: r.order.status,
          productId: r.productId,
          productName: r.product?.name,
          productSku: r.product?.sku,
          productImage: r.product?.imageUrl,
          revenue: r.revenue,
          costOfGoods: r.costOfGoods,
          grossProfit: r.grossProfit,
          netProfit: r.netProfit,
          profitMargin: r.profitMargin,
          sellerProfit: r.sellerProfit,
          sellerProfitPercent: r.sellerProfitPercent,
          platformProfit: r.platformProfit,
          platformProfitPercent: r.platformProfitPercent,
          reportDate: r.reportDate,
          createdAt: r.createdAt
        })),
        summary: {
          totalReports,
          totalSellerProfit,
          totalRevenue,
          averageProfitMargin,
          pagination: {
            limit,
            offset,
            hasMore: totalReports > offset + limit
          }
        }
      };
    }

    // 3. Financial Ledger Entries (if exists)
    if (type === 'all' || type === 'ledger') {
      // Note: FinancialLedger model not yet implemented
      response.data.ledger = {
        available: false,
        message: 'Financial ledger feature not yet implemented'
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Partner Profits Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profit data' },
      { status: 500 }
    );
  }
}
