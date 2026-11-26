/**
 * Turns Jeopardy! categories from J! Archive into themes for the themed rounds (1, 3 and 8).
 * Each usable category becomes one theme; Claude renames it plainly and rewrites its clues as questions.
 * Everything lands in the review queue as "pending".
 *
 *   bun run jarchive <game_id> [<game_id> ...]       e.g. bun run jarchive 9100 9101
 *   bun run jarchive --season 41 [--limit 3]         the first games of a season
 *   add --dry-run to see what would be sent, without calling Claude
 *
 * Rewriting needs ANTHROPIC_API_KEY (in .env) or an `ant auth login` profile, and costs a little per game.
 */
import Anthropic from "@anthropic-ai/sdk";
import { parseArgs } from "node:util";
import { TOPICS, insertQuestion, openDb, type NewQuestion, type Topic } from "../src/db.ts";
import { parseShow, type Show } from "./jarchive-parse.ts";

const MODEL = "claude-opus-5-5";
const SITE = "https://j-archive.com";
const POLITE_DELAY_MS = 2000;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { season: { type: "string" }, limit: { type: "string" }, "dry-run": { type: "boolean" } },
});
const dryRun = values["dry-run"] ?? false;

async function fetchPage(path: string): Promise<string> {
  const res = await fetch(`${SITE}/${path}`, { headers: { "User-Agent": "TriviaBot (a weekly pub quiz host's question importer)" } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
}

async function gameIds(): Promise<number[]> {
  if (values.season) {
    const html = await fetchPage(`showseason.php?season=${encodeURIComponent(values.season)}`);
    const ids = [...new Set([...html.matchAll(/showgame\.php\?game_id=(\d+)/g)].map((m) => Number(m[1])))];
    return ids.slice(0, Number(values.limit ?? 3));
  }
  const ids = positionals.map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) {
    console.error("Usage: bun run jarchive <game_id> [...] | --season <n> [--limit <n>]  [--dry-run]");
    process.exit(1);
  }
  return ids;
}

// ── Rewriting ───────────────────────────────────────────────────────────────

type DraftTheme = {
  category: string;
  theme: string;
  topic: string;
  questions: { prompt: string; answer: string; difficulty: number; notes: string }[];
};

const SYSTEM = `You turn Jeopardy! categories into themed rounds for a weekly pub trivia night. The host reads each question
aloud from a phone; teams write answers on paper. A themed round is three questions on one theme, announced first.

For each category, decide whether it makes a good theme:
- Keep categories with a clear subject (a person, place, field, era, kind of thing).
- Skip wordplay and format categories ("Before & After", "Rhyme Time", anagrams, "starts with Q", quotation-mark
  categories, "Potpourri"-style grab bags), and anything that only works on screen.
- Skip a category if fewer than three of its clues survive the rules below.

For each kept category:
- theme: a plain name a bar crowd understands at once, title case, under 32 characters. "POTENT POTABLES" becomes
  "Cocktails & Spirits"; "U.S. PREZ" becomes "U.S. Presidents".
- Rewrite each clue as a direct question ending in "?", in plain spoken English. It should stand on its own once the
  theme is announced, so you can lean on the theme instead of repeating it.
- The answer is the correct response without "What is", as short as a team would write it.
- Keep each clue's difficulty (1 easy, 2 medium, 3 hard). Drop clues that are obscure to a general bar crowd today,
  rely on the category's wordplay, or state a fact that may have changed since the show aired (records, office
  holders, "current" anything) unless you pin it to the year. Never invent or "fix" facts: rewrite only what the
  clue and response say.
- notes: anything the host should know (an alternate accepted answer, "as of 1998"); empty string if nothing.

Call submit_themes once with every kept category.`;

const TOOL: Anthropic.Beta.BetaTool = {
  name: "submit_themes",
  description: "Submit the themes made from this game's categories. Call exactly once.",
  eager_input_streaming: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["themes"],
    properties: {
      themes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "theme", "topic", "questions"],
          properties: {
            category: { type: "string", description: "The original category name." },
            theme: { type: "string" },
            topic: { type: "string", enum: [...TOPICS] },
            questions: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["prompt", "answer", "difficulty", "notes"],
                properties: {
                  prompt: { type: "string" },
                  answer: { type: "string" },
                  difficulty: { type: "integer", enum: [1, 2, 3] },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
};

/** Tool input streams without server-side validation, so every theme is checked here. */
function validTheme(t: DraftTheme): string | null {
  if (!t.theme?.trim() || t.theme.length > 40) return "bad theme name";
  if (!(TOPICS as readonly string[]).includes(t.topic)) return "bad topic";
  const good = (t.questions ?? []).filter((q) => q.prompt?.trim().endsWith("?") && q.answer?.trim() && [1, 2, 3].includes(q.difficulty));
  if (good.length !== (t.questions ?? []).length) return "a question is malformed";
  return null;
}

async function rewrite(client: Anthropic, show: Show): Promise<DraftTheme[]> {
  const board = show.categories
    .map((c) => `## ${c.name} (${c.round})\n${c.clues.map((cl) => `- [${cl.difficulty}] ${cl.text} → ${cl.response}`).join("\n")}`)
    .join("\n\n");
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    { role: "user", content: `${show.title}. Clues are listed as [difficulty] clue → correct response.\n\n${board}` },
  ];
  for (let attempt = 0; attempt < 3; attempt++) {
    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await client.beta.messages
        .stream({
          model: MODEL,
          max_tokens: 32000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "medium" },
          system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
          tools: [TOOL],
          messages,
        })
        .finalMessage();
    } catch (err) {
      // Unparseable tool input or a dropped connection: try again. API errors are real failures.
      if (err instanceof Anthropic.APIError) throw err;
      continue;
    }
    if (message.stop_reason === "refusal") throw new Error(`Claude declined: ${message.stop_details?.explanation ?? "no reason given"}`);
    if (message.stop_reason === "max_tokens") throw new Error("Ran out of output tokens.");
    const call = message.content.find((b) => b.type === "tool_use" && b.name === "submit_themes");
    if (call?.type === "tool_use") return (call.input as { themes?: DraftTheme[] }).themes ?? [];
    messages.push({ role: "assistant", content: message.content });
    messages.push({ role: "user", content: "Please call submit_themes now." });
  }
  throw new Error(`No themes came back for ${show.title}.`);
}

