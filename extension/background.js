// Default app URL - can be changed in settings
const DEFAULT_APP_URL = 'http://127.0.0.1:4321';

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'spillover-search',
    title: 'Search on Spillover',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'spillover-import',
    title: 'Import to Spillover',
    contexts: ['link']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const { appUrl } = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });

  if (info.menuItemId === 'spillover-search' && info.selectionText) {
    // Open app with search query
    const searchUrl = `${appUrl}?q=${encodeURIComponent(info.selectionText.trim())}`;
    chrome.tabs.create({ url: searchUrl });
  }

  if (info.menuItemId === 'spillover-import' && info.linkUrl) {
    // Open app with URL to import
    const importUrl = `${appUrl}?url=${encodeURIComponent(info.linkUrl)}`;
    chrome.tabs.create({ url: importUrl });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAppUrl') {
    chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL }, (result) => {
      sendResponse({ appUrl: result.appUrl });
    });
    return true; // Keep channel open for async response
  }

  if (request.action === 'setAppUrl') {
    chrome.storage.sync.set({ appUrl: request.appUrl }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
