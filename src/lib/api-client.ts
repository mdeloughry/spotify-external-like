/**
 * Typed API client for frontend components
 * Centralizes API calls and provides type safety
 */

import type { SpotifyTrack, SpotifyPlaylist, SpotifyUser, CurrentlyPlaying } from './spotify';
import { API_PATHS } from './constants';

// =============================================================================
// API Error Types
// =============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}

// =============================================================================
// Response Types
// =============================================================================

export interface TrackWithLiked extends SpotifyTrack {
  isLiked: boolean;
}

export interface SearchResponse {
  tracks: TrackWithLiked[];
  total: number;
}

export interface ImportUrlResponse {
  tracks: TrackWithLiked[];
  source: 'youtube' | 'soundcloud' | 'spotify';
  searchQuery: string | null;
}

export interface PlaylistsResponse {
  playlists: SpotifyPlaylist[];
}

export interface NowPlayingResponse {
  playing: boolean;
  is_playing?: boolean;
  progress_ms?: number;
  track?: TrackWithLiked;
}

export interface LikeResponse {
  success: boolean;
  liked: boolean;
}

export interface SuggestionsResponse {
  tracks: TrackWithLiked[];
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
}

export type UserResponse = SpotifyUser;

// =============================================================================
// API Client Implementation
// =============================================================================

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.error || 'Request failed',
      response.status,
      data.code
    );
  }

  return data as T;
}

/**
 * API client with typed methods for all endpoints
 */
export const api = {
  /**
   * Search for tracks
   */
  async search(query: string): Promise<SearchResponse> {
    const response = await fetch(`${API_PATHS.SEARCH}?q=${encodeURIComponent(query)}`);
    return handleResponse<SearchResponse>(response);
  },

  /**
   * Import a track from a URL (YouTube, SoundCloud, Spotify)
   */
  async importUrl(url: string): Promise<ImportUrlResponse> {
    const response = await fetch(API_PATHS.IMPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    return handleResponse<ImportUrlResponse>(response);
  },

  /**
   * Like a track
   */
  async likeTrack(trackId: string): Promise<LikeResponse> {
    const response = await fetch(API_PATHS.LIKE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId }),
    });
    return handleResponse<LikeResponse>(response);
  },

  /**
   * Unlike a track
   */
  async unlikeTrack(trackId: string): Promise<LikeResponse> {
    const response = await fetch(API_PATHS.LIKE, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId }),
    });
    return handleResponse<LikeResponse>(response);
  },

  /**
   * Toggle like status for a track
   */
  async toggleLike(trackId: string, shouldLike: boolean): Promise<LikeResponse> {
    return shouldLike ? this.likeTrack(trackId) : this.unlikeTrack(trackId);
  },

  /**
   * Get user's playlists
   */
  async getPlaylists(): Promise<PlaylistsResponse> {
    const response = await fetch(API_PATHS.PLAYLISTS);
    return handleResponse<PlaylistsResponse>(response);
  },

  /**
   * Add a track to a playlist
   */
  async addToPlaylist(playlistId: string, trackUri: string): Promise<{ success: boolean }> {
    const response = await fetch(API_PATHS.PLAYLIST_ADD, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistId, trackUri }),
    });
    return handleResponse<{ success: boolean }>(response);
  },

  /**
   * Get currently playing track
   */
  async getNowPlaying(): Promise<NowPlayingResponse> {
    const response = await fetch(API_PATHS.NOW_PLAYING);
    return handleResponse<NowPlayingResponse>(response);
  },

  /**
   * Get track suggestions based on a track
   */
  async getSuggestions(trackId: string): Promise<SuggestionsResponse> {
    const response = await fetch(`${API_PATHS.SUGGESTIONS}?seeds=${encodeURIComponent(trackId)}`);
    return handleResponse<SuggestionsResponse>(response);
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserResponse> {
    const response = await fetch(API_PATHS.ME);
    return handleResponse<UserResponse>(response);
  },

  /**
   * Check API health
   */
  async checkHealth(): Promise<HealthResponse> {
    const response = await fetch(API_PATHS.HEALTH);
    return handleResponse<HealthResponse>(response);
  },

  /**
   * Login - redirects to Spotify OAuth
   */
  login(): void {
    window.location.href = API_PATHS.AUTH_LOGIN;
  },

  /**
   * Logout - clears session
   */
  async logout(): Promise<void> {
    await fetch(API_PATHS.AUTH_LOGOUT);
    window.location.href = '/';
  },
};

export default api;
