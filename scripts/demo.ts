/**
 * Builds a throwaway database with a playable game, for trying the app or checking a UI change.
 * It loads the seed data, approves all of it, and deals one game. Your real bank is not touched.
 *
 *   bun run demo          then start the "trivia-demo" preview, or: DB_PATH=data/demo.db PORT=3001 bun run dev
 */
import { rmSync } from "node:fs";
import { openDb } from "../src/db.ts";
import { generateGame, getGame } from "../src/games.ts";

const path = "data/demo.db";
for (const suffix of ["", "-wal", "-shm"]) rmSync(`${path}${suffix}`, { force: true });

const seed = Bun.spawnSync(["bun", "scripts/seed.ts"], { env: { ...process.env, DB_PATH: path }, stdout: "inherit", stderr: "inherit" });
if (seed.exitCode !== 0) process.exit(seed.exitCode);

const db = openDb(path);
db.run("UPDATE questions SET status = 'approved' WHERE status = 'pending'");
const game = getGame(db, generateGame(db))!;

console.log(`Demo game ${game.id} dealt into ${path}:`);
for (const r of game.rounds) console.log(`  ${r.def.number}. ${r.def.title}${r.theme ? ` (${r.theme})` : ""}`);
console.log(`Open /games/${game.id} on the demo server (port 3001).`);
