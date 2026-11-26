import { toQuestion, type Db, type Question, type QuestionRow } from "./db.ts";
import { ROUNDS, describeVariant, roundDef, type RoundDef, type Variant } from "./rounds.ts";

export class ShortageError extends Error {
  constructor(public shortages: string[]) {
    super(`Not enough approved questions. ${shortages.join(" ")}`);
  }
}

const UNUSED = "NOT EXISTS (SELECT 1 FROM game_questions gq WHERE gq.question_id = q.id)";

/** SQL filter for approved, never-used questions that fit a variant. */
export function variantFilter(v: Variant): { where: string; params: (string | number)[] } {
  const clauses = ["q.status = 'approved'", "q.format = ?", UNUSED];
  const params: (string | number)[] = [v.format];
  if (v.difficulty?.length) {
    clauses.push(`q.difficulty IN (${v.difficulty.map(() => "?").join(", ")})`);
    params.push(...v.difficulty);
  }
  if (v.topic) {
    clauses.push("q.topic = ?");
    params.push(v.topic);
  }
  if (v.themed) clauses.push("q.theme IS NOT NULL");
  return { where: clauses.join(" AND "), params };
}

function candidates(db: Db, v: Variant, exclude: Set<number>, limit = v.themed ? 5000 : 60): Question[] {
  const { where, params } = variantFilter(v);
  const rows = db
    .query(`SELECT q.* FROM questions q WHERE ${where} ORDER BY random() LIMIT ?`)
    .all(...params, limit + exclude.size) as QuestionRow[];
  return rows
    .map(toQuestion)
    .filter((q) => !exclude.has(q.id))
    .slice(0, limit);
}

const RESERVED_TOPICS = new Set<string>(ROUNDS.flatMap((r) => r.variants.flatMap((v) => (v.topic ? [v.topic] : []))));

/** What a game has committed to so far, so later rounds can stay varied. */
type PickContext = {
  /** Themes already given a round in this game. */
  usedThemes: Set<string>;
  /** Themes any game has dipped into. */
  touched: Set<string>;
  /** Topics of this game's themed rounds so far. */
  themeTopics: Set<string>;
};
const newContext = (): PickContext => ({ usedThemes: new Set(), touched: new Set(), themeTopics: new Set() });

/** Themes with enough questions left for a round, each with its questions easiest first. */
function themesFor(v: Variant, cands: Question[], skip: Set<string>): Question[][] {
  return [...Map.groupBy(cands, (q) => q.theme!).entries()]
    .filter(([theme, qs]) => !skip.has(theme) && qs.length >= v.count)
    .map(([, qs]) => qs.sort((a, b) => (a.difficulty ?? 2) - (b.difficulty ?? 2)).slice(0, v.count));
}

/** Picks `count` questions from shuffled candidates, keeping a round coherent and varied. */
function pick(v: Variant, cands: Question[], ctx: PickContext = newContext()): Question[] {
  const { usedThemes, touched, themeTopics } = ctx;
  if (v.themed) {
    // A themed round is one theme, easiest question first. Candidates arrive shuffled, so this is a random theme,
    // preferring a topic the game's other themed rounds haven't covered.
    const themes = themesFor(v, cands, usedThemes);
    return themes.find((qs) => !themeTopics.has(qs[0]!.topic ?? "")) ?? themes[0] ?? [];
  }
  // Other rounds take stand-alone questions first, then leftovers from themes already dipped into, and only then
  // break into an untouched theme, which would leave it short for a themed round later.
  const intact = (q: Question) => !!q.theme && !usedThemes.has(q.theme) && !touched.has(q.theme);
  cands = [...cands.filter((q) => !q.theme), ...cands.filter((q) => q.theme && !intact(q)), ...cands.filter(intact)];
  if (v.format === "name_the_team") {
    // One league per round, so players aren't mixing college and pro teams.
    const byLeague = Map.groupBy(cands, (q) => q.data.league ?? "");
    return [...byLeague.values()].find((group) => group.length >= v.count)?.slice(0, v.count) ?? [];
  }
  // Rounds without a topic of their own leave other rounds' topics (entertainment) for last.
  const isReserved = (q: Question) => !v.topic && RESERVED_TOPICS.has(q.topic ?? "");
  const preferred = cands.filter((q) => !isReserved(q));
  const chosen: Question[] = [];
  const topics = new Set<string>();
  // Different topics first, then any preferred question, then reserved ones.
  for (const q of preferred) {
    if (chosen.length === v.count) break;
    if (q.topic && topics.has(q.topic)) continue;
    chosen.push(q);
    if (q.topic) topics.add(q.topic);
  }
  for (const q of [...preferred, ...cands.filter(isReserved)]) {
    if (chosen.length === v.count) break;
    if (!chosen.includes(q)) chosen.push(q);
  }
  return chosen;
}

