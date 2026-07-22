# TriviaBot — Code Map

A progressive-disclosure reference for navigating and onboarding to this codebase.
Diagrams go from macro (system) to micro (question lifecycle).

---

## 1. System Overview

All major components and data flow at a glance.

```mermaid
graph LR
    User([User]) --> Browser["Browser\nindex.html / game.html"]
    Browser --> API["Vercel Serverless\n/api/generate · /api/sync-state"]
    API --> GHA["GitHub Actions\nweekly-game.yml"]
    GHA --> Scripts["generate:publish\ngenerate-game.js\nupdate-games-index.js"]
    Scripts --> DataLayer["Data Layer\narchive-backup.json\nquestion-ledger.json\ndata/games/"]
    DataLayer --> CDN["CDN\nVercel → public/"]
    CDN -->|"static files"| Browser
    Browser -.->|"poll /games/index.json every 10s"| CDN
```

---

## 2a. Game Generation Pipeline

From "Generate" click to playable game.

```mermaid
flowchart TD
    A["User clicks Generate"] --> B["game-list.js\ncalls /api/generate"]
    B --> C["Serverless fn fires\nrepository_dispatch"]
    C --> D["GitHub Actions triggered"]
    D --> E["scripts/generate-game.js"]
    E --> F["Load archive-backup.json\n+ 10 specialized pools"]
    F --> G{OPENAI_API_KEY set?}
    G -->|yes| H["LLM path\nfilterQuestionsWithLLM()\nshouldDisqualifyQuestion()\nrewriteQuestion()"]
    G -->|no| I["Pattern-match fallback"]
    H --> J["Deduplicate against\nused-questions.json + banned-questions.json\n+ UI-synced counterparts"]
    I --> J
    J --> K["Write data/games/game-YYYY-MM-DD.json"]
    K --> L["update-games-index.js\nupdates data/games/index.json"]
    L --> M["Commit + push"]
    M --> N["Vercel redeploy"]
    N --> O["Frontend polls every 10s\ndetects new game → auto-refresh"]
```

---

## 2b. User Interaction Map

All user actions across both pages, and how state is synced.

```mermaid
flowchart TD
    subgraph GameList["Game List  ·  js/game-list.js"]
        GL["index.html"] --> GL1["Filter: all / unplayed / played"]
        GL --> GL2["Open game"]
        GL --> GL3["Generate new game"]
        GL --> GL4["Refresh list"]
    end

    subgraph GameDisplay["Game Display  ·  js/game-display.js"]
        GD["game.html"] --> GD1["Expand / collapse round"]
        GD --> GD2["Ban question"]
        GD --> GD3["Shuffle round"]
        GD --> GD4["Mark as played"]
        GD --> GD5["Navigate back"]
    end

    subgraph SyncLayer["Sync Layer"]
        S1["localStorage\nplayed · bans · used"] --> S2["/api/sync-state"] --> S3["data/question-ledger.json"]
    end

    GL2 --> GD
    GD5 --> GL

    GD2 --> RF["fetch replacement question"]
    GD3 --> RF
    RF --> GD

    GD2 --> S1
    GD3 --> S1
    GD4 --> S1
```

---

## 3a. Round Architecture

All 8 rounds + Final Trivia.

| # | Name | Points | Source | Notes |
|---|------|--------|--------|-------|
| 1 | Get Your Feet Wet | 2 | Archive | Easy questions to ease in |
| 2 | Over / Under | 3 | LLM-generated (`over-under-questions.json`) | Numeric guessing |
| 3 | Trifecta Trivia | 3 | Archive | Easy; first "trivia in earnest" round |
| 4 | The List Round | variable | `list-round-questions.json` | Single multi-answer question; 1 pt per answer |
| 5 | Game Show Style | 4 | LLM + specialized pools | Subtypes: Family Feud · Name That Tune · Millionaire · To Tell the Truth |
| 6 | Entertainment Trivia | 4 | Archive | Movies / TV / music / books |
| 7 | Mixing Things Up | 5 | LLM + specialized pools | Subtypes: Who Am I · Size Matters · Name That Brand · Name That Sports Team |
| 8 | Game Changer | 6 | Archive | Medium difficulty |
| F | Final Trivia | — | Archive | — |

