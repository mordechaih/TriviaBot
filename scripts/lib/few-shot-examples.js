/**
 * Loads the exported example rounds (data/llm-train/round{2,5,7}.jsonl) and
 * turns them into few-shot exemplar blocks that are injected into the LLM round
 * prompts in generate-game.js. This is the consumer that closes the ingest →
 * export → generate loop: hand-authored games teach the generator the target
 * style, difficulty, and topic mix for each round/subtype.
 *
 * Regenerate the JSONL after editing example games with:
 *   npm run refresh-llm-train
 *
 * Everything here degrades gracefully: if the JSONL is missing or empty, the
 * exemplar block is an empty string and generation proceeds unchanged.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRAIN_DIR = path.resolve(__dirname, '..', '..', 'data', 'llm-train');

/** Test hook: override the training-data directory for isolation. */
let _trainDirOverride = null;
export function setTrainDirForTesting(dir) { _trainDirOverride = dir; }
export function clearTrainDirForTesting() { _trainDirOverride = null; }

function trainDir() { return _trainDirOverride || TRAIN_DIR; }

/** Read and JSON-parse one round's JSONL, tolerating a missing file. */
function loadRoundRecords(roundNumber) {
  const file = path.join(trainDir(), `round${roundNumber}.jsonl`);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter((r) => r && r.clue && r.answer);
}

/** Fisher-Yates shuffle using an injectable RNG (for deterministic tests). */
function shuffle(arr, random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick up to `count` example records for a round (and subtype, when relevant).
 * For rounds 5/7, only examples whose sub_type matches are used so a "who-am-i"
 * exemplar never leaks into a "size-matters" prompt.
 */
export function selectExamples(roundNumber, { subType = null, count = 3, random = Math.random } = {}) {
  let records = loadRoundRecords(roundNumber);
  if (subType) records = records.filter((r) => r.sub_type === subType);
  // Over/Under exemplars are only useful with a real numeric answer; drop
  // malformed source rows that parsed without one.
  if (roundNumber === 2) records = records.filter((r) => Number.isFinite(r.actual_number));
  return shuffle(records, random).slice(0, count);
}

/** Format one record as a single exemplar line, tailored to the round shape. */
function formatRecord(roundNumber, r) {
  if (roundNumber === 2) {
    const actual = r.actual_number ?? r.answer;
    const target = r.target_number != null ? `, target ${r.target_number}` : '';
    const ou = r.over_under ? ` [${r.over_under}]` : '';
    return `- "${r.clue}" → actual ${actual}${target}${ou}`;
  }
  return `- Q: "${r.clue}" → A: ${r.answer}`;
}

/**
 * Build a ready-to-inject exemplar block for a prompt, or '' when no examples
 * exist. The returned string starts with a newline so it can be appended
 * directly to an existing prompt.
 */
export function buildFewShotBlock(roundNumber, { subType = null, count = 3, random = Math.random } = {}) {
  const examples = selectExamples(roundNumber, { subType, count, random });
  if (examples.length === 0) return '';
  const lines = examples.map((r) => formatRecord(roundNumber, r)).join('\n');
  return `\nReal examples from past games of this exact format — match their style, difficulty, and topic variety, but do NOT reuse or lightly reword them:\n${lines}\n`;
}
