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

// Use VERCEL_URL (automatically provided by Vercel) or custom API_ENDPOINT
// VERCEL_URL is available during build: e.g., "trivia-bot-green.vercel.app"
// For production, you might want to set API_ENDPOINT to your custom domain
const apiEndpoint = process.env.API_ENDPOINT 
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/trigger-workflow` : '');

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

