// Generate config.js from environment variables at build time
// This allows Vercel to inject the API endpoint via environment variables

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '..', 'js', 'config.js');
const configDir = path.dirname(configPath);

// Ensure js directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Get values from environment variables or use defaults
const owner = process.env.GITHUB_OWNER || 'mordechaih';
const repo = process.env.GITHUB_REPO || 'TriviaBot';
const branch = process.env.GITHUB_BRANCH || 'main';

// Use API_ENDPOINT or construct from Vercel environment variables
// IMPORTANT: Use the same domain as the frontend to avoid CORS issues
// For production, set API_ENDPOINT to your production URL in Vercel dashboard
let apiEndpoint = process.env.API_ENDPOINT;

if (!apiEndpoint) {
  // Try to use production URL first, then fall back to VERCEL_URL
  // VERCEL_PROJECT_PRODUCTION_URL is the production domain (e.g., "trivia-bot-green.vercel.app")
  // VERCEL_URL is the current deployment URL (could be preview or production)
  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  
  if (productionUrl) {
    // Vercel URLs don't include protocol, so add it
    const url = productionUrl.startsWith('http') ? productionUrl : `https://${productionUrl}`;
    apiEndpoint = `${url}/api/trigger-workflow`;
    console.log(`Using API endpoint: ${apiEndpoint}`);
  } else {
    console.warn('Warning: No Vercel URL found. Set API_ENDPOINT environment variable in Vercel dashboard.');
  }
}

// Generate config.js content
const configContent = `// GitHub Configuration
// This file is auto-generated from environment variables at build time
// Do not edit manually - it will be overwritten on each deployment

const GITHUB_CONFIG = {
  owner: '${owner}',
  repo: '${repo}',
  branch: '${branch}',
  apiEndpoint: '${apiEndpoint}'
};
`;

// Write the config file
fs.writeFileSync(configPath, configContent, 'utf-8');
console.log(`Generated ${configPath}`);
console.log(`  owner: ${owner}`);
console.log(`  repo: ${repo}`);
console.log(`  branch: ${branch}`);
console.log(`  apiEndpoint: ${apiEndpoint || '(not set - using VERCEL_URL)'}`);

