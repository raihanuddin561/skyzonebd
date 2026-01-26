import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Health Check Endpoint
 * 
 * Tests:
 * - API routes are responding
 * - Database connectivity
 * - Environment configuration
 * - Product data availability
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {
      api: { status: 'ok', message: 'API is responding' },
      database: { status: 'unknown', message: '' },
      products: { status: 'unknown', message: '', count: 0 },
      config: { status: 'unknown', message: '' }
    },
    responseTime: 0
  };

  // Check 1: Database connectivity
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = { 
      status: 'ok', 
      message: 'Database connected successfully' 
    };
  } catch (error) {
    health.status = 'error';
    health.checks.database = { 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Database connection failed' 
    };
  }

  // Check 2: Products availability
  if (health.checks.database.status === 'ok') {
    try {
      const productCount = await prisma.product.count();
      health.checks.products = {
        status: productCount > 0 ? 'ok' : 'warning',
        message: productCount > 0 
          ? `${productCount} products available` 
          : 'No products found in database',
        count: productCount
      };
    } catch (error) {
      health.checks.products = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to query products',
        count: 0
      };
    }
  }

  // Check 3: Required environment variables
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length === 0) {
    health.checks.config = {
      status: 'ok',
      message: 'All required environment variables are set'
    };
  } else {
    health.status = 'error';
    health.checks.config = {
      status: 'error',
      message: `Missing environment variables: ${missingVars.join(', ')}`
    };
  }

  // Calculate response time
  health.responseTime = Date.now() - startTime;

  // Disconnect Prisma
  await prisma.$disconnect();

  // Return appropriate status code
  const statusCode = health.status === 'ok' ? 200 : 500;

  return NextResponse.json(health, { status: statusCode });
}
