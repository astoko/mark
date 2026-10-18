"""Shared tooling for the STATIC score: note lists -> Salamander render -> lo-fi mix -> OGG.

Every looping track is built so that the loop point is mathematically seamless:
  1. the dry piano is rendered once, with its sustain tail running past the loop end;
  2. that tail is folded (overlap-added) onto the head;
  3. everything after that (reverb, tape wow/flutter, drone) is *circular* over the loop
     length, so the end of the file flows into its beginning with no click and no fade.

Run order for a track script:  Score -> render_piano -> fold_loop -> mix -> master -> write_ogg
"""
import json, os, re, subprocess, sys
import numpy as np
import soundfile as sf
import pyloudnorm as pyln
from scipy import signal

SR = 44100
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SAMPLES = os.environ.get('SALAMANDER_DIR', '/tmp/claude-0/salamander16')
WORK = os.environ.get('STATIC_WORK', '/tmp/claude-0/static')
os.makedirs(WORK, exist_ok=True)
RENDER_OFFSET = 0.3  # render.cjs starts every composition 0.3 s into the file


# ----------------------------------------------------------------------------- calibration
_CAL = None


def tab_level(pitch, touch):
    """Measured raw level (dB) of `pitch` played with MIDI velocity `touch`, gain 0."""
    global _CAL
    if _CAL is None:
        _CAL = json.load(open(os.path.join(os.path.dirname(__file__), 'calib.json')))
    return _CAL[str(int(pitch))][str(int(touch))]


# ----------------------------------------------------------------------------- score
class Score:
    """Notes in seconds. `vel` is MIDI velocity (18-44 is the pp-mp range of the sampler)."""

    def __init__(self, seed=1):
        self.notes, self.pedal = [], []
        self.rng = np.random.default_rng(seed)

    def note(self, pitch, t, dur, vel, detune=None, humanize=True, gain=0.0):
        if detune is None:  # a slightly tired upright: a few cents flat on average
            detune = float(self.rng.normal(-2.5, 3.0))
        if humanize:
            vel = vel + float(self.rng.normal(0, 1.2))
        self.notes.append(dict(pitch=int(pitch), time=round(float(t), 4), dur=round(float(dur), 4),
                               velocity=int(max(6, min(120, round(vel)))), detune=round(detune, 2),
                               gain=round(float(gain), 3)))
        return t

    def note_db(self, pitch, t, dur, db, touch=14, detune=None, jitter_db=0.5):
        """Play `pitch` at a *measured* loudness of `db` (calibrated raw dBFS, see calibrate.py).
        `touch` is the MIDI velocity that picks the sampler layer (timbre): 14 = the softest,
        darkest, felt-like layer; 38 = a firmer touch. Loudness is then set exactly by per-note
        gain, so equal dB really is equal. jitter_db adds a human-sized wobble (0 = mechanical)."""
        if jitter_db:
            db = db + float(self.rng.normal(0, jitter_db))
        level = tab_level(pitch, touch)
        return self.note(pitch, t, dur, touch, detune=detune, humanize=False, gain=db - level)

    def phrase_db(self, t, pitches, iois, dbs, durs=None, jitter_db=0.5, **kw):
        times = [t]
        for d in iois:
            times.append(times[-1] + d)
        for i, (p, tt) in enumerate(zip(pitches, times)):
            dur = durs[i] if durs else (iois[i] * 0.95 if i < len(iois) else 2.0)
            self.note_db(p, tt, dur, dbs[i] if isinstance(dbs, (list, tuple)) else dbs, jitter_db=jitter_db, **kw)
        return times

    def phrase(self, t, pitches, iois, vels, durs=None, **kw):
        """pitches[i] sounds at t + sum(iois[:i]); iois has len(pitches)-1 entries."""
        times = [t]
        for d in iois:
            times.append(times[-1] + d)
        for i, (p, tt) in enumerate(zip(pitches, times)):
            dur = durs[i] if durs else (iois[i] * 0.95 if i < len(iois) else 2.0)
            self.note(p, tt, dur, vels[i] if isinstance(vels, (list, tuple)) else vels, **kw)
        return times

    def pedal_down(self, on, off):
        self.pedal.append(dict(time=round(on, 4), endTime=round(off, 4)))

    def write(self, path, wet=0.0, dry=1.0):
        layers = dict(bass=[n for n in self.notes if n['pitch'] < 48],
                      harmony=[n for n in self.notes if 48 <= n['pitch'] < 66],
                      melody=[n for n in self.notes if n['pitch'] >= 66])
        json.dump(dict(layers=layers, pedal=sorted(self.pedal, key=lambda p: p['time']),
                       render=dict(dry=dry, wet=wet)), open(path, 'w'))


