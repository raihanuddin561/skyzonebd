import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '**.vercel-storage.com',
      },
    ],
  },
  // Increase body size limit for image uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // API configuration
  //
  // CORS is scoped per-route need, not applied blanket. This app has exactly
  // one consumer today — its own same-origin frontend (see ADR-005) — which
  // needs no CORS headers at all (CORS only governs cross-origin browser
  // requests). The only routes given permissive cross-origin access are
  // genuinely public, read-only catalog/discovery endpoints, and none of
  // them send `Access-Control-Allow-Credentials`, so a wildcard origin can
  // never be combined with credentialed access — the combination previously
  // present here (wildcard origin + credentials:true on *every* API route,
  // including user/admin/order endpoints) is exactly the misconfiguration
  // this replaces. See docs/architecture-review/08_Security_Assessment.md §2.3.
  async headers() {
    const publicReadOnlyCors = [
      { key: 'Access-Control-Allow-Origin', value: '*' },
      { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
    ];

    return [
      { source: '/api/products/:path*', headers: publicReadOnlyCors },
      { source: '/api/categories/:path*', headers: publicReadOnlyCors },
      { source: '/api/search/:path*', headers: publicReadOnlyCors },
      { source: '/api/units', headers: publicReadOnlyCors },
      { source: '/api/hero-slides/:path*', headers: publicReadOnlyCors },
      { source: '/api/payment-config', headers: publicReadOnlyCors },
      { source: '/api/health', headers: publicReadOnlyCors },
      { source: '/api/config', headers: publicReadOnlyCors },
    ];
  },
};

export default nextConfig;
