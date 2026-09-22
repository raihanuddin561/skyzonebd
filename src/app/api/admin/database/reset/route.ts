import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { requireAuth } from '@/lib/auth';
import { UserRole, isSuperAdmin } from '@/types/roles';
import { logActivity } from '@/lib/activityLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const execAsync = promisify(exec);

// The admin must type this exact phrase to confirm — the one typed-
// confirmation pattern in this codebase, reserved for the single most
// destructive action the app can perform (drops and recreates the entire
// database, destroying every order, financial ledger entry, and user
// record). Checked server-side; the UI-displayed phrase must match exactly.
const REQUIRED_CONFIRMATION_TEXT = 'DELETE ALL DATA';

// POST /api/admin/database/reset — super admin only.
// Body: { confirmationText: string, reseed: boolean }
// Runs `prisma migrate reset --force --skip-seed` (drops the database,
// recreates it from the full migration history, no data survives), then —
// only if reseed:true was explicitly requested — runs the seed script.
// Reseeding is opt-in and off by default: prisma/seed.ts creates a
// hardcoded-password admin account, so silently reseeding on every reset
// would recreate a publicly-known credential.
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isSuperAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { confirmationText, reseed } = body as { confirmationText?: string; reseed?: boolean };

    if (confirmationText !== REQUIRED_CONFIRMATION_TEXT) {
      return NextResponse.json(
        {
          success: false,
          error: `Confirmation text does not match. Type "${REQUIRED_CONFIRMATION_TEXT}" exactly to proceed.`,
        },
        { status: 400 }
      );
    }

    console.warn(
      `⚠️  FULL DATABASE RESET initiated by ${authUser.email} (${authUser.id}) — reseed=${!!reseed}`
    );

    const { stdout: resetOutput } = await execAsync(
      'npx prisma migrate reset --force --skip-seed',
      { timeout: 55000 }
    );

    let seedOutput: string | undefined;
    if (reseed) {
      const { stdout } = await execAsync('npx prisma db seed', { timeout: 55000 });
      seedOutput = stdout;
    }

    // Logged after the reset completes — the reset itself just wiped the
    // activity_logs table too, so this is the *first* row in the fresh
    // database, deliberately: the reset is always the first thing anyone
    // auditing history will see.
    await logActivity({
      userId: authUser.id,
      userName: authUser.name,
      action: 'DELETE',
      entityType: 'Database',
      description: `FULL DATABASE RESET executed by ${authUser.email}${reseed ? ' (reseeded with sample data)' : ' (no reseed — empty schema)'}`,
      metadata: { reseed: !!reseed, triggeredBy: authUser.email },
      request,
    });

    return NextResponse.json({
      success: true,
      message: reseed
        ? 'Database fully reset and reseeded with sample data. The seeded admin account uses a well-known default password — change it immediately.'
        : 'Database fully reset. Schema recreated from migrations; no data was seeded.',
      resetOutput,
      seedOutput,
    });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Database reset error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Database reset failed',
        details: error?.message,
        output: error?.stdout,
        stderr: error?.stderr,
      },
      { status: 500 }
    );
  }
}
