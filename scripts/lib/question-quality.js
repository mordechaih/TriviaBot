/**
 * Machine-applied trivia quality rules — the single source of truth that
 * generate-game.js prepends to every LLM call and (optionally) runs as a
 * post-generation verification pass.
 *
 * This is the condensed, token-budgeted counterpart to the human-readable
 * technique library at
 *   .claude/skills/trivia-question-quality/references/techniques.md
 * Keep the two in sync: when a rule changes here, update the reference doc
 * (and vice versa).
 *
 * The rules distill: one pinned correct answer (no alternate defensible
 * answers), plausible-but-verifiably-wrong distractors, fact discipline
 * (prefer double-sourced verifiable facts; never assert shaky ones), no
 * giveaways in the clue, difficulty judged blind, and a bias toward
 * interesting non-obvious answers.
 *
 * Everything here fails open: verifyGeneratedQuestions returns its input
 * unchanged on any error or when no OpenAI client is supplied.
 */

/**
 * Universal quality rules appended to the shared LLM system prompt. Every line
 * earns its tokens — this ships on every generation call.
 */
export const QUALITY_SYSTEM_RULES = `Quality rules (apply to every question):
- Exactly one correct answer. Before finalizing, actively search for other defensible answers; if any exist, add a qualifier to "pin" it to a single answer or pick a different fact.
- The clue must never reveal the answer. No wordplay, "sounds like", rhymes, or restating the answer — reward knowledge, not decoding.
- Fact discipline: assert only facts you are confident are true and would survive double-sourcing. Never state shaky, approximate, or half-remembered facts as certain.
- Multiple choice: every distractor must be verifiably WRONG yet plausible enough to tempt someone who half-knows the topic. A distractor must never be a second correct answer, and never obvious filler.
- Judge difficulty blind — as if you could not see the answer. Favor interesting, non-obvious answers over first-guess gimmes.
- Clues must uniquely identify the answer and matter to the subject; reject vague clues that fit many answers.`;

/**
 * Render a single question compactly for the checker prompt. Handles the
 * different LLM round shapes (over/under, true/false, multiple choice, plain
 * clue/answer) without assuming a fixed schema.
 */
function describeQuestion(q, index) {
  const lines = [`Question ${index}:`, `  clue: ${q.clue ?? ''}`];
  if (Array.isArray(q.options) && q.options.length > 0) {
    lines.push(`  options: ${q.options.join(' | ')}`);
  }
  if (q.correctAnswer != null) lines.push(`  correctAnswer: ${q.correctAnswer}`);
  if (q.answer != null) lines.push(`  answer: ${q.answer}`);
  if (q.actualNumber != null) lines.push(`  actualNumber: ${q.actualNumber}`);
  if (q.explanation) lines.push(`  explanation: ${q.explanation}`);
  if (q.details) lines.push(`  details: ${q.details}`);
  return lines.join('\n');
}

const VERIFY_SYSTEM_PROMPT = `You are a low-temperature fact-checker and quality gate for pub-trivia questions. You do NOT write new questions; you only evaluate the ones given and, when one is flawed, either flag it for dropping or supply a single minimal rewrite that keeps the same format and (where possible) the same answer.

Flag a question when ANY of these is true:
(a) more than one defensible correct answer exists (the answer is not "pinned");
(b) it contains a fact that is likely false or that you cannot confidently confirm;
(c) the clue gives the answer away (restates it, or relies on wordplay/"sounds like"/rhyme);
(d) for multiple choice, a listed distractor is actually a correct/defensible answer, or the distractors are obvious filler.

Prefer fixing over dropping: rewrite to resolve the issue while preserving the question's format and answer. Only recommend "drop" if the question is unsalvageable.`;

/**
 * Build the user prompt for one verification pass.
 */
function buildVerifyPrompt(questions, { roundLabel, subType }) {
  const header = `Round: ${roundLabel}${subType ? ` (subtype: ${subType})` : ''}\n` +
    `Evaluate the ${questions.length} question(s) below.`;
  const body = questions.map((q, i) => describeQuestion(q, i)).join('\n\n');
  const schema = `Return JSON: {"results": [{"index": <int>, "ok": <bool>, "issue": "<a|b|c|d|short reason>", "action": "keep"|"rewrite"|"drop", "revised": <full replacement question object in the SAME shape as the input, only when action is "rewrite">}]}.
Include one result per question. For "ok": true, use action "keep" and omit "revised". For "rewrite", "revised" must contain every field the original had (clue, answer/correctAnswer/options/actualNumber/targetNumber/explanation/details as applicable) with the flaw fixed.`;
  return `${header}\n\n${body}\n\n${schema}`;
}

