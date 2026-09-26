// LAST LIGHT — the end of the world as we know it (second take)
// Composed by hand, note by note; the code only performs it (see ../as-we-know-it/perform.mjs).
//
// What changed from "As We Know It": that piece followed its rules and forgot to be felt.
// This one starts from what a listener keeps:
//   • a HOOK — one short, syncopated motif (A–D–F…E–D: short-short-LONG) that returns in
//     every section, so the ending is recognition, not novelty;
//   • a GROOVE — a left-hand ostinato in eighths grouped 3+3+2 (the tresillo pulse under
//     most film scores), every chord coloured with its 9th;
//   • HARMONY that aches — i–VI–III–VII (Dm–B♭–F–C), 4–3 suspensions, a leap of a sixth to
//     the phrase's high note, a Neapolitan E♭ in the build;
//   • an ARC — whisper, song, fuller song, rising bridge, a clock that stops breathing,
//     the hook in octaves over driving bass, a deceptive collapse, silence, and the same
//     hook reborn in D major.
//
// FORM (50 bars, D minor → D major, 4/4)
//   1–4   Intro      ostinato alone (Dm B♭ F C)
//   5–12  A          the hook (HC with Asus4 → A)
//   13–20 A′         the hook with a second voice
//   21–28 Bridge     B♭ C Am Dm | Gm Dm/F E♭ A7 — rising to B♭5 and C6
//   29–30 Break      only a ticking A5, accelerating
//   31–38 Climax     the hook in octaves over driving octave bass
//   39–42 Collapse   deceptive B♭ with the bass falling by semitones, E♭, a bare A, silence
//   43–50 Coda       D major: the hook, high and soft, on the other side

import { perform } from '../as-we-know-it/perform.mjs';

// Ostinato: root, 5th, 9th, 10th | 5th, 9th | octave, 5th — accents fall 3+3+2.
const ost = (r, f, n, t, o) => [r, f, n, t, f, n, o, f].map((x) => `${x}:1`).join(' ');
const O = {
  Dm: ost('D2', 'A2', 'E3', 'F3', 'D3'), Bb: ost('Bb1', 'F2', 'C3', 'D3', 'Bb2'), F: ost('F2', 'C3', 'G3', 'A3', 'F3'),
  C: ost('C2', 'G2', 'D3', 'E3', 'C3'), Gm: ost('G1', 'D2', 'A2', 'Bb2', 'G2'), A: ost('A1', 'E2', 'B2', 'C#3', 'A2'),
  Am: ost('A1', 'E2', 'B2', 'C3', 'A2'), Eb: ost('Eb2', 'Bb2', 'F3', 'G3', 'Eb3'), DmF: ost('F2', 'A2', 'E3', 'F3', 'D3'),
  D: ost('D2', 'A2', 'E3', 'F#3', 'D3'), G: ost('G1', 'D2', 'A2', 'B2', 'G2'), Bm: ost('B1', 'F#2', 'C#3', 'D3', 'B2'),
};
const G = [3, 3, 2];
// Climax left hand: octave bass on the tresillo, fifths and tenths filling the offbeats.
const drive = (lo, hi, a, b, c, d) => ({ lh: `${lo}+${hi}:3 ${lo}+${hi}:3 ${lo}+${hi}:2`, lh2: `r:1 ${a}:1 ${b}:1 r:1 ${a}:1 ${c}:1 r:1 ${d}:1` });
const HOOK = 'A4:1 D5:1 F5:3 E5:1 D5:2';

