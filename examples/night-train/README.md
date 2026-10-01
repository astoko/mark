# Night Train

A fast piece for piano: 52 bars in E minor, about 1 minute 27 seconds, going from *Allegro con fuoco* (♩ 146) to *Presto* (♩ 174). It was written by hand in `night_train.mjs` and is performed by `../as-we-know-it/perform.mjs`.

| What | Where |
|---|---|
| **The motor.** The left hand never stops. It plays sixteenths grouped 3+3+2, and in the climaxes a low octave is added on the first note of each group. | throughout |
| **The hook.** E–B–E–G: three quick notes, then a long one on the offbeat. It is answered by a falling 3+3+2 in long notes, which is the motor's rhythm sung slowly. | bars 5, 13, 29, 41 |
| **A lament bass.** E, D, C♯, C, then A and B, sliding down under the hook (Em – G/D – C♯ø7 – Cmaj7 – Am7 – B7), so every phrase leans forward. | A sections |
| **Contrast.** A cantabile middle in long notes over a straight 4+4 figure, drifting towards G major. | bars 21–28 |
| **The arc.** Departure → hook → two voices → cantabile build → the hook in octaves (peak at bar 33) → a deceptive Cmaj7♯11, *sfff* → a *pp* tunnel on a B pedal, accelerating → *Presto* → a cascade, a run and three stabs. | whole piece |

Checks:
- No melody/bass parallel fifths or octaves in the part-writing.
- No key struck by two voices at once.
- The largest local tempo change is 1.0%.
- The peak falls at 62.3% of the duration (the golden section is 61.8%).

```
node examples/night-train/night_train.mjs
node examples/as-we-know-it/engrave.mjs examples/night-train/night_train
node tools/render-hq/render.cjs examples/night-train/night_train.json night_train.wav
```
