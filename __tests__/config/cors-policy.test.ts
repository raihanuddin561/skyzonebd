// __tests__/config/cors-policy.test.ts
// Verifies the P0-6 fix: no route carries the wildcard-origin +
// credentials:true combination anymore, and only genuinely public,
// read-only catalog/discovery routes get permissive (credential-less)
// cross-origin access.

import nextConfig from '../../next.config';

describe('next.config.ts CORS headers', () => {
  it('never pairs a wildcard Access-Control-Allow-Origin with Access-Control-Allow-Credentials', async () => {
    const blocks = await nextConfig.headers!();
    for (const block of blocks) {
      const origin = block.headers.find(h => h.key === 'Access-Control-Allow-Origin');
      const credentials = block.headers.find(h => h.key === 'Access-Control-Allow-Credentials');
      if (origin?.value === '*') {
        expect(credentials).toBeUndefined();
      }
    }
  });

  it('does not apply a blanket CORS block to /api/:path* anymore', async () => {
    const blocks = await nextConfig.headers!();
    expect(blocks.some(b => b.source === '/api/:path*')).toBe(false);
  });

  it('does not grant CORS headers to sensitive route families (admin, user, orders, rfq, auth)', async () => {
    const blocks = await nextConfig.headers!();
    const sensitivePrefixes = ['/api/admin', '/api/user', '/api/orders', '/api/rfq', '/api/auth', '/api/payment', '/api/migrate', '/api/seed'];
    for (const block of blocks) {
      for (const prefix of sensitivePrefixes) {
        // Match on a full path segment boundary so '/api/payment-config'
        // (a genuinely public, distinct route) isn't misflagged as matching
        // the '/api/payment' prefix.
        const matchesSegment = block.source === prefix || block.source.startsWith(`${prefix}/`);
        expect(matchesSegment).toBe(false);
      }
    }
  });

  it('grants credential-less, GET-only public access to the catalog/discovery routes', async () => {
    const blocks = await nextConfig.headers!();
    const publicSources = blocks.map(b => b.source);
    expect(publicSources).toEqual(
      expect.arrayContaining([
        '/api/products/:path*',
        '/api/categories/:path*',
        '/api/search/:path*',
        '/api/units',
        '/api/hero-slides/:path*',
        '/api/payment-config',
        '/api/health',
        '/api/config',
      ])
    );
    for (const block of blocks) {
      const methods = block.headers.find(h => h.key === 'Access-Control-Allow-Methods');
      expect(methods?.value).toBe('GET, OPTIONS');
    }
  });
});
