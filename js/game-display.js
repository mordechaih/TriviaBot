// Game display functionality

let currentGame = null;

// Debounce utility for localStorage writes
let localStorageWriteTimeout = null;
let pendingPlayedStatus = null;

/**
 * Round templates configuration (mirrors server-side)
 */
const ROUND_TEMPLATES = {
  1: { type: 'standard', roundType: 'get-your-feet-wet', title: 'Get Your Feet Wet', points: 2, useLLM: false },
  2: { type: 'over-under', roundType: 'over-under', title: 'Over/Under', points: 3, useLLM: false },
  3: { type: 'standard', roundType: 'trifecta-trivia', title: 'Trifecta Trivia', points: 3, useLLM: false },
  4: { type: 'list', roundType: 'list-round', title: 'The List Round', points: 'variable', useLLM: false },
  5: { type: 'game-show-style', roundType: 'game-show-style', title: 'Game Show Style', points: 4, useLLM: true, subTypes: ['to-tell-the-truth', 'name-that-tune', 'millionaire', 'family-feud'] },
  6: { type: 'entertainment', roundType: 'entertainment-trivia', title: 'Entertainment Trivia', points: 4, useLLM: false },
  7: { type: 'mixing-things-up', roundType: 'mixing-things-up', title: 'Mixing Things Up', points: 5, useLLM: true, subTypes: ['who-am-i', 'size-matters', 'name-that-brand', 'name-that-sports-team'] },
  8: { type: 'standard', roundType: 'game-changer', title: 'Game Changer Round', points: 6, useLLM: false }
};

const ENTERTAINMENT_KEYWORDS = [
  'movie', 'film', 'cinema', 'tv', 'television', 'music', 'band', 'album', 'song', 'singer',
  'actor', 'actress', 'oscar', 'grammy', 'emmy', 'netflix', 'broadway', 'hollywood',
  'comedy', 'drama', 'sitcom', 'series', 'director', 'starring', 'soundtrack'
];

function filterEntertainmentArchive(archive) {
  const lower = (s) => (s || '').toLowerCase();
  return archive.filter(q => {
    const cat = lower(q.category);
    const clue = lower(q.clue || '');
    return ENTERTAINMENT_KEYWORDS.some(kw => cat.includes(kw) || clue.includes(kw));
  });
}

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
 * Load banned questions from localStorage
 */
function loadBannedQuestions() {
  try {
    const stored = localStorage.getItem('triviabot-banned-questions');
    if (stored) {
      const data = JSON.parse(stored);
      return data.questions || [];
    }
  } catch (error) {
    console.warn('Error loading banned questions:', error);
  }
  return [];
}

/**
 * Load played games from localStorage
 */
function loadPlayedGames() {
  try {
    const stored = localStorage.getItem('triviabot-played-status');
    if (stored) {
      const data = JSON.parse(stored);
      // Handle both old and new formats
      if (data.games) {
        return Object.keys(data.games).filter(gameId => data.games[gameId].played === true);
      }
      // Old format
      return Object.keys(data).filter(gameId => data[gameId] === true);
    }
  } catch (error) {
    console.warn('Error loading played games:', error);
  }
  return [];
}

/**
 * Save banned questions to localStorage
 */
function saveBannedQuestions(questions) {
  try {
    const data = {
      questions: questions,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('triviabot-banned-questions', JSON.stringify(data));
  } catch (error) {
    console.error('Error saving banned questions:', error);
  }
}

/** Map roundType + subType to pool file path (without 'data/' prefix). Standard rounds use archive. */
const POOL_FILES = {
  'over-under': 'over-under-questions.json',
  'game-show-style': {
    'to-tell-the-truth': 'to-tell-the-truth-questions.json',
    'name-that-tune': 'name-that-tune-questions.json',
    'millionaire': 'millionaire-questions.json',
    'family-feud': 'family-feud-questions.json'
  },
  'mixing-things-up': {
    'who-am-i': 'who-am-i-questions.json',
    'size-matters': 'size-matters-questions.json',
    'name-that-brand': 'name-that-brand-questions.json',
    'name-that-sports-team': 'name-that-sports-team-questions.json'
  }
};

/**
 * Persist the current modified game to localStorage so changes survive refresh.
 */
function persistCurrentGame() {
  if (!currentGame) return;
  try {
    localStorage.setItem(`triviabot-game-${currentGame.id}`, JSON.stringify(currentGame));
  } catch (error) {
    console.warn('Error persisting game:', error);
  }
}

/**
 * Sync banned questions and used questions to the server (data/ files) so the generator picks them up.
 * Falls back to localStorage-only if server is unavailable (e.g. deployed static site).
 */
function syncUIDataToServer() {
  try {
    const banned = loadBannedQuestions();
    const bannedPayload = { questions: banned, lastUpdated: new Date().toISOString() };

    const stored = localStorage.getItem('triviabot-used-questions') || '[]';
    const usedIds = JSON.parse(stored);

    // Always persist to localStorage as fallback
    localStorage.setItem('triviabot-banned-questions-export', JSON.stringify(bannedPayload, null, 2));
    localStorage.setItem('triviabot-used-questions-export', JSON.stringify(usedIds));

    // Try to write to server files via dev-server API
    fetch('/api/sync-ui-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bannedQuestions: bannedPayload, usedQuestions: usedIds })
    }).catch(() => {
      // Silently ignore if server not available (static deploy)
    });
  } catch (error) {
    console.warn('Error syncing UI data:', error);
  }
}

/**
 * Track a question as "used" in localStorage so the generator won't pick it again.
 */
function trackUsedQuestion(question) {
  try {
    const stored = localStorage.getItem('triviabot-used-questions') || '[]';
    const used = JSON.parse(stored);
    const id = `${question.clue}|${question.answer || ''}`;
    if (!used.includes(id)) {
      used.push(id);
      localStorage.setItem('triviabot-used-questions', JSON.stringify(used));
    }
  } catch (error) {
    console.warn('Error tracking used question:', error);
  }
}

/**
 * Generate a replacement question from the appropriate pool or archive.
 * Themed rounds use pool files in data/; standard rounds use archive.
 * @param {number} roundNumber - Round index
 * @param {string} [currentCategory] - Prefer same category (archive only)
 * @param {string} [subType] - Required for game-show-style and mixing-things-up
 */
