// NIGHT TRAIN — a fast piece for piano (Allegro con fuoco → Presto)
// Composed by hand, note by note; the code only performs it (see ../as-we-know-it/perform.mjs).
//
// What it is built on:
//   • a MOTOR — the left hand never stops: sixteenths grouped 3+3+2 (root, 5th, octave |
//     root, 5th, 3rd | octave, 5th), the accents landing on the wheels' joints;
//   • a HOOK — E–B–E–G… (three quick notes, then a long one on the offbeat), answered by a
//     falling 3+3+2 in long notes; the answer is the motor's rhythm sung slowly;
//   • a LAMENT BASS — E, D, C♯, C, (A), B: the ground slides down a semitone at a time
//     under the hook (Em – G/D – C♯ø7 – Cmaj7 – Am7 – B7), so every phrase leans forward;
//   • CONTRAST — a lyrical middle in long notes over a straight (4+4) figure, drifting to
//     the relative major;
//   • an ARC — the train pulls out, runs, sings, climbs to the peak (bar 33, golden
//     section), is thrown onto the deceptive C major, goes silent in a tunnel, and comes
//     out faster, to the end of the line.
//
// FORM (52 bars, E minor, 4/4)
//   1–4    Departure   the motor alone
//   5–12   A           the hook
//   13–20  A′          the hook with a second voice
//   21–28  B           cantabile, straight figure, relative major, building
//   29–35  A″          the hook in octaves over octave-bass motor — peak at bar 33
//   36     Derailment  deceptive Cmaj7(♯11), fff, held
//   37–40  Tunnel      pp, the motor on a B pedal, the hook's head echoing, accelerating
//   41–46  A‴          Presto, the hook in octaves once more
//   47–52  End of the line  cascade down, run up, three stabs, the last chord

import { perform } from '../as-we-know-it/perform.mjs';

const s16 = (arr) => arr.map((n) => `${n}:0.5`).join(' ');
// 3+3+2 motor, one bar: r f o | r f t | o f, twice.
const motor = (r, f, o, t) => s16([r, f, o, r, f, t, o, f, r, f, o, r, f, t, o, f]);
// The same with the low octave added on every group's first note (climax).
const motorX = (lo, r, f, o, t) => { const R = `${lo}+${r}`; return s16([R, f, o, R, f, t, R, f, R, f, o, R, f, t, R, f]); };
// Straight figure for the cantabile: r o f o t o f o, twice.
const straight = (r, f, o, t) => s16([r, o, f, o, t, o, f, o, r, o, f, o, t, o, f, o]);

const C = {
  Em: ['E2', 'B2', 'E3', 'G3'], GD: ['D2', 'B2', 'D3', 'G3'], Cs: ['C#2', 'G2', 'C#3', 'E3'],
  Cmaj7: ['C2', 'G2', 'C3', 'E3'], Am7: ['A1', 'E2', 'A2', 'C3'], B7sus: ['B1', 'F#2', 'B2', 'E3'],
  B7: ['B1', 'F#2', 'B2', 'D#3'], C: ['C2', 'G2', 'C3', 'E3'], D: ['D2', 'A2', 'D3', 'F#3'],
  Bm: ['B1', 'F#2', 'B2', 'D3'], G: ['G1', 'D2', 'G2', 'B2'],
};
const M = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, motor(...v)]));
const lowOf = (n) => n.replace(/\d$/, (d) => String(Number(d) - 1));
const MX = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, motorX(lowOf(v[0]), ...v)]));
const S = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, straight(...v)]));
const G16 = [3, 3, 2, 3, 3, 2];

