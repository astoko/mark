// IRON PARADE — a march for piano (Tempo di marcia, vivo)
// Composed by hand, note by note; the code only performs it (see ../as-we-know-it/perform.mjs).
//
// Built like a band march (Sousa's form), then pushed harder:
//   • FANFARE — dotted trumpet calls over a timpani pedal on D, a roll, a crash, silence;
//   • FIRST STRAIN — G minor, dry and staccato: an oom-pah left hand (bass on 1 and 3,
//     chord on 2 and 4) under a dotted tune that climbs a sixth and falls back;
//   • SECOND STRAIN — the tune goes to the basses: octaves in the left hand, pianissimo,
//     the right hand only ticking off-beat chords; then the whole band takes it, ff;
//   • TRIO — the key changes to E♭ major, the pedal comes down, the tune turns lyrical
//     (the classic soft trio);
//   • DOGFIGHT — the breakstrain: ff runs in the bass answered by pp phrases, climbing
//     chromatically to a D7 crash — silence — which resolves deceptively onto E♭;
//   • GRANDIOSO — the trio tune in full octaves, fff, the bass in octaves, accelerating;
//     a last tonic chord, a beat of silence, and the stinger.
//
// FORM (79 bars, 4/4, G minor → E♭ major)
//   1–4    Fanfare
//   5–20   First strain (G minor)
//   21–28  Second strain · basses, pp
//   29–36  Second strain · tutti, ff
//   37–40  Transition (C minor → B♭7)
//   41–55  Trio (E♭ major), dolce
//   56–63  Dogfight — crash on bar 62, silence
//   64–79  Grandioso, stinger

import { perform } from '../as-we-know-it/perform.mjs';

const s16 = (arr) => arr.map((n) => `${n}:0.5`).join(' ');
// Left-hand voicings: [bass octave on 1, bass octave on 3, chord on 2 and 4]
const V = {
  Gm: ['G1+G2', 'D2+D3', 'D3+G3+Bb3'], Cm: ['C2+C3', 'G1+G2', 'C3+Eb3+G3'], D7: ['D2+D3', 'A1+A2', 'A2+C3+F#3'],
  D: ['D2+D3', 'A1+A2', 'A2+D3+F#3'], Eb: ['Eb1+Eb2', 'Bb1+Bb2', 'Bb2+Eb3+G3'], A7: ['A1+A2', 'E2+E3', 'G2+C#3+E3'],
  F7: ['F1+F2', 'C2+C3', 'A2+C3+Eb3'], Bb7: ['Bb1+Bb2', 'F1+F2', 'Ab2+D3+F3'], Ab: ['Ab1+Ab2', 'Eb1+Eb2', 'Ab2+C3+Eb3'],
  Eb7: ['Eb1+Eb2', 'Bb1+Bb2', 'Bb2+Db3+G3'], EbBb: ['Bb1+Bb2', 'Eb2+Eb3', 'Bb2+Eb3+G3'], GmD: ['D2+D3', 'D2+D3', 'Bb2+D3+G3'],
};
// Oom-pah: one harmony per bar, or two (one per half-bar).
const om = (a, b = a) => {
  const [r1] = V[a]; const [r2, f2] = V[b];
  return { lh: `${r1}:1 r:3 ${a === b ? f2 : r2}:1 r:3`, lh2: `r:2 ${V[a][2]}:1 r:3 ${V[b][2]}:1 r:1` };
};
// Trio: half-note bass, soft chords on 2 and 4.
const lo = (x) => x.split('+')[0];
const tr = (a, b = a) => ({ lh: `${lo(V[a][0])}:4 ${lo(a === b ? V[a][1] : V[b][0])}:4`, lh2: `r:2 ${V[a][2]}:2 r:2 ${V[b][2]}:2` });
const offbeats = (c1, c2 = c1) => `r:1 ${c1}:1 r:1 ${c1}:1 r:1 ${c2}:1 r:1 ${c2}:1`;
const DRY = { dry: true, artic: 0.5 };
const TIMP = 'D1+D2:1.5 D1+D2:0.5 D1+D2:2 D1+D2:1.5 D1+D2:0.5 D1+D2:2';

