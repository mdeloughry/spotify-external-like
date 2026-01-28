import type { APIRoute } from 'astro';
import { getTokenFromCookies, getRefreshTokenFromCookies, refreshAccessToken } from '../../lib/auth';
import { getTrackById, getArtistTopTracks, getRelatedArtists, checkSavedTracks } from '../../lib/spotify';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const trackIds = url.searchParams.get('seeds')?.split(',').filter(Boolean);

  if (!trackIds || trackIds.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing seed track IDs' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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
    // Get the seed tracks to find their artists
    const seedTracks = await Promise.all(
      trackIds.slice(0, 2).map((id) => getTrackById(id, token!).catch(() => null))
    );

    const validTracks = seedTracks.filter(Boolean);
    if (validTracks.length === 0) {
      return new Response(JSON.stringify({ tracks: [] }), { headers });
    }

    // Collect unique artist IDs from seed tracks
    const artistIds = new Set<string>();
    validTracks.forEach((track) => {
      track!.artists.forEach((artist) => artistIds.add(artist.id));
    });

    // Get top tracks from the first artist and related artists
    const firstArtistId = Array.from(artistIds)[0];

    const [topTracksResponse, relatedArtistsResponse] = await Promise.all([
      getArtistTopTracks(firstArtistId, token!),
      getRelatedArtists(firstArtistId, token!).catch(() => ({ artists: [] })),
    ]);

    let suggestedTracks = [...topTracksResponse.tracks];

    // Add tracks from a related artist if we have them
    if (relatedArtistsResponse.artists.length > 0) {
      const relatedArtist = relatedArtistsResponse.artists[0];
      try {
        const relatedTracks = await getArtistTopTracks(relatedArtist.id, token!);
        suggestedTracks = [...suggestedTracks, ...relatedTracks.tracks];
      } catch {
        // Ignore errors from related artist tracks
      }
    }

    // Remove duplicates and seed tracks
    const seedTrackIds = new Set(trackIds);
    const seenIds = new Set<string>();
    const uniqueTracks = suggestedTracks.filter((track) => {
      if (seedTrackIds.has(track.id) || seenIds.has(track.id)) {
        return false;
      }
      seenIds.add(track.id);
      return true;
    });

    // Limit to 10 tracks
    const finalTracks = uniqueTracks.slice(0, 10);

    // Check which tracks are already liked
    const recTrackIds = finalTracks.map((track) => track.id);
    let likedStatus: boolean[] = [];

    if (recTrackIds.length > 0) {
      likedStatus = await checkSavedTracks(recTrackIds, token!);
    }

    // Combine results with liked status
    const tracksWithLiked = finalTracks.map((track, index) => ({
      ...track,
      isLiked: likedStatus[index] || false,
    }));

    return new Response(
      JSON.stringify({
        tracks: tracksWithLiked,
      }),
      { headers }
    );
  } catch (err) {
    console.error('Suggestions error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Failed to get suggestions' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