// The theme (eight bars) — hook, answer; hook, answer; hook higher, answer; dominant, home.
const A = [
  'E5:1 B4:1 E5:1 G5:2 F#5:1 E5:1 D5:1',
  'E5:3 D5:3 B4:2',
  'E5:1 C#5:1 E5:1 B5:2 A5:1 G5:1 E5:1',
  'G5:3 F#5:3 E5:2',
  'A5:1 E5:1 A5:1 C6:2 B5:1 A5:1 G5:1',
  'A5:3 F#5:3 E5:2',
  'D#5:1 F#5:1 A5:1 B5:2 A5:1 G5:1 F#5:1',
  'E5:6 r:2',
];
const H = ['Em', 'G/D', 'C♯ø7', 'Cmaj7', 'Am7', 'B7sus4', 'B7', 'Em'];
const K = ['Em', 'GD', 'Cs', 'Cmaj7', 'Am7', 'B7sus', 'B7', 'Em'];
// The theme in octaves, filled with a chord tone on the long notes.
const AX = [
  'E5+E6:1 B4+B5:1 E5+E6:1 G5+B5+G6:2 F#5+F#6:1 E5+E6:1 D5+D6:1',
  'E5+G5+E6:3 D5+G5+D6:3 B4+D5+B5:2',
  'E5+E6:1 C#5+C#6:1 E5+E6:1 B5+E6+B6:2 A5+A6:1 G5+G6:1 E5+E6:1',
  'G5+C6+G6:3 F#5+B5+F#6:3 E5+G5+E6:2',
  'A5+A6:1 E5+E6:1 A5+A6:1 C6+E6+C7:2 B5+B6:1 A5+A6:1 G5+G6:1',
  'A5+E6+A6:3 F#5+B5+F#6:3 E5+A5+E6:2',
  'D#5+D#6:1 F#5+F#6:1 A5+A6:1 B5+D#6+B6:2 A5+A6:1 G5+G6:1 F#5+F#6:1',
];

const BARS = [
  // Departure — the motor alone
  { h: [[0, 'Em']], key: 1, rh: 'r:8', lh: M.Em, group16: G16, dyn: 42, dm: 'mp', marks: ['Allegro con fuoco', 'con Ped.'], wedge: 'cresc' },
  { h: [[0, 'Em']], rh: 'r:8', lh: M.Em, group16: G16, dyn: 48 },
  { h: [[0, 'Cmaj7']], rh: 'r:8', lh: M.Cmaj7, group16: G16, dyn: 53 },
  { h: [[0, 'B7']], rh: 'r:8', lh: M.B7, group16: G16, dyn: 58, wedge: 'stop' },
  // A — the hook
  ...A.map((rh, i) => ({ h: [[0, H[i]]], rh, lh: M[K[i]], group16: G16, dyn: [62, 60, 63, 61, 66, 63, 64, 60][i], ...(i === 0 ? { dm: 'mf', marks: ['marcato il canto'] } : {}) })),
  // A′ — a second voice
  ...A.map((rh, i) => ({
    h: [[0, H[i]]], rh: i === 7 ? 'E5:4 B4:2 D5:2' : rh,
    rh2: ['G4:3 B4:3 G4:2', 'C5:3 B4:3 G4:2', 'E4:4 G4:4', 'E5:3 C5:3 B4:2', 'C5:4 E5:4', 'E5:3 D5:3 B4:2', 'B4:4 A4:4', 'G4:8'][i],
    lh: M[K[i]], group16: G16, dyn: [70, 68, 72, 70, 76, 72, 74, 70][i], ...(i === 0 ? { dm: 'f' } : {}),
  })),
  // B — cantabile, straight figure, towards G major, building
  { h: [[0, 'Cmaj7']], rh: 'E5:3 G5:3 B5:2', lh: S.C, dyn: 66, dm: 'mf', marks: ['cantabile, sempre in tempo'], wedge: 'cresc' },
  { h: [[0, 'D']], rh: 'A5:6 F#5:2', lh: S.D, dyn: 69 },
  { h: [[0, 'Bm']], rh: 'D5:3 F#5:3 B5:2', lh: S.Bm, dyn: 72 },
  { h: [[0, 'Em']], rh: 'B5:4 A5:2 G5:2', lh: S.Em, dyn: 75 },
  { h: [[0, 'Am7']], rh: 'C6:3 B5:3 A5:2', lh: S.Am7, dyn: 79 },
  { h: [[0, 'D']], rh: 'F#5:3 A5:3 D6:2', lh: S.D, dyn: 83 },
  { h: [[0, 'G']], rh: 'D6:4 B5:2 G5:2', lh: S.G, dyn: 88 },
  { h: [[0, 'B7']], rh: 'A5:3 F#5:3 D#5:2', rh2: 'D#5+F#5:3 r:5', lh: M.B7, group16: G16, dyn: 94, wedge: 'stop' },
  // A″ — the hook in octaves over the octave-bass motor
  ...AX.map((rh, i) => ({ h: [[0, H[i]]], rh, lh: MX[K[i]], group16: G16, dyn: [100, 99, 103, 102, 112, 106, 108][i], ...(i === 0 ? { dm: 'ff', marks: ['Grandioso'] } : i === 4 ? { dm: 'fff' } : {}) })),
  // Derailment — the E minor never comes
  { h: [[0, 'Cmaj7♯11']], rh: 'E5+G5+B5+F#6^:8', rh2: 'C5:8', lh: 'C1+C2^:8', dyn: 118, dm: 'sfff', hold: 1.25, marks: ['deragliando'] },
  // Tunnel — pp, the motor on a B pedal
  { h: [[0, 'B']], rh: 'r:8', lh: `r:2 ${s16(['B1', 'F#2', 'B2', 'B1', 'F#2', 'A2', 'B2', 'F#2', 'B1', 'F#2', 'B2', 'A2'])}`, dyn: 28, dm: 'subito pp', subito: true, marks: ['sotto voce, in galleria'], wedge: 'cresc' },
  { h: [[0, 'B7']], rh: 'r:4 E5:1 B4:1 E5:1 G5:1', lh: M.B7, group16: G16, dyn: 36 },
  { h: [[0, 'B7']], rh: 'F#5:2 r:2 E5:1 B4:1 E5:1 G5:1', lh: M.B7, group16: G16, dyn: 50 },
  { h: [[0, 'B7']], rh: 'A5:1 G5:1 F#5:1 A5:1 B5:2 D#6:2', lh: MX.B7, group16: G16, dyn: 72, wedge: 'stop' },
  // A‴ — Presto
  ...[0, 1, 2, 3, 4, 6].map((j, i) => ({ h: [[0, H[j]]], rh: AX[j], lh: MX[K[j]], group16: G16, dyn: [98, 97, 101, 100, 106, 108][i], ...(i === 0 ? { dm: 'ff', subito: true, marks: ['Presto'] } : {}) })),
  // End of the line
  { h: [[0, 'Em']], rh: 'E6:1 B5:1 E6:1 G6:1 E5:1 B4:1 E5:1 G5:1', lh: MX.Em, group16: G16, dyn: 104 },
  { h: [[0, 'Cmaj7']], rh: 'F#6:1 E6:1 B5:1 G5:1 F#5:1 E5:1 B4:1 G4:1', lh: MX.Cmaj7, group16: G16, dyn: 102 },
  { h: [[0, 'Am7']], rh: s16(['A4', 'C5', 'E5', 'G5', 'A5', 'C6', 'E6', 'G6']) + ' A6:2 C7:2', lh: MX.Am7, group16: G16, dyn: 108, wedge: 'cresc' },
  { h: [[0, 'B7']], rh: 'B6+D#7:2 A6:2 F#6:2 D#6:2', lh: MX.B7, group16: G16, dyn: 114, wedge: 'stop' },
  { h: [[0, 'Em']], rh: 'E5+G5+B5+E6^:3 E5+G5+B5+E6^:3 D#5+F#5+A5+D#6^:2', lh: 'E1+E2^:3 E1+E2^:3 B0+B1^:2', dyn: 118, dm: 'fff' },
  { h: [[0, 'Em']], rh: 'E5+G5+B5+E6^:8', lh: 'E1+E2^:8', lh2: 'B2+E3:8', dyn: 122, fermata: true, final: true },
];

