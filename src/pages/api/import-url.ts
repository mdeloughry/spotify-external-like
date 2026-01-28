import { searchTracks, checkSavedTracks, getTrackById } from '../../lib/spotify';
import { parseTrackUrl } from '../../lib/url-parser';
import { withBodyApiHandler, validateUrl, errorResponse } from '../../lib/api-utils';
import { RATE_LIMIT, API_PATHS, TIMEOUTS } from '../../lib/constants';

interface ImportUrlRequestBody {
  url: string;
}

// Fetch YouTube video title using oEmbed (no API key needed)
async function getYouTubeTitle(videoId: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.EXTERNAL_API_MS);

    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

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

export const POST = withBodyApiHandler<ImportUrlRequestBody>(
  async ({ token, headers, logger, body }) => {
    const { url } = body;

    // Validation
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      logger.info(400);
      return errorResponse(urlValidation.error!, 400);
    }

    const parsed = parseTrackUrl(url);
    if (!parsed) {
      logger.info(400);
      return errorResponse('Unsupported URL format. Supported: YouTube, Spotify, SoundCloud', 400);
    }

    let searchQuery: string;

    if (parsed.platform === 'youtube') {
      // Get YouTube video title
      const title = await getYouTubeTitle(parsed.query);
      if (!title) {
        return errorResponse('Could not fetch video info', 400);
      }
      searchQuery = title;
    } else if (parsed.platform === 'spotify') {
      // Direct Spotify track ID - fetch it directly
      try {
        const directTrack = await getTrackById(parsed.query, token);
        const [isLiked] = await checkSavedTracks([directTrack.id], token);
        logger.info(200);
        return new Response(
          JSON.stringify({
            tracks: [{ ...directTrack, isLiked }],
            source: 'spotify',
            searchQuery: null,
          }),
          { headers }
        );
      } catch {
        return errorResponse('Could not fetch Spotify track', 400);
      }
    } else if (parsed.platform === 'soundcloud') {
      searchQuery = parsed.query;
    } else {
      return errorResponse('Unsupported platform', 400);
    }

    // Search Spotify with the extracted query
    const searchResults = await searchTracks(searchQuery, token, 10);

    // Check which tracks are already liked
    const trackIds = searchResults.tracks.items.map((track) => track.id);
    let likedStatus: boolean[] = [];

    if (trackIds.length > 0) {
      likedStatus = await checkSavedTracks(trackIds, token);
    }

    const tracksWithLiked = searchResults.tracks.items.map((track, index) => ({
      ...track,
      isLiked: likedStatus[index] || false,
    }));

    logger.info(200);
    return new Response(
      JSON.stringify({
        tracks: tracksWithLiked,
        source: parsed.platform,
        searchQuery,
      }),
      { headers }
    );
  },
  {
    path: API_PATHS.IMPORT_URL,
    method: 'POST',
    rateLimit: RATE_LIMIT.IMPORT_URL,
  }
);
