// Error tracking utilities for PostHog integration

declare global {
  interface Window {
    posthog?: {
      captureException: (error: Error | string, properties?: Record<string, unknown>) => void;
      capture: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}

/**
 * Capture an error to PostHog (if configured and user has opted in)
 *
 * Note: This respects the user's analytics opt-out preference automatically.
 * When users opt out via the privacy settings, PostHog's opt_out_capturing()
 * is called, which prevents all captures including error tracking.
 */
export function captureError(error: Error | string, context?: Record<string, unknown>): void {
  try {
    if (typeof window !== 'undefined' && window.posthog?.captureException) {
      window.posthog.captureException(error, {
        ...context,
        timestamp: new Date().toISOString(),
      });
    }
    // Always log to console in development
    if (import.meta.env.DEV) {
      console.error('[Error]', error, context);
    }
  } catch {
    // Silently fail if PostHog is not available
    if (import.meta.env.DEV) {
      console.error('[Error]', error, context);
    }
  }
}

/**
 * Capture a custom event to PostHog
 */
export function captureEvent(eventName: string, properties?: Record<string, unknown>): void {
  try {
    if (typeof window !== 'undefined' && window.posthog?.capture) {
      window.posthog.capture(eventName, properties);
    }
  } catch {
    // Silently fail
  }
}

/**
 * Wrapper for async functions that captures errors
 */
export async function withErrorCapture<T>(
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    captureError(error instanceof Error ? error : String(error), context);
    throw error;
  }
}
