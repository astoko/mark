// Natural-language request parsing. Extracts duration, style, key/mode, tempo, meter,
// mood and complexity; everything unspecified is inferred later from style/mood
// defaults. Also recognises remix/variation requests relative to a previous piece.

import { parseNoteLetter, mod12 } from './theory.js';

const STYLE_WORDS = {
  classical: ['classical', 'sonata', 'sonatina', 'mozart', 'haydn', 'clementi', 'beethoven', 'galant', 'minuet', 'rondo'],
  baroque: ['baroque', 'bach', 'handel', 'scarlatti', 'vivaldi', 'fugue', 'fugal', 'invention', 'counterpoint', 'contrapuntal', 'harpsichord', 'toccata', 'gigue', 'partita'],
  romantic: ['romantic', 'chopin', 'schumann', 'brahms', 'rachmaninoff', 'rachmaninov', 'tchaikovsky', 'nocturne', 'ballade', 'sweeping', 'lush', 'impromptu', 'mendelssohn'],
  virtuoso: ['virtuoso', 'liszt', 'lisztian', 'liszt-like', 'rhapsody', 'rhapsodic', 'bravura', 'grandioso', 'virtuosic', 'transcendental'],
  jazz: ['jazz', 'jazzy', 'jazzier', 'swing', 'swingy', 'bebop', 'bop', 'lounge', 'blues', 'bluesy', 'noir', 'smoky', 'smokey', 'speakeasy', 'cocktail', 'standards', 'ragtime', 'stride'],
  ambient: ['ambient', 'atmospheric', 'drone', 'ethereal', 'meditative', 'meditation', 'spacey', 'spacious', 'floating', 'drifting', 'lofi', 'lo-fi', 'sleep', 'relaxing', 'chill'],
  minimalist: ['minimalist', 'minimal', 'minimalism', 'glass', 'reich', 'repetitive', 'process', 'hypnotic', 'ostinato', 'looping', 'pulsing', 'motoric'],
  contemporary: ['contemporary', 'modern', 'cinematic', 'film', 'soundtrack', 'neoclassical', 'neo-classical', 'impressionist', 'impressionistic', 'debussy', 'ravel', 'satie', 'modal', 'experimental', 'score'],
};

const MOODS = {
  melancholic: { words: ['melancholic', 'melancholy', 'sad', 'sorrowful', 'mournful', 'somber', 'sombre', 'wistful', 'lonely', 'grief', 'grieving', 'tragic', 'bittersweet', 'longing', 'blue', 'rainy', 'sadder'], minor: 0.9, tempo: 0.82, energy: -0.08, dyn: -6 },
  nostalgic: { words: ['nostalgic', 'reminiscent', 'memory', 'memories', 'tender', 'reflective', 'pensive'], minor: 0.5, tempo: 0.88, energy: -0.05, dyn: -4 },
  peaceful: { words: ['peaceful', 'calm', 'serene', 'gentle', 'tranquil', 'soft', 'quiet', 'soothing', 'relaxed', 'lullaby', 'still'], minor: 0.25, tempo: 0.82, energy: -0.15, dyn: -10 },
  dreamy: { words: ['dreamy', 'dreamlike', 'hazy', 'floating', 'ethereal', 'magical', 'starry', 'celestial'], minor: 0.3, tempo: 0.88, energy: -0.08, dyn: -6, lydian: true },
  happy: { words: ['happy', 'joyful', 'cheerful', 'bright', 'uplifting', 'sunny', 'playful', 'whimsical', 'light', 'hopeful', 'happier', 'brighter', 'optimistic', 'festive'], minor: 0.05, tempo: 1.12, energy: 0.05, dyn: 2 },
  dramatic: { words: ['dramatic', 'intense', 'epic', 'stormy', 'turbulent', 'passionate', 'powerful', 'fiery', 'agitated', 'heroic', 'triumphant', 'grand', 'majestic'], minor: 0.6, tempo: 1.1, energy: 0.12, dyn: 8 },
  dark: { words: ['dark', 'darker', 'ominous', 'sinister', 'brooding', 'menacing', 'haunting', 'haunted', 'gothic'], minor: 0.95, tempo: 0.92, energy: 0.02, dyn: 0, phrygian: true },
  mysterious: { words: ['mysterious', 'mystery', 'eerie', 'enigmatic', 'suspenseful', 'uncanny', 'curious'], minor: 0.75, tempo: 0.9, energy: -0.02, dyn: -4, dorian: true },
  romanticMood: { words: ['love', 'loving', 'romance', 'affectionate', 'warm', 'intimate', 'yearning'], minor: 0.35, tempo: 0.92, energy: 0, dyn: -2 },
  emotional: { words: ['emotional', 'expressive', 'heartfelt', 'soulful', 'moving', 'touching', 'poignant', 'emotive', 'tearful'], minor: 0.55, tempo: 0.94, energy: 0.03, dyn: 2 },
  energetic: { words: ['energetic', 'lively', 'upbeat', 'driving', 'exciting', 'bouncy', 'vivacious', 'excited'], minor: 0.25, tempo: 1.22, energy: 0.1, dyn: 6 },
};

