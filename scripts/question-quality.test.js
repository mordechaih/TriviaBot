import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUALITY_SYSTEM_RULES,
  verifyGeneratedQuestions,
} from './lib/question-quality.js';

/**
 * Build a fake OpenAI client that records every chat.completions.create call and
 * returns canned checker output. `handler` is either an array of response
 * strings (one per call, last is reused) or a function (args, callIndex) =>
 * string. If a resolved value is an Error, the call throws it (to exercise the
 * fail-open path).
 */
function makeFakeClient(handler) {
  const calls = [];
  return {
    calls,
    chat: {
      completions: {
        create: async (args) => {
          const i = calls.length;
          calls.push(args);
          const value = typeof handler === 'function'
            ? handler(args, i)
            : handler[Math.min(i, handler.length - 1)];
          if (value instanceof Error) throw value;
          return { choices: [{ message: { content: value } }] };
        },
      },
    },
  };
}

/** Serialize checker verdicts the way the module expects to parse them. */
const verdicts = (results) => JSON.stringify({ results });

test('QUALITY_SYSTEM_RULES states the core rules', () => {
  assert.equal(typeof QUALITY_SYSTEM_RULES, 'string');
  assert.ok(QUALITY_SYSTEM_RULES.length > 0);
  assert.match(QUALITY_SYSTEM_RULES, /exactly one correct answer/i);
  assert.match(QUALITY_SYSTEM_RULES, /distractor/i);
  assert.match(QUALITY_SYSTEM_RULES, /never reveal the answer/i);
});

test('fails open and returns the same reference when no client is supplied', async () => {
  const questions = [{ clue: 'Q', answer: 'A' }];
  const result = await verifyGeneratedQuestions(questions, { openaiClient: null });
  assert.equal(result, questions);
});

test('returns input unchanged for empty or non-array input', async () => {
  const client = makeFakeClient([verdicts([])]);
  assert.deepEqual(await verifyGeneratedQuestions([], { openaiClient: client }), []);
  assert.equal(await verifyGeneratedQuestions(null, { openaiClient: client }), null);
  assert.equal(client.calls.length, 0, 'no API call for empty/invalid input');
});

test('keeps every question when the checker approves them (single pass)', async () => {
  const questions = [
    { clue: 'Q1', answer: 'A1' },
    { clue: 'Q2', answer: 'A2' },
  ];
  const client = makeFakeClient([
    verdicts([
      { index: 0, ok: true, action: 'keep' },
      { index: 1, ok: true, action: 'keep' },
    ]),
  ]);
  const result = await verifyGeneratedQuestions(questions, { openaiClient: client });
  assert.deepEqual(result, questions);
  assert.equal(client.calls.length, 1, 'stops early when nothing changed');
});

test('applies a rewrite and preserves fields the checker omitted', async () => {
  const questions = [{ clue: 'old clue', answer: 'A', isBanned: false, questionId: 'q1' }];
  const client = makeFakeClient([
    verdicts([{ index: 0, ok: false, action: 'rewrite', issue: 'a', revised: { clue: 'new clue', answer: 'A2' } }]),
    verdicts([{ index: 0, ok: true, action: 'keep' }]),
  ]);
  const result = await verifyGeneratedQuestions(questions, { openaiClient: client });
  assert.equal(result.length, 1);
  assert.equal(result[0].clue, 'new clue');
  assert.equal(result[0].answer, 'A2');
  assert.equal(result[0].isBanned, false, 'preserves omitted field');
  assert.equal(result[0].questionId, 'q1', 'preserves omitted field');
});

test('ignores blank fields in a rewrite (keeps the original value)', async () => {
  const questions = [{ clue: 'old clue', answer: 'A' }];
  const client = makeFakeClient([
    verdicts([{ index: 0, ok: false, action: 'rewrite', revised: { clue: '   ', answer: 'B' } }]),
    verdicts([{ index: 0, ok: true, action: 'keep' }]),
  ]);
  const result = await verifyGeneratedQuestions(questions, { openaiClient: client });
  assert.equal(result[0].clue, 'old clue', 'blank clue in revision is ignored');
  assert.equal(result[0].answer, 'B');
});

test('a rewrite verdict with no revision leaves the question untouched', async () => {
  const questions = [{ clue: 'Q', answer: 'A' }];
  const client = makeFakeClient([
    verdicts([{ index: 0, ok: false, action: 'rewrite' }]),
  ]);
  const result = await verifyGeneratedQuestions(questions, { openaiClient: client });
  assert.deepEqual(result, questions);
  assert.equal(client.calls.length, 1, 'no change => early stop');
});

test('drops an unsalvageable question', async () => {
  const questions = [
    { clue: 'Q0', answer: 'A0' },
    { clue: 'Q1', answer: 'A1' },
    { clue: 'Q2', answer: 'A2' },
  ];
  const client = makeFakeClient([
    verdicts([
      { index: 0, ok: true, action: 'keep' },
      { index: 1, ok: false, action: 'drop', issue: 'b' },
      { index: 2, ok: true, action: 'keep' },
    ]),
    verdicts([
      { index: 0, ok: true, action: 'keep' },
      { index: 1, ok: true, action: 'keep' },
    ]),
  ]);
  const result = await verifyGeneratedQuestions(questions, { openaiClient: client });
  assert.equal(result.length, 2);
  assert.deepEqual(result.map((q) => q.clue), ['Q0', 'Q2']);
});

test('fails open when the checker call throws', async () => {
  const questions = [{ clue: 'Q', answer: 'A' }];
  const client = makeFakeClient([new Error('rate limited')]);
  const result = await verifyGeneratedQuestions(questions, { openaiClient: client });
  assert.deepEqual(result, questions);
  assert.equal(client.calls.length, 1);
});

test('fails open when the checker returns malformed JSON', async () => {
  const questions = [{ clue: 'Q', answer: 'A' }];
  const client = makeFakeClient(['{ this is not json']);
  const result = await verifyGeneratedQuestions(questions, { openaiClient: client });
  assert.deepEqual(result, questions);
});

test('respects the iteration cap and uses a low-temperature JSON call', async () => {
  const questions = [{ clue: 'Q', answer: 'A' }];
  // Always rewrite so each pass reports a change; the cap must stop the loop.
  const client = makeFakeClient(() =>
    verdicts([{ index: 0, ok: false, action: 'rewrite', revised: { clue: 'Q?', answer: 'A' } }]),
  );
  const result = await verifyGeneratedQuestions(questions, {
    openaiClient: client,
    maxIterations: 99, // module clamps this to <= 2
  });
  assert.equal(result.length, 1);
  assert.ok(client.calls.length <= 2, `iteration cap honored (got ${client.calls.length})`);
  assert.equal(client.calls[0].temperature, 0.1, 'checker runs at low temperature');
  assert.deepEqual(client.calls[0].response_format, { type: 'json_object' });
});
