import type { APIRoute } from 'astro';
import { getTokenFromCookies, getRefreshTokenFromCookies, refreshAccessToken } from '../../lib/auth';
import { searchTracks, checkSavedTracks, getTrackById, parseTrackUrl } from '../../lib/spotify';

// Fetch YouTube video title using oEmbed (no API key needed)
async function getYouTubeTitle(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!response.ok) return null;
    const data = await response.json();
    // Clean up common YouTube title patterns
    let title = data.title || '';
    // Remove common suffixes like (Official Video), [Official Audio], etc.
    title = title.replace(/\s*[\(\[]?(official\s*)?(music\s*)?(video|audio|lyrics?|visualizer|hd|4k)[\)\]]?\s*/gi, ' ');
    // Remove "ft." or "feat." variations for cleaner search
    title = title.replace(/\s*(ft\.?|feat\.?)\s*/gi, ' ');
    return title.trim();
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  let token = getTokenFromCookies(request.headers.get('cookie'));
  const refreshToken = getRefreshTokenFromCookies(request.headers.get('cookie'));

  if (!token && !refreshToken) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (!token && refreshToken) {
    try {
      const tokens = await refreshAccessToken(refreshToken);
      token = tokens.access_token;
      headers.append(
        'Set-Cookie',
        `spotify_access_token=${tokens.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${tokens.expires_in}`
      );
      if (tokens.refresh_token) {
        headers.append(
          'Set-Cookie',
          `spotify_refresh_token=${tokens.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
        );
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: 'Missing URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = parseTrackUrl(url);
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'Unsupported URL format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let searchQuery: string;
    let directTrack = null;

    if (parsed.platform === 'youtube') {
      // Get YouTube video title
      const title = await getYouTubeTitle(parsed.query);
      if (!title) {
        return new Response(JSON.stringify({ error: 'Could not fetch video info' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      searchQuery = title;
    } else if (parsed.platform === 'spotify') {
      // Direct Spotify track ID - fetch it directly
      try {
        directTrack = await getTrackById(parsed.query, token!);
        const [isLiked] = await checkSavedTracks([directTrack.id], token!);
        return new Response(
          JSON.stringify({
            tracks: [{ ...directTrack, isLiked }],
            source: 'spotify',
            searchQuery: null,
          }),
          { headers }
        );
      } catch {
        return new Response(JSON.stringify({ error: 'Could not fetch Spotify track' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else if (parsed.platform === 'soundcloud') {
      searchQuery = parsed.query;
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported platform' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Search Spotify with the extracted query
    const searchResults = await searchTracks(searchQuery, token!, 10);

    // Check which tracks are already liked
    const trackIds = searchResults.tracks.items.map((track) => track.id);
    let likedStatus: boolean[] = [];

    if (trackIds.length > 0) {
      likedStatus = await checkSavedTracks(trackIds, token!);
    }

    const tracksWithLiked = searchResults.tracks.items.map((track, index) => ({
      ...track,
      isLiked: likedStatus[index] || false,
    }));

    return new Response(
      JSON.stringify({
        tracks: tracksWithLiked,
        source: parsed.platform,
        searchQuery,
      }),
      { headers }
    );
  } catch (err) {
    console.error('URL import error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to import from URL' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