const TEMPO_WORDS = [
  [/\bgrave\b/, 44], [/\blargo\b/, 50], [/\blento\b/, 54], [/\badagio\b/, 64], [/\bandante\b/, 78],
  [/\bandantino\b/, 86], [/\bmoderato\b/, 100], [/\ballegretto\b/, 112], [/\ballegro\b/, 132],
  [/\bvivace\b/, 150], [/\bpresto\b/, 172], [/\bprestissimo\b/, 190],
];

const MODE_WORDS = {
  major: 'major', maj: 'major', ionian: 'major',
  minor: 'minor', min: 'minor', aeolian: 'minor',
  dorian: 'dorian', phrygian: 'phrygian', lydian: 'lydian', mixolydian: 'mixolydian',
};

// A style that refines another wins when both are mentioned ("a romantic piece like Liszt").
const REFINES = { virtuoso: 'romantic' };

function findStyle(text) {
  let best = null; let bestScore = 0; let bestPos = Infinity;
  const matched = new Set();
  for (const [id, words] of Object.entries(STYLE_WORDS)) {
    for (const w of words) {
      const re = new RegExp(`\\b${w.replace('-', '\\-')}\\b`);
      const m = re.exec(text);
      if (m) {
        matched.add(id);
        const score = w === id ? 2 : 1;
        if (score > bestScore || (score === bestScore && m.index < bestPos)) { best = id; bestScore = score; bestPos = m.index; }
      }
    }
  }
  for (const [child, parent] of Object.entries(REFINES)) if (matched.has(child) && (best === parent || best === child)) return child;
  return best;
}

function findMood(text) {
  let best = null; let pos = Infinity;
  for (const [id, m] of Object.entries(MOODS)) {
    for (const w of m.words) {
      const match = new RegExp(`\\b${w}\\b`).exec(text);
      if (match && match.index < pos) { best = id; pos = match.index; }
    }
  }
  return best;
}

