import fs from 'fs';
import path from 'path';

const ARCHIVE_FILE = './data/archive-backup.json';

/**
 * Clean answer text (less aggressive - just remove obvious artifacts)
 */
function cleanAnswerText(text) {
  if (!text) return '';
  
  // Remove patterns like "(Player: response)" or "(Ken: comment)"
  text = text.replace(/\([^)]*:\s*[^)]*\)/g, '');
  
  // Remove patterns like "[Laughter]", "[*]", or any bracketed content
  text = text.replace(/\[[^\]]*\]/g, '');
  
  // Remove ellipsis patterns like "..."
  text = text.replace(/\.{3,}/g, '');
  
  // Remove dollar amounts
  text = text.replace(/\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g, '');
  
  // Remove multiple spaces and clean up
  text = text.replace(/\s+/g, ' ').trim();
  
  // Remove trailing punctuation artifacts
  text = text.replace(/\s*[.,;:]\s*$/, '');
  
  return text.trim();
}

/**
 * Clean clue text by removing player responses, host comments, and answers
 * (Same function as in scrape-archive.js)
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
  text = text.replace(/([a-z])([A-Z][a-z]+)+([A-Z][a-z]+)*\s*$/g, '$1');
  
  // Remove trailing capitalized words that appear to be appended (not part of the clue)
  // Look for a pattern where we have lowercase text, then suddenly capitalized word(s) at the end
  // Pattern: word ending in lowercase, then space, then capitalized word(s) at very end
  // This is conservative - only removes if there's a space boundary
  text = text.replace(/([a-z])\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/g, '$1');
  
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
  
  // Remove trailing punctuation artifacts
  text = text.replace(/\s*[.,;:]\s*$/, '');
  
  // Final cleanup: remove any remaining single letters or numbers at the end that look like artifacts
  text = text.replace(/\s+[A-Z0-9]\s*$/, '');
  
  return text.trim();
}

/**
 * Clean the entire archive by re-processing all questions
 */
function cleanArchive() {
  console.log('Loading archive...');
  let archive = [];
  
  if (!fs.existsSync(ARCHIVE_FILE)) {
    console.error(`Archive file not found: ${ARCHIVE_FILE}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(ARCHIVE_FILE, 'utf-8');
  archive = JSON.parse(content);
  console.log(`Loaded ${archive.length} questions`);
  
  console.log('Cleaning clues...');
  let cleaned = 0;
  let unchanged = 0;
  
  const cleanedArchive = archive.map((question, index) => {
    if ((index + 1) % 100 === 0) {
      console.log(`  Processed ${index + 1}/${archive.length} questions...`);
    }
    
    // Clean the answer first (use less aggressive cleaning for answers)
    // Don't apply the aggressive trailing word removal to answers
    const cleanAnswer = cleanAnswerText(question.answer);
    
    // Then clean the clue, passing the ORIGINAL answer (before cleaning) for removal
    // This way we can find and remove the answer from the clue even if it has artifacts
    const cleanClue = cleanClueText(question.clue, question.answer);
    
    // Check if anything changed
    if (cleanClue !== question.clue || cleanAnswer !== question.answer) {
      cleaned++;
    } else {
      unchanged++;
    }
    
    return {
      ...question,
      clue: cleanClue,
      answer: cleanAnswer
    };
  });
  
  console.log(`\nCleaning complete:`);
  console.log(`  ${cleaned} questions were cleaned`);
  console.log(`  ${unchanged} questions were unchanged`);
  
  // Backup original file
  const backupFile = ARCHIVE_FILE.replace('.json', '.backup.json');
  console.log(`\nCreating backup: ${backupFile}`);
  fs.copyFileSync(ARCHIVE_FILE, backupFile);
  
  // Save cleaned archive
  console.log(`Saving cleaned archive to ${ARCHIVE_FILE}...`);
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(cleanedArchive, null, 2));
  console.log('Done!');
}

// Run the cleaning
cleanArchive();

