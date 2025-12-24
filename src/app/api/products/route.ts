import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { logActivity } from '@/lib/activityLogger';

const prisma = new PrismaClient();

// Helper to verify JWT and check admin role
function verifyAdmin(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'No authorization token' };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string; role: string };

    // Case-insensitive role check (login returns lowercase, but DB stores uppercase)
    if (decoded.role.toUpperCase() !== 'ADMIN') {
      return { authorized: false, error: 'Admin access required' };
    }

    return { authorized: true, userId: decoded.userId };
  } catch {
    return { authorized: false, error: 'Invalid token' };
  }
}

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
      specifications: product.specifications as Record<string, string | number | boolean>,
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

// POST - Create new product (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'slug', 'categoryId', 'imageUrl', 'price', 'retailPrice'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check if slug already exists
    const existing = await prisma.product.findUnique({
      where: { slug: body.slug }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Product with this slug already exists' },
        { status: 409 }
      );
    }

    // Create product
    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        imageUrl: body.imageUrl,
        imageUrls: body.imageUrls || [body.imageUrl],
        thumbnailUrl: body.thumbnailUrl,
        brand: body.brand,
        tags: body.tags || [],
        specifications: body.specifications || {},
        retailPrice: body.retailPrice,
        salePrice: body.salePrice,
        retailMOQ: body.retailMOQ || 1,
        comparePrice: body.comparePrice,
        wholesaleEnabled: body.wholesaleEnabled || false,
        wholesaleMOQ: body.wholesaleMOQ || 5,
        baseWholesalePrice: body.baseWholesalePrice,
        price: body.price,
        wholesalePrice: body.wholesalePrice,
        minOrderQuantity: body.minOrderQuantity || 1,
        stockQuantity: body.stockQuantity || 0,
        availability: body.availability || 'in_stock',
        sku: body.sku,
        categoryId: body.categoryId,
        isActive: body.isActive !== undefined ? body.isActive : true,
        isFeatured: body.isFeatured || false,
        rating: body.rating,
        reviewCount: body.reviewCount || 0,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        // Create wholesale tiers if provided
        ...(body.wholesaleTiers && body.wholesaleTiers.length > 0 && {
          wholesaleTiers: {
            create: body.wholesaleTiers
              .filter((tier: any) => tier.minQuantity && tier.price) // Only valid tiers
              .map((tier: any) => ({
                minQuantity: parseInt(tier.minQuantity),
                maxQuantity: tier.maxQuantity ? parseInt(tier.maxQuantity) : null,
                price: parseFloat(tier.price),
                discount: tier.discount ? parseFloat(tier.discount) : 0,
              }))
          }
        })
      },
      include: {
        category: true,
        wholesaleTiers: true,
      }
    });

    // Get admin user info for logging
    const admin = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true }
    });

    // Log activity
    await logActivity({
      userId: auth.userId!,
      userName: admin?.name || 'Admin',
      action: 'CREATE',
      entityType: 'Product',
      entityId: product.id,
      entityName: product.name,
      description: `Created product "${product.name}" (SKU: ${product.sku || 'N/A'})`,
      metadata: {
        productId: product.id,
        sku: product.sku,
        price: product.retailPrice,
        category: product.category.name
      },
      request
    });

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Create Product Error:', error);
    return NextResponse.json(
      { error: 'Failed to create product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete multiple products (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',') || [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'No product IDs provided' },
        { status: 400 }
      );
    }

    // Get product details before deletion for logging
    const productsToDelete = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, sku: true }
    });

    // Delete products
    const result = await prisma.product.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    // Get admin user info for logging
    const admin = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true }
    });

    // Log activity for each deleted product
    for (const product of productsToDelete) {
      await logActivity({
        userId: auth.userId!,
        userName: admin?.name || 'Admin',
        action: 'DELETE',
        entityType: 'Product',
        entityId: product.id,
        entityName: product.name,
        description: `Deleted product "${product.name}" (SKU: ${product.sku || 'N/A'})`,
        metadata: {
          productId: product.id,
          sku: product.sku
        },
        request
      });
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} product(s)`,
      count: result.count
    });

  } catch (error) {
    console.error('Delete Products Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete products', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}