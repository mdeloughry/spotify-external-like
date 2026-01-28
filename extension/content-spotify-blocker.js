// Blocks Spotify desktop deep links on open.spotify.com when enabled via settings
// Behaviour is controlled by the `blockSpotifyDeepLinks` flag in chrome.storage.sync.

const BLOCK_SETTING_KEY = 'blockSpotifyDeepLinks';

function shouldBlockDeepLinks(callback) {
  chrome.storage.sync.get({ [BLOCK_SETTING_KEY]: false }, (result) => {
    callback(Boolean(result[BLOCK_SETTING_KEY]));
  });
}

function installDeepLinkGuards() {
  // Guard against click-based navigations to spotify: URLs
  document.addEventListener(
    'click',
    (event) => {
      const anchor = event.target && event.target.closest
        ? event.target.closest('a[href]')
        : null;
      if (!anchor) return;

      const href = anchor.getAttribute('href') || '';
      if (href.startsWith('spotify:')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  // Guard against window.open('spotify:...')
  const originalOpen = window.open;
  window.open = function (url, ...rest) {
    try {
      if (typeof url === 'string' && url.startsWith('spotify:')) {
        return null;
      }
    } catch (e) {
      // Ignore and fall through to original
    }
    return originalOpen.apply(window, [url, ...rest]);
  };
}

// Initial install based on current setting
shouldBlockDeepLinks((enabled) => {
  if (enabled) {
    installDeepLinkGuards();
  }
});

// React to setting changes without reload
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'sync') return;
  if (!Object.prototype.hasOwnProperty.call(changes, BLOCK_SETTING_KEY)) return;

  const { newValue } = changes[BLOCK_SETTING_KEY];
  if (newValue) {
    // Enabling: install guards (no-op if already installed, as listeners/wrappers are idempotent enough)
    installDeepLinkGuards();
  } else {
    // Disabling mid-page is not robustly reversible (cannot easily restore original listeners),
    // so we simply stop installing new guards; a page reload fully disables behaviour.
  }
});

