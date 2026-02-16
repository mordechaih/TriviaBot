import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const ARCHIVE_FILE = './data/archive-backup.json';
const GAMES_DIR = './data/games';
const USED_QUESTIONS_FILE = './data/used-questions.json';
const BANNED_QUESTIONS_FILE = './data/banned-questions.json';
const BANNED_QUESTIONS_UI_FILE = './data/banned-questions-ui.json';
const USED_QUESTIONS_UI_FILE = './data/used-questions-ui.json';
const PLAYED_STATUS_FILE = './data/played-status.json';
const FAMILY_FEUD_FILE = './data/family-feud-questions.json';
const LIST_ROUND_FILE = './data/list-round-questions.json';

// Test hook: override path for Family Feud file (set by tests for isolation)
let _familyFeudPathOverride = null;
export function setFamilyFeudPathForTesting(path) {
  _familyFeudPathOverride = path;
}
export function clearFamilyFeudPathForTesting() {
  _familyFeudPathOverride = null;
}

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
 * Round templates configuration
 * Defines the structure and requirements for each round type
 */
const ROUND_TEMPLATES = {
  1: { 
    type: 'standard', 
    roundType: 'get-your-feet-wet',
    title: 'Get Your Feet Wet', 
    points: 2, 
    difficulty: 'easy',
    useLLM: false,
    instructions: 'Generally VERY easy questions to ease into the game.'
  },
  2: { 
    type: 'over-under', 
    roundType: 'over-under',
    title: 'Over/Under', 
    points: 3,
    useLLM: true,
    instructions: 'Numeric guessing questions. Pick a number close to the actual answer.'
  },
  3: { 
    type: 'standard', 
    roundType: 'trifecta-trivia',
    title: 'Trifecta Trivia', 
    points: 3, 
    difficulty: 'easy',
    useLLM: false,
    instructions: 'First "trivia in earnest" round. Still easy questions.'
  },
  4: { 
    type: 'list', 
    roundType: 'list-round',
    title: 'The List Round', 
    points: 'variable',
    useLLM: false,
    instructions: 'One question with multiple answers. 1 point per correct answer.'
  },
  5: { 
    type: 'game-show-style', 
    roundType: 'game-show-style',
    title: 'Game Show Style', 
    points: 4,
    useLLM: true,
    subTypes: ['to-tell-the-truth', 'name-that-tune', 'millionaire', 'family-feud'],
    instructions: 'Varies weekly: True/False, Name That Tune, Multiple Choice, or Family Feud.'
  },
  6: { 
    type: 'entertainment', 
    roundType: 'entertainment-trivia',
    title: 'Entertainment Trivia', 
    points: 4,
    difficulty: 'medium',
    useLLM: false,
    instructions: 'Movies, music, and TV from 1980s onward. Books can be older (early 1900s).'
  },
  7: { 
    type: 'mixing-things-up', 
    roundType: 'mixing-things-up',
    title: 'Mixing Things Up', 
    points: 5,
    useLLM: true,
    subTypes: ['who-am-i', 'size-matters', 'name-that-brand', 'name-that-sports-team'],
    instructions: 'Varies weekly: Who Am I, Size Matters, Name That Brand, or Sports Team.'
  },
  8: { 
    type: 'standard', 
    roundType: 'game-changer',
    title: 'Game Changer Round', 
    points: 6, 
    difficulty: 'medium',
    useLLM: false,
    instructions: 'Medium difficulty standard questions. No shared theme.'
  }
};

// Export ROUND_TEMPLATES for use in other modules
export { ROUND_TEMPLATES };

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
    try {
      const used = JSON.parse(fs.readFileSync(USED_QUESTIONS_FILE, 'utf-8'));
      (Array.isArray(used) ? used : []).forEach(id => usedQuestions.add(id));
    } catch (e) {
      console.warn('Error loading used-questions:', e.message);
    }
  }
  if (fs.existsSync(USED_QUESTIONS_UI_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(USED_QUESTIONS_UI_FILE, 'utf-8'));
      const list = Array.isArray(data) ? data : (data.questions || data.ids || []);
      list.forEach(id => usedQuestions.add(id));
    } catch (e) {
      console.warn('Error loading used-questions-ui.json:', e.message);
    }
  }
  return { archive, usedQuestions };
}

/**
 * Load banned questions from tracking files (main + UI export).
 * Merges data/banned-questions.json and data/banned-questions-ui.json (if present) so UI bans affect generation.
 */
