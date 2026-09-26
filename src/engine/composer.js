// Composition pipeline:
//   resolve parameters → plan form → harmonic plan → voice leading → accompaniment
//   → melody (+ counter-voice) → performance (dynamics, tempo, pedal) → validated output.
// Failure never yields silence or canned material: it retries with a new seed, then with
// safe defaults (C major, moderate tempo) through the same generative pipeline.

import { createRng, randomSeed } from './rng.js';
import { getStyle, STYLE_IDS } from './styles.js';
import { planStructure } from './structure.js';
import { generateHarmony } from './harmony.js';
import { voiceTimeline } from './voicing.js';
import { chooseTexture, renderAccompaniment, PATTERN_LABELS } from './accompaniment.js';
import { generateMelody, generateMinimalist } from './melody.js';
import { buildTempoMap, applyPerformance } from './performance.js';
import { keyLabel, MODE_FAMILY, usesFlats, pcName, midiName } from './theory.js';

const MOOD_TABLE = {
  melancholic: { minor: 0.9, tempo: 0.82, energy: -0.08, dyn: -6, styles: { romantic: 3, ambient: 2, classical: 1, contemporary: 2 } },
  nostalgic: { minor: 0.5, tempo: 0.88, energy: -0.05, dyn: -4, styles: { romantic: 2, jazz: 1.5, ambient: 1.5, contemporary: 1 } },
  peaceful: { minor: 0.25, tempo: 0.82, energy: -0.15, dyn: -10, styles: { ambient: 3, romantic: 1.5, minimalist: 1, contemporary: 1 } },
  dreamy: { minor: 0.3, tempo: 0.88, energy: -0.08, dyn: -6, styles: { ambient: 3, contemporary: 2, romantic: 1 }, prefer: 'lydian' },
  happy: { minor: 0.05, tempo: 1.12, energy: 0.05, dyn: 2, styles: { classical: 3, jazz: 1.5, baroque: 1.5, minimalist: 1 } },
  dramatic: { minor: 0.65, tempo: 1.1, energy: 0.12, dyn: 8, styles: { romantic: 3, contemporary: 2, baroque: 1.5, classical: 1 } },
  dark: { minor: 0.95, tempo: 0.92, energy: 0.02, dyn: 0, styles: { contemporary: 3, romantic: 2, ambient: 1 }, prefer: 'phrygian' },
  mysterious: { minor: 0.75, tempo: 0.9, energy: -0.02, dyn: -4, styles: { contemporary: 3, ambient: 2, jazz: 1 }, prefer: 'dorian' },
  romanticMood: { minor: 0.35, tempo: 0.92, energy: 0, dyn: -2, styles: { romantic: 3, jazz: 1.5, contemporary: 1 } },
  energetic: { minor: 0.25, tempo: 1.22, energy: 0.1, dyn: 6, styles: { minimalist: 2, baroque: 2, classical: 2, jazz: 2 } },
};

const MAJOR_TONICS = { 0: 3, 7: 2.5, 2: 2, 5: 2.5, 10: 2, 3: 2, 9: 1.5, 4: 1.2, 8: 1.5, 1: 1.2 };
const MINOR_TONICS = { 9: 3, 4: 2.5, 2: 2.5, 7: 2, 0: 2, 6: 1.5, 11: 1.5, 5: 1.2, 1: 1 };
const JAZZ_TONICS = { 5: 3, 10: 3, 3: 2.5, 8: 2, 1: 1.5, 0: 2, 7: 1 };

const FUNCTIONAL = new Set(['classical', 'baroque', 'romantic', 'jazz']);