const BARS = [
  // ── Fanfare ──────────────────────────────────────────────────────────────────────
  { h: [[0, 'D'], [4, 'Gm/D'], [6, 'D']], key: -2, rh: 'D5+A5+D6^:1.5 D5+D6:0.5 D5+A5+D6^:1.5 D5+D6:0.5 G5+Bb5+G6^:2 F#5+A5+F#6^:2', lh: TIMP, dyn: 104, dm: 'ff', marks: ['Tempo di marcia, vivo'], ...DRY },
  { h: [[0, 'Cm/D'], [2, 'D'], [4, 'D7']], rh: 'Eb5+G5+Eb6^:2 D5+F#5+D6^:2 C5+Eb5+C6:1.5 A4+C5+A5:0.5 Bb4+D5+Bb5:1.5 A4+C5+A5:0.5', lh: TIMP, dyn: 100, ...DRY },
  { h: [[0, 'D']], rh: 'r:1 D4+D5:0.5 D4+D5:0.5 G4+G5:1.5 A4+A5:0.5 Bb4+Bb5:1.5 C5+C6:0.5 D5+D6:1.5 Eb5+Eb6:0.5', lh: s16(['D1', 'D2', 'D1', 'D2', 'D1', 'D2', 'D1', 'D2', 'D1', 'D2', 'D1', 'D2', 'D1', 'D2', 'D1', 'D2']), dyn: 92, wedge: 'cresc', ...DRY },
  { h: [[0, 'D7']], rh: 'D5+F#5+C6+D6^:2 r:4 D5:1.5 D5:0.5', lh: 'D1+D2^:2 r:6', dyn: 116, dm: 'fff', wedge: 'stop', ...DRY },
  // ── First strain · G minor ───────────────────────────────────────────────────────
  { h: [[0, 'Gm']], rh: 'G5:2 G5:1.5 A5:0.5 Bb5:2 G5:2', ...om('Gm'), dyn: 66, dm: 'mf', subito: true, marks: ['staccato, secco'], ...DRY },
  { h: [[0, 'Gm']], rh: 'D6:3 C6:1 Bb5:2 A5:2', ...om('Gm'), dyn: 68, ...DRY },
  { h: [[0, 'D7']], rh: 'A5:1.5 G5:0.5 F#5:1.5 G5:0.5 A5:2 D5:2', ...om('D7'), dyn: 66, ...DRY },
  { h: [[0, 'Gm']], rh: 'Bb5:2 G5:2 r:2 D5:1.5 D5:0.5', ...om('Gm'), dyn: 64, ...DRY },
  { h: [[0, 'Cm']], rh: 'Eb6:2 Eb6:1.5 D6:0.5 C6:2 G5:2', ...om('Cm'), dyn: 70, ...DRY },
  { h: [[0, 'Gm']], rh: 'Bb5:2 Bb5:1.5 A5:0.5 G5:2 D5:2', ...om('Gm'), dyn: 68, ...DRY },
  { h: [[0, 'Cm'], [4, 'A7']], rh: 'Eb6:1.5 D6:0.5 C6:1.5 Bb5:0.5 G5:2 C#6:2', ...om('Cm', 'A7'), dyn: 72, ...DRY },
  { h: [[0, 'D']], rh: 'D6:2 A5:1.5 F#5:0.5 D5:2 D5:1.5 D5:0.5', ...om('D'), dyn: 70, ...DRY },
  { h: [[0, 'Gm']], rh: 'G5:2 G5:1.5 A5:0.5 Bb5:2 G5:2', ...om('Gm'), dyn: 70, dm: 'f', ...DRY },
  { h: [[0, 'Gm']], rh: 'D6:3 C6:1 Bb5:2 A5:2', ...om('Gm'), dyn: 72, ...DRY },
  { h: [[0, 'Cm']], rh: 'Eb6:1.5 D6:0.5 C6:1.5 Bb5:0.5 A5:2 G5:2', ...om('Cm'), dyn: 74, ...DRY },
  { h: [[0, 'E♭']], rh: 'Bb5:1.5 G5:0.5 Eb5:1.5 G5:0.5 Bb5:2 Eb6:2', ...om('Eb'), dyn: 76, ...DRY },
  { h: [[0, 'Cm'], [4, 'Gm/D']], rh: 'Eb6:1.5 D6:0.5 C6:1.5 Eb6:0.5 D6:2 Bb5:2', ...om('Cm', 'GmD'), dyn: 78, ...DRY },
  { h: [[0, 'D7']], rh: 'A5:1.5 Bb5:0.5 C6:1.5 A5:0.5 F#5:2 D5:2', ...om('D7'), dyn: 78, ...DRY },
  { h: [[0, 'Gm']], rh: 'G5+Bb5+G6^:2 D5+G5+D6:2 G4+Bb4+G5^:2 r:2', ...om('Gm'), dyn: 84, ...DRY },
  { h: [[0, 'D7']], rh: 'r:8', lh: 'D2+D3:1 E2+E3:1 F#2+F#3:1 G2+G3:1 A2+A3:1 Bb2+Bb3:1 C3+C4:1 A2+A3:1', dyn: 72, wedge: 'dim', ...DRY },
  // ── Second strain · the basses sing, pp ──────────────────────────────────────────
  { h: [[0, 'Gm']], rh: 'r:8', rh2: offbeats('Bb4+D5+G5'), lh: 'G2+G3^:1.5 A2+A3:0.5 Bb2+Bb3^:1.5 G2+G3:0.5 D3+D4^:2 D2+D3:2', dyn: 50, dm: 'p', subito: true, wedge: 'stop', marks: ['i bassi, marcato'], ...DRY },
  { h: [[0, 'Cm']], rh: 'r:8', rh2: offbeats('C5+Eb5+G5'), lh: 'Eb3+Eb4^:1.5 D3+D4:0.5 C3+C4^:1.5 Bb2+Bb3:0.5 A2+A3^:2 G2+G3:2', dyn: 52, ...DRY },
  { h: [[0, 'D7']], rh: 'r:8', rh2: offbeats('C5+D5+F#5'), lh: 'F#2+F#3^:1.5 G2+G3:0.5 A2+A3^:1.5 Bb2+Bb3:0.5 C3+C4^:2 A2+A3:2', dyn: 54, ...DRY },
  { h: [[0, 'Gm']], rh: 'r:8', rh2: offbeats('Bb4+D5+G5'), lh: 'Bb2+Bb3^:2 G2+G3:2 D2+D3^:2 r:2', dyn: 50, ...DRY },
  { h: [[0, 'E♭']], rh: 'r:8', rh2: offbeats('Bb4+Eb5+G5'), lh: 'Eb2+Eb3^:1.5 F2+F3:0.5 G2+G3^:1.5 Ab2+Ab3:0.5 Bb2+Bb3^:2 G2+G3:2', dyn: 54, wedge: 'cresc', ...DRY },
  { h: [[0, 'Cm']], rh: 'r:8', rh2: offbeats('C5+Eb5+G5'), lh: 'C3+C4^:1.5 Bb2+Bb3:0.5 Ab2+Ab3^:1.5 G2+G3:0.5 F2+F3^:2 Eb2+Eb3:2', dyn: 60, ...DRY },
  { h: [[0, 'D7']], rh: 'r:8', rh2: offbeats('C5+D5+F#5'), lh: 'D2+D3^:1.5 E2+E3:0.5 F#2+F#3^:1.5 G2+G3:0.5 A2+A3^:2 C3+C4:2', dyn: 68, ...DRY },
  { h: [[0, 'Gm']], rh: 'r:8', rh2: offbeats('Bb4+D5+G5', 'A4+C5+F#5'), lh: 'Bb2+Bb3^:2 G2+G3:2 r:2 D2+D3:1.5 D2+D3:0.5', dyn: 80, wedge: 'stop', ...DRY },
  // ── Second strain · tutti, ff ─────────────────────────────────────────────────────
  { h: [[0, 'Gm']], rh: 'G4+G5:1.5 A4+A5:0.5 Bb4+D5+Bb5:1.5 G4+G5:0.5 D5+G5+D6:2 D4+D5:2', ...om('Gm'), dyn: 100, dm: 'ff', subito: true, marks: ['tutti'], artic: 0.6 },
  { h: [[0, 'Cm']], rh: 'Eb5+Eb6:1.5 D5+D6:0.5 C5+Eb5+C6:1.5 Bb4+Bb5:0.5 A4+C5+A5:2 G4+G5:2', ...om('Cm'), dyn: 102, artic: 0.6 },
  { h: [[0, 'D7']], rh: 'F#4+F#5:1.5 G4+G5:0.5 A4+D5+A5:1.5 Bb4+Bb5:0.5 C5+D5+C6:2 A4+A5:2', ...om('D7'), dyn: 102, artic: 0.6 },
  { h: [[0, 'Gm']], rh: 'Bb4+D5+Bb5:2 G4+Bb4+G5:2 D4+G4+D5:2 r:2', ...om('Gm'), dyn: 98, artic: 0.6 },
  { h: [[0, 'E♭']], rh: 'Eb4+Eb5:1.5 F4+F5:0.5 G4+Bb4+G5:1.5 Ab4+Ab5:0.5 Bb4+Eb5+Bb5:2 G4+G5:2', ...om('Eb'), dyn: 102, artic: 0.6 },
  { h: [[0, 'Cm']], rh: 'C5+Eb5+C6:1.5 Bb4+Bb5:0.5 Ab4+Ab5:1.5 G4+G5:0.5 F4+F5:2 Eb4+G4+Eb5:2', ...om('Cm'), dyn: 104, artic: 0.6, wedge: 'cresc' },
  { h: [[0, 'D7']], rh: 'D5+D6:1.5 E5+E6:0.5 F#5+F#6:1.5 G5+G6:0.5 A5+A6:2 C6+D6+C7:2', ...om('D7'), dyn: 110, artic: 0.6 },
  { h: [[0, 'Gm']], rh: 'D6+G6+Bb6+D7^:2 r:2 G4+Bb4+D5+G5^:2 r:2', ...om('Gm'), dyn: 114, dm: 'fff', wedge: 'stop', artic: 0.6 },
  // ── Transition to E♭ ─────────────────────────────────────────────────────────────
  { h: [[0, 'Cm']], rh: 'G5:1.5 Eb5:0.5 C5:2 G5:1.5 Eb5:0.5 C5:2', ...om('Cm'), dyn: 80, dm: 'f', subito: true, wedge: 'dim', ...DRY },
  { h: [[0, 'F7']], rh: 'A5:1.5 F5:0.5 C5:2 A5:1.5 F5:0.5 Eb5:2', ...om('F7'), dyn: 68, ...DRY },
  { h: [[0, 'B♭7']], rh: 'D5:1.5 F5:0.5 Bb5:2 Ab5:1.5 F5:0.5 D5:2', ...om('Bb7'), dyn: 56, marks: ['poco rit.'] },
  { h: [[0, 'B♭7']], rh: 'Ab4:2 C5:2 D5:2 Bb4:2', ...tr('Bb7'), dyn: 44, wedge: 'stop' },
  // ── Trio · E♭ major, dolce ───────────────────────────────────────────────────────
  { h: [[0, 'E♭']], key: -3, rh: 'Eb5:4 G5:2 Bb5:2', ...tr('Eb'), dyn: 44, dm: 'p', marks: ['Trio · dolce, cantabile'] },
  { h: [[0, 'A♭']], rh: 'C6:4 Bb5:2 Ab5:2', ...tr('Ab'), dyn: 48 },
  { h: [[0, 'E♭/B♭']], rh: 'G5:3 F5:1 Eb5:2 G5:2', ...tr('EbBb'), dyn: 46 },
  { h: [[0, 'B♭7']], rh: 'F5:6 Bb4:2', ...tr('Bb7'), dyn: 42 },
  { h: [[0, 'E♭']], rh: 'Eb5:4 G5:2 Bb5:2', ...tr('Eb'), dyn: 46 },
  { h: [[0, 'E♭7']], rh: 'Db6:4 C6:2 Bb5:2', ...tr('Eb7'), dyn: 52 },
  { h: [[0, 'A♭']], rh: 'C6:3 Ab5:1 F5:2 Ab5:2', ...tr('Ab'), dyn: 50 },
  { h: [[0, 'B♭7']], rh: 'Bb5:4 Ab5:2 D5:2', ...tr('Bb7'), dyn: 46 },
  { h: [[0, 'E♭']], rh: 'Eb5:4 G5:2 Bb5:2', ...tr('Eb'), dyn: 48, wedge: 'cresc' },
  { h: [[0, 'A♭']], rh: 'C6:4 Bb5:2 Ab5:2', ...tr('Ab'), dyn: 52 },
  { h: [[0, 'Cm']], rh: 'G5:3 Ab5:1 Bb5:2 C6:2', ...tr('Cm'), dyn: 58 },
  { h: [[0, 'F7']], rh: 'A5:6 F5:2', ...tr('F7'), dyn: 60, wedge: 'stop' },
  { h: [[0, 'E♭/B♭']], rh: 'Bb5:4 G5:2 Eb5:2', ...tr('EbBb'), dyn: 54, wedge: 'dim' },
  { h: [[0, 'B♭7']], rh: 'F5:4 Ab5:2 D5:2', ...tr('Bb7'), dyn: 48 },
  { h: [[0, 'E♭']], rh: 'Eb5:6 r:2', ...tr('Eb'), dyn: 42, wedge: 'stop' },
  // ── Dogfight ─────────────────────────────────────────────────────────────────────
  { h: [[0, 'Cm'], [4, 'Cm'], [6, 'G']], rh: 'r:4 C5+Eb5+G5+C6^:1 r:1 B4+D5+G5+B5^:1 r:1', lh: `${s16(['C2+C3', 'D2+D3', 'Eb2+Eb3', 'F2+F3', 'G2+G3', 'Ab2+Ab3', 'B2+B3', 'C3+C4'])} C3+C4^:1 r:1 G2+G3^:1 r:1`, dyn: 106, dm: 'ff', subito: true, marks: ['Più mosso'], ...DRY },
  { h: [[0, 'Cm'], [4, 'G7']], rh: 'Eb5:1 D5:1 C5:1 B4:1 C5:1.5 D5:0.5 G4:2', lh: 'C2+C3:2 r:2 G1+G2:2 r:2', dyn: 50, dm: 'p', subito: true, ...DRY },
  { h: [[0, 'Fm'], [4, 'Fm'], [6, 'C']], rh: 'r:4 F5+Ab5+C6+F6^:1 r:1 E5+G5+C6+E6^:1 r:1', lh: `${s16(['F1+F2', 'G1+G2', 'Ab1+Ab2', 'Bb1+Bb2', 'C2+C3', 'Db2+Db3', 'E2+E3', 'F2+F3'])} F2+F3^:1 r:1 C2+C3^:1 r:1`, dyn: 108, dm: 'ff', subito: true, ...DRY },
  { h: [[0, 'Fm'], [4, 'C7']], rh: 'Ab5:1 G5:1 F5:1 E5:1 F5:1.5 G5:0.5 C5:2', lh: 'F1+F2:2 r:2 C2+C3:2 r:2', dyn: 52, dm: 'p', subito: true, ...DRY },
  { h: [[0, 'A♭'], [4, 'D7/A']], rh: 'Eb5+Ab5+C6:1 r:1 Eb5+Ab5+C6:1 r:1 F#5+A5+C6:1 r:1 F#5+A5+C6:1 r:1', lh: 'Ab1+Ab2:1 r:1 Ab1+Ab2:1 r:1 A1+A2:1 r:1 A1+A2:1 r:1', dyn: 64, dm: 'cresc.', wedge: 'cresc', ...DRY },
  { h: [[0, 'Gm/B♭'], [4, 'D7/C']], rh: 'D5+G5+Bb5:1 r:1 D5+G5+Bb5:1 r:1 D5+F#5+C6:1 r:1 D5+F#5+C6:1 r:1', lh: 'Bb1+Bb2:1 r:1 Bb1+Bb2:1 r:1 C2+C3:1 r:1 C2+C3:1 r:1', dyn: 84, ...DRY },
  { h: [[0, 'D7']], rh: `${s16(['D5', 'E5', 'F#5', 'G5', 'A5', 'Bb5', 'C6', 'D6'])} D6+F#6+A6+C7^:2 r:2`, lh: `${s16(['D1', 'D2', 'D1', 'D2', 'D1', 'D2', 'D1', 'D2'])} D1+D2^:2 r:2`, dyn: 116, dm: 'fff', wedge: 'stop' },
  { h: [[0, 'D7'], [6, 'B♭7']], rh: 'r:6 Bb4+Bb5:2', lh: 'r:6 Bb1+Bb2:2', dyn: 96, hold: 1.35, marks: ['G.P.'] },
  // ── Grandioso · E♭ major ──────────────────────────────────────────────────────────
  { h: [[0, 'E♭']], rh: 'Eb5+G5+Eb6:4 G5+Bb5+G6:2 Bb5+Eb6+Bb6:2', ...om('Eb'), dyn: 108, dm: 'fff', subito: true, marks: ['Grandioso, allargando'] },
  { h: [[0, 'A♭']], rh: 'C6+Eb6+C7:4 Bb5+Bb6:2 Ab5+C6+Ab6:2', ...om('Ab'), dyn: 110 },
  { h: [[0, 'E♭/B♭']], rh: 'G5+Bb5+G6:3 F5+F6:1 Eb5+G5+Eb6:2 G5+G6:2', ...om('EbBb'), dyn: 108 },
  { h: [[0, 'B♭7']], rh: 'F5+Ab5+F6:6 Bb4+Bb5:2', ...om('Bb7'), dyn: 104 },
  { h: [[0, 'E♭']], rh: 'Eb5+G5+Eb6:4 G5+Bb5+G6:2 Bb5+Eb6+Bb6:2', ...om('Eb'), dyn: 108 },
  { h: [[0, 'E♭7']], rh: 'Db5+G5+Db6:4 C5+Ab5+C6:2 Bb4+G5+Bb5:2', ...om('Eb7'), dyn: 110 },
  { h: [[0, 'A♭']], rh: 'C5+Ab5+C6:3 Ab4+Ab5:1 F4+F5:2 Ab4+Ab5:2', ...om('Ab'), dyn: 108 },
  { h: [[0, 'B♭7']], rh: 'Bb4+D5+Bb5:4 Ab4+Ab5:2 F4+F5:2', ...om('Bb7'), dyn: 104, marks: ['stringendo'] },
  { h: [[0, 'E♭']], rh: 'Eb5+G5+Eb6:4 G5+Bb5+G6:2 Bb5+Eb6+Bb6:2', ...om('Eb'), dyn: 110, wedge: 'cresc' },
  { h: [[0, 'A♭']], rh: 'C6+Eb6+C7:4 Bb5+Bb6:2 Ab5+C6+Ab6:2', ...om('Ab'), dyn: 112 },
  { h: [[0, 'Cm']], rh: 'G5+C6+G6:3 Ab5+Ab6:1 Bb5+Bb6:2 C6+Eb6+C7:2', ...om('Cm'), dyn: 114 },
  { h: [[0, 'F7']], rh: 'A5+C6+A6:6 F5+F6:2', ...om('F7'), dyn: 116, wedge: 'stop' },
  { h: [[0, 'E♭/B♭']], rh: 'Bb5+Eb6+Bb6:4 G5+G6:2 Eb5+Eb6:2', ...om('EbBb'), dyn: 116 },
  { h: [[0, 'B♭7']], rh: 'F5+Ab5+F6:4 Ab5+Ab6:2 D5+F5+D6:2', ...om('Bb7'), dyn: 118 },
  { h: [[0, 'E♭']], rh: 'Eb5+G5+Bb5+Eb6^:4 r:3 Bb4+Bb5:1', lh: 'Eb1+Eb2^:4 r:3 Bb1+Bb2:1', dyn: 120, dry: true },
  { h: [[0, 'E♭']], rh: 'Eb5+G5+Bb5+Eb6^:1 r:7', lh: 'Eb1+Eb2^:1 r:7', dyn: 124, final: true, ...DRY, artic: null },
];

