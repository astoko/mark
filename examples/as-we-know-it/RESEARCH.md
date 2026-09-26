# As We Know It — research and rules

*As We Know It* is a hand-composed piece for piano on the theme **the end of the world as we know it**: 60 bars in 4/4, running from C major to F♯ Lydian, about 3 minutes 45 seconds. As with *Estuary*, the script only performs the written score. Every pitch, rhythm, dynamic and tempo anchor was chosen by hand in `as_we_know_it.mjs`.

It builds on the 45 papers in [`../estuary/RESEARCH.md`](../estuary/RESEARCH.md), which still apply: voice-leading, form, cadences, tension and expressive performance. This file covers three additions:

1. what changed after the feedback that the **flow** needed work;
2. the rules I wrote for this theme;
3. the new sources (17), each checked to exist, with a link.

---

## 1. Flow: what was wrong, and the new rules

Measured on *Estuary*'s performance model, three things broke the flow:

- **Tempo stepped at every barline.** Each bar had one tempo, so the pulse jumped at barlines, by 50% at the end of the prelude. Kronman & Sundberg (1987) and Friberg & Sundberg (1999) show that musical tempo changes behave like physical motion, which never jumps.
- **Every phrase ended with a brake and a restart.** The tempo dropped at the phrase end, then snapped back and hesitated again on the next downbeat.
- **Dynamics were terraced**, with one fixed level per bar.

These new rules are built into the score and the performance model:

| Rule | How it is done | Source |
|---|---|---|
| **F1** One undercurrent never stops | An eighth-note layer runs from bar 1 to the collapse. It only changes speed (eighths → 16ths) or grouping (4+4 → 3+3+2). The piece's one real silence is the grand pause. Measured: no onset gap longer than one eighth before bar 40 (longest 0.53 s, the cadence in bar 9). | Rothstein 1989 (continuity through phrase overlap); Farbood 2012 (onset frequency carries tension; in Estuary dossier) |
| **F2** Phrases overlap, never stop and restart | Pickups (lead-ins) cross every phrase join. Suspensions are tied over barlines (bars 4→5, 14→15, 48→49). The undercurrent keeps moving under every cadence. | Rothstein 1989 (overlap, lead-in, elision) |
| **F3** Tempo is a continuous curve | About 30 anchor points are joined by cosine interpolation. The largest change between neighbouring 1/64-bar steps is **1.51%**, versus a 50% step in *Estuary*. The pulse steps only across silence (the crash and the grand pause). | Kronman & Sundberg 1987; Friberg & Sundberg 1999; Honing 2003 |
| **F4** Phrase shaping is continuous | Each phrase arches +2.5% toward its middle (Todd). A join gets a smooth dip centred on the boundary, deeper for stronger boundaries, and the next phrase eases back in. | Todd 1985, 1992; Windsor & Clarke 1997 |
| **F5** Dynamics are ramps, not terraces | Each bar's level is joined linearly to the next. Only marked *subito* changes step (the crash, and after the grand pause). | Todd 1992 (dynamics tied to tempo); Windsor & Clarke 1997 |
| **F6** Legato through key overlap | Melody notes overlap the next note. The overlap is relatively larger for short notes (key-overlap ratio falls as the inter-onset interval grows), and slightly longer for high notes moving by a consonant interval. | Bresin & Battel 2000; Repp 1997 |
| **F7** Legato pedalling | The damper lifts just after each new harmony is struck and returns about 80 ms later. Harmonies are joined, never separated by a dry gap. | Repp 1997 (tone decay and perceived legato) |
| **F8** Grouping accents carry the pulse | The first note of every 3+3+2 group is weighted (+7 velocity), on top of a light metrical accent. | Drake & Palmer 1993 (grouping accents are the most consistent in performance) |
| **F9** Stage changes happen mid-phrase | Each new bass note slides in under a moving texture: the bell over the barline (bar 10→11), the bass under the cadence (bar 18, beat 3), the tremolo on beat 4 (bar 33). Stages don't begin from rest. | Rothstein 1989 |

## 2. The idea: seven stages

**The known world** is a hymn in C major. Its bass descends stepwise (C B A G F E D), with the melody above in parallel tenths. The world is already sinking, gently, from the first bar.

