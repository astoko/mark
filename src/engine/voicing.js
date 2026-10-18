// Voice leading. Picks a bass note (with inversions / pedal points) and an upper-voice
// voicing for every chord by searching candidate voicings and minimising a cost that
// encodes common-practice rules: smooth motion, no parallel 5ths/8ves, no doubled
// leading tone, resolved sevenths, sane spacing, and style-specific shapes
// (close, open, spread, rootless jazz A/B, quartal).

import { mod12, pitchesInRange, nearestPitchWithPc, scalePcs } from './theory.js';

export function parallelPerfect(a1, a2, b1, b2) {
  if (mod12(a1) === mod12(a2) || mod12(b1) === mod12(b2)) return false;
  if (Math.sign(a2 - a1) !== Math.sign(b2 - b1)) return false;
  const i1 = mod12(Math.abs(a1 - b1));
  const i2 = mod12(Math.abs(a2 - b2));
  return (i1 === 0 || i1 === 7) && i1 === i2;
}

function chooseBass(entry, prev, style, rng, bassRange) {
  const { chord, key } = entry;
  let pc = chord.root;
  const third = chord.tones.find((t) => t.role === 'third');
  const romanBase = (chord.roman || '').split('/')[0];
  if (style.id !== 'jazz') {
    if (/^b?II/.test(romanBase) && romanBase.startsWith('bII') && third) pc = third.pc; // Neapolitan sixth
    else if (style.id === 'baroque' && /^iv/.test(romanBase) && entry.cadential && third) pc = third.pc; // Phrygian cadence
    else if (!entry.cadential && !entry.final && third && ['maj', 'min'].includes(chord.quality)
      && rng.chance(style.inversionProb || 0)) pc = third.pc;
    if (prev && style.pedalPoint && !entry.final && rng.chance(style.pedalPoint)) {
      const prevPc = mod12(prev.bass);
      if (prevPc === key.tonic || chord.pcs.includes(prevPc)) pc = prevPc;
    }
  }
  const [lo, hi] = bassRange;
  const target = prev ? prev.bass : Math.round(lo + (hi - lo) * 0.4);
  let p = nearestPitchWithPc(pc, target);
  // Cadential roots like to fall; keep inside range.
  if (entry.final || (entry.cadential && pc === chord.root && prev && p > prev.bass && p - 12 >= lo && rng.chance(0.4))) p -= p - 12 >= lo ? 12 : 0;
  while (p < lo) p += 12;
  while (p > hi) p -= 12;
  return p;
}

function requiredPcs(chord, type) {
  const byRole = (r) => chord.tones.filter((t) => t.role === r).map((t) => t.pc);
  const third = byRole('third').concat(byRole('sus'));
  const seventh = byRole('seventh');
  const ext = byRole('ext');
  const root = byRole('root');
  const fifth = byRole('fifth');
  if (type === 'rootless') {
    return { required: [...third, ...seventh, ...ext.slice(0, 1)], optional: [...fifth, ...ext] };
  }
  const required = [...third, ...seventh, ...ext.slice(0, 1)];
  if (!seventh.length || type !== 'close') required.push(...root);
  return { required: [...new Set(required)], optional: [...new Set([...root, ...fifth, ...ext])] };
}

function* combinations(arr, n, start = 0, acc = []) {
  if (acc.length === n) { yield acc.slice(); return; }
  for (let i = start; i <= arr.length - (n - acc.length); i++) {
    acc.push(arr[i]);
    yield* combinations(arr, n, i + 1, acc);
    acc.pop();
  }
}

function quartalCandidates(chord, key, lo, hi) {
  const allowed = new Set([...chord.pcs, ...scalePcs(key)]);
  const out = [];
  for (let base = lo; base <= hi - 10; base++) {
    if (!chord.pcs.includes(mod12(base))) continue;
    for (const n of [3, 4]) {
      const stack = Array.from({ length: n }, (_, i) => base + i * 5);
      if (stack[n - 1] > hi) continue;
      if (!stack.every((p) => allowed.has(mod12(p)))) continue;
      const chordTones = stack.filter((p) => chord.pcs.includes(mod12(p))).length;
      if (chordTones >= 2) out.push(stack);
    }
  }
  return out;
}

