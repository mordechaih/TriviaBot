/** Reads a J! Archive game page into its categories and clues. Kept apart from the importer so it can be tested. */

export type Clue = { text: string; response: string; difficulty: number };
export type Category = { name: string; round: "J" | "DJ" | "FJ"; clues: Clue[] };
export type Show = { id: number; title: string; aired: string; categories: Category[] };

function clean(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\\(['"])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Board row to difficulty. Jeopardy! values climb down the board, and Double Jeopardy! starts a step harder:
 * Jeopardy! categories mostly feed the easy rounds, Double Jeopardy! the Game Changer, Final Jeopardy! the Final.
 */
function difficultyOf(round: Category["round"], row: number): number {
  if (round === "FJ") return 3;
  if (round === "DJ") return row <= 2 ? 2 : 3;
  if (row <= 2) return 1;
  if (row <= 4) return 2;
  return 3;
}

export function parseShow(id: number, html: string): Show {
  const title = clean(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? `Game ${id}`).replace(/^J! Archive - /, "");
  const aired = title.match(/aired (\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
  const names = [...html.matchAll(/<td class="category_name">([\s\S]*?)<\/td>/g)].map((m) => clean(m[1]!));
  const categories: Category[] = names.map((name, i) => ({ name, round: i < 6 ? "J" : i < 12 ? "DJ" : "FJ", clues: [] }));

  for (const m of html.matchAll(/<td id="clue_(J|DJ)_(\d)_(\d)" class="clue_text">([\s\S]*?)<\/td>/g)) {
    const [, round, col, row, body] = m as unknown as [string, "J" | "DJ", string, string, string];
    // Clues with pictures, audio or video don't work read aloud.
    if (/<a\s/i.test(body)) continue;
    const response = html.match(
      new RegExp(`id="clue_${round}_${col}_${row}_r"[\\s\\S]*?<em class="correct_response">([\\s\\S]*?)</em>`),
    )?.[1];
    const category = categories[(round === "J" ? 0 : 6) + Number(col) - 1];
    if (!response || !category) continue;
    category.clues.push({ text: clean(body), response: clean(response), difficulty: difficultyOf(round, Number(row)) });
  }
  const fj = html.match(/id="clue_FJ" class="clue_text">([\s\S]*?)<\/td>/)?.[1];
  const fjResponse = html.match(/id="clue_FJ_r"[\s\S]*?<em class="correct_response">([\s\S]*?)<\/em>/)?.[1];
  if (fj && fjResponse && !/<a\s/i.test(fj) && categories[12]) {
    categories[12].clues.push({ text: clean(fj), response: clean(fjResponse), difficulty: 3 });
  }
  for (const c of categories) c.clues.sort((a, b) => a.difficulty - b.difficulty);
  return { id, title, aired, categories: categories.filter((c) => c.clues.length) };
}
