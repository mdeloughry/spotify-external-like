/**
 * Fuzzy search utilities for generating alternative search queries
 * when exact matches fail or return few results.
 */

// Common noise words to remove from search queries
const NOISE_WORDS = [
  // Video-related
  'official', 'video', 'audio', 'music video', 'mv', 'lyric', 'lyrics',
  'lyric video', 'official video', 'official audio', 'official music video',
  // Quality indicators
  'hd', 'hq', '4k', '1080p', '720p', 'high quality', 'hi-fi', 'hifi',
  // Live/version indicators
  'live', 'live version', 'live performance', 'acoustic', 'acoustic version',
  'remix', 'remixed', 'remaster', 'remastered', 'extended', 'extended mix',
  'radio edit', 'single version', 'album version',
  // Platform-specific
  'visualizer', 'visualiser', 'animated', 'premiere', 'vevo',
  // Brackets content often contains noise
  'full song', 'full track', 'new song', 'new music',
  // Common suffixes
  'prod by', 'prod.', 'produced by', 'feat', 'feat.', 'featuring', 'ft', 'ft.',
];

// Regex patterns to clean up queries
const CLEANUP_PATTERNS = [
  // Remove content in brackets/parentheses that's likely noise
  /\s*\([^)]*(?:official|video|audio|lyric|hd|hq|4k|live|remix|remaster|visuali)[^)]*\)\s*/gi,
  /\s*\[[^\]]*(?:official|video|audio|lyric|hd|hq|4k|live|remix|remaster|visuali)[^\]]*\]\s*/gi,
  // Remove year in parentheses/brackets at end
  /\s*[\(\[]?\d{4}[\)\]]?\s*$/g,
  // Remove featuring artists for simpler search
  /\s*(?:feat\.?|ft\.?|featuring)\s+.+$/gi,
  // Remove "- Topic" suffix (YouTube auto-generated channels)
  /\s*-\s*Topic\s*$/gi,
  // Remove excessive whitespace
  /\s+/g,
];

/**
 * Clean a search query by removing noise words and patterns
 */
export function cleanSearchQuery(query: string): string {
  let cleaned = query.toLowerCase();

  // Apply regex patterns
  for (const pattern of CLEANUP_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Remove noise words (as whole words only)
  for (const word of NOISE_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, ' ');
  }

  // Clean up whitespace and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Extract potential artist and track from common patterns
 */
export function extractArtistAndTrack(query: string): { artist?: string; track?: string } {
  const cleaned = cleanSearchQuery(query);

  // Common patterns: "Artist - Track", "Artist: Track", "Artist | Track"
  const separators = [' - ', ' – ', ' — ', ': ', ' | '];

  for (const sep of separators) {
    if (cleaned.includes(sep)) {
      const parts = cleaned.split(sep);
      if (parts.length >= 2) {
        return {
          artist: parts[0].trim(),
          track: parts.slice(1).join(sep).trim(),
        };
      }
    }
  }

  return {};
}

/**
 * Generate alternative search suggestions for a query
 */
export function generateSearchSuggestions(originalQuery: string): string[] {
  const suggestions: string[] = [];
  const seen = new Set<string>();

  const addSuggestion = (s: string) => {
    const normalized = s.toLowerCase().trim();
    if (normalized && normalized !== originalQuery.toLowerCase().trim() && !seen.has(normalized)) {
      seen.add(normalized);
      suggestions.push(s.trim());
    }
  };

  // 1. Clean version of the query
  const cleaned = cleanSearchQuery(originalQuery);
  if (cleaned.length >= 3) {
    addSuggestion(cleaned);
  }

  // 2. Try extracting artist and track
  const { artist, track } = extractArtistAndTrack(originalQuery);
  if (artist && track) {
    // Try "artist track" without separator
    addSuggestion(`${artist} ${track}`);
    // Try just the track name
    if (track.length >= 3) {
      addSuggestion(track);
    }
    // Try just the artist name
    if (artist.length >= 3) {
      addSuggestion(artist);
    }
  }

  // 3. Remove everything after common separators
  const simpleSeparators = [' (', ' [', ' |', ' -'];
  for (const sep of simpleSeparators) {
    const idx = originalQuery.indexOf(sep);
    if (idx > 3) {
      const before = originalQuery.substring(0, idx).trim();
      if (before.length >= 3) {
        addSuggestion(cleanSearchQuery(before));
      }
    }
  }

  // 4. If query has multiple words, try first N words
  const words = cleaned.split(' ').filter(w => w.length > 0);
  if (words.length > 3) {
    // Try first 3 words
    addSuggestion(words.slice(0, 3).join(' '));
    // Try first 2 words
    addSuggestion(words.slice(0, 2).join(' '));
  }

  // Limit to 4 suggestions max
  return suggestions.slice(0, 4);
}

/**
 * Check if the original query likely needs fuzzy matching
 * (contains noise words or patterns)
 */
export function queryNeedsCleaning(query: string): boolean {
  const lower = query.toLowerCase();

  // Check for noise words
  for (const word of NOISE_WORDS.slice(0, 20)) { // Check most common ones
    if (lower.includes(word)) {
      return true;
    }
  }

  // Check for bracketed content
  if (/[\(\[]/.test(query)) {
    return true;
  }

  return false;
}
