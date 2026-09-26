import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRequest } from '../src/engine/parser.js';

test('extracts style, mood, key, duration, tempo, meter, complexity', () => {
  const p = parseRequest('A melancholic ambient piece in A minor, 3 minutes, 60 bpm, simple');
  assert.equal(p.style, 'ambient');
  assert.equal(p.mood, 'melancholic');
  assert.deepEqual(p.key, { tonic: 9, mode: 'minor' });
  assert.equal(p.duration, 180);
  assert.equal(p.tempo.bpm, 60);
  assert.equal(p.complexity, 0.28);
});

test('handles accidentals, bare tonics, meters and durations', () => {
  assert.deepEqual(parseRequest('nocturne in Db major').key, { tonic: 1, mode: 'major' });
  assert.deepEqual(parseRequest('something in f# minor').key, { tonic: 6, mode: 'minor' });
  assert.deepEqual(parseRequest('b flat dorian groove').key, { tonic: 10, mode: 'dorian' });
  assert.deepEqual(parseRequest('jazz ballad in F').key, { tonic: 5, mode: null });
  assert.deepEqual(parseRequest('a waltz').meter, [3, 4]);
  assert.deepEqual(parseRequest('odd piece in 7/8').meter, [7, 8]);
  assert.equal(parseRequest('90s of calm').duration, 90);
  assert.equal(parseRequest('1:30 long').duration, 90);
  assert.equal(parseRequest('two minutes of rain').duration, 120);
  assert.equal(parseRequest('an allegro').tempo.bpm, 132);
});

test('does not mistake articles or "minute" for keys', () => {
  assert.equal(parseRequest('a dramatic piece').key, null);
  assert.equal(parseRequest('a minute of calm').key, null);
});

test('remix requests modify the previous piece', () => {
  const prev = { style: 'ambient', mood: 'melancholic', key: { tonic: 9, mode: 'minor' }, duration: 120, tempo: 60, meter: [4, 4], complexity: 0.4, seed: 1, melodySeed: 2 };
  const j = parseRequest('make that jazzier', prev);
  assert.equal(j.remix, true);
  assert.equal(j.style, 'jazz');
  assert.equal(j.tempo, null); // re-inferred for the new style
  assert.deepEqual(j.key, { tonic: 9, mode: 'minor' });
  const s = parseRequest('simplify it', prev);
  assert.ok(s.complexity < 0.4);
  const f = parseRequest('faster', prev);
  assert.equal(f.tempo.bpm, 72);
  const b = parseRequest('make it brighter', prev);
  assert.equal(b.key.mode, 'major');
  const v = parseRequest('another variation', prev);
  assert.equal(v.seed, 1);
  assert.equal(v.melodySeed, null);
  const t = parseRequest('transpose up 2 semitones', prev);
  assert.equal(t.key.tonic, 11);
  assert.equal(parseRequest('jazz piece in C', null).remix, false);
});
