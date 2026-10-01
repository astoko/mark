// Melody generation.
//  - Rhythm: per-pulse cells weighted by style vocabulary and a target density level.
//  - Motif: a one-bar idea (rhythm + scale-step intervals) that is restated, varied,
//    sequenced, inverted or fragmented according to the phrase's bar plan.
//  - Pitch: weighted scale-degree selection combining degree weights, interval size,
//    chord-tone priority on strong beats, gap-fill after leaps, phrase contour target,
//    parallel 5th/8ve avoidance against the bass (and against the melody for counter-voices),
//    appoggiaturas, chromatic approach tones (jazz/romantic) and cadence targeting.

import {
  mod12, chordScale, pitchesInRange, stepAlong, metricStrength, MODES,
} from './theory.js';
import { parallelPerfect } from './voicing.js';
import { RHYTHM_CELLS } from './styles.js';

function lowerBound(arr, q, key = (x) => x.startQ) {
  let lo = 0; let hi = arr.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (key(arr[m]) <= q + 1e-9) lo = m + 1; else hi = m; }
  return lo - 1;
}

function contourTarget(shape, t, lo, hi) {
  const span = hi - lo;
  let f;
  switch (shape) {
    case 'ascending': f = 0.25 + 0.55 * t; break;
    case 'descending': f = 0.72 - 0.45 * t; break;
    case 'wave': f = 0.5 + 0.2 * Math.sin(2 * Math.PI * t * 1.5); break;
    default: f = 0.3 + 0.5 * Math.sin(Math.PI * Math.pow(t, 0.85));
  }
  return lo + span * f;
}

function intervalWeight(a, cfg) {
  if (a === 0) return cfg.repeatW;
  if (a > cfg.leapMax) return 0.0005; // discouraged, but never leaves a cadence without options
  if (a <= 2) return 1 * cfg.stepBias;
  if (a <= 4) return 0.55;
  if (a === 5) return 0.35;
  if (a === 6) return 0.04;
  if (a === 7) return 0.25;
  if (a <= 9) return 0.12;
  if (a === 12) return 0.07;
  return 0.03;
}

