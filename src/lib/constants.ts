/**
 * Application-wide constants and configuration values
 * Centralizes magic numbers and configuration for maintainability
 */

// =============================================================================
// Rate Limiting
// =============================================================================

export const RATE_LIMIT = {
  /** Default time window for rate limiting in milliseconds */
  DEFAULT_WINDOW_MS: 60 * 1000, // 1 minute

  /** Default max requests per window */
  DEFAULT_MAX_REQUESTS: 60,

  /** Rate limit for search endpoint */
  SEARCH: { windowMs: 60 * 1000, maxRequests: 60 },

  /** Rate limit for like/unlike operations (stricter for write ops) */
  LIKE: { windowMs: 60 * 1000, maxRequests: 30 },

  /** Rate limit for playlist operations */
  PLAYLIST: { windowMs: 60 * 1000, maxRequests: 30 },

  /** Rate limit for now-playing (allows frequent polling) */
  NOW_PLAYING: { windowMs: 60 * 1000, maxRequests: 120 },

  /** Rate limit for suggestions */
  SUGGESTIONS: { windowMs: 60 * 1000, maxRequests: 30 },

  /** Rate limit for user profile */
  ME: { windowMs: 60 * 1000, maxRequests: 30 },

  /** Rate limit for URL import */
  IMPORT_URL: { windowMs: 60 * 1000, maxRequests: 30 },

  /** Cleanup interval for expired rate limit entries */
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
} as const;

// =============================================================================
// Polling Intervals
// =============================================================================

export const POLLING = {
  /** Interval for fetching currently playing track (ms) */
  NOW_PLAYING_INTERVAL_MS: 5000,

  /** Interval for progress bar updates (ms) */
  PROGRESS_UPDATE_INTERVAL_MS: 1000,
} as const;

// =============================================================================
// UI Constants
// =============================================================================

export const UI = {
  /** Maximum number of recent actions to display */
  MAX_RECENT_ACTIONS: 20,

  /** Maximum number of search history items to store */
  MAX_SEARCH_HISTORY: 10,

  /** Timeout for multi-click detection (easter egg) in ms */
  MULTI_CLICK_TIMEOUT_MS: 2000,

  /** Number of clicks to trigger easter egg */
  EASTER_EGG_CLICK_COUNT: 3,

  /** Default audio volume for previews (0-1) */
  DEFAULT_AUDIO_VOLUME: 0.5,

  /** Maximum number of suggestions to display in main suggestions grid */
  MAX_SUGGESTIONS_GRID: 5,

  /** Maximum number of suggestions in sidebar */
  MAX_SUGGESTIONS_SIDEBAR: 4,

  /** Maximum number of suggestions returned by API */
  MAX_SUGGESTIONS_API: 10,

  /** Maximum number of seed tracks for suggestions */
  MAX_SEED_TRACKS: 2,
} as const;

// =============================================================================
// Validation
// =============================================================================

export const VALIDATION = {
  /** Maximum length for search queries */
  MAX_SEARCH_QUERY_LENGTH: 200,

  /** Length of Spotify IDs (tracks, playlists, artists) */
  SPOTIFY_ID_LENGTH: 22,

  /** Regex pattern for Spotify IDs */
  SPOTIFY_ID_PATTERN: /^[a-zA-Z0-9]{22}$/,

  /** Regex pattern for Spotify track URIs */
  SPOTIFY_TRACK_URI_PATTERN: /^spotify:track:[a-zA-Z0-9]{22}$/,
} as const;

// =============================================================================
// API Timeouts
// =============================================================================

export const TIMEOUTS = {
  /** Timeout for external API calls (e.g., YouTube oEmbed) in ms */
  EXTERNAL_API_MS: 5000,
} as const;

// =============================================================================
// Cookie Configuration
// =============================================================================

export const COOKIES = {
  /** Access token cookie name */
  ACCESS_TOKEN: 'spotify_access_token',

  /** Refresh token cookie name */
  REFRESH_TOKEN: 'spotify_refresh_token',

  /** Auth state cookie name (CSRF protection) */
  AUTH_STATE: 'spotify_auth_state',

  /** Auth state expiry in seconds */
  AUTH_STATE_MAX_AGE: 10 * 60, // 10 minutes

  /** Refresh token expiry in seconds */
  REFRESH_TOKEN_MAX_AGE: 60 * 60 * 24 * 30, // 30 days
} as const;

// =============================================================================
// Local Storage Keys
// =============================================================================

export const STORAGE_KEYS = {
  /** Search history storage key */
  SEARCH_HISTORY: 'spotify_search_history',

  /** Cookie consent storage key */
  COOKIE_CONSENT: 'cookie_consent',

  /** Analytics opt-out storage key */
  ANALYTICS_OPT_OUT: 'analytics_opt_out',
} as const;

// =============================================================================
// API Paths
// =============================================================================

export const API_PATHS = {
  SEARCH: '/api/search',
  LIKE: '/api/like',
  PLAYLISTS: '/api/playlists',
  PLAYLIST_ADD: '/api/playlist/add',
  NOW_PLAYING: '/api/now-playing',
  SUGGESTIONS: '/api/suggestions',
  ME: '/api/me',
  IMPORT_URL: '/api/import-url',
  HEALTH: '/api/health',
  AUTH_LOGIN: '/api/auth/login',
  AUTH_CALLBACK: '/api/auth/callback',
  AUTH_LOGOUT: '/api/auth/logout',
} as const;
