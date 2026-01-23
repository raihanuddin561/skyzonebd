/**
 * Product Reviews API - Get Reviews for Product
 * GET /api/reviews/product/[id]
 * 
 * Fetches all approved reviews for a product with pagination
 * Includes rating aggregation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPaginationParams, createPaginationResponse } from '@/lib/paginationHelper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = id;
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'APPROVED'; // Default to approved only
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // createdAt, rating, helpful
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const ratingFilter = searchParams.get('rating'); // Filter by specific rating
    
    const { skip, take, page, limit } = getPaginationParams(searchParams);
    
    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Build where clause
    const where: any = {
      productId,
      status
    };
    
    if (ratingFilter) {
      where.rating = parseInt(ratingFilter);
    }
    
    // Get total count
    const total = await prisma.review.count({ where });
    
    // Determine sort order
    let orderBy: any = {};
    
    switch (sortBy) {
      case 'rating':
        orderBy = { rating: sortOrder };
        break;
      case 'helpful':
        orderBy = { helpfulCount: sortOrder };
        break;
      case 'createdAt':
      default:
        orderBy = { createdAt: sortOrder };
        break;
    }
    
    // Get reviews
    const reviews = await prisma.review.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: false // Don't expose email
          }
        }
      }
    });
    
    // Calculate rating aggregation
    const ratingAggregation = await prisma.review.groupBy({
      by: ['rating'],
      where: {
        productId,
        status: 'APPROVED'
      },
      _count: {
        rating: true
      }
    });
    
    // Calculate average rating
    const allApprovedReviews = await prisma.review.findMany({
      where: {
        productId,
        status: 'APPROVED'
      },
      select: {
        rating: true
      }
    });
    
    const totalReviews = allApprovedReviews.length;
    const averageRating = totalReviews > 0
      ? allApprovedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;
    
    // Format rating distribution
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };
    
    ratingAggregation.forEach(item => {
      ratingDistribution[item.rating as keyof typeof ratingDistribution] = item._count.rating;
    });
    
    // Calculate percentages
    const ratingPercentages = Object.entries(ratingDistribution).reduce((acc, [rating, count]) => {
      acc[rating] = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
      return acc;
    }, {} as Record<string, number>);
    
    // Create pagination metadata
    const pagination = createPaginationResponse(total, page, limit);
    
    return NextResponse.json({
      success: true,
      data: {
        reviews,
        aggregation: {
          averageRating: parseFloat(averageRating.toFixed(2)),
          totalReviews,
          ratingDistribution,
          ratingPercentages
        }
      },
      pagination,
      meta: {
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Get Product Reviews Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch reviews',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
