"""Small synthesis toolkit for the STATIC score: the non-piano voices.

Everything returns mono float arrays (or stereo for ambiences).  `place()` adds a sound into a
stereo loop buffer with wrap-around, so a note that rings past the end of a loop flows into its
start.  Periodic ambiences snap every frequency / LFO to a whole number of cycles per loop.
"""
import numpy as np
from scipy import signal

SR = 44100
TAU = 2 * np.pi


def place(out, sig, start, pan=0.0, gain=1.0, wrap=True):
    """Add mono `sig` into stereo `out` at sample `start` (constant-power pan, -1..1)."""
    N = len(out)
    gl, gr = np.cos((pan + 1) * np.pi / 4) * gain, np.sin((pan + 1) * np.pi / 4) * gain
    pos = int(start) % N if wrap else int(start)
    while len(sig) > 0 and pos < N:
        take = min(len(sig), N - pos)
        out[pos:pos + take, 0] += sig[:take] * gl
        out[pos:pos + take, 1] += sig[:take] * gr
        sig = sig[take:]
        if not wrap:
            break
        pos = 0


def hz(midi, cents=0.0):
    return 440.0 * 2 ** ((midi - 69 + cents / 100.0) / 12)


def _t(n):
    return np.arange(n) / SR


# ----------------------------------------------------------------------------- electric piano
def ep_tone(f, dur, vel=0.6, tail=0.8):
    """FM electric piano (Rhodes-ish): a sustained 1:1 FM pair for the body, plus a short
    high-ratio 'tine' ping. vel 0..1 sets brightness and level."""
    n = int((dur + tail) * SR)
    t = _t(n)
    decay = 3.6 * (261.6 / f) ** 0.33
    body_idx = (0.5 + 1.5 * vel) * np.exp(-t / 0.55) + 0.14 + 0.22 * vel
    ph = TAU * f * t
    body = np.sin(ph + body_idx * np.sin(ph)) * np.exp(-t / decay)
    r2 = min(14.0, 8000.0 / f)
    tine = np.sin(ph + 0.9 * vel * np.exp(-t / 0.05) * np.sin(ph * r2)) * np.exp(-t / 0.16) * 0.2
    att = np.minimum(1, t / 0.004)
    rel = np.where(t < dur, 1.0, np.exp(-(t - dur) / 0.22))
    return (body + tine) * att * rel * (0.25 + 0.75 * vel)


# ----------------------------------------------------------------------------- struck bars
def modal(f, dur, ratios, amps, taus, click=0.0, seed=0, tau_scale=1.0, tail_taper=0.05):
    """Sum of exponentially decaying sine modes: celesta, toy piano, glass, music box."""
    n = int(dur * SR)
    t = _t(n)
    rng = np.random.default_rng(seed)
    sig = np.zeros(n)
    for r, a, tau in zip(ratios, amps, taus):
        fr = f * r
        if fr > 18000:
            continue
        sig += a * np.exp(-t / (tau * tau_scale)) * np.sin(TAU * fr * t + rng.uniform(0, TAU))
    if click:
        m = int(0.006 * SR)
        nz = rng.standard_normal(m) * np.exp(-np.arange(m) / (m / 4))
        nz = signal.sosfilt(signal.butter(2, [2500, 7000], 'bandpass', fs=SR, output='sos'), nz)
        sig[:m] += nz * click
    sig *= np.minimum(1, t / 0.0006)
    k = int(tail_taper * SR)
    sig[-k:] *= np.linspace(1, 0, k)
    return sig


def celesta(f, dur=3.0, vel=0.6, seed=0):
    ts = (880.0 / f) ** 0.45 * (0.6 + 0.6 * vel)
    return modal(f, dur, (1, 2.0, 3.0, 4.2, 6.5), (1, .33, .13, .07, .03), (1.5, .8, .45, .25, .12),
                 click=0.05 * vel, seed=seed, tau_scale=ts) * (0.3 + 0.7 * vel)


