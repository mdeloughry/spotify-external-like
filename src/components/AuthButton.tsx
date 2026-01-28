import { useEffect, useState, useRef, useCallback } from 'react';

const CHOICE_KEY = 'spillover_analytics_choice_made';
const OPTOUT_KEY = 'spillover_analytics_optout';

interface SpotifyUser {
  id: string;
  display_name: string | null;
  images: { url: string; height: number; width: number }[];
}

interface AuthButtonProps {
  isAuthenticated: boolean;
}

export default function AuthButton({ isAuthenticated }: AuthButtonProps) {
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/me')
        .then((res) => res.ok ? res.json() : null)
        .then((data) => setUser(data))
        .catch(() => setUser(null));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Check existing preference
    const optedOut = localStorage.getItem(OPTOUT_KEY) === 'true';
    setAnalyticsEnabled(!optedOut);
  }, []);

  // Handle escape key and focus trap for login modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowLoginModal(false);
      return;
    }

    // Focus trap
    if (e.key === 'Tab' && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (!showLoginModal) return;

    // Store previously focused element
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // Focus the cancel button when modal opens
    cancelButtonRef.current?.focus();

    // Add keyboard listener
    document.addEventListener('keydown', handleKeyDown);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      // Restore focus when modal closes
      previouslyFocusedElement.current?.focus();
    };
  }, [showLoginModal, handleKeyDown]);

  const handleLoginClick = (e: React.MouseEvent) => {
    // If user has already made a choice, go directly to login
    const choiceMade = localStorage.getItem(CHOICE_KEY);
    if (choiceMade) {
      return; // Let the link navigate normally
    }
    e.preventDefault();
    setShowLoginModal(true);
  };

  const handleContinueToLogin = () => {
    // Save analytics preference
    localStorage.setItem(CHOICE_KEY, 'true');
    if (!analyticsEnabled) {
      localStorage.setItem(OPTOUT_KEY, 'true');
    } else {
      localStorage.removeItem(OPTOUT_KEY);
    }
    // Navigate to login
    window.location.href = '/api/auth/login';
  };

  if (isAuthenticated) {
    const avatarUrl = user?.images?.[0]?.url;
    const displayName = user?.display_name || 'User';

    return (
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${displayName}'s profile picture`}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-spotify-gray flex items-center justify-center" aria-hidden="true">
            <svg className="w-4 h-4 text-spotify-lightgray" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        )}
        <a
          href="/api/auth/logout"
          className="px-4 py-2 text-sm font-medium text-spotify-lightgray hover:text-white transition-colors"
        >
          Logout
        </a>
      </div>
    );
  }

  return (
    <>
      <a
        href="/api/auth/login"
        onClick={handleLoginClick}
        className="inline-flex items-center gap-2 px-6 py-3 bg-spotify-green text-black font-bold rounded-full hover:bg-spotify-green/90 hover:scale-105 transition-all"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
        Connect Spotify
      </a>

      {/* Login Modal with Analytics Choice */}
      {showLoginModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          aria-describedby="login-modal-description"
          onClick={(e) => e.target === e.currentTarget && setShowLoginModal(false)}
        >
          <div
            ref={dialogRef}
            className="bg-spotify-darkgray border border-spotify-gray/30 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-spotify-green/20 rounded-full flex items-center justify-center" aria-hidden="true">
                <svg className="w-6 h-6 text-spotify-green" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
              </div>
              <div>
                <h3 id="login-modal-title" className="text-white font-bold text-lg">Connect to Spotify</h3>
                <p id="login-modal-description" className="text-spotify-lightgray text-sm">Save tracks to your library</p>
              </div>
            </div>

            {/* What we access */}
            <div className="bg-spotify-gray/10 rounded-lg p-4 mb-4">
              <p className="text-xs text-spotify-lightgray mb-2">Spillover will be able to:</p>
              <ul className="space-y-1 text-sm text-white" aria-label="Permissions required">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  View and modify your Liked Songs
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  View and add to your playlists
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-spotify-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  See what's currently playing
                </li>
              </ul>
            </div>

            {/* Analytics Toggle */}
            <div className="bg-spotify-gray/10 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-white font-medium text-sm">Anonymous Analytics</p>
                  <p className="text-spotify-lightgray text-xs mt-0.5">
                    Help improve Spillover (no personal data)
                  </p>
                </div>
                <button
                  onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-spotify-green focus:ring-offset-2 focus:ring-offset-spotify-darkgray ${
                    analyticsEnabled ? 'bg-spotify-green' : 'bg-spotify-gray/50'
                  }`}
                  role="switch"
                  aria-checked={analyticsEnabled}
                  aria-label="Toggle analytics"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      analyticsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                ref={cancelButtonRef}
                onClick={() => setShowLoginModal(false)}
                className="flex-1 px-4 py-3 text-sm font-medium text-spotify-lightgray hover:text-white border border-spotify-gray/30 rounded-full hover:border-spotify-gray/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContinueToLogin}
                className="flex-1 px-4 py-3 text-sm font-bold bg-spotify-green text-black rounded-full hover:bg-spotify-green/90 transition-colors"
              >
                Continue
              </button>
            </div>

            {/* Privacy link */}
            <p className="text-center text-xs text-spotify-lightgray mt-4">
              By continuing, you agree to our{' '}
              <a href="/privacy" className="text-spotify-green hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
