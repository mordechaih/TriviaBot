// Game list functionality

let allGames = [];
let playedStatus = {};
let currentFilter = 'all';

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
  
  try {
    // Try to load from GitHub Pages (data/played-status.json)
    if (typeof perfLab !== 'undefined') perfLab.start('fetchPlayedStatus');
    const response = await fetch('data/played-status.json');
    if (response.ok) {
      playedStatus = await response.json();
      console.log('Loaded played status from server');
      if (typeof perfLab !== 'undefined') {
        perfLab.end('fetchPlayedStatus');
        perfLab.end('loadPlayedStatus');
      }
      return;
    }
    if (typeof perfLab !== 'undefined') perfLab.end('fetchPlayedStatus');
  } catch (error) {
    console.log('Could not load from server, trying localStorage');
  }
  
  // Fallback to localStorage
  if (typeof perfLab !== 'undefined') perfLab.start('loadFromLocalStorage');
  const stored = localStorage.getItem('triviabot-played-status');
  if (stored) {
    if (typeof perfLab !== 'undefined') perfLab.start('parsePlayedStatus');
    playedStatus = JSON.parse(stored);
    if (typeof perfLab !== 'undefined') perfLab.end('parsePlayedStatus');
    console.log('Loaded played status from localStorage');
  }
  if (typeof perfLab !== 'undefined') {
    perfLab.end('loadFromLocalStorage');
    perfLab.end('loadPlayedStatus');
  }
}

/**
 * Save played status
 */
async function savePlayedStatus() {
  // Save to localStorage immediately
  localStorage.setItem('triviabot-played-status', JSON.stringify(playedStatus));
  
  // Try to save to GitHub (this would require API integration, for now just localStorage)
  // In a real implementation, you'd use GitHub API with a token
  console.log('Saved played status to localStorage');
}

/**
 * Load list of available games
 */
