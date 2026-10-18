"""STATIC  -  art/music/dream_house.ogg   (dreams 1-2: the childhood house; 2:00 loop)

6/8, dotted-quarter = 72 (bar = 1.667 s), 72 bars = exactly 120 s, D major - bright on the surface,
a little wrong underneath.  Sam's song fits the metre exactly: each half is 12 beats = 6 bars.

    bars  1- 6  intro      celesta music-box arpeggios; a pad begins
    bars  7-18  tune       Sam's song on celesta, plain (first half bar 7, second half bar 13), felt-piano waltz under it
    bars 19-30  tune 2     toy piano takes it (celesta an octave above); bar 22 goes minor-iv: Gm6 under F# E
    bars 31-42  bridge     B minor: the first four notes skip like a stuck music box, three times, the third stops
    bars 43-54  tune 3     celesta again - one wrong note (F natural), and the second half stops before it ends
    bars 55-72  outro      the waltz thins out, three lone notes (A, F#, D) hint at the start, then back to the intro

The strings pad drifts slowly flat (-24 cents at the loop's midpoint) and recovers by the loop point; the celesta
sits ~9 cents sharp and the toy piano ~9 cents flat against it, so the room goes gently out of tune and back.
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import lib, synth as S
from lib import SR, Score
from synth import hz, at_db
from sam import FIRST_HALF, SECOND_HALF, FIRST_FOUR

NAME = 'dream_house'
BEAT = 60.0 / 72.0                    # dotted quarter
E8 = BEAT / 3
BAR = 2 * BEAT
BARS = 72
L_SEC = BARS * BAR                    # 120.0
L = int(round(L_SEC * SR))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(lib.ROOT, 'examples/static-score/out/dream_house.ogg')
rng = np.random.default_rng(72)


def tb(bar, beat=0.0):                # seconds at the given 1-based bar and (0-based) dotted-quarter beat
    return ((bar - 1) * 2 + beat) * BEAT


# ------------------------------------------------------------------ harmony
S1 = ['D', 'D', 'Gmaj7', 'A6', 'D', 'Bm7', 'Em7', 'Gmaj7', 'Asus4', 'A', 'Gmaj7', 'Bm']
S2 = list(S1); S2[3] = 'Gm6'
BRIDGE = ['Bm', 'Bm', 'G', 'G', 'Em7', 'Em7', 'Bm', 'Bm', 'Gm', 'Gm', 'Asus4', 'A']
OUTRO = ['D', 'D', 'Gmaj7', 'Gmaj7', 'Bm7', 'Bm7', 'Em7', 'Em7', 'Asus4', 'Asus4', 'A', 'A', 'D', 'D', 'D', 'D', 'A', 'A']
chords = ['D', 'D', 'Gmaj7', 'Gmaj7', 'A', 'A'] + S1 + S2 + BRIDGE + S1 + OUTRO
assert len(chords) == BARS
WALTZ = {   # bass, [chord notes]
    'D': (38, [57, 62, 66]), 'Gmaj7': (43, [59, 62, 66]), 'A': (45, [61, 64, 69]), 'A6': (45, [61, 64, 66]),
    'Bm7': (47, [57, 62, 66]), 'Em7': (40, [55, 59, 62]), 'Asus4': (45, [62, 64, 69]), 'Bm': (47, [59, 62, 66]),
    'G': (43, [59, 62, 67]), 'Gm6': (43, [58, 62, 64]), 'Gm': (43, [58, 62, 67]),
}
PAD = {
    'D': [50, 57, 66], 'Gmaj7': [55, 62, 66], 'A': [52, 57, 61], 'A6': [52, 57, 61], 'Bm7': [54, 59, 62], 'Em7': [52, 59, 62],
    'Asus4': [52, 57, 62], 'Bm': [54, 59, 62], 'G': [55, 59, 62], 'Gm6': [55, 58, 62], 'Gm': [55, 58, 62],
}

# ------------------------------------------------------------------ the felt-piano waltz (Salamander)
sp = Score(seed=72)
for bar in range(7, 69):
    name = chords[bar - 1]
    bass, notes = WALTZ[name]
    soft = 3.0 if 31 <= bar <= 42 else 0.0
    if bar >= 55:
        soft += 2.0
    sp.pedal_down(tb(bar) - 0.02, tb(bar + 1) - 0.12)
    sp.note_db(bass, tb(bar), BAR - 0.2, -43.0 - soft, jitter_db=0.6)
    if bar < 63 and not (39 <= bar <= 42):
        for k, m in enumerate(notes):
            sp.note_db(m, tb(bar, 1) + 0.012 * k + abs(rng.normal(0, 0.012)), BEAT - 0.1, -49.0 - soft, jitter_db=0.7)
y = lib.render_piano(sp, NAME)
piano = lib.eq(lib.fold_loop(y, L_SEC), lp=5200, hp=40, circular=True)

# ------------------------------------------------------------------ bright toys (synth)
out = np.zeros((L, 2))
CEL, TOY = +9.0, -9.0                 # cents: the toys disagree with each other, and with the piano


def cel(m, t, db, vel=0.6, dur=3.0, pan=0.2, oct_up=0, cents=CEL):
    sig = at_db(S.celesta(hz(m + oct_up, cents), dur, vel, seed=int(t * 100) % 977), db)
    S.place(out, sig, int((t + rng.normal(0, .006)) * SR), pan=pan)


def toy(m, t, db, vel=0.6, dur=2.0, pan=-0.2, cents=TOY):
    sig = at_db(S.toy_piano(hz(m, cents), dur, vel, seed=int(t * 100) % 977), db)
    S.place(out, sig, int((t + rng.normal(0, .008)) * SR), pan=pan)


def tune(start_bar, notes, play, base_octave=12, db=-34.5, stop_after=None, stretch=0.0, wrong=None, **kw):
    pos = 0.0
    for i, (m, beats) in enumerate(notes):
        if stop_after is not None and i >= stop_after:
            break
        mm = m + base_octave
        if wrong and i in wrong:
            mm = wrong[i] + base_octave
        play(mm, tb(start_bar) + pos * BEAT, db - (0.3 * i if stretch else 0), **kw)
        pos += beats * (1.0 + stretch * max(0, i - 2) * 0.05 if stretch else 1.0)


# intro: music-box arpeggios
ARP = {'D': [74, 78, 81, 78, 81, 78], 'Gmaj7': [74, 79, 83, 79, 83, 79], 'A': [73, 76, 81, 76, 81, 76]}
for bar in range(1, 7):
    for e, m in enumerate(ARP[chords[bar - 1]]):
        cel(m, tb(bar) + e * E8, -37.5 if e == 0 else -42.0, vel=0.5, dur=2.4)
toy(81, tb(6, 1), -43.0, vel=0.4)
# tune 1: celesta, plain
tune(7, FIRST_HALF, cel)
tune(13, SECOND_HALF, cel)
# tune 2: toy piano, celesta an octave above under it
tune(19, FIRST_HALF, toy, db=-35.5)
tune(25, SECOND_HALF, toy, db=-35.5)
tune(19, FIRST_HALF, cel, db=-46.0, oct_up=12, vel=0.4)
tune(25, SECOND_HALF, cel, db=-46.0, oct_up=12, vel=0.4)
# bridge: the opening four notes, skipping; the third time the last note never comes
for k, (bar, drop) in enumerate([(33, 0.0), (35, 2.5), (37, 5.0)]):
    for i, (m, beats) in enumerate(FIRST_FOUR):
        if k == 2 and i == 3:
            break
        cel(m + 12, tb(bar) + i * BEAT * (1.0 + 0.04 * k), -36.5 - drop, vel=0.5 - 0.06 * k, dur=3.4, pan=0.0)
# tune 3: one wrong note (F natural for the F# in bar 3), and the second half stops before it ends
tune(43, FIRST_HALF, cel, db=-35.5, wrong={4: 65}, vel=0.5)
tune(49, SECOND_HALF, cel, db=-36.5, stop_after=6, stretch=1.0, vel=0.45)
# outro: three lone notes of the opening, very slowly
toy(81, tb(58), -42.0, vel=0.45)
toy(78, tb(62), -43.5, vel=0.4)
cel(74, tb(66), -44.5, vel=0.4, dur=4.0)

# ------------------------------------------------------------------ pad that drifts flat and recovers
n_all = np.arange(L)
drift = -24.0 * np.sin(np.pi * n_all / L) ** 2                    # cents, periodic: 0 at both ends
runs, start = [], 1
for bar in range(2, BARS + 2):
    if bar == BARS + 1 or chords[bar - 1] != chords[start - 1]:
        runs.append((start, bar - start, chords[start - 1])); start = bar
for bar0, nb, name in runs:
    dur = nb * BAR
    for k, m in enumerate(PAD[name]):
        nlen = int((dur + 2.4) * SR)
        s0 = int(tb(bar0) * SR) - int(0.4 * SR)           # start a little early so the chord is full on the downbeat
        cents = drift[(s0 + np.arange(nlen)) % L]
        v = S.string_voice(hz(m), dur, attack=2.2, release=2.4, cents=cents, vib=(4.6, 5.0, 2.0), seed=bar0 * 10 + k)
        v = at_db(v, -52.0 if bar0 >= 3 else -60.0, 2.6, 4.0)
        S.place(out, v, s0, pan=(-0.4, 0.0, 0.4)[k % 3] * 0.7)

# ------------------------------------------------------------------ room, tape, master
dry = piano + out
ir = lib.make_ir(seconds=2.6, predelay=0.014, bands=((90, 1.9), (350, 2.0), (1400, 1.9), (4500, 1.4), (9000, 0.9)), dark=1.0, seed=52)
wet = lib.circ_conv(dry, ir); wet *= np.sqrt((dry ** 2).mean() / (wet ** 2).mean())
mix = 0.85 * dry + 0.40 * wet
mix = lib.tape_wow(mix, wow=[(0.37, 4.0), (0.88, 2.0), (6.0, 1.0)], seed=5)
mix = mix + lib.hiss(L, -74.0)
mix = lib.eq(mix, lp=10500, hp=40, circular=True)
final, info = lib.master(mix, target_lufs=-18.0)
print({k: (round(float(v), 2) if not isinstance(v, bool) else v) for k, v in info.items()})
print('seam', {k: round(float(v), 5) for k, v in lib.seam_report(final).items()})
lib.spectrogram_png(final, f'{lib.WORK}/{NAME}.png', NAME)
lib.write_ogg(final, OUT, quality=6)
print(lib.verify_ogg(OUT))
print('decoded-ogg seam', lib.decoded_seam(OUT))
