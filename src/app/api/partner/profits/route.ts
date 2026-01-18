// app/api/partner/profits/route.ts
// Partner Profits - Detailed profit information

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
    const auth = verifyPartner(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    // Find partner
    let partner = null;
    if (auth.partnerId) {
      partner = await prisma.partner.findUnique({
        where: { id: auth.partnerId }
      });
    } else {
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
      partner: {
        id: partner.id,
        name: partner.name,
        profitSharePercentage: partner.profitSharePercentage
      },
      data: {}
    };

    // Build date filter
    const dateFilter = startDate && endDate ? {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } : {};

    // 1. Profit Distributions
    if (type === 'all' || type === 'distributions') {
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
    }

    // 2. Profit Reports
    if (type === 'all' || type === 'reports') {
      const reportWhere: any = {
        sellerId: partner.id,
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
    console.error('Partner Profits Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profit data' },
      { status: 500 }
    );
  }
}
