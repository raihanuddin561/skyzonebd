import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/search/products - Search products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause for search
    const whereClause: any = {
      isActive: true,
      AND: []
    };

    // Add search query filter
    if (query && query.trim()) {
      whereClause.AND.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { brand: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: [query.toLowerCase()] } },
          { category: { name: { contains: query, mode: 'insensitive' } } }
        ]
      });
    }

    // Add category filter
    if (category) {
      whereClause.AND.push({
        OR: [
          { categoryId: category },
          { category: { name: { equals: category, mode: 'insensitive' } } },
          { category: { slug: { equals: category, mode: 'insensitive' } } }
        ]
      });
    }

    // Add price filters
    if (minPrice) {
      whereClause.AND.push({
        retailPrice: { gte: parseFloat(minPrice) }
      });
    }

    if (maxPrice) {
      whereClause.AND.push({
        retailPrice: { lte: parseFloat(maxPrice) }
      });
    }

    // Remove AND clause if empty
    if (whereClause.AND.length === 0) {
      delete whereClause.AND;
    }

    // Get total count for pagination
    const totalCount = await prisma.product.count({ where: whereClause });

    // Build orderBy clause
    const orderByClause: any = {};
    if (sortBy === 'name') {
      orderByClause.name = sortOrder;
    } else if (sortBy === 'price' || sortBy === 'retailPrice') {
      orderByClause.retailPrice = sortOrder;
    } else if (sortBy === 'rating') {
      orderByClause.rating = sortOrder;
    } else {
      orderByClause.createdAt = sortOrder;
    }

    // Fetch products with pagination
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
      },
      orderBy: orderByClause,
      skip: (page - 1) * limit,
      take: limit
    });

    // Transform products to match frontend format
    const transformedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      imageUrl: product.imageUrl,
      imageUrls: product.imageUrls,
      price: product.retailPrice, // Map retailPrice to price for compatibility
      retailPrice: product.retailPrice,
      wholesalePrice: product.baseWholesalePrice,
      minOrderQuantity: product.retailMOQ,
      wholesaleMOQ: product.wholesaleMOQ,
      brand: product.brand,
      category: product.category?.name || 'Uncategorized',
      categoryId: product.categoryId,
      tags: product.tags,
      rating: product.rating,
      reviewCount: product.reviewCount,
      stockQuantity: product.stockQuantity,
      availability: product.availability,
      isFeatured: product.isFeatured,
      companyName: product.seller?.companyName || product.seller?.name || 'SkyzoneBD',
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: transformedProducts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      query: query || null
    });

  } catch (error) {
    console.error('Search Products Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search products',
        data: []
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
