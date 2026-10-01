// AS WE KNOW IT — fast version (Allegro → Presto)
//   node examples/as-we-know-it/as_we_know_it_fast.mjs && node examples/as-we-know-it/engrave.mjs as_we_know_it_fast
//
// Same melody, harmony, bass descent and form as score.mjs; what changes is the motor.
// The undercurrent is rewritten in sixteenths, so the piece runs instead of walks:
//   I–II   rolling arches over the bass (bass, 5th, octave, 10th, 12th and back), per
//          beat where the harmony moves in quarters; the hymn keeps its quarter-note pace
//          above, at ♩ ≈ 104
//   III    the limping clock becomes a driving 3+3+2 in sixteenths, the B♭ pedal struck on
//          every group (accented), ♩ 108 → 126
//   IV–V   as written (already sixteenths), now Presto, ♩ 128 → 156
//   VI     the heartbeat, ♩ ≈ 84
//   VII    the new world sways 3+3+2 in sixteenths over the F♯ drone, ♩ ≈ 100–106
// Every figure below is written out note by note, chosen so the left hand never strikes a
// key the right hand is holding (checked) and stays below the alto (minimum masking).

import { BARS as SCORE } from './score.mjs';
import { perform } from './perform.mjs';

const x16 = (s) => s.trim().split(/\s+/).map((n) => `${n}:0.5`).join(' ');
const BARS = SCORE.map((b) => ({ ...b }));
const set = (bar, patch) => Object.assign(BARS[bar - 1], patch);

// ── I  The known world ───────────────────────────────────────────────────────────────
set(1, { lh: 'C2:4 C2:4', lh2: x16('r G2 C3 E3 G3 E3 C3 G2 r G2 C3 E3 G3 E3 C3 G2'), marks: ['Allegro semplice, come un inno', 'con Ped.'] });
set(2, { lh: 'C3:4 C3:2 B2:2', lh2: x16('r E3 G3 C4 E4 C4 G3 E3 r G3 C4 G3 r D3 G3 D3') });
set(3, { lh: 'A2:2 G2:2 F2:2 E2:2', lh2: x16('r E3 A3 E3 r E3 B3 E3 r C3 A3 C3 r C3 G3 C3') });
set(4, { lh: 'F2:2 E2:2 D2:2 C2:2', lh2: x16('r C3 A3 C3 r C3 G3 C3 r F3 A3 F3 r E3 G3 E3') });
set(5, { lh: 'G2:4 G2:4', lh2: x16('r D3 G3 D4 G3 D3 G3 B3 r D3 G3 B3 D4 B3 G3 D3') });
set(6, { lh: 'C2:4 C2:4', lh2: x16('r G2 C3 G3 C4 G3 C3 G2 r G2 C3 E3 G3 E3 C3 E3') });
set(7, { lh: 'F2:4 E2:2 D2:2', lh2: x16('r C3 F3 A3 C4 A3 F3 C3 r C3 G3 C3 r F3 A3 F3') });
set(8, { lh: 'G2:4 G2:4', lh2: x16('r C3 E3 G3 C4 G3 E3 C3 r B2 D3 G3 B3 G3 D3 B2') });
set(9, { lh: 'C2:4 C2:4', lh2: x16('r G2 C3 E3 G3 E3 C3 G2 r A2 C3 F3 A3 F3 C3 A2') });
set(10, { lh: 'C2:4 C2:4', lh2: x16('r G2 C3 E3 G3 E3 C3 G2 r G2 C3 E3 G3 E3 C3 G2') });

// ── II  Omen: the same motion, the ground a semitone lower ────────────────────────────
set(11, { lh: 'B1:4 B1:4', lh2: x16('r G2 C3 E3 G3 E3 C3 G2 r G2 C3 E3 G3 E3 C3 G2') });
set(12, { lh: 'B1:4 B1:4', lh2: x16('r E3 G3 C4 E4 C4 G3 E3 r G3 C4 G3 D3 G3 B3 G3') });
set(13, { lh: 'B1:8', lh2: x16('A2 E3 A3 E3 G2 E3 B3 E3 F2 C3 A3 C3 E2 C3 G3 C3') });
set(14, { lh: 'B1:8', lh2: x16('F2 C3 A3 C3 E2 C3 G3 C3 D2 F3 A3 F3 C2 E3 G3 E3') });
set(15, { lh: 'B1:4 B1:4', lh2: x16('r F#2 B2 D3 F#3 D3 B2 F#2 r F#2 B2 D3 G2 B2 D3 G3') });
set(16, { lh: 'B1:4 B1:4', lh2: x16('r G2 C3 G3 C4 G3 C3 G2 r G2 C3 E3 G3 E3 C3 E3') });
set(17, { lh: 'B1:8', lh2: x16('F#2 C3 F#3 A3 C4 A3 F#3 C3 E2 C3 G3 C3 D2 F3 A3 F3') });
set(18, { lh: 'B1:4 Bb1:4', lh2: x16('r G2 C3 E3 G3 E3 C3 G2 r G2 D3 G3 Bb2 D3 G3 D3') });