function loadBannedQuestions() {
  const seen = new Set();
  const merged = [];
  const add = (list) => {
    if (!Array.isArray(list)) return;
    for (const b of list) {
      const key = b.questionId || `${b.clue}|${b.answer || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(b);
    }
  };
  if (fs.existsSync(BANNED_QUESTIONS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(BANNED_QUESTIONS_FILE, 'utf-8'));
      add(data.questions || []);
    } catch (error) {
      console.warn('Error loading banned questions:', error.message);
    }
  }
  if (fs.existsSync(BANNED_QUESTIONS_UI_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(BANNED_QUESTIONS_UI_FILE, 'utf-8'));
      add(data.questions || data || []);
    } catch (error) {
      console.warn('Error loading banned-questions-ui.json:', error.message);
    }
  }
  return merged;
}

/**
 * Check if a question is banned
 */
function isQuestionBanned(question, bannedList) {
  const questionId = `${question.clue}|${question.answer}`;
  return bannedList.some(banned => {
    // Check by question ID
    if (banned.questionId === questionId) return true;
    // Check by clue/answer match
    if (banned.clue === question.clue && banned.answer === question.answer) return true;
    return false;
  });
}

/**
 * Check if a list-round question (by clue) is banned
 */
function isListQuestionBanned(clue, bannedList) {
  const listId = `list:${clue}`;
  return bannedList.some(banned => {
    if (banned.questionId === listId) return true;
    if (banned.questionId && banned.questionId.startsWith('list:') && banned.clue === clue) return true;
    if (banned.clue === clue && banned.source === 'list-round') return true;
    return false;
  });
}

/**
 * Load played games from status file
 */
function loadPlayedGames() {
  if (fs.existsSync(PLAYED_STATUS_FILE)) {
    try {
      const content = fs.readFileSync(PLAYED_STATUS_FILE, 'utf-8');
      const data = JSON.parse(content);
      // Return set of played game IDs
      const playedGames = new Set();
      if (data.games) {
        Object.keys(data.games).forEach(gameId => {
          if (data.games[gameId].played) {
            playedGames.add(gameId);
          }
        });
      }
      return playedGames;
    } catch (error) {
      console.warn('Error loading played status:', error.message);
      return new Set();
    }
  }
  return new Set();
}

/**
 * Load Family Feud questions
 */
function loadFamilyFeudQuestions() {
  const filePath = _familyFeudPathOverride || path.join(process.cwd(), FAMILY_FEUD_FILE);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      return data.questions || [];
    } catch (error) {
      console.warn('Error loading Family Feud questions:', error.message);
      return [];
    }
  }
  return [];
}

/**
 * Select a random unused Family Feud question
 */
function selectFamilyFeudQuestion(usedQuestions = new Set()) {
  const allQuestions = loadFamilyFeudQuestions();
  const availableQuestions = allQuestions.filter(q => {
    const questionId = `ff:${q.id}`;
    return !usedQuestions.has(questionId);
  });
  
  if (availableQuestions.length === 0) {
    return null;
  }
  
  const selected = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  return {
    clue: selected.question,
    answer: selected.topAnswers[0]?.answer || 'Unknown',
    topAnswers: selected.topAnswers,
    source: 'family-feud',
    questionId: `ff:${selected.id}`
  };
}

/**
 * Load list-round questions from JSON
 */
function loadListRoundQuestions() {
  const filePath = path.join(process.cwd(), LIST_ROUND_FILE);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const questions = data.questions || [];
    return questions.filter(q => q.clue && Array.isArray(q.answers) && q.answers.length >= 2);
  } catch (error) {
    console.warn('Error loading list-round questions:', error.message);
    return [];
  }
}

/**
 * Select a random unused, non-banned list-round question
 */
function selectListRoundQuestion(usedQuestions = new Set(), bannedQuestions = []) {
  const allQuestions = loadListRoundQuestions();
  const available = allQuestions.filter(q => {
    const listId = `list:${q.clue}`;
    if (usedQuestions.has(listId)) return false;
    if (isListQuestionBanned(q.clue, bannedQuestions)) return false;
    return true;
  });
  if (available.length === 0) {
    return null;
  }
  const selected = available[Math.floor(Math.random() * available.length)];
  return {
    clue: selected.clue,
    answers: selected.answers,
    pointsAvailable: selected.answers.length,
    questionId: `list:${selected.clue}`
  };
}

const ENTERTAINMENT_KEYWORDS = [
  'movie', 'film', 'cinema', 'tv', 'television', 'music', 'band', 'album', 'song', 'singer',
  'actor', 'actress', 'oscar', 'grammy', 'emmy', 'netflix', 'broadway', 'hollywood',
  'comedy', 'drama', 'sitcom', 'series', 'director', 'starring', 'soundtrack'
];

/**
 * Filter archive to entertainment-themed questions (movies, TV, music)
 */
function filterEntertainment(archive) {
  const lower = (s) => (s || '').toLowerCase();
  return archive.filter(q => {
    const cat = lower(q.category);
    const clue = lower(q.clue || '');
    return ENTERTAINMENT_KEYWORDS.some(kw => cat.includes(kw) || clue.includes(kw));
  });
}

/**
 * Select up to count entertainment questions, excluding used and banned. Returns only entertainment-themed questions. May return fewer than count if pool is small.
 */
function selectEntertainmentQuestions(archive, usedQuestions, bannedQuestions, count = 3) {
  const entertainment = filterEntertainment(archive);
  let pool = entertainment.filter(q => {
    const questionId = `${q.clue}|${q.answer}`;
    if (usedQuestions.has(questionId)) return false;
    if (isQuestionBanned(q, bannedQuestions)) return false;
    return true;
  });
  if (pool.length === 0) return [];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).map(q => ({
    clue: q.clue,
    answer: q.answer,
    category: q.category
  }));
}

/**
 * Generate Game Show Style round questions using LLM
 */
async function generateGameShowStyleRound(subType, usedQuestions = new Set()) {
  // Handle Family Feud specially - use database
  if (subType === 'family-feud') {
    const question = selectFamilyFeudQuestion(usedQuestions);
    if (question) {
      return {
        subType: 'family-feud',
        questions: [{
          clue: question.clue,
          answer: question.answer,
          topAnswers: question.topAnswers,
          isBanned: false
        }]
      };
    }
    // Fall back to another subType if no Family Feud questions available
    subType = 'to-tell-the-truth';
  }

  if (!openaiClient) {
    console.warn('No OpenAI client available for Game Show Style round');
    return null;
  }
  
  const prompts = {
    'to-tell-the-truth': `Generate 3 True/False trivia questions suitable for pub trivia.

Requirements:
- Mix of true and false answers (not all the same)
- Medium difficulty - challenging but fair
- Include a brief explanation/source for each answer
- Questions should be interesting and surprising facts

Return a JSON object with a "questions" key containing an array of exactly 3 objects:
{"questions": [
  {"clue": "statement to evaluate", "answer": "True" or "False", "explanation": "brief source/explanation"},
  ...
]}
`,
    
    'name-that-tune': `Generate 3 "Name That Tune" questions for pub trivia.

Requirements:
- 2 should be earworms/one-hit-wonders with lesser-known song names (e.g., "My Sharona" by The Knack)
- 1 should be an easier "gimme" - a very popular song
- Describe each song in a way that hints at it without giving away the title
- Include both song title AND artist in the answer

Return a JSON object with a "questions" key containing an array of exactly 3 objects:
{"questions": [
  {"clue": "This 1999 one-hit-wonder features a catchy hook about...", "answer": "Song Title by Artist Name"},
  ...
]}
`,
    
    'millionaire': `Generate 3 hard trivia questions with 4 multiple choice options each, like "Who Wants to Be a Millionaire".

Requirements:
- Hard difficulty - should make people think
- One correct answer, 3 plausible but incorrect distractors
- For ONE question, make the wrong options obviously wrong (for easier elimination)
- Cover different topics (history, science, pop culture, etc.)

Return a JSON object with a "questions" key containing an array of exactly 3 objects:
{"questions": [
  {"clue": "question text", "options": ["A) option1", "B) option2", "C) option3", "D) option4"], "correctAnswer": "A", "explanation": "brief explanation"},
  ...
]}
`
  };
  
  const prompt = prompts[subType];
  if (!prompt) {
    console.warn(`Unknown Game Show Style subType: ${subType}`);
    return null;
  }
  
  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a trivia question generator for a pub trivia night. Generate engaging, accurate questions. Always return a single JSON object with a "questions" key containing an array of question objects.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8
    });
    
    const content = response.choices[0].message.content;
    let parsed = JSON.parse(content);
    
    // response_format is json_object so root is an object; accept "questions" or common alternates
    const questions = Array.isArray(parsed)
      ? parsed
      : (parsed.questions || parsed.items || parsed.trivia || []);
    
    return {
      subType,
      questions: questions.map(q => ({
        ...q,
        isBanned: false
      }))
    };
  } catch (error) {
    console.error(`Error generating Game Show Style round: ${error.message}`);
    return null;
  }
}

/**
 * Generate Over/Under round questions using LLM.
 * Questions must have numeric answers and relate to normal human experience.
 */
async function generateOverUnderRound() {
  if (!openaiClient) {
    console.warn('No OpenAI client available for Over/Under round');
    return null;
  }
  const prompt = `Generate 3 Over/Under trivia questions for a pub trivia night.

Requirements:
- Every answer must be a single number (integer or one decimal place): year, count, amount, percentage, etc.
- Questions must relate to normal human experience: things ordinary people might have a rough sense of (e.g. "How many keys on a piano?", "In what year did the first iPhone launch?", "How many days in a leap year?", "Roughly how many countries in the UN?").
- Do NOT use obscure facts, niche knowledge, or things that require looking up. Favor common knowledge and everyday intuition.
- For each question provide:
  - clue: the question text (e.g. "How many keys are on a standard piano?" or "In what year did the first iPhone go on sale?")
  - answer: the numeric answer as a string (e.g. "88" or "2007")
  - actualNumber: the same value as a number for display
  - targetNumber: a round number that makes a good "over or under" guess (e.g. for 88 keys use 90; for 2007 use 2005). Should be close to the answer so the game is interesting.

Return JSON with a "questions" array of exactly 3 objects:
[
  {"clue": "How many keys on a standard piano?", "answer": "88", "actualNumber": 88, "targetNumber": 90},
  {"clue": "In what year did the first iPhone go on sale?", "answer": "2007", "actualNumber": 2007, "targetNumber": 2005},
  ...
]`;

  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a trivia question generator for a pub trivia night. Generate engaging, accurate questions. Always return valid JSON with a "questions" array.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });
    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    const questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
    if (questions.length < 3) {
      console.warn('Over/Under LLM returned fewer than 3 questions');
      return null;
    }
    return {
      subType: null,
      questions: questions.slice(0, 3).map(q => {
        const actual = typeof q.actualNumber === 'number' ? q.actualNumber : Number(q.answer) || 0;
        const target = typeof q.targetNumber === 'number' ? q.targetNumber : actual;
        const overOrUnder = actual > target ? 'Over' : 'Under';
        return {
          clue: q.clue,
          answer: String(q.answer ?? q.actualNumber ?? ''),
          actualNumber: actual,
          targetNumber: target,
          overOrUnder,
          isBanned: false
        };
      })
    };
  } catch (error) {
    console.error(`Error generating Over/Under round: ${error.message}`);
    return null;
  }
}

/**
 * Generate Mixing Things Up round questions using LLM
 */
async function generateMixingThingsUpRound(subType) {
  if (!openaiClient) {
    console.warn('No OpenAI client available for Mixing Things Up round');
    return null;
  }
  
  const prompts = {
    'who-am-i': `Generate 3 "Who Am I?" questions describing famous/notable individuals for pub trivia.

Requirements:
- Medium difficulty - people should recognize these individuals
- Write clues in first person ("I'm a...", "I was born in...", "My famous work includes...")
- Can have an optional theme (e.g., "Famous women", "Musicians") but not too obscure
- Mix of celebrities, historical figures, athletes, etc.

Return a JSON object with a "questions" key containing an array of exactly 3 objects:
{"questions": [
  {"clue": "I'm a comedian known for...", "answer": "Person's Full Name"},
  ...
]}
`,
    
    'size-matters': `Generate 3 "Size Matters" comparison questions about landmarks/famous buildings.

Requirements:
- Ask which of two famous structures is taller
- Both structures should be well-known
- Include the actual heights in the details
- Make the comparisons non-obvious (close heights are more interesting)

Return a JSON object with a "questions" key containing an array of exactly 3 objects:
{"questions": [
  {"clue": "Which is taller: The Eiffel Tower or the Statue of Liberty (including pedestal)?", "answer": "The Eiffel Tower", "details": "Eiffel Tower: 1,063 ft, Statue of Liberty with pedestal: 305 ft"},
  ...
]}
`,
    
    'name-that-brand': `Generate 3 "Name That Brand" questions for pub trivia.

Requirements:
- Give 2-3 product names from the same brand
- Products should be well-known enough that people recognize them
- The brand connection should be clear once revealed
- Mix of categories (cars, food, tech, etc.)

Return a JSON object with a "questions" key containing an array of exactly 3 objects:
{"questions": [
  {"clue": "Aventador and Huracán", "answer": "Lamborghini"},
  {"clue": "Big Mac and McFlurry", "answer": "McDonald's"},
  ...
]}
`,
    
    'name-that-sports-team': `Generate 3 "Name That Sports Team" questions.

Requirements:
- Name a US university or city
- Answer should be the team name/mascot
- Keep ALL questions in the same league (all college OR all NFL/NBA/MLB, not mixed)
- Do NOT reference minor league sports
- Include well-known teams

Return a JSON object with a "questions" key containing an array of exactly 3 objects, ALL from the same league:
{"questions": [
  {"clue": "University of Oregon", "answer": "Ducks", "league": "College"},
  {"clue": "University of Alabama", "answer": "Crimson Tide", "league": "College"},
  ...
]}
`
  };
  
  const prompt = prompts[subType];
  if (!prompt) {
    console.warn(`Unknown Mixing Things Up subType: ${subType}`);
    return null;
  }
  
  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a trivia question generator for a pub trivia night. Generate engaging, accurate questions. Always return a single JSON object with a "questions" key containing an array of question objects.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8
    });
    
    const content = response.choices[0].message.content;
    let parsed = JSON.parse(content);
    
    // response_format is json_object so root is an object; accept "questions" or common alternates
    const questions = Array.isArray(parsed)
      ? parsed
      : (parsed.questions || parsed.items || parsed.trivia || []);
    
    return {
      subType,
      questions: questions.map(q => ({
        ...q,
        isBanned: false
      }))
    };
  } catch (error) {
    console.error(`Error generating Mixing Things Up round: ${error.message}`);
    return null;
  }
}

/**
 * Get subTypes used for a given round in recent games (to avoid repeating format week to week).
 * @param {number} roundNumber - Round index (5 = game-show-style, 7 = mixing-things-up)
 * @param {Object} [options] - { excludeGameId: string, maxGames: number }
 * @returns {string[]} SubTypes used in recent games, newest first
 */
function getRecentlyUsedSubTypes(roundNumber, options = {}) {
  const { excludeGameId = null, maxGames = 8 } = options;
  if (!fs.existsSync(GAMES_DIR)) return [];
  const files = fs.readdirSync(GAMES_DIR)
    .filter(f => f.startsWith('game-') && f.endsWith('.json'))
    .sort()
    .reverse();
  const subTypes = [];
  let count = 0;
  for (const file of files) {
    const gameId = file.replace('.json', '');
    if (excludeGameId && gameId === excludeGameId) continue;
    if (count >= maxGames) break;
    try {
      const content = fs.readFileSync(path.join(GAMES_DIR, file), 'utf-8');
      const game = JSON.parse(content);
      const round = game.rounds?.find(r => r.roundNumber === roundNumber);
      if (round?.subType) {
        subTypes.push(round.subType);
        count++;
      }
    } catch (err) {
      console.warn(`Could not read ${file} for recent subTypes:`, err.message);
    }
  }
  return subTypes;
}

/**
 * Generate an LLM-based round (for rounds 5 and 7).
 * When subType is not specified, picks one that was not used in recent games when possible.
 */
async function generateLLMRound(roundNumber, subType = null, usedQuestions = new Set(), recentlyUsedSubTypes = []) {
  const template = ROUND_TEMPLATES[roundNumber];
  if (!template || !template.useLLM) {
    throw new Error(`Round ${roundNumber} does not support LLM generation`);
  }

  // Pick a subType if not specified: prefer ones not used in recent weeks to avoid repeating format
  if (!subType && template.subTypes) {
    const recentSet = new Set(recentlyUsedSubTypes);
    const available = template.subTypes.filter(t => !recentSet.has(t));
    const pool = available.length > 0 ? available : template.subTypes;
    subType = pool[Math.floor(Math.random() * pool.length)];
    if (recentSet.size > 0 && available.length > 0) {
      console.log(`Round ${roundNumber}: avoiding recent subTypes [${[...recentSet].join(', ')}], chose ${subType}`);
    }
  }

  console.log(`Generating LLM round ${roundNumber} with subType: ${subType}`);
  
  if (roundNumber === 2) {
    return await generateOverUnderRound();
  } else if (roundNumber === 5) {
    return await generateGameShowStyleRound(subType, usedQuestions);
  } else if (roundNumber === 7) {
    return await generateMixingThingsUpRound(subType);
  }
  
  throw new Error(`No LLM generator for round ${roundNumber}`);
}

// Export LLM generation functions
export { generateLLMRound, generateGameShowStyleRound, generateMixingThingsUpRound };

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
async function selectQuestions(archive, usedQuestions, targetDate, options = {}) {
  const random = typeof options.random === 'function' ? options.random : Math.random;

  // Load banned questions and played games
  const bannedQuestions = Array.isArray(options.bannedOverride)
    ? options.bannedOverride
    : loadBannedQuestions();
  const playedGames = loadPlayedGames();
  
  // Filter out already used questions, banned questions, and Final Jeopardy questions
  let availableQuestions = archive.filter(q => {
    const questionId = `${q.clue}|${q.answer}`;
    // Exclude used questions
    if (usedQuestions.has(questionId)) return false;
    // Exclude banned questions
    if (isQuestionBanned(q, bannedQuestions)) return false;
    // Exclude Final Jeopardy (handled separately)
    if (q.round === 'Final Jeopardy') return false;
    return true;
  });

  // Cap pool size before LLM filtering (~1–2 min total, under ~7¢: 200 + 50 + generative)
  // FAST_GENERATION=1 (e.g. from dev server) uses 100 + 25 for fastest runs
  const fastGeneration = process.env.FAST_GENERATION === '1';
  const MAX_QUESTIONS_TO_FILTER = fastGeneration ? 100 : 200;
  if (availableQuestions.length > MAX_QUESTIONS_TO_FILTER && openaiClient) {
    const shuffled = [...availableQuestions].sort(() => random() - 0.5);
    availableQuestions = shuffled.slice(0, MAX_QUESTIONS_TO_FILTER);
    console.log(`Sampled ${MAX_QUESTIONS_TO_FILTER} questions for LLM filtering (pool had ${shuffled.length})${fastGeneration ? ' [FAST_GENERATION]' : ''}`);
  }

  // Filter out disqualified questions using LLM (batched for speed when using API)
  const FILTER_BATCH_SIZE = openaiClient ? 5 : 1;
  console.log('Filtering questions for pub trivia suitability...');
  const filteredQuestions = [];
  for (let i = 0; i < availableQuestions.length; i += FILTER_BATCH_SIZE) {
    const batch = availableQuestions.slice(i, i + FILTER_BATCH_SIZE);
    const results = await Promise.all(batch.map(q => shouldDisqualifyQuestion(q)));
    if ((i + FILTER_BATCH_SIZE) % 50 === 0 || i + batch.length >= availableQuestions.length) {
      console.log(`  Processed ${Math.min(i + FILTER_BATCH_SIZE, availableQuestions.length)}/${availableQuestions.length} questions...`);
    }
    for (let j = 0; j < batch.length; j++) {
      const question = batch[j];
      const disqualifyResult = results[j];
      if (!disqualifyResult.shouldDisqualify) {
        let clue = question.clue;
        if (disqualifyResult.reason?.includes('rewriting') ||
            question.category?.toLowerCase().includes('i\'m in') ||
            question.clue?.toLowerCase().includes('can\'t read') ||
            question.clue?.toLowerCase().includes('without my')) {
          console.log(`  Rewriting question: ${question.clue.substring(0, 50)}...`);
          clue = await rewriteQuestion(question);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        filteredQuestions.push({
          ...question,
          clue: clue,
          originalClue: question.clue !== clue ? question.clue : undefined
        });
      } else {
        console.log(`  Disqualified: ${disqualifyResult.reason} - ${question.clue.substring(0, 50)}...`);
      }
    }
    if (openaiClient && batch.length === FILTER_BATCH_SIZE) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  console.log(`Filtered to ${filteredQuestions.length} suitable questions`);
  availableQuestions = filteredQuestions;
  
  // Filter Final Jeopardy questions separately
  let availableFinals = archive.filter(q => {
    const questionId = `${q.clue}|${q.answer}`;
    return !usedQuestions.has(questionId) && q.round === 'Final Jeopardy';
  });
  const MAX_FINALS_TO_FILTER = fastGeneration ? 25 : 50;
  if (availableFinals.length > MAX_FINALS_TO_FILTER && openaiClient) {
    const shuffled = [...availableFinals].sort(() => random() - 0.5);
    availableFinals = shuffled.slice(0, MAX_FINALS_TO_FILTER);
    console.log(`Sampled ${MAX_FINALS_TO_FILTER} Final Jeopardy questions for LLM filtering`);
  }

  // Filter Final Jeopardy questions (batched when using API)
  console.log('Filtering Final Jeopardy questions...');
  const filteredFinals = [];
  for (let i = 0; i < availableFinals.length; i += FILTER_BATCH_SIZE) {
    const batch = availableFinals.slice(i, i + FILTER_BATCH_SIZE);
    const results = await Promise.all(batch.map(q => shouldDisqualifyQuestion(q)));
    for (let j = 0; j < batch.length; j++) {
      const question = batch[j];
      const disqualifyResult = results[j];
      if (!disqualifyResult.shouldDisqualify) {
        let clue = question.clue;
        if (disqualifyResult.reason?.includes('rewriting') ||
            question.category?.toLowerCase().includes('i\'m in') ||
            question.clue?.toLowerCase().includes('can\'t read') ||
            question.clue?.toLowerCase().includes('without my')) {
          console.log(`  Rewriting Final Jeopardy: ${question.clue.substring(0, 50)}...`);
          clue = await rewriteQuestion(question);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        filteredFinals.push({
          ...question,
          clue: clue,
          originalClue: question.clue !== clue ? question.clue : undefined
        });
      }
    }
    if (openaiClient && batch.length === FILTER_BATCH_SIZE) {
      await new Promise(resolve => setTimeout(resolve, 50));
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
    const j = Math.floor(random() * (i + 1));
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
      }
    }

    // When no single game+category has enough questions (e.g. small filtered pool), fill round from global pool
    if ((!selectedGame || !selectedCategory) && totalAvailable >= questionsPerRound) {
      const allDifficulties = ['easy', 'medium', 'hard', 'expert'];
      const pool = [];
      for (const gameId of gameIds) {
        const gameCategories = questionsByGame[gameId];
        if (!gameCategories) continue;
        for (const category of Object.keys(gameCategories)) {
          for (const diff of allDifficulties) {
            const list = (gameCategories[category][diff] || []).filter(
              q => !selectedQuestions.some(sq => sq.clue === q.clue)
            );
            pool.push(...list);
          }
        }
      }
      const seen = new Set();
      const poolDeduped = pool.filter(q => {
        const key = `${q.clue}|${q.answer}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const byDifficulty = (arr, d) => arr.filter(q => q.difficultyLevel === d);
      let fromPool = byDifficulty(poolDeduped, targetDifficulty);
      for (let i = fromPool.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [fromPool[i], fromPool[j]] = [fromPool[j], fromPool[i]];
      }
      let chosen = fromPool.slice(0, questionsPerRound);
      if (chosen.length < questionsPerRound) {
        const fallbackOrder = targetDifficulty === 'easy' ? ['medium', 'hard', 'expert'] : targetDifficulty === 'medium' ? ['easy', 'hard', 'expert'] : ['easy', 'medium', 'hard', 'expert'];
        for (const d of fallbackOrder) {
          if (chosen.length >= questionsPerRound) break;
          const extra = byDifficulty(poolDeduped, d).filter(q => !chosen.some(c => c.clue === q.clue));
          for (let i = extra.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [extra[i], extra[j]] = [extra[j], extra[i]];
          }
          chosen.push(...extra.slice(0, questionsPerRound - chosen.length));
        }
      }
      if (chosen.length >= questionsPerRound) {
        chosen = chosen.slice(0, questionsPerRound);
        console.log(`Round ${round + 1}: using pool fallback (no single category with 3+ questions)`);
        chosen.forEach(question => {
          roundQuestions.push({ clue: question.clue, answer: question.answer, category: question.category });
          selectedQuestions.push(question);
        });
        roundDifficulties.push(targetDifficulty);
        continue;
      }
    }

    if (!selectedGame || !selectedCategory) {
      const topOptions = availableByGameCategory
        .filter(item => !usedCategories.has(item.category))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      throw new Error(`Could not find a game and category with ${targetDifficulty} questions for round ${round + 1}. Total available: ${totalAvailable}, need: ${questionsPerRound}. Top available options: ${JSON.stringify(topOptions)}`);
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
      const j = Math.floor(random() * (i + 1));
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
          const j = Math.floor(random() * (i + 1));
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
  const finalQuestion = availableFinals[Math.floor(random() * availableFinals.length)];
  
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
function appendThemedPools(rounds) {
  const dataDir = path.resolve(GAMES_DIR, '..');
  const poolPath = (filename) => path.join(dataDir, filename);

  for (const round of rounds || []) {
    const rt = round.roundType;
    const sub = round.subType;
    const questions = round.questions || [];
    if (questions.length === 0) continue;

    if (rt === 'over-under') {
      const file = poolPath('over-under-questions.json');
      const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf-8')) : { questions: [] };
      const list = existing.questions || [];
      questions.forEach(q => list.push({
        clue: q.clue,
        answer: q.answer,
        actualNumber: q.actualNumber,
        targetNumber: q.targetNumber,
        overOrUnder: q.overOrUnder
      }));
      fs.writeFileSync(file, JSON.stringify({ questions: list }, null, 2));
      console.log(`Appended ${questions.length} Over/Under question(s) to pool`);
    } else if (rt === 'game-show-style' && sub && sub !== 'family-feud') {
      const file = poolPath(`${sub}-questions.json`);
      if (!fs.existsSync(file)) continue;
      const existing = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const list = existing.questions || [];
      questions.forEach(q => {
        const entry = { clue: q.clue, answer: q.answer ?? q.correctAnswer };
        if (q.explanation) entry.explanation = q.explanation;
        if (q.options) entry.options = q.options;
        if (q.correctAnswer) entry.correctAnswer = q.correctAnswer;
        list.push(entry);
      });
      fs.writeFileSync(file, JSON.stringify({ ...existing, questions: list }, null, 2));
      console.log(`Appended ${questions.length} ${sub} question(s) to pool`);
    } else if (rt === 'mixing-things-up' && sub) {
      const file = poolPath(`${sub}-questions.json`);
      if (!fs.existsSync(file)) continue;
      const existing = JSON.parse(fs.readFileSync(file, 'utf-8'));
      const list = existing.questions || [];
      questions.forEach(q => {
        const entry = { clue: q.clue, answer: q.answer };
        if (q.details) entry.details = q.details;
        if (q.league) entry.league = q.league;
        if (q.category) entry.category = q.category;
        list.push(entry);
      });
      fs.writeFileSync(file, JSON.stringify({ ...existing, questions: list }, null, 2));
      console.log(`Appended ${questions.length} ${sub} question(s) to pool`);
    }
  }
}

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
    throw new Error('Archive is empty. Run `npm run populate-archive` (Python jeopardy-parser + db-to-archive) or `npm run scrape` to populate data/archive-backup.json.');
  }
  
  console.log(`Generating game for ${date}...`);
  console.log(`Archive contains ${archive.length} questions`);
  console.log(`${usedQuestions.size} questions already used`);
  
  const { questions, finalQuestion, usedQuestions: newUsedQuestions, roundDifficulties } = 
    await selectQuestions(archive, usedQuestions, date);

  const bannedQuestions = loadBannedQuestions();

  // SubTypes used in recent games (so we avoid repeating the same format week to week)
  const recentSubTypesByRound = {
    5: getRecentlyUsedSubTypes(5, { excludeGameId: gameId, maxGames: 8 }),
    7: getRecentlyUsedSubTypes(7, { excludeGameId: gameId, maxGames: 8 })
  };
  
  // Organize questions into rounds with new structure
  const rounds = [];
  const questionsPerRound = 3; // Match the selection logic
  
  for (let i = 0; i < 8; i++) {
    const roundNumber = i + 1;
    const template = ROUND_TEMPLATES[roundNumber];
    const roundQuestions = questions.slice(i * questionsPerRound, (i + 1) * questionsPerRound);
    const difficulty = roundDifficulties[i] || template.difficulty || 'easy';
    
    // Check if this round should use LLM generation
    if (template.useLLM && openaiClient) {
      console.log(`Generating LLM round ${roundNumber}...`);
      try {
        const recentlyUsed = recentSubTypesByRound[roundNumber] || [];
        const llmResult = await generateLLMRound(roundNumber, null, newUsedQuestions, recentlyUsed);
        if (llmResult && llmResult.questions && llmResult.questions.length > 0) {
          console.log(`LLM round ${roundNumber} generated ${llmResult.questions.length} questions (subType: ${llmResult.subType})`);
          rounds.push({
            roundNumber,
            roundType: template.roundType,
            title: template.title,
            pointsPerQuestion: template.points,
            subType: llmResult.subType,
            instructions: template.instructions,
            difficulty: difficulty,
            questions: llmResult.questions.map(q => ({
              ...q,
              isBanned: false
            }))
          });
          continue;
        } else {
          console.warn(`LLM round ${roundNumber} returned empty or invalid result — will not fall back to generic archive.`);
        }
      } catch (error) {
        console.warn(`LLM generation threw for round ${roundNumber}: ${error.message} — will not fall back to generic archive.`);
      }
    }

    // Round 4: List round (one question with multiple answers)
    if (roundNumber === 4) {
      const listQuestion = selectListRoundQuestion(newUsedQuestions, bannedQuestions);
      if (!listQuestion) {
        throw new Error('No list-round questions available (add more to data/list-round-questions.json or some may be exhausted/banned).');
      }
      newUsedQuestions.add(listQuestion.questionId);
      for (let k = 9; k <= 11; k++) {
        if (questions[k]) newUsedQuestions.delete(`${questions[k].clue}|${questions[k].answer}`);
      }
      rounds.push({
        roundNumber,
        roundType: template.roundType,
        title: template.title,
        pointsPerQuestion: template.points,
        instructions: template.instructions,
        difficulty: difficulty,
        questions: [{
          clue: listQuestion.clue,
          answers: listQuestion.answers,
          pointsAvailable: listQuestion.pointsAvailable,
          isBanned: false
        }]
      });
      continue;
    }

    // Round 6: Entertainment (filter by movies/TV/music)
    if (roundNumber === 6) {
      const entertainmentQuestions = selectEntertainmentQuestions(archive, newUsedQuestions, bannedQuestions, 3);
      if (entertainmentQuestions.length < 3) {
        throw new Error(`Not enough entertainment questions available for round 6 (got ${entertainmentQuestions.length}, need 3). Add more archive content with movies/TV/music themes or expand ENTERTAINMENT_KEYWORDS.`);
      }
      for (const eq of entertainmentQuestions) {
        newUsedQuestions.add(`${eq.clue}|${eq.answer}`);
      }
      for (let k = 15; k <= 17; k++) {
        if (questions[k]) newUsedQuestions.delete(`${questions[k].clue}|${questions[k].answer}`);
      }
      rounds.push({
        roundNumber,
        roundType: template.roundType,
        title: template.title,
        pointsPerQuestion: template.points,
        instructions: template.instructions,
        difficulty: difficulty,
        questions: entertainmentQuestions.map(q => ({
          clue: q.clue,
          answer: q.answer,
          category: q.category,
          isBanned: false
        }))
      });
      continue;
    }

    // Themed rounds must never receive generic archive questions
    if (template.useLLM) {
      throw new Error(`Themed round ${roundNumber} (${template.roundType}) requires LLM generation but LLM is unavailable or failed. Cannot fall back to generic archive questions.`);
    }
    
    // Standard round from archive
    rounds.push({
      roundNumber,
      roundType: template.roundType,
      title: template.title,
      pointsPerQuestion: template.points,
      instructions: template.instructions,
      difficulty: difficulty,
      questions: roundQuestions.map(q => ({
        clue: q.clue,
        answer: q.answer,
        category: q.category,
        isBanned: false
      }))
    });
  }
  
  // Create game object with new structure
  const game = {
    id: gameId,
    date: date,
    isPlayed: false,
    rounds: rounds,
    finalTrivia: {
      category: finalQuestion.category,
      question: finalQuestion.clue,
      answer: finalQuestion.answer,
      isBanned: false
    }
  };
  
  // Save game file
  fs.writeFileSync(gameFile, JSON.stringify(game, null, 2));
  console.log(`Game saved to ${gameFile}`);
  
  // Update used questions tracking
  fs.writeFileSync(USED_QUESTIONS_FILE, JSON.stringify(Array.from(newUsedQuestions), null, 2));
  console.log(`Updated used questions tracking (${newUsedQuestions.size} total)`);
  
  // Append themed round questions to pool files so pools grow over time
  appendThemedPools(rounds);
  
  return gameId;
}

// Export generateGame for use in other scripts
export {
  generateGame,
  selectQuestions,
  loadListRoundQuestions,
  selectListRoundQuestion,
  filterEntertainment,
  selectEntertainmentQuestions
};

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


