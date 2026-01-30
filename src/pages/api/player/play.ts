import { playTrack, getPlaybackState } from '../../../lib/spotify';
import { withBodyApiHandler, errorResponse } from '../../../lib/api-utils';
import { RATE_LIMIT } from '../../../lib/constants';

/** Request body for playing a track */
interface PlayRequestBody {
  /** Spotify track URI (spotify:track:xxx) */
  trackUri: string;
}

export const POST = withBodyApiHandler<PlayRequestBody>(
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

    await playTrack(trackUri, token, playbackState.device.id);

    logger.info(200);
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Now playing',
        device: playbackState.device.name,
      }),
      { headers }
    );
  },
  {
    path: '/api/player/play',
    method: 'POST',
    rateLimit: RATE_LIMIT.PLAYLIST,
  }
);