// ── III  Unease: 3+3+2 in sixteenths, the B♭ pedal struck on every group ───────────────
const limp = (s) => ({ lh: x16(s), lh2: undefined, group: null });
set(19, { ...limp('Bb1^ G2 Eb3 Bb1^ G2 C3 Bb1^ Eb3 Bb1^ G2 Eb3 Bb1^ G2 C3 Bb1^ D3'), marks: ['più mosso, inquieto'] });
set(20, limp('Bb1^ Ab2 Eb3 Bb1^ Ab2 C3 Bb1^ G2 Bb1^ F2 C3 Bb1^ Ab2 C3 Bb1^ Eb3'));
set(21, limp('Bb1^ F2 C3 Bb1^ F2 Ab2 Bb1^ C3 Bb1^ Ab2 C3 Bb1^ Ab2 Eb3 Bb1^ C3'));
set(22, limp('Bb1^ G2 D3 Bb1^ G2 Bb2 Bb1^ D3 Bb1^ Bb2 D3 Bb1^ Bb2 F3 Bb1^ D3'));
set(23, limp('Bb1^ Ab2 Eb3 Bb1^ Ab2 C3 Bb1^ Eb3 Bb1^ C3 Eb3 Bb1^ C3 G3 Bb1^ Eb3'));
set(24, limp('Bb1^ F2 D3 Bb1^ F2 Ab2 Bb1^ D3 Bb1^ Ab2 D3 Bb1^ F2 Ab2 Bb1^ D3'));
set(25, limp('Bb1^ F2 D3 Bb1^ Ab2 D3 Bb1^ F3 Bb1^ F2 D3 Bb1^ Ab2 D3 Bb1^ F3'));

// ── IV–VI as written; new tempo words ──────────────────────────────────────────────────
set(27, { marks: ['Presto agitato'] });
set(40, { hold: 1.1 });
set(42, { marks: ['Andante — come da lontano'] });

// ── VII  The new world: a 3+3+2 sway in sixteenths over the F♯ drone ───────────────────
const I = 'r C#2 A#2 F#2 C#3 G#3 A#3 C#3';
const II = 'r C#2 G#2 D#3 G#3 B#3 D#4 B#3';
const sway = (a, b) => ({ lh: 'F#1:4 F#1:4', lh2: x16(`${a} ${b}`), group: null, group16: [3, 3, 2, 3, 3, 2] });
set(49, sway(I, I));
set(50, sway(I, 'r C#2 A#2 F#2 C#3 G#3 B#3 D#4'));
set(51, sway('r C#2 A#2 F#2 C#3 E#3 A#3 C#4', 'r C#2 A#2 D#3 F#3 A#3 G#3 E#3'));
set(52, sway('r C#2 A#2 D#3 F#3 A#3 C#3 F#3', 'r C#2 G#2 B#2 D#3 G#3 A#3 C#4'));
set(53, sway(II, 'r C#2 G#2 E#3 G#3 C#4 A#3 C#4'));
set(54, sway(I, I));
set(55, sway('r C#2 A#2 D#3 F#3 A#3 D#4 A#3', 'r C#2 G#2 E#3 G#3 C#4 B#3 D#4'));
set(56, sway('r C#2 A#2 F#2 C#3 G#3 A#3 C#4', II));
set(57, sway(I, I));
set(58, sway(II, I));

const TEMPO = [
  [0, 96], [1, 100], [7.4, 99], [8, 94], [8.6, 98], [10, 100], [16, 101], [17.5, 97], [18, 101],
  [21, 108], [24, 117], [26, 126], [30, 134], [33, 140], [37, 150], [38.5, 156], [39, 142],
  [39.0001, 90], [40, 90], [40.0001, 100], [41, 100], [41.0001, 96], [44, 96], [47, 88], [47.6, 80],
  [48, 102], [51, 112], [54, 116], [55.5, 114], [56, 110], [60, 110],
];
const BREATHS = [[4.75, 0.05], [10.75, 0.04], [14.75, 0.05], [17.75, 0.04], [48, 0.07], [52.75, 0.05], [56, 0.06], [57.5, 0.03]];
const ARCHES = [[0.75, 4.75], [4.75, 8], [10.75, 14.75], [14.75, 17.75], [48, 52.75], [52.75, 56]];

perform({
  BARS, TEMPO, BREATHS, ARCHES, FINAL_FROM: 57.5, FINAL_W: 0.6, CRASH: 39,
  name: 'as_we_know_it_fast', dir: new URL('./', import.meta.url),
  title: 'As We Know It', subtitle: 'the end of the world, in seven stages — fast version',
  compTitle: 'As We Know It (fast) — the end of the world, in seven stages', metaTempo: 100,
  METRO: { 0: 100, 18: 104, 26: 128, 33: 144, 41: 96, 48: 108 },
});
