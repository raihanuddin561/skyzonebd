import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAdminToken, type AdminAuthResult } from '@/lib/auth';

// Use shared auth helper
const verifyAdmin = verifyAdminToken;

// GET - Get single category
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: categoryId } = await params;
    
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error('Get Category Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update category (Admin only)
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

    const { id: categoryId } = await params;
    const body = await request.json();

    // Check if category exists
    const existing = await prisma.category.findUnique({
      where: { id: categoryId }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // If slug is being updated, check for conflicts
    if (body.slug && body.slug !== existing.slug) {
      const slugConflict = await prisma.category.findUnique({
        where: { slug: body.slug }
      });

      if (slugConflict) {
        return NextResponse.json(
          { error: 'Category with this slug already exists' },
          { status: 409 }
        );
      }
    }

    // Update category
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.slug && { slug: body.slug }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { products: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category updated successfully'
    });

  } catch (error) {
    console.error('Update Category Error:', error);
    return NextResponse.json(
      { error: 'Failed to update category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete category (Admin only)
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

    const { id: categoryId } = await params;

    // Check if category exists and has products
    const existing = await prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true,
        _count: {
          select: { products: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    if (existing._count.products > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${existing._count.products} product(s)` },
        { status: 400 }
      );
    }

    // Delete category
    await prisma.category.delete({
      where: { id: categoryId }
    });

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Delete Category Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
