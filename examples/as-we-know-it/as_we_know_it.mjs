// AS WE KNOW IT — the end of the world, in seven stages, for piano
// Composed by hand, note by note. The code below only performs the written score (timing,
// touch, pedal) and exports notation; every pitch, rhythm, dynamic and tempo anchor is a
// deliberate compositional choice. See RESEARCH.md for the rules and sources.
//
// Notation: each voice is a string of "Note:eighths" tokens (4/4 bar = 8 eighths), chords
// joined with "+", rests "r". A trailing "-" on the duration ties into the next event of the
// same voice. Note flags: "~" = distant bell (soft, undamped register), "^" = accent.
// Voices: rh (melody), rh2 (right-hand inner), lh (bass), lh2 (left-hand undercurrent).
//
// THE IDEA
//   The known world is a hymn in C major over a gently turning eighth-note undercurrent.
//   Underneath it the ground gives way one semitone per stage — C, B, B♭, A, A♭, G, F♯ —
//   the descending lament bass stretched from a fourth to a tritone. The undercurrent never
//   stops (it only changes speed and grouping) until the single grand pause after the
//   collapse. The new world is F♯ Lydian: the tritone from C, where the old tonic survives
//   as B♯, the Lydian ♯4, and the omen bell F♯6 of bar 10 becomes the final tonic.
//
// FORM (60 bars)
//   I    1–10  The known world   C major hymn (period: HC b5, PAC b9); first bell F♯6 (C Lydian)
//   II  11–18  Omen              the same hymn over a B pedal; its half cadence turns to B minor
//   III 19–26  Unease            B♭ ground; the hymn in C minor; the clock limps (3+3+2);
//                                rising sequence, B♭7 re-spelt as a German sixth → A
//   IV  27–33  Unravelling       A ground; octatonic; the hymn motif trapped in minor-third
//                                cycles over diminished-seventh waves in sixteenths
//   V   34–40  Collapse          A♭ ground; the hymn in the tops of C-major chords, split by
//                                F♯-major chords (both worlds at once); chromatic cascades
//                                converge on a tritone, then the whole keyboard (A0 … C8)
//   —   41     Grand pause       the only place the undercurrent stops
//   VI  42–48  Aftermath         G ground; a slowing heartbeat; hymn fragments in C minor with
//                                growing silences; one last G7
//   VII 49–60  The new world     G7 → F♯ (every upper voice moves a semitone); the hymn again,
//                                a tritone higher, in F♯ Lydian over a new 3+3+2 pulse

import { writeFileSync } from 'node:fs';

const A7 = 'A1:0.5 C2:0.5 Eb2:0.5 F#2:0.5 A2:0.5 C3:0.5 Eb3:0.5 F#3:0.5 A3:0.5 F#3:0.5 Eb3:0.5 C3:0.5 A2:0.5 F#2:0.5 Eb2:0.5 C2:0.5'; // A°7 wave
const CS7 = 'A1:0.5 C#2:0.5 E2:0.5 G2:0.5 A#2:0.5 C#3:0.5 E3:0.5 G3:0.5 A#3:0.5 G3:0.5 E3:0.5 C#3:0.5 A#2:0.5 G2:0.5 E2:0.5 C#2:0.5'; // C♯°7 over A = A7♭9
const trem = (a, b, n = 8) => Array(n).fill(`${a}:0.5 ${b}:0.5`).join(' ');
const BELL = 'lontano, come una campana';

