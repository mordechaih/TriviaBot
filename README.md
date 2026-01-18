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

## GitHub Pages Deployment

1. Push the repository to GitHub
2. Enable GitHub Pages in repository settings (Settings > Pages)
3. Select the `main` branch as the source
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

The webapp includes a "Generate New Game" button that allows you to trigger game generation remotely. To use this feature:

1. **Create a GitHub Personal Access Token**:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Give it a name like "TriviaBot Game Generation"
   - Select the `repo` scope (full control of private repositories)
   - Click "Generate token" and copy it

2. **First-time setup**:
   - When you click "Generate New Game" for the first time, you'll be prompted to enter:
     - Your GitHub username
     - Repository name (defaults to "TriviaBot")
     - Your Personal Access Token
   - This information is stored in your browser's localStorage for future use

3. **Using the button**:
   - Click "Generate New Game" on the main page
   - The workflow will be triggered via GitHub's API
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

