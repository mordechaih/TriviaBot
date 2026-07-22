#!/usr/bin/env node
/**
 * Build static site into public/ for Vercel deployment.
 * Excludes archive, scripts, and maintainer tooling from the browser bundle.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

const STATIC_ROOT_FILES = [
  'index.html',
  'game.html',
  'round-review.html',
  'favicon.png',
];

const COPY_DIRS = ['css', 'js', 'shared'];

const DATA_GLOBS = [
  'data/games',
  'data/played-status.json',
  'data/list-round-questions.json',
  'data/over-under-questions.json',
  'data/family-feud-questions.json',
  'data/to-tell-the-truth-questions.json',
  'data/name-that-tune-questions.json',
  'data/millionaire-questions.json',
  'data/who-am-i-questions.json',
  'data/size-matters-questions.json',
  'data/name-that-brand-questions.json',
  'data/name-that-sports-team-questions.json',
];

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else copyFile(from, to);
  }
}

console.log('=== TriviaBot Build ===\n');

rimraf(publicDir);
fs.mkdirSync(publicDir, { recursive: true });

for (const file of STATIC_ROOT_FILES) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) copyFile(src, path.join(publicDir, file));
}

for (const dir of COPY_DIRS) {
  copyDir(path.join(root, dir), path.join(publicDir, dir));
}

for (const item of DATA_GLOBS) {
  const src = path.join(root, item);
  const dest = path.join(publicDir, item);
  if (!fs.existsSync(src)) continue;
  if (fs.statSync(src).isDirectory()) copyDir(src, dest);
  else copyFile(src, dest);
}

// Runtime config for production UI
const owner = process.env.GITHUB_OWNER || 'mordechaih';
const repo = process.env.GITHUB_REPO || 'TriviaBot';
const branch = process.env.GITHUB_BRANCH || 'main';
const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const baseUrl = productionUrl
  ? (productionUrl.startsWith('http') ? productionUrl : `https://${productionUrl}`)
  : '';
const apiEndpoint = process.env.API_ENDPOINT || (baseUrl ? `${baseUrl}/api/generate` : '/api/generate');

const configContent = `// Auto-generated at build time
const GITHUB_CONFIG = {
  owner: '${owner}',
  repo: '${repo}',
  branch: '${branch}',
  apiEndpoint: '${apiEndpoint}'
};
`;

fs.mkdirSync(path.join(publicDir, 'js'), { recursive: true });
fs.writeFileSync(path.join(publicDir, 'js', 'config.js'), configContent, 'utf-8');
console.log(`Wrote public/js/config.js (apiEndpoint: ${apiEndpoint})`);

// Keep repo index current (games live in git, copied above)
try {
  execSync('node scripts/update-games-index.js', { cwd: root, stdio: 'inherit' });
  copyDir(path.join(root, 'data', 'games'), path.join(publicDir, 'data', 'games'));
} catch (err) {
  console.warn('Index update skipped:', err.message);
}

console.log('\n=== Build complete → public/ ===');
