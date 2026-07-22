import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FEEDBACK_SCHEMA_VERSION,
  buildRoundReviewReport,
  createEmptyFeedback,
  parseFeedback,
} from '../js/lib/round-feedback.js';
import {
  FINAL_TRIVIA_DEFINITION,
  ROUND_DEFINITIONS,
} from '../shared/round-definitions.js';

const FIXED_TIME = '2026-07-20T20:00:00.000Z';

test('createEmptyFeedback returns versioned empty state', () => {
  assert.deepEqual(createEmptyFeedback(), {
    schemaVersion: 1,
    updatedAt: null,
    comments: {},
    overall: '',
  });
});

test('parseFeedback returns empty state for null input', () => {
  assert.deepEqual(parseFeedback(null), createEmptyFeedback());
});

test('parseFeedback returns empty state for malformed JSON', () => {
  assert.deepEqual(parseFeedback('{broken'), createEmptyFeedback());
});

test('parseFeedback returns empty state for unsupported schema version', () => {
  const raw = JSON.stringify({ schemaVersion: 99, comments: { 'round-1': 'x' } });
  assert.deepEqual(parseFeedback(raw), createEmptyFeedback());
});

test('parseFeedback ignores non-string comment values', () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    comments: { 'round-1': 'valid', ' round-2 ': 42, 'round-3': null },
    overall: ['not', 'a', 'string'],
  });
  const result = parseFeedback(raw);
  assert.deepEqual(result.comments, { 'round-1': 'valid' });
  assert.equal(result.overall, '');
});

test('parseFeedback preserves valid version-1 input', () => {
  const raw = JSON.stringify({
    schemaVersion: 1,
    updatedAt: '2026-07-20T19:00:00.000Z',
    comments: {
      ' round-1 ': 'Tighten the easy-value band',
      'final-trivia': 'Apply banned-question filtering',
    },
    overall: 'Make pool fallback behavior explicit',
  });
  const result = parseFeedback(raw);
  assert.equal(result.schemaVersion, 1);
  assert.equal(result.updatedAt, '2026-07-20T19:00:00.000Z');
  assert.equal(result.comments['round-1'], 'Tighten the easy-value band');
  assert.equal(result.comments['final-trivia'], 'Apply banned-question filtering');
  assert.equal(result.overall, 'Make pool fallback behavior explicit');
});

test('buildRoundReviewReport omits empty comments', () => {
  const feedback = {
    schemaVersion: 1,
    updatedAt: null,
    comments: { 'round-1': '', 'round-2': '   ', 'round-3': 'Use the declared easy target' },
    overall: '',
  };
  const report = buildRoundReviewReport(
    ROUND_DEFINITIONS,
    FINAL_TRIVIA_DEFINITION,
    feedback,
    FIXED_TIME,
  );
  assert.match(report, /Round 3: Trifecta Trivia/);
  assert.doesNotMatch(report, /Round 1:/);
  assert.doesNotMatch(report, /Round 2:/);
  assert.doesNotMatch(report, /Overall structure notes/);
});

test('buildRoundReviewReport includes generation behavior and quoted requested changes', () => {
  const round2 = ROUND_DEFINITIONS.find((d) => d.id === 'round-2');
  const feedback = {
    schemaVersion: 1,
    updatedAt: null,
    comments: {
      'round-2': 'Validate the target-number range\nAdd a pool fallback',
    },
    overall: '',
  };
  const report = buildRoundReviewReport(
    ROUND_DEFINITIONS,
    FINAL_TRIVIA_DEFINITION,
    feedback,
    FIXED_TIME,
  );

  assert.match(report, /^# TriviaBot Round Generation Review/m);
  assert.ok(report.includes(`Generated: ${FIXED_TIME}`));
  assert.ok(report.includes(`Schema: ${FEEDBACK_SCHEMA_VERSION}`));
  assert.ok(report.includes('### Current generation path'));
  assert.ok(report.includes(`**Source and inputs:** ${round2.generation.source}`));
  assert.ok(report.includes(`**Selection:** ${round2.generation.selection}`));
  assert.ok(report.includes(`**Difficulty:** ${round2.generation.difficulty}`));
  assert.ok(report.includes(`**Grouping:** ${round2.generation.grouping}`));
  assert.ok(report.includes(`**LLM and fallback:** ${round2.generation.llm}`));
  assert.ok(report.includes(`**Filtering and reuse:** ${round2.generation.filtering}`));
  assert.ok(report.includes(`**Output:** ${round2.generation.output}`));
  assert.ok(report.includes('`scripts/generate-game.js` — `generateOverUnderRound()`, `generateLLMRound()`, `generateGame()`'));
  assert.ok(report.includes('### Requested generation change'));
  assert.ok(report.includes('> Validate the target-number range'));
  assert.ok(report.includes('> Add a pool fallback'));
  assert.doesNotMatch(report, /Current (?:purpose|mechanic|scoring)/);
});

test('buildRoundReviewReport includes overall notes when present', () => {
  const feedback = {
    schemaVersion: 1,
    updatedAt: null,
    comments: {},
    overall: 'Share one filtering policy across archive-backed rounds.',
  };
  const report = buildRoundReviewReport(
    ROUND_DEFINITIONS,
    FINAL_TRIVIA_DEFINITION,
    feedback,
    FIXED_TIME,
  );
  assert.ok(report.includes('## Cross-round generation changes'));
  assert.ok(report.includes('> Share one filtering policy across archive-backed rounds.'));
});

test('buildRoundReviewReport is deterministic for fixed timestamp', () => {
  const feedback = {
    schemaVersion: 1,
    updatedAt: null,
    comments: { 'round-1': 'Test comment' },
    overall: 'Overall note',
  };
  const first = buildRoundReviewReport(
    ROUND_DEFINITIONS,
    FINAL_TRIVIA_DEFINITION,
    feedback,
    FIXED_TIME,
  );
  const second = buildRoundReviewReport(
    ROUND_DEFINITIONS,
    FINAL_TRIVIA_DEFINITION,
    feedback,
    FIXED_TIME,
  );
  assert.equal(first, second);
});

test('buildRoundReviewReport quotes markdown in comments safely', () => {
  const feedback = {
    schemaVersion: 1,
    updatedAt: null,
    comments: { 'round-1': '## Fake heading\n**Bold claim**' },
    overall: '',
  };
  const report = buildRoundReviewReport(
    ROUND_DEFINITIONS,
    FINAL_TRIVIA_DEFINITION,
    feedback,
    FIXED_TIME,
  );
  assert.ok(report.includes('> ## Fake heading'));
  assert.ok(report.includes('> **Bold claim**'));
  assert.equal((report.match(/^## Round 1:/gm) || []).length, 1);
});
