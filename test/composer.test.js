import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveParams, compose, composeWithFallback } from '../src/engine/composer.js';
import { parseRequest } from '../src/engine/parser.js';
import { STYLE_IDS } from '../src/engine/styles.js';
import { compositionToMidi } from '../src/shared/midi.js';

const make = (prompt, seed = 7) => compose(resolveParams(parseRequest(prompt), { seed, melodySeed: seed + 1 }));

for (const style of STYLE_IDS) {
  test(`${style}: complete, playable, well-formed composition`, () => {
    for (const seed of [1, 2, 3]) {
      const c = make(`${style} piece, 90 seconds`, seed);
      assert.equal(c.meta.style, style);
      for (const layer of ['melody', 'harmony', 'bass']) {
        assert.ok(c.layers[layer].length > 0, `${layer} empty`);
        for (const n of c.layers[layer]) {
          assert.ok(n.pitch >= 21 && n.pitch <= 108);
          assert.ok(n.velocity >= 1 && n.velocity <= 127);
          assert.ok(Number.isFinite(n.time) && n.dur > 0);
        }
      }
      // Duration lands near the request (final ritardando/fermata allowed).
      assert.ok(c.meta.duration > 90 * 0.8 && c.meta.duration < 90 * 1.3, `duration ${c.meta.duration}`);
      // Structure: sections in order with intro-like opening and a closing section.
      const types = c.sections.map((s) => s.type);
      assert.equal(types[types.length - 1], 'outro');
      assert.ok(types.includes('theme'));
      for (let i = 1; i < c.sections.length; i++) assert.ok(c.sections[i].startTime >= c.sections[i - 1].startTime);
      // Melody sits above the bass on average.
      const avg = (a) => a.reduce((s, n) => s + n.pitch, 0) / a.length;
      assert.ok(avg(c.layers.melody) > avg(c.layers.bass) + 12);
      // Outer voices mostly free of parallel fifths/octaves.
      const onsets = new Set(c.layers.bass.map((n) => n.start)).size;
      assert.ok(c.analysis.outerVoiceParallels <= Math.max(3, onsets * 0.05), `parallels ${c.analysis.outerVoiceParallels}/${onsets}`);
      // Generation is fast.
      assert.ok(c.analysis.generationMs < 1500);
    }
  });
}

test('same seeds reproduce; new seeds give new music', () => {
  const a = make('romantic nocturne in E minor', 11);
  const b = make('romantic nocturne in E minor', 11);
  const c = make('romantic nocturne in E minor', 12);
  assert.deepEqual(a.layers.melody.map((n) => n.pitch), b.layers.melody.map((n) => n.pitch));
  assert.notDeepEqual(a.layers.melody.map((n) => n.pitch), c.layers.melody.map((n) => n.pitch));
});

test('style changes the compositional logic, not just the tone', () => {
  const jazz = make('jazz piece in C major', 5);
  const classical = make('classical piece in C major', 5);
  const minimal = make('minimalist piece in C major', 5);
  assert.ok(jazz.chords.every((c) => /7|9|13|6/.test(c.symbol)), 'jazz uses extended chords');
  assert.ok(jazz.layers.melody.some((n) => Math.abs(n.perfStart - n.start) > 0.05), 'jazz swings');
  assert.ok(classical.chords.some((c) => /^V/.test(c.roman)), 'classical has dominant function');
  assert.ok(minimal.analysis.techniques.some((t) => /cell/.test(t)));
  assert.ok(make('baroque invention', 5).analysis.techniques.includes('imitative counter-voice'));
  assert.ok(make('contemporary piece', 5).chords.some((c) => /\((P|L|R|N|S|H|T[+-]2)\)/.test(c.roman)));
});

