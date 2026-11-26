import { expect, test } from "bun:test";
import { parseShow } from "../scripts/jarchive-parse.ts";

// A trimmed page in J! Archive's markup, with made-up clues: 6 Jeopardy!, 6 Double Jeopardy! and 1 Final category.
const PAGE = `<title>J! Archive - Show #1234, aired 2026-01-05</title>
<td class="category_name">RIVERS &amp; LAKES</td>
<td class="category_name">PICTURE THIS</td>
${["C", "D", "E", "F", "G", "H", "I", "J", "K", "L"].map((c) => `<td class="category_name">EMPTY ${c}</td>`).join("\n")}
<td class="category_name">HARD SCIENCE</td>
<td id="clue_J_1_1" class="clue_text">This river runs through Cairo</td>
<td id="clue_J_1_1_r" class="clue_text" style="display:none;"><em class="correct_response">the Nile</em><br /></td>
<td id="clue_J_1_5" class="clue_text">This lake is the deepest in the world</td>
<td id="clue_J_1_5_r" class="clue_text" style="display:none;"><em class="correct_response">Lake Baikal</em></td>
<td id="clue_J_2_1" class="clue_text"><a href="media/photo.jpg">This</a> is shown here</td>
<td id="clue_J_2_1_r" class="clue_text" style="display:none;"><em class="correct_response">a duck</em></td>
<td id="clue_FJ" class="clue_text">This element&#39;s symbol is Au</td>
<td id="clue_FJ_r" class="clue_text" style="display:none;"><em class="correct_response">gold</em></td>`;

test("reads categories, clues and responses, and dates the show", () => {
  const show = parseShow(1234, PAGE);
  expect(show.aired).toBe("2026-01-05");
  expect(show.categories.map((c) => c.name)).toEqual(["RIVERS & LAKES", "HARD SCIENCE"]);
  expect(show.categories[0]!.clues).toEqual([
    { text: "This river runs through Cairo", response: "the Nile", difficulty: 1 },
    { text: "This lake is the deepest in the world", response: "Lake Baikal", difficulty: 3 },
  ]);
});

test("skips clues that need a picture or sound", () => {
  const show = parseShow(1234, PAGE);
  expect(show.categories.find((c) => c.name === "PICTURE THIS")).toBeUndefined();
});

test("treats Final Jeopardy! as hard and decodes entities", () => {
  const final = parseShow(1234, PAGE).categories.find((c) => c.round === "FJ")!;
  expect(final.clues).toEqual([{ text: "This element's symbol is Au", response: "gold", difficulty: 3 }]);
});
