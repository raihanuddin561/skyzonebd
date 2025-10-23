import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

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

    if (decoded.role !== 'ADMIN') {
      return { authorized: false, error: 'Admin access required' };
    }

    return { authorized: true, userId: decoded.userId };
  } catch {
    return { authorized: false, error: 'Invalid token' };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    
    // Find product by ID or slug
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: productId },
          { slug: productId },
          // Try parsing as integer for legacy support
          ...(isNaN(parseInt(productId)) ? [] : [{ id: productId }])
        ],
        isActive: true
      },
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
    });
    
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get related products from same category
    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      take: 4,
      orderBy: {
        rating: 'desc'
      }
    });

    // Transform product to match frontend interface
    const transformedProduct = {
      id: parseInt(product.id) || 0,
      name: product.name,
      slug: product.slug,
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
      stock: product.stockQuantity,
      availability: product.availability,
      sku: product.sku,
      rating: product.rating,
      reviewCount: product.reviewCount,
      reviews: product.reviewCount,
      isFeatured: product.isFeatured,
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    const transformedRelated = relatedProducts.map(p => ({
      id: parseInt(p.id) || 0,
      name: p.name,
      slug: p.slug,
      price: p.retailPrice,
      imageUrl: p.imageUrl,
      category: p.category.name,
      categorySlug: p.category.slug,
      rating: p.rating,
      reviewCount: p.reviewCount,
      minOrderQuantity: p.minOrderQuantity,
      availability: p.availability,
    }));

    return NextResponse.json({
      success: true,
      data: {
        product: transformedProduct,
        relatedProducts: transformedRelated
      }
    });
  } catch (error) {
    console.error('Product Detail API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update product (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id: productId } = await params;
    const body = await request.json();

    // Check if product exists
    const existing = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // If slug is being updated, check for conflicts
    if (body.slug && body.slug !== existing.slug) {
      const slugConflict = await prisma.product.findUnique({
        where: { slug: body.slug }
      });

      if (slugConflict) {
        return NextResponse.json(
          { error: 'Product with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Update product
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.slug && { slug: body.slug }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.imageUrl && { imageUrl: body.imageUrl }),
        ...(body.imageUrls && { imageUrls: body.imageUrls }),
        ...(body.thumbnailUrl !== undefined && { thumbnailUrl: body.thumbnailUrl }),
        ...(body.brand !== undefined && { brand: body.brand }),
        ...(body.tags && { tags: body.tags }),
        ...(body.specifications !== undefined && { specifications: body.specifications }),
        ...(body.retailPrice !== undefined && { retailPrice: body.retailPrice }),
        ...(body.salePrice !== undefined && { salePrice: body.salePrice }),
        ...(body.retailMOQ !== undefined && { retailMOQ: body.retailMOQ }),
        ...(body.comparePrice !== undefined && { comparePrice: body.comparePrice }),
        ...(body.wholesaleEnabled !== undefined && { wholesaleEnabled: body.wholesaleEnabled }),
        ...(body.wholesaleMOQ !== undefined && { wholesaleMOQ: body.wholesaleMOQ }),
        ...(body.baseWholesalePrice !== undefined && { baseWholesalePrice: body.baseWholesalePrice }),
        ...(body.price !== undefined && { price: body.price }),
        ...(body.wholesalePrice !== undefined && { wholesalePrice: body.wholesalePrice }),
        ...(body.minOrderQuantity !== undefined && { minOrderQuantity: body.minOrderQuantity }),
        ...(body.stockQuantity !== undefined && { stockQuantity: body.stockQuantity }),
        ...(body.availability && { availability: body.availability }),
        ...(body.sku !== undefined && { sku: body.sku }),
        ...(body.categoryId && { categoryId: body.categoryId }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
        ...(body.rating !== undefined && { rating: body.rating }),
        ...(body.reviewCount !== undefined && { reviewCount: body.reviewCount }),
        ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle }),
        ...(body.metaDescription !== undefined && { metaDescription: body.metaDescription }),
      },
      include: {
        category: true,
        wholesaleTiers: true,
      }
    });

    return NextResponse.json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });

  } catch (error) {
    console.error('Update Product Error:', error);
    return NextResponse.json(
      { error: 'Failed to update product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete product (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id: productId } = await params;

    // Check if product exists
    const existing = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Delete product
    await prisma.product.delete({
      where: { id: productId }
    });

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete Product Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}