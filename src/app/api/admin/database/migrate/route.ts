import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger';
import { getMigrationStatus } from '@/lib/dbMigrationStatus';
import { applyPendingMigrations } from '@/lib/applyPrismaMigration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/admin/database/migrate — admin only.
// Applies any pending Prisma migrations — keeps all existing data, only
// adds/changes schema for migrations already committed to
// prisma/migrations. Re-checks status server-side first: never trusts the
// client's claim that there's something pending to apply.
//
// Does not shell out to the Prisma CLI (see lib/dbMigrationStatus.ts and
// lib/applyPrismaMigration.ts for why) — each pending migration's SQL is
// executed directly via Prisma Client, one migration per transaction, in
// order, stopping at the first failure.
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAdmin(request);

    const statusBefore = await getMigrationStatus();
    if (statusBefore.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          status: statusBefore.status,
          error:
            statusBefore.status === 'up_to_date'
              ? 'No pending migrations — the database is already up to date.'
              : 'Could not confirm pending migrations exist; refusing to run.',
        },
        { status: 409 }
      );
    }

    const result = await applyPendingMigrations(prisma, statusBefore.pendingMigrations);

    await logActivity({
      userId: authUser.id,
      userName: authUser.name,
      action: 'UPDATE',
      entityType: 'Database',
      description: result.failedAt
        ? `Applied ${result.applied.length} migration(s) before failing on "${result.failedAt}": ${result.error}`
        : `Applied ${result.applied.length} pending migration(s): ${result.applied.join(', ') || '(none)'}`,
      metadata: { appliedMigrations: result.applied, failedAt: result.failedAt, error: result.error },
      request,
    });

    if (result.failedAt) {
      return NextResponse.json(
        {
          success: false,
          error: `Migration "${result.failedAt}" failed: ${result.error}`,
          appliedMigrations: result.applied,
          failedAt: result.failedAt,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Applied ${result.applied.length} migration(s) successfully.`,
      appliedMigrations: result.applied,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Migration apply error:', error);
    return NextResponse.json(
      { success: false, error: 'Migration failed', details: error?.message },
      { status: 500 }
    );
  }
}
