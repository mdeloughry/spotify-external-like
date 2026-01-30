/**
 * Input validation utilities for API endpoints
 */

import { VALIDATION } from '../constants';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a search query parameter
 * @param query - The search query to validate
 * @returns Validation result
 */
export function validateSearchQuery(query: string | null): ValidationResult {
  if (!query) {
    return { valid: false, error: 'Missing query parameter' };
  }
  if (query.length > VALIDATION.MAX_SEARCH_QUERY_LENGTH) {
    return { valid: false, error: `Query too long (max ${VALIDATION.MAX_SEARCH_QUERY_LENGTH} characters)` };
  }
  if (query.length < 1) {
    return { valid: false, error: 'Query cannot be empty' };
  }
  return { valid: true };
}

/**
 * Validate a Spotify track ID
 * @param trackId - The track ID to validate
 * @returns Validation result
 */
export function validateTrackId(trackId: string | null | undefined): ValidationResult {
  if (!trackId) {
    return { valid: false, error: 'Missing track ID' };
  }
  if (!VALIDATION.SPOTIFY_ID_PATTERN.test(trackId)) {
    return { valid: false, error: 'Invalid track ID format' };
  }
  return { valid: true };
}

/**
 * Validate a Spotify playlist ID
 * @param playlistId - The playlist ID to validate
 * @returns Validation result
 */
export function validatePlaylistId(playlistId: string | null | undefined): ValidationResult {
  if (!playlistId) {
    return { valid: false, error: 'Missing playlist ID' };
  }
  if (!VALIDATION.SPOTIFY_ID_PATTERN.test(playlistId)) {
    return { valid: false, error: 'Invalid playlist ID format' };
  }
  return { valid: true };
}

/**
 * Validate a Spotify track URI
 * @param uri - The track URI to validate
 * @returns Validation result
 */
export function validateTrackUri(uri: string | null | undefined): ValidationResult {
  if (!uri) {
    return { valid: false, error: 'Missing track URI' };
  }
  if (!VALIDATION.SPOTIFY_TRACK_URI_PATTERN.test(uri)) {
    return { valid: false, error: 'Invalid track URI format' };
  }
  return { valid: true };
}

/**
 * Allowed domains for external URL fetching (SSRF protection)
 */
const ALLOWED_DOMAINS = [
  // Spotify
  'open.spotify.com',
  'spotify.com',
  // YouTube
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'music.youtube.com',
  // Apple Music
  'music.apple.com',
  // SoundCloud
  'soundcloud.com',
  'www.soundcloud.com',
  // Deezer
  'deezer.com',
  'www.deezer.com',
  // Tidal
  'tidal.com',
  'www.tidal.com',
  'listen.tidal.com',
  // Bandcamp
  'bandcamp.com',
  // Amazon Music
  'music.amazon.com',
  'amazon.com',
  // Mixcloud
  'mixcloud.com',
  'www.mixcloud.com',
  // Beatport
  'beatport.com',
  'www.beatport.com',
];

/**
 * Private/internal IP ranges that should be blocked (SSRF protection)
 */
const BLOCKED_IP_PATTERNS = [
  /^127\./,                    // Localhost
  /^10\./,                     // Private class A
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private class B
  /^192\.168\./,               // Private class C
  /^169\.254\./,               // Link-local
  /^0\./,                      // Current network
  /^::1$/,                     // IPv6 localhost
  /^fc00:/i,                   // IPv6 private
  /^fe80:/i,                   // IPv6 link-local
];

/**
 * Check if a hostname is a blocked IP address
 */
function isBlockedIp(hostname: string): boolean {
  return BLOCKED_IP_PATTERNS.some(pattern => pattern.test(hostname));
}

/**
 * Validate a URL
 * @param url - The URL to validate
 * @returns Validation result
 */
export function validateUrl(url: string | null | undefined): ValidationResult {
  if (!url) {
    return { valid: false, error: 'Missing URL' };
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Invalid URL protocol' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate a URL for external fetching with SSRF protection
 * @param url - The URL to validate
 * @returns Validation result
 */
export function validateExternalUrl(url: string | null | undefined): ValidationResult {
  if (!url) {
    return { valid: false, error: 'Missing URL' };
  }

  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Invalid URL protocol' };
    }

    // Block private/internal IPs
    if (isBlockedIp(parsed.hostname)) {
      return { valid: false, error: 'URL points to blocked address' };
    }

    // Block localhost variations
    if (parsed.hostname === 'localhost' || parsed.hostname.endsWith('.localhost')) {
      return { valid: false, error: 'URL points to blocked address' };
    }

    // Check against allowed domains
    const hostname = parsed.hostname.toLowerCase();
    const isAllowed = ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );

    if (!isAllowed) {
      return { valid: false, error: 'URL domain not supported for import' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate that a value is a non-empty string
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validation result
 */
export function validateRequiredString(value: unknown, fieldName: string): ValidationResult {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return { valid: false, error: `Missing or invalid ${fieldName}` };
  }
  return { valid: true };
}
