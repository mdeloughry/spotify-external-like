import { getCurrentlyPlaying, checkSavedTracks } from '../../lib/spotify';
import { withApiHandler } from '../../lib/api-utils';
import { RATE_LIMIT, API_PATHS } from '../../lib/constants';

export const GET = withApiHandler(
  async ({ token, headers, logger }) => {
    const nowPlaying = await getCurrentlyPlaying(token);

    if (!nowPlaying || !nowPlaying.item || nowPlaying.currently_playing_type !== 'track') {
      logger.info(200);
      return new Response(JSON.stringify({ playing: false }), { status: 200, headers });
    }

    // Check if track is liked
    const [isLiked] = await checkSavedTracks([nowPlaying.item.id], token);

    logger.info(200);
    return new Response(JSON.stringify({
      playing: true,
      is_playing: nowPlaying.is_playing,
      progress_ms: nowPlaying.progress_ms,
      track: {
        ...nowPlaying.item,
        isLiked,
      },
    }), { status: 200, headers });
  },
  {
    path: API_PATHS.NOW_PLAYING,
    method: 'GET',
    rateLimit: RATE_LIMIT.NOW_PLAYING,
  }
);