const TEMPO = [
  [0, 136], [4, 144], [20, 144], [28, 146], [36, 144], [38, 136], [40, 124], [40.5, 126], [55, 124], [55.3, 146],
  [61, 150], [62, 150], [63, 138], [70, 142], [78, 150], [79, 146],
];
const BREATHS = [[8, 0.02], [12, 0.03], [20, 0.04], [28, 0.03], [44, 0.04], [48, 0.05], [52, 0.03], [68, 0.02], [72, 0.03]];
const ARCHES = [[4, 8], [8, 12], [12, 16], [16, 20], [40, 44], [44, 48], [48, 52], [52, 55], [63, 67], [67, 71], [71, 75], [75, 78]];

perform({
  BARS, TEMPO, BREATHS, ARCHES, FINAL_FROM: 78, FINAL_W: 0.95, CRASH: 61, PEAK: 61, SKIP: [[0, 3], [55, 62]],
  name: 'iron_parade', dir: new URL('./', import.meta.url),
  title: 'Iron Parade', subtitle: 'march for piano',
  compTitle: 'Iron Parade — march', metaTempo: 144,
  KEY: 'G minor → E♭ major', keyOf: (a) => (a >= 40 ? 'E♭ major' : 'G minor'),
  SECTIONS: [['Fanfare', 0, 4], ['First strain', 4, 20], ['Second strain · basses', 20, 28], ['Second strain · tutti', 28, 36], ['Transition', 36, 40], ['Trio', 40, 55], ['Dogfight', 55, 63], ['Grandioso', 63, 79]],
  METRO: { 0: 144, 40: 126, 55: 148, 63: 138 },
});
