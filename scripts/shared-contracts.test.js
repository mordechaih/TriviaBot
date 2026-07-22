import test from 'node:test';
import assert from 'node:assert/strict';

import { makeQuestionId, isBannedRecord } from '../shared/question-ids.js';
import {
  normalizePlayedStatus,
  isGamePlayed,
  markGamePlayed,
  PLAYED_STATUS_VERSION,
} from '../shared/played-status.js';
import {
  emptyLedger,
  mergeLegacyLedgers,
  normalizeLedger,
  applyLedgerDelta,
} from '../shared/question-ledger.js';
import { filterEntertainment, isListQuestionBanned } from '../shared/question-filters.js';
import { poolFileFor, normalizePoolQuestion } from '../shared/pool-registry.js';
import { SUBTYPES, matchSubType } from '../shared/round-subtypes.js';

test('makeQuestionId encodes round-specific prefixes', () => {
  assert.equal(
    makeQuestionId({ clue: 'How many keys?', answer: '88' }, { roundNumber: 2, roundType: 'over-under' }),
    'over-under:How many keys?|88',
  );
  assert.equal(
    makeQuestionId({ clue: 'Colors?' }, { roundType: 'list-round' }),
    'list:Colors?',
  );
  assert.equal(
    makeQuestionId(
      { clue: 'True or false', answer: 'True' },
      { roundNumber: 5, roundType: 'game-show-style', subType: 'to-tell-the-truth' },
    ),
    'game-show:to-tell-the-truth:True or false|True',
  );
  assert.equal(
    makeQuestionId({ id: 'ff-99', question: 'Name a fruit', topAnswers: [{ answer: 'Banana' }] }, {
      roundNumber: 5,
      subType: 'family-feud',
    }),
    'ff:ff-99',
  );
});

test('isBannedRecord matches clue and questionId', () => {
  const banned = { questionId: 'list:Smarties colors', clue: 'Smarties colors' };
  assert.equal(isBannedRecord(banned, { clue: 'Smarties colors' }, 'list:Smarties colors'), true);
  assert.equal(isBannedRecord(banned, { clue: 'Other' }), false);
});

test('normalizePlayedStatus migrates flat legacy format', () => {
  const status = normalizePlayedStatus({ 'game-2026-01-20': true, 'game-2026-01-21': false });
  assert.equal(status.version, PLAYED_STATUS_VERSION);
  assert.equal(status.games['game-2026-01-20'].played, true);
  assert.equal(isGamePlayed(status, 'game-2026-01-20'), true);
  assert.equal(isGamePlayed(status, 'game-2026-01-21'), false);
});

test('markGamePlayed returns immutable-style update', () => {
  const base = normalizePlayedStatus({});
  const next = markGamePlayed(base, 'game-2026-07-20');
  assert.equal(isGamePlayed(next, 'game-2026-07-20'), true);
  assert.equal(isGamePlayed(base, 'game-2026-07-20'), false);
});

test('mergeLegacyLedgers deduplicates used and banned', () => {
  const ledger = mergeLegacyLedgers({
    usedMain: ['a|1', 'b|2'],
    usedUi: ['b|2', 'c|3'],
    bannedMain: { questions: [{ clue: 'Q1', answer: 'A1' }] },
    bannedUi: { questions: [{ clue: 'Q1', answer: 'A1' }, { clue: 'Q2', answer: 'A2' }] },
  });
  assert.deepEqual(ledger.usedIds.sort(), ['a|1', 'b|2', 'c|3']);
  assert.equal(ledger.bans.questions.length, 2);
});

test('applyLedgerDelta merges used ids', () => {
  const base = emptyLedger();
  base.usedIds = ['x|1'];
  const next = applyLedgerDelta(base, { usedIds: ['y|2', 'x|1'] });
  assert.deepEqual(next.usedIds.sort(), ['x|1', 'y|2']);
});

test('poolFileFor resolves subtype files', () => {
  assert.equal(poolFileFor('over-under'), 'over-under-questions.json');
  assert.equal(poolFileFor('game-show-style', 'millionaire'), 'millionaire-questions.json');
  assert.equal(poolFileFor('mixing-things-up', 'who-am-i'), 'who-am-i-questions.json');
});

test('normalizePoolQuestion handles family feud shape', () => {
  const q = normalizePoolQuestion('game-show-style', 'family-feud', {
    id: 'ff-1',
    question: 'Name a color',
    topAnswers: [{ answer: 'Red', points: 30 }],
  });
  assert.equal(q.clue, 'Name a color');
  assert.equal(q.answer, 'Red');
  assert.equal(q.id, 'ff-1');
});

test('matchSubType normalizes example-game hints', () => {
  assert.equal(matchSubType('This week: Who Am I', 7), 'who-am-i');
  assert.equal(matchSubType('Family Feud style', 5), 'family-feud');
  assert.equal(SUBTYPES[5].length, 4);
});

test('isListQuestionBanned uses list prefix', () => {
  assert.equal(isListQuestionBanned('Smarties', [{ questionId: 'list:Smarties' }]), true);
  assert.equal(isListQuestionBanned('Other', [{ questionId: 'list:Smarties' }]), false);
});

test('filterEntertainment finds keyword matches', () => {
  const archive = [
    { clue: 'Oscar winner', answer: 'X', category: 'MOVIES' },
    { clue: 'Capital', answer: 'Paris', category: 'GEOGRAPHY' },
  ];
  const filtered = filterEntertainment(archive);
  assert.equal(filtered.length, 1);
  assert.match(filtered[0].category, /MOVIES/);
});

test('normalizeLedger accepts bans alias', () => {
  const ledger = normalizeLedger({
    used: ['a|1'],
    bannedQuestions: { questions: [{ clue: 'q', answer: 'a' }] },
  });
  assert.deepEqual(ledger.usedIds, ['a|1']);
  assert.equal(ledger.bans.questions.length, 1);
});