const TEMPO = [
  [0, 146], [4, 152], [20, 152], [21, 148], [27, 154], [28, 158], [32, 162], [34, 158], [35, 150],
  [36.3, 136], [37, 138], [40, 168], [46, 174], [50, 172], [52, 166],
];
const BREATHS = [[12, 0.02], [20, 0.03], [28, 0.02]];
const ARCHES = [[4, 8], [8, 12], [12, 16], [16, 20], [20, 24], [24, 28], [28, 32], [32, 35], [40, 44], [44, 48]];

perform({
  BARS, TEMPO, BREATHS, ARCHES, FINAL_FROM: 50.5, FINAL_W: 0.8, CRASH: 35, PEAK: 32, SKIP: [28, 36],
  name: 'night_train', dir: new URL('./', import.meta.url),
  title: 'Night Train', subtitle: 'for piano',
  compTitle: 'Night Train', metaTempo: 152,
  KEY: 'E minor', keyOf: () => 'E minor',
  SECTIONS: [['Departure', 0, 4], ['A · the hook', 4, 12], ['A′ · two voices', 12, 20], ['B · cantabile', 20, 28], ['A″ · octaves', 28, 35], ['Derailment', 35, 36], ['Tunnel', 36, 40], ['A‴ · Presto', 40, 46], ['End of the line', 46, 52]],
  METRO: { 0: 148, 28: 160, 36: 138, 40: 170 },
});
