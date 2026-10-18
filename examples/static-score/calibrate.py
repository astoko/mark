"""Measure how loud the Salamander renderer really plays every (pitch, velocity) pair at soft
dynamics, and write calib.json.  Score.note_db() then picks the velocity that produces a requested
level, so 'equal' notes really are equal (the sampler's soft layers cross-fade non-monotonically).
Level = RMS dBFS (renderer-normalised dry render) over 0.02-0.52 s after the onset.
Run once per sample set:  python calibrate.py"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import SR, Score

PITCHES = list(range(26, 97))
VELS = [14, 18, 22, 26, 30, 34, 38, 42, 46, 52]
table = {}
jobs = [(p, v) for p in PITCHES for v in VELS]
BATCH = 360
for b in range(0, len(jobs), BATCH):
    s = Score(seed=1)
    t, when = 0.5, {}
    for p, v in jobs[b:b + BATCH]:
        s.note(p, t, 0.9, v, detune=0, humanize=False)
        when[(p, v)] = t
        t += 2.0
    y = lib.render_piano(s, f'calib{b // BATCH}')
    m = y.mean(axis=1)
    off = int(lib.RENDER_OFFSET * SR)
    for (p, v), t0 in when.items():
        seg = m[off + int((t0 + .02) * SR): off + int((t0 + .52) * SR)]
        table.setdefault(str(p), {})[str(v)] = round(float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-12)), 2)
json.dump(table, open(os.path.join(os.path.dirname(__file__), 'calib.json'), 'w'), indent=0, sort_keys=True)
print('wrote calib.json for', len(table), 'pitches')
