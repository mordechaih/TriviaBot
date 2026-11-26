# TriviaBot

Weekly bar-trivia host tool for one host. A Bun server on the host's laptop deals games from a SQLite question bank; the host runs them from a phone on the laptop's network, and the laptop shows the room screen on the projector. There is no hosting.

## Stack and commands

- Bun only: `Bun.serve` routes, `bun:sqlite`, `bun test`. No framework, no bundler, no client build step.
- `bun run check` is the finish line for any change: typecheck, Prettier, and all tests (CI runs the same on every push). `bun run format` fixes formatting.
- `bun run dev` (port 3000, your real bank), `bun run bar` (game night: keeps the Mac awake), `bun run seed`.
- `bun run stock` and `bun run jarchive` (without `--dry-run`) call the Claude API and cost money: never run them without the user's OK.

## Seeing a change

`bun run demo` rebuilds `data/demo.db` with every seed question approved and one game dealt; it never touches `data/trivia.db`. Then start the `trivia-demo` preview (port 3001; restart it after a rebuild) and check:
- `/games/1` at phone size (390x844): the host deck. Next/Prev, flip, swipe, Swap/Ban.
- `/games/1/present` at projector size (1280x720): the room screen, which follows the host's current card.
- `/` and `/review` for the bank and the review queue.

## Layout

- `src/db.ts`: schema, formats, topics. A question is "used" when a `game_questions` row points at it; deleting a game frees its questions.
- `src/rounds.ts`: the round lineup. `docs/round-guide.md` is the host's spec for it; keep them in step.
- `src/games.ts`: dealing a game (all-or-nothing, lists every shortage), swap/ban. Rounds 1, 3 and 8 are themed: one theme per round (`questions.theme`, usually a Jeopardy! category), never twice in a game; other rounds avoid breaking into untouched themes.
- `src/views.ts`: all HTML, server-rendered through the escaping `html` tag in `src/html.ts`. Never build markup by string concatenation.
- `test/`: game dealing (`games.test.ts`), the room screen never leaking an unrevealed answer (`presenter.test.ts`, runs the real server), and the J! Archive parser. `fixtures.ts` stocks a test bank.
- `public/app.js`: progressive enhancement only. Every page must still work without it (forms post, cards list in order).
- `scripts/`: seed import, demo database, Claude stocking, and the J! Archive theme importer (`jarchive-parse.ts` is its tested parser). `seed/` holds the import data (`themes.json` is the starter themes).

## Design

The UI follows the Impeccable direction in `.impeccable/surfaces/src-views-ts.md` (Host Cue Cards, muted dark) and `PRODUCT.md`; `DESIGN.md` records the system once written. Use the existing tokens in `public/styles.css`, one font (Atkinson Hyperlegible Next, self-hosted), Lucide icons via `src/icons.ts`. The presenter screen must never show an answer the host hasn't revealed.
