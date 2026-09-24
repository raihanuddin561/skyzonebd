/**
 * Admin Analytics API
 * Provides comprehensive analytics for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getFinancialSummary } from '@/lib/financialLedger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Parallel queries for performance
    const [
      totalOrders,
      ordersInPeriod,
      currentFinancialSummary,
      profitData,
      returns,
      topProducts,
      topProfitableProducts,
      partnerPerformance,
      recentOrders,
      ordersByStatus
    ] = await Promise.all([
      // Total orders count
      prisma.order.count(),

      // Orders in period
      prisma.order.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),

      // Revenue/profit (GMV) — derived from the shared FinancialLedger-based
      // calculation (getFinancialSummary) instead of raw Order.total/
      // subtotal/grossProfit aggregates. The raw aggregates counted
      // PENDING/CONFIRMED/PROCESSING/SHIPPED orders as revenue (only
      // CANCELLED was excluded) while Order.grossProfit is only populated
      // at the DELIVERED transition (see profitReportGeneration.ts), so
      // revenue and profit were computed over different, unrelated sets of
      // orders. getFinancialSummary is also refund-aware (refunds reduce
      // both figures via createRefundReversalEntries), which reading
      // Order.grossProfit directly is not.
      getFinancialSummary(startDate, now),

      // Platform-profit "fees" split (kept on the legacy Order aggregate —
      // this is the platform/seller profit-share split, a different metric
      // from the revenue/profit correctness this fix targets).
      prisma.order.aggregate({
        where: {
          status: { notIn: ['CANCELLED'] },
          createdAt: { gte: startDate }
        },
        _sum: {
          grossProfit: true,
          platformProfit: true
        }
      }),

      // Returns/Refunds
      prisma.order.count({
        where: {
          status: 'CANCELLED',
          createdAt: { gte: startDate }
        }
      }),
      
      // Top selling products
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            status: { notIn: ['CANCELLED'] },
            createdAt: { gte: startDate }
          }
        },
        _sum: {
          quantity: true,
          total: true
        },
        _count: true,
        orderBy: {
          _sum: {
            quantity: 'desc'
          }
        },
        take: 10
      }),
      
      // Top profitable products
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            status: { notIn: ['CANCELLED'] },
            createdAt: { gte: startDate }
          }
        },
        _sum: {
          totalProfit: true,
          total: true,
          quantity: true
        },
        orderBy: {
          _sum: {
            totalProfit: 'desc'
          }
        },
        take: 10
      }),
      
      // Partner performance
      prisma.user.findMany({
        where: {
          role: 'PARTNER',
          products: {
            some: {
              orderItems: {
                some: {
                  order: {
                    createdAt: { gte: startDate }
                  }
                }
              }
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          _count: {
            select: {
              products: true
            }
          }
        },
        take: 10
      }),
      
      // Recent orders
      prisma.order.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      }),
      
      // Orders by status
      prisma.order.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: startDate }
        },
        _count: true
      })
    ]);
    
    // Get product details for top products
    const topProductIds = topProducts.map(p => p.productId);
    const topProfitableIds = topProfitableProducts.map(p => p.productId);
    const allProductIds = [...new Set([...topProductIds, ...topProfitableIds])];
    
    const productDetails = await prisma.product.findMany({
      where: {
        id: { in: allProductIds }
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        wholesalePrice: true,
        seller: {
          select: {
            name: true
          }
        }
      }
    });
    
    const productMap = new Map(productDetails.map(p => [p.id, p]));
    
    // Get partner revenue details
    const partnerRevenue = await Promise.all(
      partnerPerformance.map(async (partner) => {
        const revenue = await prisma.orderItem.aggregate({
          where: {
            product: {
              sellerId: partner.id
            },
            order: {
              status: { notIn: ['CANCELLED'] },
              createdAt: { gte: startDate }
            }
          },
          _sum: {
            total: true,
            totalProfit: true
          },
          _count: true
        });
        
        return {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          productCount: partner._count.products,
          orders: revenue._count,
          revenue: revenue._sum.total || 0,
          payout: 0, // sellerPayout not in OrderItem schema
          profit: revenue._sum.totalProfit || 0
        };
      })
    );
    
    // Format top selling products
    const topSellingFormatted = topProducts.map(item => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        name: product?.name || 'Unknown',
        imageUrl: product?.imageUrl,
        seller: product?.seller?.name || 'Unknown',
        unitsSold: item._sum.quantity || 0,
        revenue: item._sum.total || 0,
        orders: item._count
      };
    });
    
    // Format top profitable products
    const topProfitableFormatted = topProfitableProducts.map(item => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        name: product?.name || 'Unknown',
        imageUrl: product?.imageUrl,
        seller: product?.seller?.name || 'Unknown',
        unitsSold: item._sum.quantity || 0,
        revenue: item._sum.total || 0,
        profit: item._sum.totalProfit || 0
      };
    });
    
    // Calculate growth (compare to previous, equivalent-length period) —
    // also ledger-based, so it's comparing the same real/net-of-refunds
    // figure on both sides instead of raw Order.total.
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - parseInt(period));
    // Exclusive of the current period's start instant (mirrors the previous
    // `lt: startDate` filter) — getFinancialSummary's endDate is inclusive
    // (`lte`), so back off by 1ms to avoid double-counting the boundary.
    const previousEndDate = new Date(startDate.getTime() - 1);

    const previousFinancialSummary = await getFinancialSummary(previousStartDate, previousEndDate);

    const revenueGrowth = previousFinancialSummary.revenue
      ? (((currentFinancialSummary.revenue - previousFinancialSummary.revenue) / previousFinancialSummary.revenue) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      period: parseInt(period),
      overview: {
        gmv: currentFinancialSummary.revenue,
        revenue: currentFinancialSummary.revenue,
        profit: currentFinancialSummary.grossProfit,
        fees: profitData._sum.platformProfit || 0,
        orders: ordersInPeriod,
        totalOrders: totalOrders,
        returns: returns,
        averageOrderValue: ordersInPeriod > 0 ? currentFinancialSummary.revenue / ordersInPeriod : 0,
        revenueGrowth: parseFloat(revenueGrowth.toFixed(2))
      },
      ordersByStatus: ordersByStatus.map(item => ({
        status: item.status,
        count: item._count
      })),
      topSellingProducts: topSellingFormatted,
      topProfitableProducts: topProfitableFormatted,
      partnerPerformance: partnerRevenue.sort((a, b) => b.revenue - a.revenue),
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        amount: order.total,
        customer: order.user?.name || 'Guest',
        date: order.createdAt
      }))
    });
    
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
