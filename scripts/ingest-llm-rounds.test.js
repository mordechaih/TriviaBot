import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFile } from './ingest-llm-rounds-from-examples.js';
import { matchSubType, isValidSubType, SUBTYPES } from './lib/round-subtypes.js';
import {
  buildFewShotBlock,
  selectExamples,
  setTrainDirForTesting,
  clearTrainDirForTesting,
} from './lib/few-shot-examples.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(__dirname, '__tests__', 'fixtures', 'mock-example-game.md');

test('parseFile only ingests target rounds 2, 5, 7', () => {
  const { rounds } = parseFile(fixture, 'mock-example-game.md');
  assert.deepEqual(rounds.map((r) => r.roundNumber).sort(), [2, 5, 7]);
});

test('captures the header-row question plus body rows (no first-question loss)', () => {
  const { rounds } = parseFile(fixture, 'mock-example-game.md');
  for (const r of rounds) {
    assert.equal(r.questions.length, 3, `round ${r.roundNumber} should have 3 questions`);
  }
});

test('detects a round header even without a leading "#" (Round 7)', () => {
  const { rounds } = parseFile(fixture, 'mock-example-game.md');
  assert.ok(rounds.find((r) => r.roundNumber === 7), 'Round 7 (no #) should be found');
});

test('over/under parsing extracts actual, target, and direction', () => {
  const { rounds } = parseFile(fixture, 'mock-example-game.md');
  const r2 = rounds.find((r) => r.roundNumber === 2);
  const first = r2.questions[0];
  assert.equal(first.overUnder, 'Over');
  assert.equal(first.actualNumber, 63);
  assert.equal(first.targetNumber, 60);
  assert.ok(!/example\.com/.test(first.clue), 'links stripped from clue');
});

test('normalizes subtypes to canonical labels', () => {
  const { rounds } = parseFile(fixture, 'mock-example-game.md');
  assert.equal(rounds.find((r) => r.roundNumber === 5).subType, 'to-tell-the-truth');
  assert.equal(rounds.find((r) => r.roundNumber === 7).subType, 'who-am-i');
});

test('bold answers are separated from clues', () => {
  const { rounds } = parseFile(fixture, 'mock-example-game.md');
  const r5 = rounds.find((r) => r.roundNumber === 5);
  const bolded = r5.questions.find((q) => /False/.test(q.answer));
  assert.ok(bolded, 'a bold answer should be extracted');
  assert.ok(!bolded.clue.includes('False'), 'answer text should not remain in the clue');
});

test('report surfaces per-round counts', () => {
  const { report } = parseFile(fixture, 'mock-example-game.md');
  const r2 = report.rounds.find((r) => r.roundNumber === 2);
  assert.equal(r2.questions, 3);
});

test('matchSubType maps free text to canonical subtypes, null when unknown', () => {
  assert.equal(matchSubType('playing Who am I this week', 7), 'who-am-i');
  assert.equal(matchSubType('a Spelling Bee round', 5), null);
  assert.equal(matchSubType('Name That Tune!', 5), 'name-that-tune');
  // A round-7 hint must not resolve to a round-5 subtype.
  assert.equal(matchSubType('Family Feud', 7), null);
});

test('isValidSubType guards the canonical lists', () => {
  assert.ok(isValidSubType('who-am-i', 7));
  assert.ok(!isValidSubType('who-am-i', 5));
  assert.equal(SUBTYPES[5].length, 4);
});

test('few-shot loader returns empty block when training data is absent', () => {
  setTrainDirForTesting(path.join(__dirname, '__tests__', 'fixtures', 'does-not-exist'));
  try {
    assert.equal(buildFewShotBlock(2), '');
    assert.deepEqual(selectExamples(5, { subType: 'millionaire' }), []);
  } finally {
    clearTrainDirForTesting();
  }
});
