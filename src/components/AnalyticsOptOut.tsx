import { useState, useEffect } from 'react';

const CHOICE_KEY = 'spillover_analytics_choice_made';
const OPTOUT_KEY = 'spillover_analytics_optout';

export default function AnalyticsOptOut() {
  const [optedOut, setOptedOut] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(OPTOUT_KEY);
    setOptedOut(stored === 'true');
  }, []);

  const handleToggle = () => {
    const newValue = !optedOut;
    setOptedOut(newValue);

    // Mark that user has made a choice (hides the cookie banner)
    localStorage.setItem(CHOICE_KEY, 'true');

    if (newValue) {
      localStorage.setItem(OPTOUT_KEY, 'true');
      // If PostHog is loaded, opt out
      if (typeof window !== 'undefined' && (window as any).posthog) {
        (window as any).posthog.opt_out_capturing();
      }
    } else {
      localStorage.removeItem(OPTOUT_KEY);
      // Reload to re-initialize analytics
      window.location.reload();
    }
  };

  // Don't render until we know the state
  if (optedOut === null) {
    return (
      <div className="bg-spotify-gray/10 rounded-lg p-4 border border-spotify-gray/20">
        <div className="h-6 w-32 bg-spotify-gray/20 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-spotify-gray/10 rounded-lg p-4 border border-spotify-gray/20">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-white font-medium text-sm">Anonymous Analytics</p>
          <p className="text-spotify-lightgray text-xs mt-1">
            {optedOut
              ? "Analytics are disabled. No data is being collected."
              : "Help improve Spillover with anonymous usage data."}
          </p>
        </div>
        <button
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-spotify-green focus:ring-offset-2 focus:ring-offset-spotify-black ${
            optedOut ? 'bg-spotify-gray/50' : 'bg-spotify-green'
          }`}
          role="switch"
          aria-checked={!optedOut}
          aria-label="Toggle analytics"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              optedOut ? 'translate-x-1' : 'translate-x-6'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
