import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const filter = searchParams.get('filter') || 'all'; // all, low, out, available

    // Build where clause based on filter
    let whereClause: any = {
      isActive: true,
    };

    if (filter === 'low') {
      whereClause.stockQuantity = { lte: 10, gt: 0 };
    } else if (filter === 'out') {
      whereClause.stockQuantity = 0;
    } else if (filter === 'available') {
      whereClause.stockQuantity = { gt: 10 };
    }

    // Get products with inventory details
    const products = await prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        sku: true,
        imageUrl: true,
        stockQuantity: true,
        availability: true,
        retailPrice: true,
        category: {
          select: {
            name: true,
          },
        },
        orderItems: {
          where: {
            createdAt: {
              gte: new Date(new Date().setDate(new Date().getDate() - 30)),
            },
          },
          select: {
            quantity: true,
          },
        },
        updatedAt: true,
      },
      orderBy: {
        stockQuantity: 'asc',
      },
    });

    // Calculate additional stats for each product
    const inventoryData = products.map(product => {
      const soldLast30Days = product.orderItems.reduce((sum, item) => sum + item.quantity, 0);
      const avgDailySales = soldLast30Days / 30;
      const daysUntilStockout = avgDailySales > 0 
        ? Math.floor(product.stockQuantity / avgDailySales)
        : product.stockQuantity > 0 ? 999 : 0;

      let status = 'In Stock';
      if (product.stockQuantity === 0) {
        status = 'Out of Stock';
      } else if (product.stockQuantity <= 5) {
        status = 'Critical';
      } else if (product.stockQuantity <= 10) {
        status = 'Low Stock';
      }

      return {
        id: product.id,
        name: product.name,
        sku: product.sku || 'N/A',
        category: product.category?.name || 'Uncategorized',
        stock: product.stockQuantity,
        status,
        price: product.retailPrice,
        soldLast30Days,
        daysUntilStockout: daysUntilStockout === 999 ? 'N/A' : `${daysUntilStockout}d`,
        lastUpdated: product.updatedAt.toISOString().split('T')[0],
        imageUrl: product.imageUrl,
      };
    });

    // Calculate summary stats
    const totalProducts = await prisma.product.count({ where: { isActive: true } });
    const lowStockCount = await prisma.product.count({
      where: {
        isActive: true,
        stockQuantity: { lte: 10, gt: 0 },
      },
    });
    const outOfStockCount = await prisma.product.count({
      where: {
        isActive: true,
        stockQuantity: 0,
      },
    });
    const totalStockValue = products.reduce((sum, product) => 
      sum + (product.stockQuantity * product.retailPrice), 0
    );

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          lowStockCount,
          outOfStockCount,
          totalStockValue,
          formattedStockValue: `৳${totalStockValue.toLocaleString()}`,
        },
        products: inventoryData,
        filter,
      },
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inventory data' },
      { status: 500 }
    );
  }
}
