/**
 * Asks Claude to write a batch of new questions. They land in the review queue as "pending".
 *
 *   bun run stock <format> [count] [--difficulty 1|2|3] [--topic <topic>]
 *   bun run stock standard 10 --difficulty 1
 *   bun run stock over_under 6
 *
 * Needs ANTHROPIC_API_KEY (in .env) or an `ant auth login` profile.
 * Each question is checked with web search and comes back with a source link.
 */
import Anthropic from "@anthropic-ai/sdk";
import { parseArgs } from "node:util";
import { FORMATS, FORMAT_LABELS, TOPICS, insertQuestion, openDb, type Format, type NewQuestion } from "../src/db.ts";

const MODEL = "claude-opus-5-5";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { difficulty: { type: "string" }, topic: { type: "string" } },
});
const format = positionals[0] as StockFormat;
const count = Number(positionals[1] ?? 10);
const difficulty = values.difficulty ? Number(values.difficulty) : undefined;
const topic = values.topic;

const STOCKABLE = FORMATS.filter((f): f is StockFormat => f !== "feud");
if (!STOCKABLE.includes(format) || !(count > 0 && count <= 25)) {
  console.error(`Usage: bun run stock <${STOCKABLE.join("|")}> [1-25] [--difficulty 1|2|3] [--topic <topic>]`);
  process.exit(1);
}
if (topic && !(TOPICS as readonly string[]).includes(topic)) {
  console.error(`Topic must be one of: ${TOPICS.join(", ")}`);
  process.exit(1);
}

/** Family Feud is left out: it needs real survey data. */
type StockFormat = Exclude<Format, "feud">;

/** What each format needs, in the host's terms. */
const FORMAT_BRIEFS: Record<StockFormat, string> = {
  standard: `Classic pub trivia: one direct question ending in "?", with a short answer.
Difficulty: 1 = most tables get it; 2 = one or two people per table know it; 3 = only a few tables get it (good for the Final round).
"entertainment" means movies, music and TV from the 1980s on (books can be older).`,
  over_under: `The prompt names a quantity, e.g. "The number of people living on the International Space Station when fully staffed".
Set "line" close to the real number (within about 10-20%) so the table genuinely argues. "answer" is the real number, digits only.
Good subjects are relatable: ages of very famous people (give the date in the notes), sports, everyday science, superlatives like the heaviest pumpkin.
Avoid numbers most people know cold (piano keys, days in a year) and numbers nobody can estimate (grains of sand).`,
  list: `One question whose answer is a list of 5-10 items, 1 point per item.
Use WELL-KNOWN groups (the more items, the better known it must be), ranked top-N lists with a clear date and source, or "put these celebrities in age order".
"items" holds every accepted item; "answer" is the items joined with "; ".`,
  true_false: `A statement the table must call true or false. Aim for surprising, debatable facts.
"answer" is exactly "True" or "False". Mix them roughly half and half. Put the explanation in "notes".`,
  name_that_tune: `The host plays a song and the table names the title AND artist.
"prompt" is a short note for the host describing the song (year, genre, why it's fun); "answer" is "Title by Artist".
Mostly earworms whose titles people don't know, or one-hit wonders (e.g. "My Sharona"), plus some easier gimmes.`,
  multiple_choice: `"Who Wants to Be a Millionaire" style: a hard question with exactly 4 "options", one of which is exactly the "answer".
About a quarter of the time, make the wrong options obviously wrong, so a hard question can be solved by elimination.`,
  who_am_i: `Describe a famous or notable person in the first person ("I'm a comedian whose first Netflix special..."). The answer is their name.
Medium difficulty: known by name and face, not the first ten people anyone would guess.`,
  size_matters: `"Which is taller: X or Y?" about two famous landmarks or buildings of similar height. Put both heights in "notes".`,
  name_the_brand: `Name two products; the table names the brand. "prompt" is just the two products, e.g. "Aventador and Huracán"; "answer" is "Lamborghini".`,
  name_the_team: `Name a US city or university; the table names its team. Use only one "league" per batch (NFL, NBA, MLB, NHL or College); no minor leagues.`,
};

type Draft = Required<Pick<NewQuestion, "prompt" | "answer">> & {
  notes?: string;
  topic?: string;
  difficulty?: number;
  source_url?: string;
  line?: number;
  items?: string[];
  options?: string[];
  league?: string;
};

function questionSchema(f: Format): Record<string, unknown> {
  const str = { type: "string" };
  const properties: Record<string, unknown> = {
    prompt: str,
    answer: str,
    notes: { type: "string", description: "Explanation or extra detail for the host. Empty string if none." },
    source_url: { type: "string", description: "A page you found that confirms the answer." },
  };
  if (f === "standard") {
    properties.topic = { type: "string", enum: [...TOPICS] };
    properties.difficulty = { type: "integer", enum: [1, 2, 3] };
  }
  if (f === "over_under") properties.line = { type: "number" };
  if (f === "list") properties.items = { type: "array", items: str };
  if (f === "multiple_choice") properties.options = { type: "array", items: str };
  if (f === "name_the_team") properties.league = { type: "string", enum: ["NFL", "NBA", "MLB", "NHL", "College"] };
  return { type: "object", additionalProperties: false, required: Object.keys(properties), properties };
}

