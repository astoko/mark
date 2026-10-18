"""STATIC  -  art/music/menu.ogg   (main menu; 2:36 loop)

D minor, ~60 bpm, rubato.  Solo felt piano, long low notes under a held pedal, a very faint
bowed-glass drone, tape wobble, hiss, room.  "Someone trying very hard to stay calm":
the rocking lullaby figure (D E F E / F G A G ...) is played with a metronomic evenness that
frays - the last note comes late and soft, or catches.  Halfway (t = 83 s) Sam's first four
notes appear once, slowed ~6x and in the minor (A F D E, over D minor), and are left hanging
on the E: unresolved.  The loop ends on A7sus4 and turns back into the low D of the opening.

    cycle 1  (0-52)    Dm | Bbmaj7 | Gm(add9) | Asus4         statement
    cycle 2  (52-104)  Dm | Bbmaj7 | Dm + Sam | Bb(#11)       the breathing pulse, Sam's fragment
    cycle 3  (104-156) Dm | Bbmaj7 | Gm | A7sus4              the figure breaks off after two notes

Levels are calibrated raw dBFS (see calibrate.py): equal numbers are equal loudness.
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import SR, Score

NAME = 'menu'
L_SEC = 156.0
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(lib.ROOT, 'examples/static-score/out/menu.ogg')

A1, Bb1 = 33, 34
D2, E2, F2, G2, A2 = 38, 40, 41, 43, 45
D3, F3, G3, A3, Bb3 = 50, 53, 55, 57, 58
D4, E4, F4, G4, A4, Bb4 = 62, 64, 65, 67, 69, 70
A5, C6, D6, E6, F6 = 81, 84, 86, 88, 89

s = Score(seed=7)
ROOT_DB, FIFTH_DB, INNER_DB = -41.0, -44.5, -48.0      # left hand
EVEN_DB = -38.0                                        # the "calm" right hand

# ------------------------------------------------------------------ pedal (chord change + lag)
changes = [(13, 1.0), (26, .3), (38, 1.6), (52, .4), (65, .9), (76, .3), (94, 1.4), (104, .5), (116, .6),
           (128, .5), (140, 1.2)]
t_on = 0.0
for c, lag in changes:
    s.pedal_down(t_on, c + lag)
    t_on = c + lag + 0.22
s.pedal_down(t_on, L_SEC + 6.0)          # the last chord is held across the loop point

# ------------------------------------------------------------------ cycle 1 : statement
# Dm  (the low D comes in 1.3 s after the start, under the last chord's dying tail)
s.note_db(D2, 1.3, 11.5, ROOT_DB)
s.note_db(A2, 3.4, 9.2, FIFTH_DB)
s.note_db(D3, 6.3, 6.2, INNER_DB)
s.phrase_db(8.4, [D4, E4, F4, E4], [1.0, 1.0, 1.0], EVEN_DB, durs=[.97, .97, .97, 4.0], jitter_db=0)  # perfectly even
# Bbmaj7
s.note_db(Bb1, 13.4, 12.2, ROOT_DB)
s.note_db(F2, 16.2, 9.3, FIFTH_DB)
s.note_db(A3, 17.5, 8.0, INNER_DB)
s.phrase_db(20.4, [F4, G4, A4, G4], [1.0, 1.0, 1.14], [EVEN_DB, EVEN_DB, EVEN_DB - 1.5, EVEN_DB - 4.5],
            durs=[.97, .97, 1.05, 3.0], jitter_db=0)                                 # last note late, soft
# Gm(add9)
s.note_db(G2, 26.3, 11.4, ROOT_DB)
s.note_db(D3, 28.6, 9.0, FIFTH_DB)
s.note_db(Bb3, 31.5, 6.0, INNER_DB)
s.phrase_db(32.2, [Bb4, A4, G4, A4], [1.0, 1.0, 2.3], [EVEN_DB - 1, EVEN_DB - 1.5, EVEN_DB - 2.5, EVEN_DB - 5],
            durs=[.97, .97, 2.2, 3.5], jitter_db=0.3)                                # stops on the 9th
# Asus4  (the clash with the still-ringing Gm is the pedal lag)
s.note_db(A1, 38.4, 12.6, ROOT_DB)
s.note_db(E2, 41.2, 9.8, FIFTH_DB)
s.note_db(D3, 44.4, 6.0, INNER_DB)
s.note_db(G4, 46.0, 5.0, EVEN_DB - 4)
s.note_db(E4, 49.8, 2.0, EVEN_DB - 8)

# ------------------------------------------------------------------ cycle 2 : the pulse, then Sam
# Dm
s.note_db(D2, 52.4, 12.2, ROOT_DB)
s.note_db(A2, 55.2, 9.4, FIFTH_DB)
s.note_db(F3, 58.0, 6.4, INNER_DB)
s.phrase_db(57.6, [D4, E4, F4, E4, D4], [1.0, 1.0, 1.0, 1.35], [EVEN_DB] * 3 + [EVEN_DB - 2.5, EVEN_DB - 6],
            durs=[.97, .97, .97, 1.2, 4.0], jitter_db=0)
# Bbmaj7
s.note_db(Bb1, 65.4, 10.1, ROOT_DB)
s.note_db(F2, 67.6, 8.0, FIFTH_DB)
s.phrase_db(69.0, [F4, G4, A4, G4, G4], [1.0, 1.0, 1.0, 0.32],
            [EVEN_DB, EVEN_DB, EVEN_DB - .5, EVEN_DB - 3, EVEN_DB - 7], durs=[.97, .97, .97, .3, 3.5], jitter_db=0)  # a catch
# the breathing pulse: one soft A3 every 2 s through cycle 2, stopping before the fragment
for k in range(14):
    s.note_db(A3, 53.0 + 2.0 * k, 1.9, -52.0, jitter_db=0.8)
# Dm : Sam's first four notes, slowed ~6x, minor colour (A F D E, F natural), once, unresolved
s.note_db(D2, 76.4, 17.4, ROOT_DB - 1)
s.note_db(A2, 80.0, 13.6, FIFTH_DB - 1)
s.note_db(A4, 83.0, 2.6, -36.5, jitter_db=0.2)
s.note_db(F4, 85.9, 2.5, -38.0, jitter_db=0.2)
s.note_db(D4, 88.7, 2.7, -39.0, jitter_db=0.2)
s.note_db(E4, 92.3, 9.0, -40.5, jitter_db=0.2)       # hangs over the bass that drops to Bb below it
# Bb(#11)
s.note_db(Bb1, 94.6, 9.0, ROOT_DB - 1)
s.note_db(F2, 97.4, 6.0, FIFTH_DB - 1)

# ------------------------------------------------------------------ cycle 3 : dissolving
s.note_db(D2, 104.5, 10.8, ROOT_DB - 1)
s.note_db(A2, 109.0, 6.3, FIFTH_DB - 1)
s.phrase_db(110.2, [D4, E4], [1.25], [EVEN_DB - 2, EVEN_DB - 4.5], durs=[1.2, 4.0], jitter_db=0)   # starts the figure; doesn't finish
s.note_db(Bb1, 116.5, 10.9, ROOT_DB - 1)
s.note_db(A3, 120.0, 7.0, INNER_DB)
s.note_db(F4, 123.0, 4.0, EVEN_DB - 4)
s.note_db(G2, 128.4, 10.9, ROOT_DB - 1)
s.note_db(D3, 131.0, 7.7, INNER_DB)
s.note_db(A4, 134.5, 4.0, EVEN_DB - 5)
s.note_db(A1, 140.5, 18.0, ROOT_DB)                  # A7sus4: A E G D, held across the loop point
s.note_db(E2, 143.2, 15.0, FIFTH_DB)
s.note_db(G3, 146.5, 12.0, INNER_DB)
s.note_db(D4, 150.5, 8.0, INNER_DB + 1)

# ------------------------------------------------------------------ snow: a few very quiet high notes
for t, p, db in [(17.2, E6, -52), (29.9, D6, -53), (41.8, A5, -51), (47.9, F6, -54), (112.9, D6, -53),
                 (126.6, E6, -54), (137.3, C6, -53), (150.0, A5, -53)]:
    s.note_db(p, t, 2.0, db)

# =============================================================================== render + mix
L = int(L_SEC * SR)
y = lib.render_piano(s, NAME)
piano = lib.fold_loop(y, L_SEC)

piano = lib.eq(piano, lp=4800, hp=30, circular=True)                      # felt: soften the top
onsets = [n['time'] for n in s.notes]
thud = lib.soft_thuds(L, onsets, level_db=-64, tone=260, dur=.04, seed=2)           # hammers on felt
pedal_noise = lib.soft_thuds(L, [p['endTime'] for p in s.pedal[:-1]] + [p['time'] for p in s.pedal[1:]],
                             level_db=-58, tone=110, dur=.09, seed=4, jitter=.02)   # pedal mechanism
dry = piano + thud + pedal_noise

ir = lib.make_ir(seconds=5.0, predelay=0.024, dark=0.9, seed=12,
                 bands=((90, 3.4), (350, 4.4), (1400, 3.2), (4500, 1.6), (9000, 0.7)))
wet = lib.circ_conv(dry, ir)
wet *= np.sqrt((dry ** 2).mean() / (wet ** 2).mean())          # equal-energy return, then dial it in
room = 0.86 * dry + 0.55 * wet

drone = lib.glass_drone(L, [(880.0, 1.0, 5, 0.2, -0.35), (1318.5, 0.6, 4, 2.4, 0.35), (1760.0, 0.2, 3, 4.1, 0.1)], seed=3)
drone *= 10 ** (-66.0 / 20) / np.sqrt((drone ** 2).mean())     # RMS -66 dBFS raw: a hum you only notice in the gaps

mix = room + drone
# tape: slow wow + flutter, drifting a few cents once per loop
mix = lib.tape_wow(mix, wow=[(0.33, 6.0), (0.81, 2.5), (5.6, 1.2), (1.0 / L_SEC, 4.0)], seed=1)
mix = mix + lib.hiss(L, -76.0)                                 # hiss does not wobble
for t0, dur, f0, f1, db in [(21.3, .8, 190, 260, -64), (74.1, .7, 240, 170, -64), (133.0, .9, 210, 300, -64)]:
    mix = mix + lib.creak(L, t0, dur, f0, f1, db, seed=int(t0))
mix = lib.eq(mix, lp=9500, hp=38, circular=True)

final, info = lib.master(mix, target_lufs=-18.0)
print({k: (round(float(v), 2) if not isinstance(v, bool) else v) for k, v in info.items()})
print('seam', {k: round(float(v), 5) for k, v in lib.seam_report(final).items()})
lib.spectrogram_png(final, f'{lib.WORK}/{NAME}.png', 'menu (loop)')
lib.write_ogg(final, OUT, quality=6)
print(lib.verify_ogg(OUT))
print('decoded-ogg seam', lib.decoded_seam(OUT))
