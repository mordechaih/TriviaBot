---
name: trivia-question-quality
description: Best practices for writing, reviewing, vetting, and fact-checking pub-trivia questions, and for tuning the LLM trivia-generation prompts in this repo (scripts/generate-game.js, scripts/lib/question-quality.js). Use when writing or editing trivia questions; judging a question's difficulty, ambiguity, distractor quality, or factual accuracy; searching for alternate correct answers ("pinning"); vetting or fact-checking LLM-generated questions; or writing/tuning the generation or verification prompts. Triggers on trivia, quiz, pub trivia, question quality, distractors, multiple choice, fact-check, hallucination, ambiguous answer, giveaway clue.
---

# Trivia Question Quality

Guidance for producing pub-trivia questions that spark table debate and reward
genuine knowledge, and for keeping this repo's LLM generation honest.

## When to read the reference

Read `references/techniques.md` for the full technique library with source
attributions and the 18-point checklist. Read it when authoring the detailed
"why," resolving a tricky ambiguity/difficulty call, or changing the rule set.
For routine writing/vetting, the workflow below is enough.

## Writing a question

1. Fix the audience and target difficulty first. Aim for the "satisfying aha" —
   roughly a 50% correct rate, NOT gimmes. Judge difficulty **blind**, as if you
   could not see the answer.
2. Prefer second-tier, interesting facts over the first thing that comes to mind.
3. Write a clue that uniquely identifies the answer and matters to the subject.
   Do not let the clue reveal the answer (no wordplay, "sounds like", rhymes).
4. For multiple choice: write the correct answer, then layer distractors that
   are verifiably WRONG yet plausible enough to tempt a half-knower. No filler.

## Vetting a question (do this on every question, generated or hand-written)

1. **Pin the answer.** Actively search for other defensible answers. If any
   exist, add a qualifier to force a single answer, or pick a different fact.
   Reject questions that cannot be pinned.
2. **Fact-check.** Confirm the answer is true and would survive double-sourcing.
   Do not ship shaky or half-remembered facts. Assume the generator hallucinates.
3. **No giveaway.** Confirm the clue (and any media) does not reveal the answer.
4. **Distractors (MCQ).** Confirm none is a second correct answer and none is
   obvious filler.
5. **Difficulty & interest.** Re-judge blind; ensure it is not too obvious and
   not a repeat of an overused subject.

Prefer a single targeted rewrite over discarding a salvageable question; drop
only what is unsalvageable. Iterate with early stopping — don't tweak until you
revert.

## Where the automated rules live

The pipeline applies a condensed, machine-readable subset of these rules from
`scripts/lib/question-quality.js`:

- `QUALITY_SYSTEM_RULES` — appended to `TRIVIA_GENERATOR_SYSTEM_PROMPT` in
  `scripts/generate-game.js`, so every LLM round generation carries them.
- `verifyGeneratedQuestions(...)` — a low-temperature "detector" pass that flags
  and rewrites/drops questions with multiple defensible answers, likely-false
  facts, giveaway clues, or MCQ distractors that are actually correct. It fails
  open (returns input unchanged on any error or missing client).

**Verification is opt-in.** It runs only when `VERIFY_LLM_QUESTIONS=1`; the
default weekly run is unchanged (no extra API calls). Enable it with
`VERIFY_LLM_QUESTIONS=1 npm run generate`.

**Keep in sync:** when the rules here or in `references/techniques.md` change,
update `scripts/lib/question-quality.js` too (and vice versa). The reference doc
is the human "why"; the module is the token-budgeted subset the pipeline runs.

## Measuring whether the rules actually help

To judge question *quality* (not just that generation runs), use the A/B eval
`scripts/eval-question-quality.js` (`npm run eval-questions`). It generates each
LLM round twice — rules **off** (baseline) vs **on** (treatment) — then grades
both with an LLM judge (a blind-solve pass for difficulty + a checklist score)
and emits a blinded human-review sheet under `eval-output/`. It is a **dry run by
default** (prints the plan/cost); pass `--run` to spend API. The LLM judge is a
proxy — it shares the generator's model family and its blind spots — so treat the
blind human-review sheet as ground truth.
