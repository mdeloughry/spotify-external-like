import { searchTracks, checkSavedTracks, getPlaylistTracks as getSpotifyPlaylistTracks } from '../../lib/spotify';
import { parsePlaylistUrl, parseTextTracks, isTextTrackList } from '../../lib/playlist-parser';
import { withBodyApiHandler, validateExternalUrl, errorResponse } from '../../lib/api-utils';
import { RATE_LIMIT, TIMEOUTS } from '../../lib/constants';
import type { SpotifyTrack } from '../../lib/spotify';

/** Request body for playlist import - can be URL or text */
interface ImportPlaylistRequestBody {
  /** URL of playlist to import, or plain text track list */
  url: string;
}

interface PlaylistTrackInfo {
  title: string;
  artist?: string;
}

interface ImportedTrack {
  originalTitle: string;
  originalArtist?: string;
  spotifyTrack: (SpotifyTrack & { isLiked: boolean }) | null;
  status: 'found' | 'not_found';
}

// Fetch with timeout and browser-like headers
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Extract tracks from YouTube/YouTube Music playlist using page scraping
async function getYouTubePlaylistTracks(playlistId: string, isYouTubeMusic: boolean = false): Promise<PlaylistTrackInfo[]> {
  const tracks: PlaylistTrackInfo[] = [];

  // Try YouTube Music first if it's a YTM playlist, otherwise try regular YouTube
  // YTM playlists (especially auto-generated ones starting with RDCLAK) may not work on regular YouTube
  const urls = isYouTubeMusic
    ? [
        `https://music.youtube.com/playlist?list=${playlistId}`,
        `https://www.youtube.com/playlist?list=${playlistId}`,
      ]
    : [
        `https://www.youtube.com/playlist?list=${playlistId}`,
        `https://music.youtube.com/playlist?list=${playlistId}`,
      ];

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, TIMEOUTS.EXTERNAL_API_MS);

      if (!response.ok) continue;

      const html = await response.text();

      // Extract video/song titles from the page
      // Both YouTube and YouTube Music embed info in JSON within the page
      const titleMatches = html.matchAll(/"title":\s*{\s*"runs":\s*\[\s*{\s*"text":\s*"([^"]+)"/g);

      for (const match of titleMatches) {
        const title = match[1];
        // Skip common non-music entries and UI elements
        if (title &&
            !title.includes('[Deleted video]') &&
            !title.includes('[Private video]') &&
            !title.includes('Playlist') &&
            title.length > 1) {
          // Clean up the title
          let cleanTitle = title
            .replace(/\s*\(Official\s*(Video|Audio|Music Video|Lyric Video)\)\s*/gi, '')
            .replace(/\s*\[Official\s*(Video|Audio|Music Video|Lyric Video)\]\s*/gi, '')
            .replace(/\s*\|\s*Official\s*(Video|Audio)\s*/gi, '')
            .trim();

          // Avoid duplicates
          if (cleanTitle && !tracks.some(t => t.title === cleanTitle)) {
            tracks.push({ title: cleanTitle });
          }
        }

        // Limit to 50 tracks
        if (tracks.length >= 50) break;
      }

      // If we found tracks, no need to try the other URL
      if (tracks.length > 0) break;
    } catch {
      // Try next URL
      continue;
    }
  }

  return tracks;
}

