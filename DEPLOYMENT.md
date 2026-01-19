# GitHub Pages Deployment Guide

Your TriviaBot is now ready to be deployed to GitHub Pages! Follow these steps:

## Step 1: Create a GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name it `TriviaBot` (or any name you prefer)
5. **Do NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 2: Push Your Code to GitHub

Run these commands in your terminal (replace `YOUR_USERNAME` with your GitHub username):

```bash
cd /Users/mordechai/Documents/TriviaBot

# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/TriviaBot.git

# Push to GitHub
git push -u origin main
```

If you're using SSH instead of HTTPS:
```bash
git remote add origin git@github.com:YOUR_USERNAME/TriviaBot.git
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** (in the repository menu)
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select:
   - **Source**: `GitHub Actions`
5. The site will be automatically deployed via the workflow we created

## Step 4: Access Your Site

Once deployed (usually takes 1-2 minutes), your site will be available at:
- `https://YOUR_USERNAME.github.io/TriviaBot`

You can check the deployment status in the **Actions** tab of your repository.

## Automatic Deployment

The repository includes:
- **Automatic deployment**: Every push to `main` branch automatically deploys to GitHub Pages
- **Weekly game generation**: A workflow runs every Monday at 9:00 AM UTC to generate new games
- **Manual game generation**: You can trigger game generation from the web interface or GitHub Actions

## Troubleshooting

### If the site doesn't load:
1. Check the **Actions** tab to see if the deployment workflow completed successfully
2. Wait a few minutes - first deployment can take longer
3. Check that GitHub Pages is enabled in Settings > Pages

### If you need to update the site:
Just push changes to the `main` branch:
```bash
git add .
git commit -m "Your commit message"
git push
```

The site will automatically redeploy!

