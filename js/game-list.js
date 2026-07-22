// Game list functionality
import {
  loadPlayedStatusFromStorage,
  savePlayedStatusToStorage,
  isGamePlayedInStorage,
} from './lib/storage.js';

let allGames = [];
let playedStatus = {};
let currentFilter = 'all';
let lastKnownIndexTimestamp = null; // Track when index was last updated (version or timestamp)
let lastKnownIndexVersion = null; // Track the version hash from index

/**
 * Helper function to update icon button state while preserving icon
 */
function updateIconButton(button, iconName, text = null) {
  if (!button) return;
  
  // Clear existing content
  button.innerHTML = '';
  
  // Add icon
  const iconElement = document.createElement('i');
  iconElement.setAttribute('data-lucide', iconName);
  button.appendChild(iconElement);
  
  // Add text if provided
  if (text) {
    const textElement = document.createTextNode(' ' + text);
    button.appendChild(textElement);
  }
  
  // Re-initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

/**
 * Helper function to restore icon button to default state
 */
function restoreIconButton(button, iconName) {
  if (!button) return;
  updateIconButton(button, iconName);
  button.disabled = false;
  button.style.opacity = '1';
}

/**
 * Load played status from GitHub or localStorage fallback
 */
async function loadPlayedStatus() {
  if (typeof perfLab !== 'undefined') perfLab.start('loadPlayedStatus');
  playedStatus = loadPlayedStatusFromStorage().games;
  console.log('Loaded played status from localStorage');
  if (typeof perfLab !== 'undefined') perfLab.end('loadPlayedStatus');
}

async function savePlayedStatus() {
  const current = loadPlayedStatusFromStorage();
  current.games = { ...playedStatus };
  savePlayedStatusToStorage(current);
}

/**
 * Load list of available games
 * @param {Object} options - Optional configuration
 * @param {string} options.baseUrl - Base URL for fetching (used for production polling)
 */
async function loadGames(options = {}) {
  const baseUrl = options.baseUrl || '';
  
  // Safely start performance tracking (perfLab might not be loaded)
  if (typeof perfLab !== 'undefined') {
    perfLab.start('loadGames');
  }
  
  try {
    // Get list of game files from the games directory
    // Since we can't list files via fetch, we'll need to maintain an index
    // For now, try to fetch a games index file, or load games individually
    
    // Try to load a games index if it exists
    let gameIds = [];
    try {
      if (typeof perfLab !== 'undefined') perfLab.start('fetchGamesIndex');
      // Add aggressive cache-busting to prevent stale data from Vercel CDN
      // Use multiple cache-busting strategies: timestamp, random, performance counter, and version
      // The version from the index will change when games are added/removed
      const timestamp = Date.now();
      const random = Math.random();
      const perfCounter = performance.now();
      const cacheBuster = `v=${timestamp}&r=${random}&c=${perfCounter}&_=${timestamp}`;
      
      // Use base URL if provided (for production polling), otherwise relative path
      const indexPath = 'data/games/index.json';
      const indexUrl = baseUrl ? `${baseUrl}/${indexPath}?${cacheBuster}` : `${indexPath}?${cacheBuster}`;
      console.log('Fetching index from:', indexUrl);
      const indexResponse = await fetch(indexUrl, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Requested-With': 'XMLHttpRequest' // Some CDNs treat this differently
        }
      });
      console.log('Index response status:', indexResponse.status, indexResponse.statusText);
      if (indexResponse.ok) {
        const index = await indexResponse.json();
        gameIds = index.games || [];
        console.log('Loaded game IDs from index:', gameIds);
        console.log('Index version:', index.version);
        console.log('Index lastUpdated:', index.lastUpdated);
        
        // Clear discovery cache since we have a valid index now
        discoveredGamesCache = null;
        discoveredGamesCacheTime = null;
        
        // Track index version and timestamp to detect changes
        // Set version first
        if (index.version) {
          lastKnownIndexVersion = index.version;
        } else {
          lastKnownIndexVersion = null; // Clear if no version
        }
        
        // Set timestamp (use lastUpdated, or version as fallback)
        if (index.lastUpdated) {
          lastKnownIndexTimestamp = index.lastUpdated;
        } else if (index.version) {
          lastKnownIndexTimestamp = index.version; // Fallback to version if no timestamp
        } else {
          lastKnownIndexTimestamp = null;
        }
        
        // Check if index changed (only if we had a previous value)
        if (lastKnownIndexTimestamp && lastKnownIndexTimestamp !== null) {
          const previousTimestamp = lastKnownIndexTimestamp;
          const previousVersion = lastKnownIndexVersion;
          // Values are already updated above, so we check against stored initial values
          // This check happens in the polling logic, not here
        }
        
        console.log('Set lastKnownIndexVersion:', lastKnownIndexVersion);
        console.log('Set lastKnownIndexTimestamp:', lastKnownIndexTimestamp);
      } else if (indexResponse.status === 404) {
        // Index doesn't exist yet - this is fine, just use empty array
        // Only log once to avoid spam during polling
        if (!window.index404WarningShown) {
          console.log('Games index not found (404) - will use discovery fallback or empty list');
          window.index404WarningShown = true;
        }
        // Don't clear the existing values - keep them so we can detect when index appears
        // But if we never had values, this is the initial state
      } else {
        console.warn('Failed to load games index:', indexResponse.status, indexResponse.statusText);
        // On error, don't clear existing values
      }
      if (typeof perfLab !== 'undefined') perfLab.end('fetchGamesIndex');
    } catch (error) {
      // If no index exists, we'll need to discover games another way
      // For now, we'll try common date patterns or let the user know
      console.log('No games index found', error);
      if (typeof perfLab !== 'undefined') perfLab.end('fetchGamesIndex');
    }
    
    // If we have game IDs, load them
    if (gameIds.length > 0) {
      if (typeof perfLab !== 'undefined') {
        perfLab.start('fetchAllGames');
        perfLab.record('gameCount', gameIds.length);
      }
      
      const gamePromises = gameIds.map((id, index) => {
        if (typeof perfLab !== 'undefined') perfLab.start(`fetchGame-${index}`);
        // Add aggressive cache-busting to prevent stale data from Vercel CDN
        const cacheBuster = `v=${Date.now()}&r=${Math.random()}&c=${performance.now()}`;
        // Use base URL if provided (for production polling), otherwise relative path
        const gamePath = `data/games/${id}.json`;
        const gameUrl = baseUrl ? `${baseUrl}/${gamePath}?${cacheBuster}` : `${gamePath}?${cacheBuster}`;
        return fetch(gameUrl, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        })
          .then(res => {
            if (typeof perfLab !== 'undefined') perfLab.end(`fetchGame-${index}`);
            if (res.ok) {
              return res.json();
            } else if (res.status === 404) {
              // Silently ignore 404s - game doesn't exist
              return null;
            } else {
              // Log other errors but don't spam console
              console.warn(`Failed to fetch game ${id}: ${res.status} ${res.statusText}`);
              return null;
            }
          })
          .catch((err) => {
            // Only log non-404 errors to avoid console spam
            if (err.message && !err.message.includes('404')) {
              console.warn(`Failed to fetch game ${id}:`, err.message);
            }
            if (typeof perfLab !== 'undefined') perfLab.end(`fetchGame-${index}`);
            return null;
          });
      });
      
      const games = await Promise.all(gamePromises);
      if (typeof perfLab !== 'undefined') perfLab.end('fetchAllGames');
      
      if (typeof perfLab !== 'undefined') perfLab.start('sortGames');
      allGames = games.filter(g => g !== null).sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      // Assign game numbers based on sorted order (newest = #1)
      allGames.forEach((game, index) => {
        game.gameNumber = allGames.length - index;
      });
      if (typeof perfLab !== 'undefined') perfLab.end('sortGames');
    } else {
      // Fallback: try to discover games by checking common patterns
      // This is a workaround - ideally we'd have an index file
      // Only log a warning once, not on every poll
      if (!window.discoverGamesWarningShown) {
        console.warn('Games index not found - using discovery fallback. This may cause 404 errors.');
        window.discoverGamesWarningShown = true;
      }
      if (typeof perfLab !== 'undefined') perfLab.start('discoverGames');
      allGames = await discoverGames();
      // Sort and assign game numbers
      allGames.sort((a, b) => new Date(b.date) - new Date(a.date));
      allGames.forEach((game, index) => {
        game.gameNumber = allGames.length - index;
      });
      if (typeof perfLab !== 'undefined') perfLab.end('discoverGames');
    }
    
    if (typeof perfLab !== 'undefined') perfLab.start('renderGames');
    renderGames();
    if (typeof perfLab !== 'undefined') perfLab.end('renderGames');
    
    if (typeof perfLab !== 'undefined') perfLab.end('loadGames');
    
  } catch (error) {
    console.error('Error loading games:', error);
    console.error('Error stack:', error.stack);
    // Don't show error to user during polling - just log it
    // showError will be called by the polling mechanism if needed
    if (typeof perfLab !== 'undefined') perfLab.end('loadGames');
    // Re-throw so polling mechanism can handle it
    throw error;
  }
}

