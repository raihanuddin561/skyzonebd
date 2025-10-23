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
  } finally {
    await prisma.$disconnect();
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
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await prisma.category.findUnique({
      where: { slug: body.slug }
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Category with this slug already exists' },
        { status: 409 }
      );
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        imageUrl: body.imageUrl,
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
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
    console.error('Create Category Error:', error);
    return NextResponse.json(
      { error: 'Failed to create category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete multiple categories (Admin only)
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
    console.error('Delete Categories Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
