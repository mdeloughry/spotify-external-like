import { saveTracks } from '../../../lib/spotify';
import { withBodyApiHandler, errorResponse } from '../../../lib/api-utils';
import { RATE_LIMIT, VALIDATION } from '../../../lib/constants';

/** Request body for bulk like operation */
interface BulkLikeRequestBody {
  /** Array of track IDs to like */
  trackIds: string[];
}

/** Save multiple tracks to Liked Songs */
export const POST = withBodyApiHandler<BulkLikeRequestBody>(
  async ({ token, headers, logger, body }) => {
    const { trackIds } = body;

    // Validation
    if (!trackIds || !Array.isArray(trackIds)) {
      logger.info(400);
      return errorResponse('Missing or invalid trackIds array', 400);
    }

    if (trackIds.length === 0) {
      logger.info(400);
      return errorResponse('No tracks provided', 400);
    }

    if (trackIds.length > 100) {
      logger.info(400);
      return errorResponse('Maximum 100 tracks per request', 400);
    }

    // Validate all track IDs
    const invalidIds = trackIds.filter(id => !VALIDATION.SPOTIFY_ID_PATTERN.test(id));
    if (invalidIds.length > 0) {
      logger.info(400);
      return errorResponse(`Invalid track ID format: ${invalidIds[0]}`, 400);
    }

    await saveTracks(trackIds, token);

    logger.info(200);
    return new Response(
      JSON.stringify({
        success: true,
        liked: trackIds.length,
      }),
      { headers }
    );
  },
  {
    path: '/api/like/bulk',
    method: 'POST',
    rateLimit: RATE_LIMIT.PLAYLIST, // Use playlist rate limit since it's a bulk operation
  }
);