const BARS = [
  // ── I  The known world ───────────────────────────────────────────────────────────────
  { h: [[0, 'C']], rh: 'r:6 G4:2', lh: 'C2:8', lh2: 'r:1 E3:1 C4:1 E3:1 G2:1 E3:1 C4:1 E3:1', dyn: 38, dm: 'p', marks: ['Andante semplice, come un inno', 'con Ped.'] },
  { h: [[0, 'C'], [6, 'G/B']], rh: 'C5:4 E5:2 D5:2', rh2: 'G4:8', lh: 'C3:6 B2:2', lh2: 'r:1 G3:1 E4:1 G3:1 C4:1 G3:1 r:1 D4:1', dyn: 42 },
  { h: [[0, 'Am'], [2, 'Em/G'], [4, 'Fmaj7'], [6, 'C/E']], rh: 'C5:2 B4:2 A4:2 G4:2', rh2: 'E4:8', lh: 'A2:1 E3:1 G2:1 E3:1 F2:1 C3:1 E2:1 C3:1', dyn: 44 },
  { h: [[0, 'F'], [2, 'C/E'], [4, 'Dm'], [6, 'C']], rh: 'A4:2 C5:2 F5:2 E5:2', rh2: 'F4:2 G4:2 A4:2 C5:2-', lh: 'F2:1 C3:1 E2:1 C3:1 D2:1 F3:1 C2:1 E3:1', dyn: 48 },
  { h: [[0, 'Gsus4'], [2, 'G'], [6, 'G7']], rh: 'D5:6 G4:2', rh2: 'C5:2 B4:4 F4:2', lh: 'G2:8', lh2: 'r:1 D3:1 G3:1 D3:1 B3:1 D3:1 G3:1 D3:1', dyn: 48 },
  { h: [[0, 'C'], [6, 'C7']], rh: 'C5:4 E5:2 G5:2', rh2: 'E4:4 G4:2 Bb4:2', lh: 'C2:8', lh2: 'r:1 G2:1 E3:1 C4:1 E3:1 G2:1 E3:1 C4:1', dyn: 46 },
  { h: [[0, 'F'], [4, 'C/E'], [6, 'Dm7']], rh: 'A5:4 G5:2 F5:2', rh2: 'A4:4 C5:2 A4:2', lh: 'F2:1 C3:1 A3:1 C3:1 E2:1 G3:1 D2:1 F3:1', dyn: 54, dm: 'mp' },
  { h: [[0, 'C/G'], [4, 'G7']], rh: 'E5:4 D5:4', rh2: 'G4:4 F4:4', lh: 'G2:8', lh2: 'r:1 C3:1 E3:1 C3:1 B2:1 D3:1 G3:1 D3:1', dyn: 50 },
  { h: [[0, 'C'], [4, 'F/C']], rh: 'C5:8', rh2: 'E4:4 F4:4', lh: 'C2:8', lh2: 'r:1 G2:1 C3:1 G2:1 A2:1 C3:1 F3:1 C3:1', dyn: 44, dm: 'p' },
  { h: [[0, 'C']], rh: 'r:4 F#6~:4', rh2: 'E4:8', lh: 'C2:8', lh2: 'r:1 G2:1 C3:1 G2:1 E3:1 G2:1 C3:1 G2:1', dyn: 38, marksAt: { 4: BELL } },

  // ── II  Omen: the ground slips to B ──────────────────────────────────────────────────
  { h: [[0, 'C/B']], rh: 'r:6 G4:2', lh: 'B1:8', lh2: 'r:1 G2:1 C3:1 G2:1 E3:1 G2:1 C3:1 G2:1', dyn: 36, dm: 'pp', marks: ['sempre legato'] },
  { h: [[0, 'C/B'], [6, 'G/B']], rh: 'C5:4 E5:2 D5:2', rh2: 'G4:8', lh: 'B1:8', lh2: 'r:1 G3:1 E4:1 G3:1 C4:1 G3:1 B3:1 D4:1', dyn: 40, dm: 'p' },
  { h: [[0, 'Am/B'], [2, 'Em/B'], [4, 'F/B'], [6, 'C/B']], rh: 'C5:2 B4:2 A4:2 G4:2', rh2: 'E4:8', lh: 'B1:8', lh2: 'A2:1 E3:1 G2:1 E3:1 F2:1 C3:1 E2:1 C3:1', dyn: 42 },
  { h: [[0, 'F/B'], [2, 'C/B'], [4, 'Bø7'], [6, 'C/B']], rh: 'A4:2 C5:2 F5+F#6~:2 E5:2', rh2: 'F4:2 G4:2 A4:2 C5:2-', lh: 'B1:8', lh2: 'F2:1 C3:1 E2:1 C3:1 D2:1 F3:1 C2:1 E3:1', dyn: 46 },
  { h: [[0, 'Bm'], [6, 'Gmaj7/B']], rh: 'D5:6 G4:2', rh2: 'C5:2 B4:4 F#4:2', lh: 'B1:8', lh2: 'r:1 F#2:1 D3:1 F#2:1 B2:1 F#2:1 G2:1 D3:1', dyn: 45 },
  { h: [[0, 'C/B'], [6, 'C7/B']], rh: 'C5:4 E5:2 G5:2', rh2: 'E4:4 G4:2 Bb4:2', lh: 'B1:8', lh2: 'r:1 G2:1 E3:1 C4:1 E3:1 G2:1 E3:1 C4:1', dyn: 47 },
  { h: [[0, 'B7♭9'], [4, 'C/B'], [6, 'Bø7']], rh: 'A5:4 G5:2 F5:2', rh2: 'A4:4 C5:2 A4:2', lh: 'B1:8', lh2: 'F#2:1 C3:1 A3:1 C3:1 E2:1 G3:1 D2:1 F3:1', dyn: 53, dm: 'mp' },
  { h: [[0, 'C/B'], [4, 'Gm/B♭']], rh: 'E5:4 D5:2 G4:2', rh2: 'C5:4 Bb4:2 D4:2', lh: 'B1:4 Bb1:4', lh2: 'r:1 G2:1 C3:1 G2:1 r:1 G2:1 D3:1 G2:1', dyn: 49 },

  // ── III  Unease: B♭ ground, the hymn in minor, the clock limps (3+3+2) ────────────────
  { h: [[0, 'Cm/B♭'], [3, 'Cm/B♭'], [6, 'Gm/B♭']], group: [3, 3, 2], rh: 'C5:4 Eb5:2 D5:2', rh2: 'G4:8', lh: 'Bb1:3 Bb1:3 Bb1:2', lh2: 'r:1 G2:1 Eb3:1 r:1 G2:1 C3:1 r:1 D3:1', dyn: 50, dm: 'mp', marks: ['poco più mosso, inquieto'], wedge: 'cresc' },
  { h: [[0, 'A♭/B♭'], [3, 'E♭/B♭'], [6, 'E♭/B♭']], group: [3, 3, 2], rh: 'C5:2 Bb4:2 Ab4:2 G4:2', rh2: 'Eb4:8', lh: 'Bb1:3 Bb1:3 Bb1:2', lh2: 'r:1 Ab2:1 Eb3:1 r:1 F2:1 C3:1 r:1 Eb3:1', dyn: 54 },
  { h: [[0, 'Fm/B♭'], [3, 'Fm/B♭'], [6, 'A♭/B♭']], group: [3, 3, 2], rh: 'Ab4:2 C5:2 F5:2 Eb5:2', rh2: 'F4:4 Ab4:4', lh: 'Bb1:3 Bb1:3 Bb1:2', lh2: 'r:1 F2:1 C3:1 r:1 Ab2:1 C3:1 r:1 Eb3:1', dyn: 58 },
  { h: [[0, 'Gm/B♭'], [3, 'Gm/B♭'], [6, 'B♭']], group: [3, 3, 2], rh: 'Bb4:2 D5:2 G5:2 F5:2', rh2: 'G4:4 Bb4:4', lh: 'Bb1:3 Bb1:3 Bb1:2', lh2: 'r:1 G2:1 D3:1 r:1 Bb2:1 D3:1 r:1 F3:1', dyn: 62, dm: 'mf' },
  { h: [[0, 'A♭/B♭'], [3, 'A♭/B♭'], [6, 'Cm/B♭']], group: [3, 3, 2], rh: 'C5:2 Eb5:2 Ab5:2 G5:2', rh2: 'Ab4:4 C5:4', lh: 'Bb1:3 Bb1:3 Bb1:2', lh2: 'r:1 Ab2:1 Eb3:1 r:1 C3:1 Eb3:1 r:1 G3:1', dyn: 66 },
  { h: [[0, 'B♭7'], [3, 'B♭7'], [6, 'B♭7']], group: [3, 3, 2], rh: 'D5:2 F5:2 Bb5:2 Ab5:2', rh2: 'Bb4:4 D5:4', lh: 'Bb1:3 Bb1:3 Bb1:2', lh2: 'r:1 F2:1 D3:1 r:1 Ab2:1 D3:1 r:1 F3:1', dyn: 72 },
  { h: [[0, 'B♭7'], [3, 'B♭7'], [6, 'B♭7']], group: [3, 3, 2], rh: 'D5:1 G5:1 Bb5:1 Ab5:1 F5:1 Bb5:1 D6:1 C6:1', rh2: 'Bb4:4 D5:4', lh: 'Bb1:3 Bb1:3 Bb1:2', lh2: 'r:1 F2:1 D3:1 r:1 Ab2:1 D3:1 r:1 F3:1', dyn: 78, dm: 'f' },
  { h: [[0, 'B♭7'], [4, 'Ger+6']], rh: 'Ab5:1 D6:1 F6:1 Eb6:1 D6:1 C6:1 Bb5:1 Ab5:1', lh: 'Bb1:0.5 F2:0.5 Ab2:0.5 D3:0.5 F3:0.5 D3:0.5 Ab2:0.5 F2:0.5 Bb1:0.5 F2:0.5 G#2:0.5 D3:0.5 F3:0.5 D3:0.5 G#2:0.5 F2:0.5', dyn: 84, wedge: 'stop' },

  // ── IV  Unravelling: A ground, octatonic ─────────────────────────────────────────────
  { h: [[0, 'A°7'], [4, 'A°7']], rh: 'G4+G5^:2 C5+C6:2 E5+E6:2 D#5+D#6:2', lh: A7, dyn: 86, marks: ['agitato'] },
  { h: [[0, 'A7♭9'], [4, 'A7♭9']], rh: 'A#4+A#5^:2 D#5+D#6:2 G5+G6:2 F#5+F#6:2', lh: CS7, dyn: 89 },
  { h: [[0, 'A°7'], [4, 'A°7']], rh: 'C#5+C#6^:2 F#5+F#6:2 A#5+A#6:2 A5+A6:2', lh: A7, dyn: 92, wedge: 'cresc' },
  { h: [[0, 'A7♭9'], [4, 'A7♭9']], rh: 'E5+E6^:2 A5+A6:2 C#6+C#7:2 C6+C7:2', lh: CS7, dyn: 95 },
  { h: [[0, 'A°7'], [4, 'A°7']], rh: 'G5+G6^:2 C6+C7:2 E6+E7:2 D#6+D#7:2', lh: A7, dyn: 98, wedge: 'stop' },
  { h: [[0, 'A'], [2, 'A'], [4, 'A'], [6, 'A']], rh: 'E6+E7:1 D#6+D#7:1 E5+E6:1 D#5+D#6:1 C6+C7:1 B5+B6:1 C5+C6:1 B4+B5:1', lh: trem('A1', 'A2'), dyn: 100, dm: 'ff' },
  { h: [[0, 'A'], [2, 'A'], [4, 'A'], [6, 'A♭']], rh: 'A6+A7:1 G#6+G#7:1 A5+A6:1 G#5+G#6:1 A4+A5:1 G#4+G#5:1 A3+A4:1 G#3+G#4:1', lh: `${trem('A1', 'A2', 6)} ${trem('Ab1', 'Ab2', 2)}`, dyn: 103 },

  // ── V  Collapse: A♭ ground; C major and F♯ major at once ─────────────────────────────
  { h: [[0, 'C|F♯/A♭'], [2, 'C|F♯/A♭'], [4, 'C|F♯/A♭'], [6, 'G|F♯/A♭']], rh: 'C5+E5+G5^:1 A#4+C#5+F#5:1 E5+G5+C6^:1 A#4+C#5+F#5:1 G5+C6+E6^:1 A#4+C#5+F#5:1 G5+B5+D6^:1 A#4+C#5+F#5:1', lh: trem('Ab1', 'Ab2'), dyn: 100, marks: ['precipitando'], wedge: 'cresc' },
  { h: [[0, 'C|F♯/A♭'], [2, 'G|F♯/A♭'], [4, 'Am|F♯/A♭'], [6, 'Em|F♯/A♭']], rh: 'E5+G5+C6^:1 A#4+C#5+F#5:1 D5+G5+B5^:1 A#4+C#5+F#5:1 C5+E5+A5^:1 A#4+C#5+F#5:1 B4+E5+G5^:1 A#4+C#5+F#5:1', lh: trem('Ab1', 'Ab2'), dyn: 104 },
  { h: [[0, 'F|F♯/A♭'], [2, 'Am|F♯/A♭'], [4, 'F|F♯/A♭'], [6, 'C|F♯/A♭']], rh: 'C5+F5+A5^:1 A#4+C#5+F#5:1 E5+A5+C6^:1 A#4+C#5+F#5:1 A5+C6+F6^:1 A#4+C#5+F#5:1 G5+C6+E6^:1 A#4+C#5+F#5:1', lh: trem('Ab1', 'Ab2'), dyn: 108 },
  { h: [[0, 'G|F♯/A♭'], [2, 'G|F♯/A♭'], [4, 'G|F♯/A♭'], [6, 'G|F♯/A♭']], rh: 'G5+B5+D6^:1 A#4+C#5+F#5:1 G5+B5+D6^:1 A#4+C#5+F#5:1 G6+B6+D7^:1 F#6+A#6+C#7:1 G6+B6+D7^:1 F#6+A#6+C#7:1', lh: trem('Ab1', 'Ab2'), dyn: 111 },
  { h: [[0, 'A♭'], [2, 'A♭'], [4, 'A♭'], [6, 'A♭']], rh: 'C7:0.5 B6:0.5 Bb6:0.5 A6:0.5 Ab6:0.5 G6:0.5 Gb6:0.5 F6:0.5 E6:0.5 Eb6:0.5 D6:0.5 Db6:0.5 C6:0.5 B5:0.5 Bb5:0.5 A5:0.5', lh: trem('Ab1', 'Ab2'), dyn: 112 },
  { h: [[0, '—'], [2, '—'], [4, '—'], [6, '—']], rh: 'Ab5:0.5 G5:0.5 Gb5:0.5 F5:0.5 E5:0.5 Eb5:0.5 D5:0.5 Db5:0.5 C5:0.5 B4:0.5 Bb4:0.5 A4:0.5 Ab4:0.5 G4:0.5 Gb4:0.5 F4:0.5', lh: 'Ab2:0.5 A2:0.5 A#2:0.5 B2:0.5 C3:0.5 C#3:0.5 D3:0.5 D#3:0.5 E3:0.5 F3:0.5 F#3:0.5 G3:0.5 G#3:0.5 A3:0.5 A#3:0.5 B3:0.5', dyn: 116, marks: ['stringendo'], wedge: 'stop' },
  { h: [[0, 'A0…C8']], rh: 'F#7+G7+C8^:8', lh: 'A0+Bb0+B0+Ab1^:8', dyn: 124, dm: 'fff', fermata: true, subito: true, hold: 1.2 },
  { h: [[0, '']], rh: 'r:8', lh: 'r:8', dyn: 0, gp: true, fermata: true, marks: ['G.P.'] },

  // ── VI  Aftermath: G ground, a slowing heartbeat ──────────────────────────────────────
  { h: [[0, 'G5']], rh: 'r:6 G4:2', lh: 'G1:1 D2:3 G1:1 D2:3', dyn: 24, dm: 'pp', subito: true, marks: ['Adagio — come da lontano'] },
  { h: [[0, 'Cm/G']], rh: 'C5:4 Eb5:2 D5:2', rh2: 'G4:8', lh: 'G1:1 D2:3 G1:1 D2:3', dyn: 28 },
  { h: [[0, 'Cm/G'], [4, 'G']], rh: 'C5:2 Bb4:2 r:4', rh2: 'Eb4:4 r:4', lh: 'G1:1 D2:3 G1:1 D2:3', dyn: 28 },
  { h: [[0, 'G'], [4, 'A♭/G']], rh: 'r:4 Ab4:2 G4:2', rh2: 'r:4 Eb4:4', lh: 'G1:2 D2:6', dyn: 26 },
  { h: [[0, 'G'], [2, 'Fm/G']], rh: 'r:2 Ab4:2 C5:2 F5:2', rh2: 'r:2 F4:6', lh: 'G1:2 D2:6', dyn: 28 },
  { h: [[0, 'Cm/G']], rh: 'Eb5:2 r:6', rh2: 'G4:2 r:6', lh: 'G1:4 D2:4', dyn: 25 },
  { h: [[0, 'G7']], rh: 'D5:8-', rh2: 'F4+B4:8', lh: 'G1:8', dyn: 33, dm: 'p', marks: ['un ultimo ricordo'] },

  // ── VII  The new world: F♯ Lydian ─────────────────────────────────────────────────────
  { h: [[0, 'F♯']], key: 6, group: [3, 3, 2], rh: 'D5:2 C#5:6', rh2: 'F#4+A#4:8', lh: 'F#1:1 C#2:1 A#2:1 F#2:1 C#3:1 G#3:1 A#3:1 C#3:1', dyn: 28, dm: 'pp', marks: ['Tempo I, luminoso'] },
  { h: [[0, 'F♯'], [6, 'G♯/F♯']], group: [3, 3, 2], rh: 'F#5:4 A#5:2 G#5:2', rh2: 'A#4+C#5:6 B#4+D#5:2', lh: 'F#1:1 C#2:1 A#2:1 F#2:1 C#3:1 G#3:1 B#3:1 D#3:1', dyn: 30 },
  { h: [[0, 'F♯'], [2, 'F♯maj7'], [4, 'D♯m/F♯'], [6, 'C♯/F♯']], group: [3, 3, 2], rh: 'F#5:2 E#5:2 D#5:2 C#5:2', rh2: 'A#4:4 F#4:2 E#4:2', lh: 'F#1:1 C#2:1 A#2:1 F#2:1 C#3:1 A#3:1 G#3:1 E#3:1', dyn: 32 },
  { h: [[0, 'D♯m/F♯'], [2, 'F♯'], [4, 'G♯/F♯'], [6, 'F♯']], group: [3, 3, 2], rh: 'D#5:2 F#5:2 B#5:2 A#5:2', rh2: 'A#4:2 C#5:2 D#5:2 C#5:2', lh: 'F#1:1 C#2:1 A#2:1 D#3:1 F#3:1 A#3:1 B#3:1 G#3:1', dyn: 36, dm: 'p' },
  { h: [[0, 'G♯/F♯'], [4, 'C♯/F♯'], [6, 'F♯']], group: [3, 3, 2], rh: 'G#5:6 C#5:2', rh2: 'B#4+D#5:4 E#5:2 A#4:2', lh: 'F#1:1 C#2:1 G#2:1 D#3:1 G#3:1 B#3:1 D#4:1 B#3:1', dyn: 38 },
  { h: [[0, 'F♯']], group: [3, 3, 2], rh: 'F#5:4 A#5:2 C#6:2', rh2: 'A#4+C#5:8', lh: 'F#1:1 C#2:1 A#2:1 F#2:1 C#3:1 G#3:1 A#3:1 C#3:1', dyn: 42, wedge: 'cresc' },
  { h: [[0, 'D♯m/F♯'], [4, 'C♯/F♯'], [6, 'G♯/F♯']], group: [3, 3, 2], rh: 'D#6:4 C#6:2 B#5:2', rh2: 'F#5:4 E#5:2 D#5:2', lh: 'F#1:1 C#2:1 A#2:1 D#3:1 F#3:1 A#3:1 G#3:1 B#3:1', dyn: 47, dm: 'mp', wedge: 'dim' },
  { h: [[0, 'F♯'], [4, 'G♯/F♯']], group: [3, 3, 2], rh: 'A#5:4 G#5:4', rh2: 'C#5+F#5:4 B#4+D#5:4', lh: 'F#1:1 C#2:1 A#2:1 F#2:1 C#3:1 G#3:1 B#3:1 D#4:1', dyn: 42 },
  { h: [[0, 'F♯']], group: [3, 3, 2], rh: 'F#5:8', rh2: 'A#4+C#5:8', lh: 'F#1:1 C#2:1 A#2:1 F#2:1 C#3:1 G#3:1 A#3:1 C#3:1', dyn: 35, dm: 'p', wedge: 'stop' },
  { h: [[0, 'G♯/F♯'], [4, 'F♯']], group: [3, 3, 2], rh: 'r:4 F#6~:4', rh2: 'B#4+D#5:4 A#4+C#5:4', lh: 'F#1:1 C#2:1 G#2:1 D#3:1 G#3:1 B#3:1 A#3:1 C#3:1', dyn: 30, dm: 'pp', marksAt: { 4: BELL } },
  { h: [[0, 'F♯(♯11)'], [4, 'F♯']], rh: 'B#5:4 C#6+F#6~:4-', rh2: 'F#4+A#4+B#4:8-', lh: 'F#1+C#2+A#2:8-', dyn: 26, dm: 'ppp', roll: true },
  { h: [[0, 'F♯']], rh: 'C#6+F#6:8', rh2: 'F#4+A#4+B#4:8', lh: 'F#1+C#2+A#2:8', dyn: 22, fermata: true, final: true },
];

