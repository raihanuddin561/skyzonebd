// lib/dbMigrationStatus.ts
//
// Shared status check for the admin Database Management page — determines
// whether there are Prisma migrations committed to prisma/migrations that
// haven't been applied to the connected database yet. Used to gate the
// "Run Migration" button: enabled only when status is 'pending'.
//
// Deliberately fails to 'unknown' (not 'up_to_date') on anything unexpected
// — a parse failure must never be silently treated as "safe to click",
// matching this codebase's fail-closed doctrine elsewhere (getJwtSecret(),
// the MIGRATION_SECRET_KEY check in api/migrate/route.ts).

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type MigrationStatusValue = 'up_to_date' | 'pending' | 'unknown';

export interface MigrationStatusResult {
  status: MigrationStatusValue;
  pendingMigrations: string[];
  raw: string;
}

export async function getMigrationStatus(): Promise<MigrationStatusResult> {
  try {
    const { stdout } = await execAsync('npx prisma migrate status', { timeout: 30000 });
    return parseMigrateStatusOutput(stdout);
  } catch (error: any) {
    // `prisma migrate status` exits non-zero both when migrations are
    // pending AND on a genuine connection/config error — the stdout/stderr
    // text (not the exit code) is what distinguishes them.
    const output = `${error?.stdout || ''}\n${error?.stderr || ''}`;
    if (output.includes('have not yet been applied')) {
      return parseMigrateStatusOutput(output);
    }
    return { status: 'unknown', pendingMigrations: [], raw: output || String(error?.message || error) };
  }
}

function parseMigrateStatusOutput(output: string): MigrationStatusResult {
  if (output.includes('Database schema is up to date!')) {
    return { status: 'up_to_date', pendingMigrations: [], raw: output };
  }
  if (output.includes('have not yet been applied')) {
    // Prisma lists pending migration folder names one per line, each
    // starting with a tree-drawing character (└─ or ├─) followed by the
    // migration directory name (e.g. "20260101000000_add_thing").
    const pendingMigrations = Array.from(
      output.matchAll(/[└├]─\s*(\d{14}_[a-zA-Z0-9_]+)/g)
    ).map((m) => m[1]);
    return { status: 'pending', pendingMigrations, raw: output };
  }
  return { status: 'unknown', pendingMigrations: [], raw: output };
}
