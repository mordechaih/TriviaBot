import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizePlayedStatus,
  markGamePlayed,
  isGamePlayed,
} from '../shared/played-status.js';
import {
  attachAlternates,
  consumeAlternateSet,
  hasAlternates,
} from '../shared/alternates.js';
import { mergeLegacyLedgers, applyLedgerDelta } from '../shared/question-ledger.js';

test('played status round-trip through v2 schema', () => {
  const migrated = normalizePlayedStatus({ 'game-2026-01-01': true });
  const updated = markGamePlayed(migrated, 'game-2026-01-02');
  assert.equal(isGamePlayed(updated, 'game-2026-01-01'), true);
  assert.equal(isGamePlayed(updated, 'game-2026-01-02'), true);
});

test('consumeAlternateSet mutates game alternates FIFO', () => {
  const game = attachAlternates({ id: 'game-test', rounds: [{ roundNumber: 4, questions: [] }] }, {
    4: [
      [{ clue: 'Alt A', answers: ['a', 'b'], isBanned: false }],
      [{ clue: 'Alt B', answers: ['c', 'd'], isBanned: false }],
    ],
  });
  assert.equal(hasAlternates(game, 4), true);
  const first = consumeAlternateSet(game, 4);
  assert.equal(first?.[0]?.clue, 'Alt A');
  const second = consumeAlternateSet(game, 4);
  assert.equal(second?.[0]?.clue, 'Alt B');
  assert.equal(hasAlternates(game, 4), false);
});

test('ledger delta merge preserves deduplication', () => {
  const base = mergeLegacyLedgers({
    usedMain: ['a|1'],
    usedUi: ['b|2'],
    bannedMain: { questions: [{ clue: 'Q', answer: 'A' }] },
    bannedUi: { questions: [] },
  });
  const next = applyLedgerDelta(base, { usedIds: ['a|1', 'c|3'] });
  assert.deepEqual(next.usedIds.sort(), ['a|1', 'b|2', 'c|3']);
});
