import type { APIRoute } from 'astro';
import { getTokenFromCookies } from '../../lib/auth';
import { getCurrentlyPlaying, checkSavedTracks } from '../../lib/spotify';

export const GET: APIRoute = async ({ request }) => {
  const cookieHeader = request.headers.get('cookie');
  const token = getTokenFromCookies(cookieHeader);

  if (!token) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const nowPlaying = await getCurrentlyPlaying(token);

    if (!nowPlaying || !nowPlaying.item || nowPlaying.currently_playing_type !== 'track') {
      return new Response(JSON.stringify({ playing: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if track is liked
    const [isLiked] = await checkSavedTracks([nowPlaying.item.id], token);

    return new Response(JSON.stringify({
      playing: true,
      is_playing: nowPlaying.is_playing,
      progress_ms: nowPlaying.progress_ms,
      track: {
        ...nowPlaying.item,
        isLiked,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to fetch now playing' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
