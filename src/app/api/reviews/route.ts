/**
 * Product Reviews API - Submit Review
 * POST /api/reviews
 * 
 * Allows verified purchasers to submit product reviews
 * Validates purchase history before allowing review
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const userId = authResult.user.id;
    
    // Parse request body
    const body = await request.json();
    const { productId, orderId, rating, title, comment, images } = body;
    
    // Validate required fields
    if (!productId || !orderId || !rating || !comment) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: productId, orderId, rating, comment' },
        { status: 400 }
      );
    }
    
    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }
    
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
    
    // Verify order exists and belongs to user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          where: {
            productId: productId
          }
        }
      }
    });
    
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Verify order belongs to user
    if (order.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only review products from your own orders' },
        { status: 403 }
      );
    }
    
    // Verify product was in the order
    if (order.orderItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'This product was not in the specified order' },
        { status: 400 }
      );
    }
    
    // Verify order is delivered
    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { success: false, error: 'You can only review products from delivered orders' },
        { status: 400 }
      );
    }
    
    // Check if user already reviewed this product in this order
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_productId_orderId: {
          userId,
          productId,
          orderId
        }
      }
    });
    
    if (existingReview) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this product for this order' },
        { status: 409 }
      );
    }
    
    // Create review
    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        orderId,
        rating,
        title: title || null,
        comment,
        images: images || [],
        isVerifiedPurchase: true,
        purchaseDate: order.createdAt,
        status: 'PENDING' // Requires moderation
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    // Update product rating aggregation (will be done in a separate endpoint/job)
    // For now, we'll calculate on-the-fly when fetching reviews
    
    return NextResponse.json({
      success: true,
      data: review,
      message: 'Review submitted successfully. It will be visible after moderation.'
    });
    
  } catch (error) {
    console.error('Submit Review Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to submit review',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
