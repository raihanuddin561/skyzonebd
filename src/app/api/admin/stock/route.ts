import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { calculateStockStatus } from '@/utils/stockCalculations';

/**
 * GET /api/admin/stock
 * List all stock items with calculated fields
 * Supports filtering by status
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status'); // in_stock, low_stock, out_of_stock, reorder_needed

    // Fetch products with stock info
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stockQuantity: true,
        moq: true,
        reorderLevel: true,
        reorderQuantity: true,
        categoryId: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // TODO: Calculate average daily sales from order history
    // For now, we'll use placeholder values
    const stockItems = products.map(product => {
      const stockItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku || 'N/A',
        currentStock: product.stockQuantity || 0,
        moq: product.moq || 10,
        reorderPoint: product.reorderLevel || 20,
        reorderQuantity: product.reorderQuantity || 50,
        averageDailySales: 2, // TODO: Calculate from actual sales data
      };

      return calculateStockStatus(stockItem);
    });

    // Apply status filter
    const filteredItems = statusFilter
      ? stockItems.filter(item => item.status === statusFilter)
      : stockItems;

    // Calculate summary statistics
    const summary = {
      total: stockItems.length,
      inStock: stockItems.filter(i => i.status === 'in_stock').length,
      lowStock: stockItems.filter(i => i.status === 'low_stock').length,
      outOfStock: stockItems.filter(i => i.status === 'out_of_stock').length,
      reorderNeeded: stockItems.filter(i => i.status === 'reorder_needed').length,
    };

    return NextResponse.json({
      success: true,
      items: filteredItems,
      summary,
      total: filteredItems.length,
    });

  } catch (error) {
    console.error('❌ Error fetching stock items:', error);

    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { error: 'Failed to fetch stock items' },
      { status: 500 }
    );
  }
}
