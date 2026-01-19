# TriviaBot - Local Development Guide

## Quick Start for Development

### Running Locally (No Vercel Deployments)

1. **Start the local dev server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   ```
   http://localhost:3000/index.dev.html
   ```

3. **Generate games locally:**
   - Click the "Generate New Game" button
   - Games are generated instantly on your machine
   - No Vercel deployments needed!
   - Files are saved to `data/games/`

### How It Works

- `server.js` - Simple HTTP server with a local game generation endpoint
- `index.dev.html` - Development version of index.html with dev mode indicator
- `js/config.dev.js` - Points to local API endpoint (`http://localhost:3000/api/generate-local`)
- `/api/generate-local` - Runs `generate-game.js` and `update-games-index.js` directly

### Development Workflow

1. **Make changes** to game generation logic in `scripts/generate-game.js`
2. **Test locally** by clicking "Generate New Game" in dev mode
3. **Iterate** without any Vercel deployments
4. **When ready**, commit and push to deploy to Vercel

### Manual Game Generation (Command Line)

You can also generate games directly from the command line:

```bash
# Generate game for today (or next available date)
node scripts/generate-game.js

# Generate game for specific date
node scripts/generate-game.js --date 2026-01-25

# Update the index after generating
node scripts/update-games-index.js
```

### Switching to Production

When you're done developing and want to deploy:

1. **Regular deployment** (without game generation):
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **Deployment with game generation** (using Deploy Hook):
   - Click "Generate New Game" on the production site
   - Or use the Vercel Deploy Hook API

### File Structure

```
Development Files (not committed):
- server.js              # Local dev server
- index.dev.html         # Dev version of index page  
- js/config.dev.js       # Local API endpoint config

Production Files (committed):
- index.html             # Production version
- js/config.js           # Generated at build time
- api/trigger-deploy.js  # Vercel Deploy Hook API
```

### Tips

- **Dev mode has an orange banner** at the top so you know you're in local mode
- **Games persist** - generated games are saved to `data/games/` and work in both dev and production
- **No quota limits** - generate as many games as you want locally
- **Fast iteration** - changes are instant, no waiting for deployments

### Troubleshooting

**Port already in use:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Game generation fails:**
- Check that `data/archive-backup.json` exists
- Run `npm run scrape` to populate the archive if needed
- Check console for error messages

