import { NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/activityLogger';
import { prisma } from '@/lib/prisma';
import { validateWholesalePricing, formatValidationErrors } from '@/utils/wholesaleValidation';
import { requireAdmin, verifyToken } from '@/lib/auth';
import { UserRole, isAdmin as isAdminRole } from '@/types/roles';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    // Check if request is from an admin (for edit pages, which need to see
    // inactive products). Previously this only checked whether the header
    // *started with* "Bearer " — never verifying the token at all, so any
    // string prefixed "Bearer " (valid or not) was treated as admin access
    // and bypassed the isActive filter entirely. Now verifies the token and
    // checks the actual role (docs/architecture-review/14_Technical_Debt.md §22).
    const authHeader = request.headers.get('authorization');
    let isAdminRequest = false;
    if (authHeader?.startsWith('Bearer ')) {
      const decoded = verifyToken(authHeader.substring(7));
      if (decoded) {
        isAdminRequest = isAdminRole(decoded.role as UserRole);
      }
    }

    // Find product by ID or slug
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: productId },
          { slug: productId }
        ],
        // Only filter by isActive for non-admin access
        ...(isAdminRequest ? {} : { isActive: true })
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
      minOrderQuantity: product.moq,
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
      price: p.wholesalePrice,
      imageUrl: p.imageUrl,
      category: p.category.name,
      categorySlug: p.category.slug,
      rating: p.rating,
      reviewCount: p.reviewCount,
      moq: p.moq,
      minOrderQuantity: p.moq,
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
    const auth = await requireAdmin(request);

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

    // Validate wholesale pricing rules if pricing fields are being updated
    const hasePricingUpdate =
      body.basePrice !== undefined ||
      body.wholesalePrice !== undefined ||
      body.moq !== undefined ||
      body.minOrderQuantity !== undefined ||
      body.wholesaleTiers !== undefined;

    if (hasePricingUpdate) {
      const newMoq = body.moq !== undefined ? body.moq : body.minOrderQuantity;
      const validationResult = validateWholesalePricing({
        basePrice: body.basePrice !== undefined ? body.basePrice : existing.basePrice,
        wholesalePrice: body.wholesalePrice !== undefined ? body.wholesalePrice : existing.wholesalePrice,
        moq: newMoq !== undefined ? newMoq : existing.moq,
        wholesaleTiers: body.wholesaleTiers || []
      });

      if (!validationResult.isValid) {
        return NextResponse.json(
          formatValidationErrors(validationResult),
          { status: 400 }
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
    // The admin edit form (src/app/admin/products/[id]/edit/page.tsx) sends
    // `minOrderQuantity`, not `moq` — checking only `body.moq !== undefined`
    // meant every MOQ edit from that form was silently dropped.
    if (body.moq !== undefined || body.minOrderQuantity !== undefined) {
      updateData.moq = body.moq !== undefined ? body.moq : body.minOrderQuantity;
    }
    if (body.stockQuantity !== undefined) updateData.stockQuantity = body.stockQuantity;
    if (body.availability) updateData.availability = body.availability;
    // Don't update SKU to avoid unique constraint issues - SKU should not be changed after creation
    if (body.categoryId) updateData.categoryId = body.categoryId;
    if (body.isActive !== undefined) {
      updateData.isActive = Boolean(body.isActive);
    }
    if (body.isFeatured !== undefined) updateData.isFeatured = body.isFeatured;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.reviewCount !== undefined) updateData.reviewCount = body.reviewCount;
    if (body.metaTitle !== undefined) updateData.metaTitle = body.metaTitle;
    if (body.metaDescription !== undefined) updateData.metaDescription = body.metaDescription;
    
    // Update product. Wholesale tiers have no incremental-update story on the
    // client (the edit form always submits its full current tier list), so a
    // full delete-and-recreate inside the same transaction as the product
    // update is the simplest correct way to persist them — this endpoint
    // previously accepted `wholesaleTiers` for validation only and silently
    // discarded them, so editing a product's tiers never actually took effect.
    const product = await prisma.$transaction(async (tx) => {
      if (Array.isArray(body.wholesaleTiers)) {
        await tx.wholesaleTier.deleteMany({ where: { productId } });

        const validTiers = body.wholesaleTiers.filter((tier: any) => tier.minQuantity && tier.price);
        if (validTiers.length > 0) {
          await tx.wholesaleTier.createMany({
            data: validTiers.map((tier: any) => ({
              productId,
              minQuantity: parseInt(tier.minQuantity),
              maxQuantity: tier.maxQuantity ? parseInt(tier.maxQuantity) : null,
              price: parseFloat(tier.price),
              discount: tier.discount ? parseFloat(tier.discount) : 0,
            })),
          });
        }
      }

      return tx.product.update({
        where: { id: productId },
        data: updateData,
        include: {
          category: true,
          wholesaleTiers: true,
        }
      });
    });

    // Get admin user info for logging
    const admin = await prisma.user.findUnique({
      where: { id: auth.id },
      select: { name: true }
    });

    // Track what changed
    const changes: string[] = [];
    if (body.name && body.name !== existing.name) changes.push('name');
    if (body.wholesalePrice !== undefined && body.wholesalePrice !== existing.wholesalePrice) changes.push('price');
    if (body.stockQuantity !== undefined && body.stockQuantity !== existing.stockQuantity) changes.push('stock');
    if (body.isActive !== undefined && body.isActive !== existing.isActive) changes.push('status');

    // Log activity
    await logActivity({
      userId: auth.id,
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
          price: existing.wholesalePrice,
          stock: existing.stockQuantity,
          isActive: existing.isActive
        },
        newValues: {
          name: product.name,
          price: product.wholesalePrice,
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
    if (error instanceof Response) {
      return error;
    }
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
    const auth = await requireAdmin(request);

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

    // Check if product has any order items (cannot delete if used in orders)
    const orderItemCount = await prisma.orderItem.count({
      where: { productId }
    });

    if (orderItemCount > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete product',
          message: `This product cannot be deleted because it has been used in ${orderItemCount} order(s). Products with order history must be kept for record-keeping purposes.`,
          suggestion: 'You can deactivate the product instead by setting it to inactive.'
        },
        { status: 400 }
      );
    }

    // Delete product
    await prisma.product.delete({
      where: { id: productId }
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
    if (error instanceof Response) {
      return error;
    }
    console.error('Delete Product Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}