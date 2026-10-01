// ESTUARY — Nocturne for piano (where a river meets the sea)
// Composed by hand, note by note. Every melody, inner voice, bass note, dynamic and tempo
// inflection below was written deliberately; the code only turns the written score into a
// performance (timing, touch, pedal) and a notation file. See RESEARCH.md for the sources
// behind each decision.
//
// Notation: each voice is a string of "Note:eighths" tokens (6/8 bar = 6 eighths),
// chords joined with "+", rests "r". Voices: rh (melody), rh2 (right-hand inner),
// lh (bass), lh2 (left-hand tenor theme or figuration).
//
// FORM (66 bars; golden section 0.618 × 66 = 40.8 → the confluence begins in bar 41)
//   1–4    Prelude  — "the source": falling bell-drops over an E pedal
//   5–20   River    — Theme A, E major, a sentence-built period (HC bar 12, PAC bar 19)
//   21–22  Link     — the river sinks into C♯ minor
//   23–30  Sea      — Theme B in the tenor (left-hand thumb) under rippling offbeat sixths
//   31–40  Brackish water — hexatonic cycle G♯m→E→Em→C→Cm→A♭→(=)G♯m, every chord change a
//                     single semitone; the River motif sinks by major thirds while the Sea
//                     answers; enharmonic turn (A♭m = G♯m) and a surge over V7
//   41–56  Confluence — both themes at once: River in octaves above, Sea in the tenor,
//                     entering an eighth later (onset asynchrony keeps them separable)
//   57–66  Coda     — the Sea theme sung high in major, last River echo, IV–iv–(hexatonic
//                     pole: C minor)–I, and the bell-drops of the opening

import { writeFileSync } from 'node:fs';

