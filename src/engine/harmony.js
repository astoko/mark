// Harmonic planning. Four strategies, chosen by style:
//  functional     – Markov chains over roman numerals with cadence targeting (classical, baroque, romantic, jazz)
//  modal          – non-functional colour progressions with pedal points (ambient)
//  cycle          – short repeating chord cycles altered by process (minimalist)
//  neoRiemannian  – parsimonious P/L/R transformations with gravitational pull home (contemporary)

import {
  chordFromRoman, makeChord, withExtensions, usesFlats, MODE_FAMILY, NEO_RIEMANN,
  fifthsDistance, mod12,
} from './theory.js';

const familyOf = (key) => MODE_FAMILY[key.mode] || 'major';

function tonicToken(style, family) {
  const table = style.progression?.[family];
  if (!table) return family === 'major' ? 'I' : 'i';
  return Object.keys(table)[0];
}

function pickCadence(style, family, type, rng) {
  const c = style.cadences?.[family];
  if (!c) return null;
  const t = type === 'FINAL' ? 'PAC' : type;
  const opts = c[t] || c.PAC;
  return rng.pick(opts);
}

// Forward Markov generation with look-ahead so the free chords connect to the fixed cadence.
function markovFill(table, start, length, target, rng) {
  const seq = [start];
  while (seq.length < length) {
    const prev = seq[seq.length - 1];
    const options = table[prev] || table[Object.keys(table)[0]];
    const keys = Object.keys(options);
    const remaining = length - seq.length;
    const weights = keys.map((k) => {
      let w = options[k];
      if (k === prev) w *= 0.1;
      if (remaining === 1 && target) {
        const t = table[k] || {};
        w *= t[target] ? 1 + t[target] * 2 : 0.15;
      }
      return w;
    });
    seq.push(rng.weighted(keys, weights));
  }
  return seq;
}

