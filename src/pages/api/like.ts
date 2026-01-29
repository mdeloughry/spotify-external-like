import { saveTrack, removeTrack } from '../../lib/spotify';
import { withBodyApiHandler, validateTrackId, errorResponse } from '../../lib/api-utils';
import { RATE_LIMIT, API_PATHS } from '../../lib/constants';

interface LikeRequestBody {
  trackId: string;
}

// Save track to Liked Songs
export const POST = withBodyApiHandler<LikeRequestBody>(
  async ({ token, headers, logger, body }) => {
    const { trackId } = body;

    // Validation
    const validation = validateTrackId(trackId);
    if (!validation.valid) {
      logger.info(400);
      return errorResponse(validation.error!, 400);
    }

    await saveTrack(trackId, token);

    logger.info(200);
    return new Response(JSON.stringify({ success: true, liked: true }), { headers });
  },
  {
    path: API_PATHS.LIKE,
    method: 'POST',
    rateLimit: RATE_LIMIT.LIKE,
    rateLimitKey: 'like',
  }
);

// Remove track from Liked Songs
export const DELETE = withBodyApiHandler<LikeRequestBody>(
  async ({ token, headers, logger, body }) => {
    const { trackId } = body;

    // Validation
    const validation = validateTrackId(trackId);
    if (!validation.valid) {
      logger.info(400);
      return errorResponse(validation.error!, 400);
    }

    await removeTrack(trackId, token);

    logger.info(200);
    return new Response(JSON.stringify({ success: true, liked: false }), { headers });
  },
  {
    path: API_PATHS.LIKE,
    method: 'DELETE',
    rateLimit: RATE_LIMIT.LIKE,
    rateLimitKey: 'like',
  }
);
