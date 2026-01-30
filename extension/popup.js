const DEFAULT_APP_URL = 'http://127.0.0.1:4321';
const MAX_RECENT_SEARCHES = 5;
const CONNECTION_TIMEOUT_MS = 5000;

// URL patterns that should trigger import mode
const IMPORT_URL_PATTERNS = [
  /^https?:\/\/(open\.)?spotify\.com\//i,
  /^https?:\/\/music\.apple\.com\//i,
  /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i,
  /^https?:\/\/tidal\.com\//i,
  /^https?:\/\/deezer\.com\//i,
  /^https?:\/\/soundcloud\.com\//i,
];

function isImportableUrl(text) {
  if (!text) return false;
  const trimmed = text.trim();
  return IMPORT_URL_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Validate that a URL is safe and well-formed
 * @param {string} url - URL to validate
 * @returns {boolean} - True if URL is valid
 */
function isValidAppUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    // Only allow http/https protocols
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Safely parse a URL, returning null if invalid
 * @param {string} url - URL to parse
 * @returns {URL|null} - Parsed URL or null
 */
function safeParseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

async function checkConnection(url) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  statusDot.className = 'status-dot checking';
  statusText.textContent = 'Checking connection...';

  // Validate URL before fetching
  if (!isValidAppUrl(url)) {
    statusDot.className = 'status-dot error';
    statusText.textContent = 'Invalid URL format';
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONNECTION_TIMEOUT_MS);

  try {
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Invalid JSON response');
      }
      if (data.app === 'spillover') {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Connected to Spillover';
        return true;
      }
    }
    throw new Error('Invalid response');
  } catch (err) {
    clearTimeout(timeoutId);
    statusDot.className = 'status-dot error';
    statusText.textContent = err.name === 'AbortError' ? 'Connection timeout' : 'Not connected';
    return false;
  }
}

async function getRecentSearches() {
  try {
    const result = await chrome.storage.local.get({ recentSearches: [] });
    // Validate the structure of retrieved data
    if (!Array.isArray(result.recentSearches)) {
      return [];
    }
    return result.recentSearches.filter(s =>
      s && typeof s === 'object' && typeof s.query === 'string'
    );
  } catch {
    return [];
  }
}

async function addRecentSearch(query) {
  if (!query || typeof query !== 'string' || query.length < 2) return;

  try {
    const searches = await getRecentSearches();
    // Remove if already exists (to move to top)
    const filtered = searches.filter(s => s.query !== query);
    // Add to front
    filtered.unshift({ query, isLink: isImportableUrl(query), timestamp: Date.now() });
    // Keep only recent ones
    const trimmed = filtered.slice(0, MAX_RECENT_SEARCHES);
    await chrome.storage.local.set({ recentSearches: trimmed });
  } catch {
    // Silently fail - not critical
  }
}

