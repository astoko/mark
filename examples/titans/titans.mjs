// TITANS — an epic for piano (Maestoso)
// Composed by hand, note by note; the code only performs it (see ../as-we-know-it/perform.mjs).
//
// Built like a film-score cue, then written for ten fingers:
//   • a HORN THEME — C, D, E♭, G, then a leap to the high C that falls back step by step;
//     it is heard first as distant bells, then sung, then in octaves, then at full force;
//   • STRINGS — repeated-chord pulses and sixteenth ostinatos keep the floor moving;
//   • a MEDIANT CYCLE for the awe moment — E major, C, A♭, E (major thirds), chords that
//     belong to no key, over two-octave sweeps — then F minor, D♭, A♭ and a G7 crash;
//   • SILENCE, a tremolo that climbs from G to A, a rising run, and the theme a whole step
//     higher, in D minor, tutta forza;
//   • the HEROIC CADENCE — B♭, C, D major (♭VI–♭VII–I) pounded out, a cascade across the
//     keyboard, the minor plagal Gm/D → D, the cadence again, one held silence, the last
//     chord.
//
// FORM (46 bars, 4/4, C minor → D minor → D major)
//   1–4    Prologue      low tremolo, the theme as distant bells
//   5–12   Theme         sung in the middle of the piano over string pulses
//   13–20  Theme in octaves, f, sixteenth ostinato
//   21–28  The cycle     E – C – A♭ – E | Fm – D♭ – A♭/C | G7 crash
//   29–30  Breath        silence, tremolo G → A, the run
//   31–38  Titans        the theme in D minor, fff
//   39–42  Ascent        B♭ – C – D major, the cascade
//   43–46  Finale        Gm/D → D, B♭ C D, silence, the last chord

import { perform } from '../as-we-know-it/perform.mjs';

const s16 = (arr) => arr.map((n) => `${n}:0.5`).join(' ');
const trem = (a, b, eighths) => s16(Array.from({ length: eighths * 2 }, (_, i) => (i % 2 ? b : a)));
const pulse = (ch, n = 8) => Array(n).fill(`${ch}:1`).join(' ');
const fig = (a, b, c) => s16([a, b, c, b, a, b, c, b, a, b, c, b, a, b, c, b]);
const fig2 = (x, y) => s16([x[0], x[1], x[2], x[1], x[0], x[1], x[2], x[1], y[0], y[1], y[2], y[1], y[0], y[1], y[2], y[1]]);
const sweep = (n8) => s16([...n8, ...[...n8].reverse()]);

