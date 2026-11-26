/**
 * Loads starter questions into the bank. Safe to re-run: existing prompts are skipped.
 *
 *   bun run seed
 *
 * - seed/starter.json: J! Archive clues rewritten as pub questions (pending review)
 * - seed/themes.json: whole J! Archive categories rewritten as themes for rounds 1, 3 and 8 (pending review)
 * - seed/legacy/*.json: the old app's question pools (pending review)
 * - seed/legacy/family-feud.json: ProtoQA survey questions (approved; ban bad ones in-game)
 */
import { insertQuestion, openDb, type Format, type NewQuestion } from "../src/db.ts";

type Legacy = Record<string, any>;

const load = async (path: string) => Bun.file(new URL(`../seed/${path}`, import.meta.url)).json();
const legacy = async (name: string): Promise<Legacy[]> => (await load(`legacy/${name}.json`)).questions;

const banned = new Set<string>(((await load("legacy/banned.json")).questions as Legacy[]).map((b) => b.clue));

/** Old pools that map straight onto one format: clue → prompt, answer → answer. */
const SIMPLE: [string, Format][] = [
  ["to-tell-the-truth", "true_false"],
  ["name-that-tune", "name_that_tune"],
  ["who-am-i", "who_am_i"],
  ["size-matters", "size_matters"],
  ["name-that-brand", "name_the_brand"],
];

const questions: NewQuestion[] = [];

for (const q of await load("starter.json")) {
  questions.push({ format: "standard", ...q });
}

// Themes for the themed rounds: Jeopardy! categories rewritten as spoken questions.
type SeedTheme = { theme: string; topic: NewQuestion["topic"]; source_url: string; questions: { prompt: string; answer: string; difficulty: number; notes?: string }[] };
for (const t of (await load("themes.json")) as SeedTheme[]) {
  for (const q of t.questions) {
    questions.push({ format: "standard", ...q, theme: t.theme, topic: t.topic, source: "J! Archive", source_url: t.source_url });
  }
}

for (const [file, format] of SIMPLE) {
  for (const q of await legacy(file)) {
    questions.push({ format, prompt: q.clue, answer: q.answer, notes: q.explanation ?? q.details ?? null, source: "legacy" });
  }
}

for (const q of await legacy("over-under")) {
  questions.push({ format: "over_under", prompt: q.clue, answer: String(q.actualNumber), data: { line: q.targetNumber }, source: "legacy" });
}

for (const q of await legacy("list-round")) {
  questions.push({ format: "list", prompt: q.clue, answer: q.answers.join("; "), data: { items: q.answers }, source: "legacy" });
}

for (const q of await legacy("millionaire")) {
  const options = (q.options as string[]).map((o) => o.replace(/^[A-D]\)\s*/, ""));
  const correct = options["ABCD".indexOf(q.correctAnswer)];
  if (!correct) continue;
  questions.push({ format: "multiple_choice", prompt: q.clue, answer: correct, data: { options }, notes: q.explanation, source: "legacy" });
}

for (const q of await legacy("name-that-sports-team")) {
  questions.push({ format: "name_the_team", prompt: q.clue, answer: q.answer, data: { league: q.league }, source: "legacy" });
}

const titleCase = (s: string) => s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
for (const q of await legacy("family-feud")) {
  const answers = (q.topAnswers as Legacy[]).map((a) => ({ text: titleCase(a.answer), points: a.points }));
  if (!answers.length) continue;
  questions.push({
    format: "feud",
    prompt: q.question,
    answer: answers[0]!.text,
    data: { answers },
    source: `protoqa:${q.id}`,
    status: "approved",
  });
}

const db = openDb();
let added = 0;
db.transaction(() => {
  for (const q of questions) {
    if (banned.has(q.prompt)) continue;
    if (insertQuestion(db, q)) added++;
  }
})();
console.log(`Added ${added} questions (${questions.length - added} already present or banned).`);
