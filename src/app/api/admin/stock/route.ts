import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { calculateStockStatus } from '@/utils/stockCalculations';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


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

    // Fetch products with stock info, plus enough order-item history to
    // compute a real sales-velocity figure per product (previously a
    // hardcoded `averageDailySales: 2` for every product regardless of how
    // it actually sells — Amazon-style gap-closure Phase 0).
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30));
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
        orderItems: {
          where: { createdAt: { gte: thirtyDaysAgo } },
          select: { quantity: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const stockItems = products.map(product => {
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