const BARS = [
  // Intro
  { h: [[0, 'Dm']], key: -1, rh: 'r:8', lh: O.Dm, group: G, dyn: 30, dm: 'pp', marks: ['Moderato, con moto', 'con Ped.'] },
  { h: [[0, 'B♭']], rh: 'r:8', lh: O.Bb, group: G, dyn: 33 },
  { h: [[0, 'F']], rh: 'r:8', lh: O.F, group: G, dyn: 36 },
  { h: [[0, 'C']], rh: 'r:8', lh: O.C, group: G, dyn: 40 },
  // A — the hook
  { h: [[0, 'Dm']], rh: HOOK, lh: O.Dm, group: G, dyn: 46, dm: 'mp', marks: ['cantabile'] },
  { h: [[0, 'B♭']], rh: 'D5:3 C5:1 D5:2 F5:2', lh: O.Bb, group: G, dyn: 48 },
  { h: [[0, 'F']], rh: 'A4:1 C5:1 F5:3 E5:1 C5:2', lh: O.F, group: G, dyn: 48 },
  { h: [[0, 'C']], rh: 'C5:3 D5:1 E5:4', lh: O.C, group: G, dyn: 46 },
  { h: [[0, 'Dm']], rh: HOOK, lh: O.Dm, group: G, dyn: 48 },
  { h: [[0, 'B♭']], rh: 'D5:3 F5:1 Bb5:4', lh: O.Bb, group: G, dyn: 54 },
  { h: [[0, 'Gm']], rh: 'A5:2 G5:2 F5:2 E5:2', lh: O.Gm, group: G, dyn: 52 },
  { h: [[0, 'Asus4'], [2, 'A']], rh: 'D5:2 C#5:6', lh: O.A, group: G, dyn: 46 },
  // A′ — a second voice joins
  { h: [[0, 'Dm']], rh: HOOK, rh2: 'F4:4 A4:4', lh: O.Dm, group: G, dyn: 54, dm: 'mf' },
  { h: [[0, 'B♭']], rh: 'D5:3 C5:1 D5:2 F5:2', rh2: 'F4:4 Bb4:4', lh: O.Bb, group: G, dyn: 56 },
  { h: [[0, 'F']], rh: 'A4:1 C5:1 F5:3 E5:1 C5:2', rh2: 'F4:4 A4:4', lh: O.F, group: G, dyn: 57 },
  { h: [[0, 'C']], rh: 'C5:3 D5:1 E5:4', rh2: 'G4:8', lh: O.C, group: G, dyn: 56 },
  { h: [[0, 'Dm']], rh: HOOK, rh2: 'F4:4 A4:4', lh: O.Dm, group: G, dyn: 58 },
  { h: [[0, 'B♭']], rh: 'D5:3 F5:1 Bb5:4', rh2: 'F4:4 D5:4', lh: O.Bb, group: G, dyn: 64 },
  { h: [[0, 'Gm']], rh: 'A5:2 G5:2 F5:2 E5:2', rh2: 'D5:4 Bb4:4', lh: O.Gm, group: G, dyn: 62 },
  { h: [[0, 'Asus4'], [2, 'A']], rh: 'D5:2 C#5:6', rh2: 'E4+A4:8', lh: O.A, group: G, dyn: 56 },
  // Bridge — rising
  { h: [[0, 'B♭']], rh: 'D5:4 F5:2 G5:2', rh2: 'Bb4:8', lh: O.Bb, group: G, dyn: 58, marks: ['poco a poco crescendo'], wedge: 'cresc' },
  { h: [[0, 'C']], rh: 'E5:4 G5:2 A5:2', rh2: 'C5:8', lh: O.C, group: G, dyn: 63 },
  { h: [[0, 'Am']], rh: 'C6:4 B5:2 G5:2', rh2: 'E5:8', lh: O.Am, group: G, dyn: 68 },
  { h: [[0, 'Dm']], rh: 'A5:4 F5:2 D5:2', rh2: 'D5:4 A4:4', lh: O.Dm, group: G, dyn: 70 },
  { h: [[0, 'Gm']], rh: 'Bb5:4 A5:2 G5:2', rh2: 'D5:8', lh: O.Gm, group: G, dyn: 74 },
  { h: [[0, 'Dm/F']], rh: 'A5:4 F5:2 A5:2', rh2: 'D5:8', lh: O.DmF, group: G, dyn: 78 },
  { h: [[0, 'E♭']], rh: 'G5:4 Bb5:2 G5:2', rh2: 'Eb5:8', lh: O.Eb, group: G, dyn: 84, dm: 'f' },
  { h: [[0, 'A7']], rh: 'A5:3 G5:1 E5:2 C#5:2', rh2: 'C#5+E5:4 r:4', lh: O.A, group: G, dyn: 90, wedge: 'stop' },
  // Break — the clock
  { h: [[0, 'A']], rh: 'A5:1 A5:1 A5:1 A5:1 A5:1 A5:1 A5:1 A5:1', lh: 'A1:8', dyn: 34, dm: 'subito pp', subito: true, marks: ['come un orologio'] },
  { h: [[0, 'A']], rh: 'A5:1 A5:1 A5:1 A5:1 A5:0.5 A5:0.5 A5:0.5 A5:0.5 A5:0.5 A5:0.5 A5:0.5 A5:0.5', lh: 'A1:8', dyn: 40, wedge: 'cresc' },
  // Climax — the hook in octaves
  { h: [[0, 'Dm']], rh: 'A4+A5:1 D5+D6:1 F5+A5+F6:3 E5+E6:1 D5+F5+D6:2', ...drive('D1', 'D2', 'A2', 'D3', 'E3', 'F3'), dyn: 104, dm: 'ff', subito: true, wedge: 'stop', marks: ['Grandioso'] },
  { h: [[0, 'B♭']], rh: 'D5+F5+D6:3 C5+C6:1 D5+D6:2 F5+F6:2', ...drive('Bb0', 'Bb1', 'F2', 'Bb2', 'C3', 'D3'), dyn: 106 },
  { h: [[0, 'F']], rh: 'A4+A5:1 C5+C6:1 F5+A5+F6:3 E5+E6:1 C5+C6:2', ...drive('F1', 'F2', 'C3', 'F3', 'G3', 'A3'), dyn: 106 },
  { h: [[0, 'C/E']], rh: 'C5+E5+C6:3 D5+D6:1 E5+G5+E6:4', ...drive('E1', 'E2', 'G2', 'C3', 'D3', 'E3'), dyn: 104 },
  { h: [[0, 'Dm']], rh: 'A4+A5:1 D5+D6:1 F5+A5+F6:3 E5+E6:1 D5+F5+D6:2', ...drive('D1', 'D2', 'A2', 'D3', 'E3', 'F3'), dyn: 108 },
  { h: [[0, 'B♭']], rh: 'D5+F5+D6:3 F5+F6:1 Bb5+D6+Bb6:4', ...drive('Bb0', 'Bb1', 'F2', 'Bb2', 'C3', 'D3'), dyn: 114, dm: 'fff' },
  { h: [[0, 'Gm']], rh: 'A5+A6:2 G5+Bb5+G6:2 F5+F6:2 E5+G5+E6:2', ...drive('G1', 'G2', 'D3', 'G3', 'A3', 'Bb3'), dyn: 112 },
  { h: [[0, 'A7']], rh: 'E5+A5+E6:2 C#5+C#6:2 E5+G5+E6:2 A5+C#6+A6:2', ...drive('A0', 'A1', 'E2', 'A2', 'G2', 'C#3'), dyn: 116 },
  // Collapse — the D minor never comes
  { h: [[0, 'B♭'], [2, 'B♭/A'], [4, 'B♭/A♭'], [6, 'B♭/G']], rh: 'D5+F5+Bb5+D6^:8', lh: 'Bb1+Bb2^:2 A1+A2:2 Ab1+Ab2:2 G1+G2:2', dyn: 120, marks: ['crollando'] },
  { h: [[0, 'E♭/G♭'], [2, 'E♭/F'], [4, 'E♭/E'], [6, 'E♭']], rh: 'Eb5+G5+Bb5+Eb6^:8', lh: 'Gb1+Gb2:2 F1+F2:2 E1+E2:2 Eb1+Eb2:2', dyn: 112, wedge: 'dim' },
  { h: [[0, 'A']], rh: 'r:8', lh: 'A0+A1:8', dyn: 96, fermata: true, wedge: 'stop' },
  { h: [[0, '']], rh: 'r:8', lh: 'r:8', dyn: 0, gp: true, fermata: true, marks: ['G.P.'] },
  // Coda — D major, the other side
  { h: [[0, 'D']], key: 2, rh: 'r:8', lh: O.D, group: G, dyn: 26, dm: 'pp', subito: true, marks: ['Più lento, luminoso'] },
  { h: [[0, 'D']], rh: 'A5:1 D6:1 F#6:3 E6:1 D6:2', lh: O.D, group: G, dyn: 30 },
  { h: [[0, 'G']], rh: 'D6:3 B5:1 D6:2 F#6:2', lh: O.G, group: G, dyn: 32 },
  { h: [[0, 'Bm']], rh: 'F#5:1 B5:1 D6:3 C#6:1 B5:2', lh: O.Bm, group: G, dyn: 32 },
  { h: [[0, 'G']], rh: 'B5:3 C#6:1 D6:4', lh: O.G, group: G, dyn: 30 },
  { h: [[0, 'D']], rh: 'A5:1 D6:1 F#6:3 E6:1 D6:2', lh: O.D, group: G, dyn: 30 },
  { h: [[0, 'G'], [4, 'Asus4'], [6, 'A']], rh: 'G6:3 F#6:1 E6:4', lh: 'G1:1 D2:1 A2:1 B2:1 A1:1 E2:1 B2:1 C#3:1', dyn: 26, dm: 'ppp' },
  { h: [[0, 'D(add9)']], rh: 'D6:8', rh2: 'F#4+A4+E5:8', lh: 'D2+A2+E3:8', dyn: 24, fermata: true, final: true, roll: true },
];