export function resolveParams(parsed = {}, overrides = {}) {
  const seed = parsed.seed ?? overrides.seed ?? randomSeed();
  const rng = createRng(seed).fork('params');
  const mood = parsed.mood && MOOD_TABLE[parsed.mood] ? parsed.mood : null;
  const md = mood ? MOOD_TABLE[mood] : null;
  const inferred = [];

  let styleId = parsed.style && STYLE_IDS.includes(parsed.style) ? parsed.style : null;
  if (!styleId) {
    styleId = md ? rng.weighted(md.styles) : rng.weighted({ classical: 2, romantic: 2, ambient: 1.5, jazz: 1.5, contemporary: 1.5, baroque: 1, minimalist: 1 });
    inferred.push('style');
  }
  const style = getStyle(styleId);

  // Key & mode.
  let tonic = parsed.key?.tonic ?? null;
  let mode = parsed.key?.mode ?? null;
  if (!mode) {
    // A bare tonic ("in F") conventionally means major unless the mood says otherwise.
    const pMinor = md ? md.minor : tonic !== null && tonic !== undefined ? 0.1 : style.minorBias;
    const family = rng.chance(pMinor) ? 'minor' : 'major';
    const opts = style.modes[family];
    mode = md?.prefer && opts.includes(md.prefer) ? md.prefer : rng.weighted(opts, opts.map((_, i) => (i === 0 ? 3 : 1)));
    inferred.push('mode');
  }
  // Functional styles speak major/minor; modal styles keep any of the six modes.
  if (FUNCTIONAL.has(styleId)) mode = MODE_FAMILY[mode] || 'major';
  if (!MODE_FAMILY[mode]) mode = 'major';
  if (tonic === null || tonic === undefined) {
    const fam = MODE_FAMILY[mode] || 'major';
    tonic = Number(rng.weighted(styleId === 'jazz' && fam === 'major' ? JAZZ_TONICS : fam === 'major' ? MAJOR_TONICS : MINOR_TONICS));
    inferred.push('key');
  }

  // Meter.
  let meter = parsed.meter || null;
  if (!meter) {
    meter = rng.weighted(style.meters.map((m) => m[0]), style.meters.map((m) => m[1]));
    inferred.push('meter');
  }

  // Tempo.
  let tempo;
  if (parsed.tempo?.bpm) tempo = parsed.tempo.bpm;
  else {
    const factor = (parsed.tempo?.factor ?? 1) * (md?.tempo ?? 1);
    tempo = style.tempo.default * factor * rng.float(0.94, 1.06);
    tempo = Math.max(style.tempo.min * (parsed.tempo?.factor < 1 ? 0.8 : 1), Math.min(style.tempo.max * (parsed.tempo?.factor > 1 ? 1.2 : 1), tempo));
    // Compound meters count dotted-quarter pulses.
    if (meter[1] === 8 && meter[0] % 3 === 0) tempo = Math.max(40, tempo * 0.66);
    inferred.push('tempo');
  }
  tempo = Math.round(Math.max(30, Math.min(220, tempo)));

  let complexity = parsed.complexity;
  if (complexity === null || complexity === undefined) {
    complexity = style.complexity + (mood === 'peaceful' ? -0.12 : mood === 'dramatic' || mood === 'energetic' ? 0.1 : 0) + rng.float(-0.06, 0.06);
    inferred.push('complexity');
  }
  complexity = Math.max(0.05, Math.min(0.98, complexity));

  const duration = Math.max(20, Math.min(600, parsed.duration || 120));
  if (!parsed.duration) inferred.push('duration');

  return {
    style: styleId, mood: mood || 'neutral', key: { tonic, mode }, tempo, meter, complexity, duration,
    energyBias: md?.energy ?? 0, dynamicsShift: (md?.dyn ?? 0) + (parsed.dynamicsShift || 0),
    seed: seed >>> 0, melodySeed: (parsed.melodySeed ?? overrides.melodySeed ?? randomSeed()) >>> 0,
    inferred, ...overrides.force,
  };
}

function makeTitle(params, style, rng) {
  const key = keyLabel(params.key);
  const moodWords = {
    melancholic: ['Grey Light', 'Rain Letters', 'Fading Porch', 'Quiet Leaving', 'Winter Window'],
    nostalgic: ['Old Photographs', 'Summer Dust', 'Home Streets', 'Paper Boats'],
    peaceful: ['Still Morning', 'Soft Harbour', 'Open Fields', 'Slow River'],
    dreamy: ['Half Asleep', 'Cloud Atlas of Small Things', 'Moth Light', 'Lanterns'],
    happy: ['Bright Errands', 'Sun on Stone', 'Kite Weather', 'Market Morning'],
    dramatic: ['The Gathering Storm', 'Iron Sky', 'Crossing', 'Night Ascent'],
    dark: ['Undertow', 'Black Orchard', 'Cellar Stairs', 'Lamps Out'],
    mysterious: ['The Locked Room', 'Fog Signals', 'Hidden Garden', 'Cipher'],
    romanticMood: ['Two Chairs', 'Letters Home', 'Evening Promise', 'Close Distance'],
    energetic: ['Running Lights', 'Clockwork', 'Momentum', 'Sprint'],
    neutral: ['Study', 'Sketch', 'Reverie', 'Episode'],
  };
  const form = rng.pick(style.titles);
  if (['classical', 'baroque', 'romantic'].includes(style.id)) return `${form} in ${key}`;
  const words = moodWords[params.mood] || moodWords.neutral;
  return `${rng.pick(words)} (${form}, ${key})`;
}

