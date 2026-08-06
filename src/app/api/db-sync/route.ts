import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { timingSafeEqual } from 'crypto';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// Fails closed if MIGRATION_SECRET_KEY is unset — see src/app/api/migrate/route.ts
// for the full rationale (same fix, same shared secret, same fail-closed doctrine
// as lib/auth.ts's getJwtSecret()). This endpoint discloses table names, column
// counts, and record counts (users/products/categories/orders), so the same
// hardcoded-fallback risk applies here even though it doesn't run migrations.
function isAuthorizedMigrationRequest(authHeader: string | null): boolean {
  const secretKey = process.env.MIGRATION_SECRET_KEY;
  if (!secretKey) {
    console.error('FATAL: MIGRATION_SECRET_KEY is not set. Rejecting all requests to this endpoint until it is configured.');
    return false;
  }
  if (!authHeader) return false;
  const expected = Buffer.from(`Bearer ${secretKey}`);
  const actual = Buffer.from(authHeader);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(request: NextRequest) {
  try {
    // Security: Check for authorization header
    const authHeader = request.headers.get('authorization');

    if (!isAuthorizedMigrationRequest(authHeader)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Test database connection first
    await prisma.$connect();

    // Use Prisma's introspection to check current state
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    return NextResponse.json({
      success: true,
      message: 'Database connection successful. Use `prisma db push` locally or via Vercel CLI.',
      instructions: {
        local: 'Run: npm run db:push',
        vercel: 'Run: vercel env pull && npx prisma db push',
        note: 'db push syncs schema without migrations, preserving existing data'
      },
      currentTables: tables,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Database operation failed',
        details: error.message,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET endpoint to check database status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!isAuthorizedMigrationRequest(authHeader)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check database connection and tables
    await prisma.$connect();
    
    const tables = await prisma.$queryRaw`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    // Check record counts
    const counts: any = {};
    try {
      counts.users = await prisma.user.count();
      counts.products = await prisma.product.count();
      counts.categories = await prisma.category.count();
      counts.orders = await prisma.order.count();
    } catch (e) {
      // Could not count all tables (some may not exist yet)
    }

    await prisma.$disconnect();

    return NextResponse.json({
      success: true,
      status: 'connected',
      tables,
      recordCounts: counts,
      message: 'Database is accessible and has data',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check database status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
