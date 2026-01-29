import { getTrackById, getArtistTopTracks, getRelatedArtists, checkSavedTracks } from '../../lib/spotify';
import { withApiHandler, errorResponse } from '../../lib/api-utils';
import { RATE_LIMIT, API_PATHS, VALIDATION, UI } from '../../lib/constants';

export const GET = withApiHandler(
  async ({ context, token, headers, logger }) => {
    const url = new URL(context.request.url);
    const trackIds = url.searchParams.get('seeds')?.split(',').filter(Boolean);

    if (!trackIds || trackIds.length === 0) {
      logger.info(400);
      return errorResponse('Missing seed track IDs', 400);
    }

    // Validate track IDs format
    if (!trackIds.every(id => VALIDATION.SPOTIFY_ID_PATTERN.test(id))) {
      logger.info(400);
      return errorResponse('Invalid track ID format', 400);
    }

    // Get the seed tracks to find their artists
    const seedTracks = await Promise.all(
      trackIds.slice(0, UI.MAX_SEED_TRACKS).map((id) => getTrackById(id, token).catch(() => null))
    );

    const validTracks = seedTracks.filter(Boolean);
    if (validTracks.length === 0) {
      logger.info(200);
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
      getArtistTopTracks(firstArtistId, token),
      getRelatedArtists(firstArtistId, token).catch(() => ({ artists: [] })),
    ]);

    let suggestedTracks = [...topTracksResponse.tracks];

    // Add tracks from a related artist if we have them
    if (relatedArtistsResponse.artists.length > 0) {
      const relatedArtist = relatedArtistsResponse.artists[0];
      try {
        const relatedTracks = await getArtistTopTracks(relatedArtist.id, token);
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

    // Limit results
    const finalTracks = uniqueTracks.slice(0, UI.MAX_SUGGESTIONS_API);

    // Check which tracks are already liked
    const recTrackIds = finalTracks.map((track) => track.id);
    let likedStatus: boolean[] = [];

    if (recTrackIds.length > 0) {
      likedStatus = await checkSavedTracks(recTrackIds, token);
    }

    // Combine results with liked status
    const tracksWithLiked = finalTracks.map((track, index) => ({
      ...track,
      isLiked: likedStatus[index] || false,
    }));

    logger.info(200);
    return new Response(
      JSON.stringify({
        tracks: tracksWithLiked,
      }),
      { headers }
    );
  },
  {
    path: API_PATHS.SUGGESTIONS,
    method: 'GET',
    rateLimit: RATE_LIMIT.SUGGESTIONS,
  }
);
