/**
 * Admin Analytics API
 * Provides comprehensive analytics for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    // Parallel queries for performance
    const [
      totalOrders,
      ordersInPeriod,
      revenueData,
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
      
      // Revenue metrics (GMV)
      prisma.order.aggregate({
        where: {
          status: { notIn: ['CANCELLED'] },
          createdAt: { gte: startDate }
        },
        _sum: {
          total: true,
          subtotal: true,
          shipping: true,
          platformProfit: true
        },
        _count: true
      }),
      
      // Profit metrics
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
    
    // Calculate growth (compare to previous period)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - parseInt(period));
    
    const previousRevenue = await prisma.order.aggregate({
      where: {
        status: { notIn: ['CANCELLED'] },
        createdAt: {
          gte: previousStartDate,
          lt: startDate
        }
      },
      _sum: {
        total: true
      }
    });
    
    const revenueGrowth = previousRevenue._sum.total
      ? ((((revenueData._sum.total || 0) - (previousRevenue._sum.total || 0)) / (previousRevenue._sum.total || 1)) * 100)
      : 0;
    
    return NextResponse.json({
      success: true,
      period: parseInt(period),
      overview: {
        gmv: revenueData._sum.total || 0,
        revenue: revenueData._sum.subtotal || 0,
        profit: profitData._sum.grossProfit || 0,
        fees: profitData._sum.platformProfit || 0,
        orders: ordersInPeriod,
        totalOrders: totalOrders,
        returns: returns,
        averageOrderValue: ordersInPeriod > 0 ? (revenueData._sum.total || 0) / ordersInPeriod : 0,
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
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
