// GitHub Configuration Example
// Copy this file to config.js and fill in your credentials
// config.js is gitignored and won't be committed to the repository

const GITHUB_CONFIG = {
  owner: 'your-username',        // Your GitHub username
  repo: 'TriviaBot',             // Your repository name
  branch: 'main',                // Your default branch
  // API endpoint for your serverless function (Vercel or Netlify)
  // Set this after deploying the serverless function
  apiEndpoint: '' // e.g., 'https://your-app.vercel.app/api/trigger-workflow' or 'https://your-app.netlify.app/.netlify/functions/trigger-workflow'
};

