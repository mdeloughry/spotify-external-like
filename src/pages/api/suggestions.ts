import { getTrackById, getArtistTopTracks, getRelatedArtists, checkSavedTracks } from '../../lib/spotify';
import { withApiHandler, errorResponse } from '../../lib/api-utils';
import { RATE_LIMIT, API_PATHS, VALIDATION, UI } from '../../lib/constants';
import type { SpotifyTrack } from '../../lib/spotify';

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

    // Get seed tracks to extract artist IDs
    const seedTracks = await Promise.all(
      trackIds.slice(0, 5).map((id) => getTrackById(id, token).catch(() => null))
    );

    const validTracks = seedTracks.filter((t): t is SpotifyTrack => t !== null);
    if (validTracks.length === 0) {
      logger.info(200);
      return new Response(JSON.stringify({ tracks: [] }), { headers });
    }

    // Collect unique artist IDs from seed tracks
    const artistIds: string[] = [];
    for (const track of validTracks) {
      if (track.artists[0] && !artistIds.includes(track.artists[0].id)) {
        artistIds.push(track.artists[0].id);
        if (artistIds.length >= 2) break;
      }
    }

    let suggestedTracks: SpotifyTrack[] = [];

    // Note: Spotify deprecated /recommendations API on Nov 27, 2024
    // Using artist top tracks and related artists instead
    if (artistIds.length > 0) {
      try {
        // Get top tracks from the primary artist
        const topTracks = await getArtistTopTracks(artistIds[0], token);
        suggestedTracks = topTracks.tracks || [];

        // If we have room for more suggestions, get top tracks from related artists
        if (suggestedTracks.length < UI.MAX_SUGGESTIONS_API) {
          try {
            const relatedArtists = await getRelatedArtists(artistIds[0], token);
            if (relatedArtists.artists.length > 0) {
              // Get top tracks from first related artist
              const relatedTopTracks = await getArtistTopTracks(
                relatedArtists.artists[0].id,
                token
              );
              suggestedTracks = [
                ...suggestedTracks,
                ...(relatedTopTracks.tracks || []),
              ];
            }
          } catch {
            // Silently fail related artists lookup
          }
        }
      } catch {
        // Silently fail
      }
    }

    // Remove seed tracks from results
    const seedTrackIds = new Set(trackIds);
    const filteredTracks = suggestedTracks.filter(
      (track) => !seedTrackIds.has(track.id)
    );

    // Limit results
    const finalTracks = filteredTracks.slice(0, UI.MAX_SUGGESTIONS_API);

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
