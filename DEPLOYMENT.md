# Deployment Guide

TriviaBot uses **Vercel** for the static UI and **GitHub Actions** for game generation. GitHub Pages deployment has been retired.

## Architecture

| Component | Owner |
|-----------|--------|
| Static UI (`public/`) | Vercel |
| `POST /api/generate` | Vercel serverless → GitHub Actions `weekly-game.yml` |
| `POST /api/sync-state` | Vercel serverless → commits `data/question-ledger.json` |
| Games + ledger | Git in `data/games/`, `data/question-ledger.json` |

## Vercel Setup

1. Connect the GitHub repo to Vercel.
2. Build settings (from `vercel.json`):
   - **Build command:** `npm run build`
   - **Output directory:** `public`
3. Environment variables:
   - `GITHUB_TOKEN` — repo write access for sync-state + workflow dispatch
   - `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_BRANCH` (optional overrides)
   - `OPENAI_API_KEY` — only needed if you trigger generation from Actions (set in GitHub Secrets, not Vercel)

## GitHub Actions

- **Workflow:** `.github/workflows/weekly-game.yml`
- **Trigger:** weekly cron, manual dispatch, or `repository_dispatch` from `/api/generate`
- **Command:** `npm run generate:publish` (atomic game + index + ledger)

Required secret: `OPENAI_API_KEY`

## Local Development

```bash
npm install
npm run dev          # http://localhost:3000 — same API contract as production
npm run generate:publish   # local filesystem publish
npm run migrate-ledger     # one-time legacy ledger merge
npm run build        # assemble public/
npm test             # unit + contract tests (integration: RUN_INTEGRATION=1)
```

## Public URL stability

`npm run build` copies HTML, CSS, JS, shared modules, and game data into `public/` while excluding the archive, scripts, and maintainer tooling. Existing browser paths (`/data/games/…`, `/js/…`) are unchanged.