const BARS = [
  // ── Prelude: the source ─────────────────────────────────────────────────────────────
  { h: [[0, 'E']], rh: 'E6:3 B5:3', lh: 'E1+B1:6', dyn: 30, tempo: 0.82, dm: 'pp', marks: ['Andante con moto — come un fiume', 'con Ped.'] },
  { h: [[0, 'A/E']], rh: 'C#6:3 A5:3', lh: 'E1+A2:6', dyn: 32, tempo: 0.82 },
  { h: [[0, 'E']], rh: 'B5:3 G#5:3', lh: 'E1+B1:6', dyn: 34, tempo: 0.82 },
  { h: [[0, 'B7']], rh: 'F#5:3 D#5:2 B4:1', lh: 'B1+A2:6', dyn: 38, tempo: 0.76 },

  // ── River (Theme A): antecedent — sentence, half cadence ───────────────────────────
  { h: [[0, 'E']], rh: 'G#5:3 F#5:1 E5:1 C#5:1', lh: 'E2:6', lh2: 'r:1 B2:1 G#3:1 B3:1 G#3:1 B2:1', dyn: 48, tempo: 1, dm: 'p', marks: ['dolce cantabile'], phrase: true },
  { h: [[0, 'A']], rh: 'B4:3 A4:2 C#5:1', lh: 'A1:6', lh2: 'r:1 E2:1 C#3:1 E3:1 C#3:1 E2:1', dyn: 50 },
  { h: [[0, 'B7']], rh: 'A5:3 G#5:1 F#5:1 D#5:1', lh: 'B1:6', lh2: 'r:1 F#2:1 D#3:1 F#3:1 D#3:1 B2:1', dyn: 54 },
  { h: [[0, 'G#m']], rh: 'C#5:3 B4:3', lh: 'G#2:6', lh2: 'r:1 D#3:1 G#3:1 B3:1 G#3:1 D#3:1', dyn: 52 },
  { h: [[0, 'C#m'], [3, 'F#m7']], rh: 'G#5:2 E5:1 A5:2 F#5:1', lh: 'C#2:3 F#1:3', lh2: 'r:1 G#2:1 E3:1 r:1 C#3:1 A3:1', dyn: 56 },
  { h: [[0, 'F#/A#'], [3, 'B']], rh: 'B5:2 A#5:1 B5:3', lh: 'A#1:3 B1:3', lh2: 'r:1 F#2:1 C#3:1 r:1 F#2:1 D#3:1', dyn: 62, dm: 'mp' },
  { h: [[0, 'A/C#'], [3, 'F#m7']], rh: 'A5:2 G#5:1 F#5:3', lh: 'C#2:3 F#1:3', lh2: 'r:1 A2:1 E3:1 r:1 C#2:1 A2:1', dyn: 56 },
  { h: [[0, 'Bsus4'], [3, 'B']], rh: 'E5:3 D#5:2 B4:1', lh: 'B1:6', lh2: 'r:1 F#2:1 B2:1 F#3:1 B2:1 F#2:1', dyn: 50, tempo: 0.94 },
  // consequent — the same opening, then higher, a major→minor sigh (IV→iv), perfect cadence
  { h: [[0, 'E']], rh: 'G#5:3 F#5:1 E5:1 C#5:1', lh: 'E2:6', lh2: 'r:1 B2:1 G#3:1 B3:1 G#3:1 B2:1', dyn: 50, dm: 'p', phrase: true },
  { h: [[0, 'A']], rh: 'B4:3 A4:2 C#5:1', lh: 'A1:6', lh2: 'r:1 E2:1 C#3:1 E3:1 C#3:1 E2:1', dyn: 52 },
  { h: [[0, 'B7']], rh: 'A5:3 G#5:1 F#5:1 D#5:1', lh: 'B1:6', lh2: 'r:1 F#2:1 D#3:1 F#3:1 D#3:1 B2:1', dyn: 56 },
  { h: [[0, 'C#m']], rh: 'C#5:3 E5:3', lh: 'C#2:6', lh2: 'r:1 G#2:1 E3:1 G#3:1 E3:1 G#2:1', dyn: 58 },
  { h: [[0, 'A'], [3, 'Am']], rh: 'C#6:2 B5:1 C6:2 B5:1', lh: 'A1:6', lh2: 'r:1 E2:1 C#3:1 r:1 E2:1 C3:1', dyn: 64, dm: 'mf', marks: ['espress.'] },
  { h: [[0, 'E/B'], [3, 'B7']], rh: 'G#5:3 F#5:2 D#5:1', lh: 'B1:6', lh2: 'r:1 G#2:1 E3:1 r:1 A2:1 D#3:1', dyn: 56, tempo: 0.95 },
  { h: [[0, 'E']], rh: 'E5:3 D#5:1 C#5:1 B4:1', lh: 'E2:6', lh2: 'r:1 B2:1 G#3:1 B3:1 G#3:1 B2:1', dyn: 52, tempo: 0.97, dm: 'p' },
  { h: [[0, 'E'], [3, 'C#m']], rh: 'G#4:3 E4:3', lh: 'E2:3 C#2:3', lh2: 'r:1 B2:1 G#3:1 r:1 G#2:1 E3:1', dyn: 44, tempo: 0.93 },

  // ── Link ────────────────────────────────────────────────────────────────────────────
  { h: [[0, 'C#m']], rh: 'r:1 G#4+E5:1 E4+C#5:1 r:1 G#4+E5:1 E4+C#5:1', lh: 'C#2+G#2:6', dyn: 40, tempo: 0.94, dm: 'pp', marks: ['più tranquillo'], phrase: true },
  { h: [[0, 'G#7']], rh: 'r:1 B#4+F#5:1 G#4+D#5:1 r:1 B#4+F#5:1 G#4+D#5:1', lh: 'G#1+D#2:6', dyn: 42, tempo: 0.94 },

  // ── Sea (Theme B): the melody in the tenor, sixths lapping above on the offbeats ───────
  { h: [[0, 'C#m']], rh: 'r:1 G#4+E5:1 E4+C#5:1 r:1 G#4+E5:1 E4+C#5:1', lh: 'C#2:6', lh2: 'C#3:3 E3:3', dyn: 44, tempo: 0.94, dm: 'p', marks: ['cantabile, la melodia nel tenore'], tenor: true, phrase: true },
  { h: [[0, 'A/C#']], rh: 'r:1 A4+E5:1 E4+C#5:1 r:1 A4+E5:1 E4+C#5:1', lh: 'C#2:6', lh2: 'A3:6', dyn: 46, tenor: true },
  { h: [[0, 'G#7']], rh: 'r:1 B#4+F#5:1 G#4+D#5:1 r:1 B#4+F#5:1 G#4+D#5:1', lh: 'G#1:6', lh2: 'G#3:3 F#3:3', dyn: 50, tenor: true },
  { h: [[0, 'C#m']], rh: 'r:1 G#4+E5:1 E4+C#5:1 r:1 G#4+E5:1 E4+C#5:1', lh: 'C#2:6', lh2: 'E3:6', dyn: 46, tenor: true },
  { h: [[0, 'A'], [3, 'F#m']], rh: 'r:1 A4+E5:1 E4+C#5:1 r:1 A4+F#5:1 F#4+C#5:1', lh: 'A1:3 F#1:3', lh2: 'C#3:3 F#3:3', dyn: 48, tenor: true, phrase: true },
  { h: [[0, 'D#ø7'], [3, 'G#']], rh: 'r:1 A4+F#5:1 F#4+C#5:1 r:1 B#4+G#5:1 G#4+D#5:1', lh: 'D#2:3 G#1:3', lh2: 'A3:3 G#3:3', dyn: 52, tenor: true },
  { h: [[0, 'F#m'], [3, 'D#ø7']], rh: 'r:1 A4+F#5:1 F#4+C#5:1 r:1 A4+F#5:1 F#4+C#5:1', lh: 'F#1:3 D#2:3', lh2: 'A3:3 F#3:3', dyn: 50, tenor: true },
  { h: [[0, 'G#']], rh: 'r:1 B#4+G#5:1 G#4+D#5:1 r:1 B#4+G#5:1 G#4+D#5:1', lh: 'G#1:6', lh2: 'G#3:6', dyn: 46, tempo: 0.9, tenor: true },

  // ── Brackish water: the hexatonic cycle (P, L, P, L, P, L) ────────────────────────────
  { h: [[0, 'G#m']], rh: 'B5:3 A#5:1 G#5:1 E5:1', lh: 'G#1:6', lh2: 'r:1 D#2:1 B2:1 D#3:1 B2:1 D#2:1', dyn: 44, tempo: 0.92, dm: 'p', marks: ['misterioso'], phrase: true },
  { h: [[0, 'E']], rh: 'E5:5 B4:1', lh: 'E2:6', lh2: 'r:1 E3:2 G#3:3', dyn: 42, tenorAnswer: true },
  { h: [[0, 'Em']], rh: 'G5:3 F#5:1 E5:1 C5:1', lh: 'E2:6', lh2: 'r:1 B2:1 G3:1 B3:1 G3:1 B2:1', dyn: 44 },
  { h: [[0, 'C']], rh: 'C5:5 G4:1', lh: 'C2:6', lh2: 'r:1 C3:2 E3:3', dyn: 40, dm: 'pp', tenorAnswer: true },
  { h: [[0, 'Cm']], rh: 'Eb5:3 D5:1 C5:1 Ab4:1', lh: 'C2:6', lh2: 'r:1 G2:1 Eb3:1 G3:1 Eb3:1 G2:1', dyn: 44, phrase: true },
  { h: [[0, 'Ab']], rh: 'Ab4:5 D#4:1', lh: 'Ab1:6', lh2: 'r:1 Ab2:2 C3:3', dyn: 42, tenorAnswer: true },
  { h: [[0, 'G#m']], rh: 'B4:3 A#4:1 G#4:1 E4:1', lh: 'G#1:6', lh2: 'r:1 G#2:2 B2:3', dyn: 50, dm: 'p', marks: ['poco a poco cresc.'], tenorAnswer: true, wedge: 'start' },
  { h: [[0, 'C#7']], rh: 'G#4:1 B4:1 E#5:1 G#5:3', lh: 'C#2:6', lh2: 'r:1 G#2:1 E#3:1 G#3:1 B3:1 E#3:1', dyn: 62, tempo: 1.04, dm: 'mf', marks: ['stringendo'], phrase: true },
  { h: [[0, 'F#m7'], [3, 'A#°7']], rh: 'A5:3 C#6:2 E6:1', lh: 'F#1:3 A#1:3', lh2: 'r:1 C#3:1 A3:1 r:1 E3:1 G3:1', dyn: 80, tempo: 1.08, dm: 'f' },
  { h: [[0, 'B7']], rh: 'D#6:3 B5:0.5 A5:0.5 F#5:0.5 D#5:0.5 B4:1', lh: 'B1+B2:6', lh2: 'r:1 F#3:1 A3:1 F#3:1 D#3:1 A2:1', dyn: 96, tempo: 0.9, dm: 'ff', marks: ['allargando'], wedge: 'stop' },

  // ── Confluence: both themes together (golden section) ───────────────────────────────
  { h: [[0, 'E']], rh: 'G#5+B5+E6+G#6:3 F#5+F#6:1 E5+E6:1 C#5+C#6:1', lh: 'E1+E2:6', lh2: 'r:1 E3:3 G#3:2', dyn: 112, tempo: 0.88, dm: 'ff', marks: ['Grandioso, largamente'], tenor: true, phrase: true, roll: true },
  { h: [[0, 'A']], rh: 'B4+E5+B5:3 A4+C#5+A5:2 C#5+C#6:1', lh: 'A1+A2:6', lh2: 'r:1 C#4:5', dyn: 104, tempo: 0.9, tenor: true },
  { h: [[0, 'B7']], rh: 'A5+D#6+A6:3 G#5+G#6:1 F#5+F#6:1 D#5+D#6:1', lh: 'B1+B2:6', lh2: 'r:1 B3:3 A3:2', dyn: 106, tempo: 0.92, tenor: true },
  { h: [[0, 'G#m']], rh: 'C#5+G#5+C#6:3 B4+D#5+B5:3', lh: 'G#1+G#2:6', lh2: 'r:1 G#3:5', dyn: 98, tempo: 0.92, tenor: true },
  { h: [[0, 'C#m'], [3, 'F#m7']], rh: 'G#5+C#6+G#6:2 E5+E6:1 A5+C#6+A6:2 F#5+F#6:1', lh: 'C#1+C#2:3 F#1+F#2:3', lh2: 'r:1 E3:2 r:1 A3:2', dyn: 104, tempo: 0.95, tenor: true, phrase: true, wedge: 'start' },
  { h: [[0, 'F#/A#'], [3, 'B']], rh: 'B5+E6+B6:2 A#5+A#6:1 B5+D#6+F#6+B6:3', lh: 'A#1+A#2:3 B1+B2:3', lh2: 'r:1 C#4:2 r:1 B3:2', dyn: 116, tempo: 0.9, dm: 'fff', tenor: true, wedge: 'stop', roll: true },
  { h: [[0, 'A/C#'], [3, 'F#m7']], rh: 'A5+C#6+E6+A6:2 G#5+G#6:1 F#5+A5+C#6+F#6:3', lh: 'C#2+C#3:3 F#1+F#2:3', lh2: 'r:1 C#4:2 r:1 A3:2', dyn: 102, tempo: 0.9, tenor: true, wedge: 'dim-start' },
  { h: [[0, 'Bsus4'], [3, 'B']], rh: 'E5+B5+E6:3 D#5+F#5+D#6:2 B4+B5:1', lh: 'B1+B2:6', lh2: 'r:1 B3:5', dyn: 92, tempo: 0.86, tenor: true, wedge: 'dim-stop' },
  { h: [[0, 'E']], rh: 'G#5:3 F#5:1 E5:1 C#5:1', rh2: 'B4:3 G#4:3', lh: 'E2:6', lh2: 'r:1 E3:3 G#3:2', dyn: 72, tempo: 1, dm: 'mf', marks: ['Tempo I, con calore'], tenor: true, phrase: true },
  { h: [[0, 'A']], rh: 'B4:3 A4:2 C#5:1', rh2: 'E4:6', lh: 'A1:6', lh2: 'r:1 C#4:5', dyn: 70, tenor: true },
  { h: [[0, 'B7']], rh: 'A5:3 G#5:1 F#5:1 D#5:1', rh2: 'D#5:3 B4:3', lh: 'B1:6', lh2: 'r:1 B3:3 A3:2', dyn: 74, tenor: true },
  { h: [[0, 'C#m']], rh: 'C#5:3 E5:3', rh2: 'G#4:6', lh: 'C#2:6', lh2: 'r:1 G#3:5', dyn: 78, dm: 'f', tenor: true },
  { h: [[0, 'A'], [3, 'Am']], rh: 'C#6:2 B5:1 C6:2 B5:1', rh2: 'E5+A5:3 E5+A5:3', lh: 'A1:6', lh2: 'r:1 E3:5', dyn: 84, dynAt: { 3: 48 }, dmAt: { 3: 'subito p' }, tenor: true, phrase: true, hold: { 3: 1.25 } },
  { h: [[0, 'E/B'], [3, 'B7']], rh: 'G#5:3 F#5:2 D#5:1', rh2: 'B4+E5:3 A4+B4:3', lh: 'B1:6', lh2: 'r:1 B3:3 A3:2', dyn: 52, tempo: 0.88, marks: ['rit.'], tenor: true },
  { h: [[0, 'E']], rh: 'E5:6', rh2: 'G#4+B4:6', lh: 'E2:6', lh2: 'r:1 G#3:5', dyn: 56, tempo: 0.92, marks: ['a tempo'], tenor: true },
  { h: [[0, 'E']], rh: 'E5:3 B4:3', lh: 'E2:6', lh2: 'r:1 B2:1 G#3:1 B3:1 G#3:1 B2:1', dyn: 44, tempo: 0.9, dm: 'p' },

  // ── Coda: the sea in the sky ─────────────────────────────────────────────────────────
  { h: [[0, 'E']], rh: 'E5:3 G#5:3', lh: 'E1+B1:6', lh2: 'G#3+B3:6', dyn: 36, tempo: 0.88, dm: 'pp', marks: ['dolcissimo'], phrase: true },
  { h: [[0, 'A/E']], rh: 'C#6:6', lh: 'E1+A2:6', lh2: 'E3+A3:6', dyn: 34, tempo: 0.88 },
  { h: [[0, 'B7/E']], rh: 'B5:3 A5:3', lh: 'E1:6', lh2: 'D#3+A3:6', dyn: 32, tempo: 0.88 },
  { h: [[0, 'E']], rh: 'G#5:5 B4:1', lh: 'E1+B1:6', lh2: 'G#3+B3:6', dyn: 34, tempo: 0.86 },
  { h: [[0, 'E']], rh: 'G#5:3 F#5:1 E5:1 C#5:1', lh: 'E1+B1:6', lh2: 'r:1 B2:1 G#3:1 B3:1 G#3:1 B2:1', dyn: 30, tempo: 0.86, dm: 'ppp', phrase: true },
  { h: [[0, 'A'], [3, 'Am']], rh: 'B4:3 A4:3', lh: 'A1:6', lh2: 'r:1 E2:1 C#3:1 r:1 E2:1 C3:1', dyn: 28, tempo: 0.82, marks: ['rall.'] },
  { h: [[0, 'Cm']], rh: 'G4:6', rh2: 'C4+Eb4:6', lh: 'C2+C3:6', dyn: 30, tempo: 0.76, marks: ["come un'ombra"] },
  { h: [[0, 'E']], rh: 'G#4:6', rh2: 'B3+E4:6', lh: 'E2+E3:6', dyn: 32, tempo: 0.74, marks: ['luce'] },
  { h: [[0, 'E']], rh: 'E6:3 B5:3', lh: 'E1+B1:6', dyn: 28, tempo: 0.72 },
  { h: [[0, 'E']], rh: 'G#5:6', rh2: 'E4+B4+E5:6', lh: 'E1+B1+E2:6', lh2: 'B2+G#3:6', dyn: 24, tempo: 0.62, fermata: true, roll: true, final: true },
];