// Cache for discovered games to avoid repeated 404 spam
let discoveredGamesCache = null;
let discoveredGamesCacheTime = null;
const DISCOVER_CACHE_TTL = 60000; // Cache for 1 minute

/**
 * Discover games by trying common date patterns
 * This is a fallback when no index file exists
 * Only tries a limited number of dates to avoid spam
 * Results are cached to avoid repeated 404 requests
 */
async function discoverGames() {
  // Return cached result if available and fresh
  const now = Date.now();
  if (discoveredGamesCache !== null && 
      discoveredGamesCacheTime !== null && 
      (now - discoveredGamesCacheTime) < DISCOVER_CACHE_TTL) {
    console.log('Using cached discovered games');
    return discoveredGamesCache;
  }
  
  const games = [];
  const today = new Date();
  
  // Try the last 8 weeks (more reasonable limit)
  const promises = [];
  
  for (let i = 0; i < 8; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (i * 7));
    const dateStr = date.toISOString().split('T')[0];
    const gameId = `game-${dateStr}`;
    
    // Fetch with silent error handling
    const promise = fetch(`data/games/${gameId}.json`)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        return null; // 404 or other error - return null silently
      })
      .catch(() => null); // Network error - return null silently
    
    promises.push(promise);
  }
  
  // Wait for all requests, filter out nulls
  const results = await Promise.all(promises);
  const discoveredGames = results.filter(game => game !== null);
  
  // Cache the result
  discoveredGamesCache = discoveredGames;
  discoveredGamesCacheTime = now;
  
  return discoveredGames;
}

