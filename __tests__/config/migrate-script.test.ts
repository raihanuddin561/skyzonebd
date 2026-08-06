// __tests__/config/migrate-script.test.ts
// Verifies P2-0: scripts/migrate.js no longer runs `prisma db push` against
// the production/staging database on every build. `db push` has no
// migration history and can silently apply destructive, unreviewed schema
// changes straight from an uncommitted schema.prisma against a live
// database — `migrate deploy` (already used for the fallback path) only
// ever applies already-committed migration files, so this asserts the
// script's non-development branch uses that exclusively.

import fs from 'fs';
import path from 'path';

const scriptPath = path.join(__dirname, '../../scripts/migrate.js');
const raw = fs.readFileSync(scriptPath, 'utf-8');

describe('scripts/migrate.js (P2-0)', () => {
  it('does not call `prisma db push` anywhere (mentions in comments are fine)', () => {
    expect(raw).not.toMatch(/execSync\(['"]prisma db push/);
  });

  it('uses `prisma migrate deploy` for the non-development path', () => {
    expect(raw).toMatch(/prisma migrate deploy/);
  });

  it('still uses `prisma migrate dev` for local development, unchanged', () => {
    expect(raw).toMatch(/prisma migrate dev --skip-seed/);
  });
});