/**
 * Merge a checker-supplied rewrite onto the original question, preserving any
 * fields the checker omitted (e.g. isBanned, questionId, over/under bookkeeping)
 * and never introducing an empty clue/answer.
 */
function applyRevision(original, revised) {
  if (!revised || typeof revised !== 'object') return original;
  const merged = { ...original };
  for (const [key, value] of Object.entries(revised)) {
    if (value == null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    merged[key] = value;
  }
  // A rewrite must still have a clue and an answer of some form.
  if (!merged.clue) return original;
  if (merged.answer == null && merged.correctAnswer == null && merged.actualNumber == null) {
    return original;
  }
  return merged;
}

/**
 * Lightweight, conservative version of the arXiv "Detector" pass.
 *
 * Runs a low-temperature checker call that flags questions with (a) more than
 * one defensible answer, (b) a likely-false fact, (c) a giveaway clue, or
 * (d) a multiple-choice distractor that is actually correct — then either drops
 * or applies a single targeted rewrite for each flagged item. Capped at a small
 * number of iterations with early stopping.
 *
 * FAILS OPEN: on any error, a missing client, or a non-array input it returns
 * the input unchanged.
 *
 * @param {Object[]} questions - Generated question objects (any LLM round shape)
 * @param {Object} opts
 * @param {Object} opts.openaiClient - OpenAI client (chat.completions.create)
 * @param {string} [opts.roundLabel] - Human label for logging/prompt context
 * @param {string} [opts.subType] - Round subtype, when applicable
 * @param {number} [opts.maxIterations=2] - Iteration cap (1-2 recommended)
 * @param {string} [opts.model='gpt-4o-mini'] - Checker model
 * @returns {Promise<Object[]>} Verified questions (possibly rewritten/dropped)
 */
export async function verifyGeneratedQuestions(questions, opts = {}) {
  const {
    openaiClient,
    roundLabel = 'LLM round',
    subType = null,
    maxIterations = 2,
    model = 'gpt-4o-mini'
  } = opts;

  if (!openaiClient || !Array.isArray(questions) || questions.length === 0) {
    return questions;
  }

  const cap = Math.max(1, Math.min(2, maxIterations));
  let current = questions.slice();
  let totalRewritten = 0;
  let totalDropped = 0;

  for (let iter = 0; iter < cap; iter++) {
    let results;
    try {
      const response = await openaiClient.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: VERIFY_SYSTEM_PROMPT },
          { role: 'user', content: buildVerifyPrompt(current, { roundLabel, subType }) }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      });
      const parsed = JSON.parse(response.choices[0].message.content);
      results = Array.isArray(parsed) ? parsed : (parsed.results || parsed.questions || []);
    } catch (error) {
      // Fail open: keep whatever we have so far.
      console.warn(`[verify:${roundLabel}] check failed, keeping questions as-is: ${error.message}`);
      return current;
    }

    if (!Array.isArray(results) || results.length === 0) {
      return current;
    }

    const byIndex = new Map();
    for (const r of results) {
      if (r && Number.isInteger(r.index)) byIndex.set(r.index, r);
    }

    const next = [];
    let changed = false;
    for (let i = 0; i < current.length; i++) {
      const verdict = byIndex.get(i);
      if (!verdict || verdict.ok === true || verdict.action === 'keep' || verdict.action == null) {
        next.push(current[i]);
        continue;
      }
      if (verdict.action === 'drop') {
        totalDropped++;
        changed = true;
        console.log(`[verify:${roundLabel}] dropped Q${i} (${verdict.issue || 'flagged'})`);
        continue;
      }
      if (verdict.action === 'rewrite') {
        const merged = applyRevision(current[i], verdict.revised);
        if (merged !== current[i]) {
          totalRewritten++;
          changed = true;
          console.log(`[verify:${roundLabel}] rewrote Q${i} (${verdict.issue || 'flagged'})`);
        }
        next.push(merged);
        continue;
      }
      // Unknown action — keep conservatively.
      next.push(current[i]);
    }

    current = next;

    // Early stop: nothing changed this pass, or everything was dropped.
    if (!changed || current.length === 0) break;
  }

  if (totalRewritten === 0 && totalDropped === 0) {
    console.log(`[verify:${roundLabel}] all ${questions.length} question(s) passed`);
  } else {
    console.log(`[verify:${roundLabel}] done: ${totalRewritten} rewritten, ${totalDropped} dropped, ${current.length} kept`);
  }

  return current;
}
