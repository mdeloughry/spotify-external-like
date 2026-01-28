import { useState, useEffect } from 'react';

const CHOICE_KEY = 'spillover_analytics_choice_made';
const OPTOUT_KEY = 'spillover_analytics_optout';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't made a choice yet
    const choiceMade = localStorage.getItem(CHOICE_KEY);
    if (!choiceMade) {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CHOICE_KEY, 'true');
    localStorage.removeItem(OPTOUT_KEY);
    setVisible(false);
    // Reload to initialize analytics if they weren't loaded
    if (!(window as any).posthog) {
      window.location.reload();
    }
  };

  const handleDecline = () => {
    localStorage.setItem(CHOICE_KEY, 'true');
    localStorage.setItem(OPTOUT_KEY, 'true');
    setVisible(false);
    // If PostHog is loaded, opt out
    if ((window as any).posthog) {
      (window as any).posthog.opt_out_capturing();
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-slide-up">
      <div className="max-w-2xl mx-auto bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl shadow-[0_0_40px_rgba(139,92,246,0.3)] p-[2px]">
        <div className="bg-[#1a1625] rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-white font-semibold">Help us improve Spillover</p>
              </div>
              <p className="text-gray-300 text-sm">
                We use anonymous analytics to understand how the app is used. No personal data, no IP tracking.{' '}
                <a href="/privacy" className="text-purple-300 hover:text-purple-200 underline underline-offset-2">Privacy Policy</a>
              </p>
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={handleDecline}
                className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              >
                No thanks
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-semibold bg-white text-gray-900 rounded-xl hover:bg-gray-100 transition-all shadow-lg"
              >
                Allow analytics
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
