import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
