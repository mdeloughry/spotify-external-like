/**
 * URL Parser with Open/Closed principle using registry pattern
 * Easy to add new platforms without modifying existing code
 */

export interface ParsedUrl {
  platform: string;
  query: string;
}

export interface PlatformParser {
  /** Platform identifier */
  readonly platform: string;
  /** Check if this parser handles the given URL */
  match(url: URL): boolean;
  /** Parse the URL and extract the query */
  parse(url: URL): string | null;
}

// =============================================================================
// Platform Parsers
// =============================================================================

class YouTubeParser implements PlatformParser {
  readonly platform = 'youtube';

  match(url: URL): boolean {
    const hostname = url.hostname.toLowerCase();
    return (
      hostname === 'youtu.be' ||
      hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname.endsWith('.youtube.com')
    );
  }

  parse(url: URL): string | null {
    const hostname = url.hostname.toLowerCase();
    // youtu.be/VIDEO_ID
    if (hostname === 'youtu.be') {
      const videoId = url.pathname.slice(1).split('?')[0];
      return videoId || null;
    }

    // Prefer standard watch URLs with ?v=VIDEO_ID
    const queryVideoId = url.searchParams.get('v');
    if (queryVideoId) {
      return queryVideoId;
    }

    // Handle path-based formats: /embed/VIDEO_ID, /v/VIDEO_ID, /shorts/VIDEO_ID
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      const [first, second] = segments;
      if ((first === 'embed' || first === 'shorts' || first === 'v') && second) {
        return second.split('?')[0];
      }
    }

    return null;
  }
}

class SoundCloudParser implements PlatformParser {
  readonly platform = 'soundcloud';

  match(url: URL): boolean {
    const hostname = url.hostname.toLowerCase();
    return hostname === 'soundcloud.com' || hostname.endsWith('.soundcloud.com');
  }

  parse(url: URL): string | null {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      // Format: /artist/track-name -> "artist track-name"
      return parts.join(' ').replace(/-/g, ' ');
    }
    return null;
  }
}

class SpotifyUrlParser implements PlatformParser {
  readonly platform = 'spotify';

  match(url: URL): boolean {
    const hostname = url.hostname.toLowerCase();
    return hostname === 'spotify.com' || hostname.endsWith('.spotify.com');
  }

  parse(url: URL): string | null {
    // open.spotify.com/track/TRACK_ID (Spotify IDs are exactly 22 alphanumeric chars)
    const match = url.pathname.match(/track\/([a-zA-Z0-9]{22})/);
    return match ? match[1] : null;
  }
}

// =============================================================================
// Registry
// =============================================================================

const parsers: PlatformParser[] = [
  new YouTubeParser(),
  new SoundCloudParser(),
  new SpotifyUrlParser(),
];

/**
 * Register a new platform parser
 * @param parser - The parser to register
 */
export function registerParser(parser: PlatformParser): void {
  // Add to beginning so custom parsers take precedence
  parsers.unshift(parser);
}

/**
 * Remove a parser by platform name
 * @param platform - The platform name to remove
 */
export function unregisterParser(platform: string): void {
  const index = parsers.findIndex((p) => p.platform === platform);
  if (index !== -1) {
    parsers.splice(index, 1);
  }
}

/**
 * Get all registered parsers
 */
export function getParsers(): readonly PlatformParser[] {
  return parsers;
}

// =============================================================================
// Main Parse Function
// =============================================================================

/**
 * Parse a URL and extract platform and query information
 * @param url - The URL string to parse
 * @returns Parsed URL info or null if not supported
 */
export function parseTrackUrl(url: string): ParsedUrl | null {
  try {
    const urlObj = new URL(url);

    for (const parser of parsers) {
      if (parser.match(urlObj)) {
        const query = parser.parse(urlObj);
        if (query) {
          return { platform: parser.platform, query };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is from a supported platform
 * @param url - The URL string to check
 */
export function isSupportedUrl(url: string): boolean {
  return parseTrackUrl(url) !== null;
}

/**
 * Get list of supported platforms
 */
export function getSupportedPlatforms(): string[] {
  return parsers.map((p) => p.platform);
}
