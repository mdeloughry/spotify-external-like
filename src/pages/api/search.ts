import type { APIRoute } from 'astro';
import { searchTracks, checkSavedTracks } from '../../lib/spotify';
import {
  getAuthenticatedToken,
  checkRateLimit,
  getClientIdentifier,
  validateSearchQuery,
  rateLimitResponse,
  errorResponse,
  log,
} from '../../lib/api-utils';

export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  const path = '/api/search';
  const url = new URL(request.url);
  const query = url.searchParams.get('q');

  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`search:${clientId}`, { windowMs: 60000, maxRequests: 60 });
  if (!rateLimit.allowed) {
    log({ level: 'warn', method: 'GET', path, clientId, error: 'Rate limited' });
    return rateLimitResponse(rateLimit.resetIn);
  }

  // Validation
  const validation = validateSearchQuery(query);
  if (!validation.valid) {
    log({ level: 'info', method: 'GET', path, status: 400, error: validation.error });
    return errorResponse(validation.error!, 400);
  }

  // Authentication
  const authResult = await getAuthenticatedToken(request);
  if (!authResult.success) {
    log({ level: 'info', method: 'GET', path, status: 401, duration: Date.now() - startTime });
    return authResult.response;
  }

  const { token, headers } = authResult.data;

  try {
    const searchResults = await searchTracks(query!, token);

    // Check which tracks are already liked
    const trackIds = searchResults.tracks.items.map((track) => track.id);
    let likedStatus: boolean[] = [];

    if (trackIds.length > 0) {
      likedStatus = await checkSavedTracks(trackIds, token);
    }

    // Combine results with liked status
    const tracksWithLiked = searchResults.tracks.items.map((track, index) => ({
      ...track,
      isLiked: likedStatus[index] || false,
    }));

    log({ level: 'info', method: 'GET', path, status: 200, duration: Date.now() - startTime });
    return new Response(
      JSON.stringify({
        tracks: tracksWithLiked,
        total: searchResults.tracks.total,
      }),
      { headers }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Search failed';
    log({ level: 'error', method: 'GET', path, status: 500, duration: Date.now() - startTime, error: errorMessage });
    return errorResponse(errorMessage, 500);
  }
};
