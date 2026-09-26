# Last Light

*Last Light* is the second take on the theme **the end of the world as we know it**: 50 bars, D minor to D major, about 2 minutes 40 seconds. It was written by hand in `last_light.mjs` and is performed by `../as-we-know-it/perform.mjs`, using the same flow rules as before.

The first take, *As We Know It*, followed its rules but wasn't felt. This take starts from what a listener keeps:

| What | Where |
|---|---|
| **A hook.** One syncopated motif, A–D–F…E–D (short, short, long), that comes back in every section | bars 5, 9, 13, 17, 31, 35, 44, 48 |
| **A groove.** A left-hand ostinato in eighths grouped 3+3+2, with every chord coloured by its 9th | throughout |
| **Harmony that aches.** i–VI–III–VII (Dm–B♭–F–C), a 4–3 suspension on the half cadence, a leap of a sixth to the phrase's top note, and a Neapolitan E♭ in the build | 10–12, 27 |
| **An arc.** Whisper → song → song in two voices → rising bridge → a ticking clock that speeds up → the hook in octaves over octave bass → a deceptive collapse with the bass falling by semitones → silence → the hook reborn in D major | whole piece |

Checks: no melody/bass parallel fifths or octaves in the part-writing, no key struck by two voices at once, largest local tempo change 1.7%, and the peak (bar 36, *fff*) at 62.5% of the duration.

**Sound.** The piece is rendered with `tools/render-hq/`, which uses the full Salamander Grand. The renderer blends between 6 of the 16 recorded velocity layers, so soft notes are darker and loud notes brighter. It adds real damper release (none above F6) and a stereo hall reverb.

```
node examples/last-light/last_light.mjs
node examples/as-we-know-it/engrave.mjs examples/last-light/last_light
node tools/render-hq/fetch-samples.cjs && node tools/render-hq/render.cjs examples/last-light/last_light.json last_light.wav
```
