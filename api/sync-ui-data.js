// Vercel serverless function: sync UI bans and used questions to repo files
// So the generator (e.g. GitHub Actions) can read data/banned-questions-ui.json and data/used-questions-ui.json
// Uses same GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO as trigger-workflow

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
  }

  const owner = process.env.GITHUB_OWNER || 'mordechaih';
  const repo = process.env.GITHUB_REPO || 'TriviaBot';
  const branch = process.env.GITHUB_BRANCH || 'main';

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const bannedPayload = body.bannedQuestions || { questions: [], lastUpdated: new Date().toISOString() };
  const usedIds = Array.isArray(body.usedQuestions) ? body.usedQuestions : [];

  const auth = `Bearer ${token}`;

  async function getFileSha(path) {
    const r = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers: { Accept: 'application/vnd.github.v3+json', Authorization: auth } }
    );
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`GET ${path}: ${r.status}`);
    const j = await r.json();
    return j.sha;
  }

  async function putFile(path, content, message) {
    const sha = await getFileSha(path);
    const body = {
      message,
      content: Buffer.from(JSON.stringify(content, null, 2), 'utf8').toString('base64'),
      branch
    };
    if (sha) body.sha = sha;

    const r = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: auth,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || `PUT ${path}: ${r.status}`);
    }
  }

  try {
    await putFile(
      'data/banned-questions-ui.json',
      bannedPayload,
      'Sync banned questions from webapp'
    );
    await putFile(
      'data/used-questions-ui.json',
      usedIds,
      'Sync used questions from webapp'
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('sync-ui-data error:', error);
    return res.status(500).json({ error: error.message || 'Failed to sync' });
  }
}
