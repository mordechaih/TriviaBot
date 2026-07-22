#!/usr/bin/env node
/**
 * Atomic publish: generate game, update index, persist ledger.
 * Used by GitHub Actions and local dev (`npm run generate:publish`).
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateGame } from './generate-game.js';
import { loadQuestionLedger, saveQuestionLedger } from './lib/ledger-io.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

/**
 * @param {{ date?: string|null, force?: boolean }} [options]
 */
export async function generatePublish(options = {}) {
  const { date = null, force = false } = options;
  const gameId = await generateGame(date, force);

  execSync('node scripts/update-games-index.js', { cwd: root, stdio: 'inherit' });

  const ledger = loadQuestionLedger();
  saveQuestionLedger(ledger);

  return gameId;
}

const isMain = process.argv[1]?.endsWith('generate-publish.js');
if (isMain) {
  const args = process.argv.slice(2);
  let date = null;
  const force = args.includes('--force');
  if (args.includes('--date')) {
    date = args[args.indexOf('--date') + 1];
  }

  try {
    const gameId = await generatePublish({ date, force });
    console.log(`\nPublished ${gameId}`);
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}
