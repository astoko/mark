// Performance rendering: phrase-level dynamics (hairpins, metric accents, section
// terraces), tempo map with rubato and ritardandi, swing, micro-timing, chord rolls and
// sustain-pedal events. Converts score time (quarters) into performance seconds.

import { metricStrength } from './theory.js';

const smooth = (x) => x * x * (3 - 2 * x);

// Energy (0..1) over score time. "Flow" pieces follow one continuous emotional arc — a
// monotone cubic through the section anchors, so feeling rises and ebbs without
// plateaus; other styles keep section levels with short ramps (or terraces).
export function makeEnergyCurve(plan, style, params) {
  const barQ = plan.meter.barQ;
  const secs = plan.sections;
  const dyn = style.dynamics;
  if (params.flow || dyn.flow) {
    const pts = [{ q: 0, e: secs[0].energy * 0.85 }];
    for (const s of secs) pts.push({ q: (s.startBar + s.bars * (s.type === 'climax' ? 0.4 : 0.5)) * barQ, e: s.energy });
    pts.push({ q: plan.totalBars * barQ, e: secs[secs.length - 1].energy * 0.6 });
    const n = pts.length;
    const d = [];
    for (let i = 0; i < n - 1; i++) d.push((pts[i + 1].e - pts[i].e) / Math.max(1e-6, pts[i + 1].q - pts[i].q));
    const m = pts.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
    for (let i = 0; i < n - 1; i++) { // Fritsch–Carlson: no overshoot
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i]; const b = m[i + 1] / d[i]; const s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return (q) => {
      let i = 0;
      while (i < n - 2 && q > pts[i + 1].q) i++;
      const h = pts[i + 1].q - pts[i].q;
      if (h <= 0) return pts[i + 1].e;
      const t = Math.max(0, Math.min(1, (q - pts[i].q) / h));
      const t2 = t * t; const t3 = t2 * t;
      const e = (2 * t3 - 3 * t2 + 1) * pts[i].e + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * pts[i + 1].e + (t3 - t2) * h * m[i + 1];
      return Math.max(0.05, Math.min(1, e));
    };
  }
  const phraseOf = (q) => plan.phrases.find((p) => q >= p.startBar * barQ - 1e-6 && q < (p.startBar + p.bars) * barQ) || plan.phrases[plan.phrases.length - 1];
  return (q) => {
    const ph = phraseOf(q);
    const s = secs[ph.section];
    const next = secs[ph.section + 1];
    const sEnd = (s.startBar + s.bars) * barQ;
    let e = s.energy;
    if (!dyn.terraced && next) {
      const ramp = Math.min(s.bars * barQ * 0.5, barQ * 4);
      if (q > sEnd - ramp) e += (next.energy - s.energy) * smooth((q - (sEnd - ramp)) / ramp) * 0.7;
    }
    if (dyn.terraced && s.type === 'intro' && style.id === 'minimalist') e *= 0.7 + 0.3 * ((q - s.startBar * barQ) / (s.bars * barQ));
    return e;
  };
}

