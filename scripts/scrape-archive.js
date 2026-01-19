import fs from 'fs';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://j-archive.com';
const ARCHIVE_FILE = './data/archive-backup.json';
const DELAY_MS = 2000; // 2 second delay between requests to respect rate limits

// Load existing archive to avoid duplicates
let existingArchive = [];
if (fs.existsSync(ARCHIVE_FILE)) {
  const content = fs.readFileSync(ARCHIVE_FILE, 'utf-8');
  existingArchive = JSON.parse(content);
  console.log(`Loaded ${existingArchive.length} existing questions`);
}

// Track which game IDs we've already scraped
const scrapedGameIds = new Set(existingArchive.map(q => q.gameId));

/**
 * Clean clue text by removing player responses, host comments, and answers
 */
function cleanClueText(text, answer = null) {
  if (!text) return '';
  
  // Remove patterns like "(Player: response)" or "(Ken: comment)"
  text = text.replace(/\([^)]*:\s*[^)]*\)/g, '');
  
  // Remove patterns like "[Laughter]", "[*]", or any bracketed content
  text = text.replace(/\[[^\]]*\]/g, '');
  
  // Remove patterns like "(Ken: [To Jonathan] Yes...)" - multi-line parentheses
  text = text.replace(/\([^)]*(?:\([^)]*\)[^)]*)*\)/g, '');
  
  // Remove ellipsis patterns like "..."
  text = text.replace(/\.{3,}/g, '');
  
  // If answer is provided, remove it from the clue text (answers often appear at the end)
  if (answer) {
    // Escape special regex characters in the answer
    const answerEscaped = answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create a version of the answer with spaces removed for matching concatenated patterns
    const answerNoSpaces = answer.replace(/\s+/g, '');
    const answerEscapedNoSpaces = answerNoSpaces.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Strategy: Remove answer in multiple ways to catch different patterns
    
    // 1. Remove answer at the end, possibly followed by concatenated proper nouns (player names)
    // Pattern: answer (with spaces) + (one or more capitalized words concatenated) + end of string
    // This handles cases like "Willy WonkaCameronStella" where answer has spaces
    text = text.replace(new RegExp(answerEscaped + '([A-Z][a-z]+)+\\s*$', 'i'), '');
    
    // 2. Remove answer when concatenated (spaces removed) followed by player names
    // Pattern: answer (no spaces) + capitalized words + end
    // This handles "WillyWonkaCameronStella" patterns
    text = text.replace(new RegExp(answerEscapedNoSpaces + '([A-Z][a-z]+)+\\s*$', 'i'), '');
    
    // 3. Remove answer when concatenated directly to a word (no space before)
    // This handles "clue textanswer" or "productconditioner" patterns
    // Try with spaces in answer
    text = text.replace(new RegExp('([a-z])' + answerEscaped + '(?=\\s|$|[A-Z])', 'gi'), '$1');
    // Try with spaces removed from answer
    text = text.replace(new RegExp('([a-z])' + answerEscapedNoSpaces + '(?=\\s|$|[A-Z])', 'gi'), '$1');
    
    // 4. Remove answer as a standalone word/phrase at the end (with space before)
    text = text.replace(new RegExp('\\s+' + answerEscaped + '\\s*$', 'i'), '');
    
    // 5. Remove answer at the very end (no space, just concatenated, no spaces in answer)
    text = text.replace(new RegExp(answerEscapedNoSpaces + '\\s*$', 'i'), '');
    
    // 6. Remove answer at the very end (with spaces, standalone)
    text = text.replace(new RegExp(answerEscaped + '\\s*$', 'i'), '');
  }
  
  // Remove trailing concatenated proper nouns (likely player names appended after answers)
  // Pattern: lowercase letter followed by one or more capitalized words concatenated at end
  // This catches things like "textCameronStella" or "answerJonathanKen" at the end
  // Example: "geniusWilly WonkaCameronStella" -> after removing answer, we have "geniusCameronStella"
  // BE MORE CONSERVATIVE: Only remove if we have at least 2 capitalized words (likely player names)
  // and the text before ends with lowercase (not part of the clue)
  text = text.replace(/([a-z])([A-Z][a-z]+){2,}\s*$/g, '$1');
  
  // Remove trailing capitalized words that appear to be appended (not part of the clue)
  // Look for a pattern where we have lowercase text, then suddenly capitalized word(s) at the end
  // Pattern: word ending in lowercase, then space, then capitalized word(s) at very end
  // BE MORE CONSERVATIVE: Only remove if we have 2+ capitalized words (likely player names)
  // This is conservative - only removes if there's a space boundary AND multiple capitalized words
  text = text.replace(/([a-z])\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*$/g, '$1');
  
  // Remove "Triple Stumper" (this is a game term that sometimes appears)
  text = text.replace(/\bTriple\s+Stumper\b/gi, '');
  
  // Remove dollar amounts like "$600", "$1,200", etc.
  text = text.replace(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, '');
  
  // Remove "What is", "Who is", "What are", etc. at the end (player responses)
  text = text.replace(/\b(What|Who|Where|When|How|Which)\s+(is|are|was|were)\s+[^?]*\??\s*$/gi, '');
  
  // Remove question marks at the end that might be artifacts
  text = text.replace(/\?+\s*$/, '');
  
  // Remove multiple spaces and clean up
  text = text.replace(/\s+/g, ' ').trim();
  
  // Remove trailing punctuation artifacts (but be conservative - only if it's clearly an artifact)
  // Only remove if it's a single punctuation mark with no context
  // Don't remove if it's part of a sentence (e.g., "What is X?" should keep the question mark)
  // Only remove trailing punctuation if it's followed by nothing meaningful
  text = text.replace(/\s*[.,;:]\s*$/, '');
  
  // Final cleanup: remove any remaining single letters or numbers at the end that look like artifacts
  // BE MORE CONSERVATIVE: Only remove if it's clearly an artifact (single char with space before)
  // Don't remove if it might be part of the clue (e.g., "X" as an answer placeholder)
  // Only remove if preceded by space and followed by nothing
  const beforeFinalCleanup = text;
  text = text.replace(/\s+[A-Z0-9]\s*$/, '');
  
  // If we removed something and the result is suspiciously short, restore it
  // This prevents cutting off legitimate short clues
  if (beforeFinalCleanup.length > text.length && text.length < 10) {
    text = beforeFinalCleanup;
  }
  
  return text.trim();
}

