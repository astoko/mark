"""STATIC  -  art/music/memory_birthday.ogg   (the birthday memory; ~75 s, NOT looped)

Solo piano, D major, almost a hymn.  Four-part texture (S soprano, M middle, T tenor, B bass); the
two hands play  RH = S + M,  LH = B + T.  Sam's song, plainly, in the middle voice:

    intro        a lone D-major arpeggio
    phrase 1     M = the FIRST HALF of Sam's song (A F# D E  F# G F# E  D A-) in even quarter notes, a slow
                 soprano above it, bass below;  half cadence on A
    phrase 2     the soprano answers, stepping down F# E D C# B, deceptive cadence onto Bm
    phrase 3     the climb: D E F# A (the heart of the piece, A5) and back to a half cadence
    phrase 4     A G F# E over D G Bm A7 -> the final D major, fully resolved, left to ring

It is the only fully resolved ending in the score.  The inner voice (T, and M outside phrase 1) is chosen
by a small voice-leading solver that forbids parallel 5ths/8ves, crossing and wide spacing, and the result
is checked and printed.
"""
import os, sys, itertools
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import SR, Score
from sam import FIRST_HALF

NAME = 'memory_birthday'
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(lib.ROOT, 'examples/static-score/out/memory_birthday.ogg')
rng = np.random.default_rng(54)

# ------------------------------------------------------------------ the harmony, beat by beat
# pitch classes: D=2 F#=6 A=9 B=11 G=7 E=4 C#=1
CH = {  # allowed pcs, required pcs
    'D': ({2, 6, 9}, {6}), 'D/F#': ({2, 6, 9}, {6}), 'Bm': ({11, 2, 6}, {2}), 'G': ({7, 11, 2}, {11}),
    'G6': ({7, 11, 2, 4}, {11, 4}), 'F#m7': ({6, 9, 1, 4}, {9}), 'A6': ({9, 1, 4, 6}, {1}), 'Em7': ({4, 7, 11, 2}, {7}), 'A': ({9, 1, 4}, {1}), 'A7': ({9, 1, 4, 7}, {1, 7}),
}


def beats(chords, bass, soprano, middle=None):
    return [dict(ch=c, B=b, S=s, M=(None if middle is None else middle[i])) for i, (c, b, s) in enumerate(zip(chords, bass, soprano))]


def halves(xs):            # one value per half note -> one per beat
    return [x for x in xs for _ in (0, 1)]


M1 = [m for m, b in FIRST_HALF for _ in range(b)]                # 12 beats: the tune, held notes repeated per beat
assert len(M1) == 12 and M1[:4] == [69, 66, 62, 64]
P1 = beats(['D', 'D/F#', 'Bm', 'G6', 'D', 'G', 'D', 'Em7', 'G', 'A', 'A', 'A'],
           [38, 42, 47, 43, 38, 43, 38, 40, 43, 45, 45, 45],
           [78, 78, 78, 71, 74, 74, 74, 71, 71, 73, 73, 73], M1)
P2 = beats(halves(['Bm', 'G6', 'D', 'A', 'Bm', 'Bm']), halves([47, 43, 38, 45, 47, 47]), halves([78, 76, 74, 73, 71, 71]))
P3 = beats(halves(['G', 'F#m7', 'A6', 'D', 'G', 'A']), halves([43, 42, 40, 38, 43, 45]), halves([74, 76, 78, 81, 79, 76]))
P4 = beats(halves(['D/F#', 'G', 'Bm', 'A7']), halves([42, 43, 47, 49]), halves([81, 79, 78, 76]))
PHRASES = [P1, P2, P3, P4]
allb = [b for p in PHRASES for b in p]


def pcs(*ns):
    return {n % 12 for n in ns}


def candidates(b):
    allowed, required = CH[b['ch']]
    out = []
    Ms = [b['M']] if b['M'] is not None else range(57, 70)
    for M in Ms:
        for T in range(48, 65):
            if not (b['B'] + 3 <= T <= M - 2 and M + 2 <= b['S'] and M - T <= 14):
                continue
            ns = [b['B'], T, M, b['S']]
            if not pcs(*ns) <= allowed or not required <= pcs(*ns):
                continue
            out.append((b['B'], T, M, b['S']))
    return out


