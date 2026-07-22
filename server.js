#!/usr/bin/env node
// Local dev server — same API contract as Vercel production

import 'dotenv/config';
import http from 'http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { mergeSyncPayload, parseJsonBody, sendJson, corsHeaders } from './scripts/lib/sync-handlers.js';
import { loadQuestionLedger, saveQuestionLedger } from './scripts/lib/ledger-io.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

async function handleGenerate(res) {
  try {
    console.log('\n🎮 Generating new game locally...');
    execSync('node scripts/generate-publish.js', {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, FAST_GENERATION: '1' },
    });
    sendJson(res, 200, { success: true, message: 'Game generated and published locally' });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Generation failed' });
  }
}

async function handleSyncState(req, res) {
  try {
    const payload = await parseJsonBody(req);
    const ledger = mergeSyncPayload(loadQuestionLedger(), payload);
    saveQuestionLedger(ledger);
    console.log(`Synced ledger: ${ledger.usedIds.length} used, ${ledger.bans.questions.length} bans`);
    sendJson(res, 200, { success: true });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

async function handleReplacementQuestion(req, res) {
  try {
    const body = await parseJsonBody(req);
    const { roundNumber, subType } = body;
    if (!roundNumber || ![2, 5, 7].includes(roundNumber)) {
      sendJson(res, 400, { error: 'roundNumber must be 2, 5, or 7' });
      return;
    }
    const { generateLLMRound } = await import('./scripts/generate-game.js');
    const result = await generateLLMRound(roundNumber, subType || null, new Set(), []);
    if (!result?.questions?.length) {
      sendJson(res, 503, { error: 'LLM round generation returned no questions' });
      return;
    }
    sendJson(res, 200, { questions: result.questions, subType: result.subType });
  } catch (err) {
    sendJson(res, 500, { error: err.message || 'Failed to generate replacement round' });
  }
}

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(200, corsHeaders());
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname === '/api/generate' && req.method === 'POST') {
    await handleGenerate(res);
    return;
  }

  if ((pathname === '/api/sync-state' || pathname === '/api/sync-ui-data') && req.method === 'POST') {
    await handleSyncState(req, res);
    return;
  }

  if (pathname === '/api/generate-replacement-question' && req.method === 'POST') {
    await handleReplacementQuestion(req, res);
    return;
  }

  // Legacy local endpoint
  if (pathname === '/api/generate-local' && req.method === 'POST') {
    await handleGenerate(res);
    return;
  }

  let filePath = path.join(ROOT, pathname === '/' ? 'index.html' : `.${pathname}`);
  if (pathname === '/' || pathname === '/index.html') {
    const devIndex = path.join(ROOT, 'index.dev.html');
    filePath = fs.existsSync(devIndex) ? devIndex : path.join(ROOT, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end(error.code === 'ENOENT' ? 'Not Found' : 'Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`\n🎮 TriviaBot Development Server`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`🎯 POST /api/generate — local generate:publish\n`);
});
