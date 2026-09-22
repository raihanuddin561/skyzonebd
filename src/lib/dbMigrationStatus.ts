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
    // Logged server-side (visible in Vercel function logs) rather than only
    // returned in the API response — the most common real cause on a
    // serverless deployment is that `prisma/schema.prisma`, the migrations
    // folder, or the Prisma CLI/engine binaries weren't bundled into the
    // function (Next.js's file tracing can't see this dependency inside a
    // shelled-out command), which shows up here as "spawn npx ENOENT" or a
    // schema-engine/"Could not find schema.prisma" style message.
    const raw = output || String(error?.message || error);
    console.error('getMigrationStatus: could not determine migration status —', raw);
    return { status: 'unknown', pendingMigrations: [], raw };
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
  console.error('getMigrationStatus: unrecognized `prisma migrate status` output —', output);
  return { status: 'unknown', pendingMigrations: [], raw: output };
}