def toy_piano(f, dur=2.0, vel=0.6, seed=0):
    ts = (880.0 / f) ** 0.4 * (0.6 + 0.5 * vel)
    s = modal(f, dur, (1, 2.76, 5.40, 8.93), (1, .6, .32, .16), (.7, .35, .2, .1), click=0.12 * vel, seed=seed,
              tau_scale=ts)
    # wooden knock
    m = int(0.02 * SR)
    knock = signal.sosfilt(signal.butter(2, [600, 1800], 'bandpass', fs=SR, output='sos'),
                           np.random.default_rng(seed + 5).standard_normal(m)) * np.exp(-np.arange(m) / (m / 5))
    s[:m] += knock * 0.18 * vel
    return s * (0.3 + 0.7 * vel)


def glass_ping(f, dur=4.0, vel=0.5, seed=0):
    return modal(f, dur, (1, 2.32, 4.25), (1, .18, .05), (3.0, 1.2, .5), seed=seed) * (0.3 + 0.7 * vel)


# ----------------------------------------------------------------------------- strings / bowed
def _phase(f, n, cents=None, vib=None):
    """Phase accumulator for freq f (Hz) with optional cents-modulation array and vibrato (rate, cents)."""
    fr = np.full(n, float(f))
    if cents is not None:
        fr = fr * 2 ** (cents / 1200.0)
    if vib is not None:
        rate, depth, onset = vib
        t = _t(n)
        fr = fr * 2 ** ((depth * np.minimum(1, t / onset) * np.sin(TAU * rate * t)) / 1200.0)
    return TAU * np.cumsum(fr) / SR


def string_voice(f, dur, attack=1.8, release=2.4, cents=None, copies=(-7, 0, 6), rolloff=1.5, kmax=16,
                 vib=None, seed=0):
    """Warm held string: detuned additive saws (1/k^rolloff), slow swell in and out."""
    n = int((dur + release) * SR)
    t = _t(n)
    rng = np.random.default_rng(seed)
    sig = np.zeros(n)
    for dc in copies:
        c = (cents[:n] + dc) if cents is not None else np.full(n, float(dc))
        ph = _phase(f, n, c, vib)
        ph0 = rng.uniform(0, TAU)
        for k in range(1, kmax + 1):
            if f * k > 9000:
                break
            sig += np.sin(k * ph + ph0 * k) * k ** (-rolloff)
    env = np.minimum(1, t / attack) ** 1.5 * np.where(t < dur, 1.0, np.exp(-(t - dur) * 4.0 / release))
    return sig * env / len(copies)


def bowed(f, dur, attack=3.0, release=4.0, swell=None, vib=(5.0, 7.0, 2.5), seed=0, bow_noise=0.04, kmax=24):
    """Bowed low string (cello/bass-like): rich saw (1/k), delayed vibrato, bow noise, two body resonances."""
    n = int((dur + release) * SR)
    t = _t(n)
    ph = _phase(f, n, None, vib)
    sig = np.zeros(n)
    rng = np.random.default_rng(seed)
    for k in range(1, kmax + 1):
        if f * k > 8000:
            break
        sig += np.sin(k * ph + rng.uniform(0, TAU)) / k ** 1.05
    nz = signal.sosfilt(signal.butter(2, [600, 2600], 'bandpass', fs=SR, output='sos'), rng.standard_normal(n))
    sig = sig + bow_noise * nz * 4
    for fc, q, g in ((230.0, 4.0, 1.0), (520.0, 4.0, 0.7)):      # body
        b, a = signal.iirpeak(fc, q, fs=SR)
        sig = sig + g * 0.8 * signal.lfilter(b, a, sig)
    env = np.minimum(1, t / attack) ** 1.4 * np.where(t < dur, 1.0, np.exp(-(t - dur) * 4.0 / release))
    if swell is not None:
        env = env * swell(t)
    return sig * env


def guitar_harmonic(f, dur=4.0, vel=0.5, seed=0):
    """A 12th-fret natural harmonic: nearly a sine, very quick pluck, long soft decay."""
    n = int(dur * SR)
    t = _t(n)
    sig = (np.sin(TAU * f * t * (1 + 0.0014 * np.exp(-t / 0.04))) + 0.09 * np.sin(TAU * 2 * f * t)) * np.exp(-t / 1.7)
    m = int(0.004 * SR)
    pick = signal.sosfilt(signal.butter(2, [1500, 6000], 'bandpass', fs=SR, output='sos'),
                          np.random.default_rng(seed).standard_normal(m)) * np.exp(-np.arange(m) / (m / 4))
    sig[:m] += pick * 0.15
    sig *= np.minimum(1, t / 0.0015)
    k = int(0.05 * SR)
    sig[-k:] *= np.linspace(1, 0, k)
    return sig * (0.3 + 0.7 * vel)


