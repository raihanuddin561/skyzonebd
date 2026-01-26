import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


// GET /api/search/suggestions - Get search suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Get product name suggestions
    const productSuggestions = await prisma.product.findMany({
      where: {
        isActive: true,
        name: {
          contains: query,
          mode: 'insensitive'
        }
      },
      select: {
        name: true
      },
      take: 5,
      orderBy: {
        isFeatured: 'desc'
      }
    });

    // Get category suggestions
    const categorySuggestions = await prisma.category.findMany({
      where: {
        isActive: true,
        name: {
          contains: query,
          mode: 'insensitive'
        }
      },
      select: {
        name: true
      },
      take: 3
    });

    // Get brand suggestions
    const brandSuggestions = await prisma.product.findMany({
      where: {
        isActive: true,
        brand: {
          not: null,
          contains: query,
          mode: 'insensitive'
        }
      },
      select: {
        brand: true
      },
      distinct: ['brand'],
      take: 3
    });

    // Combine all suggestions
    const suggestions = [
      ...productSuggestions.map(p => p.name),
      ...categorySuggestions.map(c => c.name),
      ...brandSuggestions.map(b => b.brand).filter(Boolean)
    ];

    // Remove duplicates and limit to 8 suggestions
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 8);

    return NextResponse.json({
      success: true,
      data: uniqueSuggestions
    });

  } catch (error) {
    console.error('Get Suggestions Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get suggestions',
        data: []
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
