// Virtuoso devices applied after the main layers exist:
//  - cadenza: a free, pedalled arpeggio flourish over the section's closing dominant
//    (with the ♭9 that turns V7 into a diminished-seventh colour), paced fast-in-the-middle,
//    that lands a step below the next section's first melody note;
//  - grandioso: thematic transformation at the climax — the octave-doubled melody is filled
//    out with inner chord tones into full chords;
//  - final flourish: a soft rising tonic arpeggio into the treble under the last chord.

import { makeChord, mod12, pitchesInRange, usesFlats } from './theory.js';

function clearSpan(notes, from, to) {
  const kept = [];
  for (const n of notes) {
    if (n.startQ >= from - 1e-6 && n.startQ < to - 1e-6) continue;
    if (n.startQ < from && n.startQ + n.durQ > from) kept.push({ ...n, durQ: Math.max(0.25, from - n.startQ) });
    else kept.push(n);
  }
  return kept;
}

function addCadenza({ plan, timeline, voicings, layers, section, rng }) {
  const barQ = plan.meter.barQ;
  const endQ = (section.startBar + section.bars) * barQ;
  let idx = timeline.map((e, i) => i).filter((i) => timeline[i].section === section.index).pop();
  if (idx === undefined) return false;
  const entry = timeline[idx];
  const c = entry.chord;
  if (c.quality !== 'maj' || !(c.func === 'D' || /^V/.test(c.roman || ''))) return false;
  const next = layers.melody.filter((n) => !n.octave && n.startQ >= endQ - 1e-6).sort((a, b) => a.startQ - b.startQ)[0];
  if (!next) return false;

  // The cadenza prolongs the closing dominant over the whole final bar: earlier chords
  // in that bar are absorbed into it.
  const startQ = Math.max(section.startBar * barQ, endQ - barQ);
  for (let i = idx - 1; i >= 0 && timeline[i].startQ + timeline[i].durQ > startQ + 1e-6; i--) {
    const e = timeline[i];
    if (e.startQ >= startQ - 1e-6) { timeline.splice(i, 1); voicings.splice(i, 1); idx--; }
    else e.durQ = startQ - e.startQ;
  }
  if (entry.startQ > startQ) { entry.durQ += entry.startQ - startQ; entry.startQ = startQ; }
  const span = endQ - startQ;
  if (span < 1.5) return false;

  // Add the ♭9 (diminished-seventh colour over the dominant root); show it on the chord too.
  const runChord = makeChord({ root: c.root, quality: 'maj', seventh: 'm7', ext: ['b9'], roman: c.roman, func: 'D', flats: usesFlats(entry.key.tonic, entry.key.mode) });
  entry.chord = runChord;

  layers.melody = clearSpan(layers.melody, startQ, endQ);
  layers.harmony = clearSpan(layers.harmony, startQ, endQ);
  layers.bass = clearSpan(layers.bass, startQ, endQ);

  // Fermata sonority: deep bass octave + the chord, struck once and held in the pedal.
  const v = voicings[idx];
  layers.bass.push({ layer: 'bass', startQ, durQ: span, pitch: v.bass, acc: 1.05 });
  if (v.bass - 12 >= 21) layers.bass.push({ layer: 'bass', startQ, durQ: span, pitch: v.bass - 12, acc: 0.9 });
  for (const p of v.upper) layers.harmony.push({ layer: 'harmony', startQ, durQ: span, pitch: p, acc: 0.85 });

  // The run: fall from the treble, rise back to just under the next phrase's first note.
  const top = Math.min(100, Math.max(next.pitch + 9, 88));
  const bottom = 55;
  const ladder = pitchesInRange(runChord.pcs, bottom, top);
  const target = next.pitch;
  const rise = ladder.filter((p) => p < target - 1 && p >= bottom + 5);
  const fall = ladder.slice().reverse();
  const shape = rng.chance(0.5) ? 'fall-rise' : 'rise-fall-rise';
  let run;
  if (shape === 'fall-rise') run = fall.concat(rise.slice(1));
  else {
    const mid = ladder.filter((p) => p >= target - 7);
    run = mid.concat(fall.slice(1)).concat(rise.slice(1));
  }
  const secs = (span * 60) / plan.qTempo;
  const maxNotes = Math.max(12, Math.min(44, Math.round(secs * 11)));
  if (run.length > maxNotes) run = run.slice(run.length - maxNotes);
  if (run.length < 6) return false;

  const runStart = startQ + Math.min(0.5, span * 0.12);
  const runEnd = endQ - Math.min(0.25, span * 0.06);
  const len = runEnd - runStart;
  const a = 0.55; // pacing: slow start, fast middle, easing into the landing
  const pos = (x) => x - (a * Math.sin(2 * Math.PI * x)) / (2 * Math.PI);
  const lowest = Math.min(...run);
  run.forEach((p, i) => {
    const t0 = runStart + len * pos(i / run.length);
    const t1 = runStart + len * pos((i + 1) / run.length);
    const descentShade = p === lowest ? 0.72 : 0.72 + 0.3 * ((p - bottom) / (top - bottom));
    layers.melody.push({ startQ: t0, durQ: Math.max(0.1, t1 - t0), pitch: p, acc: descentShade, phrase: next.phrase, cadenza: true });
  });
  return true;
}

