import { useState, useCallback } from 'react';
import { captureError } from '../lib/error-tracking';

interface UseApiRequestOptions<T> {
  /** API endpoint URL */
  url: string;
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Context for error tracking */
  errorContext?: Record<string, unknown>;
  /** Transform response before returning */
  transform?: (data: unknown) => T;
  /** Called on successful request */
  onSuccess?: (data: T) => void;
  /** Called on error (after PostHog tracking) */
  onError?: (error: Error) => void;
}

interface UseApiRequestReturn<T> {
  /** Execute the request */
  execute: (body?: unknown) => Promise<T | null>;
  /** Response data */
  data: T | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Reset state */
  reset: () => void;
}

/**
 * Hook for making API requests with built-in error tracking to PostHog
 */
export function useApiRequest<T = unknown>({
  url,
  method = 'GET',
  errorContext = {},
  transform,
  onSuccess,
  onError,
}: UseApiRequestOptions<T>): UseApiRequestReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (body?: unknown): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Request failed: ${response.status}`);
      }

      const result = transform ? transform(responseData) : responseData as T;
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const errorMessage = error.message;

      setError(errorMessage);

      // Track error with PostHog
      captureError(error, {
        ...errorContext,
        url,
        method,
      });

      onError?.(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [url, method, errorContext, transform, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    execute,
    data,
    isLoading,
    error,
    reset,
  };
}

/**
 * Simplified wrapper for one-off API calls with error tracking
 * Returns a function that makes the request when called
 */
export function useTrackedFetch() {
  return useCallback(async <T = unknown>(
    url: string,
    options: RequestInit = {},
    context: Record<string, unknown> = {}
  ): Promise<T> => {
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed: ${response.status}`);
      }

      return data as T;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      captureError(error, {
        ...context,
        url,
        method: options.method || 'GET',
      });
      throw error;
    }
  }, []);
}
