// lib/applyPrismaMigration.ts
//
// Applies pending Prisma migrations without shelling out to the Prisma CLI
// (see the top-of-file comment in lib/dbMigrationStatus.ts for why: the CLI
// is not reliable inside a deployed Vercel function). Instead, each
// migration's raw migration.sql is read directly, split into individual
// statements, and executed via Prisma Client — the one thing that's
// reliably worked in this app in production all along — then a tracking
// row is written to _prisma_migrations in the exact shape the real CLI
// writes, so a later real `prisma migrate deploy` (e.g. the next Vercel
// build) recognizes these as already applied instead of re-running them.
//
// Every fact this file depends on was verified empirically against this
// project's real dev database before being written, not assumed:
//   - checksum = SHA-256 of the migration.sql file's raw bytes, hex-encoded
//     (confirmed: recomputing this for 3 already-applied migrations
//     produced an exact match against the checksum the real Prisma CLI had
//     already stored for each).
//   - id = a plain random UUID (crypto.randomUUID()).
//   - applied_steps_count is 1 for a fully-applied migration, regardless of
//     how many individual SQL statements the file contains.
//
// Statement splitting: Prisma's own migration generator only ever emits
// plain DDL (CREATE/ALTER/DROP TABLE|INDEX|TYPE, single-quoted string
// literals, `--` line comments) — confirmed by reading this project's own
// migration files. It never emits dollar-quoted (`$$...$$`) function/
// trigger bodies. splitSqlStatements only needs to track single-quoted
// strings and comments to split correctly for that shape of file; it does
// NOT handle dollar-quoting, so a hand-written migration using one (never
// seen in this project) would split incorrectly. If that's ever needed,
// this function is the one place to extend.

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { Prisma, PrismaClient } from '@prisma/client';

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      current += char;
      if (char === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      current += char;
      if (char === '*' && next === '/') {
        current += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }
    if (inSingleQuote) {
      current += char;
      if (char === "'") {
        if (next === "'") {
          current += next; // escaped '' inside a string literal
          i++;
        } else {
          inSingleQuote = false;
        }
      }
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      current += char;
      continue;
    }
    if (char === '-' && next === '-') {
      inLineComment = true;
      current += char;
      continue;
    }
    if (char === '/' && next === '*') {
      inBlockComment = true;
      current += char;
      continue;
    }

    if (char === ';') {
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}

export function computeMigrationChecksum(sqlFileBuffer: Buffer): string {
  return crypto.createHash('sha256').update(sqlFileBuffer).digest('hex');
}

const MIGRATIONS_TABLE_DDL = `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
)`;

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Applies one migration folder's SQL and records it in _prisma_migrations,
 * atomically (via the caller's transaction) — either the whole migration's
 * statements AND the tracking row land together, or nothing does, so a
 * partially-applied migration is never left looking "pending" with some of
 * its schema changes silently already there.
 */
export async function applyOneMigration(
  tx: TxClient,
  migrationsRoot: string,
  migrationName: string
): Promise<void> {
  const sqlPath = path.join(migrationsRoot, migrationName, 'migration.sql');
  const fileBuffer = fs.readFileSync(sqlPath);
  const sql = fileBuffer.toString('utf-8');
  const checksum = computeMigrationChecksum(fileBuffer);
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    await tx.$executeRawUnsafe(statement);
  }

  await tx.$executeRawUnsafe(
    `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
     VALUES ($1, $2, $3, now(), now(), 1)`,
    crypto.randomUUID(),
    checksum,
    migrationName
  );
}

/**
 * Applies every named pending migration, strictly in the given order,
 * stopping immediately on the first failure — migrations after a failed
 * one are left untouched (matches Prisma's own sequential apply-in-order
 * behavior). Each migration is its own transaction, so a failure rolls
 * back only that one migration's partial changes, not migrations already
 * successfully committed before it.
 */
export async function applyPendingMigrations(
  prisma: PrismaClient,
  pendingMigrations: string[]
): Promise<{ applied: string[]; failedAt?: string; error?: string }> {
  const migrationsRoot = path.join(process.cwd(), 'prisma', 'migrations');
  await prisma.$executeRawUnsafe(MIGRATIONS_TABLE_DDL);

  const applied: string[] = [];
  for (const migrationName of pendingMigrations) {
    try {
      await prisma.$transaction(async (tx) => {
        await applyOneMigration(tx as unknown as TxClient, migrationsRoot, migrationName);
      });
      applied.push(migrationName);
    } catch (error) {
      return {
        applied,
        failedAt: migrationName,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return { applied };
}
