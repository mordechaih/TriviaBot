import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as reviewDefinitions from '../shared/round-definitions.js';
const {
  FINAL_TRIVIA_DEFINITION,
  ROUND_DEFINITIONS,
  ROUND_TEMPLATES,
} = reviewDefinitions;
import { SUBTYPES } from './lib/round-subtypes.js';

test('defines all game sections with generation-review metadata', () => {
  assert.deepEqual(ROUND_DEFINITIONS.map(({ id }) => id), [
    'round-1', 'round-2', 'round-3', 'round-4',
    'round-5', 'round-6', 'round-7', 'round-8',
  ]);
  for (const definition of [...ROUND_DEFINITIONS, FINAL_TRIVIA_DEFINITION]) {
    const generation = definition.generation;
    assert.equal(typeof generation?.summary, 'string');
    assert.ok(generation.summary.length > 0);
    assert.ok(generation.flow.length >= 3);
    assert.equal(typeof generation.source, 'string');
    assert.equal(typeof generation.selection, 'string');
    assert.equal(typeof generation.difficulty, 'string');
    assert.equal(typeof generation.grouping, 'string');
    assert.equal(typeof generation.llm, 'string');
    assert.equal(typeof generation.filtering, 'string');
    assert.equal(typeof generation.output, 'string');
    assert.ok(generation.risks.length > 0);
    assert.ok(generation.touchpoints.length > 0);
    for (const touchpoint of generation.touchpoints) {
      assert.match(touchpoint.path, /\.[a-z]+$/i);
      assert.ok(touchpoint.symbols.length > 0);
    }

    assert.equal('purpose' in definition, false);
    assert.equal('mechanic' in definition, false);
    assert.equal('scoring' in definition, false);
    assert.equal('sampleQuestion' in definition, false);

    const reviewMetadata = JSON.stringify(generation);
    assert.doesNotMatch(reviewMetadata, /\b(player mechanic|scoring|teams? (?:answer|wager)|points? per correct)\b/i);
  }
  assert.equal(FINAL_TRIVIA_DEFINITION.id, 'final-trivia');
});

test('documents actual per-round generation paths and known fallbacks', () => {
  const byNumber = Object.fromEntries(ROUND_DEFINITIONS.map((d) => [d.number, d]));

  assert.match(byNumber[1].generation.source, /archive-backup\.json/);
  assert.match(byNumber[1].generation.grouping, /same game and category/i);

  assert.match(byNumber[2].generation.source, /data\/llm-train\/round2\.jsonl/);
  assert.match(byNumber[2].generation.llm, /gpt-4o-mini/);
  assert.match(byNumber[2].generation.risks.join(' '), /no generic archive or pool fallback/i);

  assert.match(byNumber[3].generation.difficulty, /actual selector target is medium/i);
  assert.match(byNumber[4].generation.source, /list-round-questions\.json/);
  assert.match(byNumber[4].generation.output, /one question/i);

  assert.match(byNumber[5].generation.selection, /recent.*subtype/i);
  assert.match(byNumber[5].generation.llm, /Family Feud.*pool/i);
  assert.match(byNumber[6].generation.filtering, /ENTERTAINMENT_KEYWORDS/);
  assert.match(byNumber[6].generation.grouping, /does not enforce.*same-category/i);
  assert.match(byNumber[7].generation.source, /data\/llm-train\/round7\.jsonl/);
  assert.match(byNumber[8].generation.difficulty, /actual selector target is hard/i);

  assert.match(FINAL_TRIVIA_DEFINITION.generation.selection, /Final Jeopardy/);
  assert.match(FINAL_TRIVIA_DEFINITION.generation.filtering, /banned-question files are not checked/i);
});

test('defines the complete shared generation flow for the overview diagram', () => {
  const flow = reviewDefinitions.GENERATION_FLOW_DEFINITION;
  assert.equal(flow?.id, 'generation-overview');
  assert.equal(Object.isFrozen(flow), true);
  assert.deepEqual(flow.lanes.map(({ id }) => id), [
    'archive-lane',
    'list-lane',
    'themed-lane',
  ]);

  const intakeText = JSON.stringify(flow.intake);
  assert.match(intakeText, /archive-backup\.json/);
  assert.match(intakeText, /used-questions(?:-ui)?\.json/);
  assert.match(intakeText, /banned/i);
  assert.match(intakeText, /disqualif/i);

  const archiveLane = JSON.stringify(flow.lanes[0]);
  assert.match(archiveLane, /Rounds 1, 3, 6, 8 \+ Final Trivia/);
  assert.match(archiveLane, /24 archive slots/i);
  assert.match(archiveLane, /Final Jeopardy/i);
  assert.match(archiveLane, /ENTERTAINMENT_KEYWORDS/);

  const listLane = JSON.stringify(flow.lanes[1]);
  assert.match(listLane, /Round 4/);
  assert.match(listLane, /list-round-questions\.json/);
  assert.match(listLane, /used.*banned/i);

  const themedLane = JSON.stringify(flow.lanes[2]);
  assert.match(themedLane, /Rounds 2, 5, 7/);
  assert.match(themedLane, /recent.*subtype/i);
  assert.match(themedLane, /parallel/i);
  assert.match(themedLane, /Family Feud.*pool/i);
  assert.match(themedLane, /few-shot/i);

  assert.match(JSON.stringify(flow.assembly), /8 rounds \+ Final Trivia/i);
  const outputText = JSON.stringify(flow.output);
  assert.match(outputText, /game-YYYY-MM-DD\.json/);
  assert.match(outputText, /used-questions\.json/);
  assert.match(outputText, /themed pool/i);
});

