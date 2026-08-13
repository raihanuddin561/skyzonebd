/**
 * GET /api/products/[id]/related
 *
 * The product detail page's "Related Products" section (via
 * useRelatedProducts -> dataService.products.getRelated) has called this
 * endpoint since it was built, but the route itself never existed — every
 * product page's Related Products section silently rendered nothing,
 * masked by the section's own `relatedProducts.length > 0` guard.
 *
 * Related = other active products in the same category, excluding the
 * product itself.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    const product = await prisma.product.findFirst({
      where: { OR: [{ id: productId }, { slug: productId }] },
      select: { id: true, categoryId: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '8'), 20);

    const related = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true,
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        wholesaleTiers: { orderBy: { minQuantity: 'asc' } },
      },
      orderBy: { rating: 'desc' },
      take: limit,
    });

    const relatedProducts = related.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.wholesalePrice,
      unit: p.unit,
      wholesalePrice: p.wholesalePrice,
      basePrice: p.basePrice,
      moq: p.moq,
      minOrderQuantity: p.moq,
      imageUrl: p.imageUrl,
      imageUrls: p.imageUrls,
      thumbnailUrl: p.thumbnailUrl,
      description: p.description,
      category: p.category.name,
      categorySlug: p.category.slug,
      brand: p.brand,
      tags: p.tags,
      wholesaleTiers: p.wholesaleTiers.map((tier) => ({
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity,
        price: tier.price,
        discount: tier.discount,
      })),
      stockQuantity: p.stockQuantity,
      availability: p.availability,
      sku: p.sku,
      rating: p.rating,
      reviewCount: p.reviewCount,
      isFeatured: p.isFeatured,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: { relatedProducts },
    });
  } catch (error) {
    console.error('Get Related Products Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch related products' },
      { status: 500 }
    );
  }
}