// ── Tempo: anchor points (bar position from 0, ♩ per minute), joined by smooth cosine
// interpolation so the pulse never jumps at a barline. Steps occur only across silence
// (the crash and the grand pause).
const TEMPO = [
  [0, 58], [1, 63], [7.4, 61], [8, 57], [8.6, 60], [10, 61], [16, 61], [17.5, 59], [18, 61],
  [21, 64], [24, 70], [26, 76], [30, 80], [33, 85], [37, 94], [38.5, 97], [39, 86],
  [39.0001, 64], [40, 64], [40.0001, 68], [41, 68], [41.0001, 60], [44, 60], [47, 54], [47.6, 50],
  [48, 60], [51, 65], [54, 66], [55.5, 64], [56, 61], [60, 61],
];
// Boundary "breaths" (Todd 1985/1992): a smooth dip centred on the join, deeper for
// stronger boundaries; the next phrase eases back in — no stop-and-restart.
const BREATHS = [[4.75, 0.05], [10.75, 0.04], [14.75, 0.05], [17.75, 0.04], [48, 0.07], [52.75, 0.05], [56, 0.06], [57.5, 0.03]];
// Phrase arches (Todd 1992): +2.5 % toward the middle of each phrase, continuous at the ends.
const ARCHES = [[0.75, 4.75], [4.75, 8], [10.75, 14.75], [14.75, 17.75], [48, 52.75], [52.75, 56]];

