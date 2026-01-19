// Game display functionality

let currentGame = null;

// Debounce utility for localStorage writes
let localStorageWriteTimeout = null;
let pendingPlayedStatus = null;

/**
 * Debounced localStorage write to prevent blocking main thread
 */
function debouncedLocalStorageWrite(key, value) {
  pendingPlayedStatus = { key, value };
  
  if (localStorageWriteTimeout) {
    clearTimeout(localStorageWriteTimeout);
  }
  
  localStorageWriteTimeout = setTimeout(() => {
    if (pendingPlayedStatus) {
      try {
        localStorage.setItem(pendingPlayedStatus.key, JSON.stringify(pendingPlayedStatus.value));
        pendingPlayedStatus = null;
      } catch (error) {
        console.error('Error writing to localStorage:', error);
      }
    }
  }, 100); // 100ms debounce
}

/**
 * Load game from URL parameter
 */
async function loadGame() {
  perfLab.start('loadGame');
  
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('id');
  
  if (!gameId) {
    showError('No game ID provided');
    perfLab.end('loadGame');
    return;
  }
  
  try {
    perfLab.start('fetchGameData');
    // Add cache-busting to prevent stale data
    const response = await fetch(`data/games/${gameId}.json?t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`Game not found: ${gameId}`);
    }
    
    perfLab.start('parseGameData');
    currentGame = await response.json();
    perfLab.end('parseGameData');
    perfLab.end('fetchGameData');
    
    perfLab.start('renderGame');
    renderGame();
    perfLab.end('renderGame');
    
    // Mark as played when game is viewed
    perfLab.start('markGameAsPlayed');
    await markGameAsPlayed(gameId);
    perfLab.end('markGameAsPlayed');
    
    perfLab.end('loadGame');
    
  } catch (error) {
    console.error('Error loading game:', error);
    showError(`Failed to load game: ${error.message}`);
    perfLab.end('loadGame');
  }
}

/**
 * Render the game
 */
function renderGame() {
  perfLab.start('renderGame-internal');
  
  const loading = document.getElementById('loading');
  const content = document.getElementById('game-content');
  
  loading.style.display = 'none';
  content.style.display = 'block';
  
  // Set game title and date
  perfLab.start('updateGameHeader');
  document.getElementById('game-title').textContent = `Game ${currentGame.date}`;
  const dateObj = new Date(currentGame.date);
  document.getElementById('game-date').textContent = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  perfLab.end('updateGameHeader');
  
  // Render rounds
  renderRounds();
  
  // Render final trivia
  renderFinalTrivia();
  
  perfLab.end('renderGame-internal');
}

/**
 * Render all rounds
 * OPTIMIZED: Uses DocumentFragment to batch DOM operations and reduce reflows
 */
function renderRounds() {
  perfLab.start('renderRounds');
  const container = document.getElementById('rounds-container');
  
  // Use DocumentFragment to batch DOM operations
  const fragment = document.createDocumentFragment();
  
  currentGame.rounds.forEach((round, index) => {
    perfLab.start(`createRound-${index}`);
    const roundElement = createRoundElement(round);
    fragment.appendChild(roundElement);
    perfLab.end(`createRound-${index}`);
  });
  
  // Clear container and append fragment in one operation
  container.innerHTML = '';
  container.appendChild(fragment);
  
  perfLab.end('renderRounds');
  perfLab.record('roundCount', currentGame.rounds.length);
}

/**
 * Create a round element
 */
function createRoundElement(round) {
  perfLab.start('createRoundElement');
  
  const roundDiv = document.createElement('div');
  roundDiv.className = 'round';
  roundDiv.setAttribute('data-round', round.roundNumber);
  
  // Round header (collapsible)
  perfLab.start('createRoundHeader');
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
  
  const shuffleRoundBtn = document.createElement('button');
  shuffleRoundBtn.className = 'shuffle-round-btn';
  shuffleRoundBtn.textContent = '🔄';
  shuffleRoundBtn.title = 'Shuffle questions in this round';
  shuffleRoundBtn.style.background = 'rgba(255, 255, 255, 0.2)';
  shuffleRoundBtn.style.border = 'none';
  shuffleRoundBtn.style.color = 'inherit';
  shuffleRoundBtn.style.padding = '4px 8px';
  shuffleRoundBtn.style.borderRadius = '4px';
  shuffleRoundBtn.style.cursor = 'pointer';
  shuffleRoundBtn.style.fontSize = '14px';
  shuffleRoundBtn.onclick = (e) => {
    e.stopPropagation(); // Prevent round toggle
    shuffleRound(roundDiv, round.roundNumber);
  };
  
  header.appendChild(title);
  header.appendChild(difficulty);
  header.appendChild(shuffleRoundBtn);
  header.appendChild(toggle);
  perfLab.end('createRoundHeader');
  
  // Round content
  perfLab.start('createRoundContent');
  const content = document.createElement('div');
  content.className = 'round-content';
  
  // Use DocumentFragment to batch question DOM operations
  const questionFragment = document.createDocumentFragment();
  
  round.questions.forEach((question, index) => {
    perfLab.start(`createQuestion-${round.roundNumber}-${index}`);
    const questionElement = createQuestionElement(question, index + 1, round.roundNumber);
    questionFragment.appendChild(questionElement);
    perfLab.end(`createQuestion-${round.roundNumber}-${index}`);
  });
  
  // Append all questions at once
  content.appendChild(questionFragment);
  perfLab.end('createRoundContent');
  
  roundDiv.appendChild(header);
  roundDiv.appendChild(content);
  
  perfLab.end('createRoundElement');
  perfLab.record('questionsPerRound', round.questions.length);
  
  return roundDiv;
}

/**
 * Create a question element
 */
function createQuestionElement(question, number, roundNumber) {
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
    perfLab.start('loadPlayedStatus');
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
        perfLab.start('parseLocalStorage');
        playedStatus = JSON.parse(stored);
        perfLab.end('parseLocalStorage');
      }
    }
    perfLab.end('loadPlayedStatus');
    
    // Update status
    playedStatus[gameId] = true;
    
    // Save to localStorage (debounced to prevent blocking)
    perfLab.start('saveToLocalStorage');
    debouncedLocalStorageWrite('triviabot-played-status', playedStatus);
    perfLab.end('saveToLocalStorage');
    
    // Note: To save to GitHub, you'd need to use GitHub API
    // For now, we just use localStorage
    
  } catch (error) {
    console.error('Error marking game as played:', error);
  }
}

/**
 * Shuffle a question with another question in the same round
 */
function shuffleQuestion(questionDiv, roundNumber) {
  const round = currentGame.rounds.find(r => r.roundNumber === roundNumber);
  if (!round || round.questions.length < 2) {
    alert('Need at least 2 questions to shuffle');
    return;
  }
  
  const questionIndex = parseInt(questionDiv.dataset.questionIndex);
  const otherIndex = Math.floor(Math.random() * round.questions.length);
  
  if (otherIndex === questionIndex) {
    // Try again if same index
    shuffleQuestion(questionDiv, roundNumber);
    return;
  }
  
  // Swap questions in the data
  [round.questions[questionIndex], round.questions[otherIndex]] = 
    [round.questions[otherIndex], round.questions[questionIndex]];
  
  // Re-render the round
  const roundDiv = questionDiv.closest('.round');
  const content = roundDiv.querySelector('.round-content');
  content.innerHTML = '';
  
  const questionFragment = document.createDocumentFragment();
  round.questions.forEach((question, index) => {
    const questionElement = createQuestionElement(question, index + 1, roundNumber);
    questionFragment.appendChild(questionElement);
  });
  content.appendChild(questionFragment);
}

/**
 * Shuffle all questions within a round
 */
function shuffleRound(roundDiv, roundNumber) {
  const round = currentGame.rounds.find(r => r.roundNumber === roundNumber);
  if (!round || round.questions.length < 2) {
    alert('Need at least 2 questions to shuffle');
    return;
  }
  
  // Fisher-Yates shuffle
  for (let i = round.questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [round.questions[i], round.questions[j]] = [round.questions[j], round.questions[i]];
  }
  
  // Re-render the round
  const content = roundDiv.querySelector('.round-content');
  content.innerHTML = '';
  
  const questionFragment = document.createDocumentFragment();
  round.questions.forEach((question, index) => {
    const questionElement = createQuestionElement(question, index + 1, roundNumber);
    questionFragment.appendChild(questionElement);
  });
  content.appendChild(questionFragment);
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
  // Capture baseline metrics on first load
  if (typeof perfLab !== 'undefined') {
    // Auto-save baseline after initial load (only if no baseline exists)
    window.addEventListener('load', () => {
      setTimeout(() => {
        if (!perfLab.baseline) {
          console.log('Performance Lab: Ready for baseline capture');
          console.log('Run: perfLab.saveBaseline("initial-baseline") to capture baseline');
        }
      }, 1000);
    });
  }
  
  loadGame();
}

// Run on page load
init();