export function buildTempoMap(plan, style, params, rng) {
  const barQ = plan.meter.barQ;
  const totalQ = plan.totalBars * barQ;
  const base = plan.qTempo;
  const res = 0.25;
  const n = Math.ceil(totalQ / res) + 1;
  const bpm = new Float64Array(n);
  const rub = style.rubato * (0.6 + params.complexity * 0.6) * (params.rubatoScale || 1);
  const drift = rng.float(0, Math.PI * 2);

  for (let i = 0; i < n; i++) {
    const q = i * res;
    let f = 1;
    const phrase = plan.phrases.find((p) => q >= p.startBar * barQ && q < (p.startBar + p.bars) * barQ) || plan.phrases[plan.phrases.length - 1];
    const ps = phrase.startBar * barQ;
    const pl = phrase.bars * barQ;
    const t = Math.min(1, (q - ps) / pl);
    if (rub > 0) {
      // Push forward into the phrase peak, relax into the cadence.
      f += rub * 0.6 * Math.sin(Math.PI * t) - rub * 1.4 * smooth(Math.max(0, (t - 0.82) / 0.18));
      f += rub * 0.25 * Math.sin(q * 0.37 + drift);
    }
    const section = plan.sections[phrase.section];
    const next = plan.sections[phrase.section + 1];
    const sEnd = (section.startBar + section.bars) * barQ;
    if (next && style.sectionRit && q > sEnd - barQ) f -= style.sectionRit * smooth((q - (sEnd - barQ)) / barQ);
    const sStart = section.startBar * barQ;
    if (style.stringendo && section.type === 'development') f += style.stringendo * ((q - sStart) / (section.bars * barQ));
    if (section.type === 'climax') f += style.broaden ? -style.broaden : rub > 0 ? rub * 0.3 : 0;
    const ritLen = Math.min(totalQ * 0.25, barQ * 2);
    if (q > totalQ - ritLen) f -= style.finalRit * smooth((q - (totalQ - ritLen)) / ritLen);
    bpm[i] = base * Math.max(0.45, f);
  }
  // Cumulative seconds table.
  const secs = new Float64Array(n);
  for (let i = 1; i < n; i++) secs[i] = secs[i - 1] + (res * 60) / ((bpm[i - 1] + bpm[i]) / 2);

  const toSec = (q) => {
    if (q <= 0) return (q * 60) / bpm[0];
    const x = q / res;
    const i = Math.floor(x);
    if (i >= n - 1) return secs[n - 1] + ((q - (n - 1) * res) * 60) / bpm[n - 1];
    const fr = x - i;
    return secs[i] + (secs[i + 1] - secs[i]) * fr;
  };
  // Sparse tempo events for MIDI export (only where tempo changes noticeably).
  const events = [];
  let last = -1;
  for (let i = 0; i < n; i++) {
    if (last < 0 || Math.abs(bpm[i] - last) > 0.8) { events.push({ q: i * res, bpm: +bpm[i].toFixed(2) }); last = bpm[i]; }
  }
  return { toSec, events, base };
}

export function swingQ(q, amount) {
  if (!amount) return q;
  const b = Math.floor(q + 1e-9);
  const f = q - b;
  const mid = 0.5 + amount;
  return b + (f <= 0.5 ? (f / 0.5) * mid : mid + ((f - 0.5) / 0.5) * (1 - mid));
}