function buildPieces(params) {
  const style = getStyle(params.style);
  const rng = createRng(params.seed);
  const rPlan = rng.fork('plan');
  const rHarm = rng.fork('harmony');
  const rVoice = rng.fork('voicing');
  const rAcc = rng.fork('accompaniment');
  const rMel = createRng(params.melodySeed);
  const rPerf = rng.fork('performance');

  const plan = planStructure(params, style, rPlan);
  const { timeline, techniques } = generateHarmony(plan, style, params, rHarm);
  const voicings = voiceTimeline(timeline, style, params, rVoice);

  let melody; let harmony = []; let bass = [];
  const textures = {};
  const extraTechniques = [];

  if (style.id === 'minimalist') {
    const m = generateMinimalist({ plan, timeline, voicings, rng: rMel, params });
    melody = m.melody; harmony = m.harmony; bass = m.bass;
    plan.sections.forEach((s) => { textures[s.index] = s.type === 'climax' ? 'ostinato + pulsing octaves' : 'phase-shifting ostinato'; });
    extraTechniques.push(`${m.cell.length}-note cell against a ${m.ostinato.length}-note ostinato (polymeter)`);
  } else {
    // Accompaniment first (melody must know the bass for counterpoint checks).
    const state = {};
    const phraseTexture = {};
    timeline.forEach((entry, i) => {
      const phrase = plan.phrases[entry.phrase];
      const section = plan.sections[entry.section];
      if (!phraseTexture[entry.phrase]) {
        const prevT = textures[section.index];
        phraseTexture[entry.phrase] = prevT && !rAcc.chance(0.25) ? prevT : chooseTexture(style, section.type, params, plan.meter, rAcc);
        textures[section.index] ||= phraseTexture[entry.phrase];
      }
      let texture = phraseTexture[entry.phrase];
      if (entry.final && !['continuo', 'comp'].includes(texture)) texture = style.id === 'ambient' ? 'pad' : 'block';
      const notes = renderAccompaniment({
        texture, entry, v: voicings[i], next: timeline[i + 1] ? { entry: timeline[i + 1], v: voicings[i + 1] } : null,
        meter: plan.meter, energy: section.energy, params, rng: rAcc, qTempo: plan.qTempo, style, state, phrase,
      });
      for (const n of notes) (n.layer === 'bass' ? bass : harmony).push(n);
    });
    bass.sort((a, b) => a.startQ - b.startQ);
    const res = generateMelody({ plan, timeline, style, params, rng: rMel, bassNotes: bass, range: style.melody.range });
    melody = res.notes;
    if (style.counterpoint) {
      const lead = melody.filter((n) => !n.octave).sort((a, b) => a.startQ - b.startQ);
      const counter = generateMelody({
        plan, timeline, style, params, rng: rMel.fork('counter'), bassNotes: bass, range: [55, 74],
        mode: 'counter', against: lead, sharedMotifs: { main: res.motifs.main },
      });
      harmony = counter.notes.map((n) => ({ ...n, layer: 'harmony', acc: (n.acc || 1) * 0.92 }));
      extraTechniques.push('imitative counter-voice');
    }
  }

  const tempoMap = buildTempoMap(plan, style, params, rPerf);
  const perf = applyPerformance({ plan, layers: { melody, harmony, bass }, style, params, rng: rPerf, tempoMap, timeline });

  return { style, plan, timeline, voicings, perf, tempoMap, textures, techniques: [...techniques, ...extraTechniques] };
}

function validate(comp) {
  const all = [...comp.layers.melody, ...comp.layers.harmony, ...comp.layers.bass];
  if (comp.layers.melody.length < 4) throw new Error('melody too short');
  if (all.length < 16) throw new Error('too few notes');
  for (const n of all) {
    if (!Number.isFinite(n.time) || !Number.isFinite(n.dur) || !Number.isFinite(n.pitch)) throw new Error('non-finite note');
    if (n.pitch < 21 || n.pitch > 108) throw new Error(`pitch out of piano range: ${n.pitch}`);
  }
}

// Count parallel perfect intervals between the outer voices at chord changes (quality metric).
function outerVoiceParallels(melody, bass) {
  const mel = melody.filter((n) => !n.doubling && !n.echo);
  const at = (arr, q) => { let r; for (const n of arr) { if (n.start <= q + 1e-6) r = n; else break; } return r; };
  const onsets = [...new Set(bass.map((n) => n.start))].sort((a, b) => a - b);
  let count = 0; let prevM; let prevB;
  for (const q of onsets) {
    const m = at(mel, q); const b = at(bass, q);
    if (!m || !b) continue;
    if (prevM !== undefined && (m.pitch - prevM) % 12 !== 0 && (b.pitch - prevB) % 12 !== 0 && Math.sign(m.pitch - prevM) === Math.sign(b.pitch - prevB)) {
      const i1 = Math.abs(prevM - prevB) % 12; const i2 = Math.abs(m.pitch - b.pitch) % 12;
      if ((i1 === 0 || i1 === 7) && i1 === i2) count++;
    }
    prevM = m.pitch; prevB = b.pitch;
  }
  return count;
}

