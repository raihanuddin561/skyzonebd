import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { createCategorySchema } from '@/lib/validation';
import { handleError } from '@/lib/error-handler';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function GET(request: NextRequest) {
  try {
    // Get all active categories with product counts
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        _count: {
          select: { products: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Transform to match frontend expectations
    const transformedCategories = categories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      count: category._count.products,
      icon: getCategoryIcon(category.name) // Add default icons
    }));

    return NextResponse.json({
      success: true,
      data: transformedCategories
    });
  } catch (error) {
    console.error('Categories API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// Helper function to assign icons based on category name
function getCategoryIcon(categoryName: string): string {
  const iconMap: Record<string, string> = {
    'Electronics': '💻',
    'Baby Items': '👶',
    'Clothing': '👕',
    'Home & Garden': '🏠',
    'Sports': '⚽',
    'Toys': '🧸',
    'Books': '📚',
    'Food': '🍔',
    'Beauty': '💄',
    'Automotive': '🚗',
  };

  // Find matching icon or return default
  for (const [key, icon] of Object.entries(iconMap)) {
    if (categoryName.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  
  return '📦'; // Default icon
}

// POST - Create new category (Admin only)
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin(request);

    const body = await request.json();
    const data = createCategorySchema.parse(body);

    // Check if slug already exists
    const existing = await prisma.category.findUnique({
      where: { slug: data.slug }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 409 }
      );
    }

    // Create category
    const category = await prisma.category.create({
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { products: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category created successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    // handleError formats Zod validation errors (400, field-level messages)
    // and Prisma known-request errors (e.g. the P2002 unique-constraint
    // violation on Category.name — previously an unhandled 500, since only
    // slug uniqueness was checked explicitly above) consistently.
    return handleError(error, 'Create Category Error');
  }
}

// DELETE - Delete multiple categories (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids')?.split(',') || [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'No category IDs provided' },
        { status: 400 }
      );
    }

    // Check if any category has products
    const categoriesWithProducts = await prisma.category.findMany({
      where: {
        id: { in: ids }
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: { products: true }
        }
      }
    });

    const withProducts = categoriesWithProducts.filter(cat => cat._count.products > 0);
    
    if (withProducts.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete categories with products',
          categories: withProducts.map(c => ({ id: c.id, name: c.name, productCount: c._count.products }))
        },
        { status: 400 }
      );
    }

    // Delete categories
    const result = await prisma.category.deleteMany({
      where: {
        id: { in: ids }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} category(ies)`,
      count: result.count
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return handleError(error, 'Delete Categories Error');
  }
}
