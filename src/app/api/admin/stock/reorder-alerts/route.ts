import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { calculateStockStatus, generateStockAlert } from '@/utils/stockCalculations';

/**
 * GET /api/admin/stock/reorder-alerts
 * Get products that need reordering
 * Returns prioritized list of products requiring action
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    // Fetch products with low/out of stock
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { stockQuantity: 0 },
          {
            // Stock at or below reorder level
            stockQuantity: { lte: 20 }, // TODO: Compare with actual reorderLevel
          },
        ],
      },
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
      },
      orderBy: {
        stockQuantity: 'asc', // Most urgent first
      },
    });

    // Calculate stock status and generate alerts
    const alerts = products.map(product => {
      const stockItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku || 'N/A',
        currentStock: product.stockQuantity || 0,
        moq: product.moq || 10,
        reorderPoint: product.reorderLevel || 20,
        reorderQuantity: product.reorderQuantity || 50,
        averageDailySales: 2, // TODO: Calculate from actual sales
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
