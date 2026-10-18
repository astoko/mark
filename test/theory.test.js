import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chordFromRoman, makeMeter, metricStrength, NEO_RIEMANN, chordScale, stepAlong } from '../src/engine/theory.js';

const C = { tonic: 0, mode: 'major' };
const Am = { tonic: 9, mode: 'minor' };

test('roman numerals build correct chords', () => {
  assert.deepEqual(chordFromRoman('V7', C).pcs, [7, 11, 2, 5]);
  assert.equal(chordFromRoman('V7', C).symbol, 'G7');
  assert.deepEqual(chordFromRoman('ii', C).pcs, [2, 5, 9]);
  assert.deepEqual(chordFromRoman('V/V', C).pcs, [2, 6, 9]); // D major
  assert.equal(chordFromRoman('bII', Am).root, 10); // Neapolitan of A minor = B♭
  assert.deepEqual(chordFromRoman('V', Am).pcs, [4, 8, 11]); // raised leading tone
  assert.equal(chordFromRoman('iiø7', Am).symbol, 'Bm7♭5');
  assert.equal(chordFromRoman('Imaj7', { tonic: 5, mode: 'major' }).symbol, 'Fmaj7');
  assert.equal(chordFromRoman('vii°7', C).symbol, 'B°7');
});

test('neo-Riemannian transforms are parsimonious', () => {
  const c = { root: 0, quality: 'maj' };
  assert.deepEqual(NEO_RIEMANN.P(c), { root: 0, quality: 'min' });
  assert.deepEqual(NEO_RIEMANN.R(c), { root: 9, quality: 'min' });
  assert.deepEqual(NEO_RIEMANN.L(c), { root: 4, quality: 'min' });
});

test('chord-scale substitutes chromatic chord tones', () => {
  const sc = chordScale(C, chordFromRoman('V/V', C));
  assert.ok(sc.includes(6) && !sc.includes(5));
  assert.equal(stepAlong(60, 2, [0, 2, 4, 5, 7, 9, 11]), 64);
});

test('meters expose pulses and accents', () => {
  const m68 = makeMeter(6, 8);
  assert.deepEqual(m68.pulses, [1.5, 1.5]);
  assert.equal(metricStrength(m68, 0), 1);
  const m78 = makeMeter(7, 8);
  assert.equal(m78.barQ, 3.5);
  assert.deepEqual(m78.pulses, [1, 1, 1.5]);
  assert.equal(metricStrength(makeMeter(4, 4), 2), 0.75);
});
