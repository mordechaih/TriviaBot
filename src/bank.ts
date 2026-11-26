import { toQuestion, type Db, type Format, type Question, type QuestionData, type QuestionRow, type Status, type Topic } from "./db.ts";
import { variantFilter } from "./games.ts";
import { ROUNDS, describeVariant } from "./rounds.ts";

/** For themed rounds, `available` and `perGame` count themes rather than questions. */
export type StockLine = { label: string; available: number; perGame: number; rotating: boolean; themed: boolean };

/**
 * How many approved, unused questions each kind of slot has, next to how many one game uses.
 * Standard slots with the same filter are summed (rounds 1 and 3 both take easy questions).
 */
export function stockLevels(db: Db): StockLine[] {
  const lines = new Map<string, StockLine & { where: string; params: (string | number)[] }>();
  for (const def of ROUNDS) {
    for (const v of def.variants) {
      const { where, params } = variantFilter(v);
      const key = where + JSON.stringify(params);
      const existing = lines.get(key);
      const need = v.themed ? 1 : v.count;
      if (existing) existing.perGame += need;
      else
        lines.set(key, {
          label: v.themed
            ? `Themed round · ${(v.difficulty ?? []).map((d) => ["", "easy", "medium", "hard"][d]).join(" to ")}`
            : describeVariant(v),
          available: 0,
          perGame: need,
          rotating: def.variants.length > 1,
          themed: !!v.themed,
          where,
          params,
        });
    }
  }
  return [...lines.values()].map(({ where, params, ...line }) => {
    if (line.themed) {
      // Themed rounds are counted in themes: how many have enough questions left for a round.
      const { n } = db
        .query(`SELECT COUNT(*) AS n FROM (SELECT q.theme FROM questions q WHERE ${where} GROUP BY q.theme HAVING COUNT(*) >= 3)`)
        .get(...params) as { n: number };
      return { ...line, available: n };
    }
    const { n } = db.query(`SELECT COUNT(*) AS n FROM questions q WHERE ${where}`).get(...params) as { n: number };
    return { ...line, available: n };
  });
}

export function pendingCounts(db: Db): { format: Format; n: number }[] {
  return db.query("SELECT format, COUNT(*) AS n FROM questions WHERE status = 'pending' GROUP BY format ORDER BY n DESC").all() as {
    format: Format;
    n: number;
  }[];
}

/** The next pending question after `afterId` (wrapping around), optionally of one format. */
export function nextPending(db: Db, opts: { format?: Format; afterId?: number } = {}): Question | null {
  const formatClause = opts.format ? "AND format = $format" : "";
  const params = { format: opts.format ?? null, after: opts.afterId ?? 0 };
  const row = (db
    .query(`SELECT * FROM questions WHERE status = 'pending' AND id > $after ${formatClause} ORDER BY id LIMIT 1`)
    .get(params) ??
    db.query(`SELECT * FROM questions WHERE status = 'pending' ${formatClause} ORDER BY id LIMIT 1`).get(params)) as QuestionRow | null;
  return row ? toQuestion(row) : null;
}

export type QuestionEdit = {
  prompt: string;
  answer: string;
  notes: string | null;
  topic: Topic | null;
  theme: string | null;
  difficulty: number | null;
  source_url: string | null;
  data: QuestionData;
};

export function saveReview(db: Db, id: number, edit: QuestionEdit, status: Status): void {
  db.query(
    `UPDATE questions SET prompt = $prompt, answer = $answer, notes = $notes, topic = $topic, theme = $theme,
       difficulty = $difficulty, source_url = $source_url, data = $data, status = $status
     WHERE id = $id`,
  ).run({ ...edit, data: JSON.stringify(edit.data), status, id });
}

export function getQuestion(db: Db, id: number): Question | null {
  const row = db.query("SELECT * FROM questions WHERE id = ?").get(id) as QuestionRow | null;
  return row ? toQuestion(row) : null;
}