/**
 * Parse a single game page and extract all questions
 */
async function scrapeGame(gameId) {
  const url = `${BASE_URL}/showgame.php?game_id=${gameId}`;
  
  try {
    console.log(`Scraping game ${gameId}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`Failed to fetch game ${gameId}: ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const questions = [];
    const airDateMatch = $('h1').text().match(/(\w+day, \w+ \d+, \d{4})/);
    const airDate = airDateMatch ? airDateMatch[1] : null;
    
    // Extract Jeopardy Round questions
    const jeopardyRound = $('#jeopardy_round');
    if (jeopardyRound.length > 0) {
      const categories = [];
      jeopardyRound.find('.category_name').each((i, el) => {
        categories.push($(el).text().trim());
      });
      
      // Find all clue cells - they're in td.clue elements
      jeopardyRound.find('td.clue').each((i, el) => {
        const $cell = $(el);
        
        // Find the clue text element (id starts with clue_J_ but doesn't end with _r)
        const $clueTextEl = $cell.find('td[id^="clue_J_"][class="clue_text"]').not('[id$="_r"]');
        if ($clueTextEl.length === 0) return;
        
        // Get only the direct text, not from nested elements
        let clueText = '';
        $clueTextEl.contents().each((idx, node) => {
          if (node.type === 'text') {
            clueText += $(node).text();
          } else if (node.type === 'tag' && node.name === 'a') {
            // For image links, use the link text or "this" / "here"
            clueText += $(node).text() || 'this';
          }
        });
        clueText = clueText.trim();
        
        // Find the answer in the response section (id ends with _r)
        const $responseEl = $cell.find('td[id$="_r"][class="clue_text"]');
        const answerText = $responseEl.find('.correct_response').text().trim();
        
        // Get clue ID from the link
        const $clueLink = $cell.find('a[href*="clue_id"]');
        const clueId = $clueLink.attr('href')?.match(/clue_id=(\d+)/)?.[1];
        
        // Get value
        const valueText = $cell.find('.clue_value, .clue_value_daily_double').text().trim();
        
        if (clueText && answerText) {
          // Determine category from table position
          const $row = $cell.closest('tr');
          const $table = $row.closest('table.round');
          const categoryRow = $table.find('tr').first();
          const colIndex = $row.find('td').index($cell);
          const category = categories[colIndex] || 'Unknown';
          
          // Parse value (remove $ and DD: prefix)
          let value = 0;
          const valueMatch = valueText.match(/\$?(\d+)/);
          if (valueMatch) {
            value = parseInt(valueMatch[1], 10);
          }
          
          // Clean the answer text first
          const cleanAnswer = cleanClueText(answerText);
          // Then clean the clue text, passing the answer to remove it if it appears
          const cleanClue = cleanClueText(clueText, cleanAnswer);
          
          if (cleanClue && cleanAnswer) {
            questions.push({
              clue: cleanClue,
              answer: cleanAnswer,
              category: category,
              value: value,
              round: 'Jeopardy',
              airDate: airDate,
              gameId: `game-${gameId}`,
              clueId: clueId || null
            });
          }
        }
      });
    }
    
    // Extract Double Jeopardy Round questions
    const doubleJeopardyRound = $('#double_jeopardy_round');
    if (doubleJeopardyRound.length > 0) {
      const categories = [];
      doubleJeopardyRound.find('.category_name').each((i, el) => {
        categories.push($(el).text().trim());
      });
      
      // Find all clue cells - they're in td.clue elements
      doubleJeopardyRound.find('td.clue').each((i, el) => {
        const $cell = $(el);
        
        // Find the clue text element (id starts with clue_DJ_ but doesn't end with _r)
        const $clueTextEl = $cell.find('td[id^="clue_DJ_"][class="clue_text"]').not('[id$="_r"]');
        if ($clueTextEl.length === 0) return;
        
        // Get only the direct text, not from nested elements
        let clueText = '';
        $clueTextEl.contents().each((idx, node) => {
          if (node.type === 'text') {
            clueText += $(node).text();
          } else if (node.type === 'tag' && node.name === 'a') {
            // For image links, use the link text or "this" / "here"
            clueText += $(node).text() || 'this';
          }
        });
        clueText = clueText.trim();
        
        // Find the answer in the response section (id ends with _r)
        const $responseEl = $cell.find('td[id$="_r"][class="clue_text"]');
        const answerText = $responseEl.find('.correct_response').text().trim();
        
        // Get clue ID from the link
        const $clueLink = $cell.find('a[href*="clue_id"]');
        const clueId = $clueLink.attr('href')?.match(/clue_id=(\d+)/)?.[1];
        
        // Get value
        const valueText = $cell.find('.clue_value, .clue_value_daily_double').text().trim();
        
        if (clueText && answerText) {
          // Determine category from table position
          const $row = $cell.closest('tr');
          const $table = $row.closest('table.round');
          const categoryRow = $table.find('tr').first();
          const colIndex = $row.find('td').index($cell);
          const category = categories[colIndex] || 'Unknown';
          
          // Parse value (remove $ and DD: prefix)
          let value = 0;
          const valueMatch = valueText.match(/\$?(\d+)/);
          if (valueMatch) {
            value = parseInt(valueMatch[1], 10);
          }
          
          // Clean the answer text first
          const cleanAnswer = cleanClueText(answerText);
          // Then clean the clue text, passing the answer to remove it if it appears
          const cleanClue = cleanClueText(clueText, cleanAnswer);
          
          if (cleanClue && cleanAnswer) {
            questions.push({
              clue: cleanClue,
              answer: cleanAnswer,
              category: category,
              value: value,
              round: 'Double Jeopardy',
              airDate: airDate,
              gameId: `game-${gameId}`,
              clueId: clueId || null
            });
          }
        }
      });
    }
    
    // Extract Final Jeopardy question
    const finalJeopardy = $('#final_jeopardy_round');
    if (finalJeopardy.length > 0) {
      const category = finalJeopardy.find('.category_name').text().trim();
      const clueText = finalJeopardy.find('td#clue_FJ.clue_text').text().trim();
      const answerText = finalJeopardy.find('.correct_response').text().trim();
      
      if (clueText && answerText) {
        // Clean the answer text first
        const cleanAnswer = cleanClueText(answerText);
        // Then clean the clue text, passing the answer to remove it if it appears
        const cleanClue = cleanClueText(clueText, cleanAnswer);
        
        if (cleanClue && cleanAnswer) {
          questions.push({
            clue: cleanClue,
            answer: cleanAnswer,
            category: category,
            value: 0, // Final Jeopardy has no dollar value
            round: 'Final Jeopardy',
            airDate: airDate,
            gameId: `game-${gameId}`,
            clueId: null
          });
        }
      }
    }
    
    console.log(`  Extracted ${questions.length} questions from game ${gameId}`);
    return questions;
    
  } catch (error) {
    console.error(`Error scraping game ${gameId}:`, error.message);
    return [];
  }
}

/**
 * Get list of game IDs from a season page
 */
async function getGameIdsFromSeason(seasonNum, maxGames = null) {
  const url = `${BASE_URL}/showseason.php?season=${seasonNum}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`Failed to fetch season ${seasonNum}: ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    const gameIds = [];
    
    $('a[href*="showgame.php"]').each((i, el) => {
      const href = $(el).attr('href');
      const match = href.match(/game_id=(\d+)/);
      if (match) {
        const gameId = match[1];
        if (!gameIds.includes(gameId)) {
          gameIds.push(gameId);
        }
      }
    });
    
    if (maxGames) {
      return gameIds.slice(0, maxGames);
    }
    return gameIds;
    
  } catch (error) {
    console.error(`Error fetching season ${seasonNum}:`, error.message);
    return [];
  }
}

