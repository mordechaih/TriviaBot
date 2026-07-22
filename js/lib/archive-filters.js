import { ENTERTAINMENT_KEYWORDS } from '../../shared/question-filters.js';

/**
 * Browser-side entertainment filter (shared keywords).
 * @param {Array<Record<string, unknown>>} archive
 */
export function filterEntertainmentArchive(archive) {
  const lower = (s) => (s || '').toLowerCase();
  return archive.filter((q) => {
    const cat = lower(String(q.category || ''));
    const clue = lower(String(q.clue || ''));
    return ENTERTAINMENT_KEYWORDS.some((kw) => cat.includes(kw) || clue.includes(kw));
  });
}
