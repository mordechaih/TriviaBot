/**
 * Played-status normalization (version 2 canonical schema).
 */

export const PLAYED_STATUS_KEY = 'triviabot-played-status';
export const PLAYED_STATUS_VERSION = 2;

/**
 * @typedef {Object} PlayedStatusV2
 * @property {number} version
 * @property {Record<string, { played: boolean, playedDate?: string }>} games
 */

/**
 * @param {unknown} raw
 * @returns {PlayedStatusV2}
 */
export function normalizePlayedStatus(raw) {
  if (!raw || typeof raw !== 'object') {
    return { version: PLAYED_STATUS_VERSION, games: {} };
  }

  /** @type {Record<string, unknown>} */
  const obj = raw;

  if (obj.games && typeof obj.games === 'object') {
    return {
      version: PLAYED_STATUS_VERSION,
      games: { .../** @type {Record<string, { played: boolean, playedDate?: string }>} */ (obj.games) },
    };
  }

  // Legacy flat: { "game-2026-01-20": true }
  const games = {};
  for (const [gameId, value] of Object.entries(obj)) {
    if (gameId === 'version') continue;
    if (typeof value === 'boolean') {
      games[gameId] = { played: value, playedDate: undefined };
    } else if (value && typeof value === 'object' && 'played' in value) {
      games[gameId] = /** @type {{ played: boolean, playedDate?: string }} */ (value);
    }
  }
  return { version: PLAYED_STATUS_VERSION, games };
}

/**
 * @param {PlayedStatusV2} status
 * @param {string} gameId
 * @returns {boolean}
 */
export function isGamePlayed(status, gameId) {
  return status.games[gameId]?.played === true;
}

/**
 * @param {PlayedStatusV2} status
 * @param {string} gameId
 * @returns {PlayedStatusV2}
 */
export function markGamePlayed(status, gameId) {
  return {
    ...status,
    version: PLAYED_STATUS_VERSION,
    games: {
      ...status.games,
      [gameId]: { played: true, playedDate: new Date().toISOString() },
    },
  };
}
