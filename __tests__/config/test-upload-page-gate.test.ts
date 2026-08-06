// __tests__/config/test-upload-page-gate.test.ts
// Verifies the ongoing/opportunistic backlog item: src/app/test-upload's
// debug upload-testing page is gated out of production builds (calls
// notFound() when NODE_ENV === 'production'), placed after every hook call
// so it never violates the rules of hooks.

import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, '../../src/app/test-upload/page.tsx'),
  'utf-8'
);

describe('test-upload page production gate', () => {
  it('imports notFound from next/navigation', () => {
    expect(source).toMatch(/import\s*\{\s*notFound\s*\}\s*from\s*['"]next\/navigation['"]/);
  });

  it('calls notFound() when NODE_ENV is production', () => {
    expect(source).toMatch(/process\.env\.NODE_ENV\s*===\s*['"]production['"][\s\S]*?notFound\(\)/);
  });

  it('places the production check after the hook declarations (rules-of-hooks safe)', () => {
    const lastHookIndex = source.lastIndexOf('useEffect(');
    const gateIndex = source.indexOf("NODE_ENV === 'production'");
    expect(lastHookIndex).toBeGreaterThan(-1);
    expect(gateIndex).toBeGreaterThan(lastHookIndex);
  });
});
