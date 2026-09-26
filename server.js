// HTTP server: serves the web client and the composition API. No dependencies.
//   POST /api/compose          {prompt, sessionId, previousId?} → composition + chat reply
//   GET  /api/history?sessionId=…                             → past pieces (summaries)
//   GET  /api/pieces/:id                                      → full composition JSON
//   GET  /api/pieces/:id/midi?transpose=0&tempo=1             → Standard MIDI File

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { parseRequest } from './src/engine/parser.js';
import { composeWithFallback } from './src/engine/composer.js';
import { compositionToMidi } from './src/shared/midi.js';
import { buildReply } from './src/reply.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const MAX_PIECES = 300;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
};

// ---- piece store (memory + best-effort JSON persistence) ---------------------
const pieces = new Map();
function loadHistory() {
  try {
    const arr = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    for (const p of arr) pieces.set(p.id, p);
  } catch { /* first run */ }
}
let saveTimer = null;
function saveHistory() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(HISTORY_FILE, JSON.stringify([...pieces.values()]));
    } catch (e) { console.warn('history not saved:', e.message); }
  }, 300);
}
function storePiece(p) {
  pieces.set(p.id, p);
  while (pieces.size > MAX_PIECES) pieces.delete(pieces.keys().next().value);
  saveHistory();
}
loadHistory();

function summary(p) {
  const c = p.composition;
  return {
    id: p.id, prompt: p.prompt, createdAt: p.createdAt, parentId: p.parentId || null,
    title: c.title, style: c.meta.styleLabel, key: c.meta.key, tempo: c.meta.tempo,
    timeSignature: c.meta.timeSignature, duration: c.meta.duration,
  };
}

// ---- helpers -----------------------------------------------------------------
function send(res, status, body, headers = {}) {
  const isBuf = body instanceof Uint8Array || Buffer.isBuffer(body);
  const data = isBuf || typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': isBuf ? 'application/octet-stream' : typeof body === 'string' ? 'text/plain; charset=utf-8' : 'application/json',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(data);
}

function readJson(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('payload too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(Object.assign(new Error('invalid JSON'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, urlPath) {
  let base = path.join(ROOT, 'public');
  let rel = urlPath;
  if (urlPath.startsWith('/shared/')) { base = path.join(ROOT, 'src', 'shared'); rel = urlPath.slice('/shared'.length); }
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.normalize(path.join(base, decodeURIComponent(rel)));
  if (file !== base && !file.startsWith(base + path.sep)) return send(res, 403, 'forbidden');
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return send(res, 404, 'not found');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

// ---- API ---------------------------------------------------------------------
async function handleCompose(req, res) {
  const body = await readJson(req);
  const prompt = String(body.prompt || '').slice(0, 1000).trim();
  if (!prompt) return send(res, 400, { error: 'Tell me what to compose, e.g. "melancholic ambient piece in A minor".' });
  const sessionId = String(body.sessionId || 'anon').slice(0, 80);

  let previous = body.previousId ? pieces.get(String(body.previousId)) : null;
  if (!previous) {
    previous = [...pieces.values()].filter((p) => p.sessionId === sessionId).pop() || null;
  }
  const prevParams = previous?.composition.params || null;
  const parsed = parseRequest(prompt, prevParams);
  const composition = composeWithFallback(parsed);
  const id = randomUUID();
  const piece = {
    id, sessionId, prompt, createdAt: Date.now(), composition,
    parentId: parsed.remix && previous ? previous.id : null,
  };
  composition.id = id;
  storePiece(piece);
  send(res, 200, {
    id,
    reply: buildReply(composition, parsed, parsed.remix ? previous.composition : null),
    composition,
    summary: summary(piece),
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'POST' && url.pathname === '/api/compose') return await handleCompose(req, res);
    if (req.method === 'GET' && url.pathname === '/api/history') {
      const sid = url.searchParams.get('sessionId');
      const list = [...pieces.values()].filter((p) => !sid || p.sessionId === sid).map(summary).reverse();
      return send(res, 200, list);
    }
    const m = /^\/api\/pieces\/([\w-]+)(\/midi)?$/.exec(url.pathname);
    if (req.method === 'GET' && m) {
      const p = pieces.get(m[1]);
      if (!p) return send(res, 404, { error: 'unknown piece' });
      if (!m[2]) return send(res, 200, { ...summary(p), composition: p.composition });
      const midi = compositionToMidi(p.composition, {
        transpose: Math.max(-24, Math.min(24, Number(url.searchParams.get('transpose')) || 0)),
        tempoScale: Math.max(0.25, Math.min(4, Number(url.searchParams.get('tempo')) || 1)),
      });
      const name = p.composition.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'piece';
      return send(res, 200, Buffer.from(midi), { 'Content-Type': 'audio/midi', 'Content-Disposition': `attachment; filename="${name}.mid"` });
    }
    if (req.method === 'GET' && url.pathname === '/healthz') return send(res, 200, { ok: true, pieces: pieces.size });
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, url.pathname);
    send(res, 405, { error: 'method not allowed' });
  } catch (err) {
    console.error(err);
    send(res, err.status || 500, { error: err.status ? err.message : 'internal error' });
  }
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(PORT, HOST, () => console.log(`Piano composer listening on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`));
}

export { server };
