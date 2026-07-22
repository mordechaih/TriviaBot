/**
 * Archive selection lane — filters and picks standard Jeopardy clues.
 */
import {
  isBeforeAndAfterCategory,
  isClueIncomplete,
  isQuestionBanned,
} from '../../../shared/question-filters.js';

/** Rounds filled by dedicated strategies (list, entertainment), not archive placeholders. */
export const DIRECT_STRATEGY_ROUNDS = new Set([4, 6]);

/**
 * @param {Array<Record<string, unknown>>} archive
 * @param {Set<string>} usedQuestions
 * @param {Array<Record<string, unknown>>} bannedQuestions
 */
export function filterArchivePool(archive, usedQuestions, bannedQuestions) {
  return archive.filter((q) => {
    const questionId = `${q.clue}|${q.answer}`;
    if (usedQuestions.has(questionId)) return false;
    if (isQuestionBanned(q, bannedQuestions)) return false;
    if (q.round === 'Final Jeopardy') return false;
    if (isClueIncomplete(q.clue)) return false;
    if (isBeforeAndAfterCategory(q.category)) return false;
    return true;
  });
}

/**
 * Pick N alternate archive questions for shuffle/replace.
 * @param {Array<Record<string, unknown>>} archive
 * @param {Set<string>} usedQuestions
 * @param {Array<Record<string, unknown>>} bannedQuestions
 * @param {number} count
 */
export function selectArchiveAlternateSet(archive, usedQuestions, bannedQuestions, count = 3) {
  const pool = filterArchivePool(archive, usedQuestions, bannedQuestions);
  if (pool.length < count) return [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((q) => ({
    clue: q.clue,
    answer: q.answer,
    category: q.category,
    isBanned: false,
  }));
}