function lastUsedIn(db: Db, round: number, v: Variant): number {
  const row = db
    .query(
      `SELECT MAX(gq.game_id) AS last FROM game_questions gq
       JOIN questions q ON q.id = gq.question_id
       WHERE gq.round = ? AND q.format = ?`,
    )
    .get(round, v.format) as { last: number | null };
  return row.last ?? 0;
}

type Filled = { def: RoundDef; questions: Question[] };

function fillRound(db: Db, def: RoundDef, picked: Set<number>, ctx: PickContext): Filled | { shortage: string } {
  const options = def.variants.map((v) => ({
    v,
    questions: pick(v, candidates(db, v, picked), ctx),
    lastUsed: lastUsedIn(db, def.number, v),
  }));
  const ready = options.filter((o) => o.questions.length === o.v.count);
  if (ready.length === 0) {
    const detail = options
      .map((o) => (o.v.themed ? `needs a theme with ${o.v.count} approved questions that fit` : `${describeVariant(o.v)} ${o.questions.length}/${o.v.count}`))
      .join(", ");
    return { shortage: `Round ${def.number} (${def.title}): ${detail}.` };
  }
  // Rotating rounds use whichever format has gone longest without being played.
  const best = ready.sort(() => Math.random() - 0.5).sort((a, b) => a.lastUsed - b.lastUsed)[0]!;
  return { def, questions: best.questions };
}

/** Rounds with tighter filters pick first so broader rounds don't eat their questions. */
const FILL_ORDER = [...ROUNDS].sort((a, b) => specificity(b) - specificity(a));
function specificity(def: RoundDef): number {
  const v = def.variants[0]!;
  return (v.themed ? 3 : 0) + (v.topic ? 2 : 0) + (v.difficulty ? 1 : 0);
}

/** Builds a new game from approved, unused questions. Throws ShortageError listing every gap. */
export function generateGame(db: Db): number {
  return db.transaction(() => {
    const picked = new Set<number>();
    const ctx = newContext();
    for (const [theme] of db
      .query("SELECT DISTINCT q.theme FROM game_questions gq JOIN questions q ON q.id = gq.question_id WHERE q.theme IS NOT NULL")
      .values()) {
      ctx.touched.add(theme as string);
    }
    const filled: Filled[] = [];
    const shortages: string[] = [];
    for (const def of FILL_ORDER) {
      const result = fillRound(db, def, picked, ctx);
      if ("shortage" in result) {
        shortages.push(result.shortage);
        continue;
      }
      result.questions.forEach((q) => picked.add(q.id));
      for (const q of result.questions) if (q.theme) ctx.usedThemes.add(q.theme);
      if (def.variants.some((v) => v.themed) && result.questions[0]?.topic) ctx.themeTopics.add(result.questions[0].topic);
      filled.push(result);
    }
    if (shortages.length) throw new ShortageError(shortages.sort());

    const { id } = db.query("INSERT INTO games DEFAULT VALUES RETURNING id").get() as { id: number };
    const insert = db.query("INSERT INTO game_questions (game_id, round, position, question_id) VALUES (?, ?, ?, ?)");
    for (const { def, questions } of filled) {
      questions.forEach((q, i) => insert.run(id, def.number, i + 1, q.id));
    }
    return id;
  })();
}

