import fs from 'fs';
import path from 'path';

const GAMES_DIR = './data/games';
const INDEX_FILE = './data/games/index.json';

/**
 * Update the games index file
 */
function updateGamesIndex() {
  if (!fs.existsSync(GAMES_DIR)) {
    console.log('Games directory does not exist');
    return;
  }
  
  const files = fs.readdirSync(GAMES_DIR);
  const gameFiles = files.filter(f => f.startsWith('game-') && f.endsWith('.json'));
  
  const gameIds = gameFiles.map(f => f.replace('.json', '')).sort().reverse();
  
  const index = {
    lastUpdated: new Date().toISOString(),
    count: gameIds.length,
    games: gameIds
  };
  
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`Updated games index with ${gameIds.length} games`);
}

updateGamesIndex();

