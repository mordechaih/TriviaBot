import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ROUND_TEMPLATES,
  selectQuestions,
  generateGame,
  generateGameShowStyleRound,
  setFamilyFeudPathForTesting,
  clearFamilyFeudPathForTesting,
  loadListRoundQuestions,
  selectListRoundQuestion,
  filterEntertainment,
  selectEntertainmentQuestions
} from './generate-game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePath = path.join(__dirname, '__tests__', 'fixtures', 'mock-archive.json');
const tempFamilyFeudPath = path.join(__dirname, '__tests__', 'fixtures', 'temp-family-feud-test.json');

const mockArchive = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

/** Seeded RNG for deterministic tests (mulberry32) */
function createSeededRandom(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    return (seed >>> 0) / 4294967296;
  };
}

function writeTempFamilyFeudFixture(questions) {
  const payload = {
    questions,
    metadata: { description: 'Test fixture', lastUpdated: '2026-02-15', version: 'test' }
  };
  fs.writeFileSync(tempFamilyFeudPath, JSON.stringify(payload, null, 2));
}

function removeTempFamilyFeudFixture() {
  if (fs.existsSync(tempFamilyFeudPath)) {
    fs.unlinkSync(tempFamilyFeudPath);
  }
}

test('ROUND_TEMPLATES has 8 rounds', () => {
  assert.equal(Object.keys(ROUND_TEMPLATES).length, 8);
});

test('selectQuestions returns 18 archive questions plus one final (skips list + entertainment)', async () => {
  const result = await selectQuestions(mockArchive, new Set(), '2026-02-15', {
    random: createSeededRandom(42)
  });
  assert.equal(result.questions.length, 18);
  assert.ok(result.finalQuestion);
  assert.equal(result.roundDifficulties.length, 8);
});

test('selectQuestions throws for empty archive', async () => {
  await assert.rejects(
    () => selectQuestions([], new Set(), '2026-02-15'),
    /Not enough available questions/
  );
});

test('selectQuestions throws when there are no final questions', async () => {
  const noFinals = mockArchive.filter((q) => q.round !== 'Final Jeopardy');
  await assert.rejects(
    () => selectQuestions(noFinals, new Set(), '2026-02-15'),
    /Not enough available Final Jeopardy questions/
  );
});

test('selectQuestions excludes banned questions via bannedOverride', async () => {
  const bannedQuestion = { clue: 'Easy A 1', answer: 'A1' };
  const result = await selectQuestions(mockArchive, new Set(), '2026-02-15', {
    bannedOverride: [bannedQuestion],
    random: createSeededRandom(123)
  });

  const selected = result.questions.map((q) => `${q.clue}|${q.answer}`);
  assert.equal(selected.includes(`${bannedQuestion.clue}|${bannedQuestion.answer}`), false);
});

test('selectQuestions throws with insufficient questions', async () => {
  const tinyArchive = mockArchive.slice(0, 10);
  await assert.rejects(
    () => selectQuestions(tinyArchive, new Set(), '2026-02-15'),
    /Not enough available questions/
  );
});

test('Family Feud path works without OPENAI_API_KEY', async (t) => {
  await t.test('returns structured question when data exists', async () => {
    try {
      setFamilyFeudPathForTesting(tempFamilyFeudPath);
      writeTempFamilyFeudFixture([
        {
          id: 'ff-1',
          question: 'Name a fruit people put in a smoothie.',
          topAnswers: [
            { answer: 'Banana', points: 32 },
            { answer: 'Strawberry', points: 21 }
          ]
        }
      ]);

      const result = await generateGameShowStyleRound('family-feud', new Set());
      assert.ok(result);
      assert.equal(result.subType, 'family-feud');
      assert.equal(Array.isArray(result.questions), true);
      assert.equal(result.questions.length, 1);
      assert.equal(result.questions[0].clue, 'Name a fruit people put in a smoothie.');
    } finally {
      clearFamilyFeudPathForTesting();
      removeTempFamilyFeudFixture();
    }
  });

  await t.test('falls back to null when no FF data and no API key', async () => {
    if (process.env.OPENAI_API_KEY) return;
    try {
      setFamilyFeudPathForTesting(tempFamilyFeudPath);
      writeTempFamilyFeudFixture([]);
      const result = await generateGameShowStyleRound('family-feud', new Set());
      assert.equal(result, null);
    } finally {
      clearFamilyFeudPathForTesting();
      removeTempFamilyFeudFixture();
    }
  });
});

test('loadListRoundQuestions returns array with clue and answers', () => {
  const questions = loadListRoundQuestions();
  assert.ok(Array.isArray(questions));
  if (questions.length > 0) {
    assert.ok(questions[0].clue);
    assert.ok(Array.isArray(questions[0].answers));
    assert.ok(questions[0].answers.length >= 2);
  }
});

test('selectListRoundQuestion returns one question with questionId and pointsAvailable', () => {
  const result = selectListRoundQuestion(new Set(), []);
  if (result === null) {
    assert.equal(loadListRoundQuestions().length, 0, 'null only when no list questions');
    return;
  }
  assert.ok(result.clue);
  assert.ok(Array.isArray(result.answers));
  assert.equal(result.pointsAvailable, result.answers.length);
  assert.ok(result.questionId.startsWith('list:'));
});

