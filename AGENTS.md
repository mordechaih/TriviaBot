# TriviaBot — Agent guide

Single source of truth for AI assistants in this repo.

| Tool | How it loads this file |
|------|-------------------------|
| **Claude Code** | Reads `CLAUDE.md` → symlink to this file |
| **Cursor Agent** | Design rules in `.cursor/rules/design-context.mdc`; add or `@`-reference this file for ops/architecture |
| **Humans** | `README-DEV.md` for local setup |

---

## Design Context

### Users
- **Primary**: Solo use (you) for weekly trivia games from J! Archive.
- **Future**: May generalize to paid pub hosts who run trivia nights.
- **Job to be done**: Browse games, play through rounds (reveal answers), track what's played; optionally trigger new game generation. Experience should feel minimal and refined, not cluttered or "AI slop."

### Brand Personality
- **Three words**: Minimal, beautiful, polished.
- **Feel**: Like Apple or OpenAI product design—restrained, high craft, clear hierarchy. Reference vibes: Codex, Craft Docs. Explicitly **not** like Claude's UI (avoid that look and feel).
- **Voice**: Calm, confident, unobtrusive. The content (questions, rounds) leads; the UI supports.

### Aesthetic Direction
- **Visual tone**: Minimal, spacious, refined. Generous whitespace, clear typography, subtle depth. Dark-only theme.
- **References**: Codex, Craft Docs—clean layouts, thoughtful typography, restrained color, purposeful motion.
- **Anti-references**: Claude's interface (don't mimic that style).
- **Theme**: Dark mode only. Current orange/red accent palette can stay as a signature but should feel intentional and polished, not noisy.

### Design Principles
1. **Minimal first** – Remove before adding. Every element should earn its place. No decorative clutter.
2. **Beautiful and polished** – Typography, spacing, and motion should feel considered and high-quality (Apple/OpenAI/Codex/Craft level).
3. **Content leads** – Trivia content is the hero; UI frames and supports it without competing.
4. **Accessible by default** – WCAG AA and solid screen reader support so the product is future-proof and inclusive as you open to more users (e.g. pub hosts).
5. **Restrained motion** – Animations and transitions should feel purposeful and smooth, not flashy or distracting.

### Codebase Map

@CODE_MAP.md

---

## Architecture (one paragraph)

Static UI on Vercel (`public/` via `npm run build`). Game generation: `POST /api/generate` → GitHub Actions `weekly-game.yml` → `npm run generate:publish`. Browser state sync: `POST /api/sync-state` → `data/question-ledger.json`. Local dev: `npm run dev` exposes the same API contract with filesystem adapters.

## Data sources (do not conflate)

| Round(s) | Source | Notes |
|----------|--------|--------|
| 1, 3, 8, Final | `data/archive-backup.json` | J! Archive via `npm run populate-archive` → `clues.db` → `db-to-archive` |
| 6 | Archive + entertainment keyword filter | Not a separate file |
| 4 | `data/list-round-questions.json` | Curated multi-answer pool — **not** J! Archive |
| 2, 5, 7 | LLM (`OPENAI_API_KEY`) | Over/Under, Game Show, Mixing Things Up; pool append-only fallback |

**Archive:** ~148 MB, ~563k clues in `data/archive-backup.json`. Tracked with **Git LFS** (plain git exceeds GitHub’s 100 MB limit). Used by generation/CI only — never shipped in `public/`.

**List-round exhaustion** is a small-pool / ledger issue, not missing archive.

## Testing while building

Use **three tiers** — thorough local testing without pulling 148 MB on every push.

| Tier | Command | When | Needs archive | Needs OpenAI |
|------|---------|------|---------------|--------------|
| **Fast** | `npm run test:fast` | Every change / every push (`test.yml`) | No (fixtures) | No |
| **Integration** | `npm run test:integration` | Before merging generator changes | Yes (`data/archive-backup.json`) | Yes (rounds 2/5/7) |
| **Full** | `npm run test:all` | Pre-release sanity | Yes | Yes |

Integration tests in `generate-game.test.js` are gated on `RUN_INTEGRATION=1` (skipped by default in `test:fast`).

### Local (recommended while iterating)

```bash
npm run test:fast

FAST_GENERATION=1 OPENAI_API_KEY=... npm run test:integration

FAST_GENERATION=1 OPENAI_API_KEY=... npm run generate:publish -- --date 2099-01-01 --force

npm run dev   # http://localhost:3000 (serves index.dev.html when present)
```

### CI

| Workflow | Triggers | What it runs |
|----------|----------|--------------|
| `test.yml` | Every push / PR | `npm run test:fast` only — no LFS |
| `integration.yml` | Manual dispatch, or PR label `run-integration` | LFS checkout, `test:fast`, `test:integration`, dry-run `generate:publish` |
| `weekly-game.yml` | Weekly cron, manual, `repository_dispatch` | `npm run generate:publish` → commit games + ledger |

Do **not** enable LFS on `test.yml` — bandwidth adds up on every push. LFS is enabled on `integration.yml` and `weekly-game.yml` only.

### Git LFS (archive)

One-time on each machine:

```bash
brew install git-lfs   # or your OS package manager
git lfs install
git lfs pull           # after clone, fetches data/archive-backup.json
```

`.gitattributes` tracks `data/archive-backup.json` via LFS. After `populate-archive`, add with `git add data/archive-backup.json` (Git LFS must be installed).

## Shared domain (prefer over duplicating)

- `shared/round-catalog.js` — runtime `ROUND_TEMPLATES`
- `shared/round-review.js` — review metadata only
- `shared/question-ledger.js`, `scripts/lib/ledger-io.js` — used + bans
- `shared/alternates.js` — precomputed shuffle sets on game JSON
- `js/lib/storage.js`, `js/lib/alternate-consumer.js` — browser state + alternates

## Common agent pitfalls

1. **`game-list.js` / `game-display.js` must load as `type="module"`** (ES imports).
2. **`index.dev.html`** is served at `/` when present; use `type="module"` for game-list there too.
3. **Browser cannot fetch `archive-backup.json`** in production (excluded from `public/`). Shuffle/replace uses game `alternates` or pool JSON files.
4. **`npm test`** aliases to `test:fast` — not full integration.
5. **Round 4 errors** → list pool / ledger, not missing J! Archive.

## Key commands

```bash
npm run dev
npm run build
npm run generate:publish
npm run migrate-ledger
npm run populate-archive   # download + parse J! Archive (maintainer)
```

Human-oriented setup: `README-DEV.md`.
