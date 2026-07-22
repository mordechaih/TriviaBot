/**
 * Canonical question ID helpers. One place for archive, list, LLM, and Family Feud IDs.
 */

export const ID_PREFIX = Object.freeze({
  archive: '',
  list: 'list:',
  overUnder: 'over-under:',
  gameShow: 'game-show:',
  familyFeud: 'ff:',
  mixing: 'mixing:',
});

/**
 * @param {{ clue?: string, answer?: string, question?: string, id?: string }} question
 * @param {{ roundType?: string, roundNumber?: number, subType?: string|null }} context
 * @returns {string}
 */
export function makeQuestionId(question, context = {}) {
  const clue = question.clue ?? question.question ?? '';
  const answer = question.answer ?? question.correctAnswer ?? '';

  if (context.roundType === 'list-round' || context.source === 'list-round') {
    return `${ID_PREFIX.list}${clue}`;
  }

  if (context.subType === 'family-feud' && question.id) {
    return `${ID_PREFIX.familyFeud}${question.id}`;
  }

  if (context.roundNumber === 2 || context.roundType === 'over-under') {
    return `${ID_PREFIX.overUnder}${clue}|${answer}`;
  }

  if (context.roundNumber === 5 || context.roundType === 'game-show-style') {
    const sub = context.subType || 'unknown';
    if (context.subType === 'family-feud' && question.id) {
      return `${ID_PREFIX.familyFeud}${question.id}`;
    }
    return `${ID_PREFIX.gameShow}${sub}:${clue}|${answer}`;
  }

  if (context.roundNumber === 7 || context.roundType === 'mixing-things-up') {
    const sub = context.subType || 'unknown';
    return `${ID_PREFIX.mixing}${sub}:${clue}|${answer}`;
  }

  return `${clue}|${answer}`;
}

/**
 * @param {string} id
 * @returns {boolean}
 */
export function isUsedIdMatch(storedId, candidateId) {
  if (!storedId || !candidateId) return false;
  if (storedId === candidateId) return true;
  // Legacy: bare clue|answer matches archive id
  if (!storedId.includes(':') && storedId === candidateId) return true;
  return false;
}

/**
 * @param {{ clue?: string, answer?: string, questionId?: string }} banned
 * @param {{ clue?: string, answer?: string, question?: string }} question
 * @param {string} [questionId]
 * @returns {boolean}
 */
export function isBannedRecord(banned, question, questionId) {
  const clue = question.clue ?? question.question ?? '';
  const answer = question.answer ?? question.correctAnswer ?? '';
  const id = questionId ?? `${clue}|${answer}`;
  if (banned.questionId && banned.questionId === id) return true;
  if (banned.questionId && questionId && banned.questionId === questionId) return true;
  if (banned.clue === clue && (banned.answer === answer || !banned.answer)) return true;
  return false;
}