test('selectListRoundQuestion excludes used and banned', () => {
  const questions = loadListRoundQuestions();
  if (questions.length === 0) return;
  const used = new Set([`list:${questions[0].clue}`]);
  const result = selectListRoundQuestion(used, []);
  if (questions.length === 1) {
    assert.ok(result);
    assert.equal(result.questionId, `list:${questions[0].clue}`);
  } else {
    assert.ok(result);
    assert.notEqual(result.questionId, `list:${questions[0].clue}`);
  }
});

test('selectListRoundQuestion reuses when pool exhausted but not banned', () => {
  const questions = loadListRoundQuestions();
  if (questions.length === 0) return;
  const allUsed = new Set(questions.map((q) => `list:${q.clue}`));
  const result = selectListRoundQuestion(allUsed, []);
  assert.ok(result);
  assert.ok(result.questionId.startsWith('list:'));
});

test('filterEntertainment keeps questions matching keywords', () => {
  const withMovie = mockArchive.filter((q) => (q.category || '').toLowerCase().includes('movie'));
  const filtered = filterEntertainment(mockArchive);
  assert.ok(Array.isArray(filtered));
  if (withMovie.length > 0) {
    assert.ok(filtered.some((q) => (q.category || '').toLowerCase().includes('movie')));
  }
});

test('selectEntertainmentQuestions returns only entertainment questions (no fallback)', () => {
  const result = selectEntertainmentQuestions(mockArchive, new Set(), [], 3);
  assert.ok(Array.isArray(result));
  assert.ok(result.length <= 3);
  result.forEach((q) => {
    assert.ok(q.clue);
    assert.ok(q.answer);
  });
  // With the mock archive, entertainment keywords may not match, so result may be empty — that is correct
});

test('selectEntertainmentQuestions never returns non-entertainment questions', () => {
  const entertainmentKeywords = [
    'movie', 'film', 'cinema', 'tv', 'television', 'music', 'band', 'album', 'song', 'singer',
    'actor', 'actress', 'oscar', 'grammy', 'emmy', 'netflix', 'broadway', 'hollywood',
    'comedy', 'drama', 'sitcom', 'series', 'director', 'starring', 'soundtrack'
  ];
  const lower = (s) => (s || '').toLowerCase();
  const isEntertainment = (q) => {
    const cat = lower(q.category);
    const clue = lower(q.clue || '');
    return entertainmentKeywords.some(kw => cat.includes(kw) || clue.includes(kw));
  };

  const result = selectEntertainmentQuestions(mockArchive, new Set(), [], 3);
  result.forEach((q) => {
    assert.ok(isEntertainment(q), `Question "${q.clue}" should match entertainment keywords`);
  });
});

test('selectEntertainmentQuestions returns empty when no entertainment questions exist', () => {
  const noEntertainment = [
    { clue: 'What is 2+2?', answer: '4', category: 'MATH', gameId: 'g1', value: 200, round: 'Jeopardy' },
    { clue: 'Capital of France?', answer: 'Paris', category: 'GEOGRAPHY', gameId: 'g1', value: 200, round: 'Jeopardy' }
  ];
  const result = selectEntertainmentQuestions(noEntertainment, new Set(), [], 3);
  assert.equal(result.length, 0);
});

test('generateGame round 4 has one list question with answers array', async (t) => {
  if (process.env.RUN_INTEGRATION !== '1') {
    t.skip('Set RUN_INTEGRATION=1 for full generateGame integration tests');
    return;
  }
  const archivePath = path.join(path.dirname(__dirname), 'data', 'archive-backup.json');
  if (!fs.existsSync(archivePath)) {
    t.skip('Skipping: archive-backup.json not present');
    return;
  }
  try {
    const gameId = await generateGame('2026-02-20', true);
    assert.ok(gameId);
    const gamesDir = path.join(path.dirname(__dirname), 'data', 'games');
    const gamePath = path.join(gamesDir, `${gameId}.json`);
    const game = JSON.parse(fs.readFileSync(gamePath, 'utf-8'));
    const round4 = game.rounds.find((r) => r.roundNumber === 4);
    assert.ok(round4, 'round 4 exists');
    assert.equal(round4.roundType, 'list-round');
    assert.equal(round4.questions.length, 1);
    assert.ok(Array.isArray(round4.questions[0].answers));
    assert.ok(round4.questions[0].pointsAvailable);
  } catch (err) {
    if (/list-round questions available/i.test(err.message)) {
      t.skip(`Skipping: ${err.message}`);
      return;
    }
    throw err;
  }
});

test('generateGame round 6 has 3 questions', async (t) => {
  if (process.env.RUN_INTEGRATION !== '1') {
    t.skip('Set RUN_INTEGRATION=1 for full generateGame integration tests');
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    t.skip('Skipping: OPENAI_API_KEY required for LLM rounds in integration test');
    return;
  }
  const gameId = await generateGame('2026-02-21', true);
  assert.ok(gameId);
  const gamesDir = path.join(path.dirname(__dirname), 'data', 'games');
  const gamePath = path.join(gamesDir, `${gameId}.json`);
  const game = JSON.parse(fs.readFileSync(gamePath, 'utf-8'));
  const round6 = game.rounds.find((r) => r.roundNumber === 6);
  assert.ok(round6);
  assert.equal(round6.roundType, 'entertainment-trivia');
  assert.equal(round6.questions.length, 3);
});
