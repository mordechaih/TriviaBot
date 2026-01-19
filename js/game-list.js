// Game list functionality

let allGames = [];
let playedStatus = {};
let currentFilter = 'all';

/**
 * Load played status from GitHub or localStorage fallback
 */
async function loadPlayedStatus() {
  try {
    // Try to load from GitHub Pages (data/played-status.json)
    const response = await fetch('data/played-status.json');
    if (response.ok) {
      playedStatus = await response.json();
      console.log('Loaded played status from server');
      return;
    }
  } catch (error) {
    console.log('Could not load from server, trying localStorage');
  }
  
  // Fallback to localStorage
  const stored = localStorage.getItem('triviabot-played-status');
  if (stored) {
    playedStatus = JSON.parse(stored);
    console.log('Loaded played status from localStorage');
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
  try {
    // Get list of game files from the games directory
    // Since we can't list files via fetch, we'll need to maintain an index
    // For now, try to fetch a games index file, or load games individually
    
    // Try to load a games index if it exists
    let gameIds = [];
    try {
      const indexResponse = await fetch('data/games/index.json');
      if (indexResponse.ok) {
        const index = await indexResponse.json();
        gameIds = index.games || [];
      }
    } catch (error) {
      // If no index exists, we'll need to discover games another way
      // For now, we'll try common date patterns or let the user know
      console.log('No games index found');
    }
    
    // If we have game IDs, load them
    if (gameIds.length > 0) {
      const gamePromises = gameIds.map(id => 
        fetch(`data/games/${id}.json`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      );
      
      const games = await Promise.all(gamePromises);
      allGames = games.filter(g => g !== null).sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
    } else {
      // Fallback: try to discover games by checking common patterns
      // This is a workaround - ideally we'd have an index file
      allGames = await discoverGames();
    }
    
    renderGames();
    
  } catch (error) {
    console.error('Error loading games:', error);
    showError('Failed to load games. Please try again later.');
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
  const container = document.getElementById('game-list');
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  
  loading.style.display = 'none';
  
  // Filter games based on current filter
  let filteredGames = allGames;
  if (currentFilter === 'played') {
    filteredGames = allGames.filter(game => playedStatus[game.id] === true);
  } else if (currentFilter === 'unplayed') {
    filteredGames = allGames.filter(game => playedStatus[game.id] !== true);
  }
  
  if (filteredGames.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  container.style.display = 'block';
  container.innerHTML = '';
  
  filteredGames.forEach(game => {
    const card = createGameCard(game);
    container.appendChild(card);
  });
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
  generateBtn.textContent = 'Generating...';
  generateBtn.style.opacity = '0.7';
  showGenerateStatus('Preparing to trigger game generation...', 'info');
  
  console.log('Button found, getting repo info...');
  const repoInfo = getGitHubRepoInfo();
  
  // Check if credentials are configured
  if (!repoInfo) {
    showGenerateStatus('Error: GitHub configuration not found. Please create js/config.js (see js/config.example.js for template)', 'error');
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate New Game';
    generateBtn.style.opacity = '1';
    return;
  }
  
  // Get API endpoint from config (required for Vercel deployment)
  const apiEndpoint = typeof GITHUB_CONFIG !== 'undefined' && GITHUB_CONFIG.apiEndpoint 
    ? GITHUB_CONFIG.apiEndpoint 
    : null;
  if (!apiEndpoint) {
    showGenerateStatus('Error: API endpoint not configured. Please set apiEndpoint in js/config.js', 'error');
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate New Game';
    generateBtn.style.opacity = '1';
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
        'Game generation triggered! It may take a few minutes. Refresh the page to see the new game.',
        'success'
      );
      
      // Auto-refresh after 30 seconds
      setTimeout(() => {
        window.location.reload();
      }, 30000);
    } else {
      const errorMessage = responseData.error || response.statusText || 'Failed to trigger workflow';
      console.error('API error:', errorMessage);
      showGenerateStatus(
        `Error: ${errorMessage}`,
        'error'
      );
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate New Game';
      generateBtn.style.opacity = '1';
    }
  } catch (error) {
    console.error('Error triggering workflow:', error);
    showGenerateStatus(`Error: ${error.message}`, 'error');
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate New Game';
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
  
  // Load data
  await loadPlayedStatus();
  await loadGames();
}

// Run on page load
init();

