import { getPlaybackState } from '../../../lib/spotify';
import { withApiHandler } from '../../../lib/api-utils';
import { RATE_LIMIT } from '../../../lib/constants';

export const GET = withApiHandler(
  async ({ token, headers, logger }) => {
    const playbackState = await getPlaybackState(token);

    logger.info(200);
    return new Response(
      JSON.stringify({
        hasActiveSession: playbackState !== null && playbackState.device !== null,
        isPlaying: playbackState?.is_playing ?? false,
        device: playbackState?.device ?? null,
        track: playbackState?.item ?? null,
      }),
      { headers }
    );
  },
  {
    path: '/api/player/state',
    method: 'GET',
    rateLimit: RATE_LIMIT.NOW_PLAYING,
  }
);
