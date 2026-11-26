import { insertQuestion, type Db, type NewQuestion } from "../src/db.ts";

/** Helpers that fill a test database with approved questions. Each question gets a unique prompt and answer. */
export function stocker(db: Db) {
  let seq = 0;

  function stock(n: number, q: Omit<NewQuestion, "prompt" | "answer">): void {
    for (let i = 0; i < n; i++) {
      seq++;
      insertQuestion(db, { prompt: `Q${seq}`, answer: `A${seq}`, status: "approved", ...q });
    }
  }

  /** A theme shaped like a Jeopardy! category: five questions from easy to hard. */
  function theme(name: string, difficulties = [1, 1, 2, 2, 3]): void {
    for (const difficulty of difficulties) stock(1, { format: "standard", theme: name, topic: "history", difficulty });
  }

  /** Enough approved questions for `games` full games, with every rotating variant stocked. */
  function stockEverything(games = 1): void {
    for (let g = 0; g < games; g++) for (const t of ["a", "b", "c"]) theme(`Theme ${g}${t}`);
    stock(3 * games, { format: "standard", difficulty: 2, topic: "entertainment" });
    stock(1 * games, { format: "standard", difficulty: 3, topic: "geography" });
    stock(3 * games, { format: "over_under", data: { line: 10 } });
    stock(1 * games, { format: "list", data: { items: ["a", "b"] } });
    for (const format of ["true_false", "name_that_tune", "multiple_choice", "who_am_i", "size_matters", "name_the_brand"] as const) {
      stock(3 * games, { format });
    }
    stock(1 * games, { format: "feud", data: { answers: [{ text: "x", points: 50 }] } });
    stock(3 * games, { format: "name_the_team", data: { league: "NFL" } });
  }

  return { stock, theme, stockEverything };
}
