import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DIRECT_STRATEGY_ROUNDS, ARCHIVE_SELECTION_ROUND_COUNT } from './lib/generator/orchestrator.js';
import { filterArchivePool } from './lib/generator/archive-lane.js';
import { ROUND_TEMPLATES } from '../shared/round-catalog.js';
import { hasAlternates } from '../shared/alternates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('round catalog exposes 8 runtime templates', () => {
  assert.equal(Object.keys(ROUND_TEMPLATES).length, 8);
  assert.equal(ROUND_TEMPLATES[4].roundType, 'list-round');
  assert.equal(ROUND_TEMPLATES[6].roundType, 'entertainment-trivia');
});

test('direct strategy skips list and entertainment rounds', () => {
  assert.equal(DIRECT_STRATEGY_ROUNDS.has(4), true);
  assert.equal(DIRECT_STRATEGY_ROUNDS.has(6), true);
  assert.equal(ARCHIVE_SELECTION_ROUND_COUNT, 6);
});

test('filterArchivePool excludes finals and used IDs', () => {
  const archive = [
    { clue: 'Q1', answer: 'A1', category: 'GEO', round: 'Jeopardy' },
    { clue: 'Q2', answer: 'A2', category: 'MOVIES', round: 'Final Jeopardy' },
  ];
  const used = new Set(['Q1|A1']);
  const pool = filterArchivePool(archive, used, []);
  assert.equal(pool.length, 0);
});

test('committed game JSON matches expected schema shape', () => {
  const fixture = path.join(__dirname, '..', 'data', 'games', 'game-2026-07-20.json');
  if (!fs.existsSync(fixture)) {
    return;
  }
  const game = JSON.parse(fs.readFileSync(fixture, 'utf-8'));
  assert.equal(game.rounds.length, 8);
  assert.ok(game.finalTrivia?.question);
  for (const round of game.rounds) {
    assert.ok(round.roundNumber >= 1 && round.roundNumber <= 8);
    assert.ok(round.roundType);
    assert.ok(Array.isArray(round.questions));
    assert.ok(round.questions.length >= 1);
  }
  if (game.alternates) {
    assert.equal(typeof game.alternates, 'object');
  }
});

test('alternates helper detects precomputed sets', () => {
  const game = { alternates: { 4: [[{ clue: 'x', answers: ['a'] }]] } };
  assert.equal(hasAlternates(game, 4), true);
  assert.equal(hasAlternates(game, 1), false);
});
