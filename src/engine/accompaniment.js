// Accompaniment textures. Each pattern turns a voiced chord into timed notes on the
// harmony and bass layers in a register-appropriate way (Alberti bass, wide Romantic
// arpeggios, waltz, walking bass + rootless comping, continuo, pads, pulses...).

import { mod12, nearestPitchWithPc, chordScale, stepAlong } from './theory.js';

const note = (layer, startQ, durQ, pitch, acc = 1) => ({ layer, startQ, durQ, pitch, acc });

function strongPulsesIn(entry, meter) {
  const out = [];
  const barQ = meter.barQ;
  const end = entry.startQ + entry.durQ;
  const firstBar = Math.floor(entry.startQ / barQ + 1e-9);
  for (let b = firstBar; b * barQ < end; b++) {
    meter.pulseStarts.forEach((ps, i) => {
      const t = b * barQ + ps;
      if (t >= entry.startQ - 1e-9 && t < end - 1e-9 && meter.accents[i] >= 0.7) out.push(t);
    });
  }
  if (!out.length || out[0] > entry.startQ + 1e-9) out.unshift(entry.startQ);
  return out;
}

function pulsesIn(entry, meter) {
  const out = [];
  const barQ = meter.barQ;
  const end = entry.startQ + entry.durQ;
  const firstBar = Math.floor(entry.startQ / barQ + 1e-9);
  for (let b = firstBar; b * barQ < end; b++) {
    meter.pulseStarts.forEach((ps, i) => {
      const t = b * barQ + ps;
      if (t >= entry.startQ - 1e-9 && t < end - 1e-9) out.push({ t, len: meter.pulses[i], accent: meter.accents[i], barStart: ps === 0 });
    });
  }
  return out;
}

function gridIn(entry, step) {
  const out = [];
  for (let t = entry.startQ; t < entry.startQ + entry.durQ - 1e-6; t += step) out.push(t);
  return out;
}