// Tempo curve, bar by bar (1 = ♩. 46). Broad at the source, flowing river, a slower tidal Sea,
// a hushed misterioso that surges (stringendo) then broadens (allargando) into the confluence,
// and a coda that relaxes toward the final stop. Proportioned so the confluence falls at the
// golden section of the piece's *duration*, not just its bar count.
const TEMPO = [
  0.72, 0.72, 0.72, 0.64, // prelude
  0.97, 0.97, 0.97, 0.97, 0.98, 0.99, 0.97, 0.9, 0.97, 0.97, 0.98, 0.99, 0.98, 0.93, 0.94, 0.88, // river
  0.86, 0.86, // link
  0.85, 0.85, 0.85, 0.84, 0.85, 0.86, 0.85, 0.8, // sea
  0.86, 0.85, 0.85, 0.84, 0.85, 0.85, 0.88, 1.0, 1.05, 0.88, // brackish water
  0.9, 0.92, 0.94, 0.94, 0.97, 0.92, 0.92, 0.88, 1.02, 1.02, 1.03, 1.04, 1.0, 0.9, 0.94, 0.92, // confluence
  0.96, 0.96, 0.95, 0.93, 0.92, 0.87, 0.8, 0.78, 0.76, 0.68, // coda
];
if (TEMPO.length !== BARS.length) throw new Error('tempo curve length');
BARS.forEach((b, i) => { b.tempo = TEMPO[i]; });

