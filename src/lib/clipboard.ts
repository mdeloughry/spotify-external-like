/**
 * Clipboard utilities for copying text to clipboard with fallback support
 */

export interface ClipboardResult {
  success: boolean;
  error?: string;
}

/**
 * Copy text to clipboard with fallback for older browsers
 * @param text - The text to copy to clipboard
 * @returns Promise resolving to success status
 */
export async function copyToClipboard(text: string): Promise<ClipboardResult> {
  if (!text) {
    return { success: false, error: 'No text provided' };
  }

  try {
    // Modern clipboard API
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return { success: true };
    }

    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (success) {
      return { success: true };
    }
    return { success: false, error: 'execCommand failed' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown clipboard error';
    return { success: false, error: message };
  }
}

/**
 * Copy a Spotify track URL to clipboard
 * @param trackUrl - The Spotify track URL
 * @returns Promise resolving to success status
 */
export async function copyTrackUrl(trackUrl: string | undefined): Promise<ClipboardResult> {
  if (!trackUrl) {
    return { success: false, error: 'No track URL available' };
  }
  return copyToClipboard(trackUrl);
}
