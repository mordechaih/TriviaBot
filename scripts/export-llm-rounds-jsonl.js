/**
 * Export LLM rounds from data/llm-rounds.db to JSONL files under data/llm-train/.
 * One file per round number (round2.jsonl, round5.jsonl, round7.jsonl).
 * Run: node scripts/export-llm-rounds-jsonl.js
 */

import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';

const DB_PATH = './data/llm-rounds.db';
const OUT_DIR = './data/llm-train';

function tableExists(db, tableName) {
  const result = db.exec(
    `SELECT 1 FROM sqlite_master WHERE type='table' AND name='${tableName}'`
  );
  return result.length > 0 && result[0].values.length > 0;
}

function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log(`Created ${OUT_DIR}`);
  }
}

function rowToRecord(columns, values) {
  const record = {};
  columns.forEach((col, i) => {
    const v = values[i];
    if (v !== null && v !== undefined) record[col] = v;
  });
  return record;
}

async function main() {
  const resolvedDb = path.resolve(DB_PATH);
  if (!fs.existsSync(DB_PATH) || !fs.statSync(DB_PATH).isFile()) {
    console.error(`DB not found or not a file: ${resolvedDb}`);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  let db;
  try {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } catch (err) {
    console.error(`Failed to load database: ${err.message}`);
    process.exit(1);
  }

  try {
    if (!tableExists(db, 'llm_questions') || !tableExists(db, 'llm_rounds')) {
      console.error('Database missing required tables: llm_questions, llm_rounds');
      process.exit(1);
    }

    // Join llm_questions -> llm_rounds -> source_games (optional) for round_number, round_type, sub_type, clue, answer, etc.
    const hasSourceGames = tableExists(db, 'source_games');
    const query = hasSourceGames
      ? `
        SELECT
          r.round_number AS round_number,
          r.round_type AS round_type,
          r.sub_type AS sub_type,
          q.clue AS clue,
          q.answer AS answer,
          q.actual_number AS actual_number,
          q.target_number AS target_number,
          q.over_under AS over_under,
          q.extra_json AS extra_json,
          s.source_file AS source_file
        FROM llm_questions q
        JOIN llm_rounds r ON q.llm_round_id = r.id
        LEFT JOIN source_games s ON r.source_game_id = s.id
      `
      : `
        SELECT
          r.round_number AS round_number,
          r.round_type AS round_type,
          r.sub_type AS sub_type,
          q.clue AS clue,
          q.answer AS answer,
          q.actual_number AS actual_number,
          q.target_number AS target_number,
          q.over_under AS over_under,
          q.extra_json AS extra_json,
          NULL AS source_file
        FROM llm_questions q
        JOIN llm_rounds r ON q.llm_round_id = r.id
      `;

    let rows;
    try {
      rows = db.exec(query);
    } catch (err) {
      // If FK column names differ, try without source_games and with common FK names
      const fallback = db.exec(`
        SELECT
          r.round_number AS round_number,
          r.round_type AS round_type,
          r.sub_type AS sub_type,
          q.clue AS clue,
          q.answer AS answer,
          q.actual_number AS actual_number,
          q.target_number AS target_number,
          q.over_under AS over_under,
          q.extra_json AS extra_json
        FROM llm_questions q
        JOIN llm_rounds r ON q.round_id = r.id
      `);
      rows = fallback;
      if (rows.length && rows[0].values.length) {
        const [{ columns }] = rows;
        if (!columns.includes('source_file')) {
          rows[0].columns = [...rows[0].columns, 'source_file'];
          rows[0].values = rows[0].values.map((v) => [...v, null]);
        }
      }
    }

    if (!rows.length || !rows[0].values.length) {
      console.log('No rows from llm_questions + llm_rounds.');
      ensureOutDir();
      return;
    }

    const [{ columns, values }] = rows;
    const byRound = new Map(); // round_number -> array of record objects

    for (const valueRow of values) {
      const record = rowToRecord(columns, valueRow);
      const roundNum = record.round_number;
      if (roundNum === undefined || roundNum === null) continue;
      const n = Number(roundNum);
      if (n !== 2 && n !== 5 && n !== 7) continue; // only export rounds 2, 5, 7
      if (!byRound.has(n)) byRound.set(n, []);
      // Output shape: { round_type, sub_type?, clue, answer, actual_number?, target_number?, over_under?, source_file?, ... }
      byRound.get(n).push(record);
    }

    ensureOutDir();

    for (const [roundNum, records] of byRound) {
      const filename = `round${roundNum}.jsonl`;
      const outPath = path.join(OUT_DIR, filename);
      const lines = records.map((r) => JSON.stringify(r)).join('\n');
      fs.writeFileSync(outPath, lines ? lines + '\n' : '', 'utf8');
      console.log(`Wrote ${records.length} rows to ${outPath}`);
    }

    const total = [...byRound.values()].reduce((s, arr) => s + arr.length, 0);
    if (total === 0) console.log('No rows for rounds 2, 5, or 7.');
  } finally {
    if (db) db.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
