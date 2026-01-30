/**
 * PostHog type declarations for window object
 * Eliminates need for `any` type casting
 */

interface PostHogInstance {
  opt_out_capturing: () => void;
  opt_in_capturing: () => void;
  has_opted_out_capturing: () => boolean;
  capture: (event: string, properties?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    posthog?: PostHogInstance;
  }
}

export {};
