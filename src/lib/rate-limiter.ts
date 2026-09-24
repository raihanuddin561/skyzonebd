// src/lib/rate-limiter.ts - Rate limiting for API routes

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the interval
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Each RateLimiter instance must key into `store` with its own prefix.
// `store` is shared at module scope (so the single cleanup timer below can
// sweep every limiter), but without a per-instance prefix, two different
// limiters (e.g. `strict` and `generous`) would collide on the same
// `identifier` (IP) key and share one counter/window — a request against
// the lenient `generous` limiter would silently consume/reset the budget
// tracked for the same IP under the strict `auth` limiter, and vice versa.
let limiterInstanceCounter = 0;

// Clean up old entries every 5 minutes. `.unref()` so this timer never
// keeps the Node process (or a test run) alive on its own — this module
// was previously unused by anything, so the missing unref never mattered
// until it was actually wired into routes.
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);
cleanupInterval.unref?.();

export class RateLimiter {
  private config: RateLimitConfig;
  private readonly instanceId: number;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.instanceId = limiterInstanceCounter++;
  }

  private getIdentifier(request: NextRequest): string {
    // Try to get IP address from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';

    // Key on IP plus this limiter instance. Including the User-Agent here
    // previously let anyone bypass the limit outright by sending a
    // different User-Agent header on every request — no proxy/IP rotation
    // required — so IP alone (not IP+UA) is intentional. But IP alone
    // *without* the instance prefix meant every exported limiter in
    // `rateLimiters` below (strict/auth/standard/generous/write/deletion)
    // shared the same `store` keyspace for a given IP, so hitting one
    // limiter's endpoint consumed and reset another's budget/window.
    return `${this.instanceId}:${ip}`;
  }

  async check(request: NextRequest): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const identifier = this.getIdentifier(request);
    const now = Date.now();
    
    // Initialize or reset if window has passed
    if (!store[identifier] || store[identifier].resetTime < now) {
      store[identifier] = {
        count: 0,
        resetTime: now + this.config.interval,
      };
    }

    const entry = store[identifier];
    entry.count++;

    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    const success = entry.count <= this.config.maxRequests;

    return {
      success,
      limit: this.config.maxRequests,
      remaining,
      reset: entry.resetTime,
    };
  }

  async limit(request: NextRequest): Promise<NextResponse | null> {
    const result = await this.check(request);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString(),
            'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    return null;
  }
}

// Predefined rate limiters for different use cases
export const rateLimiters = {
  // Strict - for authentication and sensitive operations
  strict: new RateLimiter({
    interval: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  }),

  // Auth - for login/register
  auth: new RateLimiter({
    interval: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  }),

  // Standard - for regular API calls
  standard: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    maxRequests: 60,
  }),

  // Generous - for public endpoints
  generous: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    maxRequests: 120,
  }),

  // Write operations - orders, reviews, etc.
  write: new RateLimiter({
    interval: 60 * 1000, // 1 minute
    maxRequests: 20,
  }),

  // Data deletion - very strict
  deletion: new RateLimiter({
    interval: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  }),
};

// Middleware helper
export async function withRateLimit(
  request: NextRequest,
  limiter: RateLimiter,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const limitResponse = await limiter.limit(request);
  
  if (limitResponse) {
    return limitResponse;
  }

  return handler();
}
