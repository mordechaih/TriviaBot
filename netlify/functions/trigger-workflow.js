// Netlify serverless function to trigger GitHub Actions workflow
// Set GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO as environment variables in Netlify

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Get token from environment variable
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'GitHub token not configured' })
    };
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    body = {};
  }

  // Get repo info from request body or environment
  const repoOwner = body.owner || process.env.GITHUB_OWNER;
  const repoName = body.repo || process.env.GITHUB_REPO;
  const branch = body.branch || 'main';

  if (!repoOwner || !repoName) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Repository information required' })
    };
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
      return {
        statusCode: dispatchResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: error.message || 'Failed to trigger workflow' 
        })
      };
    }

    // repository_dispatch returns 204 No Content on success
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: true, 
        message: 'Workflow triggered successfully' 
      })
    };

  } catch (error) {
    console.error('Error triggering workflow:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: error.message || 'Internal server error' 
      })
    };
  }
};

