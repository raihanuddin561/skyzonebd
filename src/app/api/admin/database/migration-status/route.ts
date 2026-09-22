import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getMigrationStatus } from '@/lib/dbMigrationStatus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// GET /api/admin/database/migration-status — admin only.
// Reports whether prisma/migrations has any migration not yet applied to
// the connected database, so the admin UI's "Run Migration" button can be
// disabled whenever there's nothing to apply.
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const result = await getMigrationStatus();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Migration status check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check migration status' },
      { status: 500 }
    );
  }
}
