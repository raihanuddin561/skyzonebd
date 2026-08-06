import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

const PRODUCT_SELECT = {
  id: true,
  name: true,
  wholesalePrice: true,
  moq: true,
  unit: true,
  imageUrl: true,
  imageUrls: true,
  description: true,
  brand: true,
  tags: true,
  stockQuantity: true,
  availability: true,
  rating: true,
  reviewCount: true,
  category: { select: { name: true } },
} as const;

function formatProduct(product: any) {
  return {
    id: product.id,
    name: product.name,
    price: product.wholesalePrice,
    wholesalePrice: product.wholesalePrice,
    minOrderQuantity: product.moq,
    unit: product.unit,
    imageUrl: product.imageUrl,
    imageUrls: product.imageUrls,
    description: product.description,
    category: product.category?.name,
    brand: product.brand,
    tags: product.tags,
    stock: product.stockQuantity,
    availability: product.availability,
    rating: product.rating,
    reviews: product.reviewCount,
  };
}

// GET the authenticated user's wishlist
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId: authUser.id },
      include: {
        items: {
          include: { product: { select: PRODUCT_SELECT } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const items = (wishlist?.items || [])
      .filter(item => item.product)
      .map(item => formatProduct(item.product));

    return NextResponse.json({ success: true, data: { items } });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching wishlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wishlist' },
      { status: 500 }
    );
  }
}

// POST add a product to the authenticated user's wishlist. Idempotent —
// re-adding an already-wishlisted product is a no-op, not an error, since
// the client-side toggle (isInWishlist) can't distinguish "add" from
// "already added" across a page refresh.
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const { productId } = await request.json();
    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'productId is required' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: PRODUCT_SELECT,
    });
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const wishlist = await prisma.wishlist.upsert({
      where: { userId: authUser.id },
      create: { userId: authUser.id },
      update: {},
    });

    await prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
      create: { wishlistId: wishlist.id, productId },
      update: {},
    });

    return NextResponse.json({ success: true, data: formatProduct(product) });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error adding to wishlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add to wishlist' },
      { status: 500 }
    );
  }
}
