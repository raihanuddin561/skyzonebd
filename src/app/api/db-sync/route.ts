import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Security: Check for authorization header
    const authHeader = request.headers.get('authorization');
    const secretKey = process.env.MIGRATION_SECRET_KEY || 'your-secret-key-here';
    
    if (authHeader !== `Bearer ${secretKey}`) {
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
    const secretKey = process.env.MIGRATION_SECRET_KEY || 'your-secret-key-here';
    
    if (authHeader !== `Bearer ${secretKey}`) {
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
