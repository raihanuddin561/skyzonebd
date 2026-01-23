/**
 * Admin Review Moderation API - Single Review
 * PATCH /api/admin/reviews/[id] - Moderate review (approve, hide, reject)
 * DELETE /api/admin/reviews/[id] - Delete review
 * 
 * Allows admin to moderate individual reviews
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin
    const admin = await requireAdmin(request);
    
    const { id } = await params;
    
    // Parse request body
    const body = await request.json();
    const { status, moderationNote } = body;
    
    // Validate status
    const validStatuses = ['PENDING', 'APPROVED', 'HIDDEN', 'REJECTED'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check if review exists
    const existingReview = await prisma.review.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }
    
    // Update review
    const updatedReview = await prisma.review.update({
      where: { id },
      data: {
        status,
        moderatedBy: admin.id,
        moderatedAt: new Date(),
        moderationNote: moderationNote || null
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
            name: true
          }
        }
      }
    });
    
    // If approved, update product rating aggregation
    if (status === 'APPROVED') {
      await updateProductRating(existingReview.productId);
    }
    
    return NextResponse.json({
      success: true,
      data: updatedReview,
      message: `Review ${status.toLowerCase()} successfully`
    });
    
  } catch (error) {
    console.error('Moderate Review Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to moderate review',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin
    await requireAdmin(request);
    
    const { id } = await params;
    
    // Check if review exists
    const existingReview = await prisma.review.findUnique({
      where: { id }
    });
    
    if (!existingReview) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404 }
      );
    }
    
    const productId = existingReview.productId;
    
    // Delete review
    await prisma.review.delete({
      where: { id }
    });
    
    // Update product rating aggregation
    await updateProductRating(productId);
    
    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete Review Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete review',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to update product rating aggregation
 */
async function updateProductRating(productId: string) {
  try {
    // Get all approved reviews for the product
    const approvedReviews = await prisma.review.findMany({
      where: {
        productId,
        status: 'APPROVED'
      },
      select: {
        rating: true
      }
    });
    
    const reviewCount = approvedReviews.length;
    const averageRating = reviewCount > 0
      ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : null;
    
    // Update product
    await prisma.product.update({
      where: { id: productId },
      data: {
        rating: averageRating,
        reviewCount
      }
    });
  } catch (error) {
    console.error('Update Product Rating Error:', error);
    // Don't throw - this is a background operation
  }
}