// ── Parsing ───────────────────────────────────────────────────────────────────────────
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(name) {
  const m = /^([A-G])(##|#|bb|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const acc = { '#': 1, '##': 2, b: -1, bb: -2 }[m[2]] || 0;
  return PC[m[1]] + acc + (Number(m[3]) + 1) * 12;
}
function parseVoice(str) {
  const out = []; let t = 0;
  for (const tok of str.trim().split(/\s+/)) {
    const [notes, durS] = tok.split(':');
    const d = Number(durS);
    if (notes !== 'r') out.push({ start: t, dur: d, names: notes.split('+') });
    else out.push({ start: t, dur: d, rest: true });
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
    if (Math.abs(p.total - 6) > 1e-9) throw new Error(`bar ${bi + 1} voice ${name}: ${p.total} eighths`);
    v[name] = p.events;
  }
  return v;
});

// ── Composer's self-check: outer-voice parallel fifths/octaves at bass changes ─────────
function outerVoices() {
  const issues = [];
  let prev = null;
  parsed.forEach((v, bi) => {
    const bassEvents = (v.lh || []).filter((e) => !e.rest);
    for (const b of bassEvents) {
      const at = b.start;
      const mel = (v.rh || []).filter((e) => !e.rest && e.start <= at + 1e-9).pop();
      if (!mel) continue;
      const bassP = Math.min(...b.names.map(midi));
      const melP = Math.max(...mel.names.map(midi));
      if (prev) {
        const mv = melP - prev.mel; const bv = bassP - prev.bass;
        const i1 = ((prev.mel - prev.bass) % 12 + 12) % 12; const i2 = ((melP - bassP) % 12 + 12) % 12;
        if (mv && bv && mv % 12 && bv % 12 && Math.sign(mv) === Math.sign(bv) && i1 === i2 && (i1 === 0 || i1 === 7)) issues.push(`bar ${bi + 1}: parallel ${i1 ? 'fifths' : 'octaves'}`);
      }
      prev = { mel: melP, bass: bassP };
    }
  });
  return issues;
}

