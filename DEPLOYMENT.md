# Vercel Deployment Guide

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

## Troubleshooting

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
