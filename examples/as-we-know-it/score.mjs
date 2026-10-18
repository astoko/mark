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


export const A7 = 'A1:0.5 C2:0.5 Eb2:0.5 F#2:0.5 A2:0.5 C3:0.5 Eb3:0.5 F#3:0.5 A3:0.5 F#3:0.5 Eb3:0.5 C3:0.5 A2:0.5 F#2:0.5 Eb2:0.5 C2:0.5'; // A°7 wave
export const CS7 = 'A1:0.5 C#2:0.5 E2:0.5 G2:0.5 A#2:0.5 C#3:0.5 E3:0.5 G3:0.5 A#3:0.5 G3:0.5 E3:0.5 C#3:0.5 A#2:0.5 G2:0.5 E2:0.5 C#2:0.5'; // C♯°7 over A = A7♭9
export const trem = (a, b, n = 8) => Array(n).fill(`${a}:0.5 ${b}:0.5`).join(' ');
export const BELL = 'lontano, come una campana';
export const BARS = [
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