// ── Run ─────────────────────────────────────────────────────────────────────

const ids = await gameIds();
const db = dryRun ? null : openDb();
const client = dryRun ? null : new Anthropic();
let added = 0;

for (const [i, id] of ids.entries()) {
  if (i > 0) await Bun.sleep(POLITE_DELAY_MS);
  const show = parseShow(id, await fetchPage(`showgame.php?game_id=${id}`));
  console.log(`\n${show.title}: ${show.categories.length} categories, ${show.categories.reduce((n, c) => n + c.clues.length, 0)} clues`);
  if (dryRun) {
    for (const c of show.categories) {
      console.log(`  ${c.round.padEnd(2)} ${c.name}`);
      for (const cl of c.clues) console.log(`       [${cl.difficulty}] ${cl.text} → ${cl.response}`);
    }
    continue;
  }
  const themes = await rewrite(client!, show);
  for (const t of themes) {
    const problem = validTheme(t);
    if (problem) {
      console.warn(`  skipped "${t.theme ?? t.category}": ${problem}`);
      continue;
    }
    let n = 0;
    for (const q of t.questions) {
      const draft: NewQuestion = {
        format: "standard",
        prompt: q.prompt,
        answer: q.answer,
        notes: [q.notes.trim(), show.aired && `From Jeopardy!, aired ${show.aired}.`].filter(Boolean).join(" "),
        topic: t.topic as Topic,
        theme: t.theme,
        difficulty: q.difficulty,
        source: "J! Archive",
        source_url: `${SITE}/showgame.php?game_id=${id}`,
      };
      if (insertQuestion(db!, draft)) n++;
    }
    added += n;
    console.log(`  ${t.category} → "${t.theme}" (${t.topic}): ${n} questions`);
  }
}

if (!dryRun) console.log(`\nAdded ${added} questions to the review queue.`);