function findKey(text) {
  const modeAlt = Object.keys(MODE_WORDS).join('|');
  // "C# minor", "Bb major", "f sharp minor", "e dorian"
  const re1 = new RegExp(`\\b([a-g])(\\s?(?:#|♯|sharp|flat|♭|b(?=\\s|-|$)))?[\\s-]*(${modeAlt})\\b`, 'i');
  let m = re1.exec(text);
  if (m) {
    const pc = parseNoteLetter(m[1], (m[2] || '').trim());
    return { tonic: pc, mode: MODE_WORDS[m[3].toLowerCase()] };
  }
  // "in D", "key of Eb", "in f#"
  const re2 = /\b(?:in|key of|key)\s+([a-g])(\s?(?:#|♯|sharp|flat|♭|b(?![a-z])))?(?![a-z])/i;
  m = re2.exec(text);
  if (m) {
    const pc = parseNoteLetter(m[1], (m[2] || '').trim());
    return { tonic: pc, mode: null };
  }
  const re3 = new RegExp(`\\b(${modeAlt})\\b`);
  m = re3.exec(text);
  if (m && !/\bmin(?:ute|utes)?\b/.test(m[0])) return { tonic: null, mode: MODE_WORDS[m[1]] };
  return null;
}

function findDuration(text) {
  let m = /\b(\d{1,2}):(\d{2})\b/.exec(text);
  if (m) return +m[1] * 60 + +m[2];
  let total = 0; let found = false;
  const reMin = /(\d+(?:\.\d+)?|a|an|one|two|three|four|five|half an?)\s*(?:-\s*)?(minutes?|mins?|m)\b(?!\s*(?:ajor|inor))/g;
  const words = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, 'half a': 0.5, 'half an': 0.5 };
  while ((m = reMin.exec(text))) {
    if (m[2] === 'm' && /\d/.test(m[1]) === false) continue;
    total += (words[m[1]] ?? parseFloat(m[1])) * 60; found = true;
  }
  const reSec = /(\d+(?:\.\d+)?)\s*(?:-\s*)?(seconds?|secs?|s)\b/g;
  while ((m = reSec.exec(text))) { total += parseFloat(m[1]); found = true; }
  if (found) return total;
  if (/\b(very short|tiny|quick sketch|brief)\b/.test(text)) return 45;
  if (/\bshort\b/.test(text)) return 60;
  if (/\b(very long|extended|epic length)\b/.test(text)) return 300;
  if (/\blong\b/.test(text)) return 210;
  return null;
}

function findTempo(text) {
  const m = /(\d{2,3})\s*(?:bpm|beats per minute)/.exec(text);
  if (m) return { bpm: +m[1] };
  for (const [re, bpm] of TEMPO_WORDS) if (re.test(text)) return { bpm };
  if (/\b(very slow|slowly|glacial)\b/.test(text)) return { factor: 0.7 };
  if (/\bballad\b/.test(text)) return { factor: 0.62 };
  if (/\bslow\b/.test(text)) return { factor: 0.8 };
  if (/\b(very fast|rapid|breakneck)\b/.test(text)) return { factor: 1.35 };
  if (/\b(fast|quick|brisk|up-?tempo)\b/.test(text)) return { factor: 1.2 };
  if (/\b(medium|moderate|mid-?tempo)\b/.test(text)) return { factor: 1 };
  return null;
}

function findMeter(text) {
  const m = /\b(2|3|4|5|6|7|9|12)\s*\/\s*(4|8)\b/.exec(text);
  if (m) return [+m[1], +m[2]];
  if (/\bwaltz\b/.test(text)) return [3, 4];
  if (/\b(gigue|jig|barcarolle|siciliano)\b/.test(text)) return [6, 8];
  if (/\bmarch\b/.test(text)) return [2, 4];
  if (/\b(odd meter|odd time|asymmetric)\b/.test(text)) return [7, 8];
  return null;
}

function findComplexity(text) {
  if (/\b(very simple|beginner|easy|childlike|nursery)\b/.test(text)) return 0.15;
  if (/\b(simple|sparse|minimal texture|plain|bare)\b/.test(text)) return 0.28;
  if (/\b(virtuosic|virtuoso|dense|intricate|showy|dazzling|flashy)\b/.test(text)) return 0.9;
  if (/\b(complex|complicated|advanced|rich|elaborate|ornate|busy)\b/.test(text)) return 0.78;
  return null;
}

const REMIX_RE = /\b(make (it|that|this|the (piece|song|last one))|more|less|jazzier|simpler|simplify|faster|slower|darker|brighter|happier|sadder|longer|shorter|again|another (one|version|take|variation)|variation|variations|vary|remix|same (piece|thing|one|but)|keep (it|the)|change (it|the)|transpose|now in|instead|tweak|redo|rework|louder|softer|busier|calmer|livelier|richer|sparser|slow (it|that) down|speed (it|that) up)\b/;

export function isRemixRequest(text) {
  return REMIX_RE.test(text.toLowerCase());
}

export function parseRequest(raw, previous = null) {
  const text = ` ${String(raw || '').toLowerCase().replace(/[’']/g, "'")} `;
  const out = {
    raw: String(raw || ''),
    style: findStyle(text),
    mood: findMood(text),
    key: findKey(text),
    duration: findDuration(text),
    tempo: findTempo(text),
    meter: findMeter(text),
    complexity: findComplexity(text),
    flow: /\b(flow|flows|flowing|fluid|seamless|continuous|unbroken|legato)\b/.test(text),
    remix: false,
    changes: [],
  };
  if (/\bwaltz\b/.test(text) && !out.style) out.style = 'romantic';

  if (previous && isRemixRequest(text)) {
    out.remix = true;
    const p = previous;
    const merged = {
      style: out.style || p.style,
      mood: out.mood || p.mood,
      key: out.key ? { tonic: out.key.tonic ?? p.key.tonic, mode: out.key.mode ?? p.key.mode } : { ...p.key },
      duration: out.duration || p.duration,
      tempo: out.tempo?.bpm ? out.tempo : { bpm: p.tempo },
      meter: out.meter || p.meter,
      complexity: out.complexity ?? p.complexity,
      flow: out.flow || p.flow,
      seed: p.seed,
      melodySeed: p.melodySeed,
    };
    const ch = out.changes;
    if (out.style && out.style !== p.style) {
      ch.push(`style → ${out.style}`);
      if (!out.tempo) merged.tempo = null; // re-infer tempo for the new style
      if (!out.meter) merged.meter = null;
    }
    if (/\b(simpler|simplify|less busy|sparser|less complex|easier)\b/.test(text)) { merged.complexity = Math.max(0.1, (merged.complexity ?? 0.5) - 0.3); ch.push('simplified texture'); }
    if (/\b(more complex|busier|more intricate|richer|more elaborate|fancier|more notes)\b/.test(text)) { merged.complexity = Math.min(0.95, (merged.complexity ?? 0.5) + 0.3); ch.push('richer texture'); }
    if (/\b(faster|speed (it|that) up|quicker|more upbeat)\b/.test(text)) { merged.tempo = { bpm: Math.round((p.tempo || 100) * 1.2) }; ch.push('faster'); }
    if (/\b(slower|slow (it|that) down|more relaxed)\b/.test(text)) { merged.tempo = { bpm: Math.round((p.tempo || 100) * 0.8) }; ch.push('slower'); }
    if (/\b(darker|sadder|more melancholic|minor)\b/.test(text) && !out.key?.tonic) {
      if (!['minor', 'dorian', 'phrygian'].includes(merged.key.mode)) { merged.key = { tonic: merged.key.tonic, mode: 'minor' }; ch.push('parallel minor'); }
      if (!out.mood) merged.mood = /darker/.test(text) ? 'dark' : 'melancholic';
    }
    if (/\b(brighter|happier|more cheerful|major)\b/.test(text) && !out.key?.tonic) {
      if (!['major', 'lydian', 'mixolydian'].includes(merged.key.mode)) { merged.key = { tonic: merged.key.tonic, mode: 'major' }; ch.push('parallel major'); }
      if (!out.mood) merged.mood = 'happy';
    }
    if (/\blonger\b/.test(text)) { merged.duration = Math.min(600, Math.round((p.duration || 120) * 1.5)); ch.push('longer'); }
    if (/\bshorter\b/.test(text)) { merged.duration = Math.max(20, Math.round((p.duration || 120) * 0.66)); ch.push('shorter'); }
    if (/\blouder\b/.test(text)) { merged.dynamicsShift = 8; ch.push('louder'); }
    if (/\b(softer|quieter)\b/.test(text)) { merged.dynamicsShift = -10; ch.push('softer'); }
    const tr = /transpose\s+(up|down)\s+(\d+|a|one|two|three|four|five)\s*(semitones?|half[- ]?steps?|steps?|tones?)?/.exec(text);
    if (tr) {
      const n = { a: 1, one: 1, two: 2, three: 3, four: 4, five: 5 }[tr[2]] ?? +tr[2];
      const semis = /tone|step/.test(tr[3] || '') && !/half|semi/.test(tr[3] || '') ? n * 2 : n;
      merged.key = { ...merged.key, tonic: mod12(merged.key.tonic + (tr[1] === 'up' ? semis : -semis)) };
      ch.push(`transposed ${tr[1]} ${semis} semitones`);
    }
    if (out.key?.tonic !== null && out.key?.tonic !== undefined) ch.push('new key');
    // Variation keeps the harmonic skeleton (same seed) but writes a new melody unless
    // the harmony-defining parameters changed.
    if (/\b(variation|variations|vary|another (one|version|take|variation)|again|redo|remix)\b/.test(text)) {
      merged.melodySeed = null;
      if (/\b(remix|another (one|take)|redo)\b/.test(text)) merged.seed = null;
      ch.push('new melodic variation');
    }
    if (!ch.length) { merged.melodySeed = null; ch.push('variation'); }
    return { ...out, ...merged, remix: true, changes: ch, raw: out.raw };
  }
  return out;
}
