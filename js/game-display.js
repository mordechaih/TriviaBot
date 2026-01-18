// Game display functionality

let currentGame = null;

/**
 * Load game from URL parameter
 */
async function loadGame() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('id');
  
  if (!gameId) {
    showError('No game ID provided');
    return;
  }
  
  try {
    const response = await fetch(`data/games/${gameId}.json`);
    if (!response.ok) {
      throw new Error(`Game not found: ${gameId}`);
    }
    
    currentGame = await response.json();
    renderGame();
    
    // Mark as played when game is viewed
    await markGameAsPlayed(gameId);
    
  } catch (error) {
    console.error('Error loading game:', error);
    showError(`Failed to load game: ${error.message}`);
  }
}

/**
 * Render the game
 */
function renderGame() {
  const loading = document.getElementById('loading');
  const content = document.getElementById('game-content');
  
  loading.style.display = 'none';
  content.style.display = 'block';
  
  // Set game title and date
  document.getElementById('game-title').textContent = `Game ${currentGame.date}`;
  const dateObj = new Date(currentGame.date);
  document.getElementById('game-date').textContent = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Render rounds
  renderRounds();
  
  // Render final trivia
  renderFinalTrivia();
}

/**
 * Render all rounds
 */
function renderRounds() {
  const container = document.getElementById('rounds-container');
  container.innerHTML = '';
  
  currentGame.rounds.forEach(round => {
    const roundElement = createRoundElement(round);
    container.appendChild(roundElement);
  });
}

/**
 * Create a round element
 */
function createRoundElement(round) {
  const roundDiv = document.createElement('div');
  roundDiv.className = 'round';
  
  // Round header (collapsible)
  const header = document.createElement('div');
  header.className = 'round-header';
  header.onclick = () => toggleRound(roundDiv);
  
  const title = document.createElement('h2');
  title.textContent = `Round ${round.roundNumber}`;
  
  const difficulty = document.createElement('span');
  difficulty.className = 'difficulty';
  difficulty.textContent = round.difficulty;
  
  const toggle = document.createElement('span');
  toggle.className = 'toggle';
  toggle.textContent = '▼';
  
  header.appendChild(title);
  header.appendChild(difficulty);
  header.appendChild(toggle);
  
  // Round content
  const content = document.createElement('div');
  content.className = 'round-content';
  
  round.questions.forEach((question, index) => {
    const questionElement = createQuestionElement(question, index + 1);
    content.appendChild(questionElement);
  });
  
  roundDiv.appendChild(header);
  roundDiv.appendChild(content);
  
  return roundDiv;
}

/**
 * Create a question element
 */
function createQuestionElement(question, number) {
  const questionDiv = document.createElement('div');
  questionDiv.className = 'question';
  
  const category = document.createElement('div');
  category.className = 'question-category';
  category.textContent = `Q${number}: ${question.category}`;
  
  const clue = document.createElement('div');
  clue.className = 'question-clue';
  clue.textContent = question.clue;
  
  const revealBtn = document.createElement('button');
  revealBtn.className = 'reveal-btn';
  revealBtn.textContent = 'Reveal Answer';
  revealBtn.onclick = () => revealAnswer(questionDiv);
  
  const answer = document.createElement('div');
  answer.className = 'question-answer hidden';
  answer.textContent = question.answer;
  
  questionDiv.appendChild(category);
  questionDiv.appendChild(clue);
  questionDiv.appendChild(revealBtn);
  questionDiv.appendChild(answer);
  
  return questionDiv;
}

/**
 * Toggle round collapse/expand
 */
function toggleRound(roundDiv) {
  const header = roundDiv.querySelector('.round-header');
  const content = roundDiv.querySelector('.round-content');
  const toggle = roundDiv.querySelector('.toggle');
  
  header.classList.toggle('collapsed');
  content.classList.toggle('collapsed');
  
  // Rotate toggle arrow
  if (header.classList.contains('collapsed')) {
    toggle.textContent = '▶';
  } else {
    toggle.textContent = '▼';
  }
}

/**
 * Reveal answer for a question
 */
function revealAnswer(questionDiv) {
  const answer = questionDiv.querySelector('.question-answer');
  const btn = questionDiv.querySelector('.reveal-btn');
  
  answer.classList.remove('hidden');
  btn.style.display = 'none';
}

/**
 * Render final trivia
 */
function renderFinalTrivia() {
  const finalDiv = document.getElementById('final-trivia');
  const category = document.getElementById('final-category');
  const question = document.getElementById('final-question');
  const answer = document.getElementById('final-answer');
  const revealBtn = document.getElementById('reveal-final-btn');
  
  if (!currentGame.finalTrivia) {
    finalDiv.style.display = 'none';
    return;
  }
  
  finalDiv.style.display = 'block';
  category.textContent = currentGame.finalTrivia.category;
  question.textContent = currentGame.finalTrivia.question;
  answer.textContent = currentGame.finalTrivia.answer;
  answer.classList.add('hidden');
  
  revealBtn.onclick = () => {
    answer.classList.remove('hidden');
    revealBtn.style.display = 'none';
  };
}

/**
 * Mark game as played
 */
async function markGameAsPlayed(gameId) {
  try {
    // Load current played status
    let playedStatus = {};
    try {
      const response = await fetch('data/played-status.json');
      if (response.ok) {
        playedStatus = await response.json();
      }
    } catch (error) {
      // Fallback to localStorage
      const stored = localStorage.getItem('triviabot-played-status');
      if (stored) {
        playedStatus = JSON.parse(stored);
      }
    }
    
    // Update status
    playedStatus[gameId] = true;
    
    // Save to localStorage
    localStorage.setItem('triviabot-played-status', JSON.stringify(playedStatus));
    
    // Note: To save to GitHub, you'd need to use GitHub API
    // For now, we just use localStorage
    
  } catch (error) {
    console.error('Error marking game as played:', error);
  }
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
 * Initialize
 */
function init() {
  loadGame();
}

// Run on page load
init();

