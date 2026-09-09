import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * One-time idempotent migration: backfill imageUrls for legacy products.
 *
 * Products created before the imageUrls gallery feature was added have
 * imageUrls = [] (empty array). This migration copies imageUrl into
 * imageUrls for those products. A platform_config record is written on
 * success so this migration can never run more than once.
 *
 * GET  /api/admin/migrate-image-urls  — check status (admin only)
 * POST /api/admin/migrate-image-urls  — run migration (admin only, one-time)
 */

const MIGRATION_KEY = 'migration_imageUrls_backfilled_v1';

// GET - Check whether migration has already been applied
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const record = await prisma.platformConfig.findUnique({
      where: { key: MIGRATION_KEY },
    });

    if (record) {
      return NextResponse.json({
        success: true,
        status: 'already_applied',
        message: 'Migration has already been applied.',
        appliedAt: record.updatedAt,
        details: JSON.parse(record.value || '{}'),
      });
    }

    // Count products that would be affected
    const affected = await prisma.product.count({
      where: {
        imageUrls: { equals: [] },
        imageUrl: { not: '' },
      },
    });

    return NextResponse.json({
      success: true,
      status: 'pending',
      message: `Migration not yet applied. ${affected} product(s) have empty imageUrls arrays that will be backfilled from imageUrl.`,
      affectedCount: affected,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Migration status check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check migration status' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Run the one-time migration
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    // Idempotency guard: check platform_config for prior run record
    const existing = await prisma.platformConfig.findUnique({
      where: { key: MIGRATION_KEY },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          status: 'already_applied',
          message: 'This migration has already been applied and will not run again.',
          appliedAt: existing.updatedAt,
          details: JSON.parse(existing.value || '{}'),
        },
        { status: 409 } // 409 Conflict — idempotency rejection
      );
    }

    // Find all products with empty imageUrls (legacy products)
    const productsToFix = await prisma.product.findMany({
      where: {
        imageUrls: { equals: [] },
        imageUrl: { not: '' },
      },
      select: { id: true, imageUrl: true },
    });

    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of productsToFix) {
      if (!product.imageUrl) {
        skippedCount++;
        continue;
      }
      await prisma.product.update({
        where: { id: product.id },
        data: { imageUrls: [product.imageUrl] },
      });
      updatedCount++;
    }

    const migrationDetails = {
      totalFound: productsToFix.length,
      updated: updatedCount,
      skipped: skippedCount,
      ranAt: new Date().toISOString(),
    };

    // Record that migration has run — prevents any future re-execution
    await prisma.platformConfig.create({
      data: {
        key: MIGRATION_KEY,
        value: JSON.stringify(migrationDetails),
        description:
          'One-time migration: backfilled imageUrls array from imageUrl for legacy products. This record prevents the migration from running again.',
        category: 'migration',
      },
    });

    return NextResponse.json({
      success: true,
      status: 'completed',
      message: `Migration complete. ${updatedCount} product(s) updated, ${skippedCount} skipped.`,
      details: migrationDetails,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
