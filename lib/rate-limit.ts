/**
 * Rate Limiting Utility
 * In-memory rate limiter for API routes
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Maximum number of requests in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Check rate limit for an identifier (IP, user ID, etc.)
 * Returns { allowed, remaining, resetIn }
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
      retryAfter,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

/**
 * Pre-configured rate limiters
 */
export const RATE_LIMITS = {
  /** Checkout: 10 requests per minute */
  checkout: { maxRequests: 10, windowMs: 60 * 1000 },
  /** POS Sale: 30 requests per minute */
  posSale: { maxRequests: 30, windowMs: 60 * 1000 },
  /** STK Push: 5 requests per minute */
  stkPush: { maxRequests: 5, windowMs: 60 * 1000 },
  /** API general: 100 requests per minute */
  api: { maxRequests: 100, windowMs: 60 * 1000 },
  /** Auth: 5 attempts per 15 minutes */
  auth: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
};

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown';
  return `ip:${ip}`;
}
