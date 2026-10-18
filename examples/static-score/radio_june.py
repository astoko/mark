"""STATIC  -  art/music/radio_june.ogg   (night radio calls with June; 2:00 loop, sits under speech)

C major, 64 bpm, 32 bars = exactly 120 s.  A soft FM electric piano, close and a little wobbly, two
people pretending to be fine: warm major shells, a hopeful melody that stays small, and one sad
chord per cycle (Fm6, the minor iv) that the melody leans on with its flat 6th (Ab).
It stays out of the way of voices: left hand below ~250 Hz, sparse melody, 1-3 kHz scooped.
    A (1-8) Cmaj7 | Am7 | Fmaj7 | Fm6 . C        A' (9-16) the same with the melody
    B (17-24) Dm7 | G7sus4 | Cmaj7 | Am7 | Fmaj7 | Fm6 | Cmaj7 .   A'' (25-32) thinned; last note lingers
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import lib, synth as S
from lib import SR
from synth import hz

NAME = 'radio_june'
BPM = 64.0
BEAT = 60.0 / BPM
BARS = 32
L_SEC = BARS * 4 * BEAT                    # 120.0 s
L = int(round(L_SEC * SR))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(lib.ROOT, 'examples/static-score/out/radio_june.ogg')
rng = np.random.default_rng(64)

out = np.zeros((L, 2))
def T(bar, beat=1.0):                       # 1-based bar, 1-based beat -> seconds
    return ((bar - 1) * 4 + (beat - 1)) * BEAT

def ep(midi, t, beats, vel, pan=0.0, lazy=0.012):
    t = t + abs(rng.normal(0, lazy))
    vel = float(np.clip(vel + rng.normal(0, .02), .12, .9))
    sig = S.ep_tone(hz(midi, rng.normal(-2, 3)), beats * BEAT, vel)
    S.place(out, sig, int(t * SR), pan=pan)

# (bar, root, shell notes, beats of bass, voicing) - one chord per entry, `len` bars
CH = {  # bass, [bass2], shell
    'C':   (36, 43, (52, 59)),            # C2 G2 | E3 B3
    'Am':  (33, 40, (48, 55)),            # A1 E2 | C3 G3
    'F':   (41, 48, (57, 64)),            # F2 C3 | A3 E4
    'Fm6': (41, 48, (56, 62)),            # F2 C3 | Ab3 D4   <- the sad chord
    'Dm':  (38, 45, (53, 60)),            # D2 A2 | F3 C4
    'G7s': (43, 50, (53, 60)),            # G2 D3 | F3 C4  (G7sus4 shell)
    'Cadd9': (36, 43, (52, 62)),          # C2 G2 | E3 D4
}
prog = [
    (1, 2, 'C'), (3, 2, 'Am'), (5, 2, 'F'), (7, 1, 'Fm6'), (8, 1, 'C'),
    (9, 2, 'C'), (11, 2, 'Am'), (13, 2, 'F'), (15, 1, 'Fm6'), (16, 1, 'C'),
    (17, 1, 'Dm'), (18, 1, 'G7s'), (19, 2, 'C'), (21, 1, 'Am'), (22, 1, 'F'), (23, 1, 'Fm6'), (24, 1, 'Cadd9'),
    (25, 2, 'C'), (27, 2, 'Am'), (29, 2, 'F'), (31, 1, 'Fm6'), (32, 1, 'C'),
]
for bar, nb, name in prog:
    b1, b2, (s1, s2) = CH[name]
    for k in range(nb):
        bb = bar + k
        thin = bb >= 25
        ep(b1, T(bb), 3.6, 0.40 if not thin else 0.34, pan=-0.05)
        if not (thin and k == 1):
            ep(b2, T(bb, 3.0), 1.7, 0.27, pan=-0.05)
        ep(s1, T(bb, 2.5), 1.4, 0.22 if not thin else 0.19, pan=-0.2, lazy=0.02)
        ep(s2, T(bb, 2.5) + 0.07, 1.4, 0.21 if not thin else 0.17, pan=0.2, lazy=0.02)

# melody: (bar, beat, midi, beats)
E5, G5, D5, C5, A4, G4, Ab4, A5, B4 = 76, 79, 74, 72, 69, 67, 68, 81, 71
mel = [
    (9, 1, E5, 2.0), (9, 3, G5, 1.5), (10, 1, E5, 3.4), (11, 1, C5, 1.5), (11, 2.5, D5, 1.5), (11, 4, E5, 1.0), (12, 1, C5, 3.4),
    (13, 1, A4, 1.5), (13, 2.5, C5, 1.5), (13, 4, A4, 1.0), (14, 1, G4, 3.0), (15, 1, Ab4, 2.5), (16, 1, G4, 3.8),
    (17, 1, A4, 2.0), (17, 3, C5, 1.5), (18, 1, D5, 3.0), (19, 1, G5, 2.0), (19, 3, E5, 1.5), (20, 1, G5, 3.4),
    (21, 1, E5, 1.5), (21, 2.5, D5, 1.5), (21, 4, C5, 1.0), (22, 1, C5, 3.4), (23, 1, Ab4, 3.0), (24, 1, G4, 2.0), (24, 3, D5, 1.8),
    (25, 1, E5, 2.0), (26, 1, E5, 1.2), (27, 2, C5, 2.0), (29, 1, A4, 2.5), (31, 1, Ab4, 2.5), (32, 1, G4, 3.6),
]
for bar, beat, m, d in mel:
    ep(m, T(bar, beat), d, 0.28, pan=0.12, lazy=0.025)

# room: small and close
ir = lib.make_ir(seconds=2.2, predelay=0.011, bands=((90, 1.7), (350, 1.6), (1400, 1.25), (4500, 0.7), (9000, 0.35)),
                 dark=0.8, seed=41)
dry = lib.eq(out, hp=45, circular=True)
wet = lib.circ_conv(dry, ir); wet *= np.sqrt((dry ** 2).mean() / (wet ** 2).mean())
room = 0.88 * dry + 0.38 * wet
# gentle stereo tremolo, as on a stage piano
n = np.arange(L); kt = round(0.45 * L_SEC)
lfo = 0.10 * np.sin(2 * np.pi * kt * n / L)
room[:, 0] *= 1 + lfo; room[:, 1] *= 1 - lfo
mix = lib.tape_wow(room, wow=[(0.42, 7.0), (0.97, 3.0), (6.1, 1.5), (1.0 / L_SEC, 3.0)], seed=2)
mix = mix + lib.hiss(L, -72.0) * 1.0
mix = mix + lib.hum(L, -78.0)
# stay out of the speech register
mix = lib.peaking(mix, 1800, -4.0, q=0.7, circular=True)
mix = lib.peaking(mix, 650, -3.0, q=0.8, circular=True)
mix = lib.eq(mix, lp=5200, hp=50, circular=True)
final, info = lib.master(mix, target_lufs=-18.0)
print({k: (round(float(v), 2) if not isinstance(v, bool) else v) for k, v in info.items()})
print('seam', {k: round(float(v), 5) for k, v in lib.seam_report(final).items()})
lib.spectrogram_png(final, f'{lib.WORK}/{NAME}.png', NAME)
lib.write_ogg(final, OUT, quality=6)
print(lib.verify_ogg(OUT))
print('decoded-ogg seam', lib.decoded_seam(OUT))