/** The model streams tool input without server-side validation, so check every draft here. */
function validate(d: Draft): string | null {
  if (!d.prompt?.trim() || !d.answer?.trim()) return "missing prompt or answer";
  if (format === "standard") {
    if (![1, 2, 3].includes(d.difficulty!)) return "bad difficulty";
    if (!(TOPICS as readonly string[]).includes(d.topic!)) return "bad topic";
  }
  if (format === "over_under" && (typeof d.line !== "number" || Number.isNaN(Number(d.answer)))) return "bad line or answer";
  if (format === "list" && !(d.items?.length! >= 3)) return "too few items";
  if (format === "multiple_choice" && (d.options?.length !== 4 || !d.options.includes(d.answer))) return "answer not among 4 options";
  if (format === "true_false" && !["True", "False"].includes(d.answer)) return "answer must be True or False";
  if (format === "name_the_team" && !d.league) return "missing league";
  return null;
}

function toNewQuestion(d: Draft): NewQuestion {
  return {
    format,
    prompt: d.prompt,
    answer: d.answer,
    notes: d.notes?.trim() || null,
    topic: (d.topic as NewQuestion["topic"]) ?? null,
    difficulty: d.difficulty ?? null,
    source: "claude",
    source_url: d.source_url?.trim() || null,
    data: {
      ...(d.line !== undefined && { line: d.line }),
      ...(d.items && { items: d.items }),
      ...(d.options && { options: d.options }),
      ...(d.league && { league: d.league }),
    },
  };
}

const db = openDb();
const existing = db
  .query("SELECT prompt, answer FROM questions WHERE format = ? ORDER BY id DESC LIMIT 200")
  .all(format) as { prompt: string; answer: string }[];

const guide = await Bun.file(new URL("../docs/round-guide.md", import.meta.url)).text();
const system = `You write questions for a weekly pub trivia night. The host reads them from a phone.
The host's guide to the game, with example questions in their voice:

${guide}

Rules for every question:
- Check every fact with web search before you include it, and put a confirming page in source_url. Leave out anything you can't confirm.
- Avoid facts that change over time (current records, office holders, ages) unless the question pins them to a date.
- Write in the guide's voice: conversational, clear, no wordplay that depends on seeing the text.`;

const filters = [
  difficulty && `Every question must be difficulty ${difficulty}.`,
  topic && `Every question must have topic "${topic}".`,
].filter(Boolean);

const userPrompt = `Write ${count} new "${FORMAT_LABELS[format]}" questions.

${FORMAT_BRIEFS[format]}
${filters.join("\n")}

Don't repeat or closely echo any question already in the bank:
${existing.map((q) => `- ${q.prompt} → ${q.answer}`).join("\n") || "(the bank is empty)"}

When you're done researching, call submit_questions once with all ${count} questions.`;

const client = new Anthropic();
const tools: Anthropic.Beta.BetaToolUnion[] = [
  { type: "web_search_20260209", name: "web_search", max_uses: count * 3 },
  {
    name: "submit_questions",
    description: "Submit the finished batch of questions. Call this exactly once, at the end.",
    eager_input_streaming: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["questions"],
      properties: { questions: { type: "array", items: questionSchema(format) } },
    },
  },
];
const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: userPrompt }];

console.log(`Asking ${MODEL} for ${count} ${FORMAT_LABELS[format]} questions (with web search; this takes a few minutes)...`);

let drafts: Draft[] | null = null;
let retries = 0;
const usage = { input: 0, output: 0, searches: 0 };

for (let turn = 0; turn < 8 && !drafts; turn++) {
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: 64000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "high" },
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        tools,
        messages,
      })
      .on("text", (delta) => process.stdout.write(delta))
      .finalMessage();
  } catch (err) {
    // Unparseable tool input or a dropped connection: re-issue the turn. API errors are real failures.
    if (err instanceof Anthropic.APIError || retries++ >= 2) throw err;
    console.error("\nStream failed, retrying the turn...");
    continue;
  }
  usage.input += message.usage.input_tokens;
  usage.output += message.usage.output_tokens;
  usage.searches += message.usage.server_tool_use?.web_search_requests ?? 0;

  if (message.stop_reason === "refusal") throw new Error(`Claude declined: ${message.stop_details?.explanation ?? "no reason given"}`);
  if (message.stop_reason === "max_tokens") throw new Error("Ran out of output tokens; try a smaller count.");
  if (message.stop_reason === "pause_turn") {
    // Web search hit the server's step limit; send the turn back and it resumes.
    messages.push({ role: "assistant", content: message.content });
    continue;
  }
  const call = message.content.find((b) => b.type === "tool_use" && b.name === "submit_questions");
  if (call?.type === "tool_use") {
    drafts = ((call.input as { questions?: Draft[] }).questions ?? []) as Draft[];
  } else {
    messages.push({ role: "assistant", content: message.content });
    messages.push({ role: "user", content: "Please call submit_questions now with the questions you've confirmed." });
  }
}
if (!drafts) throw new Error("Claude never submitted any questions.");

let added = 0;
for (const d of drafts) {
  const problem = validate(d);
  if (problem) {
    console.warn(`\nSkipped (${problem}): ${d.prompt}`);
    continue;
  }
  if (insertQuestion(db, toNewQuestion(d))) added++;
}

console.log(`\n\nAdded ${added} of ${drafts.length} questions to the review queue.`);
console.log(`Usage: ${usage.input} input + ${usage.output} output tokens, ${usage.searches} web searches.`);
