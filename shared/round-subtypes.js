/**
 * Canonical LLM round subtypes (rounds 5 and 7).
 * Shared by generator, ingest, round review, and browser UI.
 */

/** @type {Record<number, readonly string[]>} */
export const SUBTYPES = Object.freeze({
  5: Object.freeze(['to-tell-the-truth', 'name-that-tune', 'millionaire', 'family-feud']),
  7: Object.freeze(['who-am-i', 'size-matters', 'name-that-brand', 'name-that-sports-team']),
});

export const ALL_SUBTYPES = new Set([...SUBTYPES[5], ...SUBTYPES[7]]);

/** @type {Record<string, string>} */
export const SUBTYPE_LABELS = Object.freeze({
  'to-tell-the-truth': 'To Tell the Truth',
  'name-that-tune': 'Name That Tune',
  'millionaire': 'Millionaire',
  'family-feud': 'Family Feud',
  'who-am-i': 'Who Am I',
  'size-matters': 'Size Matters',
  'name-that-brand': 'Name That Brand',
  'name-that-sports-team': 'Name That Sports Team',
});

const MATCHERS = [
  { round: 5, subType: 'to-tell-the-truth', re: /to tell the truth|true\s*\/\s*false|true or false/i },
  { round: 5, subType: 'name-that-tune', re: /name that tune/i },
  { round: 5, subType: 'millionaire', re: /millionaire|who wants to be a/i },
  { round: 5, subType: 'family-feud', re: /family fe?ud/i },
  { round: 7, subType: 'who-am-i', re: /who am i/i },
  { round: 7, subType: 'size-matters', re: /size matters/i },
  { round: 7, subType: 'name-that-brand', re: /name that\b.*\bbrand|name that brand/i },
  { round: 7, subType: 'name-that-sports-team', re: /name that\b.*\bsports?\s*team|sports? team/i },
];

/**
 * @param {string} text
 * @param {number} roundNumber
 * @returns {string|null}
 */
export function matchSubType(text, roundNumber) {
  if (!text || (roundNumber !== 5 && roundNumber !== 7)) return null;
  for (const { round, subType, re } of MATCHERS) {
    if (round === roundNumber && re.test(text)) return subType;
  }
  return null;
}

/**
 * @param {string} subType
 * @param {number} roundNumber
 * @returns {boolean}
 */
export function isValidSubType(subType, roundNumber) {
  return SUBTYPES[roundNumber]?.includes(subType) ?? false;
}