const PATTERNS = {
  block(ctx) {
    const { entry, v, meter, energy } = ctx;
    const notes = [];
    const hits = energy < 0.35 ? [entry.startQ] : strongPulsesIn(entry, meter);
    const end = entry.startQ + entry.durQ;
    hits.forEach((t, i) => {
      const d = (hits[i + 1] ?? end) - t;
      v.upper.forEach((p) => notes.push(note('harmony', t, d * 0.95, p, i === 0 ? 1 : 0.85)));
    });
    notes.push(note('bass', entry.startQ, entry.durQ, v.bass, 1.05));
    if (energy > 0.8 && v.bass - 12 >= 24) notes.push(note('bass', entry.startQ, entry.durQ, v.bass - 12, 0.9));
    return notes;
  },

  alberti(ctx) {
    const { entry, v, meter, params, qTempo } = ctx;
    const notes = [];
    let b = v.bass;
    while (b < 43) b += 12;
    while (b > 55) b -= 12;
    const pcs = entry.chord.pcs.filter((pc) => pc !== mod12(b));
    const above = pcs.map((pc) => { let p = nearestPitchWithPc(pc, b + 6); while (p <= b) p += 12; while (p > b + 12) p -= 12; return p; })
      .sort((x, y) => x - y);
    const mid = above[0] ?? b + 4;
    const high = above[above.length - 1] ?? b + 7;
    const step = params.complexity > 0.75 && qTempo < 100 ? 0.25 : 0.5;
    const shape = meter.compound ? ['b', 'm', 'h', 'm', 'h', 'm'] : ['b', 'h', 'm', 'h'];
    gridIn(entry, step).forEach((t, i) => {
      const k = shape[i % shape.length];
      if (k === 'b') notes.push(note('bass', t, step * 1.6, b, 1));
      else notes.push(note('harmony', t, step * 1.1, k === 'h' ? high : mid, k === 'h' ? 0.8 : 0.75));
    });
    return notes;
  },

  broken(ctx) {
    const { entry, v, meter } = ctx;
    const notes = [];
    const seq = [v.bass, ...v.upper];
    const cyc = seq.concat(seq.slice(1, -1).reverse());
    const step = meter.compound ? 0.5 : 0.5;
    gridIn(entry, step).forEach((t, i) => {
      const k = i % cyc.length;
      const layer = k === 0 ? 'bass' : 'harmony';
      notes.push(note(layer, t, step * 1.5, cyc[k], k === 0 ? 1 : 0.78));
    });
    return notes;
  },

  arpeggio(ctx) {
    const { entry, v, meter, params, rng } = ctx;
    const notes = [];
    const b = v.bass;
    const fifthPc = mod12(entry.chord.root + (entry.chord.quality === 'dim' ? 6 : entry.chord.quality === 'aug' ? 8 : 7));
    let fifth = nearestPitchWithPc(fifthPc, b + 7);
    if (fifth <= b) fifth += 12;
    const third = entry.chord.tones.find((t) => t.role === 'third' || t.role === 'sus');
    let tenth = third ? nearestPitchWithPc(third.pc, b + 15) : b + 12;
    if (tenth <= fifth) tenth += 12;
    const pool = [b, fifth, b + 12, tenth, ...v.upper.filter((p) => p > tenth && p - b <= 26)];
    const set = [...new Set(pool)].sort((x, y) => x - y).slice(0, params.complexity > 0.55 ? 6 : 4);
    const cyc = set.concat(set.slice(1, -1).reverse());
    let step = meter.compound ? 0.5 : 0.5;
    if (!meter.compound && params.complexity > 0.6 && rng.chance(0.5)) step = 1 / 3;
    const end = entry.startQ + entry.durQ;
    gridIn(entry, step).forEach((t, i) => {
      const k = i % cyc.length;
      const layer = k === 0 && i % (cyc.length) === 0 ? 'bass' : 'harmony';
      const dur = Math.min(end - t, step * (layer === 'bass' ? 6 : 3));
      notes.push(note(layer, t, dur, cyc[k], layer === 'bass' ? 1 : 0.62 + 0.1 * Math.sin(i)));
    });
    return notes;
  },

  waltz(ctx) {
    const { entry, v, meter } = ctx;
    const notes = [];
    const barQ = meter.barQ;
    pulsesIn(entry, meter).forEach((p) => {
      if (p.barStart) {
        const alt = Math.floor(p.t / barQ) % 2 === 1 && entry.durQ > barQ;
        const fifth = entry.chord.tones.find((t) => t.role === 'fifth');
        const bp = alt && fifth ? nearestPitchWithPc(fifth.pc, v.bass) : v.bass;
        notes.push(note('bass', p.t, p.len * 0.95, bp, 1.05));
      } else {
        v.upper.forEach((u) => notes.push(note('harmony', p.t, p.len * 0.7, u, 0.72)));
      }
    });
    if (!notes.some((n) => n.layer === 'bass')) notes.push(note('bass', entry.startQ, entry.durQ, v.bass, 1));
    return notes;
  },

  octaves(ctx) {
    const { entry, v, meter } = ctx;
    const notes = [];
    let lo = v.bass;
    if (lo - 12 >= 24) lo -= 12;
    gridIn(entry, 0.5).forEach((t, i) => notes.push(note('bass', t, 0.5, i % 2 ? lo + 12 : lo, i % 2 ? 0.8 : 1.05)));
    strongPulsesIn(entry, meter).forEach((t, i, arr) => {
      const d = (arr[i + 1] ?? entry.startQ + entry.durQ) - t;
      v.upper.forEach((u) => notes.push(note('harmony', t, d * 0.9, u, 0.95)));
    });
    return notes;
  },

  pad(ctx) {
    const { entry, v, rng, meter } = ctx;
    const notes = [];
    const roll = 0.07;
    v.upper.forEach((u, i) => notes.push(note('harmony', entry.startQ + i * roll + rng.float(0, 0.03), entry.durQ - i * roll, u, 0.55 + rng.float(0, 0.1))));
    notes.push(note('bass', entry.startQ, entry.durQ, v.bass, 0.95));
    if (v.bass - 12 >= 24 && rng.chance(0.5)) notes.push(note('bass', entry.startQ, entry.durQ, v.bass - 12, 0.7));
    // Long chords breathe: soft re-voicing of the top at mid-point.
    if (entry.durQ >= meter.barQ * 2 && v.upper.length) {
      const mid = entry.startQ + entry.durQ / 2;
      const top = v.upper[v.upper.length - 1];
      notes.push(note('harmony', mid, entry.durQ / 2, top + (rng.chance(0.5) ? 12 : 0), 0.45));
    }
    return notes;
  },

  shimmer(ctx) {
    const { entry, v, rng, params } = ctx;
    const notes = [];
    const tones = [...v.upper, ...v.upper.map((p) => p + 12).filter((p) => p <= 88)];
    const step = params.complexity > 0.5 ? 0.5 : 1;
    const end = entry.startQ + entry.durQ;
    gridIn(entry, step).forEach((t, i) => {
      if (i > 0 && rng.chance(0.25)) return;
      const k = (i * 2 + (i > tones.length ? 1 : 0)) % tones.length;
      notes.push(note('harmony', t, Math.min(end - t, step * 4), tones[k], 0.45 + rng.float(0, 0.15)));
    });
    notes.push(note('bass', entry.startQ, entry.durQ, v.bass, 0.9));
    return notes;
  },

  comp(ctx) {
    const { entry, v, next, meter, rng, qTempo, state, energy } = ctx;
    const notes = [];
    const ballad = qTempo < 88 || energy < 0.35;
    // Walking (or two-feel) bass.
    const scale = chordScale(entry.key, entry.chord);
    const beats = gridIn(entry, ballad ? Math.min(2, entry.durQ) : 1);
    let prev = state.lastBass ?? v.bass;
    const nextRoot = next ? next.entry.chord.root : entry.chord.root;
    const lo = 36; const hi = 55;
    beats.forEach((t, i) => {
      let p;
      if (i === 0) {
        p = nearestPitchWithPc(entry.chord.root, prev);
      } else if (i === beats.length - 1 && next) {
        const target = nearestPitchWithPc(nextRoot, prev);
        const r = rng.next();
        if (r < 0.55) p = target + (prev < target ? -1 : 1);
        else if (r < 0.8) p = nearestPitchWithPc(mod12(nextRoot + 7), prev);
        else p = stepAlong(prev, target > prev ? 1 : -1, scale);
      } else {
        const tones = entry.chord.pcs.slice(0, 4);
        const target = nearestPitchWithPc(nextRoot, prev);
        const dir = target === prev ? (rng.chance(0.5) ? 1 : -1) : Math.sign(target - prev);
        p = rng.chance(0.5) ? stepAlong(prev, dir, scale) : nearestPitchWithPc(rng.pick(tones), prev + dir * 3);
      }
      while (p < lo) p += 12;
      while (p > hi) p -= 12;
      notes.push(note('bass', t, (ballad ? Math.min(2, entry.durQ) : 1) * 0.92, p, i === 0 ? 1 : 0.9));
      prev = p;
    });
    state.lastBass = prev;

    // Rootless comping rhythms (relative to chord start).
    const long = entry.durQ >= 3;
    const patterns = long
      ? [[[0, 1.5]], [[0, 1], [1.5, 1]], [[1.5, 1.5]], [[0.5, 1], [2.5, 1]], [[1, 0.5], [3, 1]], [[0, 2]]]
      : [[[0, 1]], [[0.5, 1]], [[1, 1]], [[0, 0.5], [1.5, 0.5]]];
    const pat = ballad ? [[0, entry.durQ * 0.95]] : rng.pick(patterns);
    for (const [off, dur] of pat) {
      if (off >= entry.durQ) continue;
      const d = Math.min(dur, entry.durQ - off);
      v.upper.forEach((u) => notes.push(note('harmony', entry.startQ + off, d, u, off % 1 ? 0.85 : 0.75)));
    }
    if (entry.final) notes.push(note('bass', entry.startQ, entry.durQ, nearestPitchWithPc(entry.chord.root, 40), 1));
    return notes;
  },

  continuo(ctx) {
    const { entry, v, next, rng, params, state } = ctx;
    const notes = [];
    const step = params.complexity > 0.45 ? 0.5 : 1;
    const scale = chordScale(entry.key, entry.chord);
    const beats = gridIn(entry, step);
    let prev = state.lastBass ?? v.bass;
    const target = next ? next.v.bass : v.bass;
    beats.forEach((t, i) => {
      let p;
      if (i === 0) p = Math.abs(v.bass - prev) <= 9 ? v.bass : nearestPitchWithPc(mod12(v.bass), prev);
      else {
        const remaining = beats.length - i;
        const dist = target - prev;
        if (Math.abs(dist) <= remaining * 2 && dist !== 0) p = stepAlong(prev, Math.sign(dist), scale);
        else if (rng.chance(0.4)) p = prev + (rng.chance(0.5) ? 12 : -12);
        else p = stepAlong(prev, rng.chance(0.5) ? 1 : -1, scale);
      }
      while (p < 36) p += 12;
      while (p > 57) p -= 12;
      notes.push(note('bass', t, step * 0.9, p, i === 0 ? 1 : 0.85));
      prev = p;
    });
    state.lastBass = prev;
    if (entry.final) {
      notes.length = 0;
      notes.push(note('bass', entry.startQ, entry.durQ, v.bass, 1));
      v.upper.forEach((u) => notes.push(note('harmony', entry.startQ, entry.durQ, u, 0.8)));
    }
    return notes;
  },

  pulse(ctx) {
    const { entry, v, meter, rng, params } = ctx;
    const notes = [];
    const groups = meter.num === 4 && meter.den === 4 ? [3, 3, 2] : null;
    const accents = new Set();
    if (groups) { let a = 0; for (const g of groups) { accents.add(a); a += g; } }
    gridIn(entry, 0.5).forEach((t, i) => {
      const posInBar = Math.round(((t % meter.barQ) + meter.barQ) % meter.barQ * 2);
      const acc = groups ? accents.has(posInBar) : Math.abs((t % 1)) < 1e-6;
      if (!acc && rng.chance(0.35 - params.complexity * 0.25)) return;
      v.upper.forEach((u) => notes.push(note('harmony', t, 0.45, u, acc ? 0.95 : 0.62)));
      if (acc) notes.push(note('bass', t, 0.9, v.bass, 0.95));
    });
    notes.push(note('bass', entry.startQ, entry.durQ, v.bass - 12 >= 24 ? v.bass - 12 : v.bass, 0.8));
    return notes;
  },

  wash(ctx) {
    const { entry, v, rng } = ctx;
    const notes = [];
    notes.push(note('bass', entry.startQ, entry.durQ, v.bass, 0.9));
    if (v.bass + 7 < v.upper[0]) notes.push(note('bass', entry.startQ + 0.05, entry.durQ, v.bass + 7, 0.7));
    v.upper.forEach((u, i) => notes.push(note('harmony', entry.startQ + 0.1 * i, entry.durQ - 0.1 * i, u, 0.5 + rng.float(0, 0.1))));
    if (rng.chance(0.4)) {
      const top = v.upper[v.upper.length - 1];
      notes.push(note('harmony', entry.startQ + entry.durQ / 2, entry.durQ / 2, top + 2, 0.4));
    }
    return notes;
  },
};

