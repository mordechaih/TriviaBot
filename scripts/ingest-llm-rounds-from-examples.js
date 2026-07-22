/**
 * Ingest LLM rounds (2, 5, 7) from example game markdown under example games/
 * into data/llm-rounds.db. Idempotent by source_file.
 *
 * Parsing is done against a real markdown token stream (via `marked`) rather
 * than ad-hoc regex, which fixes a class of silent extraction bugs — notably
 * that the first question of every round lives in a table's HEADER row, which
 * the old line-based parser skipped entirely.
 *
 * Subtypes are normalized to the canonical labels in lib/round-subtypes.js so
 * the ingested data lines up with what generate-game.js actually generates.
 *
 * Every run prints a per-file extraction report (rounds, questions, and any
 * dropped/low-confidence rows) so silent data loss surfaces immediately.
 *
 * Run: node scripts/ingest-llm-rounds-from-examples.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import initSqlJs from 'sql.js';
import { matchSubType, SUBTYPE_LABELS } from './lib/round-subtypes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const EXAMPLE_GAMES_DIR = path.join(PROJECT_ROOT, 'example games');
const DB_PATH = path.join(PROJECT_ROOT, 'data', 'llm-rounds.db');

const TARGET_ROUNDS = new Set([2, 5, 7]);
// Matches "Round 2 –", "# Round 5 -", "Round 7:" at the start of any block's text.
const ROUND_HEADER_RE = /^#*\s*Round\s*(\d+)\s*[–\-:]/i;
// Over/Under answer marker, e.g. "Over (7)" / "Under (78)".
const OVER_UNDER_RE = /\b(Over|Under)\s*\(([^)]+)\)/i;
// Target number in an over/under clue: the last "– N" before the Over/Under
// marker, tolerating trailing junk after it (e.g. "... – 80 !" or "– 57 Born…").
const TARGET_NUMBER_RE = /[–\-]\s*([\d][\d,.]*)[^–\-]*$/;

const ROUND_TYPE_LABEL = {
  2: 'Over/Under',
  5: 'Game Show Style',
  7: 'Mixing Things Up',
};

/** Recursively find every .md file under a directory. */
function discoverMarkdownFiles(dir, baseDir = dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      discoverMarkdownFiles(full, baseDir, acc);
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
      acc.push({ absolute: full, relative: path.relative(baseDir, full).split(path.sep).join('/') });
    }
  }
  return acc;
}

/** Normalize whitespace and strip HTML tags, URLs, and stray markdown markers. */
function tidy(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')          // raw HTML tags (<p>, <br>, etc.)
    .replace(/https?:\/\/\S+/g, ' ')   // bare URLs
    .replace(/\s+/g, ' ')
    .replace(/^[\s|•\-–*]+/, '')
    .replace(/\s*\*+\s*$/, '')
    .trim();
}

/**
 * Walk the inline tokens of a table cell, separating the bold answer from the
 * clue and discarding links. Returns { clue, answer, hadBold }.
 */
function splitCellTokens(tokens) {
  const clueParts = [];
  const boldParts = [];
  for (const t of tokens || []) {
    if (t.type === 'strong') {
      boldParts.push(tidy(t.text));
    } else if (t.type === 'link' || t.type === 'image') {
      // drop URLs entirely
    } else if (t.type === 'em') {
      clueParts.push(tidy(t.text));
    } else {
      // text / escape / codespan / br etc.
      const raw = (t.text ?? t.raw ?? '').replace(/https?:\/\/\S+/g, '');
      clueParts.push(raw);
    }
  }
  return {
    clue: tidy(clueParts.join(' ')),
    answer: tidy(boldParts.join(' ')),
    hadBold: boldParts.length > 0,
  };
}