async function loadGames() {
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
      // Add cache-busting to prevent stale data - use timestamp and random to ensure fresh fetch
      const cacheBuster = `${Date.now()}-${Math.random()}`;
      const indexResponse = await fetch(`data/games/index.json?t=${cacheBuster}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (indexResponse.ok) {
        const index = await indexResponse.json();
        gameIds = index.games || [];
        console.log('Loaded game IDs from index:', gameIds);
      } else {
        console.warn('Failed to load games index:', indexResponse.status, indexResponse.statusText);
      }
      if (typeof perfLab !== 'undefined')       if (typeof perfLab !== 'undefined') perfLab.end('fetchGamesIndex');
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
        // Add cache-busting to prevent stale data - use timestamp and random
        const cacheBuster = `${Date.now()}-${Math.random()}`;
        return fetch(`data/games/${id}.json?t=${cacheBuster}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
          .then(res => {
            if (typeof perfLab !== 'undefined') perfLab.end(`fetchGame-${index}`);
            return res.ok ? res.json() : null;
          })
          .catch((err) => {
            console.warn(`Failed to fetch game ${id}:`, err);
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
      if (typeof perfLab !== 'undefined') perfLab.end('sortGames');
    } else {
      // Fallback: try to discover games by checking common patterns
      // This is a workaround - ideally we'd have an index file
      if (typeof perfLab !== 'undefined') perfLab.start('discoverGames');
      allGames = await discoverGames();
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

/**
 * Discover games by trying common date patterns
 * This is a fallback when no index file exists
 */
async function discoverGames() {
  const games = [];
  const today = new Date();
  
  // Try the last 52 weeks (1 year)
  for (let i = 0; i < 52; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (i * 7));
    const dateStr = date.toISOString().split('T')[0];
    const gameId = `game-${dateStr}`;
    
    try {
      const response = await fetch(`data/games/${gameId}.json`);
      if (response.ok) {
        const game = await response.json();
        games.push(game);
      }
    } catch (error) {
      // Game doesn't exist, continue
    }
  }
  
  return games;
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
    filteredGames = allGames.filter(game => playedStatus[game.id] === true);
  } else if (currentFilter === 'unplayed') {
    filteredGames = allGames.filter(game => playedStatus[game.id] !== true);
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
  container.style.display = 'block';
  
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
  card.className = `game-card ${playedStatus[game.id] ? 'played' : ''}`;
  card.onclick = () => {
    window.location.href = `game.html?id=${game.id}`;
  };
  
  const info = document.createElement('div');
  info.className = 'game-card-info';
  
  const title = document.createElement('h3');
  title.textContent = `Game ${game.date}`;
  
  const date = document.createElement('div');
  date.className = 'date';
  const dateObj = new Date(game.date);
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
  status.textContent = playedStatus[game.id] ? 'Played' : 'New';
  
  card.appendChild(info);
  card.appendChild(status);
  
  return card;
}

/**
 * Toggle played status for a game
 */
async function togglePlayedStatus(gameId) {
  playedStatus[gameId] = !playedStatus[gameId];
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
  statusDiv.style.display = 'flex'; // Changed from 'block' to 'flex' to match CSS
  console.log('Status shown:', message, type);
}

/**
 * Hide generate status message
 */
function hideGenerateStatus() {
  const statusDiv = document.getElementById('generate-status');
  statusDiv.style.display = 'none';
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
    return;
  }
  
  // Get API endpoint from config (required for Vercel deployment)
  const apiEndpoint = typeof GITHUB_CONFIG !== 'undefined' && GITHUB_CONFIG.apiEndpoint 
    ? GITHUB_CONFIG.apiEndpoint 
    : null;
  if (!apiEndpoint) {
    showGenerateStatus('Error: API endpoint not configured. Please set apiEndpoint in js/config.js', 'error');
    restoreIconButton(generateBtn, 'plus');
    return;
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
        'Game generation triggered! Waiting for deployment...',
        'info'
      );
      
      // Store initial game IDs before polling starts
      const initialGameIds = new Set(allGames.map(g => g.id));
      console.log('Initial games:', Array.from(initialGameIds));
      
      // Poll for new games every 10 seconds, up to 3 minutes
      let pollCount = 0;
      const maxPolls = 18; // 18 * 10 seconds = 3 minutes
      
      const pollForNewGames = setInterval(async () => {
        pollCount++;
        console.log(`Polling for new games (attempt ${pollCount}/${maxPolls})...`);
        
        try {
          // Force reload games with cache-busting
          // Clear the allGames array first to force fresh load
          allGames = [];
          await loadGames();
          
          // Get current game IDs
          const currentGameIds = new Set(allGames.map(g => g.id));
          console.log('Current games:', Array.from(currentGameIds));
          
          // Check if we have new game IDs
          const newGameIds = Array.from(currentGameIds).filter(id => !initialGameIds.has(id));
          
          if (newGameIds.length > 0) {
            clearInterval(pollForNewGames);
            console.log('New games detected:', newGameIds);
            showGenerateStatus(
              `New game generated! Found ${newGameIds.length} new game(s).`,
              'success'
            );
            // Refresh after showing success message
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else if (pollCount >= maxPolls) {
            clearInterval(pollForNewGames);
            showGenerateStatus(
              'Game generation may still be in progress. Please refresh the page manually to check.',
              'info'
            );
            console.log('Polling timeout reached. Initial games:', Array.from(initialGameIds), 'Current games:', Array.from(currentGameIds));
          } else {
            const elapsed = pollCount * 10;
            showGenerateStatus(
              `Waiting for new game... (${elapsed}s / ~3min)`,
              'info'
            );
            console.log(`No new games yet. Still waiting... (${elapsed}s)`);
          }
        } catch (error) {
          console.error('Error polling for games:', error);
          console.error('Error details:', error.message, error.stack);
          
          if (pollCount >= maxPolls) {
            clearInterval(pollForNewGames);
            showGenerateStatus(
              `Could not detect new game after ${maxPolls} attempts. Error: ${error.message}. Please refresh the page manually.`,
              'error'
            );
          } else {
            // Show error but continue polling
            showGenerateStatus(
              `Error checking for games (${pollCount}/${maxPolls}): ${error.message}. Retrying...`,
              'info'
            );
          }
        }
      }, 10000); // Poll every 10 seconds
    } else {
      const errorMessage = responseData.error || response.statusText || 'Failed to trigger workflow';
      console.error('API error:', errorMessage);
      showGenerateStatus(
        `Error: ${errorMessage}`,
        'error'
      );
      restoreIconButton(generateBtn, 'plus');
    }
  } catch (error) {
    console.error('Error triggering workflow:', error);
    const errorMessage = error.message || 'Network error';
    showGenerateStatus(
      `Error: ${errorMessage}. Check browser console for details.`,
      'error'
    );
    restoreIconButton(generateBtn, 'plus');
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
        // Clear cache and reload
        allGames = [];
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

