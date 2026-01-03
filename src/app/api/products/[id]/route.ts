import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    
    // Check if request is from admin (for edit pages)
    const authHeader = request.headers.get('authorization');
    const isAuthenticated = authHeader?.startsWith('Bearer ');
    
    // Find product by ID or slug
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: productId },
          { slug: productId }
        ],
        // Only filter by isActive for public access (non-authenticated)
        ...(isAuthenticated ? {} : { isActive: true })
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
      id: product.id, // Keep as string (cuid)
      name: product.name,
      slug: product.slug,
      price: product.wholesalePrice,
      wholesalePrice: product.wholesalePrice,
      basePrice: product.basePrice,
      moq: product.moq,
      imageUrl: product.imageUrl,
      imageUrls: product.imageUrls,
      thumbnailUrl: product.thumbnailUrl,
      description: product.description,
      category: product.category.name,
      categoryId: product.categoryId, // Include categoryId for edit pages
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
      stock: product.stockQuantity,
      availability: product.availability,
      sku: product.sku,
      rating: product.rating,
      reviewCount: product.reviewCount,
      reviews: product.reviewCount,
      isFeatured: product.isFeatured,
      isActive: product.isActive, // Include for edit pages
      metaTitle: product.metaTitle,
      metaDescription: product.metaDescription,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };

    const transformedRelated = relatedProducts.map(p => ({
      id: p.id, // Keep as string (cuid)
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
      const slugConflict = await prisma.product.findFirst({
        where: { 
          slug: body.slug,
          NOT: { id: productId }
        }
      });

      if (slugConflict) {
        return NextResponse.json(
          { error: 'Product with this slug already exists' },
          { status: 409 }
        );
      }
    }
    // Check for SKU conflict (if SKU is being changed)
    if (body.sku && body.sku !== existing.sku) {
      const skuConflict = await prisma.product.findFirst({
        where: { 
          sku: body.sku,
          NOT: { id: productId }
        }
      });

      if (skuConflict) {
        return NextResponse.json(
          { error: 'Product with this SKU already exists' },
          { status: 409 }
        );
      }
    }
    
    // Build update data object
    const updateData: any = {};
    
    if (body.name) updateData.name = body.name;
    if (body.slug && body.slug !== existing.slug) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.imageUrl) updateData.imageUrl = body.imageUrl;
    if (body.imageUrls) updateData.imageUrls = body.imageUrls;
    if (body.thumbnailUrl !== undefined) updateData.thumbnailUrl = body.thumbnailUrl;
    if (body.brand !== undefined) updateData.brand = body.brand;
    if (body.unit !== undefined) updateData.unit = body.unit;
    if (body.tags) updateData.tags = body.tags;
    if (body.specifications !== undefined) updateData.specifications = body.specifications;
    if (body.basePrice !== undefined) updateData.basePrice = body.basePrice || body.price;
    if (body.wholesalePrice !== undefined) updateData.wholesalePrice = body.wholesalePrice || body.price;
    if (body.moq !== undefined) updateData.moq = body.moq || body.minOrderQuantity;
    if (body.stockQuantity !== undefined) updateData.stockQuantity = body.stockQuantity;
    if (body.availability) updateData.availability = body.availability;
    // Don't update SKU to avoid unique constraint issues - SKU should not be changed after creation
    if (body.categoryId) updateData.categoryId = body.categoryId;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.reviewCount !== undefined) updateData.reviewCount = body.reviewCount;
    if (body.metaTitle !== undefined) updateData.metaTitle = body.metaTitle;
    if (body.metaDescription !== undefined) updateData.metaDescription = body.metaDescription;
    
    // Update product
    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
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

    // Track what changed
    const changes: string[] = [];
    if (body.name && body.name !== existing.name) changes.push('name');
    if (body.retailPrice !== undefined && body.retailPrice !== existing.retailPrice) changes.push('price');
    if (body.stockQuantity !== undefined && body.stockQuantity !== existing.stockQuantity) changes.push('stock');
    if (body.isActive !== undefined && body.isActive !== existing.isActive) changes.push('status');

    // Log activity
    await logActivity({
      userId: auth.userId!,
      userName: admin?.name || 'Admin',
      action: 'UPDATE',
      entityType: 'Product',
      entityId: product.id,
      entityName: product.name,
      description: `Updated product "${product.name}"${changes.length > 0 ? `: ${changes.join(', ')}` : ''}`,
      metadata: {
        productId: product.id,
        sku: product.sku,
        changes: changes,
        oldValues: {
          name: existing.name,
          price: existing.retailPrice,
          stock: existing.stockQuantity,
          isActive: existing.isActive
        },
        newValues: {
          name: product.name,
          price: product.retailPrice,
          stock: product.stockQuantity,
          isActive: product.isActive
        }
      },
      request
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
      where: { id: productId },
      select: { id: true, name: true, sku: true }
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

    // Get admin user info for logging
    const admin = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { name: true }
    });

    // Log activity
    await logActivity({
      userId: auth.userId!,
      userName: admin?.name || 'Admin',
      action: 'DELETE',
      entityType: 'Product',
      entityId: existing.id,
      entityName: existing.name,
      description: `Deleted product "${existing.name}" (SKU: ${existing.sku || 'N/A'})`,
      metadata: {
        productId: existing.id,
        sku: existing.sku
      },
      request
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