/**
 * Render the game list
 */
function renderGames() {
  if (typeof perfLab !== 'undefined') perfLab.start('renderGames-internal');
  
  const container = document.getElementById('game-list');
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  
  if (!container || !loading || !emptyState) {
    console.error('Required DOM elements not found for renderGames');
    return;
  }
  
  loading.style.display = 'none';
  
  // Filter games based on current filter
  if (typeof perfLab !== 'undefined') perfLab.start('filterGames');
  let filteredGames = allGames;
  if (currentFilter === 'played') {
    filteredGames = allGames.filter(game => playedStatus[game.id]?.played === true);
  } else if (currentFilter === 'unplayed') {
    filteredGames = allGames.filter(game => playedStatus[game.id]?.played !== true);
  }
  if (typeof perfLab !== 'undefined') {
    perfLab.end('filterGames');
    perfLab.record('filteredGameCount', filteredGames.length);
  }
  
  if (filteredGames.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    if (typeof perfLab !== 'undefined') perfLab.end('renderGames-internal');
    return;
  }
  
  emptyState.style.display = 'none';
  container.style.display = 'flex';
  
  // Use DocumentFragment to batch DOM operations
  const fragment = document.createDocumentFragment();
  
  if (typeof perfLab !== 'undefined') perfLab.start('createGameCards');
  filteredGames.forEach((game, index) => {
    if (typeof perfLab !== 'undefined') perfLab.start(`createGameCard-${index}`);
    const card = createGameCard(game);
    fragment.appendChild(card);
    if (typeof perfLab !== 'undefined') perfLab.end(`createGameCard-${index}`);
  });
  if (typeof perfLab !== 'undefined') perfLab.end('createGameCards');
  
  // Clear and append fragment in one operation
  container.innerHTML = '';
  container.appendChild(fragment);
  
  if (typeof perfLab !== 'undefined') perfLab.end('renderGames-internal');
}

