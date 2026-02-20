/**
 * Migration script to convert existing games to the new structured format
 * 
 * This script:
 * 1. Reads all existing game JSON files
 * 2. Transforms them to the new schema with round templates
 * 3. Preserves existing questions
 * 4. Adds new fields (roundType, title, pointsPerQuestion, etc.)
 * 5. Backs up originals before migration
 */

import fs from 'fs';
import path from 'path';

const GAMES_DIR = './data/games';
const BACKUP_DIR = './data/games/backup-pre-migration';

/**
 * Round templates configuration
 */
const ROUND_TEMPLATES = {
  1: { 
    type: 'standard', 
    roundType: 'get-your-feet-wet',
    title: 'Get Your Feet Wet', 
    pointsPerQuestion: 2,
    instructions: 'Generally VERY easy questions to ease into the game.'
  },
  2: { 
    type: 'over-under', 
    roundType: 'over-under',
    title: 'Over/Under', 
    pointsPerQuestion: 3,
    instructions: 'Numeric guessing questions. Pick a number close to the actual answer.'
  },
  3: { 
    type: 'standard', 
    roundType: 'trifecta-trivia',
    title: 'Trifecta Trivia', 
    pointsPerQuestion: 3,
    instructions: 'First "trivia in earnest" round. Still easy questions.'
  },
  4: { 
    type: 'list', 
    roundType: 'list-round',
    title: 'The List Round', 
    pointsPerQuestion: 'variable',
    instructions: 'One question with multiple answers. 1 point per correct answer.'
  },
  5: { 
    type: 'game-show-style', 
    roundType: 'game-show-style',
    title: 'Game Show Style', 
    pointsPerQuestion: 4,
    instructions: 'Varies weekly: True/False, Name That Tune, Multiple Choice, or Family Feud.'
  },
  6: { 
    type: 'entertainment', 
    roundType: 'entertainment-trivia',
    title: 'Entertainment Trivia', 
    pointsPerQuestion: 4,
    instructions: 'Movies, music, and TV from 1980s onward. Books can be older (early 1900s).'
  },
  7: { 
    type: 'mixing-things-up', 
    roundType: 'mixing-things-up',
    title: 'Mixing Things Up', 
    pointsPerQuestion: 5,
    instructions: 'Varies weekly: Who Am I, Size Matters, Name That Brand, or Sports Team.'
  },
  8: { 
    type: 'standard', 
    roundType: 'game-changer',
    title: 'Game Changer Round', 
    pointsPerQuestion: 6,
    instructions: 'Medium difficulty standard questions. No shared theme.'
  }
};

/**
 * Migrate a single game file to the new structure
 */
function migrateGame(game) {
  const migratedGame = {
    id: game.id,
    date: game.date,
    isPlayed: game.isPlayed || false,
    rounds: game.rounds.map(round => {
      const template = ROUND_TEMPLATES[round.roundNumber] || {};
      
      // Check if already migrated
      if (round.roundType && round.title) {
        // Already has new fields, just ensure all fields exist
        return {
          roundNumber: round.roundNumber,
          roundType: round.roundType,
          title: round.title,
          pointsPerQuestion: round.pointsPerQuestion || template.pointsPerQuestion,
          instructions: round.instructions || template.instructions,
          subType: round.subType,
          difficulty: round.difficulty,
          questions: round.questions.map(q => ({
            ...q,
            isBanned: q.isBanned || false
          }))
        };
      }
      
      // Migrate from old format
      return {
        roundNumber: round.roundNumber,
        roundType: template.roundType || 'standard',
        title: template.title || `Round ${round.roundNumber}`,
        pointsPerQuestion: template.pointsPerQuestion || 3,
        instructions: template.instructions,
        difficulty: round.difficulty || 'medium',
        questions: round.questions.map(q => ({
          clue: q.clue,
          answer: q.answer,
          category: q.category,
          isBanned: false
        }))
      };
    }),
    finalTrivia: {
      category: game.finalTrivia?.category || 'General',
      question: game.finalTrivia?.question || game.finalTrivia?.clue || '',
      answer: game.finalTrivia?.answer || '',
      isBanned: game.finalTrivia?.isBanned || false
    }
  };
  
  return migratedGame;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('Starting migration...\n');
  
  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }
  
  // Get all game files
  const gameFiles = fs.readdirSync(GAMES_DIR)
    .filter(f => f.startsWith('game-') && f.endsWith('.json'));
  
  console.log(`Found ${gameFiles.length} game files to migrate.\n`);
  
  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const filename of gameFiles) {
    const filepath = path.join(GAMES_DIR, filename);
    const backupPath = path.join(BACKUP_DIR, filename);
    
    try {
      // Read game file
      const content = fs.readFileSync(filepath, 'utf-8');
      const game = JSON.parse(content);
      
      // Check if already migrated (has roundType on first round)
      if (game.rounds && game.rounds[0]?.roundType) {
        console.log(`⏭️  Skipping ${filename} (already migrated)`);
        skipped++;
        continue;
      }
      
      // Backup original
      fs.writeFileSync(backupPath, content);
      console.log(`📦 Backed up ${filename}`);
      
      // Migrate game
      const migratedGame = migrateGame(game);
      
      // Write migrated game
      fs.writeFileSync(filepath, JSON.stringify(migratedGame, null, 2));
      console.log(`✅ Migrated ${filename}`);
      migrated++;
      
    } catch (error) {
      console.error(`❌ Error migrating ${filename}: ${error.message}`);
      errors++;
    }
  }
  
  console.log('\n--- Migration Summary ---');
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped (already migrated): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total: ${gameFiles.length}`);
  
  if (migrated > 0) {
    console.log(`\nBackups saved to: ${BACKUP_DIR}`);
  }
}

// Run migration
migrate().catch(console.error);

