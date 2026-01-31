import { useState, useCallback } from 'react';
import { captureError } from '../lib/error-tracking';

interface UseLikeToggleOptions {
  /** Initial liked state */
  initialIsLiked: boolean;
  /** Track ID for API calls */
  trackId: string;
  /** Track name for error context */
  trackName?: string;
  /** Callback after successful toggle */
  onSuccess?: (isLiked: boolean) => void;
}

interface UseLikeToggleReturn {
  /** Current liked state */
  isLiked: boolean;
  /** Whether the toggle operation is in progress */
  isLoading: boolean;
  /** Toggle the liked state */
  toggle: () => Promise<void>;
  /** Set liked state directly (for external updates) */
  setIsLiked: (isLiked: boolean) => void;
}

/**
 * Hook to manage like/unlike toggle state with API integration and error tracking
 */
export function useLikeToggle({
  initialIsLiked,
  trackId,
  trackName,
  onSuccess,
}: UseLikeToggleOptions): UseLikeToggleReturn {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isLoading, setIsLoading] = useState(false);

  const toggle = useCallback(async () => {
    const newIsLiked = !isLiked;
    setIsLoading(true);

    try {
      const method = newIsLiked ? 'POST' : 'DELETE';
      const response = await fetch('/api/like', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update like status');
      }

      setIsLiked(newIsLiked);
      onSuccess?.(newIsLiked);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      captureError(error, {
        action: 'like_toggle',
        trackId,
        trackName,
        attemptedState: newIsLiked,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isLiked, trackId, trackName, onSuccess]);

  return {
    isLiked,
    isLoading,
    toggle,
    setIsLiked,
  };
}
