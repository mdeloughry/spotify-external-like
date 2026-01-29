/**
 * API middleware wrapper for reducing boilerplate in API routes
 * Handles rate limiting, authentication, logging, and error handling
 */

import type { APIRoute, APIContext } from 'astro';
import { checkRateLimit, getClientIdentifier, type RateLimitConfig } from './rate-limit';
import { getAuthenticatedToken, type AuthResult } from './auth-middleware';
import { createRequestLogger } from './logger';
import { errorResponse, rateLimitResponse } from './response';
import { RATE_LIMIT } from '../constants';

export interface ApiHandlerContext {
  /** The original Astro API context */
  context: APIContext;
  /** The authenticated token (if requireAuth is true) */
  token: string;
  /** Response headers (may include Set-Cookie for token refresh) */
  headers: Headers;
  /** Request logger instance */
  logger: ReturnType<typeof createRequestLogger>;
  /** The request body (if parseBody is true) */
  body?: unknown;
}

export interface ApiMiddlewareConfig {
  /** API path for logging */
  path: string;
  /** HTTP method for logging */
  method: string;
  /** Rate limit configuration */
  rateLimit?: RateLimitConfig;
  /** Whether authentication is required (default: true) */
  requireAuth?: boolean;
  /** Whether to parse request body as JSON (default: false) */
  parseBody?: boolean;
  /** Rate limit key prefix (defaults to path) */
  rateLimitKey?: string;
}

export type ApiHandler = (ctx: ApiHandlerContext) => Promise<Response>;

/**
 * Create an API route handler with middleware
 * Automatically handles rate limiting, authentication, logging, and errors
 *
 * @example
 * ```ts
 * export const GET = withApiHandler(
 *   async ({ token, headers, logger }) => {
 *     const data = await fetchSomething(token);
 *     logger.info(200);
 *     return new Response(JSON.stringify(data), { headers });
 *   },
 *   { path: '/api/example', method: 'GET' }
 * );
 * ```
 */
export function withApiHandler(
  handler: ApiHandler,
  config: ApiMiddlewareConfig
): APIRoute {
  const {
    path,
    method,
    rateLimit = { windowMs: RATE_LIMIT.DEFAULT_WINDOW_MS, maxRequests: RATE_LIMIT.DEFAULT_MAX_REQUESTS },
    requireAuth = true,
    parseBody = false,
    rateLimitKey,
  } = config;

  return async (context: APIContext): Promise<Response> => {
    const { request } = context;
    const logger = createRequestLogger(method, path);

    try {
      // Rate limiting
      const clientId = getClientIdentifier(request);
      const rateLimitResult = checkRateLimit(
        `${rateLimitKey || path}:${clientId}`,
        rateLimit
      );

      if (!rateLimitResult.allowed) {
        logger.warn(`Rate limited (client: ${clientId})`);
        return rateLimitResponse(rateLimitResult.resetIn);
      }

      let token = '';
      let headers = new Headers();

      // Authentication
      if (requireAuth) {
        const authResult = await getAuthenticatedToken(request);
        if (!authResult.success) {
          logger.info(401);
          return authResult.response;
        }
        token = authResult.data.token;
        headers = authResult.data.headers;
      }

      // Parse body if needed
      let body: unknown;
      if (parseBody) {
        try {
          body = await request.json();
        } catch {
          logger.info(400);
          return errorResponse('Invalid JSON body', 400);
        }
      }

      // Call the handler
      return await handler({
        context,
        token,
        headers,
        logger,
        body,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      logger.error(errorMessage, 500);
      return errorResponse(errorMessage, 500);
    }
  };
}

/**
 * Create a public API route handler (no authentication required)
 */
export function withPublicApiHandler(
  handler: (ctx: Omit<ApiHandlerContext, 'token'>) => Promise<Response>,
  config: Omit<ApiMiddlewareConfig, 'requireAuth'>
): APIRoute {
  return withApiHandler(
    (ctx) => handler(ctx),
    { ...config, requireAuth: false }
  );
}

/**
 * Create an API route handler that expects a JSON body
 */
export function withBodyApiHandler<T = unknown>(
  handler: (ctx: ApiHandlerContext & { body: T }) => Promise<Response>,
  config: Omit<ApiMiddlewareConfig, 'parseBody'>
): APIRoute {
  return withApiHandler(
    (ctx) => handler(ctx as ApiHandlerContext & { body: T }),
    { ...config, parseBody: true }
  );
}