function enrich(chord, style, rng, flats, ctx = {}) {
  const e = style.extensions || {};
  const isDom = chord.quality === 'maj' && (chord.func === 'D' || /^V/.test(chord.roman || '') || /V.*\//.test(chord.roman || ''));
  const add = { ext: [] };
  let changed = false;
  if (!chord.seventh) {
    if (isDom && rng.chance(e.dominant7 || 0)) { add.seventh = 'm7'; changed = true; }
    else if (chord.quality === 'dim' && rng.chance(e.dim7 || 0)) { add.seventh = 'd7'; changed = true; }
    else if (chord.quality === 'min' && rng.chance(e.seventh || 0)) { add.seventh = 'm7'; changed = true; }
    else if (chord.quality === 'maj' && !isDom && rng.chance((e.seventh || 0) * 0.6)) { add.seventh = 'M7'; changed = true; }
  }
  const hasSeventh = chord.seventh || add.seventh;
  if (hasSeventh && chord.quality !== 'dim') {
    if (isDom && rng.chance(e.thirteenth || 0)) { add.ext.push('13'); changed = true; }
    else if (rng.chance(e.ninth || 0)) { add.ext.push('9'); changed = true; }
  } else if (!hasSeventh && (chord.quality === 'maj' || chord.quality === 'min') && rng.chance(e.add9 || 0)) {
    add.ext.push('add9'); changed = true;
  }
  if (chord.quality === 'maj' && e.sharp11 && rng.chance(e.sharp11)) { add.ext.push('#11'); changed = true; }
  let out = changed ? withExtensions(chord, add, flats) : chord;
  if (!ctx.cadential && out.quality === 'maj' && !out.seventh && e.sus && rng.chance(e.sus)) {
    out = makeChord({ root: out.root, quality: 'sus4', ext: out.ext, roman: out.roman, func: out.func, flats });
  }
  return out;
}

function realize(tokens, key, style, rng, opts = {}) {
  const flats = usesFlats(key.tonic, key.mode);
  return tokens.map((t, i) => {
    let c;
    try { c = chordFromRoman(t, key, flats); } catch { c = chordFromRoman(familyOf(key) === 'major' ? 'I' : 'i', key, flats); }
    const cadential = opts.cadenceFrom !== undefined && i >= opts.cadenceFrom;
    if (style.id === 'jazz') return enrich(c, { extensions: { ...style.extensions, dominant7: 0, seventh: 0, dim7: 0 } }, rng, flats, { cadential });
    return enrich(c, style, rng, flats, { cadential });
  });
}

// --- strategies ---------------------------------------------------------------

function functionalPhrase(phrase, slots, style, rng, ctx) {
  const key = phrase.key;
  const family = familyOf(key);
  const table = style.progression[family];
  const tonic = tonicToken(style, family);

  // Baroque episodes use circle-of-fifths sequences.
  if (style.sequences && phrase.sectionType === 'development' && rng.chance(0.65)) {
    const seqs = style.sequences[family];
    const seq = rng.pick(seqs);
    const tokens = [];
    while (tokens.length < slots) tokens.push(seq[tokens.length % seq.length]);
    const cad = pickCadence(style, family, phrase.cadence, rng);
    for (let i = 0; i < cad.length && i < slots; i++) tokens[slots - cad.length + i] = cad[i];
    return { tokens, cadenceFrom: slots - cad.length, technique: style.sequenceLabel || 'circle-of-fifths sequence' };
  }

  let cadenceType = phrase.cadence;
  let cad;
  if (cadenceType === 'TURN') cad = style.cadences[family].TURN?.[0] || pickCadence(style, family, 'HC', rng);
  else cad = pickCadence(style, family, cadenceType, rng);
  cad = cad.slice(-Math.max(1, Math.min(cad.length, slots - 1)));

  let start = tonic;
  if (phrase.sectionType === 'development' || phrase.role === 'B') {
    const keys = Object.keys(table).filter((k) => !k.includes('/') && k !== tonic);
    start = phrase.posInSection === 0 && phrase.key !== ctx.home ? tonic : rng.pick(keys);
  }
  const freeLen = slots - cad.length;
  const free = freeLen > 0 ? markovFill(table, start, freeLen, cad[0], rng) : [];
  return { tokens: avoidRepeats([...free, ...cad], freeLen, table, rng), cadenceFrom: freeLen };
}

function modalPhrase(phrase, slots, style, rng) {
  const family = familyOf(phrase.key);
  const table = style.progression[family];
  const tonic = tonicToken(style, family);
  const cad = pickCadence(style, family, phrase.cadence === 'TURN' ? 'HC' : phrase.cadence, rng).slice(-Math.max(1, slots - 1));
  const freeLen = slots - cad.length;
  const nonTonic = Object.keys(table).filter((k) => k !== tonic && k !== cad[0]);
  const start = phrase.posInSection === 0 && (slots > 2 || phrase.sectionType === 'intro') ? tonic : rng.pick(nonTonic);
  const free = freeLen > 0 ? markovFill(table, start, freeLen, cad[0], rng) : [];
  return { tokens: avoidRepeats([...free, ...cad], freeLen, table, rng), cadenceFrom: freeLen };
}

// Replace a free chord that merely repeats its neighbour (keeps harmonic motion alive).
function avoidRepeats(tokens, freeLen, table, rng) {
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i] !== tokens[i - 1]) continue;
    const j = i - 1 < freeLen ? i - 1 : i < freeLen ? i : -1;
    if (j < 0) continue;
    const before = tokens[j - 1];
    const after = tokens[j + 1];
    const opts = Object.keys((before && table[before]) || table).filter((k) => k !== after && k !== before && table[k]);
    if (opts.length) tokens[j] = rng.pick(opts);
  }
  return tokens;
}

