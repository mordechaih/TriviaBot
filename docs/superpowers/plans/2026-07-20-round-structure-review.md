# Round Generation Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maintain a static review page that accurately exposes TriviaBot's
implemented weekly generation paths and exports implementation-ready
generation-change reports.

**Architecture:** `shared/round-definitions.js` holds immutable, descriptive
metadata next to the legacy round templates consumed by the generator and
display. The browser renders that metadata in `round-review.html`, while
`js/lib/round-feedback.js` safely persists reviewer notes and serializes the
subset of requested changes as Markdown. The generator remains the behavioral
source of truth; review metadata must be updated with any generator-path change.

**Tech Stack:** Static HTML/CSS, browser ES modules, Node.js 20 built-in test
runner, existing `localStorage`, Clipboard, and Blob APIs.

## Global Constraints

- Treat `scripts/generate-game.js` as the authority for runtime behavior.
- Document generation sources, filtering, difficulty, subtypes, reuse, fallback,
  outputs, risks, and touchpoints—not game-play behavior.
- Preserve `ROUND_TEMPLATES` compatibility for existing generator and display
  consumers.
- Keep the review page dark-only, minimal, keyboard accessible, and responsive.
- Add no dependencies.
- Store feedback locally only; never mutate games, pools, used IDs, bans, or
  generator settings from the browser.
- Use safe DOM APIs (`textContent` and `document.createElement`) for all
  definition and feedback text.
- Do not stage, commit, or modify files outside the targeted change.

---

## Current File Map

- `scripts/generate-game.js` — actual selection, LLM, pool, fallback, and game
  serialization behavior.
- `scripts/lib/round-subtypes.js` — canonical subtype lists and display labels
  for rounds 5 and 7.
- `scripts/lib/few-shot-examples.js` — round/subtype-scoped few-shot selection.
- `shared/round-definitions.js` — immutable review descriptors plus derived
  `ROUND_TEMPLATES`.
- `round-review.html` — semantic page shell and review controls.
- `js/round-review.js` — card rendering, browser persistence, and report UI.
- `js/lib/round-feedback.js` — DOM-free feedback parsing and report builder.
- `css/round-review.css` — page layout and responsive/accessibility styling.
- `scripts/round-definitions.test.js` — metadata and known-generation-path
  regression tests.
- `scripts/round-feedback.test.js` — feedback parsing and Markdown report tests.
- `package.json` — includes both review tests in `npm test`.

## Task 1: Keep Generation Descriptors Synchronized

**Files:**
- Modify: `shared/round-definitions.js`
- Modify: `scripts/round-definitions.test.js`
- Inspect: `scripts/generate-game.js`
- Inspect: `scripts/lib/round-subtypes.js`
- Inspect: `scripts/lib/few-shot-examples.js`

**Interfaces:**
- Consumes: the active generator functions, data-file paths, subtype lists, and
  output shapes.
- Produces: frozen `ROUND_DEFINITIONS` and `FINAL_TRIVIA_DEFINITION`
  `generation` descriptors consumed by the review page and report builder.

- [ ] **Step 1: Map the affected generator path before editing metadata**

Read the named generator function and identify the exact source files,
used/banned keys, candidate filters, selection/randomization, difficulty
calculation, LLM settings, fallback branch, emitted fields, and failure return.
For subtype work, also inspect the matching `SUBTYPES` entry and few-shot
selection call.

Do not infer behavior from the UI or legacy template instructions. Record only
conditions the generator currently executes.

- [ ] **Step 2: Write or adjust a focused regression assertion**

Update `scripts/round-definitions.test.js` before changing the descriptor. Keep
the test specific to the changed contract. For example, a new fallback for
round 2 needs assertions for both the source and risk text:

```js
const round2 = ROUND_DEFINITIONS.find((definition) => definition.number === 2);
assert.match(round2.generation.source, /data\/over-under-questions\.json/);
assert.doesNotMatch(
  round2.generation.risks.join(' '),
  /no generic archive or pool fallback/i,
);
```

Run:

```bash
node --test scripts/round-definitions.test.js
```

Expected before the descriptor update: the new assertion fails if the prior
description is still present.

- [ ] **Step 3: Update the complete descriptor, not one label**

For the affected definition in `shared/round-definitions.js`, update every
generation field influenced by the behavioral change:

