/**
 * Security utilities for API responses
 */

/**
 * Get security headers for API responses
 * @returns Record of security header names and values
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

/**
 * Add security headers to a Headers object
 * @param headers - The Headers object to modify
 */
export function addSecurityHeaders(headers: Headers): void {
  const securityHeaders = getSecurityHeaders();
  for (const [key, value] of Object.entries(securityHeaders)) {
    headers.set(key, value);
  }
}

/**
 * Check if the current environment is production
 * @returns True if running in production
 */
export function isProduction(): boolean {
  return import.meta.env.PROD === true;
}

/**
 * Get cookie options string with appropriate security settings
 * @param maxAge - Cookie max age in seconds
 * @param includeSecure - Whether to include Secure flag (auto-detected in production)
 * @returns Cookie options string
 */
export function getCookieOptions(maxAge: number, includeSecure?: boolean): string {
  const secure = includeSecure ?? isProduction();
  const parts = [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];

  if (secure) {
    parts.push('Secure');
  }

  return parts.join('; ');
}
