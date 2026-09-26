// Performance model and exporter shared by both versions of "As We Know It".
// It turns the hand-written score (score.mjs, or the fast version's variant of it) into a
// timed performance — tempo, touch, articulation, pedal — following the flow rules F1–F9
// in RESEARCH.md, writes the audio JSON and the notation JSON, and prints the composer's
// self-checks (golden section, flow, parallels, collisions).

import { writeFileSync } from 'node:fs';

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function midi(name) {
  const m = /^([A-G])(##|#|bb|b)?(\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const acc = { '#': 1, '##': 2, b: -1, bb: -2 }[m[2]] || 0;
  return PC[m[1]] + acc + (Number(m[3]) + 1) * 12;
}
function parseVoice(str) {
  const out = []; let t = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [notes, durS] = tok.split(':');
    const tie = durS.endsWith('-');
    const d = Number(tie ? durS.slice(0, -1) : durS);
    if (notes === 'r') out.push({ start: t, dur: d, rest: true });
    else {
      const parts = notes.split('+').map((p) => { const m = /^([A-G](?:##|#|bb|b)?\d)([~^]*)$/.exec(p); if (!m) throw new Error(`bad token ${tok}`); return { name: m[1], bell: m[2].includes('~'), accent: m[2].includes('^') }; });
      out.push({ start: t, dur: d, names: parts.map((p) => p.name), flags: parts, tie });
    }
    t += d;
  }
  return { events: out, total: t };
}
const VOICES = ['rh', 'rh2', 'lh', 'lh2'];
const smooth = (t) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t)))) / 2;
const CONSONANT_STEP = new Set([3, 4, 5, 7, 8, 9]);

