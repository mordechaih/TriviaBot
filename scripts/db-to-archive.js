import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';

const DB_CANDIDATES = ['./data/clues.db', './clues.db'];
const OUTPUT_PATH = './data/archive-backup.json';

function pickDbPath() {
  for (const candidate of DB_CANDIDATES) {
    if (!fs.existsSync(candidate)) continue;
    try {
      if (fs.statSync(candidate).isDirectory()) continue;
    } catch {
      continue;
    }
    return candidate;
  }
  const tried = DB_CANDIDATES.map((c) => path.resolve(c)).join(', ');
  throw new Error(`Could not find clues.db. Tried: ${tried}`);
}

function tableExists(db, tableName) {
  const result = db.exec(
    `SELECT 1 FROM sqlite_master WHERE type='table' AND name='${tableName}'`
  );
  return result.length > 0 && result[0].values.length > 0;
}

function tableColumns(db, tableName) {
  const result = db.exec(`PRAGMA table_info(${tableName})`);
  if (!result.length) return [];
  const names = result[0].values.map((row) => row[1]);
  return names;
}

function chooseColumn(columns, candidates, label) {
  const found = candidates.find((candidate) => columns.includes(candidate));
  if (!found) {
    throw new Error(`Missing ${label} column. Tried: ${candidates.join(', ')}`);
  }
  return found;
}

function indexByColumn(columns, rowValues) {
  const obj = {};
  columns.forEach((column, index) => {
    obj[column] = rowValues[index];
  });
  return obj;
}

function normalizeRound(roundValue) {
  const roundNumber = Number(roundValue);
  if (roundNumber === 1) return 'Jeopardy';
  if (roundNumber === 2) return 'Double Jeopardy';
  if (roundNumber === 3) return 'Final Jeopardy';
  return 'Jeopardy';
}

function normalizeValue(roundName, rawValue) {
  if (roundName === 'Final Jeopardy') {
    return 0;
  }
  return Number(rawValue) || 0;
}

/** Detect if DB uses jeopardy-parser schema (clues, airdates, categories tables). */
function isJeopardyParserSchema(db) {
  if (!tableExists(db, 'clues') || !tableExists(db, 'airdates')) return false;
  const clueCols = tableColumns(db, 'clues');
  return (
    clueCols.includes('game') &&
    clueCols.includes('round') &&
    clueCols.includes('value')
  );
}

async function main() {
  const dbPath = pickDbPath();
  const SQL = await initSqlJs();

  let db;
  try {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } catch (error) {
    throw new Error(`Failed to load SQLite database at ${dbPath}: ${error.message}`);
  }

  try {
    const documentColumns = tableColumns(db, 'documents');
    if (documentColumns.length === 0) {
      throw new Error('Missing or empty table: documents.');
    }

    let rows;

    if (isJeopardyParserSchema(db)) {
      if (!tableExists(db, 'classifications') || !tableExists(db, 'categories')) {
        throw new Error(
          'jeopardy-parser schema requires classifications and categories tables.'
        );
      }
      rows = db.exec(`
        SELECT
          cl.id AS clue_id,
          d.clue AS clue,
          d.answer AS answer,
          cl.round AS round_num,
          cl.game AS game_num,
          cat.category AS category_name,
          cl.value AS clue_value,
          a.airdate AS air_date
        FROM clues cl
        JOIN documents d ON cl.id = d.id
        JOIN classifications c ON cl.id = c.clue_id
        JOIN categories cat ON c.category_id = cat.id
        LEFT JOIN airdates a ON cl.game = a.game
      `);
      if (rows.length) {
        console.warn('Schema: jeopardy-parser (clues + documents + classifications + categories + airdates)');
      }
    } else {
      const classificationColumns = tableColumns(db, 'classifications');
      if (classificationColumns.length === 0) {
        throw new Error(
          'Missing or empty table: classifications. Expected jeopardy-parser schema (clues, airdates) or unified schema (documents + classifications).'
        );
      }

      const docIdCol = chooseColumn(documentColumns, ['id'], 'documents.id');
      const clueCol = chooseColumn(documentColumns, ['clue', 'question', 'text'], 'documents clue');
      const answerCol = chooseColumn(documentColumns, ['answer', 'response'], 'documents answer');
      const clueIdCol = chooseColumn(classificationColumns, ['clue_id', 'document_id', 'doc_id'], 'classifications clue ref');
      const roundCol = chooseColumn(classificationColumns, ['round', 'round_id'], 'classifications round');

      const gameCol = classificationColumns.includes('game')
        ? 'game'
        : (classificationColumns.includes('game_id') ? 'game_id' : null);
      const categoryCol = classificationColumns.includes('category') ? 'category' : null;
      const valueCol = classificationColumns.includes('value')
        ? 'value'
        : (classificationColumns.includes('dollar_value') ? 'dollar_value' : null);
      const airDateCol = classificationColumns.includes('air_date')
        ? 'air_date'
        : (classificationColumns.includes('airdate') ? 'airdate' : null);

      const query = `
        SELECT
          d.${docIdCol} AS clue_id,
          d.${clueCol} AS clue,
          d.${answerCol} AS answer,
          c.${roundCol} AS round_num
          ${gameCol ? `, c.${gameCol} AS game_num` : ''}
          ${categoryCol ? `, c.${categoryCol} AS category_name` : ''}
          ${valueCol ? `, c.${valueCol} AS clue_value` : ''}
          ${airDateCol ? `, c.${airDateCol} AS air_date` : ''}
        FROM classifications c
        JOIN documents d
          ON c.${clueIdCol} = d.${docIdCol}
      `;

      rows = db.exec(query);
      if (rows.length) {
        console.warn('Schema: unified (documents + classifications)');
      }
    }
    if (!rows.length) {
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify([], null, 2));
      console.warn(`No rows found in ${dbPath}. Wrote empty archive to ${OUTPUT_PATH}`);
      return;
    }

    const [{ columns, values }] = rows;
    const archive = values
      .map((valueRow) => indexByColumn(columns, valueRow))
      .filter((row) => row.clue && row.answer)
      .map((row) => {
        const roundName = normalizeRound(row.round_num);
        const gameNum = row.game_num ?? row.clue_id;
        return {
          clue: String(row.clue).trim(),
          answer: String(row.answer).trim(),
          category: row.category_name ? String(row.category_name).trim() : 'Unknown',
          gameId: `game-${gameNum}`,
          value: normalizeValue(roundName, row.clue_value),
          round: roundName,
          airDate: row.air_date || null
        };
      });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(archive, null, 2));
    console.log(`Wrote ${archive.length} clues to ${OUTPUT_PATH}`);
  } catch (error) {
    throw new Error(`Failed to convert clues.db: ${error.message}`);
  } finally {
    if (db) db.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
