/**
 * Playlist URL Parser
 * Detects and parses playlist URLs from various music platforms
 */

export interface ParsedPlaylistUrl {
  platform: string;
  playlistId: string;
  url: string;
}

interface PlaylistParser {
  platform: string;
  match(url: URL): boolean;
  parse(url: URL): string | null;
}

// YouTube Playlist Parser
const youtubePlaylistParser: PlaylistParser = {
  platform: 'youtube',
  match(url: URL): boolean {
    const hostname = url.hostname.toLowerCase();
    const isYouTube = hostname === 'youtube.com' ||
      hostname === 'www.youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'music.youtube.com';
    // Check for playlist parameter or /playlist path
    return isYouTube && (
      url.searchParams.has('list') ||
      url.pathname.includes('/playlist')
    );
  },
  parse(url: URL): string | null {
    return url.searchParams.get('list');
  },
};

// SoundCloud Set/Playlist Parser
const soundcloudPlaylistParser: PlaylistParser = {
  platform: 'soundcloud',
  match(url: URL): boolean {
    const hostname = url.hostname.toLowerCase();
    const isSoundCloud = hostname === 'soundcloud.com' || hostname.endsWith('.soundcloud.com');
    // SoundCloud playlists/sets: /artist/sets/playlist-name
    return isSoundCloud && url.pathname.includes('/sets/');
  },
  parse(url: URL): string | null {
    // Return the full URL for fetching
    return url.href;
  },
};

// Spotify Playlist Parser
const spotifyPlaylistParser: PlaylistParser = {
  platform: 'spotify',
  match(url: URL): boolean {
    const hostname = url.hostname.toLowerCase();
    return (hostname === 'open.spotify.com' || hostname.endsWith('.spotify.com')) &&
      url.pathname.includes('/playlist/');
  },
  parse(url: URL): string | null {
    const match = url.pathname.match(/playlist\/([a-zA-Z0-9]{22})/);
    return match ? match[1] : null;
  },
};

// Deezer Playlist Parser
const deezerPlaylistParser: PlaylistParser = {
  platform: 'deezer',
  match(url: URL): boolean {
    const hostname = url.hostname.toLowerCase();
    return (hostname === 'deezer.com' || hostname.endsWith('.deezer.com')) &&
      url.pathname.includes('/playlist/');
  },
  parse(url: URL): string | null {
    const match = url.pathname.match(/playlist\/(\d+)/);
    return match ? match[1] : null;
  },
};

// Apple Music Playlist Parser
const appleMusicPlaylistParser: PlaylistParser = {
  platform: 'apple-music',
  match(url: URL): boolean {
    const hostname = url.hostname.toLowerCase();
    return hostname === 'music.apple.com' && url.pathname.includes('/playlist/');
  },
  parse(url: URL): string | null {
    // Apple Music playlist URLs: /xx/playlist/name/pl.xxxxxx
    // Return full URL for page scraping
    return url.href;
  },
};

