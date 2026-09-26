// "Rhapsody in D♭ major" — hand-composed in the style of Liszt.
// Every melody note, chord and bar-level dynamic/tempo decision below is written out by hand;
// the helpers only realise the left-hand figuration (arpeggio/tremolo) from the written chords.
//
// Form (40 bars, 4/4):
//   1–3   Preludio      pp, rolled chords, recitative line, small rising flourish
//   4–11  Theme          dolce cantabile over triplet arpeggios (period: HC bar 7, PAC bar 11)
//   12–19 Theme again    fuller 16ths, varied melody, pivots through E7 to A major (♭VI)
//   20–25 Agitato        head motif climbs by minor thirds A→C→E♭→G♭ over tremolo, stringendo,
//                        then falls in octaves through E♭m7 and a diminished seventh
//   26    Cadenza        free run over A♭7(♭9), fermata
//   27–34 Grandioso      the theme transformed: an octave higher, in octaves with full chords,
//                        sweeping 16ths, largamente, fff
//   35–40 Coda           dolcissimo reminiscence, minor-plagal colour (G♭m/D♭), rising arpeggio, ppp

import { writeFileSync } from 'node:fs';

const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, Bbb: 9, Bb: 10, B: 11, Cb: 11 };
const n = (s) => { const m = /^([A-G](?:#|b|bb)?)(-?\d)$/.exec(s); return PC[m[1]] + (Number(m[2]) + 1) * 12; };
const CH = {
  Db: [1, 5, 8], Bbm7: [10, 1, 5, 8], Gb: [6, 10, 1], Gbm: [6, 9, 1], Ab7: [8, 0, 3, 6], Gdim7: [7, 10, 1, 4],
  E7: [4, 8, 11, 2], A: [9, 1, 4], C: [0, 4, 7], Eb: [3, 7, 10], Ebm7: [3, 6, 10, 1], Ab7b9: [8, 0, 3, 6, 9],
};

// ---- melody: [pitch | null(rest), beats] per bar -------------------------------------
const THEME = [
  [['Ab4', 1], ['Db5', 1.5], ['C5', 0.5], ['Db5', 1]],
  [['F5', 2], ['Eb5', 1], ['Db5', 1]],
  [['Db5', 1.5], ['Bb4', 0.5], ['Bbb4', 1], ['Gb4', 1]],
  [['Eb5', 2], ['Db5', 1], ['C5', 1]],
  [['Db5', 1], ['F5', 1], ['Ab5', 1.5], ['Gb5', 0.5]],
  [['Bb5', 2], ['Ab5', 0.5], ['Gb5', 0.5], ['Fb5', 1]],
  [['F5', 1.5], ['Eb5', 0.5], ['Db5', 1], ['C5', 1]],
  [['Db5', 4]],
];
const THEME2 = [
  [['Ab4', 1], ['Db5', 1.5], ['C5', 0.5], ['Db5', 0.5], ['Eb5', 0.5]],
  [['F5', 1.5], ['Gb5', 0.5], ['F5', 0.5], ['Eb5', 0.5], ['Db5', 1]],
  [['Db5', 1.5], ['Bb4', 0.5], ['Bbb4', 1], ['Gb4', 0.5], ['Bbb4', 0.5]],
  [['Eb5', 2], ['Db5', 1], ['C5', 1]],
  [['Db5', 1], ['F5', 1], ['Ab5', 1.5], ['Gb5', 0.5]],
  [['Bb5', 2], ['Ab5', 0.5], ['Gb5', 0.5], ['Fb5', 1]],
  [['F5', 1.5], ['Eb5', 0.5], ['E5', 1], ['D5', 1]], // pivot: E7 (enharmonic F♭7)
  [['C#5', 4]], // arrives in A major
];
const up = (bars, k) => bars.map((b) => b.map(([p, d]) => [p === null ? null : p + k, d]));
const mel = (bars) => bars.map((b) => b.map(([p, d]) => [p === null ? null : typeof p === 'number' ? p : n(p), d]));

const BARS = [
  // Preludio
  { chords: [[0, 'Db', 'Db2']], mel: [[null, 1], ['F5', 1.5], ['Eb5', 0.5], ['Db5', 1]], tex: 'roll', vel: 36, tempo: 0.86 },
  { chords: [[0, 'Gbm', 'Db2']], mel: [['C5', 1], ['Db5', 1], ['Bbb4', 2]], tex: 'roll', vel: 40, tempo: 0.84 },
  { chords: [[0, 'Ab7', 'Ab1']], mel: [['Eb4', 0.25], ['Ab4', 0.25], ['C5', 0.25], ['Eb5', 0.25], ['Gb5', 0.25], ['Ab5', 0.25], ['C6', 0.25], ['Ab5', 0.5], ['Gb5', 0.5], ['Eb5', 0.5], ['C5', 0.75]], tex: 'roll', vel: 44, tempo: 0.78, run: true },
  // Theme (4–11)
  ...mel(THEME).map((m, i) => ({ mel: m, tex: 'trip', vel: [50, 54, 56, 58, 56, 62, 58, 50][i], tempo: 1 })),
  // Theme again (12–19)
  ...mel(THEME2).map((m, i) => ({ mel: m, tex: 'six', vel: [56, 60, 62, 66, 66, 72, 70, 64][i], tempo: 1.03 })),
  // Agitato (20–25)
  { chords: [[0, 'A', 'A1']], mel: mel([[['E5', 1], ['A5', 1.5], ['G#5', 0.5], ['A5', 1]]])[0], tex: 'trem', vel: 70, tempo: 1.05 },
  { chords: [[0, 'C', 'C2']], mel: mel([[['G5', 1], ['C6', 1.5], ['B5', 0.5], ['C6', 1]]])[0], tex: 'trem', vel: 79, tempo: 1.08 },
  { chords: [[0, 'Eb', 'Eb2']], mel: mel([[['Bb5', 1], ['Eb6', 1.5], ['D6', 0.5], ['Eb6', 1]]])[0], tex: 'trem', vel: 88, tempo: 1.11 },
  { chords: [[0, 'Gb', 'Gb1']], mel: mel([[['Db6', 1], ['Gb6', 1.5], ['F6', 0.5], ['Gb6', 1]]])[0], tex: 'trem', vel: 98, tempo: 1.12, oct: true },
  { chords: [[0, 'Ebm7', 'Gb1']], mel: mel([[['Gb6', 1], ['F6', 0.5], ['Eb6', 0.5], ['Db6', 1], ['Bb5', 1]]])[0], tex: 'trem', vel: 104, tempo: 1.02, oct: true },
  { chords: [[0, 'Gdim7', 'G1']], mel: mel([[['Fb6', 1.5], ['Db6', 0.5], ['Bb5', 1], ['G5', 1]]])[0], tex: 'trem', vel: 100, tempo: 0.9, oct: true },
  // Cadenza (26)
  { chords: [[0, 'Ab7b9', 'Ab1']], mel: [], tex: 'fermata', vel: 104, tempo: 0.46, cadenza: true },
  // Grandioso (27–34): the theme transformed
  ...up(mel(THEME), 12).map((m, i) => ({ mel: m, tex: 'sweep', vel: [110, 112, 108, 112, 112, 118, 110, 100][i], tempo: [0.9, 0.93, 0.93, 0.88, 0.92, 0.9, 0.84, 0.8][i], oct: true, grand: true })),
  // Coda (35–40)
  { chords: [[0, 'Db', 'Db2']], mel: mel([[['Ab5', 1], ['Db6', 1.5], ['C6', 0.5], ['Db6', 1]]])[0], tex: 'trip', vel: 46, tempo: 0.92 },
  { chords: [[0, 'Gbm', 'Db2']], mel: mel([[['C6', 1], ['Db6', 1], ['Bbb5', 2]]])[0], tex: 'trip', vel: 42, tempo: 0.9 },
  { chords: [[0, 'Db', 'Db2']], mel: mel([[['F5', 2], ['Eb5', 1], ['Db5', 1]]])[0], tex: 'trip', vel: 40, tempo: 0.88 },
  { chords: [[0, 'Gbm', 'Db2']], mel: mel([[['Bbb4', 2], ['Ab4', 2]]])[0], tex: 'trip', vel: 36, tempo: 0.84 },
  { chords: [[0, 'Db', 'Db2']], mel: mel([[['Db5', 4]]])[0], tex: 'rising', vel: 32, tempo: 0.78 },
  { chords: [[0, 'Db', 'Db1']], mel: [], tex: 'final', vel: 30, tempo: 0.62 },
];

// Harmony for the theme bars (same progression for statement, restatement and grandioso).
const THEME_CH = [
  [[0, 'Db', 'Db2']], [[0, 'Bbm7', 'Bb1']], [[0, 'Gb', 'Gb2'], [2, 'Gbm', 'Gb2']], [[0, 'Ab7', 'Ab2']],
  [[0, 'Db', 'F2']], [[0, 'Gb', 'Gb2'], [2, 'Gdim7', 'G2']], [[0, 'Db', 'Ab2'], [2, 'Ab7', 'Ab1']], [[0, 'Db', 'Db2']],
];
const THEME2_CH = THEME_CH.slice(0, 6).concat([[[0, 'Db', 'Ab2'], [2, 'E7', 'E2']], [[0, 'A', 'A1']]]);
for (let i = 0; i < 8; i++) {
  BARS[3 + i].chords = THEME_CH[i];
  BARS[11 + i].chords = THEME2_CH[i];
  BARS[26 + i].chords = THEME_CH[i];
}

// ---- realisation --------------------------------------------------------------------
const melody = []; const harmony = []; const bass = []; const pedal = [];
let rs = 7;
const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };
const hum = (v) => Math.round(Math.max(12, Math.min(124, v + (rnd() - 0.5) * 6)));
const tonesIn = (pcs, lo, hi) => { const o = []; for (let p = lo; p <= hi; p++) if (pcs.includes(p % 12)) o.push(p); return o; };
const ladder = (pcs, from, top, gap = 3) => { const o = []; let last = from; for (const p of tonesIn(pcs, from + 5, top)) if (p - last >= (o.length < 2 ? 5 : gap)) { o.push(p); last = p; } return o; };

BARS.forEach((bar, bi) => {
  const q0 = bi * 4;
  // Melody (+ octave doubling and grandioso inner chord tones).
  let t = q0;
  bar.mel.forEach(([p0, d], k) => {
    const p = typeof p0 === 'string' ? n(p0) : p0;
    if (p !== null) {
      const hairpin = Math.sin(Math.PI * Math.min(1, (k + 0.5) / Math.max(1, bar.mel.length))) * 4;
      const v = bar.vel + 10 + hairpin + (t === q0 ? 3 : 0);
      melody.push({ q: t, d, p, v: hum(v), run: bar.run && d <= 0.25 });
      if (bar.oct) melody.push({ q: t, d, p: p - 12, v: hum(v - 12) });
      if (bar.grand && d >= 1) {
        const [, name] = bar.chords.filter(([o]) => o <= t - q0).pop();
        for (const c of tonesIn(CH[name], p - 11, p - 2).filter((c) => c % 12 !== p % 12).slice(-2)) harmony.push({ q: t, d, p: c, v: hum(v - 24) });
      }
    }
    t += d;
  });

  // Accompaniment per chord.
  bar.chords.forEach(([off, name, bn], ci) => {
    const pcs = CH[name];
    const s = q0 + off;
    const e = q0 + (bar.chords[ci + 1]?.[0] ?? 4);
    const b = n(bn);
    const av = bar.vel;
    pedal.push({ q: s + 0.12, e: e - 0.03 });
    if (bar.tex === 'roll' || bar.tex === 'final') {
      const chord = [b, b + 12, ...tonesIn(pcs, b + 16, bar.tex === 'final' ? 80 : 68).filter((_, i) => i % 1 === 0).slice(0, bar.tex === 'final' ? 7 : 4)];
      chord.forEach((p, i) => (i === 0 ? bass : harmony).push({ q: s + i * 0.09, d: e - s - i * 0.09, p, v: hum(av - 6 - i) }));
      return;
    }
    bass.push({ q: s, d: e - s, p: b, v: hum(av - 2) });
    if (bar.tex === 'sweep' && b - 12 >= 21) bass.push({ q: s, d: e - s, p: b - 12, v: hum(av - 8) });
    if (bar.tex === 'trip' || bar.tex === 'six' || bar.tex === 'sweep') {
      const step = bar.tex === 'trip' ? 1 / 3 : 0.25;
      const top = bar.tex === 'trip' ? 64 : bar.tex === 'six' ? 65 : 67;
      const L = ladder(pcs, b, top);
      const seq = L.concat(L.slice(1, -1).reverse());
      for (let i = 1, x = s + step; x < e - 1e-6; i++, x += step) {
        const p = seq[(i - 1) % seq.length];
        harmony.push({ q: x, d: Math.min(e - x, step * 3), p, v: hum(av * 0.72 - 6 + (p === L[L.length - 1] ? 5 : 0)) });
      }
    } else if (bar.tex === 'trem') {
      if (b - 12 >= 21) bass.push({ q: s, d: e - s, p: b - 12, v: hum(av - 6) });
      const mid = tonesIn(pcs, 55, 72);
      const lo = mid.slice(0, 2); const hi = mid.slice(2, 4);
      for (let i = 0, x = s; x < e - 1e-6; i++, x += 0.25) (i % 2 ? hi : lo).forEach((p) => harmony.push({ q: x, d: 0.27, p, v: hum(av * 0.7 - 4) }));
    } else if (bar.tex === 'rising') {
      tonesIn(pcs, 49, 97).forEach((p, i, arr) => harmony.push({ q: s + 0.5 + i * (2.6 / arr.length), d: e - s, p, v: hum(av - 4 - i * 0.6) }));
      [n('Ab2'), n('F3'), n('Ab3')].forEach((p) => harmony.push({ q: s, d: e - s, p, v: hum(av - 8) }));
    } else if (bar.tex === 'fermata') {
      // Cadenza bar: A♭ octave + A♭7(♭9) struck once; the run is written below.
      bass.push({ q: s, d: 4, p: b + 12, v: hum(av - 4) });
      [n('Eb3'), n('Gb3'), n('C4'), n('Bbb4')].forEach((p, i) => harmony.push({ q: s + i * 0.05, d: 4, p, v: hum(av - 14) }));
      // Down from the top through the diminished-seventh-over-A♭, then up into the grandioso theme.
      const down = tonesIn(pcs, 60, 93).reverse();
      const rise = tonesIn(pcs, 63, 78);
      const run = down.concat(rise);
      const a = 0.55; const pos = (x) => x - (a * Math.sin(2 * Math.PI * x)) / (2 * Math.PI);
      run.forEach((p, i) => {
        const x0 = s + 0.35 + 3.5 * pos(i / run.length);
        const x1 = s + 0.35 + 3.5 * pos((i + 1) / run.length);
        const shade = i < down.length ? 108 - (i / down.length) * 40 : 70 + ((i - down.length) / rise.length) * 34;
        melody.push({ q: x0, d: x1 - x0, p, v: hum(shade), run: true });
      });
    }
  });
});

// ---- tempo map (per-bar tempo × phrase rubato), then seconds -------------------------
const BASE = 63;
const barTempo = BARS.map((b) => b.tempo);
const tempoAt = (q) => {
  const bi = Math.min(BARS.length - 1, Math.floor(q / 4));
  let f = barTempo[bi];
  const inPhrase = ((bi >= 3 && bi < 19) || (bi >= 26 && bi < 34)) ? ((bi - (bi >= 26 ? 26 : 3)) % 4) * 4 + (q % 4) : null;
  if (inPhrase !== null) {
    const x = inPhrase / 16;
    f *= 1 + 0.06 * Math.sin(Math.PI * x) - 0.14 * Math.max(0, (x - 0.85) / 0.15) ** 2; // push, then yield at the cadence
  }
  if (bi === BARS.length - 1) f *= 1 - 0.35 * (q % 4) / 4;
  return BASE * f;
};
const RES = 1 / 32;
const secs = [0];
const totalQ = BARS.length * 4;
for (let i = 1; i <= totalQ / RES; i++) secs.push(secs[i - 1] + (RES * 60) / tempoAt((i - 0.5) * RES));
const toSec = (q) => { const x = q / RES; const i = Math.min(secs.length - 2, Math.floor(x)); return secs[i] + (secs[i + 1] - secs[i]) * (x - i); };

const perform = (arr, lag) => arr.map((o) => {
  const start = toSec(o.q) + (lag && !o.run && Math.abs(o.q % 1) < 1e-6 ? 0.016 : 0);
  const end = toSec(o.q + o.d);
  return { pitch: o.p, start: +o.q.toFixed(4), beats: +o.d.toFixed(4), time: +start.toFixed(4), dur: +Math.max(0.06, end - start).toFixed(4), velocity: o.v, perfStart: +start.toFixed(4), perfBeats: +Math.max(0.06, end - start).toFixed(4), ...(o.run ? { cadenza: true } : {}) };
}).sort((a, b) => a.time - b.time);

const layers = { melody: perform(melody, true), harmony: perform(harmony, false), bass: perform(bass, false) };
// Final chord rings: extend the last sonority, hold the pedal to the end.
const lastT = Math.max(...layers.harmony.map((x) => x.time));
for (const l of Object.values(layers)) for (const x of l) if (x.time > toSec((BARS.length - 1) * 4) - 0.1) x.dur += 3;
const end = Math.max(...Object.values(layers).flat().map((x) => x.time + x.dur));
const ped = pedal.map((p) => ({ time: +toSec(p.q).toFixed(4), endTime: +toSec(p.e).toFixed(4) }));
ped[ped.length - 1].endTime = +end.toFixed(3);

const sectionDefs = [['Preludio', 0, 3], ['Theme — dolce cantabile', 3, 11], ['Theme — più mosso, to A major', 11, 19], ['Agitato — rising by minor thirds', 19, 25], ['Cadenza', 25, 26], ['Grandioso — theme transformed', 26, 34], ['Coda — dolcissimo', 34, 40]];
const comp = {
  title: 'Rhapsody in D♭ major (hand-composed, after Liszt)',
  meta: { style: 'virtuoso', styleLabel: 'Romantic virtuoso', key: 'D♭ major', tonic: 1, mode: 'major', tempo: BASE, quarterTempo: 60, timeSignature: [4, 4], duration: +end.toFixed(2), bars: BARS.length, flats: true, mood: 'emotional' },
  sections: sectionDefs.map(([name, a, b]) => ({ name, type: 'section', startBar: a, bars: b - a, startTime: +toSec(a * 4).toFixed(3), endTime: +toSec(b * 4).toFixed(3), key: 'D♭ major' })),
  chords: BARS.flatMap((bar, bi) => bar.chords.map(([o, name], ci) => ({ symbol: name.replace('b9', '(♭9)').replace('dim7', '°7').replace('b', '♭').replace('#', '♯'), time: +toSec(bi * 4 + o).toFixed(3), dur: +(toSec(bi * 4 + (bar.chords[ci + 1]?.[0] ?? 4)) - toSec(bi * 4 + o)).toFixed(3), roman: '' }))),
  bars: BARS.map((_, i) => +toSec(i * 4).toFixed(3)),
  layers, pedal: ped,
  tempoMap: [{ q: 0, bpm: 60 }], // performance times are exported directly (1 beat = 1 s)
};
writeFileSync(new URL('./liszt_rhapsody.json', import.meta.url), JSON.stringify(comp));
console.log(`${comp.title}: ${BARS.length} bars, ${comp.meta.duration}s, notes`, Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.length])), 'last harmony', lastT.toFixed(1));