```mermaid
flowchart TD
    R1["Round 1 · Get Your Feet Wet · 2pts"]
    R2["Round 2 · Over/Under · 3pts"]
    R3["Round 3 · Trifecta Trivia · 3pts"]
    R4["Round 4 · The List Round · variable pts"]

    subgraph R5["Round 5 · Game Show Style · 4pts  —  one subtype per game"]
        R5pick["picks one"] --> R5A["Family Feud"]
        R5pick --> R5B["Name That Tune"]
        R5pick --> R5C["Millionaire"]
        R5pick --> R5D["To Tell the Truth"]
    end

    R6["Round 6 · Entertainment Trivia · 4pts"]

    subgraph R7["Round 7 · Mixing Things Up · 5pts  —  one subtype per game"]
        R7pick["picks one"] --> R7A["Who Am I"]
        R7pick --> R7B["Size Matters"]
        R7pick --> R7C["Name That Brand"]
        R7pick --> R7D["Name That Sports Team"]
    end

    R8["Round 8 · Game Changer · 6pts"]
    RF["Final Trivia"]

    R1 --> R2 --> R3 --> R4 --> R5 --> R6 --> R7 --> R8 --> RF
```

---

## 3b. Question Lifecycle

How a question moves from source data to played (or banned).

```mermaid
stateDiagram-v2
    [*] --> InPool : loaded from archive or specialized pool
    InPool --> InGame : selected by generate-game.js
    InGame --> InGame : ban or shuffle triggers replacement
    InGame --> Used : question displayed in game
    InGame --> Banned : host bans question
    Used --> [*] : added to used-questions.json
    Banned --> [*] : added to banned-questions.json (permanent)

    note right of Used
        Synced to repo via
        localStorage → /api/sync-ui-data
        → used-questions-ui.json
    end note

    note right of Banned
        Synced to repo via
        localStorage → /api/sync-ui-data
        → banned-questions-ui.json
    end note
```

---

## Critical Files

| File | Role |
|------|------|
| `js/game-list.js` | Generate trigger, filtering, 10s polling |
| `js/game-display.js` | Round rendering, ban/shuffle, played tracking |
| `scripts/generate-game.js` | Full pipeline: `ROUND_TEMPLATES`, LLM functions, dedup; injects few-shot exemplars into rounds 2/5/7 |
| `scripts/update-games-index.js` | Maintains `data/games/index.json` |
| `scripts/lib/round-subtypes.js` | Single source of truth for round 5/7 subtypes + `matchSubType()` (shared by generation + ingest) |
| `scripts/lib/few-shot-examples.js` | Loads `data/llm-train/*.jsonl` and builds few-shot prompt blocks (closes the ingest→generate loop) |
| `scripts/lib/question-quality.js` | Machine-applied trivia-quality rules: `QUALITY_SYSTEM_RULES` (appended to the LLM system prompt) + `verifyGeneratedQuestions()`, an opt-in detector pass gated by `VERIFY_LLM_QUESTIONS=1`. Condensed counterpart of the `trivia-question-quality` skill |
| `scripts/eval-question-quality.js` | A/B quality eval for LLM rounds 2/5/7: generates each twice (rules off = baseline vs on = treatment), grades with an LLM judge (blind-solve + checklist score) and emits a blind human-review sheet. Dry-run by default; `--run` spends API. `npm run eval-questions` |
| `scripts/ingest-llm-rounds-from-examples.js` | Markdown-AST parse of `example games/` → SQLite `data/llm-rounds.db` (gitignored intermediate) |
| `scripts/export-llm-rounds-jsonl.js` | Exports SQLite → committed `data/llm-train/round{2,5,7}.jsonl` (regen: `npm run refresh-llm-train`) |
| `api/trigger-workflow.js` | Serverless: fires GitHub Actions workflow dispatch |
| `api/trigger-deploy.js` | Serverless: manual deploy trigger |
| `api/sync-ui-data.js` | Serverless: persists ban/used state from webapp |
| `data/games/index.json` | Game index consumed by frontend |
| `.github/workflows/weekly-game.yml` | Scheduled weekly game generation |
| `.github/workflows/deploy.yml` | Vercel deploy automation |
| `.github/workflows/test.yml` | CI test runner |

---

## Specialized Data Pools

Ten JSON files under `data/` feed the non-archive rounds:

| File | Used by round |
|------|--------------|
| `over-under-questions.json` | Round 2 |
| `list-round-questions.json` | Round 4 |
| `family-feud-questions.json` | Round 5 |
| `name-that-tune-questions.json` | Round 5 |
| `millionaire-questions.json` | Round 5 |
| `to-tell-the-truth-questions.json` | Round 5 |
| `who-am-i-questions.json` | Round 7 |
| `size-matters-questions.json` | Round 7 |
| `name-that-brand-questions.json` | Round 7 |
| `name-that-sports-team-questions.json` | Round 7 |
