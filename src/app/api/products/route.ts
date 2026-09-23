import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { logActivity } from '@/lib/activityLogger';
import { prisma } from '@/lib/prisma';
import { validateWholesalePricing, formatValidationErrors } from '@/utils/wholesaleValidation';
import { requireAdmin, authenticateUser } from '@/lib/auth';
import { UserRole, isAdmin as isAdminRole } from '@/types/roles';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Trimmed/normalized so accidental leading/trailing whitespace from a
    // client doesn't silently return zero results.
    const search = searchParams.get('search')?.trim() || null;
    const categorySlug = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'newest';
    // Clamped the same way lib/paginationHelper.ts clamps every other paginated
    // route (page >= 1, 1 <= limit <= 100) — this route keeps its own inline
    // page/limit handling rather than adopting that helper outright because its
    // response shape (`totalPages`) is depended on by src/app/admin/products/page.tsx
    // and switching to the helper's `pages` key would be a breaking rename.
    // (`rawX || default` would be wrong here — it'd also catch a genuinely
    // parsed 0 or falsy-but-valid number, not just NaN from a bad string.)
    const rawPage = parseInt(searchParams.get('page') || '1');
    const page = Math.max(Number.isNaN(rawPage) ? 1 : rawPage, 1);
    const rawLimit = parseInt(searchParams.get('limit') || '12');
    const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 12 : rawLimit, 1), 100);
    const featured = searchParams.get('featured') === 'true';
    const includeInactive = searchParams.get('includeInactive') === 'true';
    // Comma-separated id list for batch lookup (e.g. the "Recently Viewed"
    // rail resolving a list of productIds from localStorage into full
    // Product objects) — bypasses search/category/price filters entirely.
    const ids = searchParams.get('ids')?.split(',').map(id => id.trim()).filter(Boolean);

    // Check if request is from admin (for showing inactive products).
    // Auth is optional here (guests browse this endpoint too), so this uses
    // authenticateUser (returns { success: false } rather than throwing) +
    // the canonical isAdmin() role-hierarchy check. This re-fetches
    // role/isActive from the database on every call rather than trusting a
    // JWT's embedded `role` claim directly — a demoted/deactivated admin's
    // still-valid token could otherwise keep seeing inactive products
    // indefinitely (same "stale token" bug class fixed elsewhere in this
    // codebase, e.g. orders/route.ts's GET handler via requireAuth()).
    let isAdmin = false;
    const authResult = await authenticateUser(request);
    if (authResult.success && authResult.user) {
      isAdmin = isAdminRole(authResult.user.role as UserRole);
    }

    // Build where clause
    const where: Prisma.ProductWhereInput = {};

    // Only filter by isActive if not admin or if not explicitly including inactive
    if (!isAdmin && !includeInactive) {
      where.isActive = true;
    }

    // Batch id lookup short-circuits every other filter — a caller asking
    // for specific products by id (e.g. resolving a "recently viewed" list)
    // wants exactly those products, not a filtered/paginated search.
    if (ids && ids.length > 0) {
      where.id = { in: ids };
    } else if (search) {
      // Search filter — also matches `sku`, a common real search term for
      // wholesale buyers that was previously only matched by the separate,
      // now-deprecated /api/search/products endpoint.
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
        { brand: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Category/price/featured filters don't apply to a batch id lookup —
    // that mode means "give me exactly these products."
    const isIdLookup = !!(ids && ids.length > 0);

    // Category filter
    if (!isIdLookup && categorySlug && categorySlug !== 'all') {
      where.category = {
        slug: categorySlug
      };
    }

    // Price range filter. parseFloat on a non-numeric string (e.g.
    // ?minPrice=abc) returns NaN, which Prisma rejects with an unhandled
    // validation error (surfaced as a generic 500) — only set the filter
    // when parsing actually produced a valid number.
    if (!isIdLookup && (minPrice || maxPrice)) {
      where.wholesalePrice = {};
      if (minPrice) {
        const parsedMin = parseFloat(minPrice);
        if (!Number.isNaN(parsedMin)) where.wholesalePrice.gte = parsedMin;
      }
      if (maxPrice) {
        const parsedMax = parseFloat(maxPrice);
        if (!Number.isNaN(parsedMax)) where.wholesalePrice.lte = parsedMax;
      }
    }

    // Featured filter
    if (!isIdLookup && featured) {
      where.isFeatured = true;
    }

    // Sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = {};
    switch (sortBy) {
      case 'name':
        orderBy = { name: 'asc' };
        break;
      case 'price-low':
        orderBy = { wholesalePrice: 'asc' };
        break;
      case 'price-high':
        orderBy = { wholesalePrice: 'desc' };
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
    // An id-lookup should return every matching product regardless of the
    // (possibly small, default-12) `limit` — the caller asked for a specific
    // set of ids, not a page of results.
    const take = isIdLookup ? Math.max(ids!.length, 1) : limit;

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
      skip: isIdLookup ? 0 : (page - 1) * limit,
      take,
    });

    // Get all categories for filter. The product count must match the same
    // isActive scoping the product list itself uses (where.isActive above) —
    // otherwise a category can show e.g. "7 products" while actually
    // returning zero results when clicked, because every one of its
    // products is inactive and this count never excluded them.
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { products: { where: where.isActive !== undefined ? { isActive: where.isActive } : {} } }
        }
      }
    });

    // Transform products to match frontend interface
    const transformedProducts = products.map(product => ({
      id: product.id, // Keep cuid string for database compatibility
      name: product.name,
      price: product.wholesalePrice,
      unit: product.unit,
      wholesalePrice: product.wholesalePrice,
      basePrice: product.basePrice,
      moq: product.moq,
      minOrderQuantity: product.moq,
      imageUrl: product.imageUrl,
      imageUrls: product.imageUrls,
      thumbnailUrl: product.thumbnailUrl,
      description: product.description,
      category: product.category.name,
      categorySlug: product.category.slug,
      brand: product.brand,
      tags: product.tags,
      specifications: product.specifications as Record<string, string | number | boolean>,
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
      isActive: product.isActive, // CRITICAL: Include isActive for admin panel
      createdAt: product.createdAt.toISOString(),
    }));

    // An id-lookup already returned every matching product in one shot
    // (see `take` above) — computing pagination from the request's
    // page/limit params here would produce a nonsensical hasNext:true /
    // totalPages:2 even though nothing was left out.
    const pagination = isIdLookup
      ? { page: 1, limit: total, total, totalPages: 1, hasNext: false, hasPrev: false }
      : {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        };

    const response = {
      success: true,
      data: {
        products: transformedProducts,
        pagination,
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
  }
}

