import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


// GET /api/search/popular - Get popular search terms
export async function GET(request: NextRequest) {
  try {
    // Get most popular categories
    const popularCategories = await prisma.category.findMany({
      where: {
        isActive: true
      },
      select: {
        name: true,
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: {
        products: {
          _count: 'desc'
        }
      },
      take: 4
    });

    // Get featured product brands
    const popularBrands = await prisma.product.findMany({
      where: {
        isActive: true,
        isFeatured: true,
        brand: {
          not: null
        }
      },
      select: {
        brand: true
      },
      distinct: ['brand'],
      take: 4
    });

    // Combine popular searches
    const popularSearches = [
      ...popularCategories.map(c => c.name),
      ...popularBrands.map(b => b.brand).filter(Boolean)
    ];

    // Remove duplicates and limit to 8
    const uniqueSearches = [...new Set(popularSearches)].slice(0, 8);

    return NextResponse.json({
      success: true,
      data: uniqueSearches
    });

  } catch (error) {
    console.error('Get Popular Searches Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get popular searches',
        data: ['Electronics', 'Baby Items', 'Clothing', 'Toys']
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