def render_piano(score, name, dry=1.0, wet=0.0):
    """Run the HQ Salamander renderer. Returns stereo float array (N, 2) on the renderer's raw (un-normalised) scale."""
    jpath, wpath = f'{WORK}/{name}.json', f'{WORK}/{name}_dry.wav'
    score.write(jpath, wet=wet, dry=dry)
    env = dict(os.environ, SALAMANDER_DIR=SAMPLES)
    r = subprocess.run(['node', f'{ROOT}/tools/render-hq/render.cjs', jpath, wpath], check=True, env=env,
                       capture_output=True, text=True)
    m = re.search(r'normalised (-?[\d.]+) dB', r.stdout)
    gain_db = float(m.group(1))
    y, sr = sf.read(wpath, dtype='float64')
    assert sr == SR
    # the renderer peak-normalises every file; undo that so all renders share one absolute scale
    return y / 10 ** (gain_db / 20)


# ----------------------------------------------------------------------------- loop tools
def fold_loop(y, loop_seconds):
    """Take the render from the 0.3 s offset, length L, and add everything after L back onto the head."""
    L = int(round(loop_seconds * SR))
    x = y[int(RENDER_OFFSET * SR):]
    out = np.zeros((L, 2))
    n = min(L, len(x))
    out[:n] = x[:n]
    tail = x[L:]
    for k in range(0, len(tail), L):
        seg = tail[k:k + L]
        out[:len(seg)] += seg
    return out


def circ_conv(x, ir):
    """Circular (wrap-around) convolution, per channel. ir must be shorter than x."""
    L = len(x)
    assert len(ir) < L
    X = np.fft.rfft(x, axis=0)
    H = np.fft.rfft(ir, n=L, axis=0)
    return np.fft.irfft(X * H, n=L, axis=0)


def tape_wow(x, wow=((0.0, 0.0),), L=None, seed=0):
    """Circular pitch modulation. wow: iterable of (freq_hz, cents); freq is snapped to a whole
    number of cycles per loop so the modulation is periodic over the file."""
    N = len(x)
    n = np.arange(N)
    rng = np.random.default_rng(seed)
    d = np.zeros(N)
    for f, cents in wow:
        if f <= 0 or cents == 0:
            continue
        k = max(1, round(f * N / SR))
        fs = k * SR / N
        delta = cents * np.log(2) / 1200.0
        amp = delta * SR / (2 * np.pi * fs)
        d += amp * np.sin(2 * np.pi * k * n / N + rng.uniform(0, 2 * np.pi))
    pos = n + d
    ext = np.concatenate([x[-64:], x, x[:64]])
    out = np.empty_like(x)
    for c in range(x.shape[1]):
        out[:, c] = np.interp(pos + 64, np.arange(len(ext)), ext[:, c])
    return out