```js
generation: freezeGeneration({
  summary: '...',
  flow: [
    { label: 'Load', text: '...' },
    { label: 'Filter', text: '...' },
    { label: 'Select', text: '...' },
    { label: 'Emit', text: '...' },
  ],
  source: '...',
  selection: '...',
  difficulty: '...',
  grouping: '...',
  llm: '...',
  filtering: '...',
  output: '...',
  risks: ['...'],
  touchpoints: [{ path: 'scripts/generate-game.js', symbols: ['...'] }],
}),
```

Keep paths and symbol names exact. When a behavior is absent—for example,
post-generation ban checks—state that absence explicitly in `filtering` and
capture the consequence in `risks`.

- [ ] **Step 4: Preserve common-path distinctions**

Verify the following real differences remain described rather than flattened
into a generic archive narrative:

- Rounds 1, 3, and 8 use the common archive selector, but rounds 3 and 8 have
  emitted difficulty targets that differ from legacy template difficulty.
- Round 2 uses live LLM output, has prompt-only reuse avoidance, appends to a
  pool, and has no fallback pool.
- Round 4 is a curated list-pool selection with used/banned exclusion and
  removes its discarded archive IDs from used tracking.
- Round 5 selects from recent subtype history, can select Family Feud from a
  pool, routes empty Family Feud pools to To Tell the Truth, but is still
  globally gated by OpenAI availability.
- Round 6 does a second raw-archive keyword scan, bypassing common suitability
  and grouping checks.
- Round 7 uses LLM generation and subtype-specific examples without a pool
  fallback or response-count validation.
- Final Trivia has its own Final Jeopardy path and omits bans from initial
  candidate selection.
- Archive and curated selectors exclude IDs from the merged used-question
  ledgers; themed LLM paths use matching prefixed IDs as prompt constraints.
  Every emitted archive, curated, or generated question ID is reserved in the
  main ledger before a successful `generateGame()` call returns.

- [ ] **Step 5: Run the descriptor regression suite**

Run:

```bash
node --test scripts/round-definitions.test.js
```

Expected: all tests pass, including metadata completeness, genuine path,
subtype, and legacy-template compatibility tests.

## Task 2: Preserve Data-Driven Review Rendering

**Files:**
- Modify: `round-review.html`
- Modify: `js/round-review.js`
- Modify: `css/round-review.css`
- Inspect: `shared/round-definitions.js`

**Interfaces:**
- Consumes: `ROUND_DEFINITIONS`, `FINAL_TRIVIA_DEFINITION`, and
  `SUBTYPE_LABELS`.
- Produces: nine accessible generation-review cards and matching section links.

- [ ] **Step 1: Keep the page shell generation-focused**

`round-review.html` must retain:

- a clear “Round Generation Review” title and concise technical intro;
- `#section-nav-list` and `#round-guide` render targets;
- one cross-round generation-change textarea;
- Generate Report, Copy, Download, and Clear controls;
- an `aria-live` status element and a hidden report-preview section.

Do not add representative game questions, answer-reveal controls, or other
game-play copy.

- [ ] **Step 2: Render the full descriptor contract**

In `createRoundCard()` of `js/round-review.js`, retain all generation data as
visible text:

```js
const detailItems = [
  ['Source & inputs', definition.generation.source],
  ['Selection pipeline', definition.generation.selection],
  ['Difficulty calibration', definition.generation.difficulty],
  ['Grouping rules', definition.generation.grouping],
  ['LLM & fallback', definition.generation.llm],
  ['Filtering & reuse', definition.generation.filtering],
  ['Output shape', definition.generation.output],
];
```

Render `flow`, subtype chips, `risks`, and `touchpoints` from the definition.
Use `textContent` for every value and build repeated content in
`DocumentFragment`s.

- [ ] **Step 3: Keep navigation and comments coherent**

The navigation ID must come from `definition.id`, and the text area ID must be
`${definition.id}-comment`. On input, update the matching feedback comment,
toggle the navigation marker based on trimmed content, schedule a persisted
save, and invalidate the stale report.

The cross-round field must capture only changes that affect shared sources,
filters, difficulty calibration, reuse policy, prompts, subtype policy, or
fallbacks.

- [ ] **Step 4: Verify responsive and accessible presentation**

Confirm `css/round-review.css` retains:

- desktop sticky navigation and two-column layout;
- horizontally scrollable navigation plus one-column cards below 800 px;
- non-color labels for LLM and source paths;
- visible `:focus-visible` outlines and minimum interactive sizes;
- no layout animation; reduced-motion transition removal.

- [ ] **Step 5: Manually smoke-test rendering**

Run:

```bash
npm run dev
```