export function generateMelody(opts) {
  const {
    plan, timeline, style, params, rng, bassNotes, range, mode = 'lead', against = [], sharedMotifs = null,
  } = opts;
  const cfg = { ...style.melody };
  const meter = plan.meter;
  const barQ = meter.barQ;
  const notes = [];
  const phraseNotes = {};
  const motifs = sharedMotifs || {};
  const isCounter = mode === 'counter';

  const entryAt = (q) => timeline[Math.max(0, lowerBound(timeline, q))];
  const bassAt = (q) => { const i = lowerBound(bassNotes, q); return i >= 0 ? bassNotes[i].pitch : undefined; };
  const againstAt = (q) => {
    if (!against.length) return undefined;
    const i = lowerBound(against, q);
    if (i < 0) return undefined;
    const n = against[i];
    return q < n.startQ + n.durQ + 0.01 ? n.pitch : undefined;
  };

  let prev = Math.round((range[0] + range[1]) / 2);
  let prevInterval = 0;
  let prevQ = 0;

  function degreeWeight(p, key) {
    const scale = MODES[key.mode] || MODES.major;
    const rel = mod12(p - key.tonic);
    const idx = scale.indexOf(rel);
    return idx >= 0 ? cfg.degreeWeights[idx] : 0.7;
  }

  function choose({ q, strength, target, lo, hi, extra, cadence }) {
    const entry = entryAt(q);
    const { chord, key } = entry;
    const scale = chordScale(key, chord);
    const cands = pitchesInRange(scale, lo, hi);
    const bass = bassAt(q);
    const prevBass = bassAt(prevQ);
    const ag = againstAt(q);
    const agPrev = againstAt(prevQ);
    const leading = mod12(key.tonic - 1);
    const weights = cands.map((p) => {
      const pc = mod12(p);
      const iv = p - prev;
      const a = Math.abs(iv);
      let w = degreeWeight(p, key) * intervalWeight(a, cfg);
      if (w === 0) return 0;
      const ct = chord.pcs.includes(pc);
      if (strength >= 0.7) w *= ct ? 4 : 0.12;
      else if (strength >= 0.3) w *= ct ? 1.8 : a <= 2 ? 0.9 : 0.2;
      else w *= ct ? 1.2 : a <= 2 ? 1 : 0.2;
      if (Math.abs(prevInterval) >= 5) {
        if (Math.sign(iv) === -Math.sign(prevInterval) && a <= 2) w *= 3;
        else if (Math.sign(iv) === Math.sign(prevInterval)) w *= 0.25;
      }
      const sd = cadence ? 4 : 5.5;
      w *= Math.exp(-((p - target) ** 2) / (2 * sd * sd));
      if (bass !== undefined && prevBass !== undefined && parallelPerfect(prev, p, prevBass, bass)) w *= strength >= 0.3 ? 0.03 : 0.1;
      if (bass !== undefined && p - bass < 3) w *= 0.05;
      if (isCounter && ag !== undefined) {
        if (p >= ag - 2) w *= 0.05;
        if (agPrev !== undefined && parallelPerfect(prev, p, agPrev, ag)) w *= 0.03;
        const iv2 = mod12(ag - p);
        if ([3, 4, 8, 9].includes(iv2)) w *= 1.8; // imperfect consonances
        if ([1, 2, 10, 11, 6].includes(iv2) && strength >= 0.5) w *= 0.2;
      }
      if (cfg.guideTones && strength >= 0.5) {
        const g = chord.tones.find((t) => (t.role === 'third' || t.role === 'seventh') && t.pc === pc);
        if (g) w *= 1.6;
      }
      if (mod12(prev) === leading && strength >= 0.5 && chord.pcs.includes(key.tonic) && pc === key.tonic && a <= 2) w *= 3;
      if (extra) w *= extra(p);
      return w;
    });
    return rng.weighted(cands, weights) ?? prev;
  }

  function rhythmLevel(phrase, energy) {
    let lvl = cfg.baseLevel + (params.complexity - 0.5) * 1.6 + (energy - 0.5) * 0.9;
    if (style.id === 'jazz' && phrase.sectionType === 'development') lvl += 0.8;
    if (isCounter) lvl -= 0.9;
    return lvl;
  }

  function barRhythm(level, startQ, lengthQ = barQ) {
    const events = [];
    let pendingTie = false;
    meter.pulses.forEach((len, i) => {
      const ps = meter.pulseStarts[i];
      if (ps >= lengthQ - 1e-9) return;
      const fam = len === 1.5 ? 'compound' : 'simple';
      const cells = RHYTHM_CELLS[fam];
      const ids = Object.keys(cells).filter((id) => cfg.rhythm[id]);
      const weights = ids.map((id) => {
        let w = cfg.rhythm[id] * Math.exp(-((cells[id].lvl - level) ** 2) / 1.4);
        if (cells[id].c[0] === 'T' && !events.length && i === 0) w *= 0.4;
        return w;
      });
      const id = rng.weighted(ids, weights);
      const cell = cells[id];
      let pos = ps;
      cell.c.forEach((d, k) => {
        if (d === 'T') return;
        const tieThis = (k === 1 && cell.c[0] === 'T') || (k === 0 && pendingTie);
        const last = events[events.length - 1];
        if (tieThis && last && !last.rest) { last.dur += Math.abs(d); pos += Math.abs(d); return; }
        if (tieThis && !last) { events.push({ pos, dur: Math.abs(d), rest: false }); pos += Math.abs(d); return; }
        events.push({ pos, dur: Math.abs(d), rest: d < 0 });
        pos += Math.abs(d);
      });
      pendingTie = !!cell.tieNext;
    });
    if (!events.some((e) => !e.rest)) events.unshift({ pos: 0, dur: meter.pulses[0], rest: false });
    return events.filter((e) => e.pos < lengthQ - 1e-9).map((e) => ({ ...e, dur: Math.min(e.dur, lengthQ - e.pos), q: startQ + e.pos }));
  }

  function barPlan(phrase) {
    const bars = phrase.bars;
    const kinds = [];
    const dev = phrase.sectionType === 'development';
    for (let b = 0; b < bars - 1; b++) {
      if (isCounter) { kinds.push(b % 4 === 1 && motifs.main ? 'M' : 'F'); continue; }
      if (style.id === 'jazz' && dev) { kinds.push('F'); continue; }
      if (style.id === 'baroque' || (cfg.sequenceProb && dev)) {
        kinds.push(b === 0 ? 'M' : rng.chance(cfg.sequenceProb || 0.5) ? 'S' : 'F');
        continue;
      }
      if (dev) { kinds.push(b % 2 === 0 ? rng.weighted({ S: 2, X: 1.5, I: 1 }) : rng.weighted({ F: 2, S: 1, I: 0.8 })); continue; }
      const m = b % 4;
      if (m === 0) kinds.push('M');
      else if (m === 1) kinds.push(rng.weighted({ V: 1.2, F: 1, S: 0.6 }));
      else if (m === 2) kinds.push(rng.weighted({ S: 1, M: 0.8, F: 1, I: style.id === 'contemporary' ? 1.2 : 0.2 }));
      else kinds.push('F');
    }
    kinds.push('C');
    return kinds;
  }

  // Last line of defence for outer-voice counterpoint: nudge a note that would form
  // parallel fifths/octaves with the bass (or the lead, for a counter-voice).
  function melodyAt(t) {
    for (let i = lowerBound(notes, t); i >= 0; i--) if (!notes[i].echo) return notes[i];
    return undefined;
  }

  function fixParallels(q, pitch, strength) {
    const bass = bassAt(q); const prevBass = bassAt(prevQ);
    const ag = againstAt(q); const agPrev = againstAt(prevQ);
    // Voice leading between successive bass attacks (what the ear tracks between harmonies).
    let prevAttack = null;
    const bi = lowerBound(bassNotes, q);
    if (bi >= 1 && Math.abs(bassNotes[bi].startQ - q) < 1e-6) {
      let j = bi - 1;
      while (j >= 0 && bassNotes[j].startQ > q - 1e-6) j--;
      if (j >= 0) {
        const m = melodyAt(bassNotes[j].startQ);
        if (m) prevAttack = { mel: m.pitch, bass: bassNotes[j].pitch, now: bassNotes[bi].pitch };
      }
    }
    const bad = (p) => (bass !== undefined && prevBass !== undefined && parallelPerfect(prev, p, prevBass, bass))
      || (prevAttack && parallelPerfect(prevAttack.mel, p, prevAttack.bass, prevAttack.now))
      || (isCounter && ag !== undefined && agPrev !== undefined && parallelPerfect(prev, p, agPrev, ag));
    if (!bad(pitch)) return pitch;
    const e = entryAt(q);
    const sc = chordScale(e.key, e.chord);
    const alts = [stepAlong(pitch, 1, sc), stepAlong(pitch, -1, sc), stepAlong(pitch, 2, sc), stepAlong(pitch, -2, sc)]
      .filter((p) => !bad(p) && p >= range[0] - 3 && p <= range[1] + 5);
    if (!alts.length) return pitch;
    const ct = alts.filter((p) => e.chord.pcs.includes(mod12(p)));
    return strength >= 0.5 && ct.length ? ct[0] : alts[0];
  }

  function placeNote(q, dur, pitch, acc, phraseIdx, extra = {}) {
    if (!extra.keep) pitch = fixParallels(q, pitch, acc >= 1 ? 0.8 : 0.3);
    delete extra.keep;
    const n = { startQ: q, durQ: dur, pitch, acc, phrase: phraseIdx, ...extra };
    notes.push(n);
    (phraseNotes[phraseIdx] ||= []).push(n);
    prevInterval = pitch - prev;
    prev = pitch;
    prevQ = q;
    return n;
  }

  function realizeEvents(events, phrase, phraseStartQ, phraseLenQ, lo, hi, opt = {}) {
    let forced = null;
    events.forEach((ev, idx) => {
      if (ev.rest) {
        if (cfg.echo && idx > 0 && !events[idx - 1].rest && ev.dur >= 0.75 && rng.chance(cfg.echo)) {
          const up = prev + 12 <= hi + 5 && rng.chance(0.3) ? 12 : 0;
          const n = { startQ: ev.q, durQ: ev.dur, pitch: prev + up, acc: 0.45, phrase: phrase.index, echo: true };
          notes.push(n); (phraseNotes[phrase.index] ||= []).push(n);
        }
        return;
      }
      const posInBar = ((ev.q % barQ) + barQ) % barQ;
      const strength = Math.max(metricStrength(meter, posInBar), ev.dur >= 1 ? 0.5 : 0);
      const t = (ev.q - phraseStartQ) / phraseLenQ;
      const target = contourTarget(phrase.contour, t, lo, hi);
      let p;
      if (forced !== null) { p = forced; forced = null; }
      else if (opt.pitchFor) p = opt.pitchFor(idx, ev, strength, target);
      if (p === undefined || p === null) {
        const nextEv = events[idx + 1];
        const nextStrong = nextEv && !nextEv.rest && metricStrength(meter, ((nextEv.q % barQ) + barQ) % barQ) >= 0.5;
        if (strength < 0.3 && nextStrong && !opt.pitchFor) {
          // Weak note leading into a structural one: pre-choose the goal, then approach it.
          const goal = choose({ q: nextEv.q, strength: 0.75, target: contourTarget(phrase.contour, (nextEv.q - phraseStartQ) / phraseLenQ, lo, hi), lo, hi });
          const entry = entryAt(ev.q);
          if (cfg.chromatic && rng.chance(cfg.chromatic) && goal - 1 >= lo && goal + 1 <= hi) {
            p = goal + (prev > goal ? 1 : -1);
          } else {
            p = choose({ q: ev.q, strength, target, lo, hi, extra: (c) => (Math.abs(c - goal) <= 2 && c !== goal ? 2.5 : c === goal ? 0.3 : 0.6) });
          }
          if (cfg.blueNotes && rng.chance(cfg.blueNotes)) {
            const blue = [mod12(entry.key.tonic + 3), mod12(entry.key.tonic + 6)];
            const near = [p - 1, p + 1].find((c) => blue.includes(mod12(c)));
            if (near) p = near;
          }
          forced = goal;
        } else if (strength >= 0.7 && ev.dur <= 1 && rng.chance(cfg.appoggiatura) && events[idx + 1] && !events[idx + 1].rest) {
          const entry = entryAt(ev.q);
          const res = choose({ q: ev.q, strength: 1, target, lo, hi });
          const app = stepAlong(res, 1, chordScale(entry.key, entry.chord));
          if (app <= hi + 2 && !entry.chord.pcs.includes(mod12(app))) { p = app; forced = res; }
          else p = res;
        } else {
          p = choose({ q: ev.q, strength, target, lo, hi });
        }
      }
      placeNote(ev.q, ev.dur, p, strength >= 0.7 ? 1 : strength >= 0.3 ? 0.9 : 0.82, phrase.index, opt.tag ? { tag: opt.tag } : {});
    });
  }

  function makeMotif(events, pitchesOut) {
    const played = events.filter((e) => !e.rest);
    const steps = [];
    for (let i = 1; i < pitchesOut.length; i++) steps.push(pitchesOut[i] - pitchesOut[i - 1]);
    return { events: events.map((e) => ({ pos: e.pos, dur: e.dur, rest: e.rest })), steps, count: played.length };
  }

  function realizeMotifBar(motif, kind, barStart, phrase, phraseStartQ, phraseLenQ, lo, hi, level) {
    let events = motif.events.map((e) => ({ ...e, q: barStart + e.pos }));
    if (kind === 'X') {
      const half = barQ / 2;
      const first = events.filter((e) => e.pos < half);
      events = first.concat(first.map((e) => ({ ...e, pos: e.pos + half, q: barStart + e.pos + half })));
    }
    const entry = entryAt(barStart);
    const scale = chordScale(entry.key, entry.chord);
    const semis = kind === 'I' ? motif.steps.map((s) => -s) : motif.steps.slice();
    if (kind === 'V') {
      const k = rng.int(0, Math.max(0, semis.length - 1));
      if (semis.length) semis[k] += rng.chance(0.5) ? 1 : -1;
    }
    // Starting pitch: sequence moves the last motif start by a scale step.
    let start;
    if (kind === 'S' && motifs.lastStart !== undefined) {
      const dir = phrase.contour === 'ascending' ? 1 : -1;
      start = stepAlong(motifs.lastStart, dir, scale);
      if (!entry.chord.pcs.includes(mod12(start))) {
        const alt = [stepAlong(start, 1, scale), stepAlong(start, -1, scale)].find((c) => entry.chord.pcs.includes(mod12(c)));
        if (alt !== undefined) start = alt;
      }
    } else {
      const t = (barStart - phraseStartQ) / phraseLenQ;
      start = choose({ q: barStart, strength: 1, target: contourTarget(phrase.contour, t, lo, hi), lo, hi });
    }
    // Build pitches by applying the motif's interval shape in scale steps.
    const pitches = [start];
    let played = events.filter((e) => !e.rest);
    for (let i = 1; i < played.length; i++) {
      const ent = entryAt(played[i].q);
      const sc = chordScale(ent.key, ent.chord);
      const semi = semis[(i - 1) % Math.max(1, semis.length)] || 0;
      const steps = Math.round(semi / 1.75);
      let p = steps === 0 ? pitches[i - 1] : stepAlong(pitches[i - 1], steps, sc);
      const strength = metricStrength(meter, played[i].pos % barQ);
      if (strength >= 0.7 && !ent.chord.pcs.includes(mod12(p))) {
        const alt = [stepAlong(p, 1, sc), stepAlong(p, -1, sc)].find((c) => ent.chord.pcs.includes(mod12(c)));
        if (alt !== undefined) p = alt;
      }
      pitches.push(p);
    }
    const max = Math.max(...pitches); const min = Math.min(...pitches);
    let shift = 0;
    if (max > hi + 2) shift = -12;
    else if (min < lo - 2) shift = 12;
    motifs.lastStart = start + shift;
    let k = 0;
    realizeEvents(events, phrase, phraseStartQ, phraseLenQ, lo, hi, {
      pitchFor: (idx, ev) => (ev.rest ? null : pitches[k++] + shift),
    });
    return played.length;
  }

  function cadenceBar(barStart, phrase, phraseStartQ, phraseLenQ, lo, hi, level) {
    const phraseEnd = phraseStartQ + phraseLenQ;
    const lastEntryIdx = lowerBound(timeline, phraseEnd - 0.01);
    const lastEntry = timeline[lastEntryIdx];
    const cadStart = Math.max(barStart, lastEntry.startQ);
    if (cadStart > barStart + 1e-6) {
      const ev = barRhythm(level, barStart, cadStart - barStart);
      realizeEvents(ev, phrase, phraseStartQ, phraseLenQ, lo, hi);
    }
    const { chord, key } = lastEntry;
    const type = phrase.cadence;
    const final = type === 'FINAL';
    const center = final ? lo + (hi - lo) * 0.35 : lo + (hi - lo) * 0.45;
    const p = choose({
      q: cadStart, strength: 1, target: center, lo, hi, cadence: true,
      extra: (c) => {
        const pc = mod12(c);
        if (final) return pc === key.tonic ? 1 : 0;
        if (!chord.pcs.includes(pc)) return 0.02;
        if (type === 'PAC' || type === 'DC') return pc === key.tonic ? 8 : 1;
        if (type === 'PLAGAL') return pc === key.tonic ? 5 : 1;
        const third = chord.tones.find((t) => t.role === 'third');
        return third && third.pc === pc ? 1.5 : 1.2;
      },
    });
    let dur = phraseEnd - cadStart;
    if (!final && dur > 1.5 && style.id !== 'ambient') dur -= rng.pick([0.5, 1]) * Math.min(1, dur / 3);
    placeNote(cadStart, dur, p, 1, phrase.index, final ? { cadence: type, keep: true } : { cadence: type });
  }

  // ---------------------------------------------------------------------------
  for (const phrase of plan.phrases) {
    const section = plan.sections[phrase.section];
    const phraseStartQ = phrase.startBar * barQ;
    const phraseLenQ = phrase.bars * barQ;
    let [lo, hi] = range;
    if (!isCounter) {
      if (phrase.sectionType === 'climax') { lo += 3; hi += 3; }
      if (phrase.sectionType === 'intro' || phrase.sectionType === 'outro') { hi -= 2; }
    }
    const level = rhythmLevel(phrase, section.energy);

    // Restatement of an earlier phrase (period consequent, recapitulation, head out).
    const src = phrase.reuseFrom;
    if (!isCounter && src !== null && src !== undefined && phraseNotes[src]?.length) {
      const srcPhrase = plan.phrases[src];
      const delta = phraseStartQ - srcPhrase.startBar * barQ;
      let tr = mod12(phrase.key.tonic - srcPhrase.key.tonic);
      if (tr > 6) tr -= 12;
      const srcNotes = phraseNotes[src].filter((n) => n.startQ - srcPhrase.startBar * barQ < (phrase.bars - 1) * barQ - 1e-6 && !n.octave);
      let oct = 0;
      if (phrase.sectionType === 'climax' && ['romantic', 'virtuoso', 'classical', 'contemporary'].includes(style.id)) {
        const mx = Math.max(...srcNotes.map((n) => n.pitch));
        if (mx + 12 + tr <= 94 && rng.chance(cfg.climaxOctaveUp ?? 0.45)) oct = 12;
      }
      for (const n of srcNotes) {
        let pitch = n.pitch + tr + oct;
        // Light ornamental variation on weak notes (not for the jazz head, which is restated exactly).
        if (style.id !== 'jazz' && n.acc < 0.9 && rng.chance(0.15)) {
          const e = entryAt(n.startQ + delta);
          pitch = stepAlong(pitch, rng.chance(0.5) ? 1 : -1, chordScale(e.key, e.chord));
        }
        placeNote(n.startQ + delta, n.durQ, pitch, n.acc, phrase.index, style.id === 'jazz' ? { keep: true } : {});
      }
      cadenceBar(phraseStartQ + (phrase.bars - 1) * barQ, phrase, phraseStartQ, phraseLenQ, lo, hi, level);
      continue;
    }

    const kinds = barPlan(phrase);
    const motifKey = phrase.role === 'B' ? 'b' : 'main';
    for (let b = 0; b < phrase.bars; b++) {
      const barStart = phraseStartQ + b * barQ;
      const kind = kinds[b];
      if (kind === 'C') { cadenceBar(barStart, phrase, phraseStartQ, phraseLenQ, lo, hi, level); continue; }
      const motif = motifs[motifKey] || motifs.main;
      if (kind !== 'F' && motif && !(kind === 'M' && !motifs[motifKey] && !isCounter)) {
        realizeMotifBar(motif, kind, barStart, phrase, phraseStartQ, phraseLenQ, lo, hi, level);
        continue;
      }
      const events = barRhythm(level, barStart);
      const before = notes.length;
      realizeEvents(events, phrase, phraseStartQ, phraseLenQ, lo, hi);
      if (kind === 'M' && !motifs[motifKey] && !isCounter) {
        const pitches = notes.slice(before).filter((n) => !n.echo).map((n) => n.pitch);
        if (pitches.length >= 2) {
          motifs[motifKey] = makeMotif(events.map((e) => ({ ...e, pos: e.q - barStart })), pitches);
          motifs.lastStart = pitches[0];
        }
      }
    }
  }

  // Octave doubling of the melody at the climax (Romantic / Contemporary pianism).
  if (!isCounter && cfg.octaveDouble) {
    const climax = plan.sections.find((s) => s.type === 'climax');
    if (climax && rng.chance(cfg.octaveDouble)) {
      const s = climax.startBar * barQ; const e = s + climax.bars * barQ;
      const add = notes.filter((n) => n.startQ >= s && n.startQ < e && n.durQ >= 0.5 && !n.echo)
        .map((n) => ({ ...n, pitch: n.pitch - 12, acc: n.acc * 0.8, octave: true }));
      notes.push(...add);
    }
  }

  notes.sort((a, b) => a.startQ - b.startQ || b.pitch - a.pitch);
  return { notes, motifs, phraseNotes };
}