// The theme (C minor).
const T = [
  'C5:3 D5:1 Eb5:2 G5:2',
  'C6:6 Bb5:1 Ab5:1',
  'G5:3 F5:1 Eb5:2 D5:2',
  'C5:6 G4:2',
  'C5:3 D5:1 Eb5:2 G5:2',
  'Bb5:6 Ab5:1 G5:1',
  'Ab5:3 G5:1 F5:2 Eb5:2',
  'C5:4 B4:4',
];
const TH = [[[0, 'Cm']], [[0, 'A♭']], [[0, 'B♭']], [[0, 'Cm']], [[0, 'Cm']], [[0, 'E♭/G']], [[0, 'A♭']], [[0, 'Gsus4'], [4, 'G']]];
const PULSE = [
  ['C1+C2:8', pulse('Eb3+G3+C4')], ['Ab1+Ab2:8', pulse('Eb3+Ab3+C4')], ['Bb1+Bb2:8', pulse('D3+F3+Bb3')], ['C1+C2:8', pulse('Eb3+G3+C4')],
  ['C1+C2:8', pulse('Eb3+G3+C4')], ['G1+G2:8', pulse('Eb3+G3+Bb3')], ['Ab1+Ab2:8', pulse('Eb3+Ab3+C4')], ['G1+G2:8', `${pulse('C3+D3+G3', 4)} ${pulse('B2+D3+G3', 4)}`],
];
// The theme in octaves (A′).
const T2 = [
  'C5+C6:3 D5+D6:1 Eb5+G5+Eb6:2 G5+G6:2',
  'C6+Eb6+C7:6 Bb5+Bb6:1 Ab5+Ab6:1',
  'G5+G6:3 F5+F6:1 Eb5+Eb6:2 D5+F5+D6:2',
  'C5+Eb5+C6:6 G4+G5:2',
  'C5+C6:3 D5+D6:1 Eb5+G5+Eb6:2 G5+G6:2',
  'Bb5+Eb6+Bb6:6 Ab5+Ab6:1 G5+G6:1',
  'Ab5+C6+Ab6:3 G5+G6:1 F5+F6:2 Eb5+Ab5+Eb6:2',
  'C5+D5+G5+C6:4 B4+D5+G5+B5:4',
];
const OST = [
  ['C1+C2:4 C1+C2:4', fig('C3', 'G3', 'Eb4')], ['Ab1+Ab2:4 Ab1+Ab2:4', fig('C3', 'Ab3', 'Eb4')], ['Bb1+Bb2:4 Bb1+Bb2:4', fig('D3', 'Bb3', 'F4')],
  ['C1+C2:4 C1+C2:4', fig('C3', 'G3', 'Eb4')], ['C1+C2:4 C1+C2:4', fig('C3', 'G3', 'Eb4')], ['G1+G2:4 G1+G2:4', fig('Bb2', 'G3', 'Eb4')],
  ['Ab1+Ab2:4 Ab1+Ab2:4', fig('C3', 'Ab3', 'Eb4')], ['G1+G2:4 G1+G2:4', fig2(['D3', 'G3', 'C4'], ['D3', 'G3', 'B3'])],
];
// The theme in D minor, tutta forza.
const T3 = [
  'D5+F5+D6:3 E5+E6:1 F5+A5+F6:2 A5+D6+A6:2',
  'D6+F6+D7:6 C6+C7:1 Bb5+Bb6:1',
  'A5+C6+A6:3 G5+G6:1 F5+F6:2 E5+G5+E6:2',
  'D5+F5+A5+D6:6 A4+A5:2',
  'D5+F5+D6:3 E5+E6:1 F5+A5+F6:2 A5+D6+A6:2',
  'C6+F6+C7:6 Bb5+Bb6:1 A5+A6:1',
  'Bb5+D6+Bb6:3 A5+A6:1 G5+G6:2 F5+Bb5+F6:2',
  'D5+E5+A5+D6:4 C#5+E5+A5+C#6:4',
];
const T3H = [[[0, 'Dm']], [[0, 'B♭']], [[0, 'C']], [[0, 'Dm']], [[0, 'Dm']], [[0, 'F/A']], [[0, 'B♭']], [[0, 'Asus4'], [4, 'A']]];
const T3L = [
  ['D1+D2:2 D1+D2:2 D1+D2:2 D1+D2:2', pulse('A2+D3+F3')], ['Bb0+Bb1:2 Bb0+Bb1:2 Bb0+Bb1:2 Bb0+Bb1:2', pulse('Bb2+D3+F3')],
  ['C1+C2:2 C1+C2:2 C1+C2:2 C1+C2:2', pulse('G2+C3+E3')], ['D1+D2:2 D1+D2:2 D1+D2:2 D1+D2:2', pulse('A2+D3+F3')],
  ['D1+D2:2 D1+D2:2 D1+D2:2 D1+D2:2', pulse('A2+D3+F3')], ['A0+A1:2 A0+A1:2 A0+A1:2 A0+A1:2', pulse('A2+C3+F3')],
  ['Bb0+Bb1:2 Bb0+Bb1:2 Bb0+Bb1:2 Bb0+Bb1:2', pulse('Bb2+D3+F3')], ['A0+A1:2 A0+A1:2 A0+A1:2 A0+A1:2', `${pulse('A2+D3+E3', 4)} ${pulse('A2+C#3+E3', 4)}`],
];

