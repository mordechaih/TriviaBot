# Deployment Guide

TriviaBot supports deployment to both **GitHub Pages** and **Vercel**. Choose the option that best fits your needs.

## Deployment Options

### Option 1: GitHub Pages (Free, Simple)

GitHub Pages is perfect if you want a simple, free hosting solution that integrates directly with your GitHub repository.

### Option 2: Vercel (Recommended for Production)

Vercel offers better performance, automatic preview deployments, and more advanced features. Recommended for production deployments.

---

# GitHub Pages Deployment

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

## Automatic Deployment (GitHub Pages)

The repository includes:
- **Automatic deployment**: Every push to `main` branch automatically deploys to GitHub Pages
- **Weekly game generation**: A workflow runs every Monday at 9:00 AM UTC to generate new games
- **Manual game generation**: You can trigger game generation from the web interface or GitHub Actions

## Troubleshooting (GitHub Pages)

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

---

# Vercel Deployment

Your TriviaBot is configured for deployment on Vercel! This guide covers setup, deployment, and preview workflows.

## Initial Setup

### Step 1: Connect Your Repository to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (or create an account)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository (or GitLab/Bitbucket)
4. Vercel will automatically detect your `vercel.json` configuration
5. Click **"Deploy"**

### Step 2: Configure Environment Variables (if needed)

If your project requires environment variables:
1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add any required variables (e.g., API keys)

### Step 3: Access Your Site

Once deployed, your site will be available at:
- Production: `https://your-project-name.vercel.app`
- Custom domain: If configured, your custom domain

## Deployment Workflows

### Automatic Production Deployments

**Every push to your main branch automatically deploys to production.**

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will automatically:
- Build your project
- Deploy to production
- Update your production URL

### Preview Deployments

Vercel automatically creates preview deployments for:

#### 1. Pull Requests
- Every PR gets a unique preview URL
- Preview URL appears in PR comments (if GitHub integration enabled)
- Perfect for reviewing changes before merging

**Workflow:**
```bash
# Create a feature branch
git checkout -b feature/my-feature

# Make your changes
git add .
git commit -m "Add new feature"
git push origin feature/my-feature

# Create a PR on GitHub
# Vercel automatically creates a preview deployment
```

#### 2. Branch Deployments
- Any branch pushed to GitHub gets a preview URL
- Accessible from Vercel dashboard

#### 3. Manual Preview Deployments

Preview changes without deploying to production:

```bash
# Preview deployment (creates a preview URL, doesn't affect production)
npx vercel

# Or use the npm script
npm run deploy
```

This will:
- Build your project
- Create a preview deployment
- Give you a unique preview URL
- **NOT** affect your production site

### Production Deployment

Deploy directly to production:

```bash
# Deploy to production
npx vercel --prod

# Or if you have vercel installed globally
vercel --prod
```

## Preview vs Production: When to Preview?

### ✅ Preview Before Deploying For:
- UI/UX changes
- New features or functionality
- Breaking changes
- Complex updates
- Testing in production-like environment

### 🚀 Deploy Directly For:
- Small text/typo fixes
- Documentation updates
- Minor CSS tweaks
- Quick bug fixes

## Recommended Workflow

### For Small Changes:
```bash
# Direct push to main → auto-deploys to production
git add .
git commit -m "Fix typo"
git push origin main
```

### For Larger Changes:
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# 3. Create PR on GitHub
# → Vercel automatically creates preview deployment

# 4. Review preview URL in PR

# 5. Merge PR → auto-deploys to production
```

## Monitoring Deployments

### Vercel Dashboard
- View all deployments (production and previews)
- Check build logs
- Monitor deployment status
- Access preview URLs

### Deployment Status
- ✅ Success: Green checkmark
- ⏳ Building: Yellow spinner
- ❌ Failed: Red X (check logs for errors)

## Configuration

Your project uses `vercel.json` for configuration:
- **Build Command**: `npm run build` (generates config.js)
- **Output Directory**: `.` (root directory)
- **API Routes**: `/api/trigger-workflow` → `/api/trigger-workflow.js`
- **Clean URLs**: Enabled
- **Trailing Slash**: Disabled

## Troubleshooting (Vercel)

### If deployment fails:
1. Check build logs in Vercel dashboard
2. Verify `npm run build` works locally:
   ```bash
   npm run build
   ```
3. Check for missing dependencies or environment variables
4. Review `vercel.json` configuration

### If preview doesn't work:
1. Ensure your repository is connected to Vercel
2. Check that branch/PR has been pushed to GitHub
3. Verify Vercel has access to your repository

### If site doesn't load:
1. Check deployment status in Vercel dashboard
2. Verify build completed successfully
3. Check browser console for errors
4. Ensure all required files are committed

## Updating Your Site

Simply push changes to trigger automatic deployment:

```bash
git add .
git commit -m "Update description"
git push origin main
```

Production will automatically update within 1-2 minutes!

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Preview Deployments Guide](https://vercel.com/docs/concepts/deployments/preview-deployments)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

---

## Choosing Between GitHub Pages and Vercel

### Use GitHub Pages if:
- You want the simplest setup
- You're already using GitHub Actions
- You don't need preview deployments
- You want everything in one place (GitHub)

### Use Vercel if:
- You want better performance
- You need preview deployments for PRs
- You want more advanced features
- You need better analytics and monitoring
- You want automatic HTTPS and CDN

You can also use both! Deploy to GitHub Pages for the main site and use Vercel for preview deployments.