// Extract tracks from a generic page by scraping
async function getPagePlaylistTracks(url: string, platform: string): Promise<PlaylistTrackInfo[]> {
  const tracks: PlaylistTrackInfo[] = [];

  try {
    const response = await fetchWithTimeout(url, TIMEOUTS.EXTERNAL_API_MS);
    if (!response.ok) {
      return tracks;
    }

    const html = await response.text();

    // Platform-specific extraction patterns
    if (platform === 'soundcloud') {
      // Try multiple patterns for SoundCloud
      // Pattern 1: JSON data in script tags
      const jsonDataMatch = html.match(/<script[^>]*>window\.__sc_hydration\s*=\s*(\[[\s\S]*?\]);<\/script>/);
      if (jsonDataMatch) {
        try {
          const data = JSON.parse(jsonDataMatch[1]);
          for (const item of data) {
            if (item.data?.tracks) {
              for (const track of item.data.tracks) {
                if (track.title && !tracks.some(t => t.title === track.title)) {
                  tracks.push({
                    title: track.title,
                    artist: track.user?.username,
                  });
                }
                if (tracks.length >= 50) break;
              }
            }
          }
        } catch { /* JSON parse failed */ }
      }

      // Pattern 2: Look for track titles in the page
      if (tracks.length === 0) {
        const titleMatches = html.matchAll(/"title":"([^"]+)","permalink_url"/g);
        for (const match of titleMatches) {
          if (!tracks.some(t => t.title === match[1])) {
            tracks.push({ title: match[1] });
          }
          if (tracks.length >= 50) break;
        }
      }

    } else if (platform === 'apple-music') {
      // Apple Music - try multiple patterns
      // Pattern 1: JSON-LD structured data
      const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
      if (jsonLdMatch) {
        for (const match of jsonLdMatch) {
          try {
            const jsonStr = match.replace(/<script[^>]*>|<\/script>/gi, '');
            const data = JSON.parse(jsonStr);
            if (data.track) {
              for (const track of data.track) {
                if (track.name && !tracks.some(t => t.title === track.name)) {
                  tracks.push({
                    title: track.name,
                    artist: track.byArtist?.name,
                  });
                }
                if (tracks.length >= 50) break;
              }
            }
          } catch { /* JSON parse failed */ }
        }
      }

      // Pattern 2: Look for track names in meta/data attributes
      if (tracks.length === 0) {
        const trackMatches = html.matchAll(/data-testid="track-title"[^>]*>([^<]+)</gi);
        for (const match of trackMatches) {
          const title = match[1].trim();
          if (title && !tracks.some(t => t.title === title)) {
            tracks.push({ title });
          }
          if (tracks.length >= 50) break;
        }
      }

      // Pattern 3: Look in embedded JSON
      if (tracks.length === 0) {
        const songMatches = html.matchAll(/"name"\s*:\s*"([^"]+)"\s*,\s*"@type"\s*:\s*"MusicRecording"/gi);
        for (const match of songMatches) {
          if (!tracks.some(t => t.title === match[1])) {
            tracks.push({ title: match[1] });
          }
          if (tracks.length >= 50) break;
        }
      }

    } else if (platform === 'deezer') {
      // Deezer - try multiple patterns
      // Pattern 1: __DZR_APP_STATE__ JSON
      const stateMatch = html.match(/__DZR_APP_STATE__\s*=\s*({[\s\S]*?})\s*<\/script>/);
      if (stateMatch) {
        try {
          const data = JSON.parse(stateMatch[1]);
          const songs = data.DATA?.SONGS?.data || data.SONGS?.data || [];
          for (const song of songs) {
            if (song.SNG_TITLE && !tracks.some(t => t.title === song.SNG_TITLE)) {
              tracks.push({
                title: song.SNG_TITLE,
                artist: song.ART_NAME,
              });
            }
            if (tracks.length >= 50) break;
          }
        } catch { /* JSON parse failed */ }
      }

      // Pattern 2: Direct regex for track data
      if (tracks.length === 0) {
        const trackMatches = html.matchAll(/"SNG_TITLE"\s*:\s*"([^"]+)"/gi);
        const artistMatches = html.matchAll(/"ART_NAME"\s*:\s*"([^"]+)"/gi);
        const titles = [...trackMatches].map(m => m[1]);
        const artists = [...artistMatches].map(m => m[1]);

        for (let i = 0; i < Math.min(titles.length, 50); i++) {
          if (!tracks.some(t => t.title === titles[i])) {
            tracks.push({ title: titles[i], artist: artists[i] });
          }
        }
      }

    } else if (platform === 'tidal') {
      // Tidal - try multiple patterns
      // Pattern 1: NEXT_DATA JSON
      const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextDataMatch) {
        try {
          const data = JSON.parse(nextDataMatch[1]);
          const items = data.props?.pageProps?.playlist?.items || [];
          for (const item of items) {
            if (item.item?.title && !tracks.some(t => t.title === item.item.title)) {
              tracks.push({
                title: item.item.title,
                artist: item.item.artists?.[0]?.name,
              });
            }
            if (tracks.length >= 50) break;
          }
        } catch { /* JSON parse failed */ }
      }

      // Pattern 2: Look for track data in page
      if (tracks.length === 0) {
        const trackMatches = html.matchAll(/"title"\s*:\s*"([^"]+)"\s*,\s*"artists"/gi);
        for (const match of trackMatches) {
          if (!tracks.some(t => t.title === match[1])) {
            tracks.push({ title: match[1] });
          }
          if (tracks.length >= 50) break;
        }
      }

    } else if (platform === 'amazon-music') {
      // Amazon Music - try to find track data
      const trackMatches = html.matchAll(/"title"\s*:\s*"([^"]+)"\s*,\s*"artistName"\s*:\s*"([^"]+)"/gi);
      for (const match of trackMatches) {
        if (!tracks.some(t => t.title === match[1])) {
          tracks.push({ title: match[1], artist: match[2] });
        }
        if (tracks.length >= 50) break;
      }

    } else {
      // Generic fallback: look for common patterns
      const patterns = [
        /<meta\s+property="music:song"\s+content="([^"]+)"/gi,
        /"trackName"\s*:\s*"([^"]+)"/gi,
        /"songName"\s*:\s*"([^"]+)"/gi,
      ];

      for (const pattern of patterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          if (!tracks.some(t => t.title === match[1])) {
            tracks.push({ title: match[1] });
          }
          if (tracks.length >= 50) break;
        }
        if (tracks.length > 0) break;
      }
    }
  } catch {
    // Scraping failed - return empty or partial results
  }

  return tracks;
}

