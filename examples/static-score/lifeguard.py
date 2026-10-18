"""STATIC  -  art/music/lifeguard.ogg   (the Lifeguard in the tall white chair; 48 s loop; no melody)

One bowed low D (cello-like, D2) that swells and recedes once per loop, a sub-bass D1 that only rises
near the peak, and high glass harmonics hanging over it: A6 with a slow beating twin, E7 a fifth
above, and - only around the peak - a B-flat that rubs against the A for a few seconds.
Nothing moves, nothing resolves; it is meant to be felt more than heard, so it is mastered quieter
than the rest of the score (-24 LUFS instead of -18; one number below to change).
Every frequency / modulation is an integer number of cycles per loop and the bowed note's phase is
forced to close exactly, so the 48 s loop is seamless.
"""
import os, sys
import numpy as np
from scipy import signal
sys.path.insert(0, os.path.dirname(__file__))
import lib, synth as S
from lib import SR
from synth import hz

NAME = 'lifeguard'
L_SEC = 48.0
L = int(L_SEC * SR)
TARGET_LUFS = -24.0
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(lib.ROOT, 'examples/static-score/out/lifeguard.ogg')
rng = np.random.default_rng(48)
n = np.arange(L)
t = n / SR
TAU = 2 * np.pi


def phase(f0, mods):
    """Periodic phase accumulator: base pitch snapped to whole cycles per loop, modulations of
    (cycles_per_loop, depth_cents, phase0, envelope), and a tiny linear correction so phase(L) is exactly 2*pi*k0."""
    k0 = max(1, round(f0 * L / SR))
    cents = np.zeros(L)
    for c, depth, ph0, env in mods:
        cents += depth * np.sin(TAU * c * n / L + ph0) * (1.0 if env is None else env)
    inst = (k0 * SR / L) * 2 ** (cents / 1200.0)
    phi = TAU * (np.cumsum(inst) - inst) / SR
    phi += (TAU * k0 - TAU * inst.sum() / SR) * (n / L)
    return phi


def circ_filter(b, a, x):
    return signal.lfilter(b, a, np.concatenate([x, x, x]))[L:2 * L]


# ------------------------------------------------------------------ the swell, once per loop (peak at 30 s)
s_ = 0.5 + 0.5 * np.cos(TAU * (t - 30.0) / L_SEC)
bow_env = 0.22 + 0.78 * s_ ** 1.3
for tc in (14.0, 38.0):                                     # two bow changes: brief dips
    bow_env *= 1 - 0.28 * np.exp(-((t - tc) / 0.7) ** 2)

# ------------------------------------------------------------------ bowed low D
vib_env = np.clip((bow_env - 0.35) / 0.65, 0, 1)            # vibrato only when the bow is pressing
phi = phase(73.416, [(1, 7.0, 0.7, None), (3, 3.0, 2.0, None), (221, 5.0, 0.0, vib_env)])
cello = np.zeros(L)
for k in range(1, 40):
    if 73.416 * k > 5000:
        break
    cello += np.sin(k * phi + rng.uniform(0, TAU)) / k ** 1.05
bow = signal.sosfilt(signal.butter(2, [400, 2200], 'bandpass', fs=SR, output='sos'), np.concatenate([rng.standard_normal(L)] * 3))[L:2 * L]
cello = cello + 0.20 * bow * (0.4 + 0.6 * vib_env)
for fc, q, g in ((230.0, 4.0, 1.0), (520.0, 4.0, 0.7)):     # body resonances
    b, a = signal.iirpeak(fc, q, fs=SR)
    cello = cello + 0.8 * g * circ_filter(b, a, cello)
cello *= bow_env
cello *= 10 ** (-45.0 / 20) / np.sqrt((cello ** 2).mean())

# ------------------------------------------------------------------ sub-bass swell
k_sub = round(36.708 * L_SEC)
sub = np.sin(TAU * k_sub * n / L) * s_ ** 2.6
sub *= 10 ** (-53.0 / 20) / np.sqrt((sub ** 2).mean())

# ------------------------------------------------------------------ glass harmonics
def glass(f, beat_hz, env, db, pan, rel2=0.14):
    k = round(f * L_SEC)
    kb = max(1, round(beat_hz * L_SEC))
    sig = (np.sin(TAU * k * n / L + rng.uniform(0, TAU)) + np.sin(TAU * (k + kb) * n / L + rng.uniform(0, TAU))) * 0.5
    sig += rel2 * np.sin(TAU * 2 * k * n / L + rng.uniform(0, TAU))
    sig *= env
    sig *= 10 ** (db / 20) / np.sqrt((sig ** 2).mean())
    return np.stack([sig * np.cos((pan + 1) * np.pi / 4), sig * np.sin((pan + 1) * np.pi / 4)], axis=1)

gA = 0.12 + 0.88 * (0.5 + 0.5 * np.cos(TAU * (t - 27.0) / L_SEC)) ** 1.5
gE = 0.10 + 0.90 * (0.5 + 0.5 * np.cos(TAU * (t - 36.0) / L_SEC)) ** 1.8
gB = np.exp(-((t - 31.0) / 4.5) ** 2)                      # the B-flat rub, only around the peak
glassA = glass(1760.0, 0.9, gA, -62.0, -0.5)
glassE = glass(2637.0, 0.7, gE, -66.0, 0.5)
glassB = glass(1864.7, 0.5, gB, -68.0, 0.05, rel2=0.06)

# ------------------------------------------------------------------ room, tape, master
mono = np.stack([cello, cello], axis=1) + np.stack([sub, sub], axis=1)
body = mono + glassA + glassE + glassB
ir = lib.make_ir(seconds=6.0, predelay=0.03, bands=((60, 5.5), (250, 5.0), (1000, 4.2), (4000, 3.0), (9000, 1.6)), dark=0.85, seed=77)
wet = lib.circ_conv(body, ir); wet *= np.sqrt((body ** 2).mean() / (wet ** 2).mean())
mix = 0.8 * body + 0.5 * wet
mix = lib.tape_wow(mix, wow=[(0.19, 3.5), (0.52, 1.8), (4.8, 0.7)], seed=9)
mix = mix + lib.hiss(L, -82.0)
mix = lib.eq(mix, lp=9000, hp=28, circular=True)
final, info = lib.master(mix, target_lufs=TARGET_LUFS)
print({k: (round(float(v), 2) if not isinstance(v, bool) else v) for k, v in info.items()})
print('seam', {k: round(float(v), 5) for k, v in lib.seam_report(final).items()})
lib.spectrogram_png(final, f'{lib.WORK}/{NAME}.png', NAME)
lib.write_ogg(final, OUT, quality=6)
print(lib.verify_ogg(OUT))
print('decoded-ogg seam', lib.decoded_seam(OUT))