async function generateReplacementQuestion(roundNumber, currentCategory = null, subType = null, currentRoundQuestions = []) {
  const roundType = ROUND_TEMPLATES[roundNumber]?.roundType;
  const bannedQuestions = loadBannedQuestions();
  const isBanned = (q, clueKey, answerKey) =>
    bannedQuestions.some(b => b.clue === (q[clueKey] ?? q.clue) && (b.answer === (q[answerKey] ?? q.answer) || !b.answer));
  const isInCurrentRound = (q) =>
    currentRoundQuestions.some(rq => rq.clue === q.clue || (rq.clue === (q.question || q.clue)));

  try {
    if (roundType === 'list-round') {
      const listResponse = await fetch('data/list-round-questions.json');
      if (!listResponse.ok) throw new Error('Failed to load list-round questions');
      const { questions = [] } = await listResponse.json();
      const listId = (clue) => `list:${clue}`;
      const isListBanned = (clue) =>
        bannedQuestions.some(b => b.questionId === listId(clue) || (b.clue === clue && b.questionId?.startsWith('list:')));
      const available = (questions || []).filter(q =>
        q.clue && Array.isArray(q.answers) && q.answers.length >= 2 && !isListBanned(q.clue) && !isInCurrentRound(q)
      );
      if (available.length === 0) throw new Error('No replacement list-round questions available');
      const selected = available[Math.floor(Math.random() * available.length)];
      return { clue: selected.clue, answers: selected.answers, pointsAvailable: selected.answers.length };
    }

    if (roundType === 'over-under') {
      const file = POOL_FILES['over-under'];
      const res = await fetch(`data/${file}`);
      if (!res.ok) throw new Error('Failed to load Over/Under questions');
      const { questions = [] } = await res.json();
      const available = (questions || []).filter(q =>
        q.clue && (q.actualNumber !== undefined || q.answer) && !isBanned(q, 'clue', 'answer') && !isInCurrentRound(q)
      );
      if (available.length === 0) throw new Error('No replacement Over/Under questions available');
      const selected = available[Math.floor(Math.random() * available.length)];
      const actual = typeof selected.actualNumber === 'number' ? selected.actualNumber : Number(selected.answer) || 0;
      const target = typeof selected.targetNumber === 'number' ? selected.targetNumber : actual;
      const overOrUnder = selected.overOrUnder ?? (actual > target ? 'Over' : 'Under');
      return { clue: selected.clue, answer: String(selected.answer ?? actual), actualNumber: actual, targetNumber: target, overOrUnder };
    }

    if (roundType === 'entertainment-trivia') {
      const archiveResponse = await fetch('data/archive-backup.json');
      if (!archiveResponse.ok) throw new Error('Failed to load archive');
      const archive = await archiveResponse.json();
      const entertainment = filterEntertainmentArchive(archive);
      const available = entertainment.filter(q =>
        q.clue && q.answer && q.category && !isBanned(q, 'clue', 'answer') && !isInCurrentRound(q)
      );
      if (available.length === 0) throw new Error('No replacement entertainment questions available');
      const selected = available[Math.floor(Math.random() * available.length)];
      return { clue: selected.clue, answer: selected.answer, category: selected.category };
    }

    const gameShowPools = POOL_FILES['game-show-style'];
    if (roundType === 'game-show-style' && subType && gameShowPools[subType]) {
      const file = gameShowPools[subType];
      const res = await fetch(`data/${file}`);
      if (!res.ok) throw new Error(`Failed to load ${subType} questions`);
      const data = await res.json();
      const rawQuestions = data.questions || [];
      if (subType === 'family-feud') {
        const available = rawQuestions.filter(q => {
          const clue = q.question;
          const answer = q.topAnswers?.[0]?.answer;
          return clue && answer && !isBanned({ clue, answer }, 'clue', 'answer') && !isInCurrentRound({ clue, question: q.question });
        });
        if (available.length === 0) throw new Error('No replacement Family Feud questions available');
        const selected = available[Math.floor(Math.random() * available.length)];
        return {
          clue: selected.question,
          answer: selected.topAnswers?.[0]?.answer || 'Unknown',
          topAnswers: selected.topAnswers || [],
          category: 'Family Feud'
        };
      }
      const available = rawQuestions.filter(q => q.clue && (q.answer || q.correctAnswer) && !isBanned(q, 'clue', 'answer') && !isInCurrentRound(q));
      if (available.length === 0) throw new Error(`No replacement ${subType} questions available`);
      const selected = available[Math.floor(Math.random() * available.length)];
      if (subType === 'millionaire') {
        return {
          clue: selected.clue,
          options: selected.options,
          correctAnswer: selected.correctAnswer ?? selected.answer,
          answer: selected.correctAnswer ?? selected.answer,
          explanation: selected.explanation
        };
      }
      return {
        clue: selected.clue,
        answer: selected.answer ?? selected.correctAnswer,
        explanation: selected.explanation,
        details: selected.details,
        league: selected.league
      };
    }

    const mixingPools = POOL_FILES['mixing-things-up'];
    if (roundType === 'mixing-things-up' && subType && mixingPools[subType]) {
      const file = mixingPools[subType];
      const res = await fetch(`data/${file}`);
      if (!res.ok) throw new Error(`Failed to load ${subType} questions`);
      const { questions = [] } = await res.json();
      const available = (questions || []).filter(q => q.clue && q.answer && !isBanned(q, 'clue', 'answer') && !isInCurrentRound(q));
      if (available.length === 0) throw new Error(`No replacement ${subType} questions available`);
      const selected = available[Math.floor(Math.random() * available.length)];
      return {
        clue: selected.clue,
        answer: selected.answer,
        details: selected.details,
        league: selected.league,
        category: selected.category
      };
    }

    const archiveResponse = await fetch('data/archive-backup.json');
    if (!archiveResponse.ok) throw new Error('Failed to load archive');
    const archive = await archiveResponse.json();
    const playedGames = loadPlayedGames();

    const availableQuestions = archive.filter(q =>
      q.clue && q.answer && q.category && !isBanned(q, 'clue', 'answer') && !isInCurrentRound(q)
    );
    let candidates = availableQuestions;
    if (currentCategory) {
      const sameCategory = availableQuestions.filter(q => q.category === currentCategory);
      if (sameCategory.length > 0) candidates = sameCategory;
    }
    if (candidates.length === 0) throw new Error('No replacement questions available');
    return candidates[Math.floor(Math.random() * candidates.length)];
  } catch (error) {
    console.error('Error generating replacement question:', error);
    return null;
  }
}

// Track questions currently being banned to prevent multiple animations
const banningQuestions = new Set();

/**
 * Mark a question as banned in localStorage (without animation)
 * Used for shuffling rounds
 */
function markQuestionAsBannedSilent(gameId, roundNumber, questionIndex, reason = 'shuffled') {
  const banned = loadBannedQuestions();
  const round = currentGame.rounds.find(r => r.roundNumber === roundNumber);
  const question = round?.questions?.[questionIndex];
  
  if (!question) {
    return;
  }
  
  // Check if already banned
  const existingIndex = banned.findIndex(b => 
    b.gameId === gameId && 
    b.roundNumber === roundNumber && 
    b.questionIndex === questionIndex
  );
  
  if (existingIndex !== -1) {
    return; // Already banned
  }

  const isListRound = round?.roundType === 'list-round' && question?.answers && Array.isArray(question.answers);
  const banEntry = {
    gameId,
    roundNumber,
    questionIndex,
    clue: question.clue,
    answer: question.answer,
    reason: reason,
    flaggedDate: new Date().toISOString(),
    bannedBy: reason
  };
  if (isListRound) {
    banEntry.questionId = `list:${question.clue}`;
    banEntry.source = 'list-round';
  }
  banned.push(banEntry);

  saveBannedQuestions(banned);
  
  // Update the question in currentGame
  question.isBanned = true;
}

