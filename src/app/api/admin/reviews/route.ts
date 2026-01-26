/**
 * Admin Review Moderation API
 * GET /api/admin/reviews - Get all reviews for moderation
 * 
 * Allows admin to view all reviews with filtering
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { getPaginationParams, createPaginationResponse } from '@/lib/paginationHelper';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function GET(request: NextRequest) {
  try {
    // Authenticate admin
    await requireAdmin(request);
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // PENDING, APPROVED, HIDDEN, REJECTED
    const productId = searchParams.get('productId');
    const userId = searchParams.get('userId');
    const rating = searchParams.get('rating');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    const { skip, take, page, limit } = getPaginationParams(searchParams);
    
    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (productId) {
      where.productId = productId;
    }
    
    if (userId) {
      where.userId = userId;
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
            name: true,
            email: true
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
            createdAt: true,
            status: true
          }
        }
      }
    });
    
    // Calculate summary statistics
    const statusCounts = await prisma.review.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });
    
    const summary = {
      total,
      pending: statusCounts.find(s => s.status === 'PENDING')?._count.status || 0,
      approved: statusCounts.find(s => s.status === 'APPROVED')?._count.status || 0,
      hidden: statusCounts.find(s => s.status === 'HIDDEN')?._count.status || 0,
      rejected: statusCounts.find(s => s.status === 'REJECTED')?._count.status || 0
    };
    
    // Create pagination metadata
    const pagination = createPaginationResponse(total, page, limit);
    
    return NextResponse.json({
      success: true,
      data: {
        reviews,
        summary
      },
      pagination,
      meta: {
        generatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Admin Get Reviews Error:', error);
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
