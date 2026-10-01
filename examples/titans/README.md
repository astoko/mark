# Titans

An epic for piano: 46 bars, C minor → D minor → D major, *Maestoso*, about 2 minutes 20 seconds. It was written by hand in `titans.mjs` and is performed by `../as-we-know-it/perform.mjs`.

| Section | Bars | What happens |
|---|---|---|
| Prologue | 1–4 | A low C tremolo, *pp*; the theme heard first as distant bells, high in the treble |
| Theme | 5–12 | The horn theme (C, D, E♭, G, then a leap to high C falling back) sung in the middle of the piano, over a low octave and repeated string-like chords |
| Theme in octaves | 13–20 | *f*, over low octaves and a sixteenth-note ostinato |
| The cycle | 21–28 | The awe moment: chords a major third apart (E – C – A♭ – E) over two-octave sweeps, then F minor, D♭ and A♭/C, ending on a *fff* G7 crash |
| Breath | 29–30 | Silence, then a tremolo that rises from G to A, crescendo molto, and a run up into… |
| Titans | 31–38 | …the theme a whole step higher, in D minor, *fff*, in full octaves over pounding low octaves |
| Ascent | 39–42 | The heroic ♭VI–♭VII–I: B♭ in quarters, C in eighths, then D **major**, hammered over a tremolo, and a cascade across the keyboard |
| Finale | 43–46 | The minor plagal cadence Gm/D → D, the B♭–C–D cadence again, one held silence, the last chord |

Checks:
- No melody/bass parallel fifths or octaves in the part-writing.
- No key struck by two voices at once.
- The largest local tempo change is 1.1%.
- The loudness rises steadily from −30 dB RMS in the prologue to −14 dB at the D-minor theme and again at the D-major apex.

```
node examples/titans/titans.mjs
node examples/as-we-know-it/engrave.mjs examples/titans/titans
node tools/render-hq/render.cjs examples/titans/titans.json titans.wav
```
