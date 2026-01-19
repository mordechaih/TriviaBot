import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const GAMES_DIR = './data/games';
const INDEX_FILE = './data/games/index.json';

/**
 * Generate a version hash from game IDs to ensure cache invalidation
 */
function generateVersion(gameIds) {
  const hash = crypto.createHash('md5');
  hash.update(gameIds.sort().join(','));
  return hash.digest('hex').substring(0, 8);
}

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
  
  // Generate version hash based on game IDs - this changes when games are added/removed
  const version = generateVersion(gameIds);
  
  const index = {
    version: version,
    lastUpdated: new Date().toISOString(),
    count: gameIds.length,
    games: gameIds
  };
  
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`Updated games index with ${gameIds.length} games (version: ${version})`);
}

updateGamesIndex();

