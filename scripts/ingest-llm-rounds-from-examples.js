/**
 * Ingest LLM rounds (2, 5, 7) from example game markdown under example games/
 * into data/llm-rounds.db. Idempotent by source_file.
 *
 * Run: node scripts/ingest-llm-rounds-from-examples.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const EXAMPLE_GAMES_DIR = path.join(PROJECT_ROOT, 'example games');
const DB_PATH = path.join(PROJECT_ROOT, 'data', 'llm-rounds.db');

const ROUND_HEADER_RE = /^#?\s*Round\s*([257])\s*[–\-:]/im;
const TARGET_ROUNDS = new Set([2, 5, 7]);

const TABLE_SEP_RE = /^\|[\s\-:|\s]+\|/m;
const TABLE_ROW_RE = /^\|(.+)\|$/m;
const HEADER_ROW_HASH = /^\s*\|\s*#\s*\|\s*$/;

const OVER_UNDER_RE = /(?:Over|Under)\s*\(([^)]+)\)/i;
const TARGET_NUMBER_RE = /[–\-]\s*(\d[\d,.\s]*)\s*$/m;
const BOLD_RE = /\*\*([^*]+)\*\*/g;
const LINK_RE = /\[([^\]]*)\]\([^)]*\)|<[^>\s]+[^>]*>|https?:\/\/[^\s)\]]+/gi;

/**
 * Clean clue text for storage: remove leading table/list symbols and trailing markdown/artifact punctuation.
 * (Clues can be cleaned more aggressively than answers per project rules.)
 */
function cleanClueForIngest(text) {
  if (!text || typeof text !== 'string') return '';
  let t = text
    .replace(/\s+/g, ' ')
    // Leading: pipe, bullet, dash, en-dash, asterisks, tab
    .replace(/^[\s|\-\u2013•\t*]+/, '')
    // Trailing: orphan asterisks and artifact punctuation (e.g. "clue**" or "clue**!")
    .replace(/\s*\*+\s*[!?]*\s*$/, '')
    .replace(/\s+$/, '')
    .trim();
  return t;
}

/**
 * Clean answer text for storage (gentler: trim and strip only leading/trailing markdown bold).
 */
function cleanAnswerForIngest(text) {
  if (!text || typeof text !== 'string') return '';
  let t = text.replace(/\s+/g, ' ').trim();
  t = t.replace(/^\*+/, '').replace(/\*+$/, '').trim();
  return t;
}

const SUBTYPE_PATTERNS = [
  { re: /To Tell the Truth/i, subType: 'To Tell the Truth' },
  { re: /Name that tune|Name That Tune/i, subType: 'Name That Tune' },
  { re: /Who Wants to be a Millionaire|Millionaire/i, subType: 'Millionaire' },
  { re: /Family Feud/i, subType: 'Family Feud' },
  { re: /Who am I\??/i, subType: 'Who am I' },
  { re: /Size matters/i, subType: 'Size matters' },
  { re: /spelling bee/i, subType: 'Spelling Bee' },
  { re: /masked singer/i, subType: 'Masked Singer' },
  { re: /Rapper or Senator|reliving the 80/i, subType: null },
];

function discoverMarkdownFiles(dir, baseDir = dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(baseDir, full);
    const normalizedRel = rel.split(path.sep).join('/');
    if (e.isDirectory()) {
      discoverMarkdownFiles(full, baseDir, acc);
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      acc.push({ absolute: full, relative: normalizedRel });
    }
  }
  return acc;
}

function stripLinks(text) {
  return String(text)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<(?!br\s*\/?)[^>]+>/gi, '')
    .replace(/https?:\/\/[^\s)\]]+/gi, '')
    .trim();
}