export function applyPerformance({ plan, layers, style, params, rng, tempoMap, timeline, energyAt }) {
  const barQ = plan.meter.barQ;
  const dyn = style.dynamics;
  const moodShift = params.dynamicsShift || 0;
  const swing = style.swing ? style.swing * (plan.qTempo > 170 ? 0.4 : plan.qTempo > 140 ? 0.7 : 1) : 0;

  const phraseOf = (q) => plan.phrases.find((p) => q >= p.startBar * barQ - 1e-6 && q < (p.startBar + p.bars) * barQ) || plan.phrases[plan.phrases.length - 1];


  const layerOffset = { melody: 8, harmony: -12, bass: -5 };
  const out = {};
  for (const [name, notes] of Object.entries(layers)) {
    out[name] = notes.map((n) => {
      const ph = phraseOf(n.startQ);
      const ps = ph.startBar * barQ;
      const t = (n.startQ - ps) / (ph.bars * barQ);
      const e = energyAt(n.startQ);
      let vel = dyn.min + (dyn.max - dyn.min) * e + moodShift;
      vel += dyn.hairpin * (Math.sin(Math.PI * Math.pow(Math.min(1, t), 0.8)) - 0.4);
      const posInBar = ((n.startQ % barQ) + barQ) % barQ;
      const s = metricStrength(plan.meter, posInBar);
      vel += name === 'melody' ? (s - 0.4) * 8 : (s - 0.4) * 10;
      if (style.id === 'jazz' && name === 'harmony' && posInBar % 1 > 0.4) vel += 4;
      vel += layerOffset[name] || 0;
      vel *= n.acc ?? 1;
      if (name === 'melody' && n.cadence && n.cadence !== 'FINAL') vel -= 6;
      vel += rng.gauss(0, style.id === 'minimalist' ? 1.5 : 3.5);
      const velocity = Math.round(Math.max(14, Math.min(122, vel)));

      // Timing: swing, then tempo map, then micro-timing.
      const sq = swingQ(n.startQ, swing);
      const eq = swingQ(n.startQ + n.durQ, swing);
      let time = tempoMap.toSec(sq);
      const end = tempoMap.toSec(eq);
      let micro = rng.gauss(0, style.id === 'minimalist' ? 0.002 : 0.006);
      if (style.rubato >= 0.05 && name === 'melody' && s >= 0.7 && rng.chance(0.3)) micro += 0.018; // melody lags the bass
      time = Math.max(0, time + micro);
      return {
        pitch: n.pitch,
        start: +n.startQ.toFixed(4),
        beats: +n.durQ.toFixed(4),
        perfStart: +sq.toFixed(4),
        perfBeats: +(eq - sq).toFixed(4),
        time: +time.toFixed(4),
        dur: +Math.max(0.05, end - time).toFixed(4),
        velocity,
        ...(n.cadence ? { cadence: n.cadence } : {}),
        ...(n.octave ? { doubling: true } : {}),
        ...(n.echo ? { echo: true } : {}),
        ...(n.cadenza ? { cadenza: true } : {}),
      };
    }).sort((a, b) => a.time - b.time || a.pitch - b.pitch);
  }

  // Chord rolls for Romantic/Ambient block sonorities.
  if (['romantic', 'virtuoso', 'ambient', 'contemporary'].includes(style.id) && out.harmony) {
    const groups = new Map();
    for (const n of out.harmony) {
      const k = n.start.toFixed(3);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(n);
    }
    for (const g of groups.values()) {
      if (g.length < 3 || !rng.chance(0.35)) continue;
      g.sort((a, b) => a.pitch - b.pitch).forEach((n, i) => { n.time = +(n.time + i * 0.018).toFixed(4); });
    }
  }

  // Final chord fermata: let the last sonority ring.
  const lastTime = Math.max(...Object.values(out).flat().map((n) => n.time));
  for (const notes of Object.values(out)) {
    for (const n of notes) if (n.time >= lastTime - 0.12) n.dur = +(n.dur + 1.2 + style.finalRit * 3).toFixed(4);
  }

  const pedal = buildPedal({ plan, style, timeline, tempoMap, swing, out });
  return { layers: out, pedal };
}

function buildPedal({ plan, style, timeline, tempoMap, swing, out }) {
  const events = [];
  const endAll = Math.max(...Object.values(out).flat().map((n) => n.time + n.dur));
  const push = (q0, q1, extend = false) => {
    const t0 = tempoMap.toSec(swingQ(q0, swing));
    const t1 = extend ? endAll : tempoMap.toSec(swingQ(q1, swing));
    if (t1 - t0 > 0.08) events.push({ start: +q0.toFixed(3), end: +q1.toFixed(3), time: +t0.toFixed(4), endTime: +t1.toFixed(4) });
  };
  if (style.pedal === 'none') {
    const last = timeline[timeline.length - 1];
    push(last.startQ + 0.05, last.startQ + last.durQ, true);
    return events;
  }
  // Legato (syncopated) pedalling: release at the chord change, re-press just after.
  let group = [];
  const flush = (isLast) => {
    if (!group.length) return;
    const a = group[0];
    const b = group[group.length - 1];
    push(a.startQ + (style.pedal === 'light' ? 0.15 : 0.08), b.startQ + b.durQ - 0.04, isLast);
    group = [];
  };
  timeline.forEach((e, i) => {
    group.push(e);
    const last = i === timeline.length - 1;
    const longGroup = style.pedal === 'long' ? group.length >= 2 || e.durQ >= plan.meter.barQ * 2 : true;
    if (last || longGroup) flush(last);
  });
  return events;
}
