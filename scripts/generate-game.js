import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const ARCHIVE_FILE = './data/archive-backup.json';
const GAMES_DIR = './data/games';
const USED_QUESTIONS_FILE = './data/used-questions.json';

// Initialize OpenAI client (will be null if API key is not set)
let openaiClient = null;
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
} else {
  console.warn('Warning: OPENAI_API_KEY not set. LLM filtering and rewriting will be skipped.');
}

// Ensure games directory exists
if (!fs.existsSync(GAMES_DIR)) {
  fs.mkdirSync(GAMES_DIR, { recursive: true });
}

/**
 * Load the archive and used questions tracking
 */
function loadData() {
  let archive = [];
  if (fs.existsSync(ARCHIVE_FILE)) {
    const content = fs.readFileSync(ARCHIVE_FILE, 'utf-8');
    archive = JSON.parse(content);
  }
  
  let usedQuestions = new Set();
  if (fs.existsSync(USED_QUESTIONS_FILE)) {
    const content = fs.readFileSync(USED_QUESTIONS_FILE, 'utf-8');
    const used = JSON.parse(content);
    usedQuestions = new Set(used);
  }
  
  return { archive, usedQuestions };
}

/**
 * Calculate difficulty score for a question
 * Lower value = easier, higher value = harder
 */
function calculateDifficulty(question) {
  let score = 0;
  
  // Base score from dollar value
  if (question.round === 'Jeopardy') {
    score = question.value || 0; // $200-$1000
  } else if (question.round === 'Double Jeopardy') {
    score = (question.value || 0) + 1000; // $400-$2000, so 1400-3000
  } else if (question.round === 'Final Jeopardy') {
    score = 5000; // Final Jeopardy is always hardest
  }
  
  // Normalize to 0-100 scale for easier categorization
  // Jeopardy: 200-1000 -> 0-20
  // Double Jeopardy: 400-2000 -> 20-60
  // Final: 60-100
  if (question.round === 'Jeopardy') {
    score = (question.value - 200) / 800 * 20; // 0-20
  } else if (question.round === 'Double Jeopardy') {
    score = 20 + ((question.value - 400) / 1600 * 40); // 20-60
  } else if (question.round === 'Final Jeopardy') {
    score = 80; // Final is always high difficulty
  }
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Categorize difficulty level
 * Adjusted thresholds to better match actual question distribution
 */
function getDifficultyLevel(score) {
  if (score < 15) return 'easy';      // Jeopardy $200-$600
  if (score < 35) return 'medium';    // Jeopardy $800-$1000, Double $400-$800
  if (score < 55) return 'hard';      // Double $1000-$1600
  return 'expert';                     // Double $1800-$2000
}

/**
 * Check if a question should be disqualified using LLM
 * Returns { shouldDisqualify: boolean, reason?: string }
 */
async function shouldDisqualifyQuestion(question) {
  if (!openaiClient) {
    // If no API key, do basic pattern matching
    const category = question.category?.toLowerCase() || '';
    const clue = question.clue?.toLowerCase() || '';
    
    // Disqualify obvious anagram categories
    if (category.includes('anagram') || category.includes('scramble') || category.includes('rearrange')) {
      return { shouldDisqualify: true, reason: 'Anagram category' };
    }
    
    // Disqualify if clue contains category theme (basic check)
    const categoryThemes = ['i\'m in', 'without my', 'can\'t read', 'my wet hair'];
    if (categoryThemes.some(theme => clue.includes(theme))) {
      return { shouldDisqualify: false, reason: 'May need rewriting' };
    }
    
    return { shouldDisqualify: false };
  }
  
  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are evaluating trivia questions for a pub trivia game. Disqualify questions that:
1. Are from categories that rely on wordplay, anagrams, or category-specific themes that won't work without the category context
2. Require knowledge of the category name to answer (e.g., "I'm in Sephora without my glasses" category questions)
3. Are too meta or self-referential

Respond with JSON: {"shouldDisqualify": boolean, "reason": "brief explanation"}`
        },
        {
          role: 'user',
          content: `Category: ${question.category}\nClue: ${question.clue}\nAnswer: ${question.answer}\n\nShould this question be disqualified?`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error(`Error checking question disqualification: ${error.message}`);
    // On error, don't disqualify (fail open)
    return { shouldDisqualify: false };
  }
}

/**
 * Rewrite a question to remove category theme and focus on content
 * Returns the rewritten clue, or original if rewriting fails
 */
async function rewriteQuestion(question) {
  if (!openaiClient) {
    // Basic rewriting without LLM - just return original
    return question.clue;
  }
  
  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are rewriting trivia questions to remove category-specific themes and focus on the actual content. 
For example, "Can't read the label on this spray-pump bottle; my wet hair needs nourishing & detangling, so I hope it's leave-in this type of product" 
should become "This type of hair product is used for nourishing and detangling wet hair, often applied as a leave-in treatment."

Keep the same answer and maintain the difficulty level. Return only the rewritten clue text, nothing else.`
        },
        {
          role: 'user',
          content: `Original category: ${question.category}\nOriginal clue: ${question.clue}\nAnswer: ${question.answer}\n\nRewrite the clue to remove the category theme:`
        }
      ],
      temperature: 0.5
    });
    
    const rewritten = response.choices[0].message.content.trim();
    // Remove quotes if the LLM added them
    return rewritten.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error(`Error rewriting question: ${error.message}`);
    // On error, return original
    return question.clue;
  }
}

