// Serverless function to trigger a Vercel redeployment with game generation
// This uses Vercel's Deploy Hook feature

export default async function handler(req, res) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Get the Deploy Hook URL from environment variable
  const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK;
  
  if (!deployHookUrl) {
    console.error('VERCEL_DEPLOY_HOOK not configured');
    return res.status(500).json({ 
      error: 'Deploy hook not configured. Please set VERCEL_DEPLOY_HOOK in Vercel environment variables.',
      setup: 'Go to Vercel Dashboard → Your Project → Settings → Git → Deploy Hooks → Create Hook'
    });
  }

  try {
    // Trigger the deploy hook
    // We append ?generate=true to signal that this deployment should generate a game
    const hookUrlWithParam = deployHookUrl.includes('?') 
      ? `${deployHookUrl}&meta-GENERATE_GAME=true`
      : `${deployHookUrl}?meta-GENERATE_GAME=true`;
    
    console.log('Triggering deploy hook...');
    
    const response = await fetch(hookUrlWithParam, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Deploy hook failed:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `Deploy hook failed: ${errorText}` 
      });
    }

    const result = await response.json().catch(() => ({}));
    console.log('Deploy hook triggered successfully:', result);

    return res.status(200).json({ 
      success: true, 
      message: 'Deployment triggered! A new game will be generated.',
      job: result
    });

  } catch (error) {
    console.error('Error triggering deploy:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}