test('generation metadata does not claim played status affects selection', () => {
  const intake = JSON.stringify(reviewDefinitions.GENERATION_FLOW_DEFINITION.intake);
  const output = JSON.stringify(reviewDefinitions.GENERATION_FLOW_DEFINITION.output);
  const metadata = JSON.stringify({
    flow: reviewDefinitions.GENERATION_FLOW_DEFINITION,
    rounds: ROUND_DEFINITIONS.map(({ generation }) => generation),
    final: FINAL_TRIVIA_DEFINITION.generation,
  });

  assert.doesNotMatch(metadata, /played(?:-status| status)/i);
  assert.match(intake, /selectors exclude IDs found in either used-question ledger/i);
  assert.match(intake, /LLM paths.*prompt-level exclusions/i);
  assert.match(output, /immediately reserve.*used-questions\.json/i);
});

test('round review page provides a semantic generation-flow region', () => {
  const html = fs.readFileSync(
    new URL('../round-review.html', import.meta.url),
    'utf-8',
  );
  const script = fs.readFileSync(
    new URL('../js/round-review.js', import.meta.url),
    'utf-8',
  );

  assert.match(
    html,
    /<section[^>]+id="generation-overview"[^>]+aria-labelledby="generation-overview-heading"/,
  );
  assert.match(html, /<h2[^>]+id="generation-overview-heading"/);
  assert.match(html, /id="generation-flow-description"/);
  assert.match(
    html,
    /<div[^>]+id="generation-flow"[^>]+aria-describedby="generation-flow-description"/,
  );
  assert.match(script, /GENERATION_FLOW_DEFINITION/);
  assert.match(script, /createElement\('ol'\)/);
  assert.match(script, /createElement\('section'\)/);
  assert.match(script, /setAttribute\('aria-label'/);
});

test('round types are unique across rounds 1-8', () => {
  const roundTypes = ROUND_DEFINITIONS.map((d) => d.roundType);
  assert.equal(new Set(roundTypes).size, roundTypes.length);
});

test('rounds 5 and 7 use canonical subtype arrays', () => {
  const round5 = ROUND_DEFINITIONS.find((d) => d.number === 5);
  const round7 = ROUND_DEFINITIONS.find((d) => d.number === 7);
  assert.deepEqual(round5.subTypes, SUBTYPES[5]);
  assert.deepEqual(round7.subTypes, SUBTYPES[7]);
});

test('ROUND_TEMPLATES preserves generator fields', () => {
  assert.equal(Object.keys(ROUND_TEMPLATES).length, 8);

  const expected = {
    1: {
      type: 'standard',
      roundType: 'get-your-feet-wet',
      title: 'Get Your Feet Wet',
      points: 2,
      difficulty: 'easy',
      useLLM: false,
      instructions: 'Generally VERY easy questions to ease into the game.',
    },
    2: {
      type: 'over-under',
      roundType: 'over-under',
      title: 'Over/Under',
      points: 3,
      useLLM: true,
      instructions: 'Numeric guessing questions. Pick a number close to the actual answer.',
    },
    3: {
      type: 'standard',
      roundType: 'trifecta-trivia',
      title: 'Trifecta Trivia',
      points: 3,
      difficulty: 'easy',
      useLLM: false,
      instructions: 'First "trivia in earnest" round. Still easy questions.',
    },
    4: {
      type: 'list',
      roundType: 'list-round',
      title: 'The List Round',
      points: 'variable',
      useLLM: false,
      instructions: 'One question with multiple answers. 1 point per correct answer.',
    },
    5: {
      type: 'game-show-style',
      roundType: 'game-show-style',
      title: 'Game Show Style',
      points: 4,
      useLLM: true,
      subTypes: SUBTYPES[5],
      instructions: 'Varies weekly: True/False, Name That Tune, Multiple Choice, or Family Feud.',
    },
    6: {
      type: 'entertainment',
      roundType: 'entertainment-trivia',
      title: 'Entertainment Trivia',
      points: 4,
      difficulty: 'medium',
      useLLM: false,
      instructions: 'Movies, music, and TV from 1980s onward. Books can be older (early 1900s).',
    },
    7: {
      type: 'mixing-things-up',
      roundType: 'mixing-things-up',
      title: 'Mixing Things Up',
      points: 5,
      useLLM: true,
      subTypes: SUBTYPES[7],
      instructions: 'Varies weekly: Who Am I, Size Matters, Name That Brand, or Sports Team.',
    },
    8: {
      type: 'standard',
      roundType: 'game-changer',
      title: 'Game Changer Round',
      points: 6,
      difficulty: 'medium',
      useLLM: false,
      instructions: 'Medium difficulty standard questions. No shared theme.',
    },
  };

  for (const [num, fields] of Object.entries(expected)) {
    assert.deepEqual(ROUND_TEMPLATES[num], fields);
  }
});