/**
 * Select questions for a game
 */
async function selectQuestions(archive, usedQuestions, targetDate) {
  // Filter out already used questions and Final Jeopardy questions
  let availableQuestions = archive.filter(q => {
    const questionId = `${q.clue}|${q.answer}`;
    return !usedQuestions.has(questionId) && q.round !== 'Final Jeopardy';
  });
  
  // Filter out disqualified questions using LLM
  console.log('Filtering questions for pub trivia suitability...');
  const filteredQuestions = [];
  let processed = 0;
  for (const question of availableQuestions) {
    processed++;
    if (processed % 10 === 0) {
      console.log(`  Processed ${processed}/${availableQuestions.length} questions...`);
    }
    
    const disqualifyResult = await shouldDisqualifyQuestion(question);
    if (!disqualifyResult.shouldDisqualify) {
      // Check if question needs rewriting
      let clue = question.clue;
      if (disqualifyResult.reason?.includes('rewriting') || 
          question.category?.toLowerCase().includes('i\'m in') ||
          question.clue?.toLowerCase().includes('can\'t read') ||
          question.clue?.toLowerCase().includes('without my')) {
        console.log(`  Rewriting question: ${question.clue.substring(0, 50)}...`);
        clue = await rewriteQuestion(question);
        // Small delay after rewriting to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      filteredQuestions.push({
        ...question,
        clue: clue,
        originalClue: question.clue !== clue ? question.clue : undefined
      });
    } else {
      console.log(`  Disqualified: ${disqualifyResult.reason} - ${question.clue.substring(0, 50)}...`);
    }
    
    // Small delay to avoid rate limits (only if using LLM)
    if (openaiClient && processed % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  console.log(`Filtered to ${filteredQuestions.length} suitable questions`);
  availableQuestions = filteredQuestions;
  
  // Filter Final Jeopardy questions separately
  let availableFinals = archive.filter(q => {
    const questionId = `${q.clue}|${q.answer}`;
    return !usedQuestions.has(questionId) && q.round === 'Final Jeopardy';
  });
  
  // Filter Final Jeopardy questions too
  console.log('Filtering Final Jeopardy questions...');
  const filteredFinals = [];
  for (const question of availableFinals) {
    const disqualifyResult = await shouldDisqualifyQuestion(question);
    if (!disqualifyResult.shouldDisqualify) {
      let clue = question.clue;
      if (disqualifyResult.reason?.includes('rewriting') || 
          question.category?.toLowerCase().includes('i\'m in') ||
          question.clue?.toLowerCase().includes('can\'t read') ||
          question.clue?.toLowerCase().includes('without my')) {
        console.log(`  Rewriting Final Jeopardy: ${question.clue.substring(0, 50)}...`);
        clue = await rewriteQuestion(question);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      filteredFinals.push({
        ...question,
        clue: clue,
        originalClue: question.clue !== clue ? question.clue : undefined
      });
    }
    if (openaiClient) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  console.log(`Filtered to ${filteredFinals.length} suitable Final Jeopardy questions`);
  availableFinals = filteredFinals;
  
  if (availableQuestions.length < 24) {
    throw new Error(`Not enough available questions. Need 24, have ${availableQuestions.length}`);
  }
  
  if (availableFinals.length < 1) {
    throw new Error('Not enough available Final Jeopardy questions');
  }
  
  // Calculate difficulty for all questions
  const questionsWithDifficulty = availableQuestions.map(q => ({
    ...q,
    difficultyScore: calculateDifficulty(q),
    difficultyLevel: getDifficultyLevel(calculateDifficulty(q))
  }));
  
  // RESTRUCTURE: Group by gameId first, then by category within each game
  // This ensures we pull from different games for each round
  const questionsByGame = {};
  let questionsWithoutGameId = 0;
  let questionsWithoutCategory = 0;
  questionsWithDifficulty.forEach(q => {
    if (!q.gameId) questionsWithoutGameId++;
    if (!q.category) questionsWithoutCategory++;
    const gameId = q.gameId || 'unknown';
    const category = q.category || 'Unknown';
    if (!questionsByGame[gameId]) {
      questionsByGame[gameId] = {};
    }
    if (!questionsByGame[gameId][category]) {
      questionsByGame[gameId][category] = {
        easy: [],
        medium: [],
        hard: [],
        expert: []
      };
    }
    questionsByGame[gameId][category][q.difficultyLevel].push(q);
  });
  
  if (questionsWithoutGameId > 0) {
    console.warn(`Warning: ${questionsWithoutGameId} questions are missing gameId`);
  }
  if (questionsWithoutCategory > 0) {
    console.warn(`Warning: ${questionsWithoutCategory} questions are missing category`);
  }
  
  // Get list of games and shuffle for randomization
  const gameIds = Object.keys(questionsByGame);
  for (let i = gameIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [gameIds[i], gameIds[j]] = [gameIds[j], gameIds[i]];
  }
  
  // Select 24 questions with increasing difficulty
  // Each round uses a single category from a different game
  const selectedQuestions = [];
  const totalQuestions = 24; // 3 questions per round × 8 rounds
  const questionsPerRound = 3; // 3 questions per round, can mix difficulties
  const numRounds = 8;
  const usedGames = new Set();
  const usedCategories = new Set();
  const roundDifficulties = []; // Store target difficulty for each round
  
  // Strategy: Start easy, gradually increase difficulty
  // Round 1-2: Easy
  // Round 3-7: Medium (extended for more medium questions)
  // Round 8: Hard (only in final round)
  
  for (let round = 0; round < numRounds; round++) {
    const roundQuestions = [];
    let targetDifficulty = 'easy';
    
    // Determine target difficulty for this round
    if (round < 2) {
      targetDifficulty = 'easy';
    } else if (round < 7) {
      targetDifficulty = 'medium';
    } else {
      targetDifficulty = 'hard';
    }
    
    // Find a game and category with enough questions of target difficulty
    // Prefer categories that are NOT "Unknown" to avoid rounds with all Unknown categories
    let selectedGame = null;
    let selectedCategory = null;
    
    // First, let's check how many total questions of this difficulty we have available
    // BEFORE filtering by selectedQuestions (to see the raw count)
    let totalAvailableRaw = 0;
    let totalAvailableAfterFilter = 0;
    let availableByGameCategory = [];
    for (const gameId of gameIds) {
      const gameCategories = questionsByGame[gameId];
      if (!gameCategories) continue;
      for (const category of Object.keys(gameCategories)) {
        if (usedCategories.has(category)) continue;
        const categoryData = gameCategories[category];
        const rawCount = (categoryData[targetDifficulty] || []).length;
        const available = (categoryData[targetDifficulty] || []).filter(
          q => !selectedQuestions.some(sq => sq.clue === q.clue)
        );
        if (rawCount > 0) {
          totalAvailableRaw += rawCount;
        }
        if (available.length > 0) {
          totalAvailableAfterFilter += available.length;
          availableByGameCategory.push({
            gameId,
            category,
            isUnknown: category === 'Unknown' || !category || category.trim() === '',
            count: available.length,
            rawCount: rawCount // Show original count before filtering
          });
        }
      }
    }
    
    // Use the filtered count for the check
    const totalAvailable = totalAvailableAfterFilter;
    
    // Debug: log if we're losing questions to the selectedQuestions filter
    if (totalAvailableRaw > totalAvailable) {
      console.log(`Round ${round + 1} (${targetDifficulty}): Raw count: ${totalAvailableRaw}, After filter: ${totalAvailable}, Lost: ${totalAvailableRaw - totalAvailable}`);
    }
    
    if (totalAvailable < questionsPerRound) {
      throw new Error(`Not enough ${targetDifficulty} questions available (${totalAvailable} total, need ${questionsPerRound} for round ${round + 1}). Available by game/category: ${JSON.stringify(availableByGameCategory.slice(0, 10))}`);
    }
    
    // Build a list of all available game/category combinations with their question counts
    // Sort by count (descending) to prioritize categories with more questions
    const candidates = [];
    for (const gameId of gameIds) {
      const gameCategories = questionsByGame[gameId];
      if (!gameCategories) continue;
      
      for (const category of Object.keys(gameCategories)) {
        if (usedCategories.has(category)) continue; // Skip categories we've already used
        
        const categoryData = gameCategories[category];
        const targetQuestions = (categoryData[targetDifficulty] || []).filter(
          q => !selectedQuestions.some(sq => sq.clue === q.clue)
        );
        
        // Count total available questions across all difficulties in this category
        let totalAvailableInCategory = 0;
        const allDifficulties = ['easy', 'medium', 'hard', 'expert'];
        for (const diff of allDifficulties) {
          const questions = (categoryData[diff] || []).filter(
            q => !selectedQuestions.some(sq => sq.clue === q.clue)
          );
          totalAvailableInCategory += questions.length;
        }
        
        if (targetQuestions.length > 0 && totalAvailableInCategory >= questionsPerRound) {
          candidates.push({
            gameId,
            category,
            count: targetQuestions.length,
            totalAvailable: totalAvailableInCategory, // Total across all difficulties
            isUnknown: category === 'Unknown' || !category || category.trim() === '',
            isUnusedGame: !usedGames.has(gameId)
          });
        }
      }
    }
    
    // Sort: prefer non-Unknown categories, then unused games, then by total available questions (descending)
    candidates.sort((a, b) => {
      // First priority: avoid "Unknown" categories
      if (a.isUnknown !== b.isUnknown) {
        return a.isUnknown ? 1 : -1; // Non-Unknown categories first
      }
      // Second priority: prefer unused games
      if (a.isUnusedGame !== b.isUnusedGame) {
        return a.isUnusedGame ? -1 : 1; // Unused games first
      }
      // Third priority: prefer categories with more total available questions (across all difficulties)
      return (b.totalAvailable || 0) - (a.totalAvailable || 0);
    });
    
    // Find a candidate - we'll allow mixing difficulties if needed
    // STRICT: Only use Unknown categories if absolutely no other options exist
    const nonUnknownCandidates = candidates.filter(c => !c.isUnknown);
    const candidatesToUse = nonUnknownCandidates.length > 0 ? nonUnknownCandidates : candidates;
    
    // First try to find one with enough questions of target difficulty (prefer non-Unknown)
    for (const candidate of candidatesToUse) {
      if (candidate.count >= questionsPerRound) {
        selectedGame = candidate.gameId;
        selectedCategory = candidate.category;
        break;
      }
    }
    
    // If we can't find one with enough of target difficulty, 
    // pick one that has enough total questions (we'll mix difficulties)
    if (!selectedGame || !selectedCategory) {
      // Pick the best candidate (most total available questions), still preferring non-Unknown
      const bestCandidate = candidatesToUse.find(c => (c.totalAvailable || 0) >= questionsPerRound);
      if (bestCandidate) {
        selectedGame = bestCandidate.gameId;
        selectedCategory = bestCandidate.category;
      } else if (candidatesToUse.length > 0) {
        // Last resort: pick the one with most total questions
        selectedGame = candidatesToUse[0].gameId;
        selectedCategory = candidatesToUse[0].category;
      } else {
        // More detailed error message
        const topOptions = availableByGameCategory
          .filter(item => !usedCategories.has(item.category))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        throw new Error(`Could not find a game and category with ${targetDifficulty} questions for round ${round + 1}. Total available: ${totalAvailable}, need: ${questionsPerRound}. Top available options: ${JSON.stringify(topOptions)}`);
      }
    }
    
    // Select questions from the chosen category in the chosen game
    // Mark game as used (but we allow reuse if needed for later rounds)
    usedGames.add(selectedGame);
    usedCategories.add(selectedCategory);
    const categoryData = questionsByGame[selectedGame][selectedCategory];
    
    // Get questions of target difficulty from this category
    let targetQuestions = (categoryData[targetDifficulty] || []).filter(
      q => !selectedQuestions.some(sq => sq.clue === q.clue)
    );
    
    // Shuffle and select as many as we can of target difficulty
    for (let i = targetQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [targetQuestions[i], targetQuestions[j]] = [targetQuestions[j], targetQuestions[i]];
    }
    
    let selectedFromCategory = targetQuestions.slice(0, questionsPerRound);
    
    // If we don't have enough of target difficulty, fill with other difficulties
    if (selectedFromCategory.length < questionsPerRound) {
      // Determine fallback difficulties based on target (prioritize adjacent difficulties)
      const fallbackDifficulties = [];
      if (targetDifficulty === 'hard') {
        fallbackDifficulties.push('medium', 'expert', 'easy'); // Try all if needed
      } else if (targetDifficulty === 'expert') {
        fallbackDifficulties.push('hard', 'medium', 'easy'); // Try all if needed
      } else if (targetDifficulty === 'medium') {
        fallbackDifficulties.push('easy', 'hard', 'expert'); // Try all if needed
      } else if (targetDifficulty === 'easy') {
        fallbackDifficulties.push('medium', 'hard', 'expert'); // Try all if needed
      }
      
      // Try to fill from fallback difficulties
      for (const fallbackDiff of fallbackDifficulties) {
        if (selectedFromCategory.length >= questionsPerRound) break;
        
        const fallbackQuestions = (categoryData[fallbackDiff] || []).filter(
          q => !selectedQuestions.some(sq => sq.clue === q.clue) &&
               !selectedFromCategory.some(sq => sq.clue === q.clue)
        );
        
        // Shuffle fallback questions
        for (let i = fallbackQuestions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [fallbackQuestions[i], fallbackQuestions[j]] = [fallbackQuestions[j], fallbackQuestions[i]];
        }
        
        const needed = questionsPerRound - selectedFromCategory.length;
        selectedFromCategory.push(...fallbackQuestions.slice(0, needed));
      }
    }
    
    if (selectedFromCategory.length < questionsPerRound) {
      throw new Error(`Category "${selectedCategory}" in game "${selectedGame}" does not have enough questions for round ${round + 1} (got ${selectedFromCategory.length}, need ${questionsPerRound})`);
    }
    
    selectedFromCategory.forEach(question => {
      roundQuestions.push({
        clue: question.clue,
        answer: question.answer,
        category: question.category
      });
      selectedQuestions.push(question);
    });
    
    if (roundQuestions.length < questionsPerRound) {
      throw new Error(`Could not select enough questions for round ${round + 1}`);
    }
    
    // Store the target difficulty for this round
    roundDifficulties.push(targetDifficulty);
  }
  
  // Select Final Jeopardy question
  const finalQuestion = availableFinals[Math.floor(Math.random() * availableFinals.length)];
  
  // Mark all selected questions as used
  const newUsedQuestions = new Set(usedQuestions);
  selectedQuestions.forEach(q => {
    const questionId = `${q.clue}|${q.answer}`;
    newUsedQuestions.add(questionId);
  });
  const finalQuestionId = `${finalQuestion.clue}|${finalQuestion.answer}`;
  newUsedQuestions.add(finalQuestionId);
  
  return {
    questions: selectedQuestions,
    finalQuestion,
    usedQuestions: newUsedQuestions,
    roundDifficulties
  };
}

/**
 * Find the next available date that doesn't have a game
 * Starts from targetDate (or today) and looks forward
 */
function findNextAvailableDate(targetDate = null) {
  const startDate = targetDate ? new Date(targetDate) : new Date();
  let checkDate = new Date(startDate);
  
  // Look for the next available date (check up to 365 days ahead)
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split('T')[0];
    const gameFile = path.join(GAMES_DIR, `game-${dateStr}.json`);
    
    if (!fs.existsSync(gameFile)) {
      return dateStr;
    }
    
    // Move to next day
    checkDate.setDate(checkDate.getDate() + 1);
  }
  
  // If all dates are taken, use the target date anyway (will overwrite)
  return targetDate || new Date().toISOString().split('T')[0];
}

/**
 * Generate a game for a specific date
 */
async function generateGame(targetDate = null, forceOverwrite = false) {
  let date;
  let gameId;
  let gameFile;
  
  // If no target date specified, find the next available date
  if (!targetDate) {
    date = findNextAvailableDate();
    gameId = `game-${date}`;
    gameFile = path.join(GAMES_DIR, `${gameId}.json`);
    console.log(`No date specified, using next available date: ${date}`);
  } else {
    // Specific date was requested
    date = targetDate;
    gameId = `game-${date}`;
    gameFile = path.join(GAMES_DIR, `${gameId}.json`);
    
    // Check if we should overwrite (either forceOverwrite parameter or --force flag)
    const args = process.argv.slice(2);
    const shouldForce = forceOverwrite || args.includes('--force');
    
    // If game already exists for this specific date, skip (unless force is set)
    if (fs.existsSync(gameFile) && !shouldForce) {
      console.log(`Game ${gameId} already exists (use --force to overwrite)`);
      return gameId;
    }
    
    // If force is set and game exists, delete it first
    if (fs.existsSync(gameFile) && shouldForce) {
      console.log(`Force flag set: overwriting existing game ${gameId}`);
      fs.unlinkSync(gameFile);
    }
  }
  
  const { archive, usedQuestions } = loadData();
  
  if (archive.length === 0) {
    throw new Error('Archive is empty. Please run the scraper first.');
  }
  
  console.log(`Generating game for ${date}...`);
  console.log(`Archive contains ${archive.length} questions`);
  console.log(`${usedQuestions.size} questions already used`);
  
  const { questions, finalQuestion, usedQuestions: newUsedQuestions, roundDifficulties } = 
    await selectQuestions(archive, usedQuestions, date);
  
  // Organize questions into rounds
  const rounds = [];
  const questionsPerRound = 3; // Match the selection logic
  
  for (let i = 0; i < 8; i++) {
    const roundQuestions = questions.slice(i * questionsPerRound, (i + 1) * questionsPerRound);
    // Use the target difficulty for this round instead of calculating from questions
    const difficulty = roundDifficulties[i] || 'easy';
    
    rounds.push({
      roundNumber: i + 1,
      difficulty: difficulty,
      questions: roundQuestions.map(q => ({
        clue: q.clue,
        answer: q.answer,
        category: q.category
      }))
    });
  }
  
  // Create game object
  const game = {
    id: gameId,
    date: date,
    rounds: rounds,
    finalTrivia: {
      category: finalQuestion.category,
      question: finalQuestion.clue,
      answer: finalQuestion.answer
    }
  };
  
  // Save game file
  fs.writeFileSync(gameFile, JSON.stringify(game, null, 2));
  console.log(`Game saved to ${gameFile}`);
  
  // Update used questions tracking
  fs.writeFileSync(USED_QUESTIONS_FILE, JSON.stringify(Array.from(newUsedQuestions), null, 2));
  console.log(`Updated used questions tracking (${newUsedQuestions.size} total)`);
  
  return gameId;
}

// Export generateGame for use in other scripts
export { generateGame };

// Main execution (only if run directly, not when imported)
// Check if this is the main module by comparing the file path
import { fileURLToPath } from 'url';
const currentFile = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && (currentFile === process.argv[1] || process.argv[1].endsWith('generate-game.js'));

if (isMainModule) {
  const args = process.argv.slice(2);
  let targetDate = null;

  if (args.includes('--date')) {
    const dateIndex = args.indexOf('--date');
    targetDate = args[dateIndex + 1];
  }
  // If no --date flag, targetDate stays null, which tells generateGame to find next available date

  try {
    const gameId = await generateGame(targetDate);
    console.log(`\nSuccessfully generated ${gameId}`);
  } catch (error) {
    console.error('Error generating game:', error.message);
    process.exit(1);
  }
}