# ----------------------------------------------------------------------------- sound design
def make_ir(seconds=4.5, bands=((90, 5.0), (350, 4.4), (1400, 3.2), (4500, 1.6), (9000, 0.7)),
            predelay=0.022, early=True, seed=11, dark=1.0):
    """Synthetic stereo room: band-wise exponential decays (low rings longer than high)."""
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    edges = [20] + [int(np.sqrt(a * b)) for (a, _), (b, _) in zip(bands[:-1], bands[1:])] + [16000]
    for ch in range(2):
        acc = np.zeros(n)
        for i, (fc, rt) in enumerate(bands):
            lo, hi = edges[i], edges[i + 1]
            noise = rng.standard_normal(n)
            sos = signal.butter(2, [lo, hi], 'bandpass', fs=SR, output='sos')
            band = signal.sosfilt(sos, noise)
            acc += band * np.exp(-6.91 * t / (rt * dark if fc > 800 else rt))
        ir[:, ch] = acc
    # soft onset after the predelay, and a few early reflections
    pd = int(predelay * SR)
    ir = np.roll(ir, pd, axis=0)
    ir[:pd] = 0
    ramp = np.minimum(1, np.arange(n) / (0.015 * SR))
    ir *= ramp[:, None]
    if early:
        for ms, g in [(9, .35), (14, .28), (23, .22), (31, .2), (47, .14), (63, .1)]:
            for ch in range(2):
                ir[pd + int((ms + 3.7 * ch) * SR / 1000), ch] += g * np.abs(ir[:, ch]).max() * 0.35
    ir /= np.sqrt((ir ** 2).sum(axis=0).mean())  # unit-energy
    return ir


def lin_conv(x, ir):
    """Ordinary (non-circular) convolution, per channel; output keeps x's length + the IR tail."""
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c]) for c in range(x.shape[1])], axis=1)


def fade_out(x, seconds, curve=2.0):
    n = int(seconds * SR)
    x = x.copy()
    x[-n:] *= (np.linspace(1, 0, n) ** curve)[:, None]
    return x


def glass_drone(L, voices, seed=3):
    """Barely-there bowed glass: near-sine voices with a soft 2nd partial, slow swells and a
    little bow noise. voices: list of (freq_hz, gain, swell_cycles_per_loop, swell_phase, pan).
    All frequencies / LFOs snap to whole cycles per loop => perfectly periodic."""
    rng = np.random.default_rng(seed)
    n = np.arange(L)
    out = np.zeros((L, 2))
    for f, g, m, ph, pan in voices:
        env = 0.5 + 0.5 * np.cos(2 * np.pi * m * n / L + ph)
        env = 0.12 + 0.88 * env ** 1.5
        sig = np.zeros(L)
        for dc, w in ((-3.0, 1.0), (+2.5, 0.8)):  # two copies a few cents apart => slow shimmer
            k = round(f * 2 ** (dc / 1200) * L / SR)
            ph0 = rng.uniform(0, 2 * np.pi)
            sig += w * (np.sin(2 * np.pi * k * n / L + ph0) + 0.22 * np.sin(2 * np.pi * 2 * k * n / L + ph0 * 1.7)
                        + 0.06 * np.sin(2 * np.pi * 3 * k * n / L + ph0 * 2.3))
        bow = signal.sosfilt(signal.butter(2, [1800, 5200], 'bandpass', fs=SR, output='sos'), rng.standard_normal(L))
        sig = (sig + 0.5 * bow) * env * g
        out[:, 0] += sig * np.cos((pan + 1) * np.pi / 4)
        out[:, 1] += sig * np.sin((pan + 1) * np.pi / 4)
    return out


def hiss(L, level_db, seed=5):
    rng = np.random.default_rng(seed)
    n = rng.standard_normal((L, 2))
    sos = signal.butter(1, 700, 'highpass', fs=SR, output='sos')  # tape hiss: no rumble
    n = signal.sosfilt(sos, n, axis=0)
    sos = signal.butter(2, 11000, 'lowpass', fs=SR, output='sos')
    n = signal.sosfilt(sos, n, axis=0)
    return n / np.sqrt((n ** 2).mean()) * 10 ** (level_db / 20)


