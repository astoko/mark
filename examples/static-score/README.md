# STATIC: score

Generators for the eight pieces of music in the *STATIC* score brief (a slow, quiet 2D horror game in
winter).  Each `<track>.py` writes the notes, renders the piano through the HQ Salamander renderer
(`tools/render-hq`), adds the non-piano voices (`synth.py`), mixes, masters and encodes
`out/<track>.ogg` (OGG Vorbis, 44.1 kHz stereo).

| File | Length | Loop | What it is | Loudness |
|---|---|---|---|---|
| `menu.ogg` | 2:36 | yes | D minor felt piano, ~60 bpm rubato, faint bowed-glass drone, tape wobble. Sam's first four notes (A F D E, minor, slowed ~6x) once at 1:23, left on the E. Ends on A7sus4, which turns back into the opening low D. | -17.9 LUFS, TP -1.2 |
| `chapter_card.ogg` | 0:13.5 | no | Low D, A, a shy F, then one high A that hangs; ends in digital silence. | -18.0, TP -3.4 |
| `radio_june.ogg` | 2:00 | yes | FM electric piano, C major, 64 bpm, 32 bars. One sad chord (Fm6) per cycle. Left hand below ~250 Hz, 1-3 kHz scooped so it sits under speech. | -17.9, TP -3.9 |
| `dream_house.ogg` | 2:00 | yes | 6/8, D major, 72 bars. Sam's whole song on celesta, then toy piano; a skipping first-four-notes bridge; a last statement with one wrong note that stops early. Pad drifts 24 cents flat and recovers. | -17.9, TP -4.1 |
| `dream_garden.ogg` | 2:00 | yes | D major, 4/4 at 56 bpm, 28 bars. One D2 that never moves; lazy piano; held strings; far-off guitar harmonics; cicada shimmer. | -17.9, TP -1.3 |
| `memory_birthday.ogg` | 1:20 | no | Four-part hymn in D major. Sam's first half plainly in the middle voice (0:07); the only full resolution in the score (1:02). | -18.0, TP -1.2 |
| `lifeguard.ogg` | 0:48 | yes | Bowed low D, sub-bass swell, glass harmonics (A6, E7, a B-flat rub at the peak). No melody. **Mastered at -24 LUFS** (brief says "very quiet"; `TARGET_LUFS` in the script). | -24.0, TP -11.2 |
| `night_station.ogg` | 3:00 | yes | 33 low piano events (6 two-note) in a long dark room; rules stop any tune forming. | -18.0, TP -1.6 |

## How the loops are made seamless

1. The dry piano is rendered once with its tail running past the loop end; the tail is folded onto the head.
2. Reverb is a **circular** convolution, tape wow/flutter is a circular variable delay, the EQ filters
   run on three tiled copies and keep the middle one, and every drone / LFO frequency is an integer
   number of cycles per loop (a bowed note's phase is forced to close exactly).
3. `lib.seam_report` / `lib.decoded_seam` check the loop point on the *decoded `.ogg`* (jump across the
   seam vs. the typical sample step, and the level on both sides).

## Loudness model

The sampler's soft layers cross-fade non-monotonically, so velocity is a poor loudness control.
`calibrate.py` measures every (pitch, velocity) pair once into `calib.json`; `Score.note_db()` then
picks a *touch* (velocity 14 = the softest, darkest layer; 38 = a firmer one) for timbre and sets the
level by per-note `gain` (an optional field the renderer now reads), so "equal" notes are equal to
within 0.05 dB.  The renderer also reads optional per-note `detune` (cents) and a `render.dry/wet` mix.

`memory_birthday.py` additionally solves the inner voices of its four-part texture and refuses to
build if there is a parallel fifth or octave anywhere (it prints the voicings).

## Rebuilding

```
node tools/render-hq/fetch-samples.cjs          # once, ~260 MB (Salamander V3); set SALAMANDER_DIR if elsewhere
python -m venv .venv && .venv/bin/pip install -r examples/static-score/requirements.txt
# also needs: node + playwright (as for the other examples), oggenc, ffmpeg/ffprobe
.venv/bin/python examples/static-score/calibrate.py        # only if the sample set changes (~5 min)
.venv/bin/python examples/static-score/menu.py             # -> out/menu.ogg ; likewise for the others
```
