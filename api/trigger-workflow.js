// Serverless function to trigger GitHub Actions workflow
// Deploy this to Vercel, Netlify, or similar
// Set GITHUB_TOKEN as an environment variable in your hosting platform

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get token from environment variable (set in your hosting platform)
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GitHub token not configured' });
  }

  // Get repo info from request body or environment
  const { owner, repo, branch = 'main' } = req.body;
  const repoOwner = owner || process.env.GITHUB_OWNER;
  const repoName = repo || process.env.GITHUB_REPO;

  if (!repoOwner || !repoName) {
    return res.status(400).json({ error: 'Repository information required' });
  }

  try {
    // Use repository_dispatch to trigger the workflow
    // This is more secure and aligns with the workflow's repository_dispatch trigger
    const dispatchResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: 'generate-game',
          client_payload: {
            triggered_by: 'webapp',
            timestamp: new Date().toISOString()
          }
        })
      }
    );

    if (!dispatchResponse.ok) {
      const error = await dispatchResponse.json().catch(() => ({}));
      return res.status(dispatchResponse.status).json({ 
        error: error.message || 'Failed to trigger workflow' 
      });
    }

    // repository_dispatch returns 204 No Content on success
    return res.status(200).json({ 
      success: true, 
      message: 'Workflow triggered successfully' 
    });

  } catch (error) {
    console.error('Error triggering workflow:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}