function renderRecentSearches(searches, container, onSelect) {
  const wrapper = document.getElementById('recentSearches');
  container.innerHTML = '';

  if (!searches || searches.length === 0) {
    wrapper.style.display = 'none';
    return;
  }

  wrapper.style.display = 'block';

  searches.forEach(({ query, isLink }) => {
    const item = document.createElement('div');
    item.className = 'recent-item' + (isLink ? ' is-link' : '');

    // Safely extract hostname for links
    if (isLink) {
      const parsed = safeParseUrl(query);
      item.textContent = parsed ? '🔗 ' + parsed.hostname : query;
    } else {
      item.textContent = query;
    }

    item.title = query;
    item.addEventListener('click', () => onSelect(query));
    container.appendChild(item);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('search');
  const searchBtn = document.getElementById('searchBtn');
  const appUrlInput = document.getElementById('appUrl');
  const savedIndicator = document.getElementById('saved');
  const blockDeepLinksToggle = document.getElementById('blockDeepLinksToggle');
  const recentList = document.getElementById('recentList');

  // Load saved app URL and deep-link blocking preference
  let result;
  try {
    result = await chrome.storage.sync.get({
      appUrl: DEFAULT_APP_URL,
      blockSpotifyDeepLinks: false
    });
  } catch {
    result = { appUrl: DEFAULT_APP_URL, blockSpotifyDeepLinks: false };
  }

  appUrlInput.value = result.appUrl;

  // Load and render recent searches
  const recentSearches = await getRecentSearches();
  renderRecentSearches(recentSearches, recentList, (query) => {
    searchInput.value = query;
    updateButtonState(query);
    searchInput.focus();
  });

  // Initialise toggle UI state (default off)
  const applyToggleState = (enabled) => {
    if (enabled) {
      blockDeepLinksToggle.classList.add('checked');
      blockDeepLinksToggle.setAttribute('aria-checked', 'true');
    } else {
      blockDeepLinksToggle.classList.remove('checked');
      blockDeepLinksToggle.setAttribute('aria-checked', 'false');
    }
  };
  applyToggleState(Boolean(result.blockSpotifyDeepLinks));

  // Check connection on load
  checkConnection(result.appUrl);

  // Update button text based on input
  const updateButtonState = (value) => {
    const isLink = isImportableUrl(value);
    searchBtn.textContent = isLink ? 'Import' : 'Search';
    if (isLink) {
      searchBtn.classList.add('import-mode');
    } else {
      searchBtn.classList.remove('import-mode');
    }
  };

  // Handle search/import
  const performAction = async () => {
    const query = searchInput.value.trim();
    if (!query) return;

    const appUrl = appUrlInput.value.trim() || DEFAULT_APP_URL;

    // Validate app URL before navigating
    if (!isValidAppUrl(appUrl)) {
      alert('Invalid app URL. Please enter a valid URL starting with http:// or https://');
      return;
    }

    const isLink = isImportableUrl(query);

    // Save to recent searches
    await addRecentSearch(query);

    // Open appropriate URL
    const targetUrl = isLink
      ? `${appUrl}?url=${encodeURIComponent(query)}`
      : `${appUrl}?q=${encodeURIComponent(query)}`;

    chrome.tabs.create({ url: targetUrl });
    window.close();
  };

  searchBtn.addEventListener('click', performAction);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      performAction();
    }
  });

  // Update button state as user types
  searchInput.addEventListener('input', () => {
    updateButtonState(searchInput.value);
  });

  // Save app URL on change and recheck connection
  let saveTimeout;
  appUrlInput.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const newUrl = appUrlInput.value.trim() || DEFAULT_APP_URL;

      // Validate before saving
      if (!isValidAppUrl(newUrl)) {
        savedIndicator.textContent = 'Invalid URL';
        savedIndicator.style.color = '#f97373';
        savedIndicator.classList.add('show');
        setTimeout(() => {
          savedIndicator.classList.remove('show');
          savedIndicator.textContent = 'Saved';
          savedIndicator.style.color = '#4ade80';
        }, 2000);
        return;
      }

      try {
        await chrome.storage.sync.set({ appUrl: newUrl });
        savedIndicator.classList.add('show');
        setTimeout(() => savedIndicator.classList.remove('show'), 2000);
        checkConnection(newUrl);
      } catch {
        // Silently fail
      }
    }, 500);
  });

  // Handle deep-link blocking toggle
  const toggleBlockDeepLinks = () => {
    const currentlyEnabled = blockDeepLinksToggle.classList.contains('checked');
    const nextEnabled = !currentlyEnabled;
    applyToggleState(nextEnabled);
    try {
      chrome.storage.sync.set({ blockSpotifyDeepLinks: nextEnabled });
    } catch {
      // Silently fail
    }
  };

  blockDeepLinksToggle.addEventListener('click', toggleBlockDeepLinks);
  blockDeepLinksToggle.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleBlockDeepLinks();
    }
  });

  // Focus search input
  searchInput.focus();
});
