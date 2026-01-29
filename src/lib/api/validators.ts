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
