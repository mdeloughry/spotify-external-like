const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  uri: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  preview_url: string | null;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  images: SpotifyImage[];
  owner: {
    id: string;
    display_name: string;
  };
  tracks: {
    total: number;
  };
}

export interface SearchResponse {
  tracks: {
    items: SpotifyTrack[];
    total: number;
    limit: number;
    offset: number;
  };
}

export interface PlaylistsResponse {
  items: SpotifyPlaylist[];
  total: number;
  limit: number;
  offset: number;
}

async function spotifyFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Spotify API error: ${response.status}`);
  }

  // Some endpoints return 200/204 with no content
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text);
}

export async function searchTracks(
  query: string,
  token: string,
  limit = 20
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    type: 'track',
    limit: limit.toString(),
  });
  return spotifyFetch<SearchResponse>(`/search?${params}`, token);
}

export async function saveTrack(trackId: string, token: string): Promise<void> {
  await spotifyFetch<void>('/me/tracks', token, {
    method: 'PUT',
    body: JSON.stringify({ ids: [trackId] }),
  });
}

export async function removeTrack(trackId: string, token: string): Promise<void> {
  await spotifyFetch<void>('/me/tracks', token, {
    method: 'DELETE',
    body: JSON.stringify({ ids: [trackId] }),
  });
}

export async function checkSavedTracks(
  trackIds: string[],
  token: string
): Promise<boolean[]> {
  const params = new URLSearchParams({
    ids: trackIds.join(','),
  });
  return spotifyFetch<boolean[]>(`/me/tracks/contains?${params}`, token);
}

export async function getPlaylists(
  token: string,
  limit = 50
): Promise<PlaylistsResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
  });
  return spotifyFetch<PlaylistsResponse>(`/me/playlists?${params}`, token);
}

export async function addToPlaylist(
  playlistId: string,
  trackUri: string,
  token: string
): Promise<void> {
  await spotifyFetch<{ snapshot_id: string }>(`/playlists/${playlistId}/tracks`, token, {
    method: 'POST',
    body: JSON.stringify({ uris: [trackUri] }),
  });
}

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export interface ArtistTopTracksResponse {
  tracks: SpotifyTrack[];
}

export async function getArtistTopTracks(
  artistId: string,
  token: string,
  market = 'US'
): Promise<ArtistTopTracksResponse> {
  const params = new URLSearchParams({ market });
  return spotifyFetch<ArtistTopTracksResponse>(`/artists/${artistId}/top-tracks?${params}`, token);
}

export interface RelatedArtistsResponse {
  artists: Array<{
    id: string;
    name: string;
    genres: string[];
  }>;
}

export async function getRelatedArtists(
  artistId: string,
  token: string
): Promise<RelatedArtistsResponse> {
  return spotifyFetch<RelatedArtistsResponse>(`/artists/${artistId}/related-artists`, token);
}

// Extract track info from various URL formats
export function parseTrackUrl(url: string): { platform: string; query: string } | null {
  try {
    const urlObj = new URL(url);

    // YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      // Extract video title from URL if possible, otherwise return the video ID
      const videoId = urlObj.hostname.includes('youtu.be')
        ? urlObj.pathname.slice(1)
        : urlObj.searchParams.get('v');
      if (videoId) {
        return { platform: 'youtube', query: videoId };
      }
    }

    // SoundCloud
    if (urlObj.hostname.includes('soundcloud.com')) {
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        // Format: /artist/track-name -> "artist track-name"
        return { platform: 'soundcloud', query: parts.join(' ').replace(/-/g, ' ') };
      }
    }

    // Spotify (in case someone pastes a Spotify URL)
    if (urlObj.hostname.includes('spotify.com')) {
      const match = urlObj.pathname.match(/track\/([a-zA-Z0-9]+)/);
      if (match) {
        return { platform: 'spotify', query: match[1] };
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function getTrackById(trackId: string, token: string): Promise<SpotifyTrack> {
  return spotifyFetch<SpotifyTrack>(`/tracks/${trackId}`, token);
}

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  email?: string;
  images: SpotifyImage[];
  uri: string;
  external_urls: {
    spotify: string;
  };
}

export async function getCurrentUser(token: string): Promise<SpotifyUser> {
  return spotifyFetch<SpotifyUser>('/me', token);
}

export interface CurrentlyPlaying {
  is_playing: boolean;
  progress_ms: number | null;
  item: SpotifyTrack | null;
  currently_playing_type: 'track' | 'episode' | 'ad' | 'unknown';
}

export async function getCurrentlyPlaying(token: string): Promise<CurrentlyPlaying | null> {
  try {
    const response = await fetch(`${SPOTIFY_API_BASE}/me/player/currently-playing`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 204 means nothing is playing
    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}