function grandioso({ plan, timeline, layers }) {
  const barQ = plan.meter.barQ;
  const climax = plan.sections.find((s) => s.type === 'climax');
  if (!climax) return 0;
  const s = climax.startBar * barQ;
  const e = s + climax.bars * barQ;
  const entryAt = (q) => { let r = timeline[0]; for (const t of timeline) { if (t.startQ <= q + 1e-6) r = t; else break; } return r; };
  let added = 0;
  for (const n of layers.melody) {
    if (n.octave || n.cadenza || n.startQ < s || n.startQ >= e || n.durQ < 0.5) continue;
    const pos = ((n.startQ % barQ) + barQ) % barQ;
    if (pos % 1 > 1e-6 && n.durQ < 1) continue;
    const chord = entryAt(n.startQ).chord;
    const inner = pitchesInRange(chord.pcs, n.pitch - 11, n.pitch - 2).filter((p) => mod12(p) !== mod12(n.pitch));
    for (const p of inner.slice(-2)) {
      layers.harmony.push({ layer: 'harmony', startQ: n.startQ, durQ: n.durQ, pitch: p, acc: 0.78 });
      added++;
    }
  }
  return added;
}

function finalFlourish({ timeline, layers, rng }) {
  const last = timeline[timeline.length - 1];
  if (!last?.final || last.durQ < 2) return false;
  const pcs = last.chord.pcs.slice(0, 3).concat(last.key.tonic);
  const ladder = pitchesInRange(pcs, 62, 98);
  const tonicTop = ladder.filter((p) => mod12(p) === last.key.tonic).pop();
  const run = ladder.filter((p) => p <= tonicTop);
  const startQ = last.startQ + Math.min(1, last.durQ * 0.25);
  const len = Math.min(2.5, last.durQ * 0.55);
  run.forEach((p, i) => {
    const t = startQ + (len * i) / run.length;
    layers.harmony.push({ layer: 'harmony', startQ: t, durQ: last.startQ + last.durQ - t, pitch: p, acc: 0.5 - 0.15 * (i / run.length) + rng.float(-0.03, 0.03) });
  });
  return true;
}

export function applyVirtuosity({ plan, timeline, voicings, layers, style, rng }) {
  const techniques = [];
  const out = { melody: layers.melody.slice(), harmony: layers.harmony.slice(), bass: layers.bass.slice() };
  let cadenzas = 0;
  for (const section of plan.sections) {
    const p = style.cadenza?.[section.type];
    if (p && rng.chance(p) && addCadenza({ plan, timeline, voicings, layers: out, section, rng })) cadenzas++;
  }
  if (cadenzas) techniques.push(cadenzas > 1 ? `${cadenzas} cadenzas over the dominant` : 'cadenza over the dominant');
  if (style.grandioso && grandioso({ plan, timeline, layers: out })) techniques.push('grandioso chords under the octave melody');
  if (style.finalFlourish && finalFlourish({ timeline, layers: out, rng })) techniques.push('closing arpeggio into the treble');
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.startQ - b.startQ || b.pitch - a.pitch);
  return { layers: out, techniques };
}