// ── Parsing ───────────────────────────────────────────────────────────────────────────
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(name) {
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
const parsed = BARS.map((bar, bi) => {
  const v = {};
  for (const name of VOICES) {
    if (!bar[name]) continue;
    const p = parseVoice(bar[name]);
    if (Math.abs(p.total - 8) > 1e-9) throw new Error(`bar ${bi + 1} voice ${name}: ${p.total} eighths`);
    v[name] = p.events;
  }
  return v;
});

// ── Composer's self-checks ────────────────────────────────────────────────────────────
// 1. Outer voices: parallel fifths/octaves between melody and bass at bass attacks
//    (stages I–III and VI–VII, where the texture is tonal part-writing).
function outerVoices() {
  const issues = [];
  let prev = null;
  parsed.forEach((v, bi) => {
    if (bi >= 26 && bi <= 40) { prev = null; return; }
    const attacks = [];
    for (const voice of ['lh', 'lh2']) for (const e of v[voice] || []) if (!e.rest && e.start % 2 === 0) attacks.push(e);
    const byTime = new Map();
    for (const e of attacks) { const p = Math.min(...e.names.map(midi)); if (!byTime.has(e.start) || byTime.get(e.start) > p) byTime.set(e.start, p); }
    // the sounding bass is the lowest held note at each attack
    for (const [at, low] of [...byTime.entries()].sort((a, b) => a[0] - b[0])) {
      const held = (v.lh || []).filter((e) => !e.rest && e.start <= at && e.start + e.dur > at).map((e) => Math.min(...e.names.map(midi)));
      const bassP = Math.min(low, ...held);
      const mel = (v.rh || []).filter((e) => !e.rest && e.start <= at + 1e-9 && e.start + e.dur > at).pop();
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
// 2. No key struck twice at once by two voices; hand spans within reach.
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
      if (span > 16 && !(bi === 39)) out.push(`bar ${bi + 1} ${voice}: chord spans ${span} semitones`);
    }
  });
  return out;
}

// ── Performance model ─────────────────────────────────────────────────────────────────
const N = BARS.length;
const smooth = (t) => (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, t)))) / 2;
function baseTempo(pos) {
  if (pos <= TEMPO[0][0]) return TEMPO[0][1];
  for (let i = 0; i < TEMPO.length - 1; i++) {
    const [a, va] = TEMPO[i]; const [b, vb] = TEMPO[i + 1];
    if (pos >= a && pos <= b) return va + (vb - va) * smooth((pos - a) / (b - a));
  }
  return TEMPO[TEMPO.length - 1][1];
}
const FINAL_FROM = 57.5; // bar position where the final ritardando begins
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
    v *= Math.pow(1 + (0.6 ** 3 - 1) * x, 1 / 3);
  }
  return v;
}
// Integrate time over the score in 1/64-bar steps.
const STEPS = 64;
const secAt = [0];
for (let i = 1; i <= N * STEPS; i++) {
  const pos = (i - 0.5) / STEPS;
  secAt.push(secAt[i - 1] + (4 * 60) / qpm(pos) / STEPS);
}
const toSec = (pos) => { const x = pos * STEPS; const i = Math.min(secAt.length - 2, Math.floor(x)); return secAt[i] + (secAt[i + 1] - secAt[i]) * (x - i); };
const posOf = (bi, eighth) => bi + eighth / 8;

