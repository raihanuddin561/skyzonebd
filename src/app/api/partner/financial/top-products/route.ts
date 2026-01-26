/**
 * Partner Financial Dashboard - Top Products Analysis
 * GET /api/partner/financial/top-products
 * 
 * Shows top performing products by profit, revenue, or units sold
 * Helps partners understand which products drive the most value
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePartner } from '@/lib/auth';
import { validateDateRange } from '@/lib/financialCalculator';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function GET(request: NextRequest) {
  try {
    // Authenticate partner
    const user = await requirePartner(request);
    
    // Find partner record
    const partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { email: user.email },
          { id: user.id }
        ]
      }
    });
    
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner record not found' },
        { status: 404 }
      );
    }
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'profit'; // profit, revenue, units
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    
    if (!startDateStr || !endDateStr) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }
    
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // Validate date range
    const validation = validateDateRange(startDate, endDate);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }
    
    // Determine sort field
    let orderByField: 'totalProfit' | 'total' | 'quantity' = 'totalProfit';
    if (sortBy === 'revenue') orderByField = 'total';
    if (sortBy === 'units') orderByField = 'quantity';
    
    // Get top products by grouping order items
    const topProductsData = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: 'DELIVERED',
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      },
      _sum: {
        quantity: true,
        total: true,
        totalProfit: true,
        costPerUnit: true
      },
      _avg: {
        profitMargin: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          [orderByField]: 'desc'
        }
      },
      take: limit
    });
    
    // Get product details
    const productIds = topProductsData.map(p => p.productId);
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds
        }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        imageUrl: true,
        wholesalePrice: true,
        basePrice: true,
        category: {
          select: {
            name: true
          }
        }
      }
    });
    
    // Create product map for quick lookup
    const productMap = new Map(products.map(p => [p.id, p]));
    
    // Combine data
    const topProducts = topProductsData.map(data => {
      const product = productMap.get(data.productId);
      const revenue = data._sum.total || 0;
      const profit = data._sum.totalProfit || 0;
      const unitsSold = data._sum.quantity || 0;
      const avgMargin = data._avg.profitMargin || 0;
      const orderCount = data._count.id;
      
      return {
        productId: data.productId,
        productName: product?.name || 'Unknown Product',
        sku: product?.sku,
        category: product?.category?.name,
        imageUrl: product?.imageUrl,
        metrics: {
          unitsSold,
          revenue,
          profit,
          profitMargin: avgMargin,
          orderCount,
          averageUnitPrice: unitsSold > 0 ? revenue / unitsSold : 0,
          averageProfitPerUnit: unitsSold > 0 ? profit / unitsSold : 0
        }
      };
    });
    
    // Calculate summary statistics
    const totalUnits = topProducts.reduce((sum, p) => sum + p.metrics.unitsSold, 0);
    const totalRevenue = topProducts.reduce((sum, p) => sum + p.metrics.revenue, 0);
    const totalProfit = topProducts.reduce((sum, p) => sum + p.metrics.profit, 0);
    
    return NextResponse.json({
      success: true,
      data: {
        products: topProducts,
        summary: {
          totalProducts: topProducts.length,
          totalUnitsSold: totalUnits,
          totalRevenue,
          totalProfit,
          averageProfitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
        },
        filters: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          sortBy,
          limit
        }
      },
      meta: {
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Partner Top Products Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch top products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