**The ground gives way one semitone per stage: C → B → B♭ → A → A♭ → G → F♯.** This is the descending lament bass (Rosand 1979), stretched from a fourth to a **tritone**: the distance from the old world to the new.

| Stage | Bars | What happens |
|---|---|---|
| I · The known world | 1–10 | Hymn as a period: half cadence in bar 5, perfect cadence in bar 9. The alto holds an E pedal under shifting chords ("the world has a centre"). In bar 10 a distant bell, **F♯6**, sounds over C major: C Lydian, the first omen. |
| II · Omen | 11–18 | The hymn restarts over a **B** pedal: same melody, wrong ground (C/B, F/B, Bø7). The bell and the melody's F5 clash (F against F♯, bar 14). The half cadence turns into **B minor**, and the alto's F becomes F♯. |
| III · Unease | 19–26 | **B♭** ground. The hymn is in C minor, and the dominant has lost its leading tone (G minor instead of G major). The clock limps: the eighths regroup into 3+3+2. The motif climbs in sequence as the harmony builds to B♭7, re-spelt as a German sixth so that it resolves down a semitone. |
| IV · Unravelling | 27–33 | **A** ground, octatonic collection (Taruskin 1985). The hymn motif G–C–E–D is distorted to G–C–E–D♯. It repeats in minor-third transpositions (G, A♯, C♯, E, G), a symmetric loop with no exit, over diminished-seventh waves in sixteenths. It breaks into falling semitone sighs (E–D♯, A–G♯). |
| V · Collapse | 34–40 | **A♭** ground. The hymn plays in the top notes of C-major chords, each split by an F♯-major chord: old world and new world at once. Two chromatic cascades in contrary motion converge on a tritone (B3 against F4). The hands then leap to the ends of the keyboard: **A0–B0 cluster + A♭1** against **F♯7 G7 C8**, *fff*. |
| Grand pause | 41 | The crash rings, the dampers fall; only the undamped top strings keep sounding, then silence. |
| VI · Aftermath | 42–48 | **G** ground and a slowing heartbeat (G1–D2). Fragments of the minor hymn arrive late, and the silences between them grow (2 → 4 → 6 eighths). One last **G7**: the old dominant, with its leading tone B back for a moment. |
| VII · The new world | 49–60 | The expected C never comes: **G7 → F♯**. The melody's D is held over the barline, then falls to C♯. B→A♯ and F→F♯ each move a semitone, so an augmented triad melts into F♯ major. The hymn returns a tritone higher in **F♯ Lydian**, over a gentle 3+3+2 sway. There is no subdominant: the old tonic C lives on as **B♯**, the Lydian ♯4. The omen bell F♯6 returns as the tonic (bar 58). In the last chord B♯ is still inside, while the top voice steps B♯ → C♯. |

## 3. Rules for this theme, and where they are in the score

| Decision | Bars | Source(s) |
|---|---|---|
| Chromatic lament bass, one semitone per stage, stretched to a tritone | whole piece | Rosand 1979 |
| The hymn's own bass already descends stepwise (A G F E = the minor tetrachord) | 3–4, 13–14 | Rosand 1979 |
| Tonal centre dissolves in stages: diatonic → modal mixture (minor v, no leading tone) → octatonic → bitonal → Lydian. The key profile gets progressively harder to identify, then settles on a new centre. | 19–40, 49 | Temperley & Marvin 2008; Krumhansl & Kessler 1982 (in Estuary dossier) |
| Octatonic symmetry used as a trap: the motif is transposed by minor thirds and returns to its start an octave higher | 27–31 | Taruskin 1985 |
| C major and F♯ major together (the "Petrushka" pair from one octatonic set) as old world against new | 34–37 | Taruskin 1985 |
| Roughness as alarm: a cluster at the bottom of the keyboard at the peak, and semitone clashes (F/F♯, A/A♯) in the collapse | 34–40 | Arnal et al. 2015; Huron 2015; Plomp & Levelt 1965 (in Estuary dossier) |
| Registral extremes (A0 and C8 together, nothing between) for the peak; the hands open outward from a converging tritone | 39–40 | Huron 2015 (size and loudness cues) |
| Silence after an unresolved event is heard as tense and expectant; silence after closure is heard as rest. The grand pause follows the most unresolved moment; the aftermath's rests grow and never follow a cadence. | 41, 44–47 | Margulis 2007 |
| The one real stop sits at the golden section of the duration: the peak at bar 40 falls at **61.1%** of the piece | 40–41 | Estuary dossier (golden section) |
| A semitone "missed cadence": G7 → F♯, with every voice moving by semitone (Cohn-style parsimonious voice leading, a tritone substitution) | 48–49 | Cohn 1996, 1998 (in Estuary dossier) |
| Held-over dissonance before the new world (D over F♯, then C♯): a suspension and an appoggiatura-like release | 49 | Sloboda 1991 (in Estuary dossier) |
| The same melody in both worlds, so the ending is recognition, not novelty. Sadness plus beauty is heard as *being moved*, not despair. | 50–57 | Vuoskoski & Eerola 2017; Eerola, Vuoskoski & Kautiainen 2016 |
| An ending built for awe: vast register, very soft, long decay; the bell that meant danger now means home | 58–60 | Konečni 2005 |
| Sound design follows how humans respond to sound: rough and low means danger; high, pure and soft means safety | 10, 14, 40, 58–60 | Huron 2015 |