/**
 * Swaps one question in a game for another that fits the same slot.
 * The old question goes back to the bank, or is rejected for good when `ban` is set.
 */
export function replaceQuestion(db: Db, gameId: number, round: number, position: number, ban: boolean): Question {
  return db.transaction(() => {
    const row = db
      .query(
        `SELECT q.* FROM game_questions gq JOIN questions q ON q.id = gq.question_id
         WHERE gq.game_id = ? AND gq.round = ? AND gq.position = ?`,
      )
      .get(gameId, round, position) as QuestionRow | null;
    if (!row) throw new Error("That question isn't in this game.");
    const current = toQuestion(row);
    if (ban) db.query("UPDATE questions SET status = 'rejected' WHERE id = ?").run(current.id);

    const def = roundDef(round);
    const variant = def.variants.find((v) => v.format === current.format) ?? def.variants[0]!;
    const inGame = db.query("SELECT question_id FROM game_questions WHERE game_id = ?").values(gameId).map((r) => r[0] as number);
    const roundTopics = new Set(
      db
        .query("SELECT q.topic FROM game_questions gq JOIN questions q ON q.id = gq.question_id WHERE gq.game_id = ? AND gq.round = ?")
        .values(gameId, round)
        .map((r) => r[0]),
    );
    let cands = candidates(db, variant, new Set(inGame));
    if (variant.format === "name_the_team") cands = cands.filter((q) => q.data.league === current.data.league);
    // A themed round stays on its theme, so the swap comes from the same theme.
    if (variant.themed) cands = cands.filter((q) => q.theme === current.theme);
    const next = cands.find((q) => !q.topic || !roundTopics.has(q.topic)) ?? cands[0];
    if (!next) {
      const what = variant.themed ? `questions are left in “${current.theme}”` : `${describeVariant(variant)} questions are left`;
      throw new ShortageError([`No other approved ${what}.`]);
    }

    db.query("UPDATE game_questions SET question_id = ? WHERE game_id = ? AND round = ? AND position = ?").run(
      next.id,
      gameId,
      round,
      position,
    );
    return next;
  })();
}

export type GameSummary = { id: number; created_at: string; played_at: string | null };

export type GameRound = {
  def: RoundDef;
  variant: Variant;
  /** The theme every question in a themed round shares. */
  theme: string | null;
  questions: { position: number; question: Question }[];
};

export type Game = GameSummary & { rounds: GameRound[] };

export function listGames(db: Db): GameSummary[] {
  return db.query("SELECT id, created_at, played_at FROM games ORDER BY id DESC").all() as GameSummary[];
}

export function getGame(db: Db, id: number): Game | null {
  const game = db.query("SELECT id, created_at, played_at FROM games WHERE id = ?").get(id) as GameSummary | null;
  if (!game) return null;
  const rows = db
    .query(
      `SELECT gq.round, gq.position, q.* FROM game_questions gq JOIN questions q ON q.id = gq.question_id
       WHERE gq.game_id = ? ORDER BY gq.round, gq.position`,
    )
    .all(id) as (QuestionRow & { round: number; position: number })[];

  const rounds: GameRound[] = [];
  for (const [round, group] of Map.groupBy(rows, (r) => r.round)) {
    const def = roundDef(round);
    const format = group[0]!.format;
    const variant = def.variants.find((v) => v.format === format) ?? def.variants[0]!;
    rounds.push({
      def,
      variant,
      theme: variant.themed ? (group[0]!.theme ?? null) : null,
      questions: group.map(({ round: _r, position, ...q }) => ({ position, question: toQuestion(q) })),
    });
  }
  return { ...game, rounds };
}

export function setPlayed(db: Db, id: number, played: boolean): void {
  db.query("UPDATE games SET played_at = CASE WHEN ? THEN datetime('now') ELSE NULL END WHERE id = ?").run(played ? 1 : 0, id);
}

/** Deletes a game. Its questions become available again. */
export function deleteGame(db: Db, id: number): void {
  db.query("DELETE FROM games WHERE id = ?").run(id);
}
