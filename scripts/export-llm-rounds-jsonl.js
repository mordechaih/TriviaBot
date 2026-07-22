/**
 * Export LLM rounds from data/llm-rounds.db to JSONL files under data/llm-train/.
 * One file per round number (round2.jsonl, round5.jsonl, round7.jsonl). These
 * files are the committed artifact consumed by lib/few-shot-examples.js at
 * generation time.
 *
 * Run: node scripts/export-llm-rounds-jsonl.js  (or: npm run refresh-llm-train)
 */
import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';

const DB_PATH = './data/llm-rounds.db';
const OUT_DIR = './data/llm-train';
const EXPORT_ROUNDS = new Set([2, 5, 7]);

const EXPORT_QUERY = `
  SELECT
    r.round_number AS round_number,
    r.round_type   AS round_type,
    r.sub_type     AS sub_type,
    q.clue         AS clue,
    q.answer       AS answer,
    q.actual_number AS actual_number,
    q.target_number AS target_number,
    q.over_under   AS over_under,
    q.extra_json   AS extra_json,
    s.source_file  AS source_file
  FROM llm_questions q
  JOIN llm_rounds r      ON q.llm_round_id = r.id
  LEFT JOIN source_games s ON r.source_game_id = s.id
  ORDER BY r.round_number, r.id, q.ordinal
`;

function ensureOutDir() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log(`Created ${OUT_DIR}`);
  }
}

/** Build a record object, omitting null/undefined columns. */
function rowToRecord(columns, values) {
  const record = {};
  columns.forEach((col, i) => {
    const v = values[i];
    if (v !== null && v !== undefined) record[col] = v;
  });
  return record;
}

async function main() {
  if (!fs.existsSync(DB_PATH) || !fs.statSync(DB_PATH).isFile()) {
    console.error(`DB not found: ${path.resolve(DB_PATH)}. Run: npm run ingest-llm-rounds`);
    process.exit(1);
  }

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  try {
    const result = db.exec(EXPORT_QUERY);
    ensureOutDir();

    if (!result.length || !result[0].values.length) {
      console.log('No rows in llm_questions — nothing to export.');
      return;
    }

    const { columns, values } = result[0];
    const byRound = new Map();
    for (const valueRow of values) {
      const record = rowToRecord(columns, valueRow);
      const n = Number(record.round_number);
      if (!EXPORT_ROUNDS.has(n)) continue;
      if (!byRound.has(n)) byRound.set(n, []);
      byRound.get(n).push(record);
    }

    let total = 0;
    for (const [roundNum, records] of byRound) {
      const outPath = path.join(OUT_DIR, `round${roundNum}.jsonl`);
      const lines = records.map((r) => JSON.stringify(r)).join('\n');
      fs.writeFileSync(outPath, lines ? lines + '\n' : '', 'utf8');
      console.log(`Wrote ${records.length} rows to ${outPath}`);
      total += records.length;
    }
    if (total === 0) console.log('No rows for rounds 2, 5, or 7.');
  } finally {
    db.close();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
