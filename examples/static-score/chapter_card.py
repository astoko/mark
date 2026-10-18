"""STATIC  -  art/music/chapter_card.ogg   (chapter title cards; 13.5 s, NOT looped)

Three low piano notes (D2, A2, a shy F3), a breath of silence, then one high A that hangs in the
room and decays to nothing.  Same felt-piano chain as the menu, no drone, no tape wow beyond a
whisper, and a true fade to digital silence so it can be dropped between chapters.
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import lib
from lib import SR, Score

NAME = 'chapter_card'
TOTAL = 13.5
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(lib.ROOT, 'examples/static-score/out/chapter_card.ogg')

s = Score(seed=21)
s.pedal_down(0.0, 12.0)
s.note_db(38, 0.50, 11.0, -39.5)       # D2
s.note_db(45, 2.45, 9.0, -43.5)        # A2
s.note_db(53, 4.10, 7.0, -47.5)        # F3, shy
s.note_db(81, 6.55, 6.0, -48.0, touch=14)   # A5: the high note that hangs

y = lib.render_piano(s, NAME)
x = y[int(lib.RENDER_OFFSET * SR):]
x = np.concatenate([x, np.zeros((max(0, int(TOTAL * SR) - len(x)), 2))])[:int(TOTAL * SR)]
piano = lib.eq(x, lp=4800, hp=30)
dry = piano + lib.soft_thuds(len(x), [n['time'] for n in s.notes], level_db=-64, tone=260, dur=.04, seed=2)
ir = lib.make_ir(seconds=6.0, predelay=0.026, dark=0.9, seed=31, bands=((90, 3.6), (350, 5.2), (1400, 4.2), (4500, 2.2), (9000, 0.9)))
wet = lib.lin_conv(dry, ir)[:len(dry)]
wet *= np.sqrt((dry ** 2).mean() / (wet ** 2).mean())
mix = 0.80 * dry + 0.75 * wet
mix = lib.tape_wow(mix, wow=[(0.33, 3.0), (0.81, 1.2), (5.6, 0.6)], seed=3)
mix = mix + lib.hiss(len(mix), -78.0)
mix = lib.eq(mix, lp=9500, hp=38)
mix = lib.fade_out(mix, 2.2, curve=2.5)       # natural decay is already low; this just guarantees silence
final, info = lib.master(mix, target_lufs=-18.0)
print({k: (round(float(v), 2) if not isinstance(v, bool) else v) for k, v in info.items()})
lib.spectrogram_png(final, f'{lib.WORK}/{NAME}.png', NAME)
lib.write_ogg(final, OUT, quality=6)
print(lib.verify_ogg(OUT))
import soundfile as sf, subprocess
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', OUT, f'{lib.WORK}/_cc.wav'], check=True)
d, _ = sf.read(f'{lib.WORK}/_cc.wav')
print('last 100 ms peak (dBFS):', round(20 * np.log10(np.abs(d[-4410:]).max() + 1e-12), 1), '| first sample', round(float(abs(d[0]).max()), 6))
