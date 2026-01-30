// Default app URL - can be changed in settings
const DEFAULT_APP_URL = 'http://127.0.0.1:4321';

// URL patterns that can be imported
const IMPORT_URL_PATTERNS = [
  /^https?:\/\/(open\.)?spotify\.com\//i,
  /^https?:\/\/music\.apple\.com\//i,
  /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i,
  /^https?:\/\/tidal\.com\//i,
  /^https?:\/\/deezer\.com\//i,
  /^https?:\/\/soundcloud\.com\//i,
];

function isImportableUrl(url) {
  return IMPORT_URL_PATTERNS.some(pattern => pattern.test(url));
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
 * Sanitize user input for URL parameters
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text
 */
function sanitizeInput(text) {
  if (!text || typeof text !== 'string') return '';
  // Trim and limit length to prevent DoS
  return text.trim().slice(0, 2000);
}

// Create context menus on install
chrome.runtime.onInstalled.addListener(() => {
  // Search for selected text
  chrome.contextMenus.create({
    id: 'spillover-search',
    title: 'Search "%s" on Spillover',
    contexts: ['selection']
  });

  // Import a link (only shown for music service links)
  chrome.contextMenus.create({
    id: 'spillover-import',
    title: 'Import to Spillover',
    contexts: ['link']
  });

  // Search from page (when nothing is selected)
  chrome.contextMenus.create({
    id: 'spillover-page',
    title: 'Search page title on Spillover',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const result = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  const appUrl = isValidAppUrl(result.appUrl) ? result.appUrl : DEFAULT_APP_URL;

  if (info.menuItemId === 'spillover-search' && info.selectionText) {
    const sanitized = sanitizeInput(info.selectionText);
    if (sanitized) {
      const searchUrl = `${appUrl}?q=${encodeURIComponent(sanitized)}`;
      chrome.tabs.create({ url: searchUrl });
    }
  }

  if (info.menuItemId === 'spillover-import' && info.linkUrl) {
    // Check if it's an importable URL
    if (isImportableUrl(info.linkUrl)) {
      const importUrl = `${appUrl}?url=${encodeURIComponent(info.linkUrl)}`;
      chrome.tabs.create({ url: importUrl });
    } else {
      // Fall back to using the URL as search
      const searchUrl = `${appUrl}?q=${encodeURIComponent(info.linkUrl)}`;
      chrome.tabs.create({ url: searchUrl });
    }
  }

  if (info.menuItemId === 'spillover-page' && tab) {
    // Use page title for search, or URL if title is empty
    const searchQuery = sanitizeInput(tab.title || tab.url || '');
    if (searchQuery) {
      const searchUrl = `${appUrl}?q=${encodeURIComponent(searchQuery)}`;
      chrome.tabs.create({ url: searchUrl });
    }
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Validate sender is from our extension
  if (!sender.id || sender.id !== chrome.runtime.id) {
    sendResponse({ error: 'Invalid sender' });
    return true;
  }

  // Validate request structure
  if (!request || typeof request !== 'object' || typeof request.action !== 'string') {
    sendResponse({ error: 'Invalid request' });
    return true;
  }

  if (request.action === 'getAppUrl') {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: 'Storage error', appUrl: DEFAULT_APP_URL });
      } else {
        sendResponse({ appUrl: result.appUrl || DEFAULT_APP_URL });
      }
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'setAppUrl') {
    const newUrl = request.appUrl;
    // Validate the URL before saving
    if (!isValidAppUrl(newUrl)) {
      sendResponse({ success: false, error: 'Invalid URL format' });
      return true;
    }
    chrome.storage.sync.set({ appUrl: newUrl }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: 'Storage error' });
      } else {
        sendResponse({ success: true });
      }
    });
    return true;
  }

  // Unknown action
  sendResponse({ error: 'Unknown action' });
  return true;
});