// ── Performance (research-based expressive rules) ─────────────────────────────────────
const QUARTER_BPM = 69; // ♩. = 46
const EIGHTH = 60 / (QUARTER_BPM * 2);
const phraseStarts = BARS.map((b, i) => (b.phrase || i === 0 ? i : -1)).filter((i) => i >= 0);
const phraseOf = (bi) => { let s = 0; for (const p of phraseStarts) if (p <= bi) s = p; const e = phraseStarts.find((p) => p > bi) ?? BARS.length; return [s, e]; };
const TOTAL_E = BARS.length * 6;
const FINAL_RIT_FROM = (BARS.length - 3) * 6;

function tempoFactor(e) {
  const bi = Math.min(BARS.length - 1, Math.floor(e / 6));
  const bar = BARS[bi];
  let f = bar.tempo ?? 1;
  const [s, end] = phraseOf(bi);
  const x = (e - s * 6) / ((end - s) * 6);
  // Phrase arch (Todd 1992; KTH phrase-arch rule): push toward the middle, relax into the cadence;
  // parabolic group-final lengthening (Repp 1992).
  f *= 1 + 0.035 * Math.sin(Math.PI * x) - 0.09 * Math.max(0, (x - 0.82) / 0.18) ** 2;
  // Initial-downbeat lengthening at theme entries (Repp 1998).
  if (bar.phrase && e - bi * 6 < 1) f *= 0.9;
  // Local holds written into the score (e.g. the subito-piano sigh).
  if (bar.hold) for (const [at, k] of Object.entries(bar.hold)) if (e - bi * 6 >= Number(at) && e - bi * 6 < Number(at) + 1) f /= k;
  // Final ritardando after the stopping-runner model (Friberg & Sundberg 1999): v(x) = [1 + (w^q − 1)x]^(1/q), q = 3.
  if (e >= FINAL_RIT_FROM) {
    const xr = (e - FINAL_RIT_FROM) / (TOTAL_E - FINAL_RIT_FROM);
    const w = 0.55; const q = 3;
    f *= Math.pow(1 + (w ** q - 1) * xr, 1 / q) / (bar.tempo ?? 1) * (BARS[BARS.length - 3].tempo ?? 1);
  }
  return f;
}
const RES = 1 / 16;
const secAt = [0];
for (let i = 1; i <= TOTAL_E / RES; i++) secAt.push(secAt[i - 1] + (RES * EIGHTH) / tempoFactor((i - 0.5) * RES));
const toSec = (e) => { const x = e / RES; const i = Math.min(secAt.length - 2, Math.floor(x)); return secAt[i] + (secAt[i + 1] - secAt[i]) * (x - i); };