/**
 * Mark a question as banned with animation sequence
 */
async function markQuestionAsBanned(gameId, roundNumber, questionIndex, reason = 'manual') {
  // Create unique key for this question
  const banKey = `${gameId}-${roundNumber}-${questionIndex}`;
  
  // Prevent multiple simultaneous bans
  if (banningQuestions.has(banKey)) {
    console.log('Question is already being banned');
    return;
  }
  
  const banned = loadBannedQuestions();
  const round = currentGame.rounds.find(r => r.roundNumber === roundNumber);
  const question = round?.questions?.[questionIndex];
  
  if (!question) {
    console.error('Question not found');
    return;
  }
  
  // Check if already banned
  const existingIndex = banned.findIndex(b => 
    b.gameId === gameId && 
    b.roundNumber === roundNumber && 
    b.questionIndex === questionIndex
  );
  
  if (existingIndex !== -1) {
    console.log('Question already banned');
    return;
  }
  
  // Mark as being banned
  banningQuestions.add(banKey);
  
  const isListRound = round?.roundType === 'list-round' && question?.answers && Array.isArray(question.answers);
  const banEntry = {
    gameId,
    roundNumber,
    questionIndex,
    clue: question.clue,
    answer: question.answer,
    reason: reason,
    flaggedDate: new Date().toISOString(),
    bannedBy: reason
  };
  if (isListRound) {
    banEntry.questionId = `list:${question.clue}`;
    banEntry.source = 'list-round';
  }
  banned.push(banEntry);

  saveBannedQuestions(banned);

  // Update the question in currentGame
  if (question) {
    question.isBanned = true;
  }

  // Find the question element
  const questionDiv = document.querySelector(
    `.round[data-round="${roundNumber}"] .question[data-question-index="${questionIndex}"]`
  );
  
  if (!questionDiv) {
    console.error('Question element not found');
    banningQuestions.delete(banKey);
    return;
  }
  
  // Disable the button immediately
  const btn = questionDiv.querySelector('.banned-btn');
  if (btn) {
    btn.disabled = true;
    btn.title = 'Question is banned';
  }
  
  // Step 1: Add "banning" class to trigger strikethrough animation
  questionDiv.classList.add('banning');
  
  // Verify elements exist and log for debugging
  const clueEl = questionDiv.querySelector('.question-clue');
  const answerEl = questionDiv.querySelector('.question-answer');
  
  console.log('Added banning class to question element', {
    questionDiv,
    hasClue: !!clueEl,
    hasAnswer: !!answerEl,
    classes: questionDiv.className
  });
  
  // Force a reflow to ensure the class is applied before animation starts
  void questionDiv.offsetHeight;
  
  // Step 2: After strikethrough animation (600ms) + rest (400ms), start slide out
  setTimeout(async () => {
    // Add banned class for final styling
    questionDiv.classList.add('banned');
    questionDiv.classList.remove('banning');
    
    // Step 3: Generate replacement question (from archive or family-feud-questions.json when round is family-feud)
    const replacement = await generateReplacementQuestion(roundNumber, question.category, round.subType, round.questions || []);
    
    if (replacement) {
      // Step 4: Add sliding-out class to old question
      questionDiv.classList.add('sliding-out');
      
      // Step 5: Build new question from replacement (preserve round-specific fields)
      let newQuestion;
      if (round.roundType === 'list-round' && replacement.answers) {
        newQuestion = {
          clue: replacement.clue,
          answers: replacement.answers,
          pointsAvailable: replacement.pointsAvailable ?? replacement.answers.length,
          isBanned: false
        };
      } else if (round.roundType === 'over-under' && replacement.actualNumber !== undefined) {
        newQuestion = {
          clue: replacement.clue,
          answer: replacement.answer,
          actualNumber: replacement.actualNumber,
          targetNumber: replacement.targetNumber,
          overOrUnder: replacement.overOrUnder,
          isBanned: false
        };
      } else if (round.roundType === 'game-show-style' || round.roundType === 'mixing-things-up' || round.roundType === 'entertainment-trivia') {
        newQuestion = { ...replacement, isBanned: false };
      } else {
        newQuestion = {
          clue: replacement.clue,
          answer: replacement.answer,
          category: replacement.category,
          isBanned: false
        };
        if (replacement.topAnswers) newQuestion.topAnswers = replacement.topAnswers;
      }

      // Update the question in currentGame
      round.questions[questionIndex] = newQuestion;
      
      // Track new question and persist
      trackUsedQuestion(newQuestion);
      persistCurrentGame();
      syncUIDataToServer();
      
      // Create new question element
      const newQuestionDiv = createQuestionElement(newQuestion, questionIndex + 1, round);
      newQuestionDiv.classList.add('sliding-in');
      newQuestionDiv.setAttribute('data-question-index', questionIndex);
      
      // Get the round content container
      const roundContent = questionDiv.parentNode;
      
      // Insert new question in the same position (before the old one)
      roundContent.insertBefore(newQuestionDiv, questionDiv);
      
      // Re-initialize Lucide icons for new content
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
      
      // Step 6: After slide-out animation completes (500ms), remove old question
      setTimeout(() => {
        // Only remove if it still exists (safety check)
        if (questionDiv.parentNode) {
          questionDiv.remove();
        }
        // Remove sliding-in class after animation
        setTimeout(() => {
          if (newQuestionDiv.parentNode) {
            newQuestionDiv.classList.remove('sliding-in');
          }
          // Clear the banning flag
          banningQuestions.delete(banKey);
        }, 500);
      }, 500);
    } else {
      // If no replacement, just keep the banned question
      console.warn('Could not generate replacement question');
      banningQuestions.delete(banKey);
    }
  }, 1000); // 600ms animation + 400ms rest
  
  console.log(`Question banned: Round ${roundNumber}, Q${questionIndex + 1}`);
}

/**
 * Check if a question is banned
 */
function isQuestionBanned(gameId, roundNumber, questionIndex) {
  const banned = loadBannedQuestions();
  return banned.some(b => 
    b.gameId === gameId && 
    b.roundNumber === roundNumber && 
    b.questionIndex === questionIndex
  );
}

/**
 * Get game number by loading games index and finding position
 */