/**
 * Create a game card element
 */
function createGameCard(game) {
  const card = document.createElement('div');
  card.className = `game-card ${isGamePlayedInStorage(game.id) ? 'played' : ''}`;
  card.onclick = () => {
    window.location.href = `game.html?id=${game.id}`;
  };
  
  const info = document.createElement('div');
  info.className = 'game-card-info';
  
  const title = document.createElement('h3');
  title.textContent = `Game #${game.gameNumber || '?'}`;
  
  const date = document.createElement('div');
  date.className = 'date';
  // Parse date string as local date to avoid timezone issues
  const [year, month, day] = game.date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  date.textContent = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  info.appendChild(title);
  info.appendChild(date);
  
  const status = document.createElement('div');
  status.className = 'status';
  status.textContent = isGamePlayedInStorage(game.id) ? 'Played' : 'New';
  
  card.appendChild(info);
  card.appendChild(status);
  
  return card;
}

/**
 * Toggle played status for a game
 */
async function togglePlayedStatus(gameId) {
  const current = playedStatus[gameId]?.played === true;
  playedStatus[gameId] = {
    played: !current,
    playedDate: new Date().toISOString(),
  };
  await savePlayedStatus();
  renderGames();
}

/**
 * Set filter
 */
function setFilter(filter) {
  currentFilter = filter;
  
  // Update filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.dataset.filter === filter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  renderGames();
}

/**
 * Show error message
 */
function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  
  const loading = document.getElementById('loading');
  loading.style.display = 'none';
}

/**
 * Show generate status message
 */
function showGenerateStatus(message, type = 'info') {
  const statusDiv = document.getElementById('generate-status');
  if (!statusDiv) {
    console.error('Status div not found!');
    return;
  }
  statusDiv.textContent = message;
  statusDiv.className = `generate-status ${type}`;
  
  // Clear any inline display style that might have been set by hideGenerateStatus
  // This ensures the CSS class can properly control display
  statusDiv.style.display = '';
  
  // Trigger animation by adding 'show' class
  // Use requestAnimationFrame to ensure the element is rendered before animating
  requestAnimationFrame(() => {
    statusDiv.classList.add('show');
  });
  
  console.log('Status shown:', message, type);
}

/**
 * Hide generate status message
 */
function hideGenerateStatus() {
  const statusDiv = document.getElementById('generate-status');
  if (statusDiv) {
    statusDiv.classList.remove('show');
    // Remove from DOM after animation completes
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 300);
  }
}

/**
 * Get GitHub repository info from config file
 * Requires js/config.js to be present (no fallbacks since we're using Vercel)
 */
function getGitHubRepoInfo() {
  // Require config.js - no fallbacks since we're using Vercel
  if (typeof GITHUB_CONFIG !== 'undefined' && GITHUB_CONFIG.owner && GITHUB_CONFIG.repo) {
    return {
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      branch: GITHUB_CONFIG.branch || 'main'
    };
  }
  
  return null;
}


/**
 * Fetch games index snapshot (single cache-busted request for polling).
 * @param {string} [baseUrl]
 */
async function fetchIndexSnapshot(baseUrl = '') {
  const indexPath = 'data/games/index.json';
  const indexUrl = baseUrl
    ? `${baseUrl}/${indexPath}?t=${Date.now()}`
    : `${indexPath}?t=${Date.now()}`;
  const response = await fetch(indexUrl, { cache: 'no-store' });
  if (!response.ok) return null;
  return response.json();
}

/**
 * Trigger GitHub Actions workflow
 */
