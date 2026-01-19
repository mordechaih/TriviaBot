#!/usr/bin/env node

/**
 * Regenerate all existing games with updated logic
 * This will overwrite existing games with new ones that avoid "Unknown" categories
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateGame } from './generate-game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAMES_DIR = path.join(__dirname, '..', 'data', 'games');

// Get all existing game files
const gameFiles = fs.readdirSync(GAMES_DIR)
  .filter(file => file.startsWith('game-') && file.endsWith('.json'))
  .map(file => {
    const gameData = JSON.parse(fs.readFileSync(path.join(GAMES_DIR, file), 'utf-8'));
    return {
      file,
      date: gameData.date,
      id: gameData.id
    };
  })
  .sort((a, b) => a.date.localeCompare(b.date));

if (gameFiles.length === 0) {
  console.log('No games found to regenerate.');
  process.exit(0);
}

console.log(`Found ${gameFiles.length} games to regenerate:`);
gameFiles.forEach(g => console.log(`  - ${g.id} (${g.date})`));

// Regenerate all games sequentially
async function regenerateAll() {
  console.log('\nStarting regeneration...\n');
  
  for (const game of gameFiles) {
    try {
      console.log(`Regenerating ${game.id}...`);
      // Call generateGame with forceOverwrite = true
      const newGameId = await generateGame(game.date, true);
      console.log(`✓ Successfully regenerated ${newGameId}\n`);
      
      // Small delay between games to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`✗ Failed to regenerate ${game.id}:`, error.message);
      console.log('Continuing with next game...\n');
    }
  }
  
  console.log('\nRegeneration complete!');
  console.log('Note: You may need to update the games index file if it exists.');
}

// Run regeneration
regenerateAll().catch(error => {
  console.error('Fatal error during regeneration:', error);
  process.exit(1);
});