test('melody ends on the tonic at the final cadence', () => {
  for (const style of ['classical', 'romantic', 'virtuoso', 'baroque', 'jazz']) {
    const c = make(`${style} piece in D major`, 21);
    const last = c.layers.melody.filter((n) => !n.doubling).sort((x, y) => x.start - y.start).pop();
    assert.equal(last.pitch % 12, 2, style);
  }
});

test('requested key, tempo and meter are honoured', () => {
  const c = make('baroque piece in B flat major, 100 bpm, 3/4');
  assert.equal(c.meta.key, 'B♭ major');
  assert.equal(c.meta.tempo, 100);
  assert.deepEqual(c.meta.timeSignature, [3, 4]);
});

test('fallback never returns silence', () => {
  const c = composeWithFallback({ style: 'nonsense', key: { tonic: 99, mode: 'bogus' }, duration: 30 });
  assert.ok(c.layers.melody.length > 4);
});

test('MIDI export writes a valid multi-track file', () => {
  const bytes = compositionToMidi(make('classical piece, 30 seconds'), { transpose: 2 });
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'MThd');
  assert.equal(bytes[9], 1); // format 1
  assert.equal(bytes[11], 4); // tempo + 3 layers
});

test('virtuoso: cadenza, grandioso climax and a continuous emotional arc', async () => {
  const { makeEnergyCurve } = await import('../src/engine/performance.js');
  const { planStructure } = await import('../src/engine/structure.js');
  const { getStyle } = await import('../src/engine/styles.js');
  const { createRng } = await import('../src/engine/rng.js');
  let cadenzas = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const c = make('emotional Liszt-style piece, 2 minutes', seed);
    assert.equal(c.meta.style, 'virtuoso');
    assert.equal(c.meta.flow, true);
    const run = c.layers.melody.filter((n) => n.cadenza);
    if (run.length) {
      cadenzas++;
      assert.ok(run.length >= 10, `cadenza has ${run.length} notes`);
      const span = Math.max(...run.map((n) => n.pitch)) - Math.min(...run.map((n) => n.pitch));
      assert.ok(span >= 24, 'cadenza sweeps at least two octaves');
      assert.ok(c.chords.some((ch) => ch.symbol.includes('♭9')), 'cadenza chord shows its ♭9');
    }
    assert.ok(c.analysis.techniques.some((t) => /grandioso/.test(t)));
    // Loudest stretch sits in the climax, quietest at the ends.
    const climax = c.sections.find((s) => s.type === 'climax');
    const avg = (from, to) => { const v = Object.values(c.layers).flat().filter((n) => n.time >= from && n.time < to).map((n) => n.velocity); return v.reduce((a, b) => a + b, 0) / v.length; };
    const first = c.sections[0];
    const last = c.sections[c.sections.length - 1];
    assert.ok(avg(climax.startTime, climax.endTime) > avg(first.startTime, first.endTime) + 12);
    assert.ok(avg(climax.startTime, climax.endTime) > avg(last.startTime, last.endTime) + 12);
  }
  assert.ok(cadenzas >= 5, `development cadenza present in ${cadenzas}/6 pieces`);

  // The flow curve rises continuously from the theme into the climax (no plateaus).
  const params = resolveParams(parseRequest('emotional Liszt-style piece'), { seed: 3, melodySeed: 4 });
  const style = getStyle('virtuoso');
  const plan = planStructure(params, style, createRng(3));
  const curve = makeEnergyCurve(plan, style, params);
  const bq = plan.meter.barQ;
  const theme = plan.sections.find((s) => s.type === 'theme');
  const climax = plan.sections.find((s) => s.type === 'climax');
  const a = (theme.startBar + theme.bars / 2) * bq;
  const b = (climax.startBar + climax.bars * 0.4) * bq;
  let prev = -1;
  for (let i = 0; i <= 20; i++) {
    const e = curve(a + ((b - a) * i) / 20);
    assert.ok(e >= prev - 1e-9, 'energy never dips on the way to the climax');
    prev = e;
  }
  assert.ok(curve(b) > curve(a) + 0.3);
});
