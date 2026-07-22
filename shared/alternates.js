/**
 * Precomputed alternate question sets per round (stored on game JSON).
 */

const DEFAULT_ALTERNATE_SETS = 2;

/**
 * @param {object} game
 * @param {Record<number, Array<Array<Record<string, unknown>>>>} alternatesByRound
 */
export function attachAlternates(game, alternatesByRound) {
  if (!game || !alternatesByRound) return game;
  game.alternates = alternatesByRound;
  return game;
}

/**
 * Consume the next alternate set for a round (mutates game.alternates).
 * @param {object} game
 * @param {number} roundNumber
 * @returns {Array<Record<string, unknown>>|null}
 */
export function consumeAlternateSet(game, roundNumber) {
  const key = String(roundNumber);
  const sets = game?.alternates?.[key] || game?.alternates?.[roundNumber];
  if (!Array.isArray(sets) || sets.length === 0) return null;
  const next = sets.shift();
  return Array.isArray(next) ? next.map((q) => ({ ...q, isBanned: false })) : null;
}

/**
 * @param {object} game
 * @param {number} roundNumber
 * @returns {boolean}
 */
export function hasAlternates(game, roundNumber) {
  const key = String(roundNumber);
  const sets = game?.alternates?.[key] || game?.alternates?.[roundNumber];
  return Array.isArray(sets) && sets.length > 0;
}

export { DEFAULT_ALTERNATE_SETS };
