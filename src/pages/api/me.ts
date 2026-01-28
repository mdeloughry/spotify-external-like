import type { APIRoute } from 'astro';
import { getCurrentUser } from '../../lib/spotify';
import {
  getAuthenticatedToken,
  checkRateLimit,
  getClientIdentifier,
  rateLimitResponse,
  jsonResponse,
  errorResponse,
  log,
} from '../../lib/api-utils';

export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  const path = '/api/me';

  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`me:${clientId}`, { windowMs: 60000, maxRequests: 30 });
  if (!rateLimit.allowed) {
    log({ level: 'warn', method: 'GET', path, clientId, error: 'Rate limited' });
    return rateLimitResponse(rateLimit.resetIn);
  }

  // Authentication with token refresh
  const authResult = await getAuthenticatedToken(request);
  if (!authResult.success) {
    log({ level: 'info', method: 'GET', path, status: 401, duration: Date.now() - startTime });
    return authResult.response;
  }

  const { token, headers } = authResult.data;

  try {
    const user = await getCurrentUser(token);
    log({ level: 'info', method: 'GET', path, status: 200, duration: Date.now() - startTime });
    return new Response(JSON.stringify(user), { status: 200, headers });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user';
    log({ level: 'error', method: 'GET', path, status: 500, duration: Date.now() - startTime, error: errorMessage });
    return errorResponse(errorMessage, 500);
  }
};