export function compose(params) {
  const t0 = Date.now();
  const { style, plan, timeline, perf, tempoMap, textures, techniques } = buildPieces(params);
  const rng = createRng(params.seed).fork('title');
  const flats = usesFlats(params.key.tonic, params.key.mode);
  const barQ = plan.meter.barQ;
  const toSec = tempoMap.toSec;
  const layers = perf.layers;
  const endTime = Math.max(...Object.values(layers).flat().map((n) => n.time + n.dur));

  const sections = plan.sections.map((s) => {
    const startQ = s.startBar * barQ;
    const endQ = (s.startBar + s.bars) * barQ;
    const chords = timeline.filter((e) => e.section === s.index);
    return {
      name: s.name, type: s.type, startBar: s.startBar, bars: s.bars,
      startTime: +toSec(startQ).toFixed(3), endTime: +toSec(endQ).toFixed(3),
      key: keyLabel(s.key), energy: +s.energy.toFixed(2),
      texture: PATTERN_LABELS[textures[s.index]] || textures[s.index] || '',
      progression: chords.slice(0, 12).map((e) => e.chord.roman || e.chord.symbol),
    };
  });

  const chords = timeline.map((e) => ({
    start: e.startQ, beats: e.durQ, time: +toSec(e.startQ).toFixed(4), dur: +(toSec(e.startQ + e.durQ) - toSec(e.startQ)).toFixed(4),
    symbol: e.chord.symbol, roman: e.chord.roman || '', func: e.chord.func || '', cadential: !!e.cadential,
    key: keyLabel(e.key), bar: Math.floor(e.startQ / barQ) + 1,
  }));

  const phrases = plan.phrases.map((p) => ({
    startBar: p.startBar, bars: p.bars, cadence: p.cadence, contour: p.contour, section: p.section,
    restates: p.reuseFrom, time: +toSec(p.startBar * barQ).toFixed(3),
  }));

  const bars = [];
  for (let b = 0; b <= plan.totalBars; b++) bars.push(+toSec(b * barQ).toFixed(4));

  const comp = {
    title: makeTitle(params, style, rng),
    meta: {
      style: style.id, styleLabel: style.label, mood: params.mood, key: keyLabel(params.key),
      tonic: params.key.tonic, mode: params.key.mode, tonicName: pcName(params.key.tonic, flats),
      tempo: params.tempo, quarterTempo: +plan.qTempo.toFixed(2), timeSignature: params.meter,
      complexity: +params.complexity.toFixed(2), requestedDuration: params.duration,
      duration: +endTime.toFixed(2), bars: plan.totalBars, seed: params.seed, melodySeed: params.melodySeed,
      flats, inferred: params.inferred || [],
    },
    sections, phrases, chords, bars,
    layers,
    pedal: perf.pedal,
    tempoMap: tempoMap.events,
    analysis: {
      techniques: [...new Set([...style.techniques, ...techniques])],
      modulations: [...new Set(plan.phrases.map((p) => keyLabel(p.key)))],
      outerVoiceParallels: outerVoiceParallels(layers.melody, layers.bass),
      ranges: Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.length ? `${midiName(Math.min(...v.map((n) => n.pitch)), flats)}–${midiName(Math.max(...v.map((n) => n.pitch)), flats)}` : '—'])),
      noteCounts: Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.length])),
      generationMs: 0,
    },
  };
  validate(comp);
  comp.analysis.generationMs = Date.now() - t0;
  return comp;
}

export function composeWithFallback(parsed, overrides = {}) {
  const attempts = [];
  let params = resolveParams(parsed, overrides);
  for (let i = 0; i < 3; i++) {
    try {
      const c = compose(params);
      c.params = params;
      if (attempts.length) c.meta.recovered = attempts;
      return c;
    } catch (err) {
      attempts.push(String(err.message || err));
      params = { ...params, seed: randomSeed(), melodySeed: randomSeed() };
    }
  }
  // Safe defaults — still fully generated, never a canned tune.
  const safe = resolveParams({ style: 'classical', key: { tonic: 0, mode: 'major' }, tempo: { bpm: 96 }, meter: [4, 4], complexity: 0.4, duration: parsed.duration || 120 });
  const c = compose(safe);
  c.params = safe;
  c.meta.fallback = true;
  c.meta.recovered = attempts;
  return c;
}
