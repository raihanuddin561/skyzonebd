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
//
// This deliberately does NOT shell out to `prisma migrate status`. Two
// separate attempts at invoking the Prisma CLI from a deployed Vercel
// function (via `npx`, then via `node <resolved CLI path>`) each hit a
// different Lambda-runtime-specific failure — `npx`/`npm` aren't present at
// request time, and even direct `node` invocation of the CLI's own
// entrypoint hit an internal module-resolution error the CLI's child-process
// architecture produces in that environment. The Prisma CLI is built to run
// in a normal dev/CI/build context with full npm tooling, not inside a live
// serverless request handler — that's exactly why this app's own build step
// (vercel.json) already runs `prisma migrate deploy` there instead.
//
// The status *check* doesn't need the CLI at all: it only needs to compare
// the migration folder names (read directly off disk — no `require`/module
// resolution, just a plain directory listing, which next.config.ts's
// outputFileTracingIncludes already guarantees is bundled) against the
// `_prisma_migrations` tracking table, read via the already-reliable
// `@prisma/client` (Prisma's actual supported runtime target — this app
// already makes hundreds of Client calls in production without issue).

import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';

// Still used by migrate/route.ts and reset/route.ts, which (unlike this
// status check) genuinely need to execute DDL and haven't been moved off
// the CLI yet — see the note at the top of this file about why shelling
// out to the CLI from a live Lambda is fragile in general.
const PRISMA_CLI_PATH = require.resolve('prisma/build/index.js');
export const PRISMA_CLI_COMMAND = `node "${PRISMA_CLI_PATH}"`;

export type MigrationStatusValue = 'up_to_date' | 'pending' | 'unknown';

export interface MigrationStatusResult {
  status: MigrationStatusValue;
  pendingMigrations: string[];
  raw: string;
}

interface AppliedMigrationRow {
  migration_name: string;
}

export async function getMigrationStatus(): Promise<MigrationStatusResult> {
  try {
    const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
    const folderNames = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d{14}_/.test(entry.name))
      .map((entry) => entry.name)
      .sort();

    // A migration counts as genuinely applied only if it finished and was
    // never rolled back — matches exactly what `prisma migrate status`
    // itself checks.
    const appliedRows = await prisma.$queryRaw<AppliedMigrationRow[]>`
      SELECT migration_name FROM "_prisma_migrations"
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
    `;
    const appliedNames = new Set(appliedRows.map((r) => r.migration_name));

    const pendingMigrations = folderNames.filter((name) => !appliedNames.has(name));

    if (pendingMigrations.length === 0) {
      return {
        status: 'up_to_date',
        pendingMigrations: [],
        raw: `${folderNames.length} migration(s) found in prisma/migrations, all applied.`,
      };
    }

    return {
      status: 'pending',
      pendingMigrations,
      raw: `${pendingMigrations.length} of ${folderNames.length} migration(s) not yet applied: ${pendingMigrations.join(', ')}`,
    };
  } catch (error) {
    // Logged server-side (visible in Vercel function logs), e.g. if
    // `_prisma_migrations` doesn't exist yet (a database that's never had
    // any migration applied at all) or the migrations directory wasn't
    // bundled for some other reason.
    const raw = error instanceof Error ? error.message : String(error);
    console.error('getMigrationStatus: could not determine migration status —', raw);
    return { status: 'unknown', pendingMigrations: [], raw };
  }
}
