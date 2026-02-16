#!/usr/bin/env node
// Simple local development server for TriviaBot
// Run with: node server.js
// Optional: create a .env file with OPENAI_API_KEY=sk-... for local game generation

import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// MIME types for common files
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Handle local game generation API endpoint
  if (req.url === '/api/generate-local' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Consume request body (even if we don't use it)
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        console.log('\n🎮 Generating new game locally...');
        
        // Generate a new game - capture output for better error messages
        let generateOutput = '';
        try {
          generateOutput = execSync('node scripts/generate-game.js', {
            encoding: 'utf8',
            cwd: __dirname,
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
            env: { ...process.env, FAST_GENERATION: '1' } // smaller LLM pool so generation finishes in ~1–2 min
          });
          console.log(generateOutput);
        } catch (generateError) {
          console.error('Generate script error:', generateError.message);
          if (generateError.stdout) console.log('STDOUT:', generateError.stdout);
          if (generateError.stderr) console.error('STDERR:', generateError.stderr);
          throw generateError;
        }
        
        // Update the index
        let indexOutput = '';
        try {
          indexOutput = execSync('node scripts/update-games-index.js', { 
            encoding: 'utf8',
            cwd: __dirname 
          });
          console.log(indexOutput);
        } catch (indexError) {
          console.error('Index update error:', indexError.message);
          // Don't fail if index update fails, game was still generated
        }
        
        console.log('✅ Game generation complete!\n');
        
        res.writeHead(200);
        res.end(JSON.stringify({ 
          success: true, 
          message: 'Game generated successfully!' 
        }));
      } catch (error) {
        console.error('❌ Error generating game:', error.message);
        const errorDetails = {
          error: error.message,
          stdout: error.stdout || null,
          stderr: error.stderr || null
        };
        res.writeHead(500);
        res.end(JSON.stringify(errorDetails));
      }
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Request error' }));
    });
    
    return;
  }

  // Handle UI data sync endpoint (bans + used questions → data/ files for generator)
  if (req.url === '/api/sync-ui-data' && req.method === 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);

        if (payload.bannedQuestions) {
          const file = path.join(__dirname, 'data', 'banned-questions-ui.json');
          fs.writeFileSync(file, JSON.stringify(payload.bannedQuestions, null, 2));
          console.log(`Synced ${(payload.bannedQuestions.questions || []).length} banned question(s) to data/banned-questions-ui.json`);
        }

        if (payload.usedQuestions) {
          const file = path.join(__dirname, 'data', 'used-questions-ui.json');
          const ids = Array.isArray(payload.usedQuestions) ? payload.usedQuestions : [];
          fs.writeFileSync(file, JSON.stringify(ids, null, 2));
          console.log(`Synced ${ids.length} used question ID(s) to data/used-questions-ui.json`);
        }

        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('Error syncing UI data:', error.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve static files
  // Strip query params so cache-busting doesn't break file lookup
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let filePath = '.' + requestUrl.pathname;
  if (filePath === './' || filePath === './index.html') {
    // Use dev index for local development (uses local API endpoint)
    filePath = './index.dev.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🎮 TriviaBot Development Server`);
  console.log(`📡 Running at http://localhost:${PORT}`);
  console.log(`🎯 Local game generation available at /api/generate-local`);
  console.log(`\nPress Ctrl+C to stop\n`);
});

