import { getPlaylistTracks } from '../../../lib/spotify';
import { withBodyApiHandler, errorResponse } from '../../../lib/api-utils';
import { RATE_LIMIT, API_PATHS } from '../../../lib/constants';

interface CheckDuplicatesRequestBody {
  trackId: string;
  playlistIds: string[];
}

export const POST = withBodyApiHandler<CheckDuplicatesRequestBody>(
  async ({ token, headers, logger, body }) => {
    const { trackId, playlistIds } = body;

    if (!trackId || typeof trackId !== 'string') {
      logger.info(400);
      return errorResponse('Missing or invalid trackId', 400);
    }

    if (!Array.isArray(playlistIds) || playlistIds.length === 0) {
      logger.info(400);
      return errorResponse('Missing or invalid playlistIds', 400);
    }

    // Limit to checking 20 playlists at a time for performance
    const playlistsToCheck = playlistIds.slice(0, 20);

    // Check each playlist in parallel
    const results = await Promise.all(
      playlistsToCheck.map(async (playlistId) => {
        try {
          const response = await getPlaylistTracks(playlistId, token, 100);
          const isDuplicate = response.items.some(item => item.track?.id === trackId);
          return { playlistId, isDuplicate };
        } catch {
          // If we can't check a playlist, assume it's not a duplicate
          return { playlistId, isDuplicate: false };
        }
      })
    );

    // Convert to a map of playlistId -> isDuplicate
    const duplicates: Record<string, boolean> = {};
    for (const result of results) {
      duplicates[result.playlistId] = result.isDuplicate;
    }

    logger.info(200);
    return new Response(JSON.stringify({ duplicates }), { headers });
  },
  {
    path: API_PATHS.PLAYLIST_ADD + '/check-duplicates',
    method: 'POST',
    rateLimit: RATE_LIMIT.PLAYLIST,
    rateLimitKey: 'playlist-check',
  }
);
