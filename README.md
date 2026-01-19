# TriviaBot

A webapp that generates weekly trivia games from J! Archive data, hosted on GitHub Pages.

## Features

- **Weekly Trivia Games**: Automatically generates new trivia games every week
- **8 Rounds + Final**: Each game contains 8 rounds with 3 questions each, plus a Final Trivia question
- **Progressive Difficulty**: Questions increase in difficulty from easy to expert
- **Mobile-Optimized**: Responsive design optimized for mobile devices
- **Game Tracking**: Mark games as played to track your progress

## Setup

### Prerequisites

- Node.js 18 or higher
- npm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd TriviaBot
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Set up OpenAI API key for question filtering and rewriting:
```bash
export OPENAI_API_KEY=your-api-key-here
```

   If you don't set the API key, the system will use basic pattern matching to filter questions, but LLM-powered filtering and rewriting will be disabled.

### Initial Data Collection

Before generating games, you need to scrape J! Archive data:

```bash
# Test mode: scrape just 5 games
npm run scrape -- --test

# Scrape a specific season
npm run scrape -- --season 42

# Scrape recent seasons (default: seasons 40-42)
npm run scrape
```

The scraper will:
- Respect rate limits (2 second delay between requests)
- Save data to `data/archive-backup.json`
- Skip already-scraped games

### Generate a Game

```bash
# Generate game for today
npm run generate

# Generate game for a specific date
npm run generate -- --date 2024-01-15
```

### Update Games Index

After generating games, update the index:

```bash
npm run update-index
```

## Project Structure

```
TriviaBot/
├── index.html              # Game list page
├── game.html               # Game display page
├── css/
│   └── styles.css         # Mobile-optimized styles
├── js/
│   ├── game-list.js       # Game list logic
│   └── game-display.js     # Game rendering logic
├── data/
│   ├── archive-backup.json    # Scraped J! Archive data
│   ├── games/
│   │   ├── index.json         # Games index
│   │   └── game-YYYY-MM-DD.json  # Generated games
│   └── played-status.json     # Played status tracking
├── scripts/
│   ├── scrape-archive.js      # J! Archive scraper
│   ├── generate-game.js       # Game generator
│   └── update-games-index.js  # Index updater
└── .github/
    └── workflows/
        └── weekly-game.yml    # GitHub Actions automation
```

## Deployment

### Vercel (Recommended)

The project is configured to deploy to Vercel, which hosts both the static site and the serverless function:

1. **Import your GitHub repository to Vercel**:
   - Go to https://vercel.com
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Vercel will auto-detect the settings

2. **Set environment variables**:
   - In Vercel dashboard → Your project → Settings → Environment Variables
   - **Required**: `GITHUB_TOKEN` - Your Personal Access Token (with `repo` scope)
   - **Optional**: 
     - `GITHUB_OWNER` - Your GitHub username (defaults to 'mordechaih')
     - `GITHUB_REPO` - Repository name (defaults to 'TriviaBot')
     - `API_ENDPOINT` - Custom API endpoint URL (if not set, uses VERCEL_URL automatically)
   
   **Note**: `js/config.js` is automatically generated at build time from these environment variables, so you don't need to create it manually.

3. **Deploy**:
   - Vercel will automatically deploy on every push to `main`
   - Your site will be available at `https://your-project.vercel.app`

### GitHub Pages (Alternative)

If you prefer GitHub Pages instead:
1. Push the repository to GitHub
2. Enable GitHub Pages in repository settings (Settings > Pages)
3. Select `GitHub Actions` as the source
4. The site will be available at `https://<username>.github.io/TriviaBot`

## Automated Weekly Generation

The GitHub Actions workflow (`weekly-game.yml`) automatically:
- Runs every Monday at 9:00 AM UTC
- Generates a new trivia game
- Updates the games index
- Commits and pushes changes

To manually trigger:
- **From the webapp**: Click the "Generate New Game" button on the main page
- **From GitHub**: Go to Actions tab in GitHub, select "Generate Weekly Trivia Game", click "Run workflow"