// Tidal Playlist Parser
const tidalPlaylistParser: PlaylistParser = {
  platform: 'tidal',
  match(url: URL): boolean {
    const hostname = url.hostname.toLowerCase();
    return (hostname === 'tidal.com' || hostname === 'listen.tidal.com') &&
      url.pathname.includes('/playlist/');
  },
  parse(url: URL): string | null {
    // Tidal playlist URLs: /browse/playlist/xxxxx-xxxx-xxxx
    const match = url.pathname.match(/playlist\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  },
};

// Amazon Music Playlist Parser
const amazonMusicPlaylistParser: PlaylistParser = {
  platform: 'amazon-music',
  match(url: URL): boolean {
    const hostname = url.hostname.toLowerCase();
    const isAmazonMusic = hostname === 'music.amazon.com' ||
      hostname.endsWith('.music.amazon.com') ||
      (hostname.includes('amazon.') && url.pathname.includes('/music/'));
    return isAmazonMusic && (
      url.pathname.includes('/playlists/') ||
      url.pathname.includes('/user-playlists/')
    );
  },
  parse(url: URL): string | null {
    return url.href;
  },
};

const playlistParsers: PlaylistParser[] = [
  youtubePlaylistParser,
  soundcloudPlaylistParser,
  spotifyPlaylistParser,
  deezerPlaylistParser,
  appleMusicPlaylistParser,
  tidalPlaylistParser,
  amazonMusicPlaylistParser,
];

/**
 * Parse a URL to check if it's a playlist URL
 */
export function parsePlaylistUrl(urlString: string): ParsedPlaylistUrl | null {
  try {
    const url = new URL(urlString);

    for (const parser of playlistParsers) {
      if (parser.match(url)) {
        const playlistId = parser.parse(url);
        if (playlistId) {
          return {
            platform: parser.platform,
            playlistId,
            url: urlString,
          };
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a playlist URL
 */
export function isPlaylistUrl(urlString: string): boolean {
  return parsePlaylistUrl(urlString) !== null;
}

/**
 * Get supported playlist platforms
 */
export function getSupportedPlaylistPlatforms(): string[] {
  return playlistParsers.map(p => p.platform);
}

/** Represents a track parsed from plain text input */
export interface ParsedTextTrack {
  /** Track title */
  title: string;
  /** Artist name if provided */
  artist?: string;
}

/**
 * Parse plain text input containing track listings
 * Supports formats:
 * - "Artist - Title"
 * - "Title by Artist"
 * - "Title"
 * - CSV format with headers (artist,title or title,artist)
 * @param text - The text input to parse
 * @returns Array of parsed tracks, or null if not valid text track list
 */
export function parseTextTracks(text: string): ParsedTextTrack[] | null {
  const lines = text
    .split(/[\n\r]+/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));

  if (lines.length === 0) {
    return null;
  }

  // Check if first line looks like CSV headers
  const firstLine = lines[0].toLowerCase();
  const hasHeaders = firstLine.includes('artist') && firstLine.includes('title');

  const tracks: ParsedTextTrack[] = [];
  const startIndex = hasHeaders ? 1 : 0;

  // Determine column order if CSV with headers
  let artistFirst = false;
  if (hasHeaders) {
    const headers = firstLine.split(/[,\t;|]/);
    const artistIndex = headers.findIndex(h => h.trim().includes('artist'));
    const titleIndex = headers.findIndex(h => h.trim().includes('title'));
    artistFirst = artistIndex < titleIndex;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines and common non-track content
    if (!line || line.length < 2) continue;
    if (/^(track|song|#|\d+\.)?\s*$/i.test(line)) continue;

    let title: string | undefined;
    let artist: string | undefined;

    // Try CSV format (comma, tab, semicolon, or pipe separated)
    if (/[,\t;|]/.test(line) && hasHeaders) {
      const parts = line.split(/[,\t;|]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2) {
        if (artistFirst) {
          artist = parts[0] || undefined;
          title = parts[1] || undefined;
        } else {
          title = parts[0] || undefined;
          artist = parts[1] || undefined;
        }
      } else if (parts.length === 1) {
        title = parts[0];
      }
    }
    // Try "Artist - Title" format (most common)
    else if (line.includes(' - ')) {
      const dashIndex = line.indexOf(' - ');
      artist = line.substring(0, dashIndex).trim();
      title = line.substring(dashIndex + 3).trim();
    }
    // Try "Title by Artist" format
    else if (/ by /i.test(line)) {
      const match = line.match(/^(.+?)\s+by\s+(.+)$/i);
      if (match) {
        title = match[1].trim();
        artist = match[2].trim();
      }
    }
    // Try "Artist: Title" format
    else if (line.includes(': ')) {
      const colonIndex = line.indexOf(': ');
      artist = line.substring(0, colonIndex).trim();
      title = line.substring(colonIndex + 2).trim();
    }
    // Just a title
    else {
      // Remove common prefixes like "1.", "1)", "- ", etc.
      title = line.replace(/^(\d+[.):\-]\s*|-\s*)/, '').trim();
    }

    // Clean up the parsed values
    if (title) {
      // Remove common suffixes like "(Official Video)", "[Lyrics]", etc.
      title = title
        .replace(/\s*[\(\[]?(Official|Lyric|Music)?\s*(Video|Audio|Lyrics|HD|HQ|4K)?[\)\]]?\s*$/gi, '')
        .replace(/\s*[\(\[].*?(remix|edit|version|mix).*?[\)\]]\s*$/gi, (match) => match) // Keep remix info
        .trim();

      if (title.length > 0) {
        tracks.push({ title, artist: artist || undefined });
      }
    }
  }

  // Return null if we couldn't parse any tracks
  return tracks.length > 0 ? tracks : null;
}

/**
 * Check if input looks like a plain text track list rather than a URL
 * @param input - The user input to check
 * @returns true if input appears to be a text track list
 */
export function isTextTrackList(input: string): boolean {
  // If it's a valid URL, it's not a text list
  try {
    new URL(input);
    return false;
  } catch {
    // Not a URL, continue checking
  }

  // Check if it has multiple lines or common track list patterns
  const lines = input.split(/[\n\r]+/).filter(l => l.trim().length > 0);

  // Single line with " - " could be one track
  if (lines.length === 1 && input.includes(' - ')) {
    return true;
  }

  // Multiple lines suggest a track list
  if (lines.length >= 2) {
    return true;
  }

  return false;
}