/**
 * Main scraping function
 */
async function scrapeArchive(options = {}) {
  const {
    startSeason = 1,
    endSeason = 42,
    maxGamesPerSeason = null,
    maxTotalGames = null
  } = options;
  
  const allQuestions = [...existingArchive];
  let totalGamesScraped = 0;
  let totalQuestionsAdded = 0;
  
  for (let season = startSeason; season <= endSeason; season++) {
    console.log(`\n=== Processing Season ${season} ===`);
    const gameIds = await getGameIdsFromSeason(season, maxGamesPerSeason);
    console.log(`Found ${gameIds.length} games in season ${season}`);
    
    for (const gameId of gameIds) {
      // Skip if we've already scraped this game
      if (scrapedGameIds.has(`game-${gameId}`)) {
        console.log(`  Skipping game ${gameId} (already scraped)`);
        continue;
      }
      
      // Check if we've hit the max total games limit
      if (maxTotalGames && totalGamesScraped >= maxTotalGames) {
        console.log(`\nReached max total games limit (${maxTotalGames})`);
        break;
      }
      
      const questions = await scrapeGame(gameId);
      
      // Add new questions
      for (const question of questions) {
        // Check for duplicates by clue text and answer
        const isDuplicate = allQuestions.some(
          q => q.clue === question.clue && q.answer === question.answer
        );
        
        if (!isDuplicate) {
          allQuestions.push(question);
          totalQuestionsAdded++;
        }
      }
      
      scrapedGameIds.add(`game-${gameId}`);
      totalGamesScraped++;
      
      // Save progress periodically
      if (totalGamesScraped % 10 === 0) {
        fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(allQuestions, null, 2));
        console.log(`  Progress saved: ${allQuestions.length} total questions`);
      }
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      
      if (maxTotalGames && totalGamesScraped >= maxTotalGames) {
        break;
      }
    }
    
    if (maxTotalGames && totalGamesScraped >= maxTotalGames) {
      break;
    }
  }
  
  // Final save
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(allQuestions, null, 2));
  
  console.log(`\n=== Scraping Complete ===`);
  console.log(`Total games scraped: ${totalGamesScraped}`);
  console.log(`Total questions in archive: ${allQuestions.length}`);
  console.log(`New questions added: ${totalQuestionsAdded}`);
  console.log(`Archive saved to ${ARCHIVE_FILE}`);
}

// Run scraper with command line arguments or defaults
const args = process.argv.slice(2);
const options = {};

if (args.includes('--test')) {
  // Test mode: scrape just a few games
  options.startSeason = 42;
  options.endSeason = 42;
  options.maxGamesPerSeason = 5;
  options.maxTotalGames = 5;
} else if (args.includes('--season')) {
  const seasonIndex = args.indexOf('--season');
  const seasonNum = parseInt(args[seasonIndex + 1], 10);
  options.startSeason = seasonNum;
  options.endSeason = seasonNum;
} else {
  // Default: scrape recent seasons
  options.startSeason = 40;
  options.endSeason = 42;
}

scrapeArchive(options).catch(console.error);

