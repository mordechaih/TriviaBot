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
  if (typeof perfLab !== 'undefined') perfLab.start('loadGame');
  
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('id');
  
  if (!gameId) {
    showError('No game ID provided');
    if (typeof perfLab !== 'undefined') perfLab.end('loadGame');
    return;
  }
  
  try {
    if (typeof perfLab !== 'undefined') perfLab.start('fetchGameData');
    // Add cache-busting to prevent stale data
    const response = await fetch(`data/games/${gameId}.json?t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`Game not found: ${gameId}`);
    }
    
    if (typeof perfLab !== 'undefined') perfLab.start('parseGameData');
    currentGame = await response.json();
    if (typeof perfLab !== 'undefined') {
      perfLab.end('parseGameData');
      perfLab.end('fetchGameData');
    }
    
    if (typeof perfLab !== 'undefined') perfLab.start('renderGame');
    renderGame();
    if (typeof perfLab !== 'undefined') perfLab.end('renderGame');
    
    // Mark as played when game is viewed
    if (typeof perfLab !== 'undefined') perfLab.start('markGameAsPlayed');
    await markGameAsPlayed(gameId);
    if (typeof perfLab !== 'undefined') perfLab.end('markGameAsPlayed');
    
    if (typeof perfLab !== 'undefined') perfLab.end('loadGame');
    
  } catch (error) {
    console.error('Error loading game:', error);
    showError(`Failed to load game: ${error.message}`);
    if (typeof perfLab !== 'undefined') perfLab.end('loadGame');
  }
}

/**
 * Render the game
 */
function renderGame() {
  if (typeof perfLab !== 'undefined') perfLab.start('renderGame-internal');
  
  const loading = document.getElementById('loading');
  const content = document.getElementById('game-content');
  
  if (!loading || !content) {
    console.error('Required DOM elements not found for renderGame');
    showError('Error: Required page elements not found');
    return;
  }
  
  loading.style.display = 'none';
  content.style.display = 'block';
  
  // Set game title and date
  if (typeof perfLab !== 'undefined') perfLab.start('updateGameHeader');
  const titleEl = document.getElementById('game-title');
  const dateEl = document.getElementById('game-date');
  if (titleEl && dateEl) {
    titleEl.textContent = `Game ${currentGame.date}`;
    const dateObj = new Date(currentGame.date);
    dateEl.textContent = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  if (typeof perfLab !== 'undefined') perfLab.end('updateGameHeader');
  
  // Render rounds
  renderRounds();
  
  // Render final trivia
  renderFinalTrivia();
  
  if (typeof perfLab !== 'undefined') perfLab.end('renderGame-internal');
}

/**
 * Render all rounds
 * OPTIMIZED: Uses DocumentFragment to batch DOM operations and reduce reflows
 */
function renderRounds() {
  if (typeof perfLab !== 'undefined') perfLab.start('renderRounds');
  const container = document.getElementById('rounds-container');
  
  if (!container) {
    console.error('rounds-container element not found');
    return;
  }
  
  // Use DocumentFragment to batch DOM operations
  const fragment = document.createDocumentFragment();
  
  currentGame.rounds.forEach((round, index) => {
    if (typeof perfLab !== 'undefined') perfLab.start(`createRound-${index}`);
    const roundElement = createRoundElement(round);
    fragment.appendChild(roundElement);
    if (typeof perfLab !== 'undefined') perfLab.end(`createRound-${index}`);
  });
  
  // Clear container and append fragment in one operation
  container.innerHTML = '';
  container.appendChild(fragment);
  
  if (typeof perfLab !== 'undefined') {
    perfLab.end('renderRounds');
    perfLab.record('roundCount', currentGame.rounds.length);
  }
}

/**
 * Create a round element
 */
function createRoundElement(round) {
  if (typeof perfLab !== 'undefined') perfLab.start('createRoundElement');
  
  const roundDiv = document.createElement('div');
  roundDiv.className = 'round';
  roundDiv.setAttribute('data-round', round.roundNumber);
  
  // Round header (collapsible)
  if (typeof perfLab !== 'undefined') perfLab.start('createRoundHeader');
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
  shuffleRoundBtn.title = 'Generate new round';
  shuffleRoundBtn.style.background = 'rgba(255, 255, 255, 0.2)';
  shuffleRoundBtn.style.border = 'none';
  shuffleRoundBtn.style.color = 'inherit';
  shuffleRoundBtn.style.padding = '4px 8px';
  shuffleRoundBtn.style.borderRadius = '4px';
  shuffleRoundBtn.style.cursor = 'pointer';
  shuffleRoundBtn.style.fontSize = '14px';
  shuffleRoundBtn.style.display = 'inline-flex';
  shuffleRoundBtn.style.alignItems = 'center';
  shuffleRoundBtn.style.justifyContent = 'center';
  
  // Add Lucide shuffle icon
  const iconElement = document.createElement('i');
  iconElement.setAttribute('data-lucide', 'shuffle');
  shuffleRoundBtn.appendChild(iconElement);
  
  // Initialize Lucide icon
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  shuffleRoundBtn.onclick = async (e) => {
    e.stopPropagation(); // Prevent round toggle
    await generateNewRound(roundDiv, round.roundNumber, round.difficulty);
  };
  
  header.appendChild(title);
  header.appendChild(difficulty);
  header.appendChild(shuffleRoundBtn);
  header.appendChild(toggle);
  if (typeof perfLab !== 'undefined') perfLab.end('createRoundHeader');
  
  // Round content
  if (typeof perfLab !== 'undefined') perfLab.start('createRoundContent');
  const content = document.createElement('div');
  content.className = 'round-content';
  
  // Use DocumentFragment to batch question DOM operations
  const questionFragment = document.createDocumentFragment();
  
  round.questions.forEach((question, index) => {
    if (typeof perfLab !== 'undefined') perfLab.start(`createQuestion-${round.roundNumber}-${index}`);
    const questionElement = createQuestionElement(question, index + 1, round.roundNumber);
    questionFragment.appendChild(questionElement);
    if (typeof perfLab !== 'undefined') perfLab.end(`createQuestion-${round.roundNumber}-${index}`);
  });
  
  // Append all questions at once
  content.appendChild(questionFragment);
  if (typeof perfLab !== 'undefined') perfLab.end('createRoundContent');
  
  roundDiv.appendChild(header);
  roundDiv.appendChild(content);
  
  if (typeof perfLab !== 'undefined') {
    perfLab.end('createRoundElement');
    perfLab.record('questionsPerRound', round.questions.length);
  }
  
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
  
  const answer = document.createElement('div');
  answer.className = 'question-answer';
  answer.textContent = question.answer;
  
  questionDiv.appendChild(category);
  questionDiv.appendChild(clue);
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
 * Render final trivia
 */
function renderFinalTrivia() {
  const finalDiv = document.getElementById('final-trivia');
  const category = document.getElementById('final-category');
  const question = document.getElementById('final-question');
  const answer = document.getElementById('final-answer');
  
  if (!currentGame.finalTrivia) {
    finalDiv.style.display = 'none';
    return;
  }
  
  finalDiv.style.display = 'block';
  category.textContent = currentGame.finalTrivia.category;
  question.textContent = currentGame.finalTrivia.question;
  answer.textContent = currentGame.finalTrivia.answer;
}

/**
 * Mark game as played
 */
async function markGameAsPlayed(gameId) {
  try {
    if (typeof perfLab !== 'undefined') perfLab.start('loadPlayedStatus');
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
        if (typeof perfLab !== 'undefined') perfLab.start('parseLocalStorage');
        playedStatus = JSON.parse(stored);
        if (typeof perfLab !== 'undefined') perfLab.end('parseLocalStorage');
      }
    }
    if (typeof perfLab !== 'undefined') perfLab.end('loadPlayedStatus');
    
    // Update status
    playedStatus[gameId] = true;
    
    // Save to localStorage (debounced to prevent blocking)
    if (typeof perfLab !== 'undefined') perfLab.start('saveToLocalStorage');
    debouncedLocalStorageWrite('triviabot-played-status', playedStatus);
    if (typeof perfLab !== 'undefined') perfLab.end('saveToLocalStorage');
    
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
 * Generate a new round from the archive
 */
async function generateNewRound(roundDiv, roundNumber, targetDifficulty) {
  const shuffleBtn = roundDiv.querySelector('.shuffle-round-btn');
  const originalContent = shuffleBtn.innerHTML;
  
  // Show loading state
  shuffleBtn.disabled = true;
  shuffleBtn.innerHTML = '<i data-lucide="loader-2"></i>';
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  try {
    // Load archive data
    const archiveResponse = await fetch('data/archive-backup.json');
    if (!archiveResponse.ok) {
      throw new Error('Failed to load archive');
    }
    
    const archive = await archiveResponse.json();
    
    // Filter archive for questions matching difficulty
    // We'll use a simple heuristic: easy rounds get easier questions, etc.
    const difficultyMap = {
      'easy': ['easy'],
      'medium': ['easy', 'medium'],
      'hard': ['medium', 'hard'],
      'expert': ['hard', 'expert']
    };
    
    const targetDifficulties = difficultyMap[targetDifficulty] || ['easy', 'medium'];
    
    // Calculate difficulty for each question (simple heuristic based on clue length and answer length)
    const calculateQuestionDifficulty = (question) => {
      const clueLength = question.clue?.length || 0;
      const answerLength = question.answer?.length || 0;
      const totalLength = clueLength + answerLength;
      
      if (totalLength < 100) return 'easy';
      if (totalLength < 200) return 'medium';
      if (totalLength < 300) return 'hard';
      return 'expert';
    };
    
    // Filter questions by difficulty
    const matchingQuestions = archive.filter(q => {
      if (!q.clue || !q.answer || !q.category) return false;
      const qDifficulty = calculateQuestionDifficulty(q);
      return targetDifficulties.includes(qDifficulty);
    });
    
    if (matchingQuestions.length < 3) {
      throw new Error('Not enough questions in archive for this difficulty');
    }
    
    // Group by category
    const questionsByCategory = {};
    matchingQuestions.forEach(q => {
      if (!questionsByCategory[q.category]) {
        questionsByCategory[q.category] = [];
      }
      questionsByCategory[q.category].push(q);
    });
    
    // Find a category with at least 3 questions
    const categoriesWithEnough = Object.keys(questionsByCategory).filter(
      cat => questionsByCategory[cat].length >= 3
    );
    
    if (categoriesWithEnough.length === 0) {
      throw new Error('No categories with enough questions');
    }
    
    // Pick a random category
    const selectedCategory = categoriesWithEnough[Math.floor(Math.random() * categoriesWithEnough.length)];
    const categoryQuestions = questionsByCategory[selectedCategory];
    
    // Shuffle and pick 3 questions
    const shuffled = [...categoryQuestions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, 3).map(q => ({
      clue: q.clue,
      answer: q.answer,
      category: q.category
    }));
    
    // Update the round in currentGame
    const round = currentGame.rounds.find(r => r.roundNumber === roundNumber);
    if (round) {
      round.questions = selectedQuestions;
    }
    
    // Re-render the round
    const content = roundDiv.querySelector('.round-content');
    content.innerHTML = '';
    
    const questionFragment = document.createDocumentFragment();
    selectedQuestions.forEach((question, index) => {
      const questionElement = createQuestionElement(question, index + 1, roundNumber);
      questionFragment.appendChild(questionElement);
    });
    content.appendChild(questionFragment);
    
    // Re-initialize Lucide icons for new content
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    
  } catch (error) {
    console.error('Error generating new round:', error);
    alert(`Failed to generate new round: ${error.message}`);
  } finally {
    // Restore button
    shuffleBtn.disabled = false;
    shuffleBtn.innerHTML = originalContent;
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
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

