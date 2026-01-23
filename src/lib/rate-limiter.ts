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

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  private getIdentifier(request: NextRequest): string {
    // Try to get IP address from various headers
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    
    // Optionally include user agent for more granular limiting
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    return `${ip}:${userAgent}`;
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
