# Round Generation Review Page Design

## Goal

Provide a static, implementation-backed review page for TriviaBot's weekly
generation pipeline. The page documents how every round obtains questions,
filters candidates, targets difficulty, selects subtypes, avoids reuse, falls
back on failure, and serializes output. A reviewer can record requested
generation changes and export a Markdown report for implementation work.

The page describes the generator as it exists; it is not a game-play view.

## Architecture

- `shared/round-definitions.js` is the canonical review-data source. Its
  immutable `ROUND_DEFINITIONS` and `FINAL_TRIVIA_DEFINITION` pair legacy round
  configuration with descriptive `generation` metadata. `ROUND_TEMPLATES` is
  derived from those definitions for existing generator and display consumers.
- `round-review.html` provides the semantic shell, controls, and page-level
  loading of `css/round-review.css` and `js/round-review.js`.
- `js/round-review.js` renders all definition cards with safe DOM APIs,
  persists comments in browser storage, and invokes report export.
- `js/lib/round-feedback.js` is a DOM-free module for feedback-state parsing
  and Markdown report serialization. Node tests import it directly.
- `css/round-review.css` supplies responsive review-page layout and visual
  hierarchy on top of `css/styles.css`.

The review metadata is descriptive only. Generation remains in
`scripts/generate-game.js`; the page must never mutate generated games,
question pools, used-question files, or bans.

## Generation Metadata Contract

Each definition has a stable ID (`round-1` through `round-8` or
`final-trivia`) and a `generation` object containing:

- `summary`: concise description of the active path and replacement behavior.
- `flow`: ordered, labeled stages shown as source-to-output blocks.
- `source`: source datasets, archive records, few-shot examples, or live LLM
  prompt inputs.
- `selection`: candidate selection, archive-slot replacement, subtype choice,
  and reuse-history rules.
- `difficulty`: value-band calculation or prompt/pool calibration, including
  any known mismatch between legacy configuration and emitted data.
- `grouping`: category, game, league, subtype, or non-grouping behavior.
- `llm`: model usage, prompt mode, example selection, error behavior, and
  genuine fallback paths.
- `filtering`: used-ID, banned-ID, static exclusion, suitability-cache, and
  post-generation validation behavior.
- `output`: emitted object fields and expected item count.
- `risks`: explicit exhaustion, short-output, validation, cache, and fallback
  gaps.
- `touchpoints`: generator functions and data files an implementation change
  must inspect.

The model freezes nested metadata so the rendered review cannot alter the
canonical descriptions.

## Generation Paths Under Review

### Shared archive selection: rounds 1, 3, and 8

`selectQuestions()` loads `data/archive-backup.json`, merges used IDs from
`data/used-questions.json` and `data/used-questions-ui.json`, and merges bans
from the corresponding main/UI ban files. The main pool excludes used and
banned records, Final Jeopardy, incomplete clues, and Before & After categories.
The merged used-question ledgers are the reuse record: matching IDs are
excluded from selection.

When OpenAI is available, it reviews a capped candidate sample with cached
decisions in `data/disqualify-cache.json`; otherwise basic pattern checks run.
`gpt-4o-mini` only disqualifies context-dependent archive clues and optionally
rewrites accepted clues. Suitability errors fail open.

The selector reserves 24 generic archive clues before themed rounds replace
their own slices. It prefers three clues from the same category and game at the
target difficulty, then relaxes grouping and neighboring difficulty bands as a
fallback. The generic selectors use these slices:

- Round 1: positions 0–2, `easy`.
- Round 3: positions 6–8, actually `medium`; this differs from the legacy
  round-template difficulty.
- Round 8: positions 21–23, actually `hard`; this differs from the legacy
  round-template difficulty.

Each emitted question has `clue`, `answer`, `category`, and `isBanned: false`.
Exhausted main pools, weaker fallback grouping, and cached or fail-open
suitability decisions are review risks.

### Round 2: Over/Under

