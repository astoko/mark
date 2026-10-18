"""STATIC  -  art/music/dream_garden.ogg   (dream 3: summer garden, treasure hunt; 2:00 loop)

D major, 4/4 at 56 bpm, 28 bars = exactly 120 s.  Heat and stillness.
  * a single low D (D2) that never changes pitch - the pond;
  * lazy felt piano, always a little behind the beat, rolling added-ninth chords over that D and a
    small pentatonic tune that keeps ending on the 3rd/5th/2nd instead of home;
  * warm held strings that swell and overlap, never moving fast;
  * a far-off guitar harmonic now and then (filtered, mostly reverb);
  * cicada-like shimmer: a pulsed noise band and tremolo glass tones, swelling and fading slowly.
    bars 1-4 ambience only | 5-12 piano chords, the tune enters at 9 | 13-20 fuller, strings + harmonics |
    21-28 thinning to an open Dmaj9, which falls back into the bare ambience of bar 1
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import lib, synth as S
from lib import SR, Score
from synth import hz, at_db

NAME = 'dream_garden'
BPM = 56.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
BARS = 28
L_SEC = BARS * BAR                    # 120.0
L = int(round(L_SEC * SR))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(lib.ROOT, 'examples/static-score/out/dream_garden.ogg')
rng = np.random.default_rng(56)


def tb(bar, beat=1.0):                # 1-based bar and beat
    return ((bar - 1) * 4 + (beat - 1)) * BEAT


UP = {   # upper structures over the unmoving D
    'Dmaj9': [57, 61, 64, 66], 'Bm7': [59, 62, 66, 69], 'Gmaj7': [55, 59, 62, 66],
    'A69': [61, 64, 66, 71], 'Em9': [52, 59, 62, 66],
}
chords = ['-'] * 4 \
    + ['Dmaj9', 'Bm7', 'Gmaj7', 'A69'] + ['Dmaj9', 'Bm7', 'Gmaj7', 'A69'] \
    + ['Dmaj9', 'Em9', 'Gmaj7', 'A69'] + ['Bm7', 'Em9', 'Gmaj7', 'A69'] \
    + ['Dmaj9', 'Bm7', 'Gmaj7', 'Gmaj7'] + ['Dmaj9', 'Dmaj9', 'Dmaj9', 'Dmaj9']
assert len(chords) == BARS

# ------------------------------------------------------------------ lazy piano (Salamander)
gp = Score(seed=56)
lazy = lambda: 0.05 + abs(rng.normal(0, 0.07))          # always behind the beat
for bar in range(5, BARS + 1):
    name = chords[bar - 1]
    gp.pedal_down(tb(bar) + 0.04, tb(bar + 1) + 0.18)   # re-pedal a hair late: the old chord is still there
    notes = UP[name]
    offs = [0.0, 0.65, 1.45, 2.35]                      # beats: a slow upward roll
    thin = bar >= 25
    for i, (m, ob) in enumerate(zip(notes, offs)):
        if thin and i in (1, 2):
            continue
        db = -41.0 - 1.2 * i - (3.0 if thin else 0.0)
        gp.note_db(m, tb(bar) + ob * BEAT + lazy(), BAR - 0.3, db, jitter_db=0.8)

# the small tune: (bar, beat, midi, beats)
mel = [
    (9, 2.0, 66, 1.0), (9, 3.5, 64, 1.5), (10, 1.5, 69, 2.5), (10, 4.0, 66, 1.0),
    (11, 2.0, 71, 1.0), (11, 3.0, 69, 1.0), (11, 4.0, 66, 1.0), (12, 2.0, 64, 3.0),
    (13, 2.0, 69, 1.0), (13, 3.5, 71, 1.0), (14, 1.0, 74, 2.5), (14, 4.0, 71, 1.0),
    (15, 2.0, 69, 1.0), (15, 3.0, 66, 1.5), (16, 2.0, 64, 3.0),
    (17, 1.5, 66, 1.0), (17, 3.0, 69, 1.5), (18, 2.0, 71, 2.0), (19, 2.0, 69, 1.0), (19, 3.5, 66, 1.0), (20, 2.0, 64, 3.0),
    (21, 2.0, 66, 1.5), (22, 2.5, 69, 2.5), (24, 2.0, 66, 2.5),
    (26, 3.0, 69, 3.0),
]
for bar, beat, m, d in mel:
    gp.note_db(m, tb(bar, beat) + lazy() * 1.4, d * BEAT, -37.5 - (2.0 if bar >= 21 else 0.0), jitter_db=0.5)
piano = lib.eq(lib.fold_loop(lib.render_piano(gp, NAME), L_SEC), lp=6200, hp=40, circular=True)

# ------------------------------------------------------------------ warm held strings
n_all = np.arange(L)
strings = np.zeros((L, 2))
SCH = [  # (first bar, bars, notes)
    (3, 6, [50, 57, 61, 66]), (9, 4, [55, 59, 62, 66, 69]), (13, 4, [54, 57, 62, 66]),
    (17, 4, [55, 59, 62, 66]), (21, 4, [50, 57, 61, 66]), (25, 7, [50, 57, 64, 66]),   # runs over the loop into bars 1-3
]
for bar0, nb, notes in SCH:
    dur = nb * BAR
    for k, m in enumerate(notes):
        v = S.string_voice(hz(m, rng.normal(0, 2.5)), dur, attack=3.6, release=3.8, rolloff=1.9,
                           vib=(5.1, 4.0, 2.5), copies=(-8, 0, 7), seed=bar0 * 7 + k)
        v = at_db(v, -50.0 - 0.8 * k, 4.5, 7.0)
        S.place(strings, v, int(tb(bar0) * SR) - int(1.0 * SR), pan=(-0.55, 0.25, -0.2, 0.5, 0.0)[k % 5])

# ------------------------------------------------------------------ the pond, the heat, a far-off guitar
pond = S.sine_drone(L, hz(38), -49.5, breath_cycles=2, breath_depth=0.12, partials=((1, 1.0), (2, 0.16), (3, 0.04)), seed=1)
glass = S.tremolo_glass(L, [(2349.0, 1.0, 8.0, 0.75, 3, -0.4), (1760.0, 0.8, 6.0, 0.65, 2, 0.45), (2960.0, 0.5, 9.5, 0.8, 5, 0.1),
                            (3520.0, 0.3, 7.0, 0.7, 4, -0.2)], -66.0, seed=2)
cic = S.cicada(L, -64.0, band=(3400, 7200), pulse_hz=137.0, swells=(7, 11), seed=3)

far = np.zeros((L, 2))
for t, m in [(26.0, 74), (38.5, 69), (53.0, 71), (66.0, 74), (74.5, 76), (83.5, 69), (97.0, 74), (110.0, 69)]:
    g = at_db(S.guitar_harmonic(hz(m, rng.normal(0, 4)), 4.5, 0.5, seed=int(t)), -52.0, 0.0, 0.6)
    S.place(far, g, int(t * SR), pan=rng.uniform(-.6, .6))
far = lib.eq(far, lp=3400, hp=250, circular=True)

# ------------------------------------------------------------------ room, tape, master
close = piano + strings * 1.0
ir = lib.make_ir(seconds=3.0, predelay=0.02, bands=((90, 2.4), (350, 2.6), (1400, 2.4), (4500, 1.7), (9000, 1.0)), dark=0.95, seed=57)
wet = lib.circ_conv(close, ir); wet *= np.sqrt((close ** 2).mean() / (wet ** 2).mean())
big = lib.make_ir(seconds=5.0, predelay=0.06, bands=((90, 3.5), (350, 4.0), (1400, 3.6), (4500, 2.6), (9000, 1.5)), dark=0.9, seed=58)
far_wet = lib.circ_conv(far, big); far_wet *= np.sqrt((far ** 2).mean() / (far_wet ** 2).mean()) * 1.4
room = 0.84 * close + 0.42 * wet + 0.22 * far + 0.9 * far_wet
mix = room + pond + glass + cic
mix = lib.tape_wow(mix, wow=[(0.29, 4.5), (0.71, 2.0), (5.3, 0.8)], seed=6)
mix = mix + lib.hiss(L, -76.0)
mix = lib.eq(mix, lp=11000, hp=36, circular=True)
final, info = lib.master(mix, target_lufs=-18.0)
print({k: (round(float(v), 2) if not isinstance(v, bool) else v) for k, v in info.items()})
print('seam', {k: round(float(v), 5) for k, v in lib.seam_report(final).items()})
lib.spectrogram_png(final, f'{lib.WORK}/{NAME}.png', NAME)
lib.write_ogg(final, OUT, quality=6)
print(lib.verify_ogg(OUT))
print('decoded-ogg seam', lib.decoded_seam(OUT))