## 4. New sources

**Theme**

1. Rosand, E. (1979). The descending tetrachord: an emblem of lament. *The Musical Quarterly* 65(3), 346–359. [OUP](https://academic.oup.com/mq/article-abstract/LXV/3/346/1062364)
2. Arnal, L. H., Flinker, A., Kleinschmidt, A., Giraud, A.-L., & Poeppel, D. (2015). Human screams occupy a privileged niche in the communication soundscape. *Current Biology* 25(15), 2051–2056. [PubMed](https://pubmed.ncbi.nlm.nih.gov/26190070/)
3. Margulis, E. H. (2007). Silences in music are musical not silent: an exploratory study of context effects on the experience of musical pauses. *Music Perception* 24(5), 485–506. [UC Press](https://online.ucpress.edu/mp/article-abstract/24/5/485/95245/)
4. Vuoskoski, J. K., & Eerola, T. (2017). The pleasure evoked by sad music is mediated by feelings of being moved. *Frontiers in Psychology* 8, 439. [PubMed](https://pubmed.ncbi.nlm.nih.gov/28377740/)
5. Eerola, T., Vuoskoski, J. K., & Kautiainen, H. (2016). Being moved by unfamiliar sad music is associated with high empathy. *Frontiers in Psychology* 7, 1176. [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5025521/)
6. Huron, D. (2011). Why is sad music pleasurable? A possible role for prolactin. *Musicae Scientiae* 15(2), 146–158. [SAGE](https://journals.sagepub.com/doi/10.1177/1029864911401171). **Caveat:** Huron retracted the hypothesis himself in 2023 (next entry). It is cited only to show why the piece relies on *being moved* (4, 5) and not on a hormonal account.
7. Huron, D. (2023). The prolactin theory of sad-music enjoyment is wrong. *Empirical Musicology Review* 17(1), 69–70. [EMR](https://emusicology.org/article/id/4765/)
8. Taruskin, R. (1985). Chernomor to Kashchei: harmonic sorcery; or, Stravinsky's "angle." *Journal of the American Musicological Society* 38(1), 72–142. [UC Press](https://online.ucpress.edu/jams/article/38/1/72/49001/)
9. Huron, D. (2015). Affect induction through musical sounds: an ethological perspective. *Philosophical Transactions of the Royal Society B* 370, 20140098. [Royal Society](https://royalsocietypublishing.org/doi/10.1098/rstb.2014.0098)
10. Konečni, V. J. (2005). The aesthetic trinity: awe, being moved, thrills. *Bulletin of Psychology and the Arts* 5, 27–44. [ResearchGate](https://www.researchgate.net/publication/288252400_The_aesthetic_trinity_Awe_being_moved_thrills)
11. Temperley, D., & Marvin, E. W. (2008). Pitch-class distribution and the identification of key. *Music Perception* 25(3), 193–212. [DOI](https://doi.org/10.1525/mp.2008.25.3.193)

**Flow**

12. Todd, N. P. McA. (1985). A model of expressive timing in tonal music. *Music Perception* 3(1), 33–57. [UC Press](https://online.ucpress.edu/mp/article-abstract/3/1/33/62674/A-Model-of-Expressive-Timing-in-Tonal-Music)
13. Windsor, W. L., & Clarke, E. F. (1997). Expressive timing and dynamics in real and artificial musical performances: using an algorithm as an analytical tool. *Music Perception* 15(2), 127–152. [ResearchGate](https://www.researchgate.net/publication/271787138_Expressive_Timing_and_Dynamics_in_Real_and_Artificial_Musical_Performances_Using_an_Algorithm_as_an_Analytical_Tool)
14. Repp, B. H. (1997). Acoustics, perception, and production of legato articulation on a computer-controlled grand piano. *Journal of the Acoustical Society of America* 102(3), 1878–1890. [DOI](https://doi.org/10.1121/1.420110)
15. Bresin, R., & Battel, G. U. (2000). Articulation strategies in expressive piano performance. *Journal of New Music Research* 29(3), 211–224. [T&F](https://www.tandfonline.com/doi/abs/10.1076/jnmr.29.3.211.3092)
16. Kronman, U., & Sundberg, J. (1987). Is the musical ritard an allusion to physical motion? In A. Gabrielsson (Ed.), *Action and Perception in Rhythm and Music* (pp. 57–68). Royal Swedish Academy of Music. [KTH QPSR version](https://www.speech.kth.se/qpsr/1984/1984_25_2-3_126-141.pdf)
17. Drake, C., & Palmer, C. (1993). Accent structures in music performance. *Music Perception* 10(3), 343–378. [Yale bibliography](https://rhythmcoglab.coursepress.yale.edu/wiki/bibliography/experimental-studies/drake-c-palmer-c-1993-accent-structures-in-music-performance-music-perception-103-343-378/)

Also used, as a book rather than a paper: Rothstein, W. (1989). *Phrase Rhythm in Tonal Music*. Schirmer. The discussion of Kronman & Sundberg draws on Honing, H. (2003), "Some comments on the relation between music and motion," *Music Theory Online* 9(1). [MTO](https://mtosmt.org/retrofit/mto.03.9.1/mto.03.9.1.honing.php)

## 5. Where the piece breaks rules on purpose

- **Parallel octaves in stages IV–V.** The hymn motif is doubled in octaves, and the C-major and F♯-major chords move in parallel. This is orchestral doubling, not voice-leading, and the parallel-motion check skips bars 27–41.
- **Pitch proximity is violated in stage IV.** The motif leaps by fourths and thirds across octaves as its line comes apart. This is the one place where "the melody should be easy to follow" is deliberately broken.
- **The peak has no middle register.** Only the ends of the keyboard sound. It is quieter in RMS than the dense bars before it (−12 dB against −14 dB), but it is the loudest peak (−0.5 dBFS) and the widest span possible.
- **No subdominant in the new world.** The IV chord of F♯ would contain B♮; the piece uses II (G♯ with B♯) instead, so the ending has no pull toward "home" in the old sense.

## 6. Measured results

- The collapse peak (bar 40) falls at **61.1%** of the notated duration; the target is the golden section, 61.8%.
- The largest local tempo change is **1.51%** between adjacent 1/64-bar steps, excluding the crash and grand pause.
- The composite onset stream through stages I–V has **no irregular inter-onset jumps** (no ratio outside 0.85–1.18).
- **No** parallel fifths or octaves between melody and bass in the part-writing stages.
- **No** key is struck by two voices at once, and every chord fits within a hand's reach.
- Rendered with Salamander Grand samples: peak −0.5 dBFS, no clipped samples.

## Files

| File | What it is |
|---|---|
| `as_we_know_it.mjs` | The score (hand-written) and performance model; prints all the checks above |
| `engrave.mjs` | MusicXML engraver (4/4, key change, 3+3+2 beaming, 8va/15ma/8vb) |
| `as_we_know_it.musicxml` | Score for MuseScore, Sibelius, Finale or Dorico |
| `as_we_know_it_score.pdf` | Engraved score (4 pages, Verovio) |
| `as_we_know_it.mid` | Performance MIDI (real-time timing, velocities, pedal) |
| `as_we_know_it.mp3` | Rendering on the Salamander Grand (not committed; regenerate with the steps below) |

To regenerate:

```
node examples/as-we-know-it/as_we_know_it.mjs
node examples/as-we-know-it/engrave.mjs
```
