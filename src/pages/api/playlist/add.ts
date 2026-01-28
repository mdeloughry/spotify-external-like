import { addToPlaylist } from '../../../lib/spotify';
import { withBodyApiHandler, validatePlaylistId, validateTrackUri, errorResponse } from '../../../lib/api-utils';
import { RATE_LIMIT, API_PATHS } from '../../../lib/constants';

interface AddToPlaylistRequestBody {
  playlistId: string;
  trackUri: string;
}

export const POST = withBodyApiHandler<AddToPlaylistRequestBody>(
  async ({ token, headers, logger, body }) => {
    const { playlistId, trackUri } = body;

    // Validation
    const playlistValidation = validatePlaylistId(playlistId);
    if (!playlistValidation.valid) {
      logger.info(400);
      return errorResponse(playlistValidation.error!, 400);
    }

    const trackValidation = validateTrackUri(trackUri);
    if (!trackValidation.valid) {
      logger.info(400);
      return errorResponse(trackValidation.error!, 400);
    }

    await addToPlaylist(playlistId, trackUri, token);

    logger.info(200);
    return new Response(JSON.stringify({ success: true }), { headers });
  },
  {
    path: API_PATHS.PLAYLIST_ADD,
    method: 'POST',
    rateLimit: RATE_LIMIT.PLAYLIST,
    rateLimitKey: 'playlist-add',
  }
);