const BARS = [
  // ── Prologue ─────────────────────────────────────────────────────────────────────
  { h: [[0, 'Cm']], key: -3, rh: 'r:8', lh: trem('C1', 'C2', 8), dyn: 26, dm: 'pp', marks: ['Maestoso, misterioso', 'con Ped.'], wedge: 'cresc' },
  { h: [[0, 'Cm']], rh: 'C6~:3 D6~:1 Eb6~:2 G6~:2', lh: trem('C1', 'C2', 8), dyn: 32, marks: ['come campane lontane'] },
  { h: [[0, 'A♭/C']], rh: 'C7~:6 Bb6~:1 Ab6~:1', lh: trem('C1', 'C2', 8), dyn: 38 },
  { h: [[0, 'G/C']], rh: 'G6~:3 F6~:1 Eb6~:2 D6~:2', lh: trem('C1', 'C2', 8), dyn: 44, wedge: 'stop' },
  // ── Theme ────────────────────────────────────────────────────────────────────────
  ...T.map((rh, i) => ({ h: TH[i], rh, lh: PULSE[i][0], lh2: PULSE[i][1], dyn: [50, 56, 54, 50, 54, 60, 58, 54][i], ...(i === 0 ? { dm: 'mp', marks: ['cantabile, come un corno'] } : {}) })),
  // ── Theme in octaves ─────────────────────────────────────────────────────────────
  ...T2.map((rh, i) => ({ h: TH[i], rh, lh: OST[i][0], lh2: OST[i][1], dyn: [74, 80, 78, 74, 78, 84, 84, 80][i], ...(i === 0 ? { dm: 'f', marks: ['con forza'] } : i === 7 ? { wedge: 'cresc' } : {}) })),
  // ── The cycle: E – C – A♭ – E, then home through F minor ──────────────────────────
  { h: [[0, 'E']], rh: 'E5+G#5+B5:4 G#5+B5+E6:4', lh: sweep(['E1', 'B1', 'E2', 'G#2', 'B2', 'E3', 'G#3', 'B3']), dyn: 92, dm: 'ff', wedge: 'stop', marks: ['Grandioso'] },
  { h: [[0, 'C']], rh: 'G5+C6+E6:4 E5+G5+C6:2 G5+C6+E6:2', lh: sweep(['C1', 'G1', 'C2', 'E2', 'G2', 'C3', 'E3', 'G3']), dyn: 94 },
  { h: [[0, 'A♭']], rh: 'Ab5+C6+Eb6:4 C6+Eb6+Ab6:4', lh: sweep(['Ab1', 'Eb2', 'Ab2', 'C3', 'Eb3', 'Ab3', 'C4', 'Eb4']), dyn: 98 },
  { h: [[0, 'E']], rh: 'E5+G#5+B5:6 G#5+B5+E6:2', lh: sweep(['E1', 'B1', 'E2', 'G#2', 'B2', 'E3', 'G#3', 'B3']), dyn: 100 },
  { h: [[0, 'Fm']], rh: 'F5+Ab5+C6:4 Ab5+C6+F6:4', lh: sweep(['F1', 'C2', 'F2', 'Ab2', 'C3', 'F3', 'Ab3', 'C4']), dyn: 96 },
  { h: [[0, 'D♭']], rh: 'Ab5+Db6+F6:4 Db6+F6+Ab6:4', lh: sweep(['Db1', 'Ab1', 'Db2', 'F2', 'Ab2', 'Db3', 'F3', 'Ab3']), dyn: 100, wedge: 'cresc' },
  { h: [[0, 'A♭/C']], rh: 'Eb5+Ab5+C6:4 Ab5+C6+Eb6:2 C6+Eb6+Ab6:2', lh: sweep(['C2', 'Eb2', 'Ab2', 'C3', 'Eb3', 'Ab3', 'C4', 'Eb4']), dyn: 106 },
  { h: [[0, 'G7']], rh: 'G5+B5+D6+F6+G6^:8', lh: 'G1+G2^:8', lh2: 'D3+F3+B3:8', dyn: 118, dm: 'fff', wedge: 'stop' },
  // ── Breath ───────────────────────────────────────────────────────────────────────
  { h: [[0, 'G']], rh: 'r:8', lh: `r:2 ${trem('G1', 'G2', 6)}`, dyn: 30, dm: 'subito pp', subito: true, wedge: 'cresc', marks: ['crescendo molto'] },
  { h: [[0, 'A7']], rh: `r:4 ${s16(['A4', 'C#5', 'E5', 'G5', 'A5', 'C#6', 'E6', 'G6'])}`, lh: trem('A1', 'A2', 8), dyn: 64 },
  // ── Titans · D minor ─────────────────────────────────────────────────────────────
  ...T3.map((rh, i) => ({ h: T3H[i], rh, lh: T3L[i][0], lh2: T3L[i][1], dyn: [108, 112, 110, 106, 110, 116, 114, 110][i], ...(i === 0 ? { key: -1, dm: 'fff', wedge: 'stop', marks: ['Titani · tutta forza'] } : {}) })),
  // ── Ascent: ♭VI – ♭VII – I ───────────────────────────────────────────────────────
  { h: [[0, 'B♭']], rh: 'D5+F5+Bb5+D6^:2 D5+F5+Bb5+D6:2 D5+F5+Bb5+D6:2 D5+F5+Bb5+D6:2', lh: 'Bb0+Bb1^:2 Bb0+Bb1:2 Bb0+Bb1:2 Bb0+Bb1:2', lh2: 'F2+Bb2+D3:2 F2+Bb2+D3:2 F2+Bb2+D3:2 F2+Bb2+D3:2', dyn: 104, wedge: 'cresc', marks: ['allargando'] },
  { h: [[0, 'C']], rh: pulse('E5+G5+C6+E6'), lh: pulse('C1+C2'), lh2: pulse('G2+C3+E3'), dyn: 112 },
  { h: [[0, 'D']], rh: `F#5+A5+D6+F#6^:1 ${pulse('F#5+A5+D6+F#6', 7)}`, lh: trem('D1', 'D2', 8), lh2: pulse('A2+D3+F#3'), dyn: 124, dm: 'ffff', wedge: 'stop' },
  { h: [[0, 'D']], rh: `${s16(['D7', 'A6', 'F#6', 'D6', 'A5', 'F#5', 'D5', 'A4'])} ${s16(['A4', 'D5', 'F#5', 'A5', 'D6', 'F#6', 'A6', 'D7'])}`, lh: `${pulse('D1+D2', 4)} ${pulse('A1+A2', 4)}`, lh2: pulse('D3+F#3+A3'), dyn: 116 },
  // ── Finale ───────────────────────────────────────────────────────────────────────
  { h: [[0, 'Gm/D'], [4, 'D']], rh: 'G5+Bb5+D6+G6:4 F#5+A5+D6+F#6:4', lh: trem('D1', 'D2', 8), lh2: 'G2+Bb2+D3:4 F#2+A2+D3:4', dyn: 112, marks: ['Largamente'] },
  { h: [[0, 'B♭'], [2, 'C'], [4, 'D']], rh: 'D5+F5+Bb5+D6^:2 E5+G5+C6+E6^:2 F#5+A5+D6+F#6^:4', lh: 'Bb0+Bb1^:2 C1+C2^:2 D1+D2^:4', lh2: 'F2+Bb2+D3:2 G2+C3+E3:2 A2+D3+F#3:4', dyn: 116 },
  { h: [[0, '']], rh: 'r:8', lh: 'r:8', dyn: 116, dry: true, fermata: true },
  { h: [[0, 'D']], rh: 'F#5+A5+D6+F#6^:8', rh2: 'D4+A4+D5:8', lh: 'D1+D2^:8', lh2: 'A2+D3+F#3:8', dyn: 124, fermata: true, final: true },
];

