"""STATIC  -  art/music/night_station.ogg   (late night alone in the cabin; 3:00 loop, very sparse)

One low piano note every few seconds, now and then two, drowned in a long dark room.  Almost not music:
the pitches are drawn from a small modal pool (D, A, E, G, F, C, Bb) by rules that stop any tune forming -
no stepwise motion, no immediate repeats, no pattern in the gaps - with three longer silences.  The pedal
stays down for ~20 s at a time so notes pile into a soft haze, and is lifted just before the loop point so
the file turns over in near-silence.
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import SR, Score

NAME = 'night_station'
L_SEC = 180.0
L = int(L_SEC * SR)
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(lib.ROOT, 'examples/static-score/out/night_station.ogg')
rng = np.random.default_rng(23)

POOL = {38: .20, 45: .17, 40: .07, 43: .08, 50: .11, 53: .08, 57: .08, 48: .07, 52: .06, 46: .05, 41: .03}   # D2 A2 E2 G2 D3 F3 A3 C3 E3 Bb2 F2
PAIRS = [7, 5, 12, 14, 10, 3]            # fifth, fourth, octave, ninth, minor 7th, minor 3rd (second note above)
names = {38: 'D2', 45: 'A2', 40: 'E2', 43: 'G2', 50: 'D3', 53: 'F3', 57: 'A3', 48: 'C3', 52: 'E3', 46: 'Bb2', 41: 'F2'}

# ---- the event list
events, t, prev = [], 2.6, None
long_gaps = {2: 11.5, 17: 9.8, 33: 12.2}                       # event index -> an extra-long silence before it
i = 0
while t < L_SEC - 9.0:
    pool = [p for p in POOL if p != (prev if prev else -1) and (prev is None or abs(p - prev) > 2)]
    w = np.array([POOL[p] for p in pool]); w /= w.sum()
    p = int(rng.choice(pool, p=w))
    db = float(np.clip(rng.normal(-47.5, 2.2), -53, -41.5))
    ev = [(p, db)]
    if rng.random() < 0.20:
        q = p + int(rng.choice(PAIRS))
        if q <= 64:
            ev.append((q, db - 3.0))
    events.append((t, ev))
    prev = p
    gap = long_gaps.get(i + 1, float(rng.uniform(2.3, 7.4)))
    t += gap
    i += 1

sc = Score(seed=23)
for ti, ev in events:
    for k, (p, db) in enumerate(ev):
        sc.note_db(p, ti + 0.28 * k + abs(rng.normal(0, 0.03)), 6.0, db, jitter_db=0.0)

# ---- pedal: down for ~20 s at a time; lifted at the end of the loop so it turns over quietly
cuts = [0.0, 24.0, 47.0, 71.0, 95.0, 118.0, 141.0, 163.5]
for a, b in zip(cuts, cuts[1:] + [L_SEC - 1.6]):
    sc.pedal_down(a + 0.15, b)
print('events:', len(events), '| two-note events:', sum(len(e) == 2 for _, e in events))
print('gaps (s):', np.round(np.diff([e[0] for e in events]), 1).tolist())
print(' '.join(f'{ti:.0f}:' + '+'.join(names.get(p, str(p)) for p, _ in ev) for ti, ev in events[:20]), '...')

# ---- render, fold, room
y = lib.render_piano(sc, NAME)
piano = lib.eq(lib.fold_loop(y, L_SEC), lp=5200, hp=30, circular=True)
dry = piano
ir = lib.make_ir(seconds=9.0, predelay=0.04, bands=((60, 8.5), (250, 8.5), (1000, 7.0), (4000, 4.5), (9000, 2.4)), dark=0.85, seed=90)
wet = lib.circ_conv(dry, ir); wet *= np.sqrt((dry ** 2).mean() / (wet ** 2).mean())
mix = 0.55 * dry + 1.0 * wet
mix = lib.tape_wow(mix, wow=[(0.23, 5.0), (0.61, 2.2), (5.0, 1.0)], seed=8)
mix = mix + lib.hiss(L, -83.0)          # the master adds ~30 dB to a track this sparse: keep the hiss near -53 dBFS final
mix = lib.eq(mix, lp=9500, hp=34, circular=True)
final, info = lib.master(mix, target_lufs=-18.0)
print({k: (round(float(v), 2) if not isinstance(v, bool) else v) for k, v in info.items()})
print('seam', {k: round(float(v), 5) for k, v in lib.seam_report(final).items()})
lib.spectrogram_png(final, f'{lib.WORK}/{NAME}.png', NAME)
lib.write_ogg(final, OUT, quality=6)
print(lib.verify_ogg(OUT))
print('decoded-ogg seam', lib.decoded_seam(OUT))
