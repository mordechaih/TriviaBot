/**
 * Themed pool file routing — single map for generator append paths and browser replacement.
 */

import { SUBTYPES } from './round-subtypes.js';

/** @type {Record<string, string>} */
export const POOL_BY_ROUND_TYPE = Object.freeze({
  'over-under': 'over-under-questions.json',
  'list-round': 'list-round-questions.json',
});

/**
 * @param {string} roundType
 * @param {string|null} [subType]
 * @returns {string|null}
 */
export function poolFileFor(roundType, subType = null) {
  if (roundType === 'over-under') return POOL_BY_ROUND_TYPE['over-under'];
  if (roundType === 'list-round') return POOL_BY_ROUND_TYPE['list-round'];
  if (roundType === 'game-show-style' && subType) return `${subType}-questions.json`;
  if (roundType === 'mixing-things-up' && subType) return `${subType}-questions.json`;
  return null;
}

/**
 * Browser-facing map (legacy shape preserved for game-display).
 * @returns {Record<string, string | Record<string, string>>}
 */
export function poolFilesMap() {
  const gameShow = Object.fromEntries(SUBTYPES[5].map((s) => [s, `${s}-questions.json`]));
  const mixing = Object.fromEntries(SUBTYPES[7].map((s) => [s, `${s}-questions.json`]));
  return {
    'over-under': POOL_BY_ROUND_TYPE['over-under'],
    'game-show-style': gameShow,
    'mixing-things-up': mixing,
  };
}

/**
 * @param {string} roundType
 * @param {string|null} subType
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown>|null}
 */
export function normalizePoolQuestion(roundType, subType, raw) {
  if (!raw) return null;
  if (subType === 'family-feud') {
    const clue = raw.question ?? raw.clue;
    const answer = raw.topAnswers?.[0]?.answer ?? raw.answer;
    if (!clue || !answer) return null;
    return {
      clue,
      answer,
      topAnswers: raw.topAnswers || [],
      category: raw.category || 'Family Feud',
      id: raw.id,
    };
  }
  if (roundType === 'over-under') {
    const actual = typeof raw.actualNumber === 'number' ? raw.actualNumber : Number(raw.answer) || 0;
    const target = typeof raw.targetNumber === 'number' ? raw.targetNumber : actual;
    return {
      clue: raw.clue,
      answer: String(raw.answer ?? actual),
      actualNumber: actual,
      targetNumber: target,
      overOrUnder: raw.overOrUnder ?? (actual > target ? 'Over' : 'Under'),
    };
  }
  if (roundType === 'list-round') {
    if (!raw.clue || !Array.isArray(raw.answers) || raw.answers.length < 2) return null;
    return {
      clue: raw.clue,
      answers: raw.answers,
      pointsAvailable: raw.answers.length,
    };
  }
  const answer = raw.answer ?? raw.correctAnswer;
  if (!raw.clue || !answer) return null;
  const out = {
    clue: raw.clue,
    answer,
    category: raw.category,
    explanation: raw.explanation,
    details: raw.details,
    league: raw.league,
  };
  if (raw.options) out.options = raw.options;
  if (raw.correctAnswer) out.correctAnswer = raw.correctAnswer;
  return out;
}
