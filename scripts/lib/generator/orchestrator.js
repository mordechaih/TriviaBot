/**
 * Game generation orchestration helpers.
 */
import { DEFAULT_ALTERNATE_SETS } from '../../../shared/alternates.js';
import { DIRECT_STRATEGY_ROUNDS, selectArchiveAlternateSet } from './archive-lane.js';

export { DIRECT_STRATEGY_ROUNDS };

/** Archive rounds selected directly (excluding list + entertainment). */
export const ARCHIVE_SELECTION_ROUND_COUNT = 8 - DIRECT_STRATEGY_ROUNDS.size;

/**
 * Precompute alternate question sets per round for ban/shuffle in the browser.
 * @param {object} params
 * @param {Array<Record<string, unknown>>} params.archive
 * @param {Array<{ roundNumber: number, roundType: string, questions?: unknown[] }>} params.rounds
 * @param {Set<string>} params.usedQuestions
 * @param {Array<Record<string, unknown>>} params.bannedQuestions
 * @param {{ selectListRoundQuestion: Function, selectEntertainmentQuestions: Function }} params.poolLane
 */
export function buildRoundAlternates({
  archive,
  rounds,
  usedQuestions,
  bannedQuestions,
  poolLane,
}) {
  /** @type {Record<number, Array<Array<Record<string, unknown>>>>} */
  const alternates = {};

  for (const round of rounds) {
    const n = round.roundNumber;
    const sets = [];

    for (let i = 0; i < DEFAULT_ALTERNATE_SETS; i++) {
      if (round.roundType === 'list-round') {
        const alt = poolLane.selectListRoundQuestion(usedQuestions, bannedQuestions);
        if (!alt) break;
        sets.push([{
          clue: alt.clue,
          answers: alt.answers,
          pointsAvailable: alt.pointsAvailable,
          isBanned: false,
        }]);
        usedQuestions.add(alt.questionId);
      } else if (round.roundType === 'entertainment-trivia') {
        const altQs = poolLane.selectEntertainmentQuestions(archive, usedQuestions, bannedQuestions, 3);
        if (altQs.length < 3) break;
        altQs.forEach((q) => usedQuestions.add(`${q.clue}|${q.answer}`));
        sets.push(altQs.map((q) => ({ ...q, isBanned: false })));
      } else if (Array.isArray(round.questions) && round.questions.length === 3) {
        const altQs = selectArchiveAlternateSet(archive, usedQuestions, bannedQuestions, 3);
        if (altQs.length < 3) break;
        altQs.forEach((q) => usedQuestions.add(`${q.clue}|${q.answer}`));
        sets.push(altQs);
      }
    }

    if (sets.length) alternates[n] = sets;
  }

  return alternates;
}