// Minimalist process music: a repeating cell mapped onto the current chord, grown
// additively, phase-rotated, doubled and finally thinned out subtractively. The
// accompaniment ostinato runs in a different cycle length for polymetric interplay.
export function generateMinimalist({ plan, timeline, voicings, rng, params }) {
  const meter = plan.meter;
  const barQ = meter.barQ;
  const melody = []; const harmony = []; const bass = [];
  const step = params.complexity > 0.7 ? 0.25 : 0.5;
  const cellLen = rng.int(4, 6);
  const cell = Array.from({ length: cellLen }, (_, i) => (i === 0 ? 0 : rng.weighted([0, 1, 2, 3, 4], [1, 3, 3, 2, 1])));
  const ostLen = cellLen === 4 ? 3 : cellLen - 1;
  const ost = Array.from({ length: ostLen }, (_, i) => [0, 2, 1, 2, 1][i % 5]);
  const anchor = 67;
  const toneAt = (entry, idx, base) => {
    const pcs = entry.chord.pcs.slice(0, 4);
    const pitches = pitchesInRange(pcs, base, base + 24);
    return pitches[Math.min(idx, pitches.length - 1)];
  };
  const endQ = plan.totalBars * barQ;
  let phaseOffset = 0;
  let lastPhrase = -1;

  for (let q = 0, i = 0; q < endQ - 1e-6; q += step, i++) {
    const ti = lowerBound(timeline, q);
    const entry = timeline[Math.max(0, ti)];
    const phrase = plan.phrases[entry.phrase];
    const section = plan.sections[phrase.section];
    const progress = (q - section.startBar * barQ) / (section.bars * barQ);
    if (phrase.index !== lastPhrase) {
      if (section.type === 'development') phaseOffset++;
      lastPhrase = phrase.index;
    }
    // Additive: intro reveals the cell a note at a time; subtractive outro removes them.
    let active = cellLen;
    if (section.type === 'intro') active = Math.max(1, Math.ceil(cellLen * Math.min(1, progress * 1.4 + 0.15)));
    if (section.type === 'outro') active = Math.max(1, Math.round(cellLen * (1 - progress * 0.85)));
    const k = (i + phaseOffset) % cellLen;
    const final = entry.final && q >= entry.startQ;
    if (final) break;
    if (k < active) {
      const p = toneAt(entry, cell[k], anchor);
      melody.push({ startQ: q, durQ: step * 0.9, pitch: p, acc: k === 0 ? 1 : 0.85, phrase: phrase.index });
      if (section.type === 'climax' && k % 2 === 0) melody.push({ startQ: q, durQ: step * 0.9, pitch: p + 12 <= 96 ? p + 12 : p, acc: 0.7, phrase: phrase.index, octave: true });
    }
    // Ostinato in the middle register, polymetric against the cell.
    if (section.type !== 'intro' || progress > 0.5) {
      const o = ost[i % ostLen];
      harmony.push({ layer: 'harmony', startQ: q, durQ: step * 0.95, pitch: toneAt(entry, o, 55), acc: i % ostLen === 0 ? 0.85 : 0.7 });
    }
  }
  timeline.forEach((entry, idx) => {
    const v = voicings[idx];
    const section = plan.sections[entry.section];
    if (entry.final) {
      bass.push({ layer: 'bass', startQ: entry.startQ, durQ: entry.durQ, pitch: v.bass, acc: 1 });
      v.upper.forEach((u) => harmony.push({ layer: 'harmony', startQ: entry.startQ, durQ: entry.durQ, pitch: u, acc: 0.8 }));
      const tonic = entry.key.tonic;
      const home = anchor + ((tonic - anchor) % 12 + 12) % 12;
      melody.push({ startQ: entry.startQ, durQ: entry.durQ, pitch: home, acc: 1, phrase: entry.phrase, cadence: 'FINAL' });
      return;
    }
    if (section.type === 'climax' || (section.type === 'development' && params.complexity > 0.5)) {
      for (let q = entry.startQ; q < entry.startQ + entry.durQ - 1e-6; q += 0.5) {
        const hi = Math.round((q - entry.startQ) / 0.5) % 2 === 1;
        bass.push({ layer: 'bass', startQ: q, durQ: 0.45, pitch: hi ? v.bass + 12 : v.bass, acc: hi ? 0.75 : 0.95 });
      }
    } else {
      bass.push({ layer: 'bass', startQ: entry.startQ, durQ: entry.durQ, pitch: v.bass, acc: 0.9 });
    }
  });
  return { melody, harmony, bass, cell, ostinato: ost };
}

