import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openDb } from "../src/db.ts";
import { generateGame, getGame, type Game } from "../src/games.ts";
import { stocker } from "./fixtures.ts";

// The room screen is seen by players, so an answer must never reach it before the host reveals it.
// These tests run the real server against a scratch database.

const dir = mkdtempSync(join(tmpdir(), "triviabot-"));
const dbPath = join(dir, "test.db");
const port = 40000 + Math.floor(Math.random() * 20000);
const base = `http://localhost:${port}`;
let server: ReturnType<typeof Bun.spawn>;
let game: Game;

beforeAll(async () => {
  const db = openDb(dbPath);
  stocker(db).stockEverything();
  game = getGame(db, generateGame(db))!;
  db.close();

  const { APP_PASSWORD: _, ...env } = process.env;
  server = Bun.spawn(["bun", "src/server.ts"], { env: { ...env, DB_PATH: dbPath, PORT: String(port) }, stdout: "pipe", stderr: "inherit" });
  const reader = (server.stdout as ReadableStream<Uint8Array>).getReader();
  let out = "";
  while (!out.includes("Trivia running")) {
    const { value, done } = await reader.read();
    if (done) throw new Error(`Server exited before starting:\n${out}`);
    out += new TextDecoder().decode(value);
  }
});

afterAll(() => {
  server?.kill();
  rmSync(dir, { recursive: true, force: true });
});

const answerOf = (round: number, position: number) =>
  game.rounds.find((r) => r.def.number === round)!.questions.find((q) => q.position === position)!.question.answer;
const shows = (markup: string, answer: string) => new RegExp(`\\b${answer}\\b`).test(markup);
const everyAnswer = () => game.rounds.flatMap((r) => r.questions.map((q) => q.question.answer));

async function setScreen(state: { item: string; reveal?: boolean }): Promise<void> {
  const res = await fetch(`${base}/games/${game.id}/screen`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  expect(res.ok).toBe(true);
}
const screen = async () => (await fetch(`${base}/games/${game.id}/screen?v=-1`)).text();

test("the room screen page carries no answers", async () => {
  const page = await (await fetch(`${base}/games/${game.id}/present`)).text();
  for (const answer of everyAnswer()) expect(shows(page, answer)).toBe(false);
});

test("a question shows on the room screen without its answer until revealed", async () => {
  await setScreen({ item: "q-1-1" });
  expect(shows(await screen(), answerOf(1, 1))).toBe(false);

  await setScreen({ item: "q-1-1", reveal: true });
  expect(shows(await screen(), answerOf(1, 1))).toBe(true);
});

test("moving to the next card hides the answer again", async () => {
  await setScreen({ item: "q-1-1", reveal: true });
  await setScreen({ item: "q-1-2" });
  const markup = await screen();
  expect(shows(markup, answerOf(1, 1))).toBe(false);
  expect(shows(markup, answerOf(1, 2))).toBe(false);
});
