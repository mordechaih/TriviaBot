#!/usr/bin/env node
/**
 * A/B quality eval for the LLM-generated trivia rounds (2, 5, 7).
 *
 * Generates each round/subtype twice — a BASELINE arm with QUALITY_SYSTEM_RULES
 * off and no verification (today's pre-rules behavior), and a TREATMENT arm with
 * the rules on and verifyGeneratedQuestions enabled — then grades every question
 * two ways:
 *   1. LLM judge (scalable proxy): a blind-solve pass (answer with the answer
 *      hidden, to estimate real difficulty) + a reveal-and-score pass against the
 *      quality checklist. Aggregated per arm for an A/B scorecard.
 *   2. Blind human review (ground truth): a shuffled Markdown sheet with the arm
 *      hidden, plus an answer key, so you can rate a sample yourself and un-blind.
 *
 * COST: generation + judging make real OpenAI calls. This script DEFAULTS TO A
 * DRY RUN — it prints the plan and estimated call count and exits. Pass --run to
 * actually spend. Nothing here is committed and no game files are written.
 *
 * Usage:
 *   node scripts/eval-question-quality.js                 # dry-run plan only
 *   node scripts/eval-question-quality.js --run           # execute (spends $)
 *   node scripts/eval-question-quality.js --run --samples 3 --rounds 5,7
 *   node scripts/eval-question-quality.js --run --judge-model gpt-4o-mini
 *
 * Flags: --run | --samples N (default 2) | --rounds 2,5,7 (default all) |
 *        --judge-model M (default gpt-4o) | --seed N (default 12345) |
 *        --out DIR (default eval-output)
 *
 * LIMITATIONS (see .claude/skills/trivia-question-quality/references/techniques.md):
 *   The judge is the same model family as the generator, so it can share blind
 *   spots (especially factual hallucinations). The blind-solve difficulty signal
 *   mitigates the "can't judge difficulty with the answer visible" problem, but
 *   the blind human-review sheet is the real ground truth. Treat the LLM
 *   scorecard as a proxy, not a verdict.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';
import { generateLLMRound, setQualityRulesEnabled } from './generate-game.js';
import { SUBTYPES, SUBTYPE_LABELS } from './lib/round-subtypes.js';

// ---------- CLI ----------
function parseArgs(argv) {
  const args = { run: false, samples: 2, rounds: [2, 5, 7], judgeModel: 'gpt-4o', seed: 12345, out: 'eval-output' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run') args.run = true;
    else if (a === '--samples') args.samples = Math.max(1, parseInt(argv[++i], 10) || 2);
    else if (a === '--rounds') args.rounds = String(argv[++i]).split(',').map((n) => parseInt(n, 10)).filter((n) => [2, 5, 7].includes(n));
    else if (a === '--judge-model') args.judgeModel = argv[++i];
    else if (a === '--seed') args.seed = parseInt(argv[++i], 10) || 12345;
    else if (a === '--out') args.out = argv[++i];
  }
  return args;
}

// Deterministic RNG so the blind-review shuffle is reproducible for a given seed.
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// R2 has no subtype; R5 excludes family-feud (curated DB question, not LLM-generated).
function subtypesFor(round) {
  if (round === 2) return [null];
  if (round === 5) return SUBTYPES[5].filter((s) => s !== 'family-feud');
  if (round === 7) return [...SUBTYPES[7]];
  return [];
}

const ARMS = [
  { name: 'baseline', rules: false, verify: false },
  { name: 'treatment', rules: true, verify: true },
];
const SCORE_DIMS = ['pinned', 'noGiveaway', 'factualConfidence', 'interest', 'clueUniqueness', 'distractorQuality'];

// ---------- question rendering for the judge ----------
function actualAnswerOf(q) {
  if (Array.isArray(q.options) && q.correctAnswer != null) {
    const hit = q.options.find((o) => String(o).trim().toUpperCase().startsWith(String(q.correctAnswer).trim().toUpperCase()));
    return hit || String(q.correctAnswer);
  }
  if (q.actualNumber != null) return String(q.actualNumber);
  return String(q.answer ?? '');
}
function describeForSolver(q) {
  const lines = [`Clue: ${q.clue ?? ''}`];
  if (Array.isArray(q.options) && q.options.length) lines.push(`Options: ${q.options.join('  ')}`);
  if (q.targetNumber != null) lines.push(`(Over/Under: is the true number over or under ${q.targetNumber}? Also give the number.)`);
  if (q.answer === 'True' || q.answer === 'False') lines.push('(Answer True or False.)');
  return lines.join('\n');
}
function describeFull(q) {
  const lines = [`Clue: ${q.clue ?? ''}`];
  if (Array.isArray(q.options) && q.options.length) lines.push(`Options: ${q.options.join('  ')}`);
  lines.push(`Intended answer: ${actualAnswerOf(q)}`);
  if (q.overOrUnder) lines.push(`Over/Under vs ${q.targetNumber}: ${q.overOrUnder} (actual ${q.actualNumber})`);
  if (q.explanation) lines.push(`Explanation: ${q.explanation}`);
  if (q.details) lines.push(`Details: ${q.details}`);
  return lines.join('\n');
}

const SOLVER_SYSTEM = 'You are a sharp pub-trivia player. You see ONLY the question (and any options). Give your single best answer and a confidence 0-1. You will NOT be shown the intended answer. Respond as JSON: {"guess": string, "confidence": number}.';
const JUDGE_SYSTEM = `You are a meticulous trivia editor vetting one question against a quality checklist. You get the full question (with intended answer) and a blind solver's guess. Score each dimension 0-2 (2 = fully meets standard, 1 = partial, 0 = fails):
- pinned: exactly one defensible correct answer; no other reasonable answer fits the clue.
- noGiveaway: the clue does NOT reveal or telegraph the answer (no restating it, wordplay, "sounds like", rhyme).
- factualConfidence: the intended answer is very likely true and would survive double-sourcing (0 if likely wrong/unverifiable).
- interest: rewards genuine knowledge; non-obvious and debatable, not a gimme, not impossibly obscure.
- clueUniqueness: the clue is specific and uniquely identifies the answer (not vague/generic).
- distractorQuality: MULTIPLE-CHOICE ONLY (else null): every distractor is verifiably wrong yet plausible; none is a second correct answer; none is obvious filler.
Also return blindGuessCorrect (did the solver's guess match the intended answer, allowing synonyms/equivalent forms?), verdict ("good"|"borderline"|"reject"), and concrete issues[].
Respond as JSON: {"pinned":n,"noGiveaway":n,"factualConfidence":n,"interest":n,"clueUniqueness":n,"distractorQuality":n_or_null,"blindGuessCorrect":bool,"verdict":"...","issues":[...]}.`;

async function judgeQuestion(client, model, q) {
  // Stage 1: blind solve (answer hidden) → difficulty/solvability signal.
  let guess = '', confidence = null;
  try {
    const r = await client.chat.completions.create({
      model, temperature: 0.2, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SOLVER_SYSTEM }, { role: 'user', content: describeForSolver(q) }],
    });
    const p = JSON.parse(r.choices[0].message.content);
    guess = String(p.guess ?? ''); confidence = typeof p.confidence === 'number' ? p.confidence : null;
  } catch (e) {
    guess = `(solver error: ${e.message})`;
  }
  // Stage 2: reveal + score.
  try {
    const r = await client.chat.completions.create({
      model, temperature: 0, response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: JUDGE_SYSTEM },
        { role: 'user', content: `${describeFull(q)}\n\nBlind solver guessed: "${guess}" (confidence ${confidence ?? 'n/a'}).` },
      ],
    });
    const s = JSON.parse(r.choices[0].message.content);
    return { ...s, blindGuess: guess, blindConfidence: confidence };
  } catch (e) {
    return { error: e.message, blindGuess: guess, blindConfidence: confidence };
  }
}

// ---------- aggregation ----------
function mean(nums) {
  const v = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
function fmt(n) { return n == null ? '  — ' : n.toFixed(2); }
function pct(n) { return n == null ? '  — ' : `${Math.round(n * 100)}%`; }

function aggregate(records) {
  const scored = records.filter((r) => r.score && !r.score.error);
  const agg = { n: records.length, scoredN: scored.length };
  for (const d of SCORE_DIMS) agg[d] = mean(scored.map((r) => r.score[d]));
  agg.blindSolveAccuracy = mean(scored.map((r) => (r.score.blindGuessCorrect ? 1 : 0)));
  agg.verdictGood = mean(scored.map((r) => (r.score.verdict === 'good' ? 1 : 0)));
  agg.verdictReject = mean(scored.map((r) => (r.score.verdict === 'reject' ? 1 : 0)));
  return agg;
}

function scorecardMarkdown(byArm, meta) {
  const rows = [
    ['Metric', 'baseline', 'treatment'],
    ['questions graded', String(byArm.baseline.scoredN), String(byArm.treatment.scoredN)],
    ['pinned (one answer)', fmt(byArm.baseline.pinned), fmt(byArm.treatment.pinned)],
    ['no giveaway', fmt(byArm.baseline.noGiveaway), fmt(byArm.treatment.noGiveaway)],
    ['factual confidence', fmt(byArm.baseline.factualConfidence), fmt(byArm.treatment.factualConfidence)],
    ['interest', fmt(byArm.baseline.interest), fmt(byArm.treatment.interest)],
    ['clue uniqueness', fmt(byArm.baseline.clueUniqueness), fmt(byArm.treatment.clueUniqueness)],
    ['distractor quality (MCQ)', fmt(byArm.baseline.distractorQuality), fmt(byArm.treatment.distractorQuality)],
    ['blind-solve accuracy*', pct(byArm.baseline.blindSolveAccuracy), pct(byArm.treatment.blindSolveAccuracy)],
    ['verdict = good', pct(byArm.baseline.verdictGood), pct(byArm.treatment.verdictGood)],
    ['verdict = reject', pct(byArm.baseline.verdictReject), pct(byArm.treatment.verdictReject)],
  ];
  const body = rows.map((r, i) => `| ${r.join(' | ')} |${i === 0 ? '\n| --- | --- | --- |' : ''}`).join('\n');
  return `# TriviaBot question-quality A/B scorecard

Generated: ${meta.timestamp}
Judge model: \`${meta.judgeModel}\` · samples/subtype: ${meta.samples} · rounds: ${meta.rounds.join(', ')} · seed: ${meta.seed}

Scores are 0–2 (higher is better). Baseline = QUALITY_SYSTEM_RULES off, no verification. Treatment = rules on + \`verifyGeneratedQuestions\`.

${body}

\\* **blind-solve accuracy** = how often a solver who could not see the answer got it right. This is the difficulty signal — a healthy pub round lands roughly 40–70%. Near 90%+ means too easy; near 0% means unguessable.

**Caveat:** the judge shares the generator's model family and can echo its blind spots (especially factual errors). Use the blind human-review sheet as ground truth.
`;
}

function blindReviewMarkdown(records, rng, meta) {
  const shuffled = shuffle(records.map((r, i) => ({ ...r, _orig: i })), rng);
  const key = [];
  const blocks = shuffled.map((r, i) => {
    const n = i + 1;
    key.push({ q: n, arm: r.arm, round: r.round, subType: r.subType, actualAnswer: actualAnswerOf(r.question), verdict: r.score?.verdict ?? null });
    const q = r.question;
    const opts = Array.isArray(q.options) && q.options.length ? `\n${q.options.map((o) => `   - ${o}`).join('\n')}` : '';
    return `### Q${n}${opts ? ' (multiple choice)' : ''}

**Clue:** ${q.clue ?? ''}${opts}

**Answer:** ${actualAnswerOf(q)}

Rate 1–5 (interest / fairness / difficulty). Would you use it? (y/n). Notes:

- rating: __
- use it: __
- notes:

---`;
  });
  const md = `# Blind review — rate these without knowing which arm produced them

Generated: ${meta.timestamp} · ${records.length} questions, shuffled (seed ${meta.seed}).
The arm (baseline vs treatment) is hidden. Rate each, then compare against \`answer-key-${meta.stamp}.json\` to see which arm won.

---

${blocks.join('\n\n')}
`;
  return { md, key };
}

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv.slice(2));

  const tasks = [];
  for (const round of args.rounds) for (const subType of subtypesFor(round)) for (let s = 0; s < args.samples; s++) tasks.push({ round, subType, sample: s });
  const genCalls = tasks.length * ARMS.length;
  const estQuestions = genCalls * 3;

  console.log('TriviaBot question-quality A/B eval');
  console.log('-----------------------------------');
  console.log(`Arms:            baseline (rules off) vs treatment (rules on + verify)`);
  console.log(`Rounds:          ${args.rounds.join(', ')}`);
  console.log(`Subtypes:        ${args.rounds.map((r) => `R${r}:[${subtypesFor(r).map((s) => s || 'over-under').join(', ')}]`).join('  ')}`);
  console.log(`Samples/subtype: ${args.samples}`);
  console.log(`Judge model:     ${args.judgeModel}`);
  console.log('');
  console.log(`Estimated OpenAI calls:`);
  console.log(`  generation: ~${genCalls} (→ ~${estQuestions} questions)`);
  console.log(`  judging:    ~${estQuestions * 2} (blind-solve + score per question)`);
  console.log(`  + treatment verification adds up to ~${tasks.length} more`);
  console.log(`  TOTAL:      ~${genCalls + estQuestions * 2 + tasks.length} calls`);
  console.log('');

  if (!args.run) {
    console.log('DRY RUN — no API calls made. Re-run with --run to execute (this spends money).');
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set — cannot run the eval.');
    process.exit(1);
  }

  const judge = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const records = [];

  for (const arm of ARMS) {
    setQualityRulesEnabled(arm.rules);
    if (arm.verify) process.env.VERIFY_LLM_QUESTIONS = '1';
    else delete process.env.VERIFY_LLM_QUESTIONS;
    console.log(`\n[${arm.name}] generating (${tasks.length} tasks)...`);
    for (const t of tasks) {
      try {
        const res = await generateLLMRound(t.round, t.subType, new Set());
        const qs = res?.questions ?? [];
        qs.forEach((question, idx) => records.push({ arm: arm.name, round: t.round, subType: res?.subType ?? t.subType, sample: t.sample, qIdx: idx, question }));
        process.stdout.write(`  R${t.round}${t.subType ? `/${t.subType}` : ''}: ${qs.length}q\n`);
      } catch (e) {
        console.warn(`  R${t.round}/${t.subType} generation failed: ${e.message}`);
      }
    }
  }
  // Restore default so a later import in the same process isn't left toggled.
  setQualityRulesEnabled(true);
  delete process.env.VERIFY_LLM_QUESTIONS;

  console.log(`\nJudging ${records.length} questions with ${args.judgeModel}...`);
  let done = 0;
  for (const rec of records) {
    rec.score = await judgeQuestion(judge, args.judgeModel, rec.question);
    if (++done % 10 === 0) process.stdout.write(`  judged ${done}/${records.length}\n`);
  }

  const byArm = {
    baseline: aggregate(records.filter((r) => r.arm === 'baseline')),
    treatment: aggregate(records.filter((r) => r.arm === 'treatment')),
  };

  const timestamp = new Date().toISOString();
  const stamp = timestamp.replace(/[:.]/g, '-');
  const meta = { timestamp, stamp, judgeModel: args.judgeModel, samples: args.samples, rounds: args.rounds, seed: args.seed };
  const outDir = path.resolve(args.out);
  fs.mkdirSync(outDir, { recursive: true });

  const scorecardMd = scorecardMarkdown(byArm, meta);
  const { md: reviewMd, key } = blindReviewMarkdown(records, mulberry32(args.seed), meta);

  const files = {
    scorecardJson: path.join(outDir, `scorecard-${stamp}.json`),
    scorecardMd: path.join(outDir, `scorecard-${stamp}.md`),
    blindReviewMd: path.join(outDir, `blind-review-${stamp}.md`),
    answerKeyJson: path.join(outDir, `answer-key-${stamp}.json`),
  };
  fs.writeFileSync(files.scorecardJson, JSON.stringify({ meta, byArm, records }, null, 2));
  fs.writeFileSync(files.scorecardMd, scorecardMd);
  fs.writeFileSync(files.blindReviewMd, reviewMd);
  fs.writeFileSync(files.answerKeyJson, JSON.stringify({ meta, key }, null, 2));

  console.log('\n===== A/B SCORECARD (LLM judge) =====');
  console.log(scorecardMd.split('\n').slice(6).join('\n'));
  console.log('Files written:');
  for (const [k, v] of Object.entries(files)) console.log(`  ${k}: ${path.relative(process.cwd(), v)}`);
  console.log('\nNext: open the blind-review sheet, rate the questions, then check the answer key to see which arm you preferred.');
}

main().catch((e) => { console.error(e); process.exit(1); });
