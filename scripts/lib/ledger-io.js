/**
 * Load and persist the unified question ledger (Node-only).
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  emptyLedger,
  mergeLegacyLedgers,
  normalizeLedger,
} from '../../shared/question-ledger.js';

const DATA_DIR = './data';
const LEDGER_FILE = path.join(DATA_DIR, 'question-ledger.json');
const LEGACY_USED = path.join(DATA_DIR, 'used-questions.json');
const LEGACY_USED_UI = path.join(DATA_DIR, 'used-questions-ui.json');
const LEGACY_BANNED = path.join(DATA_DIR, 'banned-questions.json');
const LEGACY_BANNED_UI = path.join(DATA_DIR, 'banned-questions-ui.json');

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * @returns {import('../../shared/question-ledger.js').QuestionLedger}
 */
export function loadQuestionLedger() {
  const primary = readJson(LEDGER_FILE);
  if (primary) return normalizeLedger(primary);

  return mergeLegacyLedgers({
    usedMain: readJson(LEGACY_USED),
    usedUi: readJson(LEGACY_USED_UI),
    bannedMain: readJson(path.join(DATA_DIR, 'banned-questions.json')),
    bannedUi: readJson(path.join(DATA_DIR, 'banned-questions-ui.json')),
  });
}

/**
 * @param {import('../../shared/question-ledger.js').QuestionLedger} ledger
 */
export function saveQuestionLedger(ledger) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(LEDGER_FILE, JSON.stringify(normalizeLedger(ledger), null, 2));

  // Transition: keep legacy used file in sync for one release
  fs.writeFileSync(LEGACY_USED, JSON.stringify(ledger.usedIds, null, 2));
  fs.writeFileSync(
    path.join(DATA_DIR, 'banned-questions.json'),
    JSON.stringify({ questions: ledger.bans.questions, lastUpdated: ledger.bans.lastUpdated }, null, 2),
  );
}

/**
 * @returns {Set<string>}
 */
export function loadUsedQuestionIds() {
  return new Set(loadQuestionLedger().usedIds);
}

/**
 * @returns {Array<Record<string, unknown>>}
 */
export function loadBannedQuestions() {
  return loadQuestionLedger().bans.questions;
}

/**
 * @param {string[]} usedIds
 */
export function saveUsedQuestionIds(usedIds) {
  const ledger = loadQuestionLedger();
  ledger.usedIds = [...usedIds];
  saveQuestionLedger(ledger);
}
