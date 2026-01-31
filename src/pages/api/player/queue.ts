import { addToQueue, getPlaybackState } from '../../../lib/spotify';
import { withBodyApiHandler, errorResponse } from '../../../lib/api-utils';
import { RATE_LIMIT } from '../../../lib/constants';

/** Request body for adding to queue */
interface QueueRequestBody {
  /** Spotify track URI (spotify:track:xxx) */
  trackUri: string;
}

export const POST = withBodyApiHandler<QueueRequestBody>(
  async ({ token, headers, logger, body }) => {
    const { trackUri } = body;

    if (!trackUri || typeof trackUri !== 'string') {
      logger.info(400);
      return errorResponse('Missing or invalid trackUri', 400);
    }

    // Validate URI format
    if (!trackUri.startsWith('spotify:track:')) {
      logger.info(400);
      return errorResponse('Invalid track URI format. Expected spotify:track:xxx', 400);
    }

    // Check for active playback session
    const playbackState = await getPlaybackState(token);
    if (!playbackState || !playbackState.device) {
      logger.info(400);
      return errorResponse(
        'No active Spotify session. Open Spotify and start playing something first.',
        400
      );
    }

    await addToQueue(trackUri, token);

    logger.info(200);
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Track added to queue',
        device: playbackState.device.name,
      }),
      { headers }
    );
  },
  {
    path: '/api/player/queue',
    method: 'POST',
    rateLimit: RATE_LIMIT.PLAYLIST,
  }
);
