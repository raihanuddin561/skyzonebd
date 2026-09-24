import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * Bulk Add to Cart API
 * POST /api/cart/bulk
 * Adds multiple products to cart at once (wholesale feature)
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Validate items structure
    const invalidItems = items.filter((item: any) => 
      !item.productId || typeof item.quantity !== 'number' || item.quantity <= 0
    );

    if (invalidItems.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid items format. Each item must have productId and positive quantity' },
        { status: 400 }
      );
    }

    // Fetch all products to validate availability and MOQ
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        wholesalePrice: true,
        imageUrl: true,
        moq: true,
        stockQuantity: true,
        availability: true,
        unit: true
      }
    });

    // Compare against the distinct id count, not the raw request length —
    // the client can legitimately send the same productId more than once
    // (e.g. two separate "add" clicks batched together), and Prisma's
    // `id: { in: [...] }` only ever returns one row per matching id. Using
    // productIds.length here meant any request with a duplicate productId
    // always failed with a false "not found" even when every product existed.
    const uniqueProductIdCount = new Set(productIds).size;
    if (products.length !== uniqueProductIdCount) {
      return NextResponse.json(
        { success: false, error: 'One or more products not found or inactive' },
        { status: 404 }
      );
    }

    // Validate stock and prepare cart items
    const cartItems = [];
    const errors = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      
      if (!product) continue;

      // Check availability
      if (product.availability === 'out_of_stock') {
        errors.push(`${product.name} is out of stock`);
        continue;
      }

      // Check stock quantity. stockQuantity is a real (non-nullable) count,
      // so 0 is a meaningful value here, not "unset" — a truthy check
      // (`product.stockQuantity && ...`) would short-circuit on exactly the
      // out-of-stock case and let any requested quantity through.
      const availableStock = product.stockQuantity ?? 0;
      if (item.quantity > availableStock) {
        errors.push(`${product.name}: Requested ${item.quantity} but only ${availableStock} available`);
        continue;
      }

      // Prepare cart item (MOQ validation happens on frontend based on user type)
      cartItems.push({
        product: {
          id: product.id,
          name: product.name,
          price: product.wholesalePrice,
          imageUrl: product.imageUrl,
          minOrderQuantity: product.moq || 1,
          availability: product.availability,
          unit: product.unit
        },
        quantity: item.quantity
      });
    }

    return NextResponse.json({
      success: true,
      cartItems,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalItems: cartItems.reduce((sum, item) => sum + item.quantity, 0),
        totalProducts: cartItems.length,
        totalPrice: cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
      }
    });

  } catch (error) {
    console.error('Error in bulk add to cart:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process bulk add to cart' },
      { status: 500 }
    );
  }
}
