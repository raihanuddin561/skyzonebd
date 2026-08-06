import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { calculateStockStatus, generateStockAlert } from '@/utils/stockCalculations';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * GET /api/admin/stock/reorder-alerts
 * Get products that need reordering
 * Returns prioritized list of products requiring action
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    // Prisma can't compare two columns of the same row in a `where` filter
    // (stockQuantity <= reorderLevel), so this fetches every active
    // product's own reorderLevel and filters in application code against
    // it — previously a hardcoded `stockQuantity <= 20` regardless of each
    // product's real reorder point (Amazon-style gap-closure Phase 0).
    // Also pulls 30 days of order-item history to compute real sales
    // velocity instead of a hardcoded `averageDailySales: 2`.
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
    const allActiveProducts = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true,
        moq: true,
        reorderLevel: true,
        reorderQuantity: true,
        category: {
          select: {
            name: true,
          },
        },
        orderItems: {
          where: { createdAt: { gte: thirtyDaysAgo } },
          select: { quantity: true },
        },
      },
      orderBy: {
        stockQuantity: 'asc', // Most urgent first
      },
    });

    const products = allActiveProducts.filter(
      product => product.stockQuantity === 0 || product.stockQuantity <= (product.reorderLevel ?? 20)
    );

    // Calculate stock status and generate alerts
    const alerts = products.map(product => {
      const soldLast30Days = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const stockItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku || 'N/A',
        currentStock: product.stockQuantity || 0,
        moq: product.moq || 10,
        reorderPoint: product.reorderLevel || 20,
        reorderQuantity: product.reorderQuantity || 50,
        averageDailySales: soldLast30Days / 30,
      };

      const calculation = calculateStockStatus(stockItem);
      const alertMessage = generateStockAlert(calculation);

      return {
        ...calculation,
        category: product.category.name,
        alertMessage,
        priority: calculation.status === 'out_of_stock' ? 'critical' :
                 calculation.status === 'reorder_needed' ? 'high' : 'medium',
      };
    });

    // Group by priority
    const grouped = {
      critical: alerts.filter(a => a.priority === 'critical'),
      high: alerts.filter(a => a.priority === 'high'),
      medium: alerts.filter(a => a.priority === 'medium'),
    };

    return NextResponse.json({
      success: true,
      alerts,
      grouped,
      summary: {
        total: alerts.length,
        critical: grouped.critical.length,
        high: grouped.high.length,
        medium: grouped.medium.length,
      },
    });

  } catch (error) {
    console.error('❌ Error fetching reorder alerts:', error);

    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { error: 'Failed to fetch reorder alerts' },
      { status: 500 }
    );
  }
}
