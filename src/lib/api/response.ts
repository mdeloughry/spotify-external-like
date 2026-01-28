/**
 * API response utilities for consistent response formatting
 */

import { addSecurityHeaders } from './security';

/**
 * Create a JSON response with security headers
 * @param data - Response data to serialize
 * @param status - HTTP status code
 * @param additionalHeaders - Optional additional headers
 * @returns Response object
 */
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

/**
 * Create an error response with security headers
 * @param message - Error message
 * @param status - HTTP status code
 * @param additionalHeaders - Optional additional headers
 * @returns Response object
 */
export function errorResponse(
  message: string,
  status: number = 400,
  additionalHeaders?: Record<string, string>
): Response {
  return jsonResponse({ error: message }, status, additionalHeaders);
}

/**
 * Create a rate limit exceeded response
 * @param resetIn - Time until rate limit resets in milliseconds
 * @returns Response object with 429 status and Retry-After header
 */
export function rateLimitResponse(resetIn: number): Response {
  return errorResponse('Too many requests. Please slow down.', 429, {
    'Retry-After': Math.ceil(resetIn / 1000).toString(),
  });
}

/**
 * Create a successful response with no content
 * @returns Response object with 204 status
 */
export function noContentResponse(): Response {
  const headers = new Headers();
  addSecurityHeaders(headers);
  return new Response(null, { status: 204, headers });
}

/**
 * Create headers for a response, optionally with auth cookie updates
 * @param cookieHeaders - Optional cookie headers to include
 * @returns Headers object
 */
export function createResponseHeaders(cookieHeaders?: string[]): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  addSecurityHeaders(headers);

  if (cookieHeaders) {
    for (const cookie of cookieHeaders) {
      headers.append('Set-Cookie', cookie);
    }
  }

  return headers;
}