// Dynamics: bar anchors joined linearly (continuous hairpins); "subito" bars step.
function dynAt(pos) {
  const bi = Math.min(N - 1, Math.floor(pos));
  const a = BARS[bi].dyn; const nb = BARS[bi + 1];
  if (!nb || nb.subito || nb.gp || BARS[bi].gp) return a;
  return a + (nb.dyn - a) * (pos - bi);
}

let seed = 20260926;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const CONSONANT_STEP = new Set([3, 4, 5, 7, 8, 9]);

// Resolve ties: merge each tied event with the matching pitches of the next event in the voice.
const flat = {};
for (const voice of VOICES) {
  flat[voice] = [];
  parsed.forEach((v, bi) => { for (const ev of v[voice] || []) flat[voice].push({ ...ev, bi }); });
}
for (const voice of VOICES) {
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
      // Grouping accent: the first note of each 3+3+2 group (the limping clock / the new sway).
      if (bar.group && (role === 'bass' || role === 'figuration')) {
        let acc = 0; for (const g of bar.group) { if (Math.abs(ev.start - acc) < 1e-9) vel += 7; acc += g; }
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
      // Legato (Repp 1997; Bresin & Battel 2000): key overlap into the next melody note,
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

// Pedal: legato ("syncopated") pedalling — the damper lifts just after each new harmony
// is struck and falls back ~80 ms later, so harmonies are joined, never separated by a gap.
const pedalOut = [];
let open = null;
BARS.forEach((bar, bi) => {
  if (bar.gp) return;
  bar.h.forEach(([off]) => {
    const t = toSec(posOf(bi, off));
    if (open) open.endTime = +(t + 0.02).toFixed(4);
    open = { time: +(t + (bi === 39 ? 0.03 : 0.1)).toFixed(4), endTime: null };
    pedalOut.push(open);
  });
  // The crash is held into the grand pause, then the dampers fall: silence.
  if (bi === 39) { open.endTime = +toSec(posOf(40, 1.5)).toFixed(4); open = null; }
});
const end = Math.max(...Object.values(layers).flat().map((n) => n.time + n.dur));
open.endTime = +end.toFixed(3);

const SECTIONS = [['I · The known world', 0, 10], ['II · Omen', 10, 18], ['III · Unease', 18, 26], ['IV · Unravelling', 26, 33], ['V · Collapse', 33, 40], ['Grand pause', 40, 41], ['VI · Aftermath', 41, 48], ['VII · The new world', 48, 60]];
const comp = {
  title: 'As We Know It — the end of the world, in seven stages',
  meta: { style: 'contemporary', styleLabel: 'Tone poem', key: 'C major → F♯ Lydian', tonic: 0, mode: 'major', tempo: 66, quarterTempo: 66, timeSignature: [4, 4], duration: +end.toFixed(2), bars: N, flats: false, mood: 'hand-composed' },
  sections: SECTIONS.map(([name, a, b]) => ({ name, type: 'section', startBar: a, bars: b - a, startTime: +toSec(a).toFixed(3), endTime: +toSec(b).toFixed(3), key: a >= 48 ? 'F♯ Lydian' : 'C' })),
  chords: BARS.flatMap((bar, bi) => bar.h.map(([o, sym], k) => ({ symbol: sym, time: +toSec(posOf(bi, o)).toFixed(3), dur: +(toSec(posOf(bi, bar.h[k + 1]?.[0] ?? 8)) - toSec(posOf(bi, o))).toFixed(3), roman: '' }))),
  bars: BARS.map((_, i) => +toSec(i).toFixed(3)),
  layers, pedal: pedalOut, tempoMap: [{ q: 0, bpm: 60 }],
};

const here = (f) => new URL(f, import.meta.url);
writeFileSync(here('./as_we_know_it.json'), JSON.stringify(comp));
writeFileSync(here('./as_we_know_it_notation.json'), JSON.stringify({ bars: BARS.map((b) => ({ dm: b.dm || null, marks: b.marks || [], marksAt: b.marksAt || null, wedge: b.wedge || null, fermata: !!b.fermata, key: b.key ?? null, group: b.group || null, gp: !!b.gp, tempo: +baseTempo(BARS.indexOf(b)).toFixed(0) })), notes: notation }));

const counts = Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.length]));
const peak = toSec(39);
const soundingEnd = toSec(N);
console.log(`As We Know It: ${N} bars, ${soundingEnd.toFixed(1)} s notated (+ ring ${(end - soundingEnd).toFixed(1)} s), notes ${JSON.stringify(counts)}`);
console.log(`Collapse peak (bar 40) at ${peak.toFixed(1)} s = ${(100 * peak / soundingEnd).toFixed(1)} % of the piece (golden section 61.8 %)`);
for (const [name, a, b] of SECTIONS) console.log(`  ${name.padEnd(22)} ${toSec(a).toFixed(1).padStart(6)} – ${toSec(b).toFixed(1).padStart(6)} s`);
// Largest bar-to-bar jump in local tempo (flow check: should be small everywhere except across silence).
let worst = [0, 0];
for (let i = 1; i < N * STEPS; i++) {
  const pos = i / STEPS; if (pos > 38.99 && pos < 41.03) continue;
  const j = Math.abs(qpm(pos) / qpm(pos - 1 / STEPS) - 1); if (j > worst[0]) worst = [j, pos];
}
console.log(`Flow: largest tempo change between adjacent 1/64-bar steps ${(worst[0] * 100).toFixed(2)} % (bar ${Math.floor(worst[1]) + 1})`);
const pv = outerVoices();
console.log(pv.length ? `Outer voices: ${pv.join('; ')}` : 'Outer voices: no parallel fifths/octaves between melody and bass');
const col = collisions();
console.log(col.length ? `Collisions/spans: ${col.join('; ')}` : 'Voices: no shared keys, chord spans within reach');