const TEMPO = [
  [0, 76], [4, 82], [12, 86], [20, 90], [27, 90], [28, 80], [29.5, 88], [30, 84], [38, 82],
  [40, 74], [41, 72], [42, 80], [44, 74], [45, 58], [46, 54],
];
const BREATHS = [[4, 0.03], [8, 0.03], [12, 0.04], [16, 0.03], [20, 0.04], [24, 0.03], [30, 0.05], [34, 0.03]];
const ARCHES = [[4, 8], [8, 12], [12, 16], [16, 20], [20, 24], [24, 27], [30, 34], [34, 38]];

perform({
  BARS, TEMPO, BREATHS, ARCHES, FINAL_FROM: 45, FINAL_W: 0.8, CRASH: 27, PEAK: 40, SKIP: [[27, 29], [38, 45]],
  name: 'titans', dir: new URL('./', import.meta.url),
  title: 'Titans', subtitle: 'an epic for piano',
  compTitle: 'Titans — an epic for piano', metaTempo: 84,
  KEY: 'C minor → D minor → D major', keyOf: (a) => (a >= 40 ? 'D major' : a >= 30 ? 'D minor' : 'C minor'),
  SECTIONS: [['Prologue', 0, 4], ['Theme', 4, 12], ['Theme in octaves', 12, 20], ['The cycle', 20, 28], ['Breath', 28, 30], ['Titans · D minor', 30, 38], ['Ascent', 38, 42], ['Finale', 42, 46]],
  METRO: { 0: 76, 20: 90, 30: 84, 38: 76 },
});
