import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger';
import { getMigrationStatus } from '@/lib/dbMigrationStatus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const execAsync = promisify(exec);

// POST /api/admin/database/migrate — admin only.
// Applies any pending Prisma migrations (`prisma migrate deploy`) — keeps
// all existing data, only adds/changes schema for migrations already
// committed to prisma/migrations. Re-checks status server-side first: never
// trusts the client's claim that there's something pending to apply.
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

    const { stdout } = await execAsync('npx prisma migrate deploy', { timeout: 55000 });

    await logActivity({
      userId: authUser.id,
      userName: authUser.name,
      action: 'UPDATE',
      entityType: 'Database',
      description: `Applied ${statusBefore.pendingMigrations.length} pending migration(s): ${statusBefore.pendingMigrations.join(', ') || '(names unavailable)'}`,
      metadata: { pendingMigrations: statusBefore.pendingMigrations },
      request,
    });

    return NextResponse.json({
      success: true,
      message: `Applied ${statusBefore.pendingMigrations.length} migration(s) successfully.`,
      appliedMigrations: statusBefore.pendingMigrations,
      output: stdout,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Migration apply error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        details: error?.message,
        output: error?.stdout,
        stderr: error?.stderr,
      },
      { status: 500 }
    );
  }
}
