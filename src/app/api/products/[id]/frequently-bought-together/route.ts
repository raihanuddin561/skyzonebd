/**
 * GET /api/products/[id]/frequently-bought-together
 *
 * "Customers who bought this also bought" — computed on-read from real
 * delivered-order history via a self-join over OrderItem (grouped by the
 * *other* productId sharing an order with this one), the same
 * groupBy/count-and-rank idiom already used for
 * src/app/api/partner/financial/top-products/route.ts, extended to pair
 * products within the same order (something Prisma's `groupBy` can't do
 * natively, hence the raw query).
 *
 * Scoped to DELIVERED orders only — a genuine completed purchase, not a
 * cart/pending order that may never convert — same signal quality bar the
 * top-products route already uses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface CoOccurrenceRow {
  productId: string;
  coOccurrenceCount: bigint | number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    const product = await prisma.product.findFirst({
      where: { OR: [{ id: productId }, { slug: productId }] },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '3') || 3, 1), 10);

    const coOccurrences = await prisma.$queryRaw<CoOccurrenceRow[]>`
      SELECT oi2."productId" AS "productId",
             COUNT(DISTINCT oi1."orderId")::int AS "coOccurrenceCount"
      FROM "order_items" oi1
      JOIN "order_items" oi2
        ON oi1."orderId" = oi2."orderId"
       AND oi2."productId" != oi1."productId"
      JOIN "orders" o ON o.id = oi1."orderId"
      WHERE oi1."productId" = ${product.id}
        AND o.status = 'DELIVERED'
        AND oi2."productId" != ${product.id}
      GROUP BY oi2."productId"
      ORDER BY "coOccurrenceCount" DESC
      LIMIT ${limit}
    `;

    if (coOccurrences.length === 0) {
      return NextResponse.json({
        success: true,
        data: { frequentlyBoughtTogether: [] },
      });
    }

    const orderedIds = coOccurrences.map((row) => row.productId);

    const products = await prisma.product.findMany({
      where: { id: { in: orderedIds }, isActive: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        wholesaleTiers: { orderBy: { minQuantity: 'asc' } },
      },
    });

    // findMany with `id: { in }` doesn't preserve the input order, so
    // re-sort by the co-occurrence ranking computed above.
    const byId = new Map(products.map((p) => [p.id, p]));
    const frequentlyBoughtTogether = orderedIds
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({
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
      data: { frequentlyBoughtTogether },
    });
  } catch (error) {
    console.error('Get Frequently Bought Together Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch frequently bought together products' },
      { status: 500 }
    );
  }
}