def parallels(a, b):
    """Parallel/antiparallel 5ths and octaves between any pair of voices (index 0..3 = B T M S)."""
    bad = []
    for i, j in itertools.combinations(range(4), 2):
        if a[i] == b[i] or a[j] == b[j]:
            continue
        ia, ib = (a[j] - a[i]) % 12, (b[j] - b[i]) % 12
        if ia == ib and ia in (0, 7):
            bad.append((i, j))
    return bad


def cost(a, b):
    c = 0.0
    for i in (1, 2):                                   # T and M: prefer small, stepwise motion
        d = abs(a[i] - b[i])
        c += d + (3 * (d - 4) if d > 4 else 0)
    return c + 100 * len(parallels(a, b))


THIRD = {'D': 6, 'D/F#': 6, 'Bm': 2, 'G': 11, 'G6': 11, 'Em7': 7, 'A': 1, 'A7': 1, 'F#m7': 9, 'A6': 1}


def solve(bs):
    cands = [candidates(b) for b in bs]
    for i, c in enumerate(cands):
        assert c, f'no voicing for beat {i} {bs[i]}'
    best = [{v: (0.0, None) for v in cands[0]}]
    for i in range(1, len(bs)):
        layer = {}
        for v in cands[i]:
            c, prev = min(((best[-1][u][0] + cost(u, v), u) for u in cands[i - 1]), key=lambda x: x[0])
            # doubling penalty (3rd doubled, leading tone doubled)
            third = THIRD[bs[i]['ch']]
            pcl = [n % 12 for n in v]
            c += 4 * (pcl.count(third) - 1) + (4 if pcl.count(1) > 1 else 0)
            layer[v] = (c, prev)
        best.append(layer)
    v = min(best[-1], key=lambda k: best[-1][k][0])
    path = [v]
    for i in range(len(bs) - 1, 0, -1):
        v = best[i][v][1]; path.append(v)
    return path[::-1]


voicings = solve(allb)
NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
nm = lambda n: f'{NN[n % 12]}{n // 12 - 1}'
print('beat chord    B    T    M    S')
viol = 0
for i, (b, v) in enumerate(zip(allb, voicings)):
    pv = parallels(voicings[i - 1], v) if i else []
    viol += len(pv)
    print(f'{i + 1:3d}  {b["ch"]:5s}  ' + '  '.join(f'{nm(n):4s}' for n in v) + ('   PARALLELS %s' % pv if pv else ''))
print('parallel 5ths/8ves in the whole piece:', viol)
assert viol == 0

# ------------------------------------------------------------------ performance
BASE = 60.0 / 54.0
t = 7.4                                  # after the intro
sc = Score(seed=54)
pedal_marks = []
phrase_starts = []
beat_t = []
for pi, ph in enumerate(PHRASES):
    phrase_starts.append(t)
    n = len(ph)
    for k in range(n):
        beat_t.append(t)
        stretch = 1.0
        if pi in (0, 1, 2) and k >= n - 3:
            stretch = (1.04, 1.12, 1.30)[k - (n - 3)]
        if pi == 3 and k >= n - 2:
            stretch = (1.15, 1.45)[k - (n - 2)]
        if pi == 2 and 5 <= k <= 7:
            stretch = 1.06                           # a breath before the heart
        t += BASE * stretch
    t += (0.9 if pi < 3 else 0.5)                    # a breath between phrases
