/**
 * Browser storage helpers (played status, bans, used, per-game overrides).
 */

import {
  normalizePlayedStatus,
  isGamePlayed as isPlayedInStatus,
  markGamePlayed,
  PLAYED_STATUS_KEY,
} from '../../shared/played-status.js';

export const STORAGE_KEYS = Object.freeze({
  played: PLAYED_STATUS_KEY,
  banned: 'triviabot-banned-questions',
  used: 'triviabot-used-questions',
  gamePrefix: 'triviabot-game-',
});

/**
 * @returns {import('../../shared/played-status.js').PlayedStatusV2}
 */
export function loadPlayedStatusFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.played);
    return normalizePlayedStatus(raw ? JSON.parse(raw) : {});
  } catch {
    return normalizePlayedStatus({});
  }
}

/**
 * @param {import('../../shared/played-status.js').PlayedStatusV2} status
 */
export function savePlayedStatusToStorage(status) {
  localStorage.setItem(STORAGE_KEYS.played, JSON.stringify(status));
}

/**
 * @param {string} gameId
 * @returns {boolean}
 */
export function isGamePlayedInStorage(gameId) {
  return isPlayedInStatus(loadPlayedStatusFromStorage(), gameId);
}

/**
 * @param {string} gameId
 */
export function markGamePlayedInStorage(gameId) {
  const next = markGamePlayed(loadPlayedStatusFromStorage(), gameId);
  savePlayedStatusToStorage(next);
  return next;
}

/**
 * @returns {Array<Record<string, unknown>>}
 */
export function loadBannedFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.banned);
    if (!stored) return [];
    const data = JSON.parse(stored);
    return data.questions || [];
  } catch {
    return [];
  }
}

/**
 * @param {Array<Record<string, unknown>>} questions
 */
export function saveBannedToStorage(questions) {
  localStorage.setItem(STORAGE_KEYS.banned, JSON.stringify({
    questions,
    lastUpdated: new Date().toISOString(),
  }));
}

/**
 * @returns {string[]}
 */
export function loadUsedIdsFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.used);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * @param {string[]} ids
 */
export function saveUsedIdsToStorage(ids) {
  localStorage.setItem(STORAGE_KEYS.used, JSON.stringify(ids));
}

/**
 * @param {string} gameId
 * @returns {object|null}
 */
export function loadPersistedGame(gameId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.gamePrefix}${gameId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * @param {object} game
 */
export function persistGameToStorage(game) {
  if (!game?.id) return;
  localStorage.setItem(`${STORAGE_KEYS.gamePrefix}${game.id}`, JSON.stringify(game));
}

/**
 * Sync bans + used to server API (best-effort).
 */
export function syncStateToServer() {
  const bannedPayload = {
    questions: loadBannedFromStorage(),
    lastUpdated: new Date().toISOString(),
  };
  const usedIds = loadUsedIdsFromStorage();

  localStorage.setItem('triviabot-banned-questions-export', JSON.stringify(bannedPayload, null, 2));
  localStorage.setItem('triviabot-used-questions-export', JSON.stringify(usedIds));

  fetch('/api/sync-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bannedQuestions: bannedPayload, usedQuestions: usedIds }),
  }).catch(() => {});
}
