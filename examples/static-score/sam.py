"""Sam's song (D major, one beat per note at ~140 bpm in the game; MIDI numbers, 69 = A4).
Held notes are (midi, beats).  The last note is held 2 beats and followed by 1 beat of rest."""
SAM = [(69, 1), (66, 1), (62, 1), (64, 1), (66, 1), (67, 1), (66, 1), (64, 1), (62, 1), (57, 3),
       (59, 1), (62, 1), (67, 1), (66, 1), (64, 1), (62, 1), (64, 1), (69, 1), (67, 1), (66, 2)]
FIRST_HALF = SAM[:10]       # 12 beats
SECOND_HALF = SAM[10:]      # 11 beats + 1 rest = 12
FIRST_FOUR = SAM[:4]        # A F# D E : the hidden fragment (in minor: A F D E)
assert sum(b for _, b in FIRST_HALF) == 12 and sum(b for _, b in SECOND_HALF) == 11
