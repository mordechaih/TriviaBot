# TriviaBot

A small website for running a weekly bar trivia night. It keeps a bank of questions in SQLite, deals a fresh game from it (8 rounds plus a Final, following [docs/round-guide.md](docs/round-guide.md)), and never reuses a question that has been in a game.

- **Host deck** (`/games/:id`): one question per card on your phone. Tap or press Flip for the answer; swipe or Prev/Next to move. Swap or Ban a question in place.
- **Room screen** (`/games/:id/present`): open it on the laptop driving the projector. It follows the card you're on and shows the answer only when you press "Reveal on screen". Double-click or press F for full screen.
- **Review** (`/review`): approve, edit, or reject new questions before they can appear in a game. Keys: A approve, R reject, S skip.

## Setup

Needs [Bun](https://bun.sh) 1.3 or later.

```bash
bun install
```

```bash
bun run seed
```

```bash
bun run dev
```

Open http://localhost:3000. `seed` loads the starter questions, starter themes and the old question pools into `data/trivia.db` as **pending**; approve them on the Review page before a game can be dealt. The home page's question bank table shows which rounds are short.

## Themed rounds

Rounds 1, 3 and 8 are themed: each takes three questions from one theme (say "Boston Landmarks"), easiest first, and the theme is announced on the round's title card and the room screen. A theme is usually one Jeopardy! category. Rounds 1 and 3 draw easy-to-medium themes, round 8 medium-to-hard, and one game never uses a theme twice. Swapping a question in a themed round swaps within the theme.

To add themes from J! Archive:

```bash
bun run jarchive --season 42 --limit 3
```

It fetches the games, then Claude renames each usable category plainly ("POTENT POTABLES" becomes "Cocktails & Spirits"), rewrites its clues as spoken questions, and drops wordplay categories and dated or obscure clues. Results arrive pending in Review, where you can edit the theme name. Add `--dry-run` to see the categories and clues without calling Claude.

## Commands

| Command | What it does |
|---|---|
| `bun run dev` | Server with reload on change |
| `bun run start` | Server |
| `bun run bar` | Server that keeps the Mac and its screen awake (game night) |
| `bun run check` | Typecheck, formatting and tests (what CI runs) |
| `bun run demo` | Build `data/demo.db` with a playable game, leaving your bank alone |
| `bun run seed` | Import `seed/` into the database (safe to re-run) |
| `bun run stock <format> [count] [--difficulty 1-3] [--topic <topic>]` | Ask Claude for new questions; they arrive pending in Review |
| `bun run jarchive <game_id ...> \| --season <n> [--limit <n>] [--dry-run]` | Turn J! Archive categories into themes (pending in Review) |

Formats for `stock`: `standard`, `over_under`, `list`, `true_false` (To Tell the Truth), `multiple_choice` (Millionaire), `name_that_tune`, `who_am_i`, `size_matters`, `name_the_brand`, `name_the_team`. Family Feud is seeded from survey data, not generated.

## Settings

Put these in `.env` (Bun loads it automatically):

| Variable | Default | Purpose |
|---|---|---|
| `APP_PASSWORD` | none | Optional shared password. Worth setting if you run it on a network other people are on. |
| `DB_PATH` | `data/trivia.db` | SQLite file |
| `PORT` | `3000` | HTTP port |
| `ANTHROPIC_API_KEY` | none | Only for `bun run stock` and `bun run jarchive` |

## Running it at the bar

The laptop that drives the projector is the server; there's no hosting.

1. On the laptop, `bun run bar`. It keeps the laptop and its screen awake while it runs, and prints an "On your phone" address.
2. Put the phone and laptop on the same network. Bar Wi-Fi often blocks devices from seeing each other, so the reliable setup is the phone's hotspot with the laptop joined to it.
3. Open that address on the phone for the host deck, and `/games/:id/present` on the laptop for the room (double-click or press F for full screen).

Allow Bun through the macOS firewall the first time it asks. Everything lives in `data/trivia.db` on the laptop, so keep a copy somewhere else: `/backup` downloads one.