// Get tracks from Spotify playlist directly
async function getSpotifyPlaylistTracksInfo(
  playlistId: string,
  token: string
): Promise<{ tracks: (SpotifyTrack & { isLiked: boolean })[]; name: string }> {
  try {
    const response = await getSpotifyPlaylistTracks(playlistId, token, 50);
    const tracks = response.items
      .filter(item => item.track !== null)
      .map(item => item.track as SpotifyTrack);

    // Check liked status
    const trackIds = tracks.map(t => t.id);
    let likedStatus: boolean[] = [];
    if (trackIds.length > 0) {
      likedStatus = await checkSavedTracks(trackIds, token);
    }

    return {
      tracks: tracks.map((track, i) => ({ ...track, isLiked: likedStatus[i] || false })),
      name: 'Spotify Playlist',
    };
  } catch {
    return { tracks: [], name: '' };
  }
}

export const POST = withBodyApiHandler<ImportPlaylistRequestBody>(
  async ({ token, headers, logger, body }) => {
    const { url } = body;

    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      logger.info(400);
      return errorResponse('Missing input. Provide a playlist URL or paste a list of tracks.', 400);
    }

    const input = url.trim();
    let importedTracks: ImportedTrack[] = [];
    let playlistName = '';
    let platform = 'text';

    // Check if input is a plain text track list
    if (isTextTrackList(input)) {
      const textTracks = parseTextTracks(input);

      if (!textTracks || textTracks.length === 0) {
        logger.info(400);
        return errorResponse('Could not parse track list. Try format: "Artist - Title" (one per line)', 400);
      }

      // Search Spotify for each track
      const searchResults = await Promise.all(
        textTracks.slice(0, 50).map(async (info) => {
          const searchQuery = info.artist
            ? `${info.title} ${info.artist}`
            : info.title;

          try {
            const result = await searchTracks(searchQuery, token, 1);
            const track = result.tracks.items[0] || null;

            if (track) {
              const [isLiked] = await checkSavedTracks([track.id], token);
              return {
                originalTitle: info.title,
                originalArtist: info.artist,
                spotifyTrack: { ...track, isLiked },
                status: 'found' as const,
              };
            }

            return {
              originalTitle: info.title,
              originalArtist: info.artist,
              spotifyTrack: null,
              status: 'not_found' as const,
            };
          } catch {
            return {
              originalTitle: info.title,
              originalArtist: info.artist,
              spotifyTrack: null,
              status: 'not_found' as const,
            };
          }
        })
      );

      importedTracks = searchResults;
      playlistName = 'Text Import';
      platform = 'text';
    } else {
      // Try to parse as URL with SSRF protection
      const urlValidation = validateExternalUrl(input);
      if (!urlValidation.valid) {
        logger.info(400);
        return errorResponse(urlValidation.error!, 400);
      }

      const parsed = parsePlaylistUrl(input);
      if (!parsed) {
        logger.info(400);
        return errorResponse('Not a valid playlist URL. Supported: YouTube, Spotify, SoundCloud, Deezer, Apple Music, Tidal, Amazon Music. Or paste a list of tracks (one per line).', 400);
      }

      platform = parsed.platform;

      // Handle Spotify playlists directly (no scraping needed)
      if (parsed.platform === 'spotify') {
        const result = await getSpotifyPlaylistTracksInfo(parsed.playlistId, token);
        playlistName = result.name;

        importedTracks = result.tracks.map(track => ({
          originalTitle: track.name,
          originalArtist: track.artists[0]?.name,
          spotifyTrack: track,
          status: 'found' as const,
        }));
      } else {
        // For other platforms, scrape and search
        let trackInfos: PlaylistTrackInfo[] = [];

        if (parsed.platform === 'youtube') {
          const isYouTubeMusic = parsed.url.includes('music.youtube.com');
          trackInfos = await getYouTubePlaylistTracks(parsed.playlistId, isYouTubeMusic);
        } else {
          trackInfos = await getPagePlaylistTracks(parsed.url, parsed.platform);
        }

        if (trackInfos.length === 0) {
          logger.info(400);
          return errorResponse('Could not extract tracks from this playlist. The playlist may be private or empty.', 400);
        }

        // Search Spotify for each track (limit concurrent requests)
        const searchResults = await Promise.all(
          trackInfos.slice(0, 50).map(async (info) => {
            const searchQuery = info.artist
              ? `${info.title} ${info.artist}`
              : info.title;

            try {
              const result = await searchTracks(searchQuery, token, 1);
              const track = result.tracks.items[0] || null;

              if (track) {
                const [isLiked] = await checkSavedTracks([track.id], token);
                return {
                  originalTitle: info.title,
                  originalArtist: info.artist,
                  spotifyTrack: { ...track, isLiked },
                  status: 'found' as const,
                };
              }

              return {
                originalTitle: info.title,
                originalArtist: info.artist,
                spotifyTrack: null,
                status: 'not_found' as const,
              };
            } catch {
              return {
                originalTitle: info.title,
                originalArtist: info.artist,
                spotifyTrack: null,
                status: 'not_found' as const,
              };
            }
          })
        );

        importedTracks = searchResults;
      }
    }

    const foundCount = importedTracks.filter(t => t.status === 'found').length;
    const totalCount = importedTracks.length;

    logger.info(200);
    return new Response(
      JSON.stringify({
        platform,
        playlistName,
        tracks: importedTracks,
        summary: {
          total: totalCount,
          found: foundCount,
          notFound: totalCount - foundCount,
        },
      }),
      { headers }
    );
  },
  {
    path: '/api/import-playlist',
    method: 'POST',
    rateLimit: RATE_LIMIT.IMPORT_URL,
  }
);
