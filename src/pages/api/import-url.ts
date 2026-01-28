import type { APIRoute } from 'astro';
import { searchTracks, checkSavedTracks, getTrackById, parseTrackUrl } from '../../lib/spotify';
import {
  getAuthenticatedToken,
  checkRateLimit,
  getClientIdentifier,
  validateUrl,
  rateLimitResponse,
  errorResponse,
  log,
} from '../../lib/api-utils';

// Fetch YouTube video title using oEmbed (no API key needed)
async function getYouTubeTitle(videoId: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

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

// Generic helper to fetch and clean page titles for non-YouTube platforms
async function getPageTitle(targetUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return null;
    const html = await response.text();

    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    if (!match?.[1]) return null;

    let title = match[1].trim();

    // Normalise common suffix patterns from music services
    title = title
      // Apple Music: "Song Name by Artist on Apple Music"
      .replace(/\s+on\s+Apple Music\s*$/i, '')
      // Deezer: "Artist - Track - Deezer"
      .replace(/\s*-\s*Deezer\s*$/i, '')
      // Bandcamp: "Track | Artist" or "Album | Artist"
      .replace(/\s*\|\s*Bandcamp\s*$/i, '')
      // Remove site names in brackets
      .replace(/\s*\(.*?(Deezer|Apple Music|Bandcamp).*?\)\s*$/i, '')
      .trim();

    return title || null;
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  const path = '/api/import-url';

  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(`import-url:${clientId}`, { windowMs: 60000, maxRequests: 30 });
  if (!rateLimit.allowed) {
    log({ level: 'warn', method: 'POST', path, clientId, error: 'Rate limited' });
    return rateLimitResponse(rateLimit.resetIn);
  }

  // Authentication
  const authResult = await getAuthenticatedToken(request);
  if (!authResult.success) {
    log({ level: 'info', method: 'POST', path, status: 401, duration: Date.now() - startTime });
    return authResult.response;
  }

  const { token, headers } = authResult.data;

  try {
    const body = await request.json();
    const { url } = body;

    // Validation
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      log({ level: 'info', method: 'POST', path, status: 400, error: urlValidation.error });
      return errorResponse(urlValidation.error!, 400);
    }

    const parsed = parseTrackUrl(url);
    if (!parsed) {
      log({ level: 'info', method: 'POST', path, status: 400, error: 'Unsupported URL format' });
      return errorResponse(
        'Unsupported URL format. Supported: YouTube, Spotify, SoundCloud, and most music sites.',
        400
      );
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
        log({ level: 'info', method: 'POST', path, status: 200, duration: Date.now() - startTime });
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
      // All other recognised platforms: fetch and clean the page title
      const title = await getPageTitle(parsed.query);
      if (!title) {
        return errorResponse('Could not fetch page info from the music service', 400);
      }
      searchQuery = title;
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

    log({ level: 'info', method: 'POST', path, status: 200, duration: Date.now() - startTime });
    return new Response(
      JSON.stringify({
        tracks: tracksWithLiked,
        source: parsed.platform,
        searchQuery,
      }),
      { headers }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to import from URL';
    log({ level: 'error', method: 'POST', path, status: 500, duration: Date.now() - startTime, error: errorMessage });
    return errorResponse(errorMessage, 500);
  }
};
