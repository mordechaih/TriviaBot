/**
 * Unified question ledger: used IDs + bans. Reads legacy files during transition.
 */

import { isBannedRecord } from './question-ids.js';

export const LEDGER_VERSION = 1;

/**
 * @typedef {Object} QuestionLedger
 * @property {number} version
 * @property {string[]} usedIds
 * @property {{ questions: Array<Record<string, unknown>>, lastUpdated?: string }} bans
 */

/**
 * @returns {QuestionLedger}
 */
export function emptyLedger() {
  return {
    version: LEDGER_VERSION,
    usedIds: [],
    bans: { questions: [], lastUpdated: new Date().toISOString() },
  };
}

/**
 * @param {unknown} raw
 * @returns {QuestionLedger}
 */
export function normalizeLedger(raw) {
  if (!raw || typeof raw !== 'object') return emptyLedger();
  const obj = /** @type {Record<string, unknown>} */ (raw);
  const usedIds = Array.isArray(obj.usedIds)
    ? [...obj.usedIds]
    : Array.isArray(obj.used)
      ? [...obj.used]
      : [];
  const bansRaw = obj.bans || obj.bannedQuestions || { questions: [] };
  const questions = Array.isArray(bansRaw)
    ? bansRaw
    : (/** @type {{ questions?: unknown[] }} */ (bansRaw)).questions || [];
  return {
    version: LEDGER_VERSION,
    usedIds,
    bans: {
      questions: [...questions],
      lastUpdated: (/** @type {{ lastUpdated?: string }} */ (bansRaw)).lastUpdated
        || new Date().toISOString(),
    },
  };
}

/**
 * Merge legacy file payloads into one ledger.
 * @param {object} sources
 * @param {string[]|null} [sources.usedMain]
 * @param {string[]|unknown|null} [sources.usedUi]
 * @param {{ questions?: unknown[] }|unknown[]|null} [sources.bannedMain]
 * @param {{ questions?: unknown[] }|unknown[]|null} [sources.bannedUi]
 * @returns {QuestionLedger}
 */
export function mergeLegacyLedgers(sources) {
  const ledger = emptyLedger();
  const usedSet = new Set();

  for (const list of [sources.usedMain, sources.usedUi]) {
    if (!list) continue;
    const arr = Array.isArray(list) ? list : (list.questions || list.ids || []);
    if (Array.isArray(arr)) arr.forEach((id) => usedSet.add(String(id)));
  }
  ledger.usedIds = [...usedSet];

  const banSeen = new Set();
  const mergedBans = [];
  for (const src of [sources.bannedMain, sources.bannedUi]) {
    if (!src) continue;
    const list = Array.isArray(src) ? src : src.questions || [];
    for (const b of list) {
      const key = b.questionId || `${b.clue}|${b.answer || ''}`;
      if (banSeen.has(key)) continue;
      banSeen.add(key);
      mergedBans.push(b);
    }
  }
  ledger.bans.questions = mergedBans;
  return ledger;
}

/**
 * @param {QuestionLedger} ledger
 * @returns {Set<string>}
 */
export function usedIdSet(ledger) {
  return new Set(ledger.usedIds);
}

/**
 * @param {QuestionLedger} ledger
 * @param {Record<string, unknown>} question
 * @param {string} [questionId]
 * @returns {boolean}
 */
export function isBannedInLedger(ledger, question, questionId) {
  return ledger.bans.questions.some((b) => isBannedRecord(b, question, questionId));
}

/**
 * Apply deltas from browser sync.
 * @param {QuestionLedger} ledger
 * @param {{ usedIds?: string[], bans?: { questions: unknown[] } }} delta
 * @returns {QuestionLedger}
 */
export function applyLedgerDelta(ledger, delta) {
  const next = normalizeLedger(ledger);
  if (delta.usedIds) {
    const set = new Set(next.usedIds);
    delta.usedIds.forEach((id) => set.add(id));
    next.usedIds = [...set];
  }
  if (delta.bans?.questions) {
    next.bans = {
      questions: delta.bans.questions,
      lastUpdated: new Date().toISOString(),
    };
  }
  return next;
}