export const PATTERN_NAMES = Object.keys(PATTERNS);

export const PATTERN_LABELS = {
  block: 'block chords', alberti: 'Alberti bass', broken: 'broken chords', arpeggio: 'wide arpeggios',
  waltz: 'waltz (oom-pah-pah)', octaves: 'driving bass octaves', pad: 'sustained pads', shimmer: 'slow arpeggiated shimmer',
  comp: 'walking bass + rootless comping', continuo: 'walking continuo bass', pulse: 'syncopated 3+3+2 pulses', wash: 'open-fifth washes',
};

export function chooseTexture(style, sectionType, params, meter, rng) {
  let weights = { ...(style.textures[sectionType] || style.textures.theme) };
  const mt = style.meterTextures?.[meter.num];
  if (mt && meter.den === 4) weights = { ...weights, ...mt };
  if (params.complexity < 0.3) {
    for (const k of ['block', 'pad', 'wash', 'waltz']) if (weights[k] !== undefined) weights[k] *= 3;
  } else if (params.complexity > 0.7) {
    for (const k of ['arpeggio', 'alberti', 'broken', 'shimmer', 'pulse', 'octaves']) if (weights[k] !== undefined) weights[k] *= 2;
  }
  return rng.weighted(weights);
}

export function renderAccompaniment(ctx) {
  const fn = PATTERNS[ctx.texture] || PATTERNS.block;
  return fn(ctx);
}