function cyclePhrase(phrase, slots, style, rng, ctx) {
  const family = familyOf(phrase.key);
  const pool = style.cyclePool[family];
  const tonic = pool[0];
  // One cycle per section; each new section mutates one chord (process music).
  if (!ctx.cycles) ctx.cycles = {};
  let cycle = ctx.cycles[phrase.section];
  if (!cycle) {
    const prevCycle = ctx.lastCycle;
    if (prevCycle) {
      cycle = prevCycle.slice();
      const idx = rng.int(1, cycle.length - 1);
      const choices = pool.filter((c) => !cycle.includes(c));
      if (choices.length) cycle[idx] = rng.pick(choices);
      if (phrase.sectionType === 'climax' && rng.chance(0.5)) cycle = cycle.concat(rng.pick(pool.slice(1)));
    } else {
      const len = rng.weighted([3, 4], [1, 2]);
      cycle = [tonic];
      const rest = rng.shuffle(pool.slice(1));
      while (cycle.length < len) cycle.push(rest[cycle.length - 1]);
    }
    ctx.cycles[phrase.section] = cycle;
    ctx.lastCycle = cycle;
  }
  const tokens = [];
  for (let i = 0; i < slots; i++) tokens.push(cycle[i % cycle.length]);
  if (phrase.cadence === 'FINAL') tokens[slots - 1] = tonic;
  return { tokens, cadenceFrom: slots, technique: 'chord cycle' };
}

function neoRiemannPhrase(phrase, slots, style, rng, ctx) {
  const key = phrase.key;
  const flats = usesFlats(key.tonic, key.mode);
  const family = familyOf(key);
  const home = { root: key.tonic, quality: family === 'major' ? 'maj' : 'min' };
  let cur = ctx.lastTriad && phrase.posInSection > 0 ? ctx.lastTriad : home;
  const chords = [];
  const ops = [];
  const moves = { L: 3, R: 3, P: 1.5, N: 1, S: 0.6, H: 0.5, 'T+2': 1, 'T-2': 1 };
  for (let i = 0; i < slots; i++) {
    if (i === 0) {
      chords.push(cur);
      ops.push(phrase.posInSection === 0 ? 'home' : 'cont');
      continue;
    }
    const remaining = slots - i;
    if (phrase.cadence === 'FINAL' && remaining === 1) {
      chords.push(home); ops.push('home'); cur = home; continue;
    }
    const keys = Object.keys(moves);
    const cands = keys.map((k) => NEO_RIEMANN[k](cur));
    const weights = keys.map((k, j) => {
      const c = cands[j];
      let w = moves[k];
      const dist = fifthsDistance(c.root, home.root);
      // Gravity: stay near home, stronger near the phrase end.
      const pull = 0.35 + (1 - remaining / slots) * 1.2;
      w *= Math.exp(-pull * Math.max(0, dist - 2) * 0.6);
      if (remaining === 1 && (phrase.cadence === 'PAC') && !(c.root === home.root)) w *= 0.25;
      if (chords.length >= 2 && c.root === chords[chords.length - 2].root && c.quality === chords[chords.length - 2].quality) w *= 0.3;
      return w;
    });
    const k = rng.weighted(keys, weights);
    cur = NEO_RIEMANN[k](cur);
    chords.push(cur);
    ops.push(k);
  }
  ctx.lastTriad = cur;
  const realized = chords.map((c, i) => {
    const base = makeChord({ root: c.root, quality: c.quality, flats, label: ops[i] });
    const r = enrich(base, style, rng, flats);
    r.label = ops[i];
    r.roman = ops[i] === 'home' || ops[i] === 'cont' ? r.symbol : `${r.symbol} (${ops[i]})`;
    return r;
  });
  return { chords: realized, cadenceFrom: slots, technique: 'neo-Riemannian' };
}

// --- main ---------------------------------------------------------------------

function slotsPerBar(style, phrase, params, rng) {
  const hr = { ...(phrase.sectionType === 'development' && style.devHarmonicRhythm ? style.devHarmonicRhythm : style.harmonicRhythm) };
  // Complexity speeds up harmonic rhythm; outer sections slow it.
  if (params.complexity > 0.65 && hr[2] !== undefined) hr[2] *= 1.8;
  if (params.complexity < 0.35) { if (hr[2]) hr[2] *= 0.4; if (hr[0.5]) hr[0.5] *= 1.5; }
  if (phrase.sectionType === 'intro' || phrase.sectionType === 'outro') { if (hr[2]) hr[2] *= 0.5; }
  return Number(rng.weighted(hr));
}

