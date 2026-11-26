import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const FORMATS = [
  "standard",
  "over_under",
  "list",
  "true_false",
  "multiple_choice",
  "feud",
  "name_that_tune",
  "who_am_i",
  "size_matters",
  "name_the_brand",
  "name_the_team",
] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<Format, string> = {
  standard: "Standard",
  over_under: "Over/Under",
  list: "List",
  true_false: "True/False",
  multiple_choice: "Multiple choice",
  feud: "Family Feud",
  name_that_tune: "Name That Tune",
  who_am_i: "Who Am I?",
  size_matters: "Size Matters",
  name_the_brand: "Name That Brand",
  name_the_team: "Name That Sports Team",
};

export const TOPICS = [
  "entertainment",
  "history",
  "science",
  "geography",
  "sports",
  "food & drink",
  "arts & literature",
  "business",
  "general",
] as const;
export type Topic = (typeof TOPICS)[number];

export const DIFFICULTY_LABELS: Record<number, string> = { 1: "Easy", 2: "Medium", 3: "Hard" };

export type Status = "pending" | "approved" | "rejected";

/** Format-specific extras. Only the fields a format needs are set. */
export type QuestionData = {
  /** over_under: the number players guess over or under. */
  line?: number;
  /** list: every accepted item. */
  items?: string[];
  /** multiple_choice: the options in display order (answer is one of them). */
  options?: string[];
  /** feud: survey answers, highest first. */
  answers?: { text: string; points: number }[];
  /** name_the_team: league, so a round stays within one. */
  league?: string;
};

export type Question = {
  id: number;
  format: Format;
  prompt: string;
  answer: string;
  data: QuestionData;
  notes: string | null;
  topic: Topic | null;
  /** A named set of related questions (usually one Jeopardy! category). Themed rounds take three from one. */
  theme: string | null;
  difficulty: number | null;
  source: string | null;
  source_url: string | null;
  status: Status;
  created_at: string;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY,
  format TEXT NOT NULL,
  prompt TEXT NOT NULL,
  answer TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  topic TEXT,
  theme TEXT,
  difficulty INTEGER,
  source TEXT,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (format, prompt)
);
CREATE INDEX IF NOT EXISTS questions_pick ON questions (status, format, difficulty, topic);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  played_at TEXT
);

-- A question is "used" once it appears here; deleting a game frees its questions.
CREATE TABLE IF NOT EXISTS game_questions (
  game_id INTEGER NOT NULL REFERENCES games (id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  position INTEGER NOT NULL,
  question_id INTEGER NOT NULL REFERENCES questions (id),
  PRIMARY KEY (game_id, round, position)
);
CREATE INDEX IF NOT EXISTS game_questions_question ON game_questions (question_id);
`;

export type Db = Database;

export function openDb(path = process.env.DB_PATH ?? "data/trivia.db"): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true, strict: true });
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  // Databases made before themes existed get the column added in place.
  const columns = db.query("SELECT name FROM pragma_table_info('questions')").values().flat();
  if (!columns.includes("theme")) db.exec("ALTER TABLE questions ADD COLUMN theme TEXT");
  db.exec("CREATE INDEX IF NOT EXISTS questions_theme ON questions (status, format, theme)");
  return db;
}

export type QuestionRow = Omit<Question, "data"> & { data: string };

export function toQuestion(row: QuestionRow): Question {
  return { ...row, data: JSON.parse(row.data || "{}") };
}

export type NewQuestion = {
  format: Format;
  prompt: string;
  answer: string;
  data?: QuestionData;
  notes?: string | null;
  topic?: Topic | null;
  theme?: string | null;
  difficulty?: number | null;
  source?: string | null;
  source_url?: string | null;
  status?: Status;
};

/** Inserts a question; returns false if the same format+prompt already exists. */
export function insertQuestion(db: Db, q: NewQuestion): boolean {
  const result = db
    .query(
      `INSERT OR IGNORE INTO questions (format, prompt, answer, data, notes, topic, theme, difficulty, source, source_url, status)
       VALUES ($format, $prompt, $answer, $data, $notes, $topic, $theme, $difficulty, $source, $source_url, $status)`,
    )
    .run({
      format: q.format,
      prompt: q.prompt.trim(),
      answer: q.answer.trim(),
      data: JSON.stringify(q.data ?? {}),
      notes: q.notes ?? null,
      topic: q.topic ?? null,
      theme: q.theme?.trim() || null,
      difficulty: q.difficulty ?? null,
      source: q.source ?? null,
      source_url: q.source_url ?? null,
      status: q.status ?? "pending",
    });
  return result.changes > 0;
}
