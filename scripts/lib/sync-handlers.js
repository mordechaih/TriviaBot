/**
 * Shared sync handler: merge browser deltas into question ledger.
 * Used by local server and Vercel serverless (via adapter).
 */

import { applyLedgerDelta, normalizeLedger } from '../../shared/question-ledger.js';

/**
 * @param {import('../../shared/question-ledger.js').QuestionLedger} current
 * @param {{ bannedQuestions?: { questions: unknown[] }, usedQuestions?: string[] }} body
 * @returns {import('../../shared/question-ledger.js').QuestionLedger}
 */
export function mergeSyncPayload(current, body) {
  const ledger = normalizeLedger(current);
  const delta = {};

  if (body.bannedQuestions) {
    delta.bans = {
      questions: body.bannedQuestions.questions || body.bannedQuestions || [],
    };
  }

  if (Array.isArray(body.usedQuestions)) {
    delta.usedIds = body.usedQuestions;
  }

  return applyLedgerDelta(ledger, delta);
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<object>}
 */
export function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

/**
 * @param {import('http').ServerResponse} res
 * @param {number} status
 * @param {object} body
 */
export function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...corsHeaders() });
  res.end(JSON.stringify(body));
}

export { corsHeaders };
