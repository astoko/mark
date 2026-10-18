import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mark-'));
const { server } = await import('../server.js');
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
after(() => server.close());

const post = (body) => fetch(`${base}/api/compose`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('compose → remix → history → midi', async () => {
  const r1 = await (await post({ prompt: 'melancholic ambient piece in A minor, 40 seconds', sessionId: 's' })).json();
  assert.equal(r1.composition.meta.style, 'ambient');
  assert.match(r1.reply, /A minor/);
  const r2 = await (await post({ prompt: 'make that jazzier', sessionId: 's' })).json();
  assert.equal(r2.composition.meta.style, 'jazz');
  assert.equal(r2.summary.parentId, r1.id);
  const hist = await (await fetch(`${base}/api/history?sessionId=s`)).json();
  assert.equal(hist.length, 2);
  const midi = await fetch(`${base}/api/pieces/${r2.id}/midi`);
  assert.equal(midi.headers.get('content-type'), 'audio/midi');
  assert.equal(Buffer.from(await midi.arrayBuffer()).subarray(0, 4).toString(), 'MThd');
});

test('rejects empty prompts and serves the client', async () => {
  assert.equal((await post({ prompt: '' })).status, 400);
  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /Piano Composer/);
  assert.equal((await fetch(`${base}/shared/midi.js`)).status, 200);
  assert.equal((await fetch(`${base}/../server.js`)).status, 404);
});
