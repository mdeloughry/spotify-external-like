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
