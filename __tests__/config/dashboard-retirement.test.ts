// __tests__/config/dashboard-retirement.test.ts
// Verifies P2-8: the legacy /dashboard/* route tree (a second, partial,
// less-complete admin panel — 11 of 12 pages were admin-role-gated
// duplicates of functionality already in /admin/*, one page was missing
// its role gate entirely, and one page was fully orphaned/unlinked) has
// been retired in favor of the single, complete /admin/* panel.

import fs from 'fs';
import path from 'path';

const appDir = path.join(__dirname, '../../src/app');
const headerSource = fs.readFileSync(
  path.join(appDir, 'components/Header.tsx'),
  'utf-8'
);

describe('dashboard retirement (P2-8)', () => {
  it('the src/app/dashboard directory no longer exists', () => {
    expect(fs.existsSync(path.join(appDir, 'dashboard'))).toBe(false);
  });

  it('Header.tsx no longer links to /dashboard', () => {
    expect(headerSource).not.toMatch(/href="\/dashboard"/);
  });

  it("Header.tsx's admin quick-access link now points to /admin", () => {
    expect(headerSource).toMatch(/href="\/admin"/);
  });
});