export function generateHarmony(plan, style, params, rng) {
  const ctx = { home: plan.home };
  const timeline = []; // {startQ, durQ, chord, key, phrase, section, cadential}
  const phraseRecords = [];
  const barQ = plan.meter.barQ;
  const techniques = new Set();

  plan.phrases.forEach((phrase, pi) => {
    const srcIdx = phrase.reuseFrom ?? phrase.reuseHarmonyFrom;
    const phraseStartQ = phrase.startBar * barQ;
    let chords;
    let spb;
    let cadenceFrom;

    if (srcIdx !== null && srcIdx !== undefined && phraseRecords[srcIdx] && phraseRecords[srcIdx].tokens) {
      // Restatement: same roman numerals re-realized in this phrase's key; new cadence.
      const src = phraseRecords[srcIdx];
      spb = src.spb;
      const slots = Math.max(2, Math.round(phrase.bars * spb));
      const tokens = [];
      for (let i = 0; i < slots; i++) tokens.push(src.tokens[i % src.tokens.length]);
      const family = familyOf(phrase.key);
      if (phrase.cadence !== src.cadence && style.cadences) {
        const cad = phrase.cadence === 'TURN' ? style.cadences[family].TURN?.[0] : pickCadence(style, family, phrase.cadence, rng);
        if (cad) {
          const c = cad.slice(-Math.max(1, slots - 1));
          for (let i = 0; i < c.length; i++) tokens[slots - c.length + i] = c[i];
          cadenceFrom = slots - c.length;
        }
      } else cadenceFrom = src.cadenceFrom;
      chords = realize(tokens, phrase.key, style, rng, { cadenceFrom });
      phraseRecords[pi] = { tokens, spb, cadence: phrase.cadence, cadenceFrom };
      techniques.add('thematic restatement');
    } else {
      spb = slotsPerBar(style, phrase, params, rng);
      const slots = Math.max(2, Math.round(phrase.bars * spb));
      let res;
      if (style.generator === 'functional') res = functionalPhrase(phrase, slots, style, rng, ctx);
      else if (style.generator === 'modal') res = modalPhrase(phrase, slots, style, rng, ctx);
      else if (style.generator === 'cycle') res = cyclePhrase(phrase, slots, style, rng, ctx);
      else res = neoRiemannPhrase(phrase, slots, style, rng, ctx);
      if (res.technique) techniques.add(res.technique);
      cadenceFrom = res.cadenceFrom;
      chords = res.chords || realize(res.tokens, phrase.key, style, rng, { cadenceFrom });
      phraseRecords[pi] = { tokens: res.tokens || null, spb, cadence: phrase.cadence, cadenceFrom };
    }

    // Modulation: pivot into the next phrase's key through its dominant.
    const next = plan.phrases[pi + 1];
    if (next && (next.key.tonic !== phrase.key.tonic || familyOf(next.key) !== familyOf(phrase.key)) && style.generator === 'functional') {
      const flats = usesFlats(next.key.tonic, next.key.mode);
      chords[chords.length - 1] = chordFromRoman('V7', { tonic: next.key.tonic, mode: 'major' }, flats);
      chords[chords.length - 1].roman = `V7 of ${next.key.mode === 'major' ? 'I' : 'i'} (new key)`;
      chords[chords.length - 1].func = 'D';
      techniques.add('modulation via dominant pivot');
    }

    // Lay chords out in time.
    const total = phrase.bars * barQ;
    const slotQ = total / chords.length;
    let t = 0;
    chords.forEach((c, i) => {
      const last = i === chords.length - 1;
      const dur = last ? total - t : Math.min(slotQ, total - t);
      if (dur <= 0) return;
      timeline.push({
        startQ: phraseStartQ + t, durQ: dur, chord: c, key: phrase.key, phrase: pi,
        section: phrase.section, cadential: cadenceFrom !== undefined && i >= cadenceFrom,
        final: phrase.cadence === 'FINAL' && last,
      });
      t += dur;
    });
  });

  return { timeline, techniques: [...techniques] };
}
