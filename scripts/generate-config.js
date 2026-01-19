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
// VERCEL_URL format: "trivia-bot-green.vercel.app" (no https://)
// For production, set API_ENDPOINT environment variable in Vercel dashboard
let apiEndpoint = process.env.API_ENDPOINT;

if (!apiEndpoint) {
  // Use VERCEL_URL (available during build and runtime)
  // This will be the deployment URL (preview or production)
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    // VERCEL_URL doesn't include protocol, so add it
    const url = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
    apiEndpoint = `${url}/api/trigger-workflow`;
  } else {
    console.warn('Warning: VERCEL_URL not found. Set API_ENDPOINT environment variable in Vercel dashboard.');
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

