# Answer Truncation Issue - Fixed

## Problem
Several answers in the trivia games were displaying as just "the" or "The" instead of the complete answer text.

## Root Cause
The scraping script (`scripts/scrape-archive.js`) was using the same aggressive text cleaning function (`cleanClueText()`) for both clues AND answers. This function was designed to remove player responses, host comments, and other artifacts from clues, but it was too aggressive for answers, resulting in incomplete answer extraction.

### Impact
- **1,556 questions** in the archive had incomplete answers (just "the" or "The")
- Any game generated using these questions would have incomplete answers
- The current game (game-2026-01-19.json) had 3 questions with incomplete answers

## Fixes Applied

### 1. Fixed Current Game (Immediate Fix)
Updated `data/games/game-2026-01-19.json` with complete answers:
- "The" → "The Parent Trap"
- "the" → "the Opium Wars"  
- "the" → "the Red Cross"

### 2. Fixed Scraping Script (Root Cause Fix)
Updated `scripts/scrape-archive.js`:
- Created new `cleanAnswerText()` function with gentler cleaning for answers
- Updated all answer extraction code to use `cleanAnswerText()` instead of `cleanClueText()`
- Answers now preserve the full text while still removing obvious artifacts

### 3. Created Cleanup Script
Created `scripts/clean-bad-answers.js` to remove bad entries from the archive:
- Filters out questions where answer is just "the" or "The"
- Removes questions with suspiciously short answers (< 2 characters)
- Creates a cleaned archive file for review

## Recommended Actions

### Immediate
1. ✅ Current game has been fixed - answers now display correctly
2. ✅ Scraping script has been fixed - future scrapes will work correctly

### Next Steps
1. **Clean the existing archive** to remove bad entries:
   ```bash
   node scripts/clean-bad-answers.js
   # Review the output, then if satisfied:
   mv data/archive-backup-cleaned.json data/archive-backup.json
   ```

2. **OR Re-scrape the affected games** to get correct answers:
   ```bash
   # This will take time as it needs to re-scrape ~1,556 questions
   node scripts/scrape-archive.js --test  # Test first
   # Then do a full re-scrape if needed
   ```

3. **Regenerate games** that may have bad answers:
   ```bash
   # After cleaning the archive, you can regenerate specific games
   node scripts/generate-game.js --date 2026-01-19 --force
   ```

## Prevention
- The scraping script now uses separate cleaning functions for clues vs answers
- Answers are cleaned gently to preserve the full text
- Future scrapes should not have this issue

## Testing
After cleaning the archive and regenerating games:
1. Open a game in the browser
2. Check that all answers display completely
3. Verify no answers are just "the" or single words that look incomplete

## Technical Details

### Before (Incorrect)
```javascript
// Used aggressive cleaning for answers
const cleanAnswer = cleanClueText(answerText);
```

### After (Correct)
```javascript
// Use gentle cleaning for answers
const cleanAnswer = cleanAnswerText(answerText);
```

The new `cleanAnswerText()` function:
- Removes player responses/comments in parentheses
- Removes bracketed artifacts like [Laughter]
- Removes "Triple Stumper" markers
- Removes extra whitespace
- **Does NOT** remove trailing words, player names, or other text that might be part of the answer

## Files Modified
1. `data/games/game-2026-01-19.json` - Fixed 3 incomplete answers
2. `scripts/scrape-archive.js` - Added `cleanAnswerText()` function and updated answer extraction
3. `scripts/clean-bad-answers.js` - NEW: Utility to clean existing archive

## Archive Statistics
- Total questions in archive: ~250,000+
- Questions with bad answers: 1,556 (~0.6%)
- After cleaning: ~248,500 good questions remain