# ----------------------------------------------------------------------------- periodic ambiences
def _snap(f, L):
    return round(f * L / SR) * SR / L


def sine_drone(L, f, level_db, breath_cycles=0, breath_depth=0.0, partials=((1, 1.0), (2, 0.18), (3, 0.05)), pan=0.0, seed=0):
    """A single unchanging pitch (periodic). Optional very slow amplitude breathing."""
    n = np.arange(L)
    k = max(1, round(f * L / SR))
    rng = np.random.default_rng(seed)
    sig = np.zeros(L)
    for h, a in partials:
        sig += a * np.sin(TAU * k * h * n / L + rng.uniform(0, TAU))
    if breath_cycles:
        sig *= 1 - breath_depth * (0.5 - 0.5 * np.cos(TAU * breath_cycles * n / L + rng.uniform(0, TAU)))
    sig *= 10 ** (level_db / 20) / np.sqrt((sig ** 2).mean())
    out = np.zeros((L, 2))
    out[:, 0] = sig * np.cos((pan + 1) * np.pi / 4)
    out[:, 1] = sig * np.sin((pan + 1) * np.pi / 4)
    return out


def tremolo_glass(L, voices, level_db, seed=0):
    """Shimmering glass: voices = [(freq, rel_gain, trem_hz, trem_depth, swell_cycles, pan)].
    Each voice trembles at trem_hz (snapped), swells slowly; a cicada-like shimmer in the tones."""
    n = np.arange(L)
    rng = np.random.default_rng(seed)
    out = np.zeros((L, 2))
    for f, g, tr, depth, sw, pan in voices:
        k = max(1, round(f * L / SR)); kt = max(1, round(tr * L / SR))
        tone = np.sin(TAU * k * n / L + rng.uniform(0, TAU)) + 0.16 * np.sin(TAU * 2 * k * n / L + rng.uniform(0, TAU))
        trem = 1 - depth * (0.5 - 0.5 * np.cos(TAU * kt * n / L + rng.uniform(0, TAU)))
        swell = 0.15 + 0.85 * (0.5 + 0.5 * np.cos(TAU * sw * n / L + rng.uniform(0, TAU))) ** 1.6
        sig = tone * trem * swell * g
        out[:, 0] += sig * np.cos((pan + 1) * np.pi / 4)
        out[:, 1] += sig * np.sin((pan + 1) * np.pi / 4)
    out *= 10 ** (level_db / 20) / np.sqrt((out ** 2).mean())
    return out


def cicada(L, level_db, band=(3600, 7400), pulse_hz=137.0, swells=(7, 11), seed=0):
    """Heat-shimmer noise band, pulsed at ~pulse_hz, with slow irregular swells (periodic over L)."""
    n = np.arange(L)
    rng = np.random.default_rng(seed)
    sos = signal.butter(3, list(band), 'bandpass', fs=SR, output='sos')
    kp = max(1, round(pulse_hz * L / SR))
    pulse = (0.5 + 0.5 * np.sin(TAU * kp * n / L)) ** 2.0
    pulse = 0.35 + 0.65 * pulse
    sw = np.ones(L)
    for m in swells:
        sw *= 0.25 + 0.75 * (0.5 + 0.5 * np.cos(TAU * m * n / L + rng.uniform(0, TAU)))
    out = np.zeros((L, 2))
    for c in range(2):
        nz = signal.sosfilt(sos, rng.standard_normal(L))
        out[:, c] = nz * pulse * sw
    out *= 10 ** (level_db / 20) / np.sqrt((out ** 2).mean())
    return out


# ----------------------------------------------------------------------------- levels
def level_db(sig, t0=0.0, t1=0.5):
    seg = sig[int(t0 * SR):int(t1 * SR)]
    return 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-12)


def at_db(sig, db, t0=0.0, t1=0.5):
    """Scale `sig` so its RMS over [t0, t1] seconds is exactly `db` dBFS (same idea as the piano calibration)."""
    return sig * 10 ** ((db - level_db(sig, t0, t1)) / 20)
