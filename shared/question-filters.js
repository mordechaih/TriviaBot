/**
 * Archive and pool filtering shared by generator and browser fallbacks.
 */

import { isBannedRecord } from './question-ids.js';

export const ENTERTAINMENT_KEYWORDS = Object.freeze([
  'movie', 'film', 'cinema', 'tv', 'television', 'music', 'band', 'album', 'song', 'singer',
  'actor', 'actress', 'oscar', 'grammy', 'emmy', 'netflix', 'broadway', 'hollywood',
  'comedy', 'drama', 'sitcom', 'series', 'director', 'starring', 'soundtrack',
]);

/**
 * @param {string} clue
 * @returns {boolean}
 */
export function isClueIncomplete(clue) {
  if (!clue || typeof clue !== 'string') return true;
  const t = clue.trim();
  if (!t) return true;
  return /^\s*.*\s+(the|a|an)\s*$/i.test(t);
}

/**
 * @param {string} category
 * @returns {boolean}
 */
export function isBeforeAndAfterCategory(category) {
  if (!category || typeof category !== 'string') return false;
  const c = category.toLowerCase();
  return c.includes('before') && c.includes('after');
}

/**
 * @param {Array<Record<string, unknown>>} archive
 * @returns {Array<Record<string, unknown>>}
 */
export function filterEntertainment(archive) {
  const lower = (s) => (s || '').toLowerCase();
  return archive.filter((q) => {
    const cat = lower(String(q.category || ''));
    const clue = lower(String(q.clue || ''));
    return ENTERTAINMENT_KEYWORDS.some((kw) => cat.includes(kw) || clue.includes(kw));
  });
}

/**
 * @param {Record<string, unknown>} question
 * @param {Array<Record<string, unknown>>} bannedList
 * @returns {boolean}
 */
export function isQuestionBanned(question, bannedList) {
  return bannedList.some((banned) => isBannedRecord(banned, question));
}

/**
 * @param {string} clue
 * @param {Array<Record<string, unknown>>} bannedList
 * @returns {boolean}
 */
export function isListQuestionBanned(clue, bannedList) {
  const listId = `list:${clue}`;
  return bannedList.some((banned) => {
    if (banned.questionId === listId) return true;
    if (banned.questionId && String(banned.questionId).startsWith('list:') && banned.clue === clue) return true;
    if (banned.clue === clue && banned.source === 'list-round') return true;
    return false;
  });
}

/**
 * Fisher-Yates shuffle (injectable RNG for tests).
 * @template T
 * @param {T[]} arr
 * @param {() => number} [random]
 * @returns {T[]}
 */
export function shuffleArray(arr, random = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
