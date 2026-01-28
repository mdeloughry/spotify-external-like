import type { APIContext } from 'astro';
import { getTokenFromCookies, getRefreshTokenFromCookies, refreshAccessToken } from './auth';

// =============================================================================
// Rate Limiting (in-memory, resets on server restart)
// =============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 60,  // 60 requests per minute
};

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = defaultRateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const key = identifier;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Start new window
    rateLimitStore.set(key, {
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

export function getClientIdentifier(request: Request): string {
  // Use forwarded IP if behind proxy, otherwise use a hash of user-agent
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';

  // For additional uniqueness, combine with user agent
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `${ip}:${userAgent.slice(0, 50)}`;
}

// =============================================================================
// Security Headers
// =============================================================================

export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

export function addSecurityHeaders(headers: Headers): void {
  const securityHeaders = getSecurityHeaders();
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }
}

// =============================================================================
// Logging
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  method: string;
  path: string;
  status?: number;
  duration?: number;
  error?: string;
  clientId?: string;
}

export function log(entry: Partial<LogEntry> & { level: LogLevel; method: string; path: string }): void {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  const message = `[${logEntry.timestamp}] ${logEntry.level.toUpperCase()} ${logEntry.method} ${logEntry.path}${
    logEntry.status ? ` ${logEntry.status}` : ''
  }${logEntry.duration ? ` ${logEntry.duration}ms` : ''}${logEntry.error ? ` - ${logEntry.error}` : ''}`;

  switch (entry.level) {
    case 'error':
      console.error(message);
      break;
    case 'warn':
      console.warn(message);
      break;
    case 'debug':
      console.debug(message);
      break;
    default:
      console.log(message);
  }
}

// =============================================================================
// Request Validation
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateSearchQuery(query: string | null): ValidationResult {
  if (!query) {
    return { valid: false, error: 'Missing query parameter' };
  }
  if (query.length > 200) {
    return { valid: false, error: 'Query too long (max 200 characters)' };
  }
  if (query.length < 1) {
    return { valid: false, error: 'Query cannot be empty' };
  }
  return { valid: true };
}

export function validateTrackId(trackId: string | null | undefined): ValidationResult {
  if (!trackId) {
    return { valid: false, error: 'Missing track ID' };
  }
  // Spotify track IDs are 22 characters, alphanumeric
  if (!/^[a-zA-Z0-9]{22}$/.test(trackId)) {
    return { valid: false, error: 'Invalid track ID format' };
  }
  return { valid: true };
}

export function validatePlaylistId(playlistId: string | null | undefined): ValidationResult {
  if (!playlistId) {
    return { valid: false, error: 'Missing playlist ID' };
  }
  // Spotify playlist IDs are 22 characters, alphanumeric
  if (!/^[a-zA-Z0-9]{22}$/.test(playlistId)) {
    return { valid: false, error: 'Invalid playlist ID format' };
  }
  return { valid: true };
}

export function validateTrackUri(uri: string | null | undefined): ValidationResult {
  if (!uri) {
    return { valid: false, error: 'Missing track URI' };
  }
  // Format: spotify:track:XXXXXXXXXXXXXXXXXXXX
  if (!/^spotify:track:[a-zA-Z0-9]{22}$/.test(uri)) {
    return { valid: false, error: 'Invalid track URI format' };
  }
  return { valid: true };
}

export function validateUrl(url: string | null | undefined): ValidationResult {
  if (!url) {
    return { valid: false, error: 'Missing URL' };
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Invalid URL protocol' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// =============================================================================
// Authentication Helper
// =============================================================================

export interface AuthResult {
  token: string;
  headers: Headers;
}

export async function getAuthenticatedToken(
  request: Request,
  baseHeaders?: Headers
): Promise<{ success: true; data: AuthResult } | { success: false; response: Response }> {
  const headers = baseHeaders || new Headers();
  headers.set('Content-Type', 'application/json');
  addSecurityHeaders(headers);

  let token = getTokenFromCookies(request.headers.get('cookie'));
  const refreshToken = getRefreshTokenFromCookies(request.headers.get('cookie'));

  if (!token && !refreshToken) {
    return {
      success: false,
      response: new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers,
      }),
    };
  }

  // Try to refresh token if access token is missing
  if (!token && refreshToken) {
    try {
      const tokens = await refreshAccessToken(refreshToken);
      token = tokens.access_token;
      headers.append(
        'Set-Cookie',
        `spotify_access_token=${tokens.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${tokens.expires_in}`
      );
      if (tokens.refresh_token) {
        headers.append(
          'Set-Cookie',
          `spotify_refresh_token=${tokens.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
        );
      }
    } catch {
      return {
        success: false,
        response: new Response(JSON.stringify({ error: 'Session expired. Please log in again.' }), {
          status: 401,
          headers,
        }),
      };
    }
  }

  return {
    success: true,
    data: { token: token!, headers },
  };
}

// =============================================================================
// API Response Helpers
// =============================================================================

export function jsonResponse(
  data: unknown,
  status: number = 200,
  additionalHeaders?: Record<string, string>
): Response {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  addSecurityHeaders(headers);

  if (additionalHeaders) {
    for (const [key, value] of Object.entries(additionalHeaders)) {
      headers.set(key, value);
    }
  }

  return new Response(JSON.stringify(data), { status, headers });
}

export function errorResponse(
  message: string,
  status: number = 400,
  additionalHeaders?: Record<string, string>
): Response {
  return jsonResponse({ error: message }, status, additionalHeaders);
}

export function rateLimitResponse(resetIn: number): Response {
  return errorResponse('Too many requests. Please slow down.', 429, {
    'Retry-After': Math.ceil(resetIn / 1000).toString(),
  });
}