export function perform({ BARS, TEMPO, BREATHS, ARCHES, FINAL_FROM, FINAL_W, CRASH, name, dir, title, subtitle, compTitle, metaTempo, METRO,
  PEAK = CRASH, SKIP = [CRASH - 13, CRASH + 1], KEY = 'C major → F♯ Lydian', keyOf = (a) => (a >= 48 ? 'F♯ Lydian' : 'C'), SECTIONS = null }) {
  const N = BARS.length;
  const parsed = BARS.map((bar, bi) => {
    const v = {};
    for (const voice of VOICES) {
      if (!bar[voice]) continue;
      const p = parseVoice(bar[voice]);
      if (Math.abs(p.total - 8) > 1e-9) throw new Error(`bar ${bi + 1} voice ${voice}: ${p.total} eighths`);
      v[voice] = p.events;
    }
    return v;
  });

  // ── Self-checks ──────────────────────────────────────────────────────────────────────
  // 1. Outer voices: parallel fifths/octaves between melody and bass on every beat with a
  //    left-hand attack (the bass is the lowest note struck in that beat, or still held).
  //    Skipped from stage IV to the grand pause, where doubling is orchestral, not part-writing.
  function outerVoices() {
    const issues = [];
    let prev = null;
    parsed.forEach((v, bi) => {
      if (bi >= SKIP[0] && bi <= SKIP[1]) { prev = null; return; }
      const left = [...(v.lh || []), ...(v.lh2 || [])].filter((e) => !e.rest);
      for (const at of [0, 2, 4, 6]) {
        const struck = left.filter((e) => e.start >= at - 1e-9 && e.start < at + 2 - 1e-9);
        if (!struck.length) continue;
        const held = (v.lh || []).filter((e) => !e.rest && e.start < at - 1e-9 && e.start + e.dur > at + 1e-9);
        const bassP = Math.min(...[...struck, ...held].map((e) => Math.min(...e.names.map(midi))));
        const mel = (v.rh || []).filter((e) => !e.rest && e.start <= at + 1e-9 && e.start + e.dur > at + 1e-9).pop();
        if (!mel) { prev = null; continue; }
        const melP = Math.max(...mel.names.map(midi));
        if (prev && !(prev.mel === melP && prev.bass === bassP)) {
          const mv = melP - prev.mel; const bv = bassP - prev.bass;
          const i1 = ((prev.mel - prev.bass) % 12 + 12) % 12; const i2 = ((melP - bassP) % 12 + 12) % 12;
          if (mv && bv && mv % 12 && bv % 12 && Math.sign(mv) === Math.sign(bv) && i1 === i2 && (i1 === 0 || i1 === 7)) issues.push(`bar ${bi + 1}: parallel ${i1 ? 'fifths' : 'octaves'}`);
        }
        prev = { mel: melP, bass: bassP };
      }
    });
    return issues;
  }
  // 2. No key struck twice at once by two voices; chord spans within reach.
  function collisions() {
    const out = [];
    parsed.forEach((v, bi) => {
      const sounding = [];
      for (const voice of VOICES) for (const e of v[voice] || []) if (!e.rest) for (const n of e.names) sounding.push({ voice, p: midi(n), s: e.start, e: e.start + e.dur });
      for (let i = 0; i < sounding.length; i++) for (let j = i + 1; j < sounding.length; j++) {
        const a = sounding[i]; const b = sounding[j];
        if (a.voice !== b.voice && a.p === b.p && a.s < b.e && b.s < a.e) out.push(`bar ${bi + 1}: ${a.voice}/${b.voice} share ${a.p}`);
      }
      for (const voice of VOICES) for (const e of v[voice] || []) if (!e.rest && e.names.length > 1) {
        const ps = e.names.map(midi); const span = Math.max(...ps) - Math.min(...ps);
        if (span > 16 && bi !== CRASH) out.push(`bar ${bi + 1} ${voice}: chord spans ${span} semitones`);
      }
    });
    return out;
  }

  // ── Tempo: anchors joined by cosine interpolation (F3), phrase arches (F4), breaths
  // centred on the joins (F4), fermata holds, and the final ritardando.
  function baseTempo(pos) {
    if (pos <= TEMPO[0][0]) return TEMPO[0][1];
    for (let i = 0; i < TEMPO.length - 1; i++) {
      const [a, va] = TEMPO[i]; const [b, vb] = TEMPO[i + 1];
      if (pos >= a && pos <= b) return va + (vb - va) * smooth((pos - a) / (b - a));
    }
    return TEMPO[TEMPO.length - 1][1];
  }
  function qpm(pos) {
    let v = baseTempo(pos);
    for (const [s, e] of ARCHES) if (pos > s && pos < e) v *= 1 + 0.025 * Math.sin(Math.PI * (pos - s) / (e - s));
    for (const [at, d] of BREATHS) {
      const before = 0.35; const after = 0.12;
      const x = pos < at ? (pos - (at - before)) / before : 1 - (pos - at) / after;
      if (x > 0 && x <= 1) v *= 1 - d * smooth(x);
    }
    const hold = BARS[Math.min(N - 1, Math.floor(pos))].hold;
    if (hold) v /= hold;
    // Final ritardando (Friberg & Sundberg 1999): v(x) = [1 + (w^q − 1)x]^(1/q), q = 3.
    if (pos >= FINAL_FROM) {
      const x = Math.min(1, (pos - FINAL_FROM) / (N - 1 - FINAL_FROM));
      v *= Math.pow(1 + (FINAL_W ** 3 - 1) * x, 1 / 3);
    }
    return v;
  }
  // Integrate time over the score in 1/64-bar steps.
  const STEPS = 64;
  const secAt = [0];
  for (let i = 1; i <= N * STEPS; i++) secAt.push(secAt[i - 1] + (4 * 60) / qpm((i - 0.5) / STEPS) / STEPS);
  const toSec = (pos) => { const x = pos * STEPS; const i = Math.min(secAt.length - 2, Math.floor(x)); return secAt[i] + (secAt[i + 1] - secAt[i]) * (x - i); };
  const posOf = (bi, eighth) => bi + eighth / 8;

  // Dynamics: bar anchors joined linearly (continuous hairpins, F5); "subito" bars step.
  function dynAt(pos) {
    const bi = Math.min(N - 1, Math.floor(pos));
    const a = BARS[bi].dyn; const nb = BARS[bi + 1];
    if (!nb || nb.subito || nb.gp || BARS[bi].gp) return a;
    return a + (nb.dyn - a) * (pos - bi);
  }

  let seed = 20260926;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  // Resolve ties: merge each tied event with the next event of the same voice.
  const flat = {};
  for (const voice of VOICES) {
    flat[voice] = [];
    parsed.forEach((v, bi) => { for (const ev of v[voice] || []) flat[voice].push({ ...ev, bi }); });
    const list = flat[voice];
    for (let i = 0; i < list.length; i++) {
      const ev = list[i];
      if (!ev.tie || ev.rest) continue;
      const nx = list[i + 1];
      ev.tieExtra = 0;
      if (nx && !nx.rest) { ev.tieExtra = nx.dur; nx.tiedFrom = true; }
    }
  }

  const layers = { melody: [], harmony: [], bass: [] };
  const notation = [];
  for (const voice of VOICES) {
    const list = flat[voice];
    list.forEach((ev, idx) => {
      const bar = BARS[ev.bi];
      const onsetPos = posOf(ev.bi, ev.start);
      const rolled = !!(bar.roll && !ev.rest && ev.start === 0);
      notation.push({ bar: ev.bi, voice, start: ev.start, dur: ev.dur, names: ev.names || null, rest: !!ev.rest, fermata: !!bar.fermata && ev.start + ev.dur >= 8 - 1e-9, arp: rolled, tieStart: !!ev.tie, tieStop: !!ev.tiedFrom, flags: ev.flags ? ev.flags.map((f) => ({ bell: f.bell, accent: f.accent })) : null });
      if (ev.rest || ev.tiedFrom) return;
      const role = voice === 'rh' ? 'melody' : voice === 'rh2' ? 'inner' : voice === 'lh' ? 'bass' : 'figuration';
      const dyn = dynAt(onsetPos);
      const endPos = posOf(ev.bi, ev.start + ev.dur + (ev.tieExtra || 0));
      const tOn = toSec(onsetPos); const tEnd = toSec(endPos);
      const next = list[idx + 1];
      ev.names.forEach((nm, k) => {
        const p = midi(nm);
        const top = p === Math.max(...ev.names.map(midi));
        let vel = dyn;
        // Metrical accent (Drake & Palmer 1993): downbeat > half-bar > other beats.
        vel += ev.start === 0 ? 3 : ev.start === 4 ? 1.5 : ev.start % 2 === 0 ? 0.5 : 0;
        if (role === 'melody') vel += top ? 10 + Math.max(0, p - 72) * 0.2 : -9;
        if (role === 'inner') vel -= 11;
        if (role === 'bass') vel -= ev.dur <= 0.5 ? 12 : ev.start % 1 === 0 && ev.start % 2 === 1 ? 14 : 4;
        if (role === 'figuration') vel -= 15;
        // Grouping accents (F8): the first note of each 3+3+2 group — in eighths (group)
        // or in sixteenths (group16) — the limping clock, and the new world's sway.
        if (role === 'bass' || role === 'figuration') {
          for (const [g, unit] of [[bar.group, 1], [bar.group16, 0.5]]) {
            if (!g) continue;
            let acc = 0; for (const n of g) { if (Math.abs(ev.start - acc) < 1e-9) vel += unit === 1 ? 7 : 6; acc += n * unit; }
          }
        }
        if (ev.flags[k].accent) vel += 10;
        if (ev.flags[k].bell) vel = Math.max(34, dyn - 2);
        vel += (rnd() - 0.5) * 3;
        const velocity = Math.round(Math.max(12, Math.min(126, vel)));
        let t = tOn;
        // Melody lead (Goebl 2001; Palmer 1996): velocity-linked, ≤ 20 ms.
        if (role === 'melody' && top && !ev.flags[k].bell) t -= Math.min(0.02, Math.max(0, (velocity - dyn) * 0.0012));
        if (rolled) t += (bar.final || ev.bi === N - 2 ? ['lh', 'rh2', 'rh'].indexOf(voice) * 3 + k : k) * 0.07;
        let dur = tEnd - t;
        // Legato (F6; Repp 1997; Bresin & Battel 2000): key overlap into the next melody note,
        // proportionally larger for short notes, longer for high notes and consonant steps.
        if (role === 'melody' && next && !next.rest && Math.abs(next.start + (next.bi - ev.bi) * 8 - (ev.start + ev.dur + (ev.tieExtra || 0))) < 1e-9) {
          const ioi = tEnd - tOn;
          let kot = Math.max(0.018, Math.min(0.075, 0.012 + 0.06 * ioi));
          const step = Math.abs(Math.max(...next.names.map(midi)) - p);
          if (p >= 72 && CONSONANT_STEP.has(step)) kot += 0.012;
          dur += kot;
        } else if (role === 'melody' && next && next.rest) {
          dur -= 0.05; // a breath before a written rest, nothing more
        }
        if (role === 'figuration' || (role === 'bass' && ev.dur <= 1)) dur += 0.02;
        if (endPos >= N - 1e-9) dur += 3.5; // the last chord is held, then released
        const layer = role === 'melody' ? 'melody' : role === 'bass' ? 'bass' : 'harmony';
        layers[layer].push({ pitch: p, time: +Math.max(0, t).toFixed(4), dur: +Math.max(0.06, dur).toFixed(4), velocity, start: +(onsetPos * 4).toFixed(4), beats: +((endPos - onsetPos) * 4).toFixed(4), perfStart: +Math.max(0, t).toFixed(4), perfBeats: +Math.max(0.06, dur).toFixed(4) });
      });
    });
  }
  for (const l of Object.values(layers)) l.sort((a, b) => a.time - b.time);

  // Pedal (F7): legato ("syncopated") pedalling — the damper lifts just after each new
  // harmony is struck and falls back ~80 ms later, so harmonies are joined, never separated.
  const pedalOut = [];
  let open = null;
  BARS.forEach((bar, bi) => {
    if (bar.gp) return;
    bar.h.forEach(([off]) => {
      const t = toSec(posOf(bi, off));
      if (open) open.endTime = +(t + 0.02).toFixed(4);
      open = { time: +(t + (bi === CRASH ? 0.03 : 0.1)).toFixed(4), endTime: null };
      pedalOut.push(open);
    });
    // The crash is held into the grand pause, then the dampers fall: silence.
    if (bi === CRASH) { open.endTime = +toSec(posOf(CRASH + 1, 1.5)).toFixed(4); open = null; }
  });
  const end = Math.max(...Object.values(layers).flat().map((n) => n.time + n.dur));
  open.endTime = +end.toFixed(3);

  SECTIONS ||= [['I · The known world', 0, 10], ['II · Omen', 10, 18], ['III · Unease', 18, 26], ['IV · Unravelling', 26, 33], ['V · Collapse', 33, 40], ['Grand pause', 40, 41], ['VI · Aftermath', 41, 48], ['VII · The new world', 48, 60]];
  const comp = {
    title: compTitle,
    meta: { style: 'contemporary', styleLabel: 'Tone poem', key: KEY, tonic: 0, mode: 'major', tempo: metaTempo, quarterTempo: metaTempo, timeSignature: [4, 4], duration: +end.toFixed(2), bars: N, flats: false, mood: 'hand-composed' },
    sections: SECTIONS.map(([sec, a, b]) => ({ name: sec, type: 'section', startBar: a, bars: b - a, startTime: +toSec(a).toFixed(3), endTime: +toSec(b).toFixed(3), key: keyOf(a) })),
    chords: BARS.flatMap((bar, bi) => bar.h.map(([o, sym], k) => ({ symbol: sym, time: +toSec(posOf(bi, o)).toFixed(3), dur: +(toSec(posOf(bi, bar.h[k + 1]?.[0] ?? 8)) - toSec(posOf(bi, o))).toFixed(3), roman: '' }))),
    bars: BARS.map((_, i) => +toSec(i).toFixed(3)),
    layers, pedal: pedalOut, tempoMap: [{ q: 0, bpm: 60 }],
  };

  const here = (f) => new URL(f, dir);
  writeFileSync(here(`./${name}.json`), JSON.stringify(comp));
  writeFileSync(here(`./${name}_notation.json`), JSON.stringify({
    title, subtitle,
    bars: BARS.map((b, i) => ({ dm: b.dm || null, marks: b.marks || [], marksAt: b.marksAt || null, wedge: b.wedge || null, fermata: !!b.fermata, key: b.key ?? null, group: b.group || null, group16: b.group16 || null, gp: !!b.gp, metro: METRO[i] ?? null })),
    notes: notation,
  }));

  const counts = Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.length]));
  const peak = toSec(PEAK);
  const soundingEnd = toSec(N);
  console.log(`${title}${name.endsWith('fast') ? ' (fast)' : ''}: ${N} bars, ${soundingEnd.toFixed(1)} s notated (+ ring ${(end - soundingEnd).toFixed(1)} s), notes ${JSON.stringify(counts)}`);
  console.log(`Peak (bar ${PEAK + 1}) at ${peak.toFixed(1)} s = ${(100 * peak / soundingEnd).toFixed(1)} % of the piece (golden section 61.8 %)`);
  for (const [sec, a, b] of SECTIONS) console.log(`  ${sec.padEnd(22)} ${toSec(a).toFixed(1).padStart(6)} – ${toSec(b).toFixed(1).padStart(6)} s`);
  // Flow check: the largest change in local tempo between adjacent steps (excluding the
  // steps across the crash and the grand pause, which happen in silence).
  let worst = [0, 0];
  for (let i = 1; i < N * STEPS; i++) {
    const pos = i / STEPS; if (pos > CRASH - 0.01 && pos < CRASH + 2.03) continue;
    const j = Math.abs(qpm(pos) / qpm(pos - 1 / STEPS) - 1); if (j > worst[0]) worst = [j, pos];
  }
  console.log(`Flow: largest tempo change between adjacent 1/64-bar steps ${(worst[0] * 100).toFixed(2)} % (bar ${Math.floor(worst[1]) + 1})`);
  const pv = outerVoices();
  console.log(pv.length ? `Outer voices: ${pv.join('; ')}` : 'Outer voices: no parallel fifths/octaves between melody and bass');
  const col = collisions();
  console.log(col.length ? `Collisions/spans: ${col.join('; ')}` : 'Voices: no shared keys, chord spans within reach');
  return { comp, peak, soundingEnd };
}
