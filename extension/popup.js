const DEFAULT_APP_URL = 'http://127.0.0.1:4321';

async function checkConnection(url) {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  statusDot.className = 'status-dot checking';
  statusText.textContent = 'Checking connection...';

  try {
    const response = await fetch(`${url}/api/health`, {
      method: 'GET',
      mode: 'cors'
    });

    if (response.ok) {
      const data = await response.json();
      if (data.app === 'spillover') {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'Connected to Spillover';
        return true;
      }
    }
    throw new Error('Invalid response');
  } catch (err) {
    statusDot.className = 'status-dot error';
    statusText.textContent = 'Not connected';
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('search');
  const searchBtn = document.getElementById('searchBtn');
  const appUrlInput = document.getElementById('appUrl');
  const savedIndicator = document.getElementById('saved');

  // Load saved app URL
  const result = await chrome.storage.sync.get({ appUrl: DEFAULT_APP_URL });
  appUrlInput.value = result.appUrl;

  // Check connection on load
  checkConnection(result.appUrl);

  // Handle search
  const performSearch = () => {
    const query = searchInput.value.trim();
    if (!query) return;

    const appUrl = appUrlInput.value.trim() || DEFAULT_APP_URL;
    const searchUrl = `${appUrl}?q=${encodeURIComponent(query)}`;
    chrome.tabs.create({ url: searchUrl });
    window.close();
  };

  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      performSearch();
    }
  });

  // Save app URL on change and recheck connection
  let saveTimeout;
  appUrlInput.addEventListener('input', () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
      const newUrl = appUrlInput.value.trim() || DEFAULT_APP_URL;
      await chrome.storage.sync.set({ appUrl: newUrl });
      savedIndicator.classList.add('show');
      setTimeout(() => savedIndicator.classList.remove('show'), 2000);
      checkConnection(newUrl);
    }, 500);
  });

  // Focus search input
  searchInput.focus();
});
