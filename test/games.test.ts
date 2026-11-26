import { beforeEach, describe, expect, test } from "bun:test";
import { stockLevels } from "../src/bank.ts";
import { openDb, type Db } from "../src/db.ts";
import { deleteGame, generateGame, getGame, replaceQuestion, ShortageError } from "../src/games.ts";
import { stocker } from "./fixtures.ts";

let db: Db;
let stock: ReturnType<typeof stocker>["stock"];
let theme: ReturnType<typeof stocker>["theme"];
let stockEverything: ReturnType<typeof stocker>["stockEverything"];

beforeEach(() => {
  db = openDb(":memory:");
  ({ stock, theme, stockEverything } = stocker(db));
});

describe("generateGame", () => {
  test("fills all nine rounds with the right formats and filters", () => {
    stockEverything();
    const game = getGame(db, generateGame(db))!;

    expect(game.rounds.map((r) => r.def.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const round of game.rounds) {
      expect(round.questions.length).toBe(round.variant.count);
      for (const { question } of round.questions) {
        expect(question.format).toBe(round.variant.format);
        if (round.variant.difficulty) expect(round.variant.difficulty).toContain(question.difficulty!);
        if (round.variant.topic) expect(question.topic).toBe(round.variant.topic);
      }
    }
    const ids = game.rounds.flatMap((r) => r.questions.map((q) => q.question.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("never reuses a question in a later game", () => {
    stockEverything(2);
    const first = getGame(db, generateGame(db))!;
    const second = getGame(db, generateGame(db))!;
    const ids = (g: typeof first) => g.rounds.flatMap((r) => r.questions.map((q) => q.question.id));
    expect(ids(first).filter((id) => ids(second).includes(id))).toEqual([]);
  });

  test("lists every shortage at once and saves nothing", () => {
    stock(2, { format: "standard", difficulty: 1 });
    let error: unknown;
    try {
      generateGame(db);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ShortageError);
    expect((error as ShortageError).shortages).toHaveLength(9);
    expect((error as ShortageError).shortages[0]).toContain("Round 1 (Get Your Feet Wet): needs a theme with 3 approved questions");
    expect(db.query("SELECT COUNT(*) AS n FROM games").get()).toEqual({ n: 0 });
  });

  test("ignores pending and rejected questions", () => {
    stockEverything();
    db.query("UPDATE questions SET status = 'pending' WHERE format = 'over_under'").run();
    expect(() => generateGame(db)).toThrow("Round 2 (Over/Under)");
  });

  test("rotates rounds 5 and 7 to a format that hasn't been played yet", () => {
    stockEverything(2);
    const first = getGame(db, generateGame(db))!;
    const second = getGame(db, generateGame(db))!;
    for (const n of [5, 7]) {
      const format = (g: typeof first) => g.rounds.find((r) => r.def.number === n)!.variant.format;
      expect(format(second)).not.toBe(format(first));
    }
  });

  test("fills each themed round from one theme, a different theme per round, easiest first", () => {
    stockEverything();
    const game = getGame(db, generateGame(db))!;
    const themed = game.rounds.filter((r) => r.variant.themed);
    expect(themed.map((r) => r.def.number)).toEqual([1, 3, 8]);
    for (const round of themed) {
      const themes = new Set(round.questions.map((q) => q.question.theme));
      expect(themes.size).toBe(1);
      expect(round.theme).toBe([...themes][0]!);
      const levels = round.questions.map((q) => q.question.difficulty!);
      expect(levels).toEqual([...levels].sort());
    }
    expect(new Set(themed.map((r) => r.theme)).size).toBe(3);
  });

  test("other rounds don't break into a theme a themed round could still use", () => {
    stockEverything();
    db.query("DELETE FROM questions WHERE topic = 'geography'").run();
    theme("Untouched", [3, 3, 3]);
    theme("Spare", [1, 3]);
    const final = getGame(db, generateGame(db))!.rounds.find((r) => r.def.number === 9)!;
    expect(final.questions[0]!.question.theme).not.toBe("Untouched");
  });

  test("a stand-alone question can't fill a themed round", () => {
    stockEverything();
    db.query("UPDATE questions SET theme = NULL").run();
    expect(() => generateGame(db)).toThrow("needs a theme");
  });

  test("keeps a sports-team round within one league", () => {
    stockEverything();
    db.query("DELETE FROM questions WHERE format IN ('who_am_i', 'size_matters', 'name_the_brand')").run();
    stock(2, { format: "name_the_team", data: { league: "College" } });
    const round7 = getGame(db, generateGame(db))!.rounds.find((r) => r.def.number === 7)!;
    expect(round7.questions.map((q) => q.question.data.league)).toEqual(["NFL", "NFL", "NFL"]);
  });
});

describe("replaceQuestion", () => {
  test("swaps in a fresh question and returns the old one to the bank", () => {
    stockEverything(2);
    const id = generateGame(db);
    const before = getGame(db, id)!.rounds[0]!.questions[0]!.question;

    const replacement = replaceQuestion(db, id, 1, 1, false);

    const after = getGame(db, id)!.rounds[0]!.questions[0]!.question;
    expect(after.id).toBe(replacement.id);
    expect(after.id).not.toBe(before.id);
    // A themed round stays on its theme.
    expect(after.theme).toBe(before.theme);
    expect([1, 2]).toContain(after.difficulty!);
    expect(db.query("SELECT status FROM questions WHERE id = ?").get(before.id)).toEqual({ status: "approved" });
  });

  test("ban rejects the old question for good", () => {
    stockEverything(2);
    const id = generateGame(db);
    const before = getGame(db, id)!.rounds[1]!.questions[2]!.question;
    replaceQuestion(db, id, 2, 3, true);
    expect(db.query("SELECT status FROM questions WHERE id = ?").get(before.id)).toEqual({ status: "rejected" });
  });

  test("fails cleanly when nothing is left to swap in", () => {
    stockEverything(1);
    const id = generateGame(db);
    expect(() => replaceQuestion(db, id, 2, 1, true)).toThrow(ShortageError);
    // The ban rolls back with the failed swap.
    expect(db.query("SELECT COUNT(*) AS n FROM questions WHERE status = 'rejected'").get()).toEqual({ n: 0 });
  });
});

test("deleting a game frees its questions", () => {
  stockEverything(1);
  deleteGame(db, generateGame(db));
  expect(() => generateGame(db)).not.toThrow();
});

test("stock levels count themed rounds in themes, summing rounds that share a filter", () => {
  stockEverything(1);
  const lines = stockLevels(db);
  expect(lines.find((l) => l.label === "Themed round · easy to medium")).toEqual({
    label: "Themed round · easy to medium",
    available: 3,
    perGame: 2,
    rotating: false,
    themed: true,
  });
  expect(lines.find((l) => l.label === "Over/Under")).toMatchObject({ available: 3, perGame: 3, themed: false });
});
