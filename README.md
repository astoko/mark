# Mark — chat-driven piano composer

Type a request like *"melancholic ambient piece in A minor"* and Mark composes an original piece with real music theory, then plays it immediately on a synthesized piano with a lit-up keyboard and a scrolling piano roll.

No dependencies: Node ≥ 18 on the server, plain ES modules + Web Audio in the browser.

```bash
npm start          # http://localhost:3000   (PORT / HOST / DATA_DIR env vars)
npm test           # engine, parser, MIDI and HTTP tests
```

Docker: `docker build -t mark . && docker run -p 3000:3000 -v mark-data:/app/data mark`

## How it works

```
chat prompt ──► parser ──► resolveParams (infer missing values from style + mood)
                              │
     ┌────────────────────────┴───────────────────────────────┐
     │ structure  → sections, phrases, cadence plan, key areas,│
     │              restatements (period, recap, AABA head)   │
     │ harmony    → style strategy (see below) + modulation   │
     │ voicing    → bass/inversions/pedal points + upper       │
     │              voices by cost search (voice leading)     │
     │ accompaniment → texture per section (Alberti, arpeggio,│
     │              walking bass + comping, continuo, pads…)  │
     │ melody     → motif, sequences, weighted scale degrees, │
     │              cadence targets, counterpoint checks      │
     │ performance→ dynamics, rubato tempo map, swing, pedal  │
     └────────────────────────┬───────────────────────────────┘
                              ▼
      composition JSON (layers: melody / harmony / bass + metadata)
                              ▼
      browser: multisample piano synth → scheduler → keyboard + roll
```

### Request parsing (`src/engine/parser.js`)
Extracts duration (`90s`, `2 minutes`, `1:30`, "short"), style (genre words and era/composer names), key and mode (`F# minor`, `b flat dorian`, `in Eb`), tempo (`72 bpm`, Italian terms, "slow"), meter (`7/8`, "waltz"), mood and complexity. Anything missing is inferred from style/mood defaults — nothing fails for being unspecified. Defaults: 120 s; a bare tonic ("in F") means major unless the mood is dark.

Follow-ups operate on the previous piece: *make that jazzier, simplify it, more complex, darker/brighter (parallel key), faster/slower, longer/shorter, louder/softer, transpose up 2 semitones, variation (same harmony, new melody), remix (all new)*.

### Composition engine (`src/engine/`)
| Stage | What it does |
|---|---|
| `structure.js` | Form first: intro / theme / development / climax / outro scaled to the duration, phrase lengths, cadence plan (HC/PAC/DC/turnaround/final), key areas per style (e.g. dominant or relative in development, ♭VI for Romantic), and which phrases restate earlier ones. |
| `harmony.js` | **functional** Markov grammars over roman numerals with cadence look-ahead (Classical/Baroque/Romantic/Jazz), **modal** colour progressions with pedal points (Ambient), **cycles** mutated by process (Minimalist), **neo-Riemannian** P/L/R walks with a pull home (Contemporary). Baroque episodes use circle-of-fifths sequences; modulations pivot through the new key's dominant. |
| `voicing.js` | Chooses bass (inversions, Neapolitan 6th, Phrygian cadence, pedal points) and searches upper-voice voicings minimising motion with penalties for parallel 5ths/8ves, hidden octaves, doubled leading tones, unresolved sevenths and bad spacing. Close, open, spread, rootless jazz, and quartal shapes. |
| `melody.js` | One-bar motif restated, varied, sequenced, inverted, fragmented per phrase plan; weighted scale-degree choice (degree weights × interval size × chord-tone priority on strong beats × gap-fill after leaps × phrase contour: arch/ascending/descending/wave); appoggiaturas, chromatic approach tones, jazz guide tones and blue notes; cadence notes targeted (tonic at the end); parallel checks against the bass at every bass attack. Baroque adds an imitative counter-voice; Minimalist uses an additive/phase-shifting cell over a polymetric ostinato. |
| `accompaniment.js` | Alberti bass, broken chords, wide Romantic arpeggios (8ths/triplets), waltz, driving octaves, pads, shimmer, walking bass + rootless comping, walking continuo, 3+3+2 pulses, open-fifth washes. |
| `performance.js` | Section energy → velocity with crescendo into the climax, phrase hairpins, metric accents, humanisation; tempo map with phrase rubato, section and final ritardandi; swing; melody lag and chord rolls; legato pedalling per chord (long washes for Ambient, none for Baroque). |
| `composer.js` | Orchestrates, validates, reports analysis. On any failure: retry with new seeds, then safe defaults (C major, 96 bpm) through the same generative pipeline — never silence, never a canned tune. |

Style defaults (tempo range, meters, minor bias, harmonic rhythm, textures, dynamics, rubato, pedal, form names) live in `styles.js`.

### Output format
```jsonc
{
  "title": "Nocturne in D♭ major",
  "meta": { "style": "romantic", "key": "D♭ major", "tempo": 72, "timeSignature": [4,4], "duration": 121.4, "bars": 36, "seed": 123, … },
  "sections": [{ "name": "Theme", "type": "theme", "startTime": 9.8, "endTime": 43.1, "key": "D♭ major", "progression": ["I","vi","IV","V7",…] }],
  "phrases":  [{ "startBar": 4, "bars": 4, "cadence": "HC", "contour": "arch", "restates": null }],
  "chords":   [{ "time": 9.8, "dur": 3.2, "symbol": "D♭maj7", "roman": "I", "func": "T", "bar": 5 }],
  "layers": {
    "melody":  [{ "pitch": 77, "start": 16, "beats": 1, "time": 9.83, "dur": 0.81, "velocity": 74 }],
    "harmony": [ … ], "bass": [ … ]
  },
  "pedal": [{ "time": 9.85, "endTime": 13.0 }], "tempoMap": [{ "q": 0, "bpm": 72 }], "bars": [0, 3.3, …],
  "analysis": { "techniques": […], "outerVoiceParallels": 0, "noteCounts": {…} }
}
```
`start/beats` are score positions in quarter notes; `time/dur` are performance seconds (rubato, swing and micro-timing applied).

### Playback (`public/js/`)
* `synth.js` — at page load, renders 30 multisamples (A0–C8) with an `OfflineAudioContext` from an additive model: inharmonic partials, per-partial two-stage decay, detuned unison strings, hammer comb filtering, hammer noise and soundboard knock (~1.5–2 s). Playback pitch-shifts the nearest sample, shapes brightness by velocity, damps on key-up (no dampers above F6), honours the pedal, pans by register and adds a synthetic hall.
* `player.js` — lookahead scheduler in composition time, so tempo (50–150 %), volume and transpose (±12) apply live; pause/stop/seek.
* `keyboard.js`, `roll.js` — 88 keys lit per layer (melody amber, harmony teal, bass violet); piano roll with playhead, bar lines, section markers, live chord symbols, pedal lane; overview strip to jump between sections.
* `export.js` — MIDI (tempo map, 3 tracks, pedal CC64) and WAV (offline render through the same piano).

## API
| Method | Path | Notes |
|---|---|---|
| POST | `/api/compose` | `{prompt, sessionId, previousId?}` → `{id, reply, composition, summary}` |
| GET | `/api/history?sessionId=` | session history (newest first) |
| GET | `/api/pieces/:id` | full composition |
| GET | `/api/pieces/:id/midi?transpose=&tempo=` | Standard MIDI File |
| GET | `/healthz` | liveness |

History is kept in memory (300 pieces) and persisted best-effort to `DATA_DIR/history.json`.
