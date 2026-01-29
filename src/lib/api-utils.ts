/**
 * API utilities - re-exports from modular API files
 * @deprecated Import from './api' or specific modules instead
 *
 * This file exists for backwards compatibility. New code should import from:
 * - './api/rate-limit' for rate limiting
 * - './api/security' for security headers
 * - './api/logger' for logging
 * - './api/validators' for input validation
 * - './api/response' for response helpers
 * - './api/auth-middleware' for authentication
 * - './api/middleware' for the withApiHandler wrapper
 * - './api' for all of the above
 */

// Re-export everything for backwards compatibility
export {
  // Rate limiting
  checkRateLimit,
  getClientIdentifier,
  clearRateLimitStore,
  type RateLimitConfig,
  type RateLimitEntry,
  type RateLimitResult,
} from './api/rate-limit';

export {
  // Security
  getSecurityHeaders,
  addSecurityHeaders,
  isProduction,
  getCookieOptions,
} from './api/security';

export {
  // Logging
  log,
  generateRequestId,
  createRequestLogger,
  type LogLevel,
  type LogEntry,
  type LogInput,
} from './api/logger';

export {
  // Validators
  validateSearchQuery,
  validateTrackId,
  validatePlaylistId,
  validateTrackUri,
  validateUrl,
  validateRequiredString,
  type ValidationResult,
} from './api/validators';

export {
  // Response helpers
  jsonResponse,
  errorResponse,
  rateLimitResponse,
  noContentResponse,
  createResponseHeaders,
} from './api/response';

export {
  // Auth middleware
  getAuthenticatedToken,
  isAuthSuccess,
  type AuthResult,
  type AuthSuccess,
  type AuthFailure,
  type AuthCheckResult,
} from './api/auth-middleware';

export {
  // API handler middleware
  withApiHandler,
  withPublicApiHandler,
  withBodyApiHandler,
  type ApiHandlerContext,
  type ApiMiddlewareConfig,
  type ApiHandler,
} from './api/middleware';
