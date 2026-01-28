import type { APIRoute } from 'astro';
import { saveTrack, removeTrack } from '../../lib/spotify';
import {
  getAuthenticatedToken,
  checkRateLimit,
  getClientIdentifier,
  validateTrackId,
  rateLimitResponse,
  errorResponse,
  log,
} from '../../lib/api-utils';

// Save track to Liked Songs
export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  const path = '/api/like';

  // Rate limiting (stricter for write operations)
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`like:${clientId}`, { windowMs: 60000, maxRequests: 30 });
  if (!rateLimit.allowed) {
    log({ level: 'warn', method: 'POST', path, clientId, error: 'Rate limited' });
    return rateLimitResponse(rateLimit.resetIn);
  }

  // Authentication
  const authResult = await getAuthenticatedToken(request);
  if (!authResult.success) {
    log({ level: 'info', method: 'POST', path, status: 401, duration: Date.now() - startTime });
    return authResult.response;
  }

  const { token, headers } = authResult.data;

  try {
    const body = await request.json();
    const { trackId } = body;

    // Validation
    const validation = validateTrackId(trackId);
    if (!validation.valid) {
      log({ level: 'info', method: 'POST', path, status: 400, error: validation.error });
      return errorResponse(validation.error!, 400);
    }

    await saveTrack(trackId, token);

    log({ level: 'info', method: 'POST', path, status: 200, duration: Date.now() - startTime });
    return new Response(JSON.stringify({ success: true, liked: true }), { headers });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to save track';
    log({ level: 'error', method: 'POST', path, status: 500, duration: Date.now() - startTime, error: errorMessage });
    return errorResponse(errorMessage, 500);
  }
};

// Remove track from Liked Songs
export const DELETE: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  const path = '/api/like';

  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`like:${clientId}`, { windowMs: 60000, maxRequests: 30 });
  if (!rateLimit.allowed) {
    log({ level: 'warn', method: 'DELETE', path, clientId, error: 'Rate limited' });
    return rateLimitResponse(rateLimit.resetIn);
  }

  // Authentication
  const authResult = await getAuthenticatedToken(request);
  if (!authResult.success) {
    log({ level: 'info', method: 'DELETE', path, status: 401, duration: Date.now() - startTime });
    return authResult.response;
  }

  const { token, headers } = authResult.data;

  try {
    const body = await request.json();
    const { trackId } = body;

    // Validation
    const validation = validateTrackId(trackId);
    if (!validation.valid) {
      log({ level: 'info', method: 'DELETE', path, status: 400, error: validation.error });
      return errorResponse(validation.error!, 400);
    }

    await removeTrack(trackId, token);

    log({ level: 'info', method: 'DELETE', path, status: 200, duration: Date.now() - startTime });
    return new Response(JSON.stringify({ success: true, liked: false }), { headers });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to remove track';
    log({ level: 'error', method: 'DELETE', path, status: 500, duration: Date.now() - startTime, error: errorMessage });
    return errorResponse(errorMessage, 500);
  }
};
