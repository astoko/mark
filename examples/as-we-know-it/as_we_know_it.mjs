// AS WE KNOW IT — performance of the hand-written score in score.mjs (original tempo).
//   node examples/as-we-know-it/as_we_know_it.mjs && node examples/as-we-know-it/engrave.mjs
import { BARS } from './score.mjs';
import { perform } from './perform.mjs';

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

perform({
  BARS, TEMPO, BREATHS, ARCHES, FINAL_FROM: 57.5, FINAL_W: 0.6, CRASH: 39,
  name: 'as_we_know_it', dir: new URL('./', import.meta.url),
  title: 'As We Know It', subtitle: 'the end of the world, in seven stages — for piano',
  compTitle: 'As We Know It — the end of the world, in seven stages', metaTempo: 66,
  METRO: { 0: 63, 18: 64, 26: 76, 33: 86, 41: 60, 48: 60 },
});
