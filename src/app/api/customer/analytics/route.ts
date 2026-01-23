/**
 * Customer Analytics API
 * Provides order history and review prompts for customers
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    
    // Get order history
    const orders = await prisma.order.findMany({
      where: {
        userId: user.id
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        subtotal: true,
        shipping: true,
        total: true,
        createdAt: true,
        updatedAt: true,
        orderItems: {
          select: {
            id: true,
            quantity: true,
            price: true,
            total: true,
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                seller: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });
    
    // Get products that can be reviewed (delivered orders without reviews)
    const deliveredOrders = await prisma.order.findMany({
      where: {
        userId: user.id,
        status: 'DELIVERED'
      },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        orderItems: {
          select: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                reviews: {
                  where: {
                    userId: user.id
                  },
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        }
      }
    });
    
    // Extract products without reviews
    const reviewPrompts: Array<{
      productId: string;
      productName: string;
      productImage: string | null;
      orderId: string;
      orderNumber: string;
      deliveredDate: Date;
    }> = [];
    
    for (const order of deliveredOrders) {
      for (const item of order.orderItems) {
        if (item.product.reviews.length === 0) {
          reviewPrompts.push({
            productId: item.product.id,
            productName: item.product.name,
            productImage: item.product.imageUrl,
            orderId: order.id,
            orderNumber: order.orderNumber,
            deliveredDate: order.createdAt
          });
        }
      }
    }
    
    // Get statistics
    const stats = await prisma.order.aggregate({
      where: {
        userId: user.id,
        status: { notIn: ['CANCELLED'] }
      },
      _sum: {
        total: true
      },
      _count: true
    });
    
    const cancelledOrders = await prisma.order.count({
      where: {
        userId: user.id,
        status: 'CANCELLED'
      }
    });
    
    // Get user's reviews
    const reviewsCount = await prisma.review.count({
      where: {
        userId: user.id
      }
    });
    
    // Order status breakdown
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: {
        userId: user.id
      },
      _count: true
    });
    
    return NextResponse.json({
      success: true,
      stats: {
        totalOrders: stats._count,
        totalSpent: stats._sum.total || 0,
        averageOrderValue: stats._count > 0 ? (stats._sum.total || 0) / stats._count : 0,
        cancelledOrders: cancelledOrders,
        reviewsWritten: reviewsCount,
        pendingReviews: reviewPrompts.length
      },
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
        date: order.createdAt,
        itemCount: order.orderItems.length,
        items: order.orderItems.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          imageUrl: item.product.imageUrl,
          seller: item.product.seller?.name || 'Unknown',
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.total
        }))
      })),
      ordersByStatus: ordersByStatus.map(item => ({
        status: item.status,
        count: item._count
      })),
      reviewPrompts: reviewPrompts.sort((a, b) => 
        new Date(b.deliveredDate).getTime() - new Date(a.deliveredDate).getTime()
      ).slice(0, 10) // Top 10 most recent
    });
    
  } catch (error: any) {
    console.error('Customer analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: error.message?.includes('Unauthorized') ? 401 : 500 }
    );
  }
}
