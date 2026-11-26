# TriviaBot

Weekly bar-trivia host tool for one host. A Bun server on the host's laptop deals games from a SQLite question bank; the host runs them from a phone on the laptop's network, and the laptop shows the room screen on the projector. There is no hosting.

## Stack and commands

- Bun only: `Bun.serve` routes, `bun:sqlite`, `bun test`. No framework, no bundler, no client build step.
- `bun run dev` (port 3000), `bun run bar` (game night: keeps the Mac awake), `bun test`, `bun run typecheck`, `bun run seed`, `bun run stock <format> ...`.
- Run `bun test` and `bun run typecheck` after any change to `src/`.
- `bun run stock` and `bun run jarchive` (without `--dry-run`) call the Claude API and cost money: never run them without the user's OK.

## Layout

- `src/db.ts`: schema, formats, topics. A question is "used" when a `game_questions` row points at it; deleting a game frees its questions.
- `src/rounds.ts`: the round lineup. `docs/round-guide.md` is the host's spec for it; keep them in step.
- `src/games.ts`: dealing a game (all-or-nothing, lists every shortage), swap/ban. Rounds 1, 3 and 8 are themed: one theme per round (`questions.theme`, usually a Jeopardy! category), never twice in a game; other rounds avoid breaking into untouched themes.
- `src/views.ts`: all HTML, server-rendered through the escaping `html` tag in `src/html.ts`. Never build markup by string concatenation.
- `public/app.js`: progressive enhancement only. Every page must still work without it (forms post, cards list in order).
- `scripts/`: seed import, Claude stocking, and the J! Archive theme importer. `seed/` holds the import data (`themes.json` is the starter themes).

## Design

The UI follows the Impeccable direction in `.impeccable/surfaces/src-views-ts.md` (Host Cue Cards, muted dark) and `PRODUCT.md`; `DESIGN.md` records the system once written. Use the existing tokens in `public/styles.css`, one font (Atkinson Hyperlegible Next, self-hosted), Lucide icons via `src/icons.ts`. The presenter screen must never show an answer the host hasn't revealed.
