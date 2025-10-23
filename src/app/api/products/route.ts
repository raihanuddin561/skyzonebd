import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const categorySlug = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const featured = searchParams.get('featured') === 'true';

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (categorySlug && categorySlug !== 'all') {
      where.category = {
        slug: categorySlug
      };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      where.retailPrice = {};
      if (minPrice) where.retailPrice.gte = parseFloat(minPrice);
      if (maxPrice) where.retailPrice.lte = parseFloat(maxPrice);
    }

    // Featured filter
    if (featured) {
      where.isFeatured = true;
    }

    // Sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'price-low':
        orderBy = { retailPrice: 'asc' };
        break;
      case 'price-high':
        orderBy = { retailPrice: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Get total count
    const total = await prisma.product.count({ where });

    // Get paginated products with category and wholesale tiers
    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        wholesaleTiers: {
          orderBy: {
            minQuantity: 'asc'
          }
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get all categories for filter
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { products: true }
        }
      }
    });

    // Transform products to match frontend interface
    const transformedProducts = products.map(product => ({
      id: product.id, // Keep cuid string for database compatibility
      name: product.name,
      price: product.retailPrice,
      retailPrice: product.retailPrice,
      salePrice: product.salePrice,
      comparePrice: product.comparePrice,
      imageUrl: product.imageUrl,
      imageUrls: product.imageUrls,
      thumbnailUrl: product.thumbnailUrl,
      description: product.description,
      category: product.category.name,
      categorySlug: product.category.slug,
      brand: product.brand,
      tags: product.tags,
      specifications: product.specifications as Record<string, any>,
      minOrderQuantity: product.minOrderQuantity,
      wholesaleMOQ: product.wholesaleMOQ,
      wholesaleEnabled: product.wholesaleEnabled,
      wholesaleTiers: product.wholesaleTiers.map(tier => ({
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity,
        price: tier.price,
        discount: tier.discount,
      })),
      stockQuantity: product.stockQuantity,
      availability: product.availability,
      sku: product.sku,
      rating: product.rating,
      reviewCount: product.reviewCount,
      isFeatured: product.isFeatured,
      createdAt: product.createdAt.toISOString(),
    }));

    const response = {
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          count: cat._count.products
        }))
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Products API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}