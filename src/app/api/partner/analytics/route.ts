/**
 * Partner Analytics API
 * Provides analytics for partner dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePartner } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const partner = await requirePartner(req);
    
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30'; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));
    
    // Parallel queries for performance
    const [
      totalRevenue,
      payoutData,
      topProducts,
      lowStockProducts,
      recentOrders,
      ordersByStatus,
      productCount
    ] = await Promise.all([
      // Revenue metrics (GMV)
      prisma.orderItem.aggregate({
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
          totalProfit: true,
          quantity: true
        },
        _count: true
      }),
      
      // Payout information
      prisma.profitDistribution.aggregate({
        where: {
          partnerId: partner.id,
          status: 'PENDING'
        },
        _sum: {
          distributionAmount: true
        }
      }),
      
      // Top performing products
      prisma.orderItem.groupBy({
        by: ['productId'],
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
          quantity: true,
          total: true,
          totalProfit: true
        },
        _count: true,
        orderBy: {
          _sum: {
            total: 'desc'
          }
        },
        take: 10
      }),
      
      // Low stock products
      prisma.product.findMany({
        where: {
          sellerId: partner.id,
          stockQuantity: {
            lte: 10
          },
          isActive: true
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          stockQuantity: true,
          wholesalePrice: true,
          moq: true
        },
        orderBy: {
          stockQuantity: 'asc'
        },
        take: 10
      }),
      
      // Recent orders containing partner's products
      prisma.order.findMany({
        where: {
          orderItems: {
            some: {
              product: {
                sellerId: partner.id
              }
            }
          },
          createdAt: { gte: startDate }
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          orderItems: {
            where: {
              product: {
                sellerId: partner.id
              }
            },
            select: {
              quantity: true,
              total: true,
              totalProfit: true,
              product: {
                select: {
                  name: true,
                  imageUrl: true
                }
              }
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
          orderItems: {
            some: {
              product: {
                sellerId: partner.id
              }
            }
          },
          createdAt: { gte: startDate }
        },
        _count: true
      }),
      
      // Total product count
      prisma.product.count({
        where: {
          sellerId: partner.id
        }
      })
    ]);
    
    // Get product details for top products
    const topProductIds = topProducts.map(p => p.productId);
    const productDetails = await prisma.product.findMany({
      where: {
        id: { in: topProductIds }
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        wholesalePrice: true,
        stockQuantity: true,
        rating: true,
        reviewCount: true
      }
    });
    
    const productMap = new Map(productDetails.map(p => [p.id, p]));
    
    // Format top products
    const topProductsFormatted = topProducts.map(item => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        name: product?.name || 'Unknown',
        imageUrl: product?.imageUrl,
        price: product?.wholesalePrice || 0,
        stockQuantity: product?.stockQuantity || 0,
        rating: product?.rating || 0,
        reviewCount: product?.reviewCount || 0,
        unitsSold: item._sum.quantity || 0,
        revenue: item._sum.total || 0,
        payout: item._sum.totalProfit || 0,
        orders: item._count
      };
    });
    
    // Calculate previous period for growth
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - parseInt(period));
    
    const previousRevenue = await prisma.orderItem.aggregate({
      where: {
        product: {
          sellerId: partner.id
        },
        order: {
          status: { notIn: ['CANCELLED'] },
          createdAt: {
            gte: previousStartDate,
            lt: startDate
          }
        }
      },
      _sum: {
        total: true
      }
    });
    
    const revenueGrowth = previousRevenue._sum.total
      ? ((((totalRevenue._sum.total || 0) - (previousRevenue._sum.total || 0)) / (previousRevenue._sum.total || 1)) * 100)
      : 0;
    
    // Get recent payouts
    const recentPayouts = await prisma.profitDistribution.findMany({
      where: {
        partnerId: partner.id
      },
      select: {
        id: true,
        distributionAmount: true,
        status: true,
        createdAt: true,
        paidAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });
    
    return NextResponse.json({
      success: true,
      period: parseInt(period),
      overview: {
        gmv: totalRevenue._sum.total || 0,
        orders: totalRevenue._count,
        profit: totalRevenue._sum.totalProfit || 0,
        payoutDue: payoutData._sum.distributionAmount || 0,
        platformFee: 0, // Platform fee not tracked at OrderItem level
        unitsSold: totalRevenue._sum.quantity || 0,
        productCount: productCount,
        averageOrderValue: totalRevenue._count > 0 ? (totalRevenue._sum.total || 0) / totalRevenue._count : 0,
        revenueGrowth: parseFloat(revenueGrowth.toFixed(2))
      },
      topProducts: topProductsFormatted,
      lowStockProducts: lowStockProducts,
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        date: order.createdAt,
        items: order.orderItems.map(item => ({
          product: item.product.name,
          imageUrl: item.product.imageUrl,
          quantity: item.quantity,
          revenue: item.total,
          payout: item.totalProfit
        })),
        totalRevenue: order.orderItems.reduce((sum, item) => sum + (item.total || 0), 0),
        totalPayout: order.orderItems.reduce((sum, item) => sum + (item.totalProfit || 0), 0)
      })),
      ordersByStatus: ordersByStatus.map(item => ({
        status: item.status,
        count: item._count
      })),
      recentPayouts: recentPayouts
    });
    
  } catch (error: any) {
    console.error('Partner analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
