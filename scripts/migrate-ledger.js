#!/usr/bin/env node
/**
 * One-time migration: merge legacy ledgers into data/question-ledger.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeLegacyLedgers } from '../shared/question-ledger.js';
import { saveQuestionLedger } from './lib/ledger-io.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

const ledger = mergeLegacyLedgers({
  usedMain: readJson(path.join(dataDir, 'used-questions.json')),
  usedUi: readJson(path.join(dataDir, 'used-questions-ui.json')),
  bannedMain: readJson(path.join(dataDir, 'banned-questions.json')),
  bannedUi: readJson(path.join(dataDir, 'banned-questions-ui.json')),
});

saveQuestionLedger(ledger);
console.log(`Migrated ledger: ${ledger.usedIds.length} used IDs, ${ledger.bans.questions.length} bans`);