function scoreVoicing(cand, prevUpper, bass, prevBass, entry, prevEntry, cfg) {
  const { chord, key } = entry;
  let cost = 0;
  const center = (cfg.range[0] + cfg.range[1]) / 2;
  const mean = cand.reduce((a, b) => a + b, 0) / cand.length;
  cost += Math.abs(mean - center) * 0.25;

  if (prevUpper && prevUpper.length) {
    // Voice matching by rank (voices keep their order).
    const n = Math.min(cand.length, prevUpper.length);
    for (let i = 0; i < n; i++) {
      const a = prevUpper[prevUpper.length - n + i];
      const b = cand[cand.length - n + i];
      const d = Math.abs(a - b);
      cost += d <= 2 ? d * 0.6 : d * 1.1;
      if (d === 0) cost -= 1.5;
      // Parallel perfect intervals among upper voices and against the bass.
      for (let j = i + 1; j < n; j++) {
        if (parallelPerfect(a, b, prevUpper[prevUpper.length - n + j], cand[cand.length - n + j])) cost += 30;
      }
      if (prevBass !== undefined && parallelPerfect(a, b, prevBass, bass)) cost += 30;
      // Chordal seventh should resolve down by step.
      if (prevEntry?.chord.seventh) {
        const s = prevEntry.chord.tones.find((t) => t.role === 'seventh');
        if (s && mod12(a) === s.pc && !(a - b >= 1 && a - b <= 2) && a !== b) cost += 6;
      }
    }
    // Hidden octaves/fifths between outer voices.
    const topPrev = prevUpper[prevUpper.length - 1];
    const top = cand[cand.length - 1];
    if (prevBass !== undefined && Math.abs(top - topPrev) > 2 && Math.sign(top - topPrev) === Math.sign(bass - prevBass)) {
      const iv = mod12(top - bass);
      if (iv === 0 || iv === 7) cost += 6;
    }
  }

  // Doubling rules.
  const pcs = cand.map(mod12).concat(mod12(bass));
  const leading = mod12(key.tonic - 1);
  if (entry.chord.func === 'D' && pcs.filter((p) => p === leading).length > 1) cost += 15;
  const third = chord.tones.find((t) => t.role === 'third');
  if (third && pcs.filter((p) => p === third.pc).length > 1 && chord.quality === 'maj') cost += 4;

  // Spacing & register.
  for (let i = 1; i < cand.length; i++) {
    const gap = cand[i] - cand[i - 1];
    if (gap > cfg.maxGap) cost += 10 + (gap - cfg.maxGap) * 2;
    if (cand[i - 1] < 52 && gap < 5 && cfg.type !== 'quartal') cost += 5; // low mud
  }
  if (cand[0] - bass < 3) cost += 25;
  if (cand[0] - bass > 24) cost += 6;
  return cost;
}

const TYPE_CFG = {
  close: { maxGap: 7, span: 12 },
  open: { maxGap: 12, span: 22 },
  spread: { maxGap: 12, span: 26 },
  rootless: { maxGap: 7, span: 13 },
  quartal: { maxGap: 12, span: 26 },
};

export function voiceTimeline(timeline, style, params, rng) {
  const vcfg = style.voicing;
  const out = [];
  let prev = null;
  let prevEntry = null;
  const bassRange = style.bassRange;

  for (const entry of timeline) {
    const bass = chooseBass(entry, prev, style, rng, bassRange);
    const type = entry.chord.seventh || entry.chord.ext.length ? vcfg.type : (vcfg.type === 'rootless' ? 'close' : vcfg.type);
    const cfg = { ...TYPE_CFG[type], type, range: vcfg.range };
    let n = vcfg.voices;
    if (type === 'close' && (entry.chord.seventh || entry.chord.ext.length)) n = Math.max(n, 3);
    if ((type === 'open' || type === 'spread') && (entry.chord.seventh || entry.chord.ext.length)) n = Math.max(n, 4);

    let candidates = [];
    if (type === 'quartal') candidates = quartalCandidates(entry.chord, entry.key, vcfg.range[0], vcfg.range[1]);
    const { required, optional } = requiredPcs(entry.chord, type);
    const allowed = [...new Set([...required, ...optional])];
    const pitches = pitchesInRange(allowed, Math.max(vcfg.range[0], bass + 3), vcfg.range[1]);
    const nn = Math.min(n, Math.max(required.length, 3));
    for (const c of combinations(pitches, nn)) {
      if (c[c.length - 1] - c[0] > cfg.span) continue;
      const set = new Set(c.map(mod12));
      if (!required.every((p) => set.has(p))) continue;
      candidates.push(c);
      if (candidates.length > 4000) break;
    }
    if (!candidates.length) {
      // Fallback: stack chord tones upward from above the bass.
      const base = Math.max(vcfg.range[0], bass + 3);
      candidates.push(entry.chord.pcs.slice(0, 4).map((pc) => nearestPitchWithPc(pc, base + 6)).sort((a, b) => a - b));
    }
    let best = null;
    let bestCost = Infinity;
    for (const c of candidates) {
      const cost = scoreVoicing(c, prev?.upper, bass, prev?.bass, entry, prevEntry, cfg) + rng.float(0, 1.2);
      if (cost < bestCost) { bestCost = cost; best = c; }
    }
    const v = { bass, upper: best };
    out.push(v);
    prev = v;
    prevEntry = entry;
  }
  return out;
}
