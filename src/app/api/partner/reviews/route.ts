/**
 * Partner Reviews API - View Reviews for Partner's Products
 * GET /api/partner/reviews
 * 
 * Allows partners to view reviews for products they sell
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePartner } from '@/lib/auth';
import { getPaginationParams, createPaginationResponse } from '@/lib/paginationHelper';

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
    const status = searchParams.get('status') || 'APPROVED'; // Default to approved
    const productId = searchParams.get('productId');
    const rating = searchParams.get('rating');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    const { skip, take, page, limit } = getPaginationParams(searchParams);
    
    // Get partner's products
    const partnerProducts = await prisma.product.findMany({
      where: {
        sellerId: user.id
      },
      select: {
        id: true
      }
    });
    
    const productIds = partnerProducts.map(p => p.id);
    
    if (productIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          reviews: [],
          summary: {
            total: 0,
            averageRating: 0,
            byRating: {
              5: 0, 4: 0, 3: 0, 2: 0, 1: 0
            }
          }
        },
        pagination: createPaginationResponse(0, 1, limit)
      });
    }
    
    // Build where clause
    const where: any = {
      productId: {
        in: productIds
      },
      status
    };
    
    if (productId && productIds.includes(productId)) {
      where.productId = productId;
    }
    
    if (rating) {
      where.rating = parseInt(rating);
    }
    
    // Get total count
    const total = await prisma.review.count({ where });
    
    // Get reviews
    const reviews = await prisma.review.findMany({
      where,
      skip,
      take,
      orderBy: {
        [sortBy]: sortOrder
      },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        },
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true
          }
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            createdAt: true
          }
        }
      }
    });
    
    // Calculate summary statistics
    const allReviews = await prisma.review.findMany({
      where: {
        productId: {
          in: productIds
        },
        status: 'APPROVED'
      },
      select: {
        rating: true
      }
    });
    
    const totalReviews = allReviews.length;
    const averageRating = totalReviews > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;
    
    const byRating = {
      5: allReviews.filter(r => r.rating === 5).length,
      4: allReviews.filter(r => r.rating === 4).length,
      3: allReviews.filter(r => r.rating === 3).length,
      2: allReviews.filter(r => r.rating === 2).length,
      1: allReviews.filter(r => r.rating === 1).length
    };
    
    // Create pagination metadata
    const pagination = createPaginationResponse(total, page, limit);
    
    return NextResponse.json({
      success: true,
      data: {
        reviews,
        summary: {
          total: totalReviews,
          averageRating: parseFloat(averageRating.toFixed(2)),
          byRating
        }
      },
      pagination,
      meta: {
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Partner Get Reviews Error:', error);
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