Round 2 uses `generateOverUnderRound()` and a live `gpt-4o-mini` JSON request.
Up to three random examples from `data/llm-train/round2.jsonl` are supplied by
`buildFewShotBlock()`. Existing generated IDs with the `over-under:` prefix are
included in a do-not-repeat prompt section. Successful output is appended to
`data/over-under-questions.json`, but that file is not a generation fallback.

Difficulty and numeric distance are prompt constraints, not response-validated
rules. Bans and the disqualification cache do not filter model output. The
generator requires at least three valid-looking records and emits the first
three as `clue`, string `answer`, numeric `actualNumber`, numeric
`targetNumber`, derived `overOrUnder`, and `isBanned: false`. Missing API
access, API/JSON errors, or short output return `null`; no archive or pool
fallback exists. The already-reserved archive slice remains marked used after
replacement.

### Round 4: List Round

Round 4 reads `data/list-round-questions.json`, retaining only records with a
clue and at least two answers. `selectListRoundQuestion()` removes used
`list:<clue>` IDs and matching merged bans, then randomly selects a remaining
record. It emits one object with `clue`, `answers`, `pointsAvailable`, and
`isBanned: false`.

The pool receives neither archive suitability filtering nor LLM review. It has
no automatic difficulty calibration. Exhaustion stops generation, and the
common 24-clue archive preselection must still complete first. Unlike LLM
replacement rounds, its discarded generic archive IDs are removed from used
tracking.

### Round 5: Game Show Style

`scripts/lib/round-subtypes.js` defines the four round-5 subtypes. The
generator scans up to eight recent `data/games/game-*.json` files, excludes the
regenerated game, and randomly prefers a subtype not seen in that window. If
all subtypes are recent, all are eligible.

Family Feud selects an unused `ff:<id>` record from
`data/family-feud-questions.json`; an empty pool changes the subtype to the To
Tell the Truth LLM path. Other subtypes use subtype-specific
`gpt-4o-mini` prompts, exact-subtype few-shot records from
`data/llm-train/round5.jsonl`, JSON-object mode, and temperature 0.8. Generated
output is appended to themed pool files but those pools are not initial
generation sources. `generateGame()` still requires an OpenAI client before
this round is reached, even for a populated Family Feud pool.

Reuse exclusion for LLM variants is prompt-only (`game-show:<subtype>:` IDs);
bans and the suitability cache are not applied. Family Feud lookup IDs and
emitted used IDs differ, so a record can become eligible again. Non-pool LLM
arrays are not count-validated. These details, plus the retained reserved
archive IDs, are explicit risks.

### Round 6: Entertainment Trivia

Round 6 scans the raw archive again with `ENTERTAINMENT_KEYWORDS`, excludes
merged used IDs and bans, shuffles all matches, and emits the first three
records. It bypasses the common archive selector's incomplete-clue,
Before & After, suitability-cache, rewrite, difficulty, and same-category
checks. The three generic archive IDs replaced by this path are removed from
used tracking.

This path emits `clue`, `answer`, `category`, and `isBanned: false`. Its main
risks are insufficient unused matches, false positives from broad substring
matches, incomplete documented topic coverage, and uneven or unsuitable output.

### Round 7: Mixing Things Up

Round 7 follows the same up-to-eight-game subtype-avoidance algorithm as round
5 using its own subtype family in `scripts/lib/round-subtypes.js`. It selects
up to three matching few-shot examples from `data/llm-train/round7.jsonl`,
sends a subtype-specific `gpt-4o-mini` JSON prompt at temperature 0.8, and
includes existing `mixing:<subtype>:` IDs as prompt-only exclusions.

The model is expected to produce three `clue`/`answer` objects; Size Matters
may include `details`, and Name That Sports Team may include `league`. The
same-league request is a prompt constraint, not validation. There is no
initial pool fallback, no banned or suitability-cache filtering, and no
response count validation. Failed generation stops the game and leaves the
reserved generic IDs used.

### Final Trivia

