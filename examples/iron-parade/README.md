# Iron Parade

A march for piano: 79 bars, G minor → E♭ major, *Tempo di marcia, vivo* (♩ 144), about 2 minutes 15 seconds. It was written by hand in `iron_parade.mjs` and is performed by `../as-we-know-it/perform.mjs`. The form follows the band march (Sousa):

| Section | Bars | What happens |
|---|---|---|
| Fanfare | 1–4 | Dotted trumpet calls over a timpani pedal on D, a roll, a *fff* chord, then silence |
| First strain | 5–20 | G minor, dry and staccato. An oom-pah left hand (bass on beats 1 and 3, chord on 2 and 4) under a dotted tune |
| Second strain | 21–36 | The tune moves to the basses in octaves (*p*, off-beat chords above), then the tutti takes it *ff* and climbs to D7 |
| Transition | 37–40 | Cm – F7 – B♭7, *diminuendo* |
| Trio | 41–55 | E♭ major, *dolce*, pedalled and lyrical |
| Dogfight | 56–63 | *ff* bass runs answered *p*, a chromatic climb to a D7 crash, silence, then a deceptive landing on E♭ |
| Grandioso | 64–79 | The trio tune in full octaves, *fff*, *stringendo*, then the last chord, a silence and the stinger |

Two per-bar options were added to the shared performance model for the march:
- `artic` plays short notes detached (staccato, no key overlap).
- `dry` plays a bar with no pedal.

Pieces that don't use these options render byte-identically.

Checks:
- No melody/bass parallel fifths or octaves in the part-writing.
- No key struck by two voices at once.
- The largest local tempo change is 1.3%.
- The *fff* crash comes at 77.6% of the duration: a march builds to its end rather than peaking at the golden section.

```
node examples/iron-parade/iron_parade.mjs
node examples/as-we-know-it/engrave.mjs examples/iron-parade/iron_parade
node tools/render-hq/render.cjs examples/iron-parade/iron_parade.json iron_parade.wav
```