let seed = 20260926;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

const layers = { melody: [], harmony: [], bass: [] };
const notation = [];
parsed.forEach((v, bi) => {
  const bar = BARS[bi];
  const e0 = bi * 6;
  const [ps, pe] = phraseOf(bi);
  for (const voice of VOICES) {
    for (const ev of v[voice] || []) {
      const rolled = !!(bar.roll && !ev.rest && ev.start === 0 && (bar.final || voice === 'rh'));
      notation.push({ bar: bi, voice, start: ev.start, dur: ev.dur, names: ev.names || null, rest: !!ev.rest, fermata: !!bar.fermata, arp: rolled });
      if (ev.rest) continue;
      const isTenorTheme = voice === 'lh2' && (bar.tenor || bar.tenorAnswer);
      const role = voice === 'rh' ? (bar.rh.startsWith('r') ? 'ripple' : 'melody')
        : voice === 'rh2' ? 'inner' : voice === 'lh' ? 'bass' : isTenorTheme ? 'tenor' : 'figuration';
      let dyn = bar.dyn;
      if (bar.dynAt) for (const [at, val] of Object.entries(bar.dynAt)) if (ev.start >= Number(at)) dyn = val;
      const x = (e0 + ev.start - ps * 6) / ((pe - ps) * 6);
      const arch = 7 * Math.sin(Math.PI * Math.min(1, x)) - 2; // phrase crescendo–diminuendo (Todd 1992)
      const onset = e0 + ev.start;
      const tf = tempoFactor(onset);
      ev.names.forEach((nm, k) => {
        const p = midi(nm);
        let vel = dyn + arch + 14 * (tf - (bar.tempo ?? 1)); // "the faster, the louder" coupling (Todd 1992)
        if (role === 'melody') vel += 10 + Math.max(0, p - 72) * 0.25 - (k > 0 && ev.names.length > 1 && p < Math.max(...ev.names.map(midi)) ? 12 : 0); // melody prominence, high-loud (KTH); inner chord tones softer
        // The tenor theme must survive the high-voice superiority effect (Trainor et al. 2014):
        // when it carries the melody alone it is voiced clearly above the offbeat ripples.
        if (role === 'tenor') vel += (bar.rh || '').startsWith('r') ? 14 : bar.tenorAnswer ? 8 : 2;
        if (role === 'ripple') vel -= 16;
        if (role === 'inner') vel -= 12;
        if (role === 'figuration') vel -= 16 + (ev.start % 3 === 0 ? 0 : 2);
        if (role === 'bass') vel -= 5;
        vel += (rnd() - 0.5) * 4;
        const velocity = Math.round(Math.max(14, Math.min(122, vel)));
        let t = toSec(onset);
        const tEnd = toSec(onset + ev.dur);
        // Melody lead: ~velocity-driven asynchrony (Goebl 2001; Palmer 1996), capped at 25 ms.
        if (role === 'melody' || role === 'tenor') t -= Math.min(0.025, Math.max(0, (velocity - (dyn - 10)) * 0.0009));
        // Rolled chords (arpeggiando) where marked.
        if (rolled) {
          const order = bar.final ? ['lh', 'lh2', 'rh2', 'rh'].indexOf(voice) * 4 + k : k;
          t += order * (bar.final ? 0.075 : 0.012);
        }
        // Articulation: legato overlap for long notes, slight separation of figuration, phrase-final micro-pause (KTH punctuation/duration contrast).
        let dur = tEnd - t;
        if (ev.dur >= 3 && role !== 'figuration') dur *= 1.04;
        if (role === 'figuration' || role === 'ripple') dur *= 0.92;
        const phraseEnd = bi + 1 === pe && ev.start + ev.dur >= 6 - 1e-9;
        if (phraseEnd && role === 'melody') dur *= 0.86;
        if (bar.final) dur += 5.5;
        const layer = role === 'melody' || role === 'tenor' ? 'melody' : role === 'bass' ? 'bass' : 'harmony';
        layers[layer].push({ pitch: p, time: +Math.max(0, t).toFixed(4), dur: +Math.max(0.08, dur).toFixed(4), velocity, start: +(onset / 2).toFixed(4), beats: +(ev.dur / 2).toFixed(4), perfStart: +Math.max(0, t).toFixed(4), perfBeats: +Math.max(0.08, dur).toFixed(4) });
      });
    }
  }
});
for (const l of Object.values(layers)) l.sort((a, b) => a.time - b.time);