function toNumber(s) {
  const n = parseFloat(String(s).replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Turn one table cell into a question record for the given round.
 * Works from the link-stripped token text so URL/markdown residue never leaks
 * into a clue. Returns { question, dropped: reason|null }.
 */
function parseCell(cell, roundNumber) {
  const { clue: tokenClue, answer: boldAnswer, hadBold } = splitCellTokens(cell.tokens);
  const base = tidy(tokenClue);
  if (!base && !boldAnswer) return { question: null, dropped: 'empty cell' };

  if (roundNumber === 2) {
    // Format: "clue – TARGET   Over/Under (ACTUAL)". The "Over/Under (n)" answer
    // may be plain OR bold, so reconstruct the full cell from both parts.
    const full = tidy([tokenClue, boldAnswer].filter(Boolean).join(' '));
    const m = full.match(OVER_UNDER_RE);
    if (!m) return { question: null, dropped: 'no Over/Under marker' };
    const overUnder = /over/i.test(m[1]) ? 'Over' : 'Under';
    const actualNumber = toNumber(m[2]);
    const beforeMarker = full.slice(0, m.index);
    const tm = beforeMarker.match(TARGET_NUMBER_RE);
    const targetNumber = tm ? toNumber(tm[1]) : null;
    const clue = tidy(tm ? beforeMarker.slice(0, tm.index) : beforeMarker).replace(/[\s\-–—:]+$/, '');
    return {
      question: {
        clue,
        answer: `${overUnder} (${actualNumber ?? ''})`,
        actualNumber,
        targetNumber,
        overUnder,
        lowConfidence: actualNumber == null || !clue,
      },
      dropped: null,
    };
  }

  if (hadBold && boldAnswer) {
    return { question: { clue: base, answer: boldAnswer, lowConfidence: !base }, dropped: null };
  }
  const text = base;

  // Declarative True/False statements (To Tell the Truth) carry a trailing,
  // often non-bold "True"/"False" answer with no question mark.
  const tf = text.match(/\b(True|False)\b\s*(\([^)]*\))?\s*$/i);
  if (tf && tf.index > 0) {
    return { question: { clue: tidy(text.slice(0, tf.index)), answer: tidy(tf[0]), lowConfidence: false }, dropped: null };
  }

  // Otherwise best-effort split on the sentence-final "?" so at least the clue
  // is clean. Flag as low confidence so the report can surface it.
  const qMark = text.lastIndexOf('?');
  if (qMark !== -1 && qMark < text.length - 1) {
    const guessAnswer = tidy(text.slice(qMark + 1));
    if (guessAnswer) {
      return { question: { clue: tidy(text.slice(0, qMark + 1)), answer: guessAnswer, lowConfidence: true }, dropped: null };
    }
  }
  return { question: null, dropped: 'no discernible answer' };
}

/** Extract questions from every table token in a round's token slice. */
function extractQuestions(tokens, roundNumber) {
  const questions = [];
  const drops = [];
  for (const t of tokens) {
    if (t.type !== 'table') continue;
    // A table's header row holds the FIRST question; rows hold the rest.
    const cells = [...t.header, ...t.rows.flat()];
    for (const cell of cells) {
      const { question, dropped } = parseCell(cell, roundNumber);
      if (question && (question.clue || question.answer)) questions.push(question);
      else if (dropped) drops.push(dropped);
    }
  }
  return { questions, drops };
}

/** Text of a token, used for round-header and subtype detection. */
function tokenText(t) {
  return (t.text ?? t.raw ?? '').toString();
}

/**
 * Split a token stream into round sections. Round headers can be markdown
 * headings OR plain paragraphs (some example games drop the leading '#'), so we
 * scan every top-level token's text for the "Round N" marker.
 */
function extractSections(tokens) {
  const sections = [];
  let current = null;
  for (const t of tokens) {
    const m = tokenText(t).match(ROUND_HEADER_RE);
    if (m) {
      if (current) sections.push(current);
      current = { roundNumber: parseInt(m[1], 10), headerText: tokenText(t), tokens: [] };
    } else if (current) {
      current.tokens.push(t);
    }
  }
  if (current) sections.push(current);
  return sections.filter((s) => TARGET_ROUNDS.has(s.roundNumber));
}

/** First paragraph text of a section, stored as the instructions snippet. */
function introSnippet(section) {
  const para = section.tokens.find((t) => t.type === 'paragraph');
  return para ? tidy(tokenText(para)).slice(0, 500) : null;
}

/**
 * All prose that precedes the first table in a section, joined together. The
 * subtype-announcing sentence ("This week we're playing Who Am I") is often not
 * the first paragraph — a generic preamble comes first — so subtype matching
 * scans everything up to the questions.
 */
function subtypeHintText(section) {
  const parts = [];
  for (const t of section.tokens) {
    if (t.type === 'table') break;
    if (t.type === 'paragraph' || t.type === 'list' || t.type === 'heading') {
      parts.push(tidy(tokenText(t)));
    }
  }
  return parts.join(' ');
}

/** Parse a single markdown file into structured rounds + a per-file report. */
function parseFile(absolutePath, relativePath) {
  const content = fs.readFileSync(absolutePath, 'utf8');
  const tokens = marked.lexer(content);
  const rounds = [];
  const report = { file: relativePath, rounds: [], warnings: [] };

  for (const section of extractSections(tokens)) {
    const { roundNumber } = section;
    const { questions, drops } = extractQuestions(section.tokens, roundNumber);
    const intro = introSnippet(section);

    let subType = null;
    if (roundNumber === 5 || roundNumber === 7) {
      const hint = subtypeHintText(section);
      subType = matchSubType(hint, roundNumber);
      if (!subType) {
        report.warnings.push(
          `round ${roundNumber}: unrecognized subtype hint "${hint.slice(0, 60)}" — stored as null`
        );
      }
    }

    const lowConf = questions.filter((q) => q.lowConfidence).length;
    report.rounds.push({
      roundNumber,
      subType: subType ? SUBTYPE_LABELS[subType] : null,
      questions: questions.length,
      dropped: drops.length,
      lowConfidence: lowConf,
    });
    for (const d of drops) report.warnings.push(`round ${roundNumber}: dropped a cell (${d})`);

    rounds.push({
      roundNumber,
      roundType: ROUND_TYPE_LABEL[roundNumber],
      subType,
      subTypeRaw: intro,
      instructionsSnippet: intro,
      questions,
    });
  }
  return { sourceFile: relativePath, rounds, report };
}

// ---- Persistence ---------------------------------------------------------

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

function lastInsertId(db) {
  return db.exec('SELECT last_insert_rowid()')[0].values[0][0];
}

function insertGame(db, parsed, now) {
  deleteBySourceFile(db, parsed.sourceFile);
  db.run('INSERT INTO source_games (source_file, ingested_at) VALUES (?, ?)', [parsed.sourceFile, now]);
  const sourceGameId = lastInsertId(db);
  for (const r of parsed.rounds) {
    db.run(
      `INSERT INTO llm_rounds (source_game_id, round_number, round_type, sub_type, sub_type_raw, instructions_snippet)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sourceGameId, r.roundNumber, r.roundType, r.subType ?? null, r.subTypeRaw ?? null, r.instructionsSnippet ?? null]
    );
    const llmRoundId = lastInsertId(db);
    r.questions.forEach((q, ordinal) => {
      db.run(
        `INSERT INTO llm_questions (llm_round_id, ordinal, clue, answer, actual_number, target_number, over_under, extra_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          llmRoundId,
          ordinal,
          q.clue || null,
          q.answer || null,
          q.actualNumber ?? null,
          q.targetNumber ?? null,
          q.overUnder ?? null,
          null,
        ]
      );
    });
  }
}