async function getGameNumber(gameId) {
  try {
    const response = await fetch('data/games/index.json');
    if (!response.ok) {
      return null; // Can't determine number
    }
    const index = await response.json();
    if (!index.games || !Array.isArray(index.games)) {
      return null;
    }
    
    // Handle both string array and object array formats
    // Sort games by date (newest first) to match game-list.js logic
    const sortedGames = [...index.games].sort((a, b) => {
      // Handle both string IDs and objects with id/date properties
      const gameA = typeof a === 'string' ? a : (a.id || a);
      const gameB = typeof b === 'string' ? b : (b.id || b);
      const dateA = typeof a === 'object' && a.date ? a.date : gameA.replace('game-', '');
      const dateB = typeof b === 'object' && b.date ? b.date : gameB.replace('game-', '');
      return new Date(dateB) - new Date(dateA);
    });
    
    // Find the index of current game
    const gameIndex = sortedGames.findIndex(g => {
      const gameIdToCheck = typeof g === 'string' ? g : (g.id || g);
      return gameIdToCheck === gameId;
    });
    if (gameIndex === -1) {
      return null;
    }
    
    // Game number is position from end (newest = #1)
    return sortedGames.length - gameIndex;
  } catch (error) {
    console.warn('Could not determine game number:', error);
    return null;
  }
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
    
    // Check for persisted modifications (from replace/shuffle)
    const persisted = localStorage.getItem(`triviabot-game-${currentGame.id}`);
    if (persisted) {
      try {
        const persistedGame = JSON.parse(persisted);
        // Only use persisted if it's the same game (same id and date)
        if (persistedGame.id === currentGame.id && persistedGame.date === currentGame.date) {
          currentGame = persistedGame;
          console.log('Loaded persisted game modifications from localStorage');
        }
      } catch (e) {
        console.warn('Error loading persisted game:', e);
      }
    }
    
    // Get game number
    currentGame.gameNumber = await getGameNumber(gameId);
    
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
    titleEl.textContent = `Game #${currentGame.gameNumber || '?'}`;
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = currentGame.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
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
  
  // Initialize Lucide icons after all rounds are in the DOM
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
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
  
  // Get template for this round
  const template = ROUND_TEMPLATES[round.roundNumber] || {};
  
  // Round header (collapsible)
  if (typeof perfLab !== 'undefined') perfLab.start('createRoundHeader');
  const header = document.createElement('div');
  header.className = 'round-header';
  header.onclick = () => toggleRound(roundDiv);
  
  const title = document.createElement('h2');
  // Use round title from data or template
  const roundTitle = round.title || template.title || `Round ${round.roundNumber}`;
  title.textContent = `Round ${round.roundNumber}: ${roundTitle}`;
  
  // Show subType badge if applicable
  const badges = document.createElement('div');
  badges.className = 'round-badges';
  
  if (round.subType) {
    const subTypeBadge = document.createElement('span');
    subTypeBadge.className = 'subtype-badge';
    subTypeBadge.textContent = round.subType.replace(/-/g, ' ');
    badges.appendChild(subTypeBadge);
  }
  
  const difficulty = document.createElement('span');
  difficulty.className = 'difficulty';
  difficulty.textContent = round.difficulty || template.difficulty || '';
  if (difficulty.textContent) {
    badges.appendChild(difficulty);
  }
  
  // Points badge
  const pointsBadge = document.createElement('span');
  pointsBadge.className = 'points-badge';
  const pts = round.pointsPerQuestion || template.points || '?';
  pointsBadge.textContent = `${pts} pts`;
  badges.appendChild(pointsBadge);
  
  const toggle = document.createElement('span');
  toggle.className = 'toggle';
  toggle.textContent = '▼';
  
  const shuffleRoundBtn = document.createElement('button');
  shuffleRoundBtn.className = 'shuffle-round-btn';
  shuffleRoundBtn.title = template.useLLM ? 'Regenerate round (LLM)' : 'Generate new round';
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
  
  shuffleRoundBtn.onclick = async (e) => {
    e.stopPropagation(); // Prevent round toggle
    await generateNewRound(roundDiv, round.roundNumber, round.difficulty, round.subType);
  };
  
  header.appendChild(title);
  header.appendChild(badges);
  header.appendChild(shuffleRoundBtn);
  header.appendChild(toggle);
  if (typeof perfLab !== 'undefined') perfLab.end('createRoundHeader');
  
  // Round content
  if (typeof perfLab !== 'undefined') perfLab.start('createRoundContent');
  const content = document.createElement('div');
  content.className = 'round-content';
  
  // Show instructions if present
  if (round.instructions) {
    const instructions = document.createElement('div');
    instructions.className = 'round-instructions';
    instructions.textContent = round.instructions;
    content.appendChild(instructions);
  }
  
  // Use DocumentFragment to batch question DOM operations
  const questionFragment = document.createDocumentFragment();
  
  round.questions.forEach((question, index) => {
    if (typeof perfLab !== 'undefined') perfLab.start(`createQuestion-${round.roundNumber}-${index}`);
    // Pass full round object for type-specific rendering
    const questionElement = createQuestionElement(question, index + 1, round);
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
 * Create a question element based on round type
 */
function createQuestionElement(question, number, round) {
  const roundNumber = round.roundNumber || round;
  const roundType = round.roundType || 'standard';
  const subType = round.subType;
  
  // Route to specific renderer based on type
  switch(roundType) {
    case 'over-under':
      return createOverUnderElement(question, number, roundNumber);
    case 'list-round':
      return createListElement(question, number, roundNumber);
    case 'game-show-style':
      if (subType === 'family-feud') {
        return createFamilyFeudElement(question, number, roundNumber);
      } else if (subType === 'to-tell-the-truth') {
        return createTrueFalseElement(question, number, roundNumber);
      } else if (subType === 'millionaire') {
        return createMultipleChoiceElement(question, number, roundNumber);
      }
      return createStandardElement(question, number, roundNumber);
    default:
      return createStandardElement(question, number, roundNumber);
  }
}

/**
 * Create standard question element
 */
function createStandardElement(question, number, roundNumber) {
  const questionDiv = document.createElement('div');
  questionDiv.className = 'question';
  questionDiv.setAttribute('data-question-index', number - 1);
  
  // Check if banned - only use the isBanned flag from the question object
  // Don't check localStorage to avoid false positives for new questions
  // Use truthy check to handle both true and undefined (for initial load)
  if (question.isBanned) {
    questionDiv.classList.add('banned');
  }
  
  // Question header with category and ban button
  const header = document.createElement('div');
  header.className = 'question-header';
  
  const category = document.createElement('div');
  category.className = 'question-category';
  category.textContent = `Q${number}: ${question.category || 'General'}`;
  
  const bannedBtn = document.createElement('button');
  bannedBtn.className = 'banned-btn';
  bannedBtn.title = 'Mark as banned';
  bannedBtn.innerHTML = '<i data-lucide="circle-slash"></i>';
  bannedBtn.onclick = (e) => {
    e.stopPropagation();
    if (confirm('Ban this question? It will not be used in future games.')) {
      markQuestionAsBanned(currentGame.id, roundNumber, number - 1);
    }
  };
  
  if (questionDiv.classList.contains('banned')) {
    bannedBtn.disabled = true;
    bannedBtn.title = 'Question is banned';
  }
  
  header.appendChild(bannedBtn);
  header.appendChild(category);
  
  const clue = document.createElement('div');
  clue.className = 'question-clue';
  clue.textContent = question.clue;
  
  const answer = document.createElement('div');
  answer.className = 'question-answer';
  const answerText = question.answer || '';
  answer.textContent = String(answerText);
  
  // Add explanation if present
  if (question.explanation) {
    const explanation = document.createElement('div');
    explanation.className = 'question-explanation';
    explanation.textContent = question.explanation;
    answer.appendChild(document.createElement('br'));
    answer.appendChild(explanation);
  }
  
  questionDiv.appendChild(header);
  questionDiv.appendChild(clue);
  questionDiv.appendChild(answer);
  
  return questionDiv;
}

/**
 * Create Over/Under question element
 */
function createOverUnderElement(question, number, roundNumber) {
  const questionDiv = createStandardElement(question, number, roundNumber);
  questionDiv.classList.add('over-under-question');
  
  // If question has targetNumber and actualNumber, show "Over" or "Under" in bold, actual number in parentheses
  if (question.targetNumber !== undefined && question.actualNumber !== undefined) {
    const clue = questionDiv.querySelector('.question-clue');
    clue.innerHTML = `${question.clue} <strong>– ${question.targetNumber}</strong>`;
    const overOrUnder = question.overOrUnder ?? (question.actualNumber > question.targetNumber ? 'Over' : 'Under');
    const answer = questionDiv.querySelector('.question-answer');
    answer.innerHTML = `<strong>${overOrUnder}</strong> (${question.actualNumber})`;
  }
  
  return questionDiv;
}

/**
 * Create List Round question element
 */
function createListElement(question, number, roundNumber) {
  const questionDiv = document.createElement('div');
  questionDiv.className = 'question list-question';
  questionDiv.setAttribute('data-question-index', number - 1);
  
  // Check if banned - only use the isBanned flag from the question object
  if (question.isBanned) {
    questionDiv.classList.add('banned');
  }
  
  const header = document.createElement('div');
  header.className = 'question-header';
  
  const category = document.createElement('div');
  category.className = 'question-category';
  const points = question.pointsAvailable || (question.answers?.length) || '?';
  category.textContent = `List Round (${points} points possible)`;
  
  const bannedBtn = document.createElement('button');
  bannedBtn.className = 'banned-btn';
  bannedBtn.title = 'Mark as banned';
  bannedBtn.innerHTML = '<i data-lucide="circle-slash"></i>';
  bannedBtn.onclick = (e) => {
    e.stopPropagation();
    if (confirm('Ban this question? It will not be used in future games.')) {
      markQuestionAsBanned(currentGame.id, roundNumber, number - 1);
    }
  };
  
  header.appendChild(bannedBtn);
  header.appendChild(category);
  
  const clue = document.createElement('div');
  clue.className = 'question-clue';
  clue.textContent = question.clue;
  
  const answer = document.createElement('div');
  answer.className = 'question-answer list-answers';
  
  // Show answers as a list
  if (question.answers && Array.isArray(question.answers)) {
    const list = document.createElement('ul');
    question.answers.forEach(ans => {
      const item = document.createElement('li');
      item.textContent = ans;
      list.appendChild(item);
    });
    answer.appendChild(list);
  } else {
    answer.textContent = question.answer || '';
  }
  
  questionDiv.appendChild(header);
  questionDiv.appendChild(clue);
  questionDiv.appendChild(answer);
  
  return questionDiv;
}

/**
 * Create True/False question element
 */
function createTrueFalseElement(question, number, roundNumber) {
  const questionDiv = createStandardElement(question, number, roundNumber);
  questionDiv.classList.add('true-false-question');
  
  const answer = questionDiv.querySelector('.question-answer');
  const isTrue = question.answer === 'True' || question.answer === true;
  answer.classList.add(isTrue ? 'answer-true' : 'answer-false');
  
  return questionDiv;
}

/**
 * Create Multiple Choice question element
 */
function createMultipleChoiceElement(question, number, roundNumber) {
  const questionDiv = document.createElement('div');
  questionDiv.className = 'question multiple-choice-question';
  questionDiv.setAttribute('data-question-index', number - 1);
  
  // Check if banned - only use the isBanned flag from the question object
  if (question.isBanned) {
    questionDiv.classList.add('banned');
  }
  
  const header = document.createElement('div');
  header.className = 'question-header';
  
  const category = document.createElement('div');
  category.className = 'question-category';
  category.textContent = `Q${number}: Multiple Choice`;
  
  const bannedBtn = document.createElement('button');
  bannedBtn.className = 'banned-btn';
  bannedBtn.title = 'Mark as banned';
  bannedBtn.innerHTML = '<i data-lucide="circle-slash"></i>';
  bannedBtn.onclick = (e) => {
    e.stopPropagation();
    if (confirm('Ban this question?')) {
      markQuestionAsBanned(currentGame.id, roundNumber, number - 1);
    }
  };
  
  header.appendChild(bannedBtn);
  header.appendChild(category);
  
  const clue = document.createElement('div');
  clue.className = 'question-clue';
  clue.textContent = question.clue;
  
  // Options
  const optionsDiv = document.createElement('div');
  optionsDiv.className = 'question-options';
  if (question.options && Array.isArray(question.options)) {
    question.options.forEach(opt => {
      const optEl = document.createElement('div');
      optEl.className = 'option';
      optEl.textContent = opt;
      optionsDiv.appendChild(optEl);
    });
  }
  
  const answer = document.createElement('div');
  answer.className = 'question-answer';
  answer.innerHTML = `<strong>Answer: ${question.correctAnswer || question.answer}</strong>`;
  if (question.explanation) {
    answer.innerHTML += `<br><span class="explanation">${question.explanation}</span>`;
  }
  
  questionDiv.appendChild(header);
  questionDiv.appendChild(clue);
  questionDiv.appendChild(optionsDiv);
  questionDiv.appendChild(answer);
  
  return questionDiv;
}

/**
 * Create Family Feud question element
 */
function createFamilyFeudElement(question, number, roundNumber) {
  const questionDiv = document.createElement('div');
  questionDiv.className = 'question family-feud-question';
  questionDiv.setAttribute('data-question-index', number - 1);
  
  // Check if banned - only use the isBanned flag from the question object
  if (question.isBanned) {
    questionDiv.classList.add('banned');
  }
  
  const header = document.createElement('div');
  header.className = 'question-header';
  
  const category = document.createElement('div');
  category.className = 'question-category';
  category.textContent = `Q${number}: Family Feud`;
  
  const bannedBtn = document.createElement('button');
  bannedBtn.className = 'banned-btn';
  bannedBtn.title = 'Mark as banned';
  bannedBtn.innerHTML = '<i data-lucide="circle-slash"></i>';
  bannedBtn.onclick = (e) => {
    e.stopPropagation();
    if (confirm('Ban this question?')) {
      markQuestionAsBanned(currentGame.id, roundNumber, number - 1);
    }
  };
  
  header.appendChild(bannedBtn);
  header.appendChild(category);
  
  const clue = document.createElement('div');
  clue.className = 'question-clue';
  clue.textContent = question.clue;
  
  const answer = document.createElement('div');
  answer.className = 'question-answer family-feud-answers';
  
  // Top answer highlight
  const topAnswer = document.createElement('div');
  topAnswer.className = 'top-answer';
  topAnswer.innerHTML = `<strong>#1 Answer:</strong> ${question.answer}`;
  answer.appendChild(topAnswer);
  
  // Top 10 answers table (2 columns, 5 rows)
  if (question.topAnswers && Array.isArray(question.topAnswers)) {
    const table = document.createElement('table');
    table.className = 'feud-table';
    
    for (let i = 0; i < 5; i++) {
      const row = document.createElement('tr');
      
      // Left column
      const left = question.topAnswers[i];
      const leftCell = document.createElement('td');
      if (left) {
        leftCell.innerHTML = `<span class="rank">${i + 1}.</span> ${left.answer} <span class="points">(${left.points})</span>`;
      }
      row.appendChild(leftCell);
      
      // Right column
      const right = question.topAnswers[i + 5];
      const rightCell = document.createElement('td');
      if (right) {
        rightCell.innerHTML = `<span class="rank">${i + 6}.</span> ${right.answer} <span class="points">(${right.points})</span>`;
      }
      row.appendChild(rightCell);
      
      table.appendChild(row);
    }
    
    answer.appendChild(table);
  }
  
  questionDiv.appendChild(header);
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
 * @param {string} gameId - The game ID
 * @param {boolean} manual - Whether this was manually triggered (show feedback)
 */
async function markGameAsPlayed(gameId, manual = false) {
  try {
    if (typeof perfLab !== 'undefined') perfLab.start('loadPlayedStatus');
    // Load current played status
    let playedStatus = { games: {} };
    try {
      const response = await fetch('data/played-status.json');
      if (response.ok) {
        playedStatus = await response.json();
        if (!playedStatus.games) playedStatus.games = {};
      }
    } catch (error) {
      // Fallback to localStorage
      const stored = localStorage.getItem('triviabot-played-status');
      if (stored) {
        if (typeof perfLab !== 'undefined') perfLab.start('parseLocalStorage');
        const parsed = JSON.parse(stored);
        // Handle old format (direct boolean) and new format (games object)
        if (parsed.games) {
          playedStatus = parsed;
        } else {
          // Convert old format
          playedStatus = { games: {} };
          Object.keys(parsed).forEach(key => {
            playedStatus.games[key] = { played: parsed[key], playedDate: new Date().toISOString() };
          });
        }
        if (typeof perfLab !== 'undefined') perfLab.end('parseLocalStorage');
      }
    }
    if (typeof perfLab !== 'undefined') perfLab.end('loadPlayedStatus');
    
    // Update status with new structure
    playedStatus.games[gameId] = {
      played: true,
      playedDate: new Date().toISOString()
    };
    
    // Also update game data
    if (currentGame) {
      currentGame.isPlayed = true;
    }
    
    // Save to localStorage (debounced to prevent blocking)
    if (typeof perfLab !== 'undefined') perfLab.start('saveToLocalStorage');
    debouncedLocalStorageWrite('triviabot-played-status', playedStatus);
    if (typeof perfLab !== 'undefined') perfLab.end('saveToLocalStorage');
    
    // Update UI if manually triggered
    if (manual) {
      const markPlayedBtn = document.getElementById('mark-played-btn');
      if (markPlayedBtn) {
        markPlayedBtn.disabled = true;
        markPlayedBtn.innerHTML = '<i data-lucide="check-circle-2"></i><span>Marked as Played</span>';
        markPlayedBtn.classList.add('played');
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }
      console.log(`Game ${gameId} manually marked as played`);
    }
    
  } catch (error) {
    console.error('Error marking game as played:', error);
  }
}

/**
 * Check if a game is marked as played
 */
function isGamePlayed(gameId) {
  try {
    const stored = localStorage.getItem('triviabot-played-status');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Handle both old and new formats
      if (parsed.games && parsed.games[gameId]) {
        return parsed.games[gameId].played === true;
      }
      return parsed[gameId] === true;
    }
  } catch (error) {
    console.warn('Error checking played status:', error);
  }
  return false;
}

/**
 * Setup the Mark as Played button
 */
function setupMarkPlayedButton() {
  const markPlayedBtn = document.getElementById('mark-played-btn');
  if (!markPlayedBtn || !currentGame) return;
  
  const alreadyPlayed = isGamePlayed(currentGame.id) || currentGame.isPlayed;
  
  if (alreadyPlayed) {
    markPlayedBtn.disabled = true;
    markPlayedBtn.innerHTML = '<i data-lucide="check-circle-2"></i><span>Marked as Played</span>';
    markPlayedBtn.classList.add('played');
  } else {
    markPlayedBtn.onclick = () => {
      if (confirm('Mark this game as played? This helps track which games have been used.')) {
        markGameAsPlayed(currentGame.id, true);
      }
    };
  }
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
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
 * Generate a new round from the archive (or LLM for rounds 5 and 7)
 */
async function generateNewRound(roundDiv, roundNumber, targetDifficulty, currentSubType = null) {
  const shuffleBtn = roundDiv.querySelector('.shuffle-round-btn');
  const originalContent = shuffleBtn.innerHTML;
  const template = ROUND_TEMPLATES[roundNumber];
  
  // Show loading state
  shuffleBtn.disabled = true;
  shuffleBtn.innerHTML = '<i data-lucide="loader-2"></i>';
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
  
  // Find current round and mark old questions as banned (silently, no animation)
  const round = currentGame.rounds.find(r => r.roundNumber === roundNumber);
  if (round && round.questions) {
    round.questions.forEach((q, idx) => {
      markQuestionAsBannedSilent(currentGame.id, roundNumber, idx, 'shuffled');
    });
    console.log(`Auto-banned ${round.questions.length} questions from shuffled round ${roundNumber}`);
  }
  
  try {
    // Check if this is an LLM-generated round
    if (template && template.useLLM) {
      // Try to generate via LLM
      const newSubType = currentSubType || (template.subTypes ? template.subTypes[Math.floor(Math.random() * template.subTypes.length)] : null);
      
      console.log(`Generating LLM round ${roundNumber} with subType: ${newSubType}`);
      
      // Call server-side API or use client-side LLM (placeholder for API endpoint)
      // For now, show a message that LLM generation requires server-side processing
      const useLLMApi = typeof window.TRIVIA_CONFIG !== 'undefined' && window.TRIVIA_CONFIG.openaiApiKey;
      
      if (!useLLMApi) {
        alert('LLM generation requires server-side processing or API key configuration. Falling back to archive-based generation.');
      } else {
        // TODO: Implement client-side LLM call when API is available
        console.warn('Client-side LLM generation not yet implemented');
      }
    }

    // List round: use data/list-round-questions.json
    if (template?.roundType === 'list-round' && round) {
      try {
        const listResponse = await fetch('data/list-round-questions.json');
        if (listResponse.ok) {
          const { questions = [] } = await listResponse.json();
          const bannedQuestions = loadBannedQuestions();
          const listId = (clue) => `list:${clue}`;
          const isListBanned = (clue) =>
            bannedQuestions.some(b => b.questionId === listId(clue) || (b.clue === clue && b.questionId?.startsWith('list:')));
          const available = (questions || []).filter(q =>
            q.clue && Array.isArray(q.answers) && q.answers.length >= 2 && !isListBanned(q.clue)
          );
          if (available.length > 0) {
            const selected = available[Math.floor(Math.random() * available.length)];
            const listQuestion = {
              clue: selected.clue,
              answers: selected.answers,
              pointsAvailable: selected.answers.length,
              isBanned: false
            };
            round.questions = [listQuestion];
            // Track new questions and persist
            [listQuestion].forEach(q => trackUsedQuestion(q));
            persistCurrentGame();
            syncUIDataToServer();
            const content = roundDiv.querySelector('.round-content');
            const instructionsEl = content.querySelector('.round-instructions');
            content.innerHTML = '';
            if (instructionsEl) content.appendChild(instructionsEl);
            const questionFragment = document.createDocumentFragment();
            round.questions.forEach((q, index) => {
              questionFragment.appendChild(createQuestionElement(q, index + 1, round));
            });
            content.appendChild(questionFragment);
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
          }
        }
      } catch (err) {
        console.warn('List round fallback failed:', err.message);
      }
    }

    // Entertainment round: only use entertainment-themed questions from archive
    if (template?.roundType === 'entertainment-trivia' && round) {
      try {
        const archiveResponse = await fetch('data/archive-backup.json');
        if (archiveResponse.ok) {
          const archive = await archiveResponse.json();
          const bannedQuestions = loadBannedQuestions();
          const entertainment = filterEntertainmentArchive(archive);
          const available = entertainment.filter(q => {
            if (!q.clue || !q.answer || !q.category) return false;
            return !bannedQuestions.some(b => b.clue === q.clue && b.answer === q.answer);
          });
          if (available.length >= 3) {
            const shuffled = [...available].sort(() => Math.random() - 0.5);
            const selectedQuestions = shuffled.slice(0, 3).map(q => ({
              clue: q.clue,
              answer: q.answer,
              category: q.category,
              isBanned: false
            }));
            round.questions = selectedQuestions;
            // Track new questions and persist
            selectedQuestions.forEach(q => trackUsedQuestion(q));
            persistCurrentGame();
            syncUIDataToServer();
            const content = roundDiv.querySelector('.round-content');
            const instructionsEl = content.querySelector('.round-instructions');
            content.innerHTML = '';
            if (instructionsEl) content.appendChild(instructionsEl);
            const questionFragment = document.createDocumentFragment();
            selectedQuestions.forEach((question, index) => {
              questionFragment.appendChild(createQuestionElement(question, index + 1, round));
            });
            content.appendChild(questionFragment);
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
          } else {
            alert('Not enough entertainment questions available to generate a new round.');
            return;
          }
        }
      } catch (err) {
        console.warn('Entertainment round generation failed:', err.message);
        alert('Failed to generate entertainment round: ' + err.message);
        return;
      }
    }

    // Game-show-style Family Feud: use data from family-feud-questions.json (populated by convert-protoqa script)
    const isFamilyFeudRound = template?.roundType === 'game-show-style' && (currentSubType === 'family-feud' || (template.subTypes && template.subTypes.includes('family-feud')));
    if (isFamilyFeudRound && round) {
      try {
        const ffResponse = await fetch('data/family-feud-questions.json');
        if (ffResponse.ok) {
          const { questions = [] } = await ffResponse.json();
          const bannedQuestions = loadBannedQuestions();
          const available = questions.filter(q => {
            const clue = q.question;
            const answer = q.topAnswers?.[0]?.answer;
            if (!clue || !answer) return false;
            return !bannedQuestions.some(b => b.clue === clue && (b.answer === answer || !b.answer));
          });
          if (available.length > 0) {
            const selected = available[Math.floor(Math.random() * available.length)];
            const selectedQuestions = [{
              clue: selected.question,
              answer: selected.topAnswers?.[0]?.answer || 'Unknown',
              topAnswers: selected.topAnswers || [],
              isBanned: false
            }];
            round.subType = 'family-feud';
            round.questions = selectedQuestions;
            // Track new questions and persist
            selectedQuestions.forEach(q => trackUsedQuestion(q));
            persistCurrentGame();
            syncUIDataToServer();
            const content = roundDiv.querySelector('.round-content');
            const instructionsEl = content.querySelector('.round-instructions');
            content.innerHTML = '';
            if (instructionsEl) content.appendChild(instructionsEl);
            const questionFragment = document.createDocumentFragment();
            selectedQuestions.forEach((question, index) => {
              questionFragment.appendChild(createQuestionElement(question, index + 1, round));
            });
            content.appendChild(questionFragment);
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
          }
        }
      } catch (err) {
        console.warn('Family Feud round fallback failed, using archive:', err.message);
      }
    }

    // Over/Under round: use pool file
    if (template?.roundType === 'over-under' && round) {
      try {
        const ouResponse = await fetch(`data/${POOL_FILES['over-under']}`);
        if (ouResponse.ok) {
          const { questions = [] } = await ouResponse.json();
          const bannedQuestions = loadBannedQuestions();
          const available = questions.filter(q =>
            q.clue && (q.actualNumber !== undefined || q.answer) &&
            !bannedQuestions.some(b => b.clue === q.clue && (b.answer === String(q.answer) || b.answer === String(q.actualNumber)))
          );
          if (available.length >= 3) {
            const shuffled = [...available].sort(() => Math.random() - 0.5);
            const selectedQuestions = shuffled.slice(0, 3).map(q => {
              const actual = typeof q.actualNumber === 'number' ? q.actualNumber : Number(q.answer) || 0;
              const target = typeof q.targetNumber === 'number' ? q.targetNumber : actual;
              const overOrUnder = q.overOrUnder ?? (actual > target ? 'Over' : 'Under');
              return { clue: q.clue, answer: String(q.answer ?? actual), actualNumber: actual, targetNumber: target, overOrUnder, isBanned: false };
            });
            round.questions = selectedQuestions;
            // Track new questions and persist
            selectedQuestions.forEach(q => trackUsedQuestion(q));
            persistCurrentGame();
            syncUIDataToServer();
            const content = roundDiv.querySelector('.round-content');
            const instructionsEl = content.querySelector('.round-instructions');
            content.innerHTML = '';
            if (instructionsEl) content.appendChild(instructionsEl);
            const questionFragment = document.createDocumentFragment();
            selectedQuestions.forEach((q, index) => {
              questionFragment.appendChild(createQuestionElement(q, index + 1, round));
            });
            content.appendChild(questionFragment);
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
          } else {
            alert('Not enough Over/Under questions available to generate a new round.');
            return;
          }
        }
      } catch (err) {
        console.warn('Over/Under round generation failed:', err.message);
        alert('Failed to generate Over/Under round: ' + err.message);
        return;
      }
    }

    // Game-show-style (non-Family-Feud): use pool files
    const gameShowPools = POOL_FILES['game-show-style'];
    if (template?.roundType === 'game-show-style' && round && currentSubType && currentSubType !== 'family-feud' && gameShowPools[currentSubType]) {
      try {
        const gsResponse = await fetch(`data/${gameShowPools[currentSubType]}`);
        if (gsResponse.ok) {
          const { questions = [] } = await gsResponse.json();
          const bannedQuestions = loadBannedQuestions();
          const available = questions.filter(q =>
            q.clue && (q.answer || q.correctAnswer) &&
            !bannedQuestions.some(b => b.clue === q.clue && (b.answer === q.answer || b.answer === q.correctAnswer))
          );
          if (available.length >= 3) {
            const shuffled = [...available].sort(() => Math.random() - 0.5);
            const selectedQuestions = shuffled.slice(0, 3).map(q => ({
              clue: q.clue,
              answer: q.answer ?? q.correctAnswer,
              options: q.options,
              correctAnswer: q.correctAnswer ?? q.answer,
              explanation: q.explanation,
              isBanned: false
            }));
            round.questions = selectedQuestions;
            round.subType = currentSubType;
            // Track new questions and persist
            selectedQuestions.forEach(q => trackUsedQuestion(q));
            persistCurrentGame();
            syncUIDataToServer();
            const content = roundDiv.querySelector('.round-content');
            const instructionsEl = content.querySelector('.round-instructions');
            content.innerHTML = '';
            if (instructionsEl) content.appendChild(instructionsEl);
            const questionFragment = document.createDocumentFragment();
            selectedQuestions.forEach((q, index) => {
              questionFragment.appendChild(createQuestionElement(q, index + 1, round));
            });
            content.appendChild(questionFragment);
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
          } else {
            alert(`Not enough ${currentSubType} questions available to generate a new round.`);
            return;
          }
        }
      } catch (err) {
        console.warn(`${currentSubType} round generation failed:`, err.message);
        alert(`Failed to generate ${currentSubType} round: ` + err.message);
        return;
      }
    }

    // Mixing-things-up: use pool files
    const mixingPools = POOL_FILES['mixing-things-up'];
    if (template?.roundType === 'mixing-things-up' && round && currentSubType && mixingPools[currentSubType]) {
      try {
        const mixResponse = await fetch(`data/${mixingPools[currentSubType]}`);
        if (mixResponse.ok) {
          const { questions = [] } = await mixResponse.json();
          const bannedQuestions = loadBannedQuestions();
          const available = questions.filter(q =>
            q.clue && q.answer &&
            !bannedQuestions.some(b => b.clue === q.clue && b.answer === q.answer)
          );
          if (available.length >= 3) {
            const shuffled = [...available].sort(() => Math.random() - 0.5);
            const selectedQuestions = shuffled.slice(0, 3).map(q => ({
              clue: q.clue,
              answer: q.answer,
              details: q.details,
              league: q.league,
              category: q.category,
              isBanned: false
            }));
            round.questions = selectedQuestions;
            round.subType = currentSubType;
            // Track new questions and persist
            selectedQuestions.forEach(q => trackUsedQuestion(q));
            persistCurrentGame();
            syncUIDataToServer();
            const content = roundDiv.querySelector('.round-content');
            const instructionsEl = content.querySelector('.round-instructions');
            content.innerHTML = '';
            if (instructionsEl) content.appendChild(instructionsEl);
            const questionFragment = document.createDocumentFragment();
            selectedQuestions.forEach((q, index) => {
              questionFragment.appendChild(createQuestionElement(q, index + 1, round));
            });
            content.appendChild(questionFragment);
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
          } else {
            alert(`Not enough ${currentSubType} questions available to generate a new round.`);
            return;
          }
        }
      } catch (err) {
        console.warn(`${currentSubType} round generation failed:`, err.message);
        alert(`Failed to generate ${currentSubType} round: ` + err.message);
        return;
      }
    }

    // Fall back to archive-based generation (data from Python jeopardy-parser + db-to-archive → archive-backup.json).
    // Note: Standard rounds (1, 3, 8) use the generic archive. Themed rounds (4, 6) have their own dedicated paths above.
    const archiveResponse = await fetch('data/archive-backup.json');
    if (!archiveResponse.ok) {
      throw new Error('Failed to load archive');
    }
    const archive = await archiveResponse.json();
    const bannedQuestions = loadBannedQuestions();

    // Filter archive for questions matching difficulty
    const difficultyMap = {
      'easy': ['easy'],
      'medium': ['easy', 'medium'],
      'hard': ['medium', 'hard'],
      'expert': ['hard', 'expert']
    };
    
    const targetDifficulties = difficultyMap[targetDifficulty] || ['easy', 'medium'];
    
    // Calculate difficulty for each question
    const calculateQuestionDifficulty = (question) => {
      const clueLength = question.clue?.length || 0;
      const answerLength = question.answer?.length || 0;
      const totalLength = clueLength + answerLength;
      
      if (totalLength < 100) return 'easy';
      if (totalLength < 200) return 'medium';
      if (totalLength < 300) return 'hard';
      return 'expert';
    };
    
    // Filter questions by difficulty and exclude banned
    const matchingQuestions = archive.filter(q => {
      if (!q.clue || !q.answer || !q.category) return false;
      const qDifficulty = calculateQuestionDifficulty(q);
      if (!targetDifficulties.includes(qDifficulty)) return false;
      
      // Check if banned
      const isBanned = bannedQuestions.some(b => 
        b.clue === q.clue && b.answer === q.answer
      );
      return !isBanned;
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
      category: q.category,
      isBanned: false
    }));
    
    // Update the round in currentGame
    if (round) {
      round.questions = selectedQuestions;
      // Track new questions and persist
      selectedQuestions.forEach(q => trackUsedQuestion(q));
      persistCurrentGame();
      syncUIDataToServer();
    }
    
    // Re-render the round content
    const content = roundDiv.querySelector('.round-content');
    
    // Keep instructions if present
    const instructionsEl = content.querySelector('.round-instructions');
    content.innerHTML = '';
    if (instructionsEl) {
      content.appendChild(instructionsEl);
    }
    
    const questionFragment = document.createDocumentFragment();
    selectedQuestions.forEach((question, index) => {
      const questionElement = createQuestionElement(question, index + 1, round);
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
  
  loadGame().then(() => {
    // Setup Mark as Played button after game loads
    setupMarkPlayedButton();
  });
  
  // Initialize Lucide icons for back button
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Run on page load
init();