async function triggerGameGeneration() {
  console.log('triggerGameGeneration called');
  const generateBtn = document.getElementById('generate-btn');
  
  if (!generateBtn) {
    console.error('Generate button not found!');
    showGenerateStatus('Error: Generate button not found', 'error');
    return;
  }
  
  // Immediate visual feedback
  generateBtn.disabled = true;
  updateIconButton(generateBtn, 'loader-2', 'Generating...');
  generateBtn.style.opacity = '0.7';
  showGenerateStatus('Preparing to trigger game generation...', 'info');
  
  console.log('Button found, getting repo info...');
  const repoInfo = getGitHubRepoInfo();
  
  // Check if credentials are configured
  if (!repoInfo) {
    showGenerateStatus('Error: GitHub configuration not found. Please create js/config.js (see js/config.example.js for template)', 'error');
    restoreIconButton(generateBtn, 'plus');
    generateBtn.disabled = false;
    generateBtn.style.opacity = '1';
    return;
  }
  
  let apiEndpoint = typeof GITHUB_CONFIG !== 'undefined' && GITHUB_CONFIG.apiEndpoint
    ? GITHUB_CONFIG.apiEndpoint
    : '/api/generate';

  if (apiEndpoint.includes('/trigger-deploy') || apiEndpoint.includes('/trigger-workflow')) {
    apiEndpoint = '/api/generate';
  }
  
  console.log('Repo info:', repoInfo);
  console.log('API endpoint:', apiEndpoint);
  
  // Get default branch from config
  const defaultBranch = repoInfo.branch || 'main';
  
  // Update status
  showGenerateStatus('Triggering game generation...', 'info');
  console.log('Button disabled, status shown, calling API...');
  
  try {
    // Call our secure serverless function (token is stored server-side)
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        branch: defaultBranch
      })
    });
    
    const responseData = await response.json().catch(() => ({}));
    console.log('API response status:', response.status);
    console.log('API response data:', responseData);
    
    if (response.ok && (responseData.success || response.status === 204)) {
      console.log('Workflow triggered successfully!');
      showGenerateStatus(
        'Game generation started. Waiting for the new game to appear…',
        'info'
      );
      
      // Store initial game IDs and index timestamp/version before polling starts
      const initialGameIds = new Set(allGames.map(g => g.id));
      const initialIndexTimestamp = lastKnownIndexTimestamp;
      const initialIndexVersion = lastKnownIndexVersion;
      console.log('Initial games:', Array.from(initialGameIds));
      console.log('Initial index timestamp:', initialIndexTimestamp);
      console.log('Initial index version:', initialIndexVersion);
      
      // Poll for new games every 10 seconds, up to 3 minutes
      let pollCount = 0;
      const maxPolls = 18; // 18 * 10 seconds = 3 minutes
      
      // Determine if we need to poll from production (when using production API endpoint)
      const isProductionApi = typeof GITHUB_CONFIG !== 'undefined' && 
                              GITHUB_CONFIG.productionBaseUrl && 
                              GITHUB_CONFIG.apiEndpoint && 
                              GITHUB_CONFIG.apiEndpoint.includes(GITHUB_CONFIG.productionBaseUrl);
      const pollBaseUrl = isProductionApi ? GITHUB_CONFIG.productionBaseUrl : null;
      
      if (pollBaseUrl) {
        console.log('Using production base URL for polling:', pollBaseUrl);
      }
      
      const pollForNewGames = setInterval(async () => {
        pollCount++;
        console.log(`Polling for new games (attempt ${pollCount}/${maxPolls})...`);

        try {
          const index = await fetchIndexSnapshot(pollBaseUrl);
          if (!index) {
            if (pollCount >= maxPolls) {
              clearInterval(pollForNewGames);
              showGenerateStatus(
                '⏱️ Generation may still be in progress. Refresh manually to check.',
                'info',
              );
              restoreIconButton(generateBtn, 'plus');
              generateBtn.disabled = false;
              generateBtn.style.opacity = '1';
            }
            return;
          }

          const currentIds = index.games || [];
          const versionChanged = Boolean(
            index.version && initialIndexVersion && index.version !== initialIndexVersion,
          );
          const timestampChanged = Boolean(
            index.lastUpdated && initialIndexTimestamp && index.lastUpdated !== initialIndexTimestamp,
          );
          const newGameIds = currentIds.filter((id) => !initialGameIds.has(id));
          const countIncreased = currentIds.length > initialGameIds.size;

          if (versionChanged || timestampChanged || newGameIds.length > 0 || countIncreased) {
            clearInterval(pollForNewGames);
            showGenerateStatus('New game is ready. Refreshing…', 'success');
            restoreIconButton(generateBtn, 'plus');
            generateBtn.disabled = false;
            generateBtn.style.opacity = '1';
            setTimeout(() => window.location.reload(), 1500);
          } else if (pollCount >= maxPolls) {
            clearInterval(pollForNewGames);
            showGenerateStatus(
              '⏱️ Generation may still be in progress. Refresh manually to check.',
              'info',
            );
            restoreIconButton(generateBtn, 'plus');
            generateBtn.disabled = false;
            generateBtn.style.opacity = '1';
          } else {
            showGenerateStatus(
              `Waiting for new game… (${pollCount * 10}s)`,
              'info',
            );
          }
        } catch (error) {
          console.error('Error polling for games:', error);
          if (pollCount >= maxPolls) {
            clearInterval(pollForNewGames);
            restoreIconButton(generateBtn, 'plus');
            generateBtn.disabled = false;
            generateBtn.style.opacity = '1';
          }
        }
      }, 10000);
    } else {
      const errorMessage = responseData.error || response.statusText || 'Failed to trigger workflow';
      console.error('API error:', errorMessage);
      showGenerateStatus(
        `Error: ${errorMessage}`,
        'error'
      );
      restoreIconButton(generateBtn, 'plus');
      generateBtn.disabled = false;
      generateBtn.style.opacity = '1';
    }
  } catch (error) {
    console.error('Error triggering workflow:', error);
    const errorMessage = error.message || 'Network error';
    showGenerateStatus(
      `Error: ${errorMessage}. Check browser console for details.`,
      'error'
    );
    restoreIconButton(generateBtn, 'plus');
    generateBtn.disabled = false;
    generateBtn.style.opacity = '1';
  }
}

