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
 */
function getDifficultyLevel(score) {
  if (score < 10) return 'easy';
  if (score < 30) return 'medium';
  if (score < 50) return 'hard';
  return 'expert';
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
  
  // Group questions by category, then by difficulty
  const questionsByCategory = {};
  questionsWithDifficulty.forEach(q => {
    if (!questionsByCategory[q.category]) {
      questionsByCategory[q.category] = {
        easy: [],
        medium: [],
        hard: [],
        expert: []
      };
    }
    questionsByCategory[q.category][q.difficultyLevel].push(q);
  });
  
  // Shuffle categories to randomize round order
  const categoryKeys = Object.keys(questionsByCategory);
  for (let i = categoryKeys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [categoryKeys[i], categoryKeys[j]] = [categoryKeys[j], categoryKeys[i]];
  }
  
  // Select 24 questions with increasing difficulty
  // Each round uses a single category (3 questions from same category)
  const selectedQuestions = [];
  const totalQuestions = 24;
  const questionsPerRound = 3;
  const numRounds = 8;
  const usedCategories = new Set();
  
  // Strategy: Start easy, gradually increase difficulty
  // Round 1-2: Easy
  // Round 3-4: Medium
  // Round 5-6: Hard
  // Round 7-8: Expert (with some hard mixed in)
  
  for (let round = 0; round < numRounds; round++) {
    const roundQuestions = [];
    let targetDifficulty = 'easy';
    
    // Determine target difficulty for this round
    if (round < 2) {
      targetDifficulty = 'easy';
    } else if (round < 4) {
      targetDifficulty = 'medium';
    } else if (round < 6) {
      targetDifficulty = 'hard';
    } else {
      targetDifficulty = 'expert';
    }
    
    // Find a category with at least 3 questions of the target difficulty
    // Use shuffled categoryKeys to randomize order
    let selectedCategory = null;
    
    // Try to find a category with enough questions of target difficulty
    for (const category of categoryKeys) {
      if (usedCategories.has(category)) continue;
      
      const categoryQuestions = questionsByCategory[category][targetDifficulty] || [];
      // Also check fallback difficulties
      const fallbackDifficulties = 
        targetDifficulty === 'expert' ? ['hard', 'expert'] :
        targetDifficulty === 'hard' ? ['medium', 'hard'] :
        targetDifficulty === 'medium' ? ['easy', 'medium'] :
        ['easy'];
      
      let availableInCategory = categoryQuestions.filter(
        q => !selectedQuestions.some(sq => sq.clue === q.clue)
      );
      
      // If not enough in target difficulty, try fallback
      if (availableInCategory.length < questionsPerRound) {
        for (const fallback of fallbackDifficulties) {
          if (fallback === targetDifficulty) continue;
          const fallbackQuestions = (questionsByCategory[category][fallback] || [])
            .filter(q => !selectedQuestions.some(sq => sq.clue === q.clue));
          availableInCategory = [...availableInCategory, ...fallbackQuestions];
          if (availableInCategory.length >= questionsPerRound) break;
        }
      }
      
      if (availableInCategory.length >= questionsPerRound) {
        selectedCategory = category;
        break;
      }
    }
    
    // If no category found with target difficulty, try any category
    if (!selectedCategory) {
      for (const category of categoryKeys) {
        if (usedCategories.has(category)) continue;
        
        const allInCategory = [
          ...(questionsByCategory[category].easy || []),
          ...(questionsByCategory[category].medium || []),
          ...(questionsByCategory[category].hard || []),
          ...(questionsByCategory[category].expert || [])
        ].filter(q => !selectedQuestions.some(sq => sq.clue === q.clue));
        
        if (allInCategory.length >= questionsPerRound) {
          selectedCategory = category;
          break;
        }
      }
    }
    
    if (!selectedCategory) {
      throw new Error(`Could not find a category with enough questions for round ${round + 1}`);
    }
    
    // Select questions from the chosen category
    usedCategories.add(selectedCategory);
    const categoryData = questionsByCategory[selectedCategory];
    
    // Prioritize target difficulty, then fallback
    const fallbackDifficulties = 
      targetDifficulty === 'expert' ? ['expert', 'hard'] :
      targetDifficulty === 'hard' ? ['hard', 'medium'] :
      targetDifficulty === 'medium' ? ['medium', 'easy'] :
      ['easy'];
    
    const questionsToChooseFrom = [];
    for (const diff of fallbackDifficulties) {
      const available = (categoryData[diff] || []).filter(
        q => !selectedQuestions.some(sq => sq.clue === q.clue)
      );
      questionsToChooseFrom.push(...available);
      if (questionsToChooseFrom.length >= questionsPerRound) break;
    }
    
    // Shuffle questions to randomize order within category
    for (let i = questionsToChooseFrom.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionsToChooseFrom[i], questionsToChooseFrom[j]] = [questionsToChooseFrom[j], questionsToChooseFrom[i]];
    }
    
    // Take first 3 questions from the shuffled category
    const selectedFromCategory = questionsToChooseFrom.slice(0, questionsPerRound);
    
    if (selectedFromCategory.length < questionsPerRound) {
      throw new Error(`Category "${selectedCategory}" does not have enough questions for round ${round + 1}`);
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
    usedQuestions: newUsedQuestions
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
async function generateGame(targetDate = null) {
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
    
    // If game already exists for this specific date, skip
    if (fs.existsSync(gameFile)) {
      console.log(`Game ${gameId} already exists`);
      return gameId;
    }
  }
  
  const { archive, usedQuestions } = loadData();
  
  if (archive.length === 0) {
    throw new Error('Archive is empty. Please run the scraper first.');
  }
  
  console.log(`Generating game for ${date}...`);
  console.log(`Archive contains ${archive.length} questions`);
  console.log(`${usedQuestions.size} questions already used`);
  
  const { questions, finalQuestion, usedQuestions: newUsedQuestions } = 
    await selectQuestions(archive, usedQuestions, date);
  
  // Organize questions into rounds
  const rounds = [];
  const questionsPerRound = 3;
  
  for (let i = 0; i < 8; i++) {
    const roundQuestions = questions.slice(i * questionsPerRound, (i + 1) * questionsPerRound);
    const avgDifficulty = roundQuestions.reduce((sum, q) => {
      const score = calculateDifficulty(q);
      return sum + score;
    }, 0) / roundQuestions.length;
    
    rounds.push({
      roundNumber: i + 1,
      difficulty: getDifficultyLevel(avgDifficulty),
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

// Main execution
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

