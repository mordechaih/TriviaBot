// Sync browser ban/used state into repo question ledger via GitHub API
import { mergeSyncPayload } from '../scripts/lib/sync-handlers.js';
import { emptyLedger, mergeLegacyLedgers, normalizeLedger } from '../shared/question-ledger.js';

/**
 * @param {string} owner
 * @param {string} repo
 * @param {string} branch
 * @param {string} auth
 * @param {string} path
 */
async function fetchJsonFromGitHub(owner, repo, branch, auth, filePath) {
  const r = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`,
    { headers: { Accept: 'application/vnd.github.v3+json', Authorization: auth } },
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GET ${filePath}: ${r.status}`);
  const j = await r.json();
  const content = Buffer.from(j.content, 'base64').toString('utf8');
  return { sha: j.sha, data: JSON.parse(content) };
}

/**
 * Load current ledger from GitHub (canonical in production).
 */
async function loadLedgerFromGitHub(owner, repo, branch, auth) {
  const primary = await fetchJsonFromGitHub(owner, repo, branch, auth, 'data/question-ledger.json');
  if (primary?.data) return normalizeLedger(primary.data);

  const [usedMain, usedUi, bannedMain, bannedUi] = await Promise.all([
    fetchJsonFromGitHub(owner, repo, branch, auth, 'data/used-questions.json'),
    fetchJsonFromGitHub(owner, repo, branch, auth, 'data/used-questions-ui.json'),
    fetchJsonFromGitHub(owner, repo, branch, auth, 'data/banned-questions.json'),
    fetchJsonFromGitHub(owner, repo, branch, auth, 'data/banned-questions-ui.json'),
  ]);

  return mergeLegacyLedgers({
    usedMain: usedMain?.data ?? [],
    usedUi: usedUi?.data ?? [],
    bannedMain: bannedMain?.data ?? { questions: [] },
    bannedUi: bannedUi?.data ?? { questions: [] },
  }) || emptyLedger();
}

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

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
  }

  const owner = process.env.GITHUB_OWNER || 'mordechaih';
  const repo = process.env.GITHUB_REPO || 'TriviaBot';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const auth = `Bearer ${token}`;

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  async function getFileSha(path) {
    const r = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      { headers: { Accept: 'application/vnd.github.v3+json', Authorization: auth } },
    );
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`GET ${path}: ${r.status}`);
    const j = await r.json();
    return j.sha;
  }

  async function putFile(path, content, message) {
    const sha = await getFileSha(path);
    const payload = {
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch,
    };
    if (sha) payload.sha = sha;

    const r = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: auth,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || `PUT ${path}: ${r.status}`);
    }
  }

  try {
    const current = await loadLedgerFromGitHub(owner, repo, branch, auth);
    const ledger = mergeSyncPayload(current, body);
    const ledgerJson = JSON.stringify(ledger, null, 2);

    await putFile('data/question-ledger.json', ledgerJson, 'Sync question ledger from webapp');
    await putFile(
      'data/banned-questions-ui.json',
      JSON.stringify(body.bannedQuestions || { questions: [], lastUpdated: new Date().toISOString() }, null, 2),
      'Sync banned questions from webapp',
    );
    await putFile(
      'data/used-questions-ui.json',
      JSON.stringify(body.usedQuestions || [], null, 2),
      'Sync used questions from webapp',
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('sync-state error:', error);
    return res.status(500).json({ error: error.message || 'Failed to sync' });
  }
}