function extractBoldJoined(text) {
  const segments = [];
  let m;
  const re = /\*\*([^*]+)\*\*/g;
  while ((m = re.exec(text)) !== null) segments.push(m[1].trim());
  if (segments.length === 0) return null;
  return segments.join("'").replace(/"'/g, "'").replace(/'"/g, "'").trim();
}

function parseOverUnder(text) {
  const match = text.match(OVER_UNDER_RE);
  if (!match) return { overUnder: null, actualNumber: null };
  const overUnder = text.toLowerCase().startsWith('over') ? 'Over' : 'Under';
  const actualStr = match[1].replace(/,/g, '').trim();
  const num = parseFloat(actualStr);
  return { overUnder, actualNumber: Number.isFinite(num) ? num : null };
}

function extractTargetNumber(clue) {
  const m = clue.match(TARGET_NUMBER_RE);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function parseTableCell(cell, roundNumber) {
  let raw = String(cell)
    .replace(/<p>\s*/gi, ' ')
    .replace(/\s*<\/p>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '<br>')
    .trim();
  const parts = raw.split('<br>').map((p) => stripLinks(p).trim()).filter(Boolean);
  raw = stripLinks(raw.replace(/<br\s*\/?>/gi, ' '));

  let clue = '';
  let answer = '';
  let actualNumber = null;
  let targetNumber = null;
  let overUnder = null;

  if (roundNumber === 2) {
    const ou = parseOverUnder(raw);
    overUnder = ou.overUnder;
    actualNumber = ou.actualNumber;
    targetNumber = extractTargetNumber(raw);
  }

  if (roundNumber === 2 && overUnder && parts.length >= 1) {
    const firstPart = parts[0];
    const rest = parts.slice(1).join(' ');
    const bold = extractBoldJoined(raw) || extractBoldJoined(rest) || rest;
    clue = stripLinks(firstPart).replace(OVER_UNDER_RE, '').trim();
    answer = bold || (rest || firstPart);
    return { clue, answer, actualNumber, targetNumber, overUnder };
  }

  const bold = extractBoldJoined(raw);
  if (bold) {
    if (parts.length >= 2) {
      clue = parts[0];
      answer = bold;
    } else {
      const beforeBold = raw.replace(/\*\*[^*]+\*\*/g, '').replace(/\*\*/g, '').trim();
      clue = beforeBold || raw.replace(/\*\*([^*]+)\*\*/g, '').trim();
      answer = bold;
    }
  } else {
    if (parts.length >= 2) {
      clue = parts[0];
      answer = parts[parts.length - 1];
    } else if (parts.length === 1) {
      clue = '';
      answer = parts[0];
    }
  }

  if (roundNumber === 2 && !overUnder) {
    const ou = parseOverUnder(raw);
    overUnder = ou.overUnder;
    actualNumber = ou.actualNumber;
    targetNumber = extractTargetNumber(raw);
  }

  return { clue: clue.trim(), answer: answer.trim(), actualNumber, targetNumber, overUnder };
}

function extractSections(content) {
  const sections = [];
  const roundRe = /^#?\s*Round\s*([257])\s*[–\-:][^\n]*/gim;
  let m;
  while ((m = roundRe.exec(content)) !== null) {
    const roundNum = parseInt(m[1], 10);
    if (!TARGET_ROUNDS.has(roundNum)) continue;
    const start = m.index;
    const currentMatchLen = m[0].length;
    const tail = content.slice(start + currentMatchLen);
    const nextRoundRe = /^#?\s*Round\s*\d\s*[–\-:][^\n]*/gim;
    nextRoundRe.lastIndex = 0;
    let nextMatch;
    let nextStart = -1;
    while ((nextMatch = nextRoundRe.exec(tail)) !== null) {
      nextStart = nextMatch.index;
      break;
    }
    const end = nextStart === -1 ? content.length : start + currentMatchLen + nextStart;
    const body = content.slice(start, end);
    sections.push({ roundNumber: roundNum, body, start, end });
  }
  return sections;
}

function inferSubType(introText) {
  const raw = introText.slice(0, 500);
  for (const { re, subType } of SUBTYPE_PATTERNS) {
    if (re.test(raw)) return { subType: subType || raw.match(re)[0].trim(), subTypeRaw: raw.slice(0, 200).trim() };
  }
  const m = raw.match(/This week['']?s? (?:game show is|we are (?:doing|playing)|we're)\s*[^.?!]+[.?!]?/i)
    || raw.match(/Each week[^.]*\.\s*This week[^.]*\.?/is);
  return { subType: null, subTypeRaw: m ? m[0].trim() : raw.slice(0, 200).trim() };
}

function parseTableSection(body, roundNumber) {
  const lines = body.split(/\r?\n/);
  let sepIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (TABLE_SEP_RE.test(lines[i])) {
      sepIndex = i;
      break;
    }
  }
  if (sepIndex === -1) return [];
  const dataRows = lines.slice(sepIndex + 1).filter((l) => /^\|/.test(l) && !TABLE_SEP_RE.test(l));
  const questions = [];
  for (const row of dataRows) {
    const cellMatch = row.match(/^\|(.+)\|$/);
    if (!cellMatch) continue;
    const cell = cellMatch[1]
      .replace(/^\s*\|\s*/, '')
      .replace(/\s*\|\s*$/, '')
      .trim();
    if (!cell) continue;
    const q = parseTableCell(cell, roundNumber);
    if (q.clue || q.answer) questions.push(q);
  }
  return questions;
}

function parseNonTableSection(body, roundNumber) {
  const questions = [];
  const lines = body.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const looksLikeQuestion =
      trimmed.endsWith('?') ||
      /^[\-\d.]\s+/.test(trimmed) ||
      (/^[A-Z]/.test(trimmed) && trimmed.length > 20 && !trimmed.startsWith('**'));
    const hasBold = /\*\*[^*]+\*\*/.test(trimmed);
    const hasOverUnder = OVER_UNDER_RE.test(trimmed);
    if (looksLikeQuestion && (hasBold || hasOverUnder)) {
      const clue = trimmed.replace(/\*\*[^*]+\*\*/g, '').replace(/\*\*/g, '').trim();
      const bold = extractBoldJoined(trimmed);
      const ou = parseOverUnder(trimmed);
      let answer = bold || (ou.overUnder ? `${ou.overUnder} (${trimmed.match(OVER_UNDER_RE)?.[1] || ''})` : '');
      if (!answer && i + 1 < lines.length) {
        const next = lines[i + 1].trim();
        if (next.startsWith('**') || OVER_UNDER_RE.test(next)) {
          answer = extractBoldJoined(next) || next.replace(/\*\*/g, '').trim();
          i++;
        }
      }
      if (answer) {
        questions.push({
          clue,
          answer,
          actualNumber: roundNumber === 2 ? ou.actualNumber : null,
          targetNumber: roundNumber === 2 ? extractTargetNumber(trimmed) : null,
          overUnder: roundNumber === 2 ? ou.overUnder : null,
        });
      }
      i++;
      continue;
    }
    if (hasBold || hasOverUnder) {
      const clue = trimmed.replace(/\*\*[^*]+\*\*/g, '').replace(/\*\*/g, '').trim();
      const bold = extractBoldJoined(trimmed);
      const ou = parseOverUnder(trimmed);
      const answer = bold || (ou.overUnder ? `${ou.overUnder} (${trimmed.match(OVER_UNDER_RE)?.[1] || ''})` : '');
      if (answer && (clue || /^[A-Za-z]+:/.test(trimmed))) {
        questions.push({
          clue,
          answer,
          actualNumber: roundNumber === 2 ? ou.actualNumber : null,
          targetNumber: roundNumber === 2 ? extractTargetNumber(trimmed) : null,
          overUnder: roundNumber === 2 ? ou.overUnder : null,
        });
      }
    }
    i++;
  }
  return questions;
}

function getInstructionsSnippet(body) {
  const firstTableOrQuestion = body.search(/\|[^\n]*\|\s*\n\s*\|[\s\-:]+\|/m);
  const firstList = body.search(/^\s*[-*]\s+/m);
  let end = body.length;
  if (firstTableOrQuestion !== -1) end = Math.min(end, firstTableOrQuestion);
  if (firstList !== -1) end = Math.min(end, firstList);
  const intro = body.slice(0, end).replace(/^#?\s*Round\s*\d\s*[–\-:][^\n]*\n?/i, '').trim();
  return intro.slice(0, 500) || null;
}

function parseFile(absolutePath, relativePath) {
  const content = fs.readFileSync(absolutePath, 'utf8');
  const rounds = [];
  const sections = extractSections(content);
  for (const { roundNumber, body } of sections) {
    const hasTable = /^\|[\s\-:|]+\|$/m.test(body) || TABLE_SEP_RE.test(body);
    const questions = hasTable
      ? parseTableSection(body, roundNumber)
      : parseNonTableSection(body, roundNumber);
    const roundType =
      roundNumber === 2 ? 'Over/Under' : roundNumber === 5 ? 'Game Show Style' : 'Mixing Things Up';
    const instructionsSnippet = getInstructionsSnippet(body);
    let subType = null;
    let subTypeRaw = null;
    if (roundNumber === 5 || roundNumber === 7) {
      const inferred = inferSubType(instructionsSnippet || body.slice(0, 600));
      subType = inferred.subType;
      subTypeRaw = inferred.subTypeRaw;
    }
    rounds.push({
      roundNumber,
      roundType,
      subType,
      subTypeRaw,
      instructionsSnippet: instructionsSnippet || null,
      questions,
    });
  }
  return { sourceFile: relativePath, rounds };
}

function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function createSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS source_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_file TEXT UNIQUE NOT NULL,
      ingested_at TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS llm_rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_game_id INTEGER NOT NULL,
      round_number INTEGER NOT NULL,
      round_type TEXT NOT NULL,
      sub_type TEXT,
      sub_type_raw TEXT,
      instructions_snippet TEXT,
      FOREIGN KEY(source_game_id) REFERENCES source_games(id)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS llm_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      llm_round_id INTEGER NOT NULL,
      ordinal INTEGER NOT NULL,
      clue TEXT,
      answer TEXT,
      actual_number REAL,
      target_number REAL,
      over_under TEXT,
      extra_json TEXT,
      FOREIGN KEY(llm_round_id) REFERENCES llm_rounds(id)
    )
  `);
}

function deleteBySourceFile(db, sourceFile) {
  const stmt = db.prepare('SELECT id FROM source_games WHERE source_file = ?');
  stmt.bind([sourceFile]);
  if (!stmt.step()) {
    stmt.free();
    return;
  }
  const id = stmt.get()[0];
  stmt.free();
  db.run('DELETE FROM llm_questions WHERE llm_round_id IN (SELECT id FROM llm_rounds WHERE source_game_id = ?)', [id]);
  db.run('DELETE FROM llm_rounds WHERE source_game_id = ?', [id]);
  db.run('DELETE FROM source_games WHERE id = ?', [id]);
}

function insertGame(db, parsed) {
  const now = new Date().toISOString();
  deleteBySourceFile(db, parsed.sourceFile);
  db.run('INSERT INTO source_games (source_file, ingested_at) VALUES (?, ?)', [parsed.sourceFile, now]);
  const sourceIdRow = db.exec('SELECT last_insert_rowid()');
  const sourceGameId = sourceIdRow[0].values[0][0];
  for (const r of parsed.rounds) {
    db.run(
      `INSERT INTO llm_rounds (source_game_id, round_number, round_type, sub_type, sub_type_raw, instructions_snippet)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        sourceGameId,
        r.roundNumber,
        r.roundType,
        r.subType ?? null,
        r.subTypeRaw ?? null,
        r.instructionsSnippet ?? null,
      ]
    );
    const roundIdRow = db.exec('SELECT last_insert_rowid()');
    const llmRoundId = roundIdRow[0].values[0][0];
    r.questions.forEach((q, ordinal) => {
      const clue = cleanClueForIngest(q.clue ?? '');
      const answer = cleanAnswerForIngest(q.answer ?? '');
      db.run(
        `INSERT INTO llm_questions (llm_round_id, ordinal, clue, answer, actual_number, target_number, over_under, extra_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          llmRoundId,
          ordinal,
          clue || null,
          answer || null,
          q.actualNumber ?? null,
          q.targetNumber ?? null,
          q.overUnder ?? null,
          null,
        ]
      );
    });
  }
}

async function main() {
  const files = discoverMarkdownFiles(EXAMPLE_GAMES_DIR);
  console.error(`Found ${files.length} .md files under example games/`);
  const allParsed = [];
  for (const { absolute, relative } of files) {
    try {
      const parsed = parseFile(absolute, relative);
      if (parsed.rounds.length) allParsed.push(parsed);
    } catch (err) {
      console.error(`Parse error ${relative}:`, err.message);
    }
  }

  ensureDataDir();
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : undefined);
  createSchema(db);

  for (const p of allParsed) {
    insertGame(db, p);
  }

  const buf = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(buf));
  db.close();

  const totalRounds = allParsed.reduce((s, p) => s + p.rounds.length, 0);
  const totalQuestions = allParsed.reduce((s, p) => s + p.rounds.reduce((t, r) => t + r.questions.length, 0), 0);
  console.log(`Ingested ${allParsed.length} files, ${totalRounds} rounds, ${totalQuestions} questions → ${DB_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
