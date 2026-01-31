import { searchTracks, checkSavedTracks } from '../../lib/spotify';
import { withApiHandler, validateSearchQuery, errorResponse } from '../../lib/api-utils';
import { RATE_LIMIT, API_PATHS } from '../../lib/constants';
import { generateSearchSuggestions, queryNeedsCleaning } from '../../lib/fuzzy-search';

export const GET = withApiHandler(
  async ({ context, token, headers, logger }) => {
    const url = new URL(context.request.url);
    const query = url.searchParams.get('q');

    // Validation
    const validation = validateSearchQuery(query);
    if (!validation.valid) {
      logger.info(400);
      return errorResponse(validation.error!, 400);
    }

    const searchResults = await searchTracks(query!, token);

    // Check which tracks are already liked
    const trackIds = searchResults.tracks.items.map((track) => track.id);
    let likedStatus: boolean[] = [];

    if (trackIds.length > 0) {
      likedStatus = await checkSavedTracks(trackIds, token);
    }

    // Combine results with liked status
    const tracksWithLiked = searchResults.tracks.items.map((track, index) => ({
      ...track,
      isLiked: likedStatus[index] || false,
    }));

    // Generate search suggestions if few/no results or query looks like it needs cleaning
    let suggestions: string[] = [];
    if (tracksWithLiked.length < 3 || queryNeedsCleaning(query!)) {
      suggestions = generateSearchSuggestions(query!);
    }

    logger.info(200);
    return new Response(
      JSON.stringify({
        tracks: tracksWithLiked,
        total: searchResults.tracks.total,
        suggestions,
      }),
      { headers }
    );
  },
  {
    path: API_PATHS.SEARCH,
    method: 'GET',
    rateLimit: RATE_LIMIT.SEARCH,
  }
);