t_final = t
DB = {  # per phrase: (S, M, T, B) base level in calibrated dB
    0: (-42.5, -39.0, -45.5, -42.0), 1: (-39.5, -43.5, -45.5, -42.0), 2: (-38.5, -42.5, -44.5, -40.5), 3: (-40.0, -43.5, -45.5, -41.5),
}
idx = 0
for pi, ph in enumerate(PHRASES):
    n = len(ph)
    vs = voicings[idx: idx + n]
    ts = beat_t[idx: idx + n]
    end = ts[-1] + BASE * 1.4
    # legato pedalling: lift and re-press just AFTER each new chord has been struck
    marks = [k for k in range(n) if k == 0 or ph[k]['ch'] != ph[k - 1]['ch']]
    for mi, k in enumerate(marks):
        nxt = ts[marks[mi + 1]] + 0.03 if mi + 1 < len(marks) else (end + 0.6 if pi < 3 else None)
        sc.pedal_down(ts[k] + 0.07, nxt if nxt is not None else -1)
    if pi == 3:
        P4_LAST_PEDAL = sc.pedal[-1]
    # voices: strike a voice only when its pitch changes; hold it for as many beats as it stays
    for vi, (vname, dbi) in enumerate([('B', 3), ('T', 2), ('M', 1), ('S', 0)]):
        k = 0
        while k < n:
            pitch = vs[k][vi]
            j = k
            while j + 1 < n and vs[j + 1][vi] == pitch:
                j += 1
            on = ts[k] + {'B': -0.02, 'T': 0.01, 'M': 0.025, 'S': 0.04}[vname] + abs(rng.normal(0, 0.008))
            off = (ts[j + 1] if j + 1 < n else end) - 0.04
            db = DB[pi][dbi]
            if pi == 2:                                      # crescendo to the heart (S = A5, beats 7-8) and away
                db += {0: -1.0, 1: -.5, 2: 0, 3: .5, 4: 1.0, 5: 1.8, 6: 2.4, 7: 2.4, 8: 1.4, 9: .6, 10: 0, 11: -.5}[k] * (1.0 if vname in 'SM' else .5)
            if pi == 3:
                db += {0: 0, 1: 0, 2: -.5, 3: -.5, 4: -1.2, 5: -1.2, 6: -2.0, 7: -2.0}[k]
            touch = 38 if (pi == 2 and vname == 'S' and 5 <= k <= 8) else 14
            if vname == 'B' and pitch < 45:
                db += -1.0
            sc.note_db(pitch, on, off - on, db, touch=touch, jitter_db=0.25)
            k = j + 1
    idx += n
# intro: a lone D-major arpeggio, then silence before the tune
sc.pedal_down(0.2, phrase_starts[0] - 0.4)
for tt, m, db in [(0.6, 38, -45.0), (1.9, 50, -47.0), (3.4, 57, -49.0), (5.1, 66, -51.0)]:
    sc.note_db(m, tt, 4.0, db, jitter_db=0.2)
# final chord: fully resolved, a full D major, allowed to ring
tf = t_final + 0.35
P4_LAST_PEDAL['endTime'] = tf + 0.03
sc.pedal_down(tf + 0.08, tf + 18.0)
for m, db, off in [(38, -41.5, 0.0), (45, -45.0, 0.03), (50, -46.0, 0.06), (54, -47.0, 0.09), (66, -46.5, 0.12), (74, -44.0, 0.16)]:   # D2 A2 D3 F#3 F#4 D5: the 7th (G3) falls to F#3
    sc.note_db(m, tf + off, 10.0, db, jitter_db=0.2)
# Tail so the ring-out ends in silence
TOTAL = tf + 17.5
print(f'phrase starts {[round(x, 1) for x in phrase_starts]}  final chord at {tf:.1f}s  total {TOTAL:.1f}s')

# ------------------------------------------------------------------ render, room, master
y = lib.render_piano(sc, NAME)
x = y[int(lib.RENDER_OFFSET * SR):]
x = np.concatenate([x, np.zeros((max(0, int(TOTAL * SR) - len(x)), 2))])[:int(TOTAL * SR)]
piano = lib.eq(x, lp=6500, hp=34)
dry = piano + lib.soft_thuds(len(x), [n['time'] for n in sc.notes], level_db=-66, tone=300, dur=.04, seed=2)
ir = lib.make_ir(seconds=5.5, predelay=0.022, bands=((90, 3.2), (350, 4.0), (1400, 3.6), (4500, 2.4), (9000, 1.2)), dark=0.9, seed=61)
wet = lib.lin_conv(dry, ir)[:len(dry)]
wet *= np.sqrt((dry ** 2).mean() / (wet ** 2).mean())
mix = 0.86 * dry + 0.50 * wet
mix = lib.tape_wow(mix, wow=[(0.31, 3.0), (0.77, 1.4), (5.5, 0.6)], seed=4)
mix = mix + lib.hiss(len(mix), -80.0)
mix = lib.eq(mix, lp=10000, hp=36)
mix = lib.fade_out(mix, 3.0, curve=2.5)
final, info = lib.master(mix, target_lufs=-18.0)
print({k: (round(float(v), 2) if not isinstance(v, bool) else v) for k, v in info.items()})
lib.spectrogram_png(final, f'{lib.WORK}/{NAME}.png', NAME)
lib.write_ogg(final, OUT, quality=6)
print(lib.verify_ogg(OUT))
