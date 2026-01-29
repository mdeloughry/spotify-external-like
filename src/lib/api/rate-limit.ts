/**
 * Rate limiting utilities
 * Note: Uses in-memory storage - for horizontal scaling, replace with Redis
 */

import { RATE_LIMIT } from '../constants';

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Max requests per window */
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, RATE_LIMIT.CLEANUP_INTERVAL_MS);
}

const defaultConfig: RateLimitConfig = {
  windowMs: RATE_LIMIT.DEFAULT_WINDOW_MS,
  maxRequests: RATE_LIMIT.DEFAULT_MAX_REQUESTS,
};

/**
 * Check if a request is allowed under rate limiting rules
 * @param identifier - Unique identifier for the client (e.g., IP + user-agent)
 * @param config - Rate limit configuration
 * @returns Rate limit check result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = defaultConfig
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // Start new window
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetIn: entry.resetTime - now };
}

/**
 * Get a unique client identifier from request headers
 * Uses forwarded IP if behind proxy, combined with user-agent for uniqueness
 * @param request - The incoming request
 * @returns Client identifier string
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';

  // Combine with user agent for additional uniqueness
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `${ip}:${userAgent.slice(0, 50)}`;
}

/**
 * Clear all rate limit entries (useful for testing)
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