/** Print the per-file extraction report to stderr. */
function printReport(reports) {
  console.error('\n── Extraction report ──');
  for (const rep of reports) {
    const summary = rep.rounds
      .map((r) => {
        const st = r.subType ? ` ${r.subType}` : '';
        const flags = [r.dropped ? `${r.dropped} dropped` : '', r.lowConfidence ? `${r.lowConfidence} low-conf` : '']
          .filter(Boolean)
          .join(', ');
        return `R${r.roundNumber}${st}: ${r.questions}q${flags ? ` (${flags})` : ''}`;
      })
      .join(' · ');
    console.error(`  ${rep.file}\n    ${summary || '(no target rounds)'}`);
    for (const w of rep.warnings) console.error(`    ⚠ ${w}`);
  }
  console.error('───────────────────────\n');
}

async function main() {
  const files = discoverMarkdownFiles(EXAMPLE_GAMES_DIR);
  console.error(`Found ${files.length} .md files under example games/`);

  const parsed = [];
  const reports = [];
  for (const { absolute, relative } of files) {
    try {
      const result = parseFile(absolute, relative);
      reports.push(result.report);
      if (result.rounds.length) parsed.push(result);
    } catch (err) {
      console.error(`Parse error ${relative}:`, err.message);
      reports.push({ file: relative, rounds: [], warnings: [`parse error: ${err.message}`] });
    }
  }

  ensureDataDir();
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.existsSync(DB_PATH) ? fs.readFileSync(DB_PATH) : undefined);
  createSchema(db);

  // Timestamp is passed in once so a single run is internally consistent.
  const now = new Date().toISOString();
  for (const p of parsed) insertGame(db, p, now);

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  db.close();

  printReport(reports);
  const totalRounds = parsed.reduce((s, p) => s + p.rounds.length, 0);
  const totalQuestions = parsed.reduce((s, p) => s + p.rounds.reduce((t, r) => t + r.questions.length, 0), 0);
  console.log(`Ingested ${parsed.length} files, ${totalRounds} rounds, ${totalQuestions} questions → ${DB_PATH}`);
}

// Only run when invoked directly, so tests can import the parser helpers.
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { parseFile, parseCell, extractSections, extractQuestions };
