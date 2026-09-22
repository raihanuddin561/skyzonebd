import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, isSuperAdmin } from '@/types/roles';
import { timingSafeEqual } from 'crypto';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


// Fails closed if SEED_SECRET is unset — matches the fail-closed doctrine
// established for JWT_SECRET/MIGRATION_SECRET_KEY elsewhere, and uses a
// constant-time comparison (like migrate/route.ts's isAuthorizedMigrationRequest)
// so the check isn't vulnerable to a timing side-channel.
function isAuthorizedSeedStatusRequest(authHeader: string | null): boolean {
  const seedSecret = process.env.SEED_SECRET;
  if (!seedSecret) {
    return false;
  }
  if (!authHeader) return false;
  const expected = Buffer.from(`Bearer ${seedSecret}`);
  const actual = Buffer.from(authHeader);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(request: NextRequest) {
  try {
    // Only allow with no auth in a genuine local dev environment. This
    // used to check `=== 'production'` — fail-OPEN for anything that isn't
    // literally that exact string (an unset NODE_ENV, a staging/preview
    // value, a misconfigured deployment), meaning a common deployment
    // mistake would leave this destructive endpoint (wipes every Product
    // and Category, then reseeds with hardcoded sample data) reachable by
    // anyone with the URL, no auth at all. Checking against the permissive
    // case instead — fail-CLOSED by default — matches the doctrine already
    // established for JWT_SECRET/MIGRATION_SECRET_KEY elsewhere.
    if (process.env.NODE_ENV !== 'development') {
      // Canonical auth (DB-verified role/isActive, not a raw JWT claim),
      // then a manual SUPER_ADMIN check — there is no requireSuperAdmin
      // helper; every SUPER_ADMIN route hand-rolls this exact check.
      const authUser = await requireAuth(request);

      if (!isSuperAdmin(authUser.role as UserRole)) {
        return NextResponse.json({
          error: 'Forbidden: SUPER_ADMIN access required'
        }, { status: 403 });
      }
    }

    // Check if data already exists
    const existingProducts = await prisma.product.count();
    if (existingProducts > 0) {
      // Delete existing data
      await prisma.product.deleteMany();
      await prisma.category.deleteMany();
      // Note: Not deleting users to preserve existing accounts
    }

    // Create categories
    const electronics = await prisma.category.create({
      data: {
        name: 'Electronics',
        slug: 'electronics',
        description: 'Electronic devices and accessories',
        imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
      },
    });

    const babyItems = await prisma.category.create({
      data: {
        name: 'Baby Items',
        slug: 'baby-items',
        description: 'Products for babies and toddlers',
        imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400',
      },
    });

    const fashion = await prisma.category.create({
      data: {
        name: 'Fashion',
        slug: 'fashion',
        description: 'Clothing and accessories',
        imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
      },
    });

    // Create sample products
    
    await prisma.product.createMany({
      data: [
        // Electronics
        {
          name: 'Wireless Bluetooth Headphones',
          slug: 'wireless-bluetooth-headphones',
          description: 'High-quality wireless headphones with noise cancellation, 30-hour battery life, and premium sound quality.',
          imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
          imageUrls: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
          basePrice: 55.99,
          wholesalePrice: 79.99,
          moq: 1,
          sku: 'WBH-001',
          stockQuantity: 50,
          categoryId: electronics.id,
          isActive: true,
          isFeatured: true,
        },
        {
          name: 'Smart Watch Pro',
          slug: 'smart-watch-pro',
          description: 'Advanced fitness tracking, heart rate monitoring, GPS, and 7-day battery life.',
          imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
          imageUrls: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'],
          basePrice: 209.99,
          wholesalePrice: 299.99,
          moq: 1,
          sku: 'SWP-001',
          stockQuantity: 30,
          categoryId: electronics.id,
          isActive: true,
          isFeatured: true,
        },
        {
          name: 'Wireless Mouse',
          slug: 'wireless-mouse',
          description: 'Ergonomic wireless mouse with precision tracking and long battery life.',
          imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800',
          imageUrls: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800'],
          basePrice: 17.49,
          wholesalePrice: 24.99,
          moq: 1,
          sku: 'WM-001',
          stockQuantity: 100,
          categoryId: electronics.id,
          isActive: true,
        },
        
        // Baby Items
        {
          name: 'Baby Stroller Premium',
          slug: 'baby-stroller-premium',
          description: 'Lightweight, foldable stroller with adjustable seat and large storage basket.',
          imageUrl: 'https://images.unsplash.com/photo-1544033527-f9c6d13f9d05?w=800',
          imageUrls: ['https://images.unsplash.com/photo-1544033527-f9c6d13f9d05?w=800'],
          basePrice: 174.99,
          wholesalePrice: 249.99,
          moq: 1,
          sku: 'BSP-001',
          stockQuantity: 20,
          categoryId: babyItems.id,
          isActive: true,
          isFeatured: true,
        },
        {
          name: 'Baby Carrier Ergonomic',
          slug: 'baby-carrier-ergonomic',
          description: 'Comfortable baby carrier with multiple carrying positions and breathable fabric.',
          imageUrl: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800',
          imageUrls: ['https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800'],
          basePrice: 62.99,
          wholesalePrice: 89.99,
          moq: 1,
          sku: 'BCE-001',
          stockQuantity: 45,
          categoryId: babyItems.id,
          isActive: true,
        },
        {
          name: 'Baby Toys Set',
          slug: 'baby-toys-set',
          description: 'Safe, colorful toys for babies 6-18 months. BPA-free and non-toxic.',
          imageUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800',
          imageUrls: ['https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=800'],
          basePrice: 24.49,
          wholesalePrice: 34.99,
          moq: 1,
          sku: 'BTS-001',
          stockQuantity: 75,
          categoryId: babyItems.id,
          isActive: true,
        },
        
        // Fashion
        {
          name: 'Premium Cotton T-Shirt',
          slug: 'premium-cotton-tshirt',
          description: 'Soft, breathable cotton t-shirt. Available in multiple colors and sizes.',
          imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
          imageUrls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
          basePrice: 13.99,
          wholesalePrice: 19.99,
          moq: 1,
          sku: 'PCT-001',
          stockQuantity: 200,
          categoryId: fashion.id,
          isActive: true,
        },
        {
          name: 'Denim Jeans Classic',
          slug: 'denim-jeans-classic',
          description: 'Classic fit denim jeans with stretch comfort. Durable and stylish.',
          imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
          imageUrls: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=800'],
          basePrice: 41.99,
          wholesalePrice: 59.99,
          moq: 1,
          sku: 'DJC-001',
          stockQuantity: 80,
          categoryId: fashion.id,
          isActive: true,
          isFeatured: true,
        },
      ],
    });

    // Get counts
    const categoryCount = await prisma.category.count();
    const productCount = await prisma.product.count();

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        categories: categoryCount,
        products: productCount,
      },
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('❌ Seed error:', error);
    return NextResponse.json(
      {
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET method to check seed status (also requires auth)
export async function GET(request: Request) {
  try {
    // Require authentication for status check too
    const authHeader = request.headers.get('authorization');

    if (!isAuthorizedSeedStatusRequest(authHeader)) {
      return NextResponse.json({
        error: 'Unauthorized: This endpoint requires SEED_SECRET'
      }, { status: 401 });
    }

    const productCount = await prisma.product.count();
    const categoryCount = await prisma.category.count();

    return NextResponse.json({
      seeded: productCount > 0,
      data: {
        products: productCount,
        categories: categoryCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check seed status' },
      { status: 500 }
    );
  }
}
