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

  // Some endpoints return 200/204 with no content
  const text = await response.text();

  if (!response.ok) {
    // Try to parse error as JSON, but handle non-JSON responses
    let errorMessage = `Spotify API error: ${response.status}`;
    if (text) {
      try {
        const error = JSON.parse(text);
        errorMessage = error.error?.message || errorMessage;
      } catch {
        // Response is not JSON, use status text
        errorMessage = `Spotify API error: ${response.status} ${response.statusText}`;
      }
    }
    throw new Error(errorMessage);
  }

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

/**
 * Save multiple tracks to Liked Songs (max 50 at a time)
 * @param trackIds - Array of track IDs to save
 * @param token - The access token
 */
export async function saveTracks(trackIds: string[], token: string): Promise<void> {
  // Spotify API allows max 50 IDs per request
  const chunks: string[][] = [];
  for (let i = 0; i < trackIds.length; i += 50) {
    chunks.push(trackIds.slice(i, i + 50));
  }

  await Promise.all(
    chunks.map(chunk =>
      spotifyFetch<void>('/me/tracks', token, {
        method: 'PUT',
        body: JSON.stringify({ ids: chunk }),
      })
    )
  );
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

/**
 * Get the best album image URL for a given size preference
 * Spotify returns images in different sizes: large (640), medium (300), small (64)
 * @param album - The Spotify album object
 * @param preferredSize - The preferred image size
 * @returns The image URL or null if no images available
 */
export function getAlbumImageUrl(
  album: SpotifyAlbum,
  preferredSize: 'small' | 'medium' | 'large' = 'medium'
): string | null {
  if (!album.images || album.images.length === 0) {
    return null;
  }

  // Spotify typically returns images in order: large, medium, small
  // Index mapping: large = 0, medium = 1, small = 2
  const sizeIndexMap = { large: 0, medium: 1, small: 2 };
  const preferredIndex = sizeIndexMap[preferredSize];

  // Try to get preferred size, fall back to next available
  return (
    album.images[preferredIndex]?.url ||
    album.images[0]?.url ||
    null
  );
}

/**
 * Format artists array into a comma-separated string
 * @param artists - Array of Spotify artist objects
 * @returns Comma-separated artist names
 */
export function formatArtists(artists: SpotifyArtist[]): string {
  return artists.map((a) => a.name).join(', ');
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

/** Response from Spotify recommendations endpoint */
export interface RecommendationsResponse {
  /** Recommended tracks */
  tracks: SpotifyTrack[];
  /** Seeds used for recommendations */
  seeds: Array<{
    id: string;
    type: 'track' | 'artist' | 'genre';
    initialPoolSize: number;
    afterFilteringSize: number;
    afterRelinkingSize: number;
  }>;
}

/**
 * Get track recommendations based on seed tracks, artists, or genres
 * Up to 5 seed values total across all types
 * @param options - Recommendation options
 * @param token - The access token
 */
export async function getRecommendations(
  options: {
    seedTracks?: string[];
    seedArtists?: string[];
    seedGenres?: string[];
    limit?: number;
    market?: string;
  },
  token: string
): Promise<RecommendationsResponse> {
  const params = new URLSearchParams();

  if (options.seedTracks?.length) {
    params.set('seed_tracks', options.seedTracks.slice(0, 5).join(','));
  }
  if (options.seedArtists?.length) {
    params.set('seed_artists', options.seedArtists.slice(0, 5).join(','));
  }
  if (options.seedGenres?.length) {
    params.set('seed_genres', options.seedGenres.slice(0, 5).join(','));
  }
  params.set('limit', (options.limit || 20).toString());
  params.set('market', options.market || 'US');

  return spotifyFetch<RecommendationsResponse>(`/recommendations?${params}`, token);
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

export interface PlaylistTracksResponse {
  items: Array<{
    track: SpotifyTrack | null;
    added_at: string;
  }>;
  total: number;
  limit: number;
  offset: number;
  next: string | null;
}

/**
 * Get tracks from a playlist
 * @param playlistId - The Spotify playlist ID
 * @param token - The access token
 * @param limit - Max tracks to fetch (default 100)
 */
export async function getPlaylistTracks(
  playlistId: string,
  token: string,
  limit = 100
): Promise<PlaylistTracksResponse> {
  const params = new URLSearchParams({
    limit: Math.min(limit, 100).toString(),
    fields: 'items(track(id)),total,limit,offset,next',
  });
  return spotifyFetch<PlaylistTracksResponse>(`/playlists/${playlistId}/tracks?${params}`, token);
}

/**
 * Check if a track exists in a playlist
 * @param playlistId - The Spotify playlist ID
 * @param trackId - The track ID to check
 * @param token - The access token
 * @returns true if the track is in the playlist
 */
export async function isTrackInPlaylist(
  playlistId: string,
  trackId: string,
  token: string
): Promise<boolean> {
  // Fetch first 100 tracks and check
  // For very large playlists, this might miss tracks beyond 100
  // but it's a reasonable trade-off for performance
  const response = await getPlaylistTracks(playlistId, token, 100);
  return response.items.some(item => item.track?.id === trackId);
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

/** Playback state response from Spotify */
export interface PlaybackState {
  /** The device currently playing */
  device: {
    id: string;
    name: string;
    type: string;
    is_active: boolean;
    is_restricted: boolean;
    volume_percent: number;
  } | null;
  /** Whether playback is active */
  is_playing: boolean;
  /** Currently playing track */
  item: SpotifyTrack | null;
  /** Playback progress in ms */
  progress_ms: number | null;
  /** Shuffle state */
  shuffle_state: boolean;
  /** Repeat state */
  repeat_state: 'off' | 'track' | 'context';
}

/**
 * Get current playback state including active device
 * @param token - The access token
 * @returns Playback state or null if no active session
 */
export async function getPlaybackState(token: string): Promise<PlaybackState | null> {
  try {
    const response = await fetch(`${SPOTIFY_API_BASE}/me/player`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 204 means no active device
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

/**
 * Add a track to the user's playback queue
 * Requires an active playback session
 * @param trackUri - The Spotify track URI (spotify:track:xxx)
 * @param token - The access token
 */
export async function addToQueue(trackUri: string, token: string): Promise<void> {
  const params = new URLSearchParams({ uri: trackUri });
  await spotifyFetch<void>(`/me/player/queue?${params}`, token, {
    method: 'POST',
  });
}

/**
 * Start playing a track immediately
 * Requires an active playback session
 * @param trackUri - The Spotify track URI (spotify:track:xxx)
 * @param token - The access token
 * @param deviceId - Optional device ID to play on
 */
export async function playTrack(
  trackUri: string,
  token: string,
  deviceId?: string
): Promise<void> {
  const params = deviceId ? new URLSearchParams({ device_id: deviceId }) : '';
  await spotifyFetch<void>(`/me/player/play${params ? `?${params}` : ''}`, token, {
    method: 'PUT',
    body: JSON.stringify({ uris: [trackUri] }),
  });
}
