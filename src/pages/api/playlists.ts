import { getPlaylists } from '../../lib/spotify';
import { withApiHandler } from '../../lib/api-utils';
import { RATE_LIMIT, API_PATHS } from '../../lib/constants';

export const GET = withApiHandler(
  async ({ token, headers, logger }) => {
    const playlistsResponse = await getPlaylists(token);

    logger.info(200);
    return new Response(
      JSON.stringify({
        playlists: playlistsResponse.items,
        total: playlistsResponse.total,
      }),
      { headers }
    );
  },
  {
    path: API_PATHS.PLAYLISTS,
    method: 'GET',
    rateLimit: RATE_LIMIT.PLAYLIST,
  }
);