const TEMPO = [
  [0, 80], [4, 84], [12, 86], [20, 86], [26, 90], [27.6, 88], [28, 80], [29.5, 84], [30, 92],
  [37, 94], [37.8, 84], [38, 80], [40, 64], [41, 60], [41.0001, 66], [42, 64], [47, 60], [50, 60],
];
const BREATHS = [[8, 0.03], [11.75, 0.05], [19.75, 0.05], [34, 0.03], [45.75, 0.04]];
const ARCHES = [[4, 8], [8, 12], [12, 16], [16, 20], [20, 24], [24, 28], [30, 34], [34, 38], [43, 47], [47, 50]];

perform({
  BARS, TEMPO, BREATHS, ARCHES, FINAL_FROM: 47.5, FINAL_W: 0.55, CRASH: 40, PEAK: 35, SKIP: [30, 42],
  name: 'last_light', dir: new URL('./', import.meta.url),
  title: 'Last Light', subtitle: 'the end of the world as we know it — for piano',
  compTitle: 'Last Light — the end of the world as we know it', metaTempo: 84,
  KEY: 'D minor → D major', keyOf: (a) => (a >= 42 ? 'D major' : 'D minor'),
  SECTIONS: [['Intro', 0, 4], ['A · the hook', 4, 12], ['A′ · two voices', 12, 20], ['Bridge', 20, 28], ['Break · the clock', 28, 30], ['Climax', 30, 38], ['Collapse', 38, 42], ['Coda · D major', 42, 50]],
  METRO: { 0: 84, 30: 92, 42: 64 },
});