def soft_thuds(L, times, level_db, tone=140, dur=0.05, seed=9, jitter=0.0):
    """Felt/pedal/wood bumps: short low-passed noise bursts at the given times (seconds)."""
    rng = np.random.default_rng(seed)
    out = np.zeros((L, 2))
    for t in times:
        i = int((t + rng.normal(0, jitter)) * SR) % L
        m = int(dur * SR)
        burst = rng.standard_normal(m) * np.exp(-np.arange(m) / (m / 5.0))
        burst = signal.sosfilt(signal.butter(2, tone * rng.uniform(0.8, 1.4), 'lowpass', fs=SR, output='sos'), burst)
        g = 10 ** ((level_db + rng.normal(0, 2)) / 20)
        idx = (i + np.arange(m)) % L
        pan = rng.uniform(-0.5, 0.5)
        out[idx, 0] += burst * g * (1 - pan) / 2
        out[idx, 1] += burst * g * (1 + pan) / 2
    return out


def creak(L, t0, dur, f0, f1, level_db, seed=21):
    """A faint wooden creak: narrow band-pass noise gliding f0->f1, pulsing."""
    rng = np.random.default_rng(seed)
    m = int(dur * SR)
    noise = rng.standard_normal(m)
    f = np.linspace(f0, f1, m)
    # time-varying resonance via a chain of short blocks
    out = np.zeros(m)
    blk = 512
    z = None
    for s in range(0, m, blk):
        fc = f[min(s, m - 1)]
        sos = signal.butter(2, [fc * 0.9, fc * 1.12], 'bandpass', fs=SR, output='sos')
        seg, z_ = signal.sosfilt(sos, noise[s:s + blk], zi=signal.sosfilt_zi(sos) * 0)
        out[s:s + len(seg)] = seg
    env = np.sin(np.pi * np.arange(m) / m) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * np.arange(m) / SR))
    out *= env
    out /= (np.abs(out).max() + 1e-9)
    res = np.zeros((L, 2))
    idx = (int(t0 * SR) + np.arange(m)) % L
    res[idx, 0] += out * 10 ** (level_db / 20)
    res[idx, 1] += out * 10 ** (level_db / 20) * 0.85
    return res


# ----------------------------------------------------------------------------- mastering / checks
def _sos(sos, x, circular):
    """sosfilt; circular=True filters three tiled copies and keeps the middle one, so a looping signal has
    no start-up transient at its loop point."""
    if not circular:
        return signal.sosfilt(sos, x, axis=0)
    n = len(x)
    return signal.sosfilt(sos, np.concatenate([x, x, x]), axis=0)[n:2 * n]


def eq(x, lp=None, hp=None, lp_order=2, hp_order=2, circular=False):
    if hp:
        x = _sos(signal.butter(hp_order, hp, 'highpass', fs=SR, output='sos'), x, circular)
    if lp:
        x = _sos(signal.butter(lp_order, lp, 'lowpass', fs=SR, output='sos'), x, circular)
    return x


def peaking(x, f0, gain_db, q=0.9, circular=False):
    """RBJ peaking EQ (negative gain = scoop)."""
    A = 10 ** (gain_db / 40); w0 = 2 * np.pi * f0 / SR; al = np.sin(w0) / (2 * q); c = np.cos(w0)
    b = np.array([1 + al * A, -2 * c, 1 - al * A]); a = np.array([1 + al / A, -2 * c, 1 - al / A])
    b, a = b / a[0], a / a[0]
    if not circular:
        return signal.lfilter(b, a, x, axis=0)
    n = len(x)
    return signal.lfilter(b, a, np.concatenate([x, x, x]), axis=0)[n:2 * n]


def hum(L, level_db, base=60.0, partials=((1, 1.0), (2, 0.5), (3, 0.2))):
    """Mains hum (periodic over L if base*L/SR is an integer)."""
    n = np.arange(L)
    sig = sum(a * np.sin(2 * np.pi * round(base * h * L / SR) * n / L) for h, a in partials)
    sig = sig / np.sqrt((sig ** 2).mean()) * 10 ** (level_db / 20)
    return np.stack([sig, sig], axis=1)


def integrated_lufs(x):
    return pyln.Meter(SR).integrated_loudness(x)


