#!/usr/bin/env node
// Build script for Vercel deployment
// 1. Generates config.js from environment variables
// 2. Optionally generates a new game if GENERATE_GAME=true

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== TriviaBot Build Script ===\n');

// Step 1: Generate config.js
console.log('Step 1: Generating config.js...');
const configPath = path.join(__dirname, '..', 'js', 'config.js');
const configDir = path.dirname(configPath);

if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

const owner = process.env.GITHUB_OWNER || 'mordechaih';
const repo = process.env.GITHUB_REPO || 'TriviaBot';
const branch = process.env.GITHUB_BRANCH || 'main';

let apiEndpoint = process.env.API_ENDPOINT;
if (!apiEndpoint) {
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (productionUrl) {
    const url = productionUrl.startsWith('http') ? productionUrl : `https://${productionUrl}`;
    apiEndpoint = `${url}/api/trigger-deploy`;
  }
}

const configContent = `// TriviaBot Configuration
// This file is auto-generated at build time - do not edit manually

const GITHUB_CONFIG = {
  owner: '${owner}',
  repo: '${repo}',
  branch: '${branch}',
  apiEndpoint: '${apiEndpoint || ''}'
};
`;

fs.writeFileSync(configPath, configContent, 'utf-8');
console.log(`  Generated ${configPath}`);
console.log(`  apiEndpoint: ${apiEndpoint || '(not set)'}`);

// Step 2: Generate a new game if requested
const shouldGenerateGame = process.env.GENERATE_GAME === 'true';

if (shouldGenerateGame) {
  console.log('\nStep 2: Generating new game...');
  try {
    // Run the generate script
    execSync('node scripts/generate-game.js', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    // Update the games index
    execSync('node scripts/update-games-index.js', {
      stdio: 'inherit', 
      cwd: path.join(__dirname, '..')
    });
    
    console.log('  Game generation complete!');
  } catch (error) {
    console.error('  Error generating game:', error.message);
    // Don't fail the build if game generation fails
  }
} else {
  console.log('\nStep 2: Skipping game generation (GENERATE_GAME not set to true)');
}

// Step 3: Update the games index (always run this to ensure it's current)
console.log('\nStep 3: Updating games index...');
try {
  execSync('node scripts/update-games-index.js', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch (error) {
  console.error('  Error updating index:', error.message);
}

console.log('\n=== Build Complete ===');