// POST - Create new product (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const auth = await requireAdmin(request);

    const body = await request.json();

    // Validate required fields - Removed retailPrice requirement (wholesale only mode)
    // NOTE: 'price' is intentionally absent here — the frontend sends 'wholesalePrice'
    // and 'basePrice', never a field literally called 'price'. The downstream data
    // mapping (body.wholesalePrice || body.price) handles both forms.
    const requiredFields = ['name', 'slug', 'categoryId', 'imageUrl'];
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

    // Validate wholesale pricing rules
    const validationResult = validateWholesalePricing({
      basePrice: body.basePrice || body.price,
      wholesalePrice: body.wholesalePrice || body.price,
      moq: body.moq || body.minOrderQuantity,
      wholesaleTiers: body.wholesaleTiers || []
    });

    if (!validationResult.isValid) {
      return NextResponse.json(
        formatValidationErrors(validationResult),
        { status: 400 }
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
        unit: body.unit || null,
        tags: body.tags || [],
        specifications: body.specifications || {},
        basePrice: body.basePrice || body.price,
        wholesalePrice: body.wholesalePrice || body.price,
        moq: body.moq || body.minOrderQuantity || null,
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
      where: { id: auth.id },
      select: { name: true }
    });

    // Log activity
    await logActivity({
      userId: auth.id,
      userName: admin?.name || 'Admin',
      action: 'CREATE',
      entityType: 'Product',
      entityId: product.id,
      entityName: product.name,
      description: `Created product "${product.name}" (SKU: ${product.sku || 'N/A'})`,
      metadata: {
        productId: product.id,
        sku: product.sku,
        price: product.wholesalePrice,
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
    if (error instanceof Response) {
      return error;
    }
    console.error('Create Product Error:', error);
    return NextResponse.json(
      { error: 'Failed to create product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete multiple products (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    const auth = await requireAdmin(request);

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
      where: { id: auth.id },
      select: { name: true }
    });

    // Log activity for each deleted product
    for (const product of productsToDelete) {
      await logActivity({
        userId: auth.id,
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
    if (error instanceof Response) {
      return error;
    }
    console.error('Delete Products Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete products', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}