def true_peak_db(x):
    up = signal.resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.abs(up).max() + 1e-12)


def master(x, target_lufs=-18.0, ceiling_db=-1.0):
    """Gain to target LUFS. If true peak would exceed the ceiling, a transparent soft-knee tanh
    shaper on the peaks only (no pumping) brings it under; reports what was done."""
    lufs = integrated_lufs(x)
    g = 10 ** ((target_lufs - lufs) / 20)
    y = x * g
    tp = true_peak_db(y)
    info = dict(gain_db=20 * np.log10(g), lufs_before=lufs, tp_before=tp, shaped=False)
    if tp > ceiling_db:
        thr = 10 ** ((ceiling_db - 3) / 20)
        a = np.abs(y)
        over = a > thr
        lim = 10 ** (ceiling_db / 20) * 0.97
        y = np.where(over, np.sign(y) * (thr + (lim - thr) * np.tanh((a - thr) / (lim - thr))), y)
        info['shaped'] = True
    info['lufs'] = integrated_lufs(y)
    info['tp'] = true_peak_db(y)
    return y, info


def seam_report(x):
    """How different is the jump across the loop point from an ordinary sample step, and does the
    local energy match on both sides?"""
    step = np.abs(np.diff(x, axis=0)).max(axis=1)
    jump = np.abs(x[0] - x[-1]).max()
    w = int(0.05 * SR)
    a = np.sqrt((x[-w:] ** 2).mean()); b = np.sqrt((x[:w] ** 2).mean())
    return dict(seam_jump=float(jump), p99_step=float(np.percentile(step, 99.9)), max_step=float(step.max()),
                rms_last50ms_db=20 * np.log10(a + 1e-12), rms_first50ms_db=20 * np.log10(b + 1e-12))


def write_ogg(x, out_path, quality=6):
    wav = f'{WORK}/{os.path.basename(out_path)}.wav'
    sf.write(wav, x, SR, subtype='PCM_24')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    subprocess.run(['oggenc', '-Q', '-q', str(quality), '-o', out_path, wav], check=True)
    return out_path


def verify_ogg(path, expect_seconds=None):
    """Decode with ffmpeg (an independent decoder) and measure."""
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_name,sample_rate,channels,duration',
                        '-of', 'default=nw=1', path], capture_output=True, text=True)
    e = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    tail = e[e.rfind('Summary:'):] if 'Summary:' in e else e[-600:]
    return r.stdout.strip(), tail.strip()


def decoded_seam(path):
    """Decode the delivered file with ffmpeg and measure the loop point on *that*."""
    wav = f'{WORK}/_decoded_{os.path.basename(path)}.wav'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', path, wav], check=True)
    x, sr = sf.read(wav)
    rep = seam_report(x)
    rep['frames'] = len(x)
    return {k: round(float(v), 5) for k, v in rep.items()}


def spectrogram_png(x, path, title=''):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    m = x.mean(axis=1)
    f, t, S = signal.spectrogram(m, SR, nperseg=8192, noverlap=6144)
    fig, ax = plt.subplots(2, 1, figsize=(14, 7), gridspec_kw=dict(height_ratios=[3, 1]))
    sel = f < 8000
    ax[0].pcolormesh(t, f[sel], 10 * np.log10(S[sel] + 1e-14), shading='auto', vmin=-130, vmax=-60, cmap='magma')
    ax[0].set_yscale('symlog', linthresh=200); ax[0].set_ylim(30, 8000); ax[0].set_title(title)
    hop = int(0.25 * SR)
    env = [20 * np.log10(np.sqrt((m[i:i + hop] ** 2).mean()) + 1e-9) for i in range(0, len(m) - hop, hop)]
    ax[1].plot(np.arange(len(env)) * 0.25, env); ax[1].set_ylabel('RMS dBFS'); ax[1].grid(alpha=.3)
    ax[1].set_xlim(0, len(m) / SR)
    fig.tight_layout(); fig.savefig(path, dpi=80); plt.close(fig)