Final Trivia selects one unused Final Jeopardy record from the archive through
a separate suitability path. With OpenAI it samples a capped pool, applies the
shared cached suitability/rewrite pass, and randomly selects an accepted
record. Without OpenAI it uses basic pattern checks. Final records use merged
used IDs but do not apply merged bans in their initial pool.

Output is `finalTrivia` with `category`, `question` (renamed from the archive
clue), `answer`, and `isBanned: false`. An empty final pool, omitted bans, and
cached/fail-open suitability outcomes are reportable risks.

## Review Interface and Feedback

The page first renders an overall generation-flow diagram from shared
descriptive metadata. It follows shared source and history loading into three
responsive lanes: archive selection for rounds 1, 3, 6, 8, and Final Trivia;
the curated list source for round 4; and parallel themed generation for rounds
2, 5, and 7, including the Round 5 Family Feud pool branch. The lanes converge
at eight-round-plus-Final assembly and the game, used-question, and themed-pool
output artifacts. A successful run immediately reserves every emitted archive,
curated, and generated question ID in `data/used-questions.json` before
`generateGame()` returns.

The diagram accompanies one card for every definition and the linked sticky
navigation rail. Each card presents the per-round generation flow, subtype
chips when relevant, source, selection, difficulty, grouping, LLM/fallback,
filtering/reuse, output, risks, and implementation touchpoints. It has one
labeled free-text field for requesting a generation change.

Feedback state uses schema version `1` under the existing key
`triviabot-round-structure-feedback-v1`:

```json
{
  "schemaVersion": 1,
  "updatedAt": "ISO-8601 timestamp",
  "comments": { "round-2": "Validate numeric targets" },
  "overall": "Apply bans to every generated path"
}
```

`js/round-review.js` loads state defensively, debounces writes by 100 ms, marks
commented sections in navigation, and keeps the current session usable if
storage fails. Clear requires confirmation and removes the stored state.

## Generation-Change Reports

`buildRoundReviewReport()` emits a Markdown document headed
`TriviaBot Round Generation Review`. It includes only commented round sections,
each with the current generation path, all metadata categories, risks,
touchpoints, and a block-quoted requested change. A non-empty overall field is
exported as Cross-round generation changes.

The page can preview, copy, or download the report as
`triviabot-round-generation-review-YYYY-MM-DD.md`. User input is assigned via
`textContent` in the UI and each report line is quoted, so feedback cannot
create report headings or HTML.

## Accessibility and Visual Quality

- Preserve the project's dark-only, content-first visual language.
- Use semantic navigation, headings, labels, buttons, and a live status region.
- Express the overall diagram as nested ordered lists and labeled lane sections
  so its full sequence and branch names remain available to screen readers.
- Keep every control keyboard reachable with visible focus treatment and
  minimum touch targets.
- Present round color as a supporting cue, never the only cue.
- Stack diagram lanes below desktop width and prevent diagram content from
  widening the page.
- Use responsive single-column layout and horizontally scrollable section
  navigation below 800 px.
- Limit transitions to restrained color/opacity changes and disable them for
  `prefers-reduced-motion`.

## Verification

- `scripts/round-definitions.test.js` verifies stable IDs, required generation
  metadata, genuine per-round paths and fallbacks, overall flow-lane coverage,
  semantic diagram scaffolding, canonical subtype arrays, and legacy
  `ROUND_TEMPLATES` compatibility.
- `scripts/round-feedback.test.js` verifies feedback parsing, schema handling,
  empty-comment omission, generation metadata in reports, deterministic
  timestamps, and quoted multiline feedback.
- Run `npm test` for the configured Node test suite.
- Manually open `/round-review.html` through `npm run dev` and verify all nine
  sections, autosave/restore, Copy, Download, Clear, keyboard order, responsive
  layout, and no report content for empty comments.

## Scope Boundaries

- No game presentation or answer-reveal behavior.
- No changes to generated game content from the browser.
- No server-side persistence, API submission, or automatic code changes.
- No game-specific review mode.
- No unrelated generator refactor beyond correcting the reviewed generation
  metadata and its associated tests.