// Pedal: legato ("syncopated") pedalling at each change of harmony; long pedals over the E pedal points.
const pedal = [];
const LONG = new Set([0, 1, 2, 56, 57, 58, 59, 64, 65]);
BARS.forEach((bar, bi) => {
  bar.h.forEach(([off], hi) => {
    const s = bi * 6 + off;
    const e = bi * 6 + (bar.h[hi + 1]?.[0] ?? 6);
    const last = pedal[pedal.length - 1];
    if (LONG.has(bi) && last && LONG.has(Math.floor(last.startE / 6)) && Math.floor(last.startE / 6) === bi - 1 && off === 0 && !(bi === 64)) { last.endE = e; return; }
    pedal.push({ startE: s + 0.12, endE: e - 0.04 });
  });
});
const end = Math.max(...Object.values(layers).flat().map((n) => n.time + n.dur));
const pedalOut = pedal.map((p) => ({ time: +toSec(p.startE).toFixed(4), endTime: +toSec(p.endE).toFixed(4) }));
pedalOut[pedalOut.length - 1].endTime = +end.toFixed(3);

const SECTIONS = [['Prelude — the source', 0, 4], ['River (Theme A)', 4, 20], ['Link', 20, 22], ['Sea (Theme B, tenor)', 22, 30], ['Brackish water (hexatonic cycle)', 30, 40], ['Confluence (A + B together)', 40, 56], ['Coda — the sea in the sky', 56, 66]];
const comp = {
  title: 'Estuary — Nocturne for piano',
  meta: { style: 'romantic', styleLabel: 'Nocturne', key: 'E major', tonic: 4, mode: 'major', tempo: 46, quarterTempo: 69, timeSignature: [6, 8], duration: +end.toFixed(2), bars: BARS.length, flats: false, mood: 'hand-composed' },
  sections: SECTIONS.map(([name, a, b]) => ({ name, type: 'section', startBar: a, bars: b - a, startTime: +toSec(a * 6).toFixed(3), endTime: +toSec(b * 6).toFixed(3), key: 'E major' })),
  chords: BARS.flatMap((bar, bi) => bar.h.map(([o, sym], k) => ({ symbol: sym.replace('#', '♯').replace('b', '♭'), time: +toSec(bi * 6 + o).toFixed(3), dur: +(toSec(bi * 6 + (bar.h[k + 1]?.[0] ?? 6)) - toSec(bi * 6 + o)).toFixed(3), roman: '' }))),
  bars: BARS.map((_, i) => +toSec(i * 6).toFixed(3)),
  layers, pedal: pedalOut, tempoMap: [{ q: 0, bpm: 60 }],
};

const here = (f) => new URL(f, import.meta.url);
writeFileSync(here('./estuary.json'), JSON.stringify(comp));
writeFileSync(here('./estuary_notation.json'), JSON.stringify({ bars: BARS.map((b) => ({ dm: b.dm || null, dmAt: b.dmAt || null, marks: b.marks || [], wedge: b.wedge || null, fermata: !!b.fermata })), notes: notation }));

const golden = toSec(40 * 6) / end;
const counts = Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.length]));
console.log(`Estuary: ${BARS.length} bars, ${end.toFixed(1)} s, notes ${JSON.stringify(counts)}`);
console.log(`Confluence (bar 41) begins at ${toSec(240).toFixed(1)} s = ${(golden * 100).toFixed(1)}% of the piece (golden section 61.8%)`);
const pv = outerVoices();
console.log(pv.length ? `Outer-voice check: ${pv.join('; ')}` : 'Outer-voice check: no parallel fifths/octaves between melody and bass');