/**
 * Initialize
 */
async function init() {
  // Set up filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setFilter(btn.dataset.filter);
    });
  });
  
  // Set up generate button
  const generateBtn = document.getElementById('generate-btn');
  if (generateBtn) {
    console.log('Setting up generate button click handler');
    generateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Generate button clicked!');
      triggerGameGeneration();
    });
  } else {
    console.error('Generate button not found in DOM!');
  }
  
  // Set up refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Refresh button clicked!');
      refreshBtn.disabled = true;
      updateIconButton(refreshBtn, 'loader-2', 'Refreshing...');
      try {
        // Clear cache and reload - reset timestamp and version to force fresh fetch
        allGames = [];
        lastKnownIndexTimestamp = null;
        lastKnownIndexVersion = null;
        await loadGames();
        showGenerateStatus('Games list refreshed!', 'success');
        setTimeout(() => {
          const statusDiv = document.getElementById('generate-status');
          if (statusDiv) statusDiv.style.display = 'none';
        }, 3000);
      } catch (error) {
        console.error('Error refreshing games:', error);
        showGenerateStatus('Error refreshing games. Please try again.', 'error');
      } finally {
        restoreIconButton(refreshBtn, 'refresh-cw');
      }
    });
  }
  
  // Load data
  await loadPlayedStatus();
  await loadGames();
  
  // Ensure icons are initialized after all DOM updates
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Run on page load
init();

// Capture baseline metrics on first load
if (typeof perfLab !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      if (!perfLab.baseline) {
        console.log('Performance Lab: Ready for baseline capture');
        console.log('Run: perfLab.saveBaseline("initial-baseline") to capture baseline');
      }
    }, 2000); // Wait for games to load
  });
}