Open `http://localhost:3000/round-review.html`. Confirm every round plus Final
Trivia renders, subtype chips occur only where definitions contain subtypes,
cards describe no game-play mechanics, and no content overflows at 390 px, 768
px, or 1440 px.

## Task 3: Keep Feedback and Generation-Change Reports Safe

**Files:**
- Modify: `js/lib/round-feedback.js`
- Modify: `js/round-review.js`
- Modify: `scripts/round-feedback.test.js`

**Interfaces:**
- Consumes: a versioned browser payload and generation descriptors.
- Produces: a defensive `FeedbackState` and a deterministic Markdown report.
- Persists: `triviabot-round-structure-feedback-v1`.

- [ ] **Step 1: Add a failing test for each changed report behavior**

Use the actual public functions:

```js
import {
  buildRoundReviewReport,
  createEmptyFeedback,
  parseFeedback,
} from '../js/lib/round-feedback.js';
```

Cover malformed JSON and unsupported schema versions with
`createEmptyFeedback()`. For report changes, pass a fixed timestamp and assert
the affected generation field, touchpoint, omitted empty comments, and
block-quoted multiline feedback.

Run:

```bash
node --test scripts/round-feedback.test.js
```

Expected before the implementation change: the added behavioral assertion
fails.

- [ ] **Step 2: Preserve defensive state parsing**

`parseFeedback(raw)` must only accept `FEEDBACK_SCHEMA_VERSION`, string comment
values keyed by non-empty trimmed IDs, an optional string timestamp, and a
string `overall` value. Any malformed, mismatched, or non-object value returns a
fresh state without throwing.

- [ ] **Step 3: Serialize only implementation-relevant report sections**

`buildRoundReviewReport()` must:

1. begin with `# TriviaBot Round Generation Review`, fixed generated timestamp,
   and schema version;
2. iterate `ROUND_DEFINITIONS` followed by `FINAL_TRIVIA_DEFINITION`;
3. omit blank comments;
4. include current source, selection, difficulty, grouping, LLM/fallback,
   filtering/reuse, output, risks, and touchpoints for each included round;
5. emit the requested generation change with every line prefixed by `> `;
6. include Cross-round generation changes only for non-empty overall feedback.

Do not introduce round-format narrative sections unrelated to generation.

- [ ] **Step 4: Connect report actions without losing feedback**

In `js/round-review.js`:

- Generate must build a report, reveal preview, enable Copy/Download, and move
  focus to the preview heading without scrolling.
- Copy must use `navigator.clipboard.writeText()` and report failure inline.
- Download must create a UTF-8 Markdown `Blob` named
  `triviabot-round-generation-review-YYYY-MM-DD.md`, click a temporary object
  URL, then revoke it.
- Clear must request confirmation, reset in-memory/UI state, remove the storage
  key, hide preview, and leave the session usable if storage removal fails.

- [ ] **Step 5: Run the report regression suite**

Run:

```bash
node --test scripts/round-feedback.test.js
```

Expected: all parsing, serialization, quotation, and deterministic-output tests
pass.

## Task 4: Verify the Complete Generation Review Contract

**Files:**
- Inspect: `package.json`
- Inspect: `scripts/round-definitions.test.js`
- Inspect: `scripts/round-feedback.test.js`
- Inspect: `shared/round-definitions.js`
- Inspect: `round-review.html`
- Inspect: `js/round-review.js`

**Interfaces:**
- Consumes: all implementation and test files above.
- Produces: a verified, implementation-aligned generation-review surface.

- [ ] **Step 1: Run the configured test suite**

Run:

```bash
npm test
```

Expected: the Node test runner passes `scripts/generate-game.test.js`,
`scripts/ingest-llm-rounds.test.js`, `scripts/round-definitions.test.js`, and
`scripts/round-feedback.test.js`.

- [ ] **Step 2: Exercise browser persistence and export**

With the local server running:

1. Add a round-specific request about a source, filter, subtype, fallback, or
   output.
2. Add an overall cross-round request.
3. Reload and confirm both values restore.
4. Generate a report and confirm only commented sections appear.
5. Confirm the report includes current generation metadata, risks, touchpoints,
   and quoted requested changes.
6. Test Copy, Download, and Clear, including keyboard-only activation.

- [ ] **Step 3: Check the implementation/documentation boundary**

Run:

```bash
git diff --check
git diff -- docs/superpowers/specs/2026-07-20-round-structure-review-design.md docs/superpowers/plans/2026-07-20-round-structure-review.md
```

Expected: no whitespace errors and no unrelated documentation claims. Do not
stage or commit as part of this plan.