### Generating Games from the Webapp

The webapp includes a "Generate New Game" button that allows you to trigger game generation remotely. This uses a secure serverless function to protect your GitHub token - the token never leaves the server and is never exposed in the browser.

#### Setup (One-time):

1. **Deploy the serverless function** (choose one):
   
   **Option A: Vercel (Recommended)**
   - Vercel CLI is already installed locally in the project
   - In your project directory, run: `npm run deploy` (or `npx vercel`)
   - Follow the prompts to deploy
   - After deployment, go to your Vercel dashboard
   - Navigate to your project → Settings → Environment Variables
   - Add these environment variables:
     - `GITHUB_TOKEN` - Your GitHub Personal Access Token (with `repo` scope)
     - `GITHUB_OWNER` - Your GitHub username (optional, can be in config.js)
     - `GITHUB_REPO` - Repository name (optional, can be in config.js)
   - Copy your function URL (e.g., `https://your-app.vercel.app/api/trigger-workflow`)
   
   **Option B: Netlify**
   - Install Netlify CLI: `npm i -g netlify-cli`
   - In your project directory, run: `netlify deploy --prod`
   - Follow the prompts to deploy
   - After deployment, go to your Netlify dashboard
   - Navigate to Site settings → Environment variables
   - Add the same environment variables as above
   - Copy your function URL (e.g., `https://your-app.netlify.app/.netlify/functions/trigger-workflow`)

2. **Create a GitHub Personal Access Token** (for the serverless function):
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Give it a name like "TriviaBot Game Generation"
   - Select the `repo` scope
   - Click "Generate token" and copy it
   - Add it as `GITHUB_TOKEN` in your serverless function's environment variables

3. **Configure the webapp**:
   - Edit `js/config.js` and fill in:
     ```javascript
     const GITHUB_CONFIG = {
       owner: 'your-username',
       repo: 'TriviaBot',
       branch: 'main',
       apiEndpoint: 'https://your-app.vercel.app/api/trigger-workflow'
     };
     ```
   - **Important**: `js/config.js` is gitignored and won't be committed
   - **Security**: The token is stored server-side in your hosting platform, never in the browser

#### How it works:
- **Frontend**: Calls your serverless function (no token exposed)
- **Serverless function**: Uses the token (stored as environment variable) to trigger the workflow
- **Workflow**: Uses `GITHUB_TOKEN` (automatically provided by GitHub Actions) for all operations
- **Security**: Your PAT is stored server-side and never exposed to the browser

#### Using the button:
- Click "Generate New Game" on the main page
- The workflow will be triggered securely via your serverless function
- You'll see a status message confirming the trigger
- The page will auto-refresh after 30 seconds to check for the new game
- Note: Game generation takes a few minutes to complete

## Legal Disclaimer

This site uses content from J! Archive, a fan-created archive of Jeopardy! games. The Jeopardy! game show and all elements thereof are the property of Jeopardy Productions, Inc. This website is not affiliated with, sponsored by, or operated by Jeopardy Productions, Inc. This site is for non-commercial, educational, and entertainment purposes only.

## Development

### Scraping Considerations

- The scraper respects J! Archive's robots.txt and rate limits
- Use `--test` flag for development/testing
- Scraped data is stored locally and not re-scraped

### Game Generation

- Questions are selected based on difficulty scores
- Difficulty is calculated from dollar values and round types
- Questions are tracked to avoid duplicates across games
- **Question Filtering**: Questions are automatically filtered to remove:
  - Anagram and wordplay categories that don't work for pub trivia
  - Category-themed questions (e.g., "I'm in Sephora without my glasses")
- **Question Rewriting**: Category-themed questions are rewritten to focus on content rather than the category theme
- Uses OpenAI GPT-4o-mini for intelligent filtering and rewriting (if API key is set)

### Played Status

- Played status is stored in `localStorage` by default
- For GitHub storage, you would need to implement GitHub API integration
- The current implementation uses localStorage as a fallback

## License

This project is for educational and non-commercial use only.

