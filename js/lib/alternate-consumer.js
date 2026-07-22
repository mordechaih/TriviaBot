/**
 * Consume precomputed alternates from game JSON (browser).
 */

import { consumeAlternateSet, hasAlternates } from '../../shared/alternates.js';
import { persistGameToStorage } from './storage.js';

export { hasAlternates };

/**
 * Replace a round's questions with the next alternate set, if available.
 * @param {object} game
 * @param {number} roundNumber
 * @returns {{ questions: Array<Record<string, unknown>> }|null}
 */
export function takeAlternateRound(game, roundNumber) {
  const questions = consumeAlternateSet(game, roundNumber);
  if (!questions?.length) return null;
  const round = game.rounds?.find((r) => r.roundNumber === roundNumber);
  if (!round) return null;
  round.questions = questions;
  persistGameToStorage(game);
  return { questions };
}
