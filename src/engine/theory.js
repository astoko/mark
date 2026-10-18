// Music theory primitives: pitch classes, modes, keys, chords, roman numerals,
// chord-scales and neo-Riemannian transformations.

export const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const FLAT_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

export const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

// Tonal family decides which roman-numeral vocabulary a style uses.
export const MODE_FAMILY = {
  major: 'major', lydian: 'major', mixolydian: 'major',
  minor: 'minor', dorian: 'minor', phrygian: 'minor',
};

export const mod12 = (n) => ((n % 12) + 12) % 12;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const FLAT_PARENT_TONICS = new Set([5, 10, 3, 8, 1, 6]); // F B♭ E♭ A♭ D♭ G♭
const PARENT_OFFSET = { major: 0, minor: 3, dorian: -2, phrygian: -4, lydian: -5, mixolydian: 5 };

export function usesFlats(tonic, mode) {
  return FLAT_PARENT_TONICS.has(mod12(tonic + (PARENT_OFFSET[mode] ?? 0)));
}

export function pcName(pc, flats = false) {
  return (flats ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];
}

export function keyLabel(key) {
  const flats = usesFlats(key.tonic, key.mode);
  const modeName = key.mode === 'major' || key.mode === 'minor'
    ? key.mode : key.mode.charAt(0).toUpperCase() + key.mode.slice(1);
  return `${pcName(key.tonic, flats)} ${modeName}`;
}

export function midiName(m, flats = false) {
  return `${pcName(m, flats)}${Math.floor(m / 12) - 1}`;
}

export function parseNoteLetter(letter, accidental = '') {
  const base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[letter.toLowerCase()];
  if (base === undefined) return null;
  const acc = accidental.trim().toLowerCase();
  let shift = 0;
  if (/^(#|♯|sharp|-sharp| sharp)$/.test(acc)) shift = 1;
  else if (/^(b|♭|flat|-flat| flat)$/.test(acc)) shift = -1;
  return mod12(base + shift);
}

export function scalePcs(key) {
  return (MODES[key.mode] || MODES.major).map((i) => mod12(key.tonic + i));
}

// ---------------------------------------------------------------------------
// Chords

const QUALITY_INTERVALS = {
  maj: [0, 4, 7], min: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8],
  sus4: [0, 5, 7], sus2: [0, 2, 7],
};
const SEVENTH_INTERVAL = { m7: 10, M7: 11, d7: 9 };
const EXT_INTERVAL = { add9: 2, 9: 2, b9: 1, '#9': 3, 11: 5, '#11': 6, 13: 9, add6: 9 };

export function makeChord({ root, quality = 'maj', seventh = null, ext = [], roman = null, func = null, flats = false, label = null }) {
  if (seventh && ext.includes('add9')) ext = [...new Set(ext.map((e) => (e === 'add9' ? '9' : e)))];
  const q = QUALITY_INTERVALS[quality] || QUALITY_INTERVALS.maj;
  const tones = [
    { role: 'root', pc: mod12(root) },
    { role: quality.startsWith('sus') ? 'sus' : 'third', pc: mod12(root + q[1]) },
    { role: 'fifth', pc: mod12(root + q[2]) },
  ];
  if (seventh) tones.push({ role: 'seventh', pc: mod12(root + SEVENTH_INTERVAL[seventh]) });
  for (const e of ext) {
    if (EXT_INTERVAL[e] === undefined) continue;
    tones.push({ role: 'ext', name: e, pc: mod12(root + EXT_INTERVAL[e]) });
  }
  const pcs = [...new Set(tones.map((t) => t.pc))];
  return {
    root: mod12(root), quality, seventh, ext: [...ext], roman, func, label,
    tones, pcs,
    symbol: chordSymbol(root, quality, seventh, ext, flats),
  };
}

export function chordSymbol(root, quality, seventh, ext = [], flats = false) {
  let s = pcName(root, flats);
  const has = (e) => ext.includes(e);
  let body = '';
  if (quality === 'min') body = 'm';
  else if (quality === 'aug') body = '+';
  if (quality === 'dim') {
    body = seventh === 'm7' ? 'm7♭5' : seventh === 'd7' ? '°7' : '°';
  } else if (seventh) {
    if (quality === 'min') body = seventh === 'M7' ? 'm(maj7)' : 'm7';
    else if (seventh === 'M7') body += 'maj7';
    else body += '7';
  }
  if (seventh && quality !== 'dim') {
    if (has('13')) body = body.replace(/7$/, '13');
    else if (has('9')) body = body.replace(/7$/, '9');
  }
  if (quality === 'sus4') body += seventh ? '' : 'sus4';
  if (quality === 'sus2') body += seventh ? '' : 'sus2';
  if (seventh && quality.startsWith('sus')) body = `7${quality}`;
  if (has('add6')) body += '6';
  if (has('add9')) body += 'add9';
  if (has('b9')) body += '(♭9)';
  if (has('#11')) body += '(♯11)';
  if (has('11')) body += '11';
  return s + body;
}

const ROMAN_RE = /^([b#♭♯]?)(VII|vii|VI|vi|IV|iv|V|v|III|iii|II|ii|I|i)(.*)$/;
const ROMAN_DEGREES = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'];
const FUNCTION_BY_DEGREE = ['T', 'S', 'T', 'S', 'D', 'T', 'D'];

function parseSuffix(suffix) {
  let quality = null;
  let seventh = null;
  const ext = [];
  let s = suffix;
  const take = (re) => {
    const m = re.exec(s);
    if (m) { s = s.slice(m[0].length); return true; }
    return false;
  };
  if (take(/^(°|o)7/)) { quality = 'dim'; seventh = 'd7'; }
  else if (take(/^(°|o)/)) quality = 'dim';
  else if (take(/^ø7?/)) { quality = 'dim'; seventh = 'm7'; }
  else if (take(/^\+/)) quality = 'aug';
  while (s.length) {
    if (take(/^maj7/)) seventh = 'M7';
    else if (take(/^maj9/)) { seventh = 'M7'; ext.push('9'); }
    else if (take(/^7/)) seventh = seventh || 'm7';
    else if (take(/^9/)) { seventh = seventh || 'm7'; ext.push('9'); }
    else if (take(/^13/)) { seventh = seventh || 'm7'; ext.push('13'); }
    else if (take(/^b9/)) ext.push('b9');
    else if (take(/^#11/)) ext.push('#11');
    else if (take(/^add9/)) ext.push('add9');
    else if (take(/^6/)) ext.push('add6');
    else if (take(/^sus4/)) quality = 'sus4';
    else if (take(/^sus2/)) quality = 'sus2';
    else s = s.slice(1); // ignore unknown characters rather than failing
  }
  return { quality, seventh, ext };
}

export function chordFromRoman(token, key, flats = usesFlats(key.tonic, key.mode)) {
  const [primary, target] = token.split('/');
  let base = key;
  let secondary = false;
  if (target) {
    const t = chordFromRoman(target, key, flats);
    base = { tonic: t.root, mode: 'major' };
    secondary = true;
  }
  const m = ROMAN_RE.exec(primary);
  if (!m) throw new Error(`Bad roman numeral: ${token}`);
  const [, acc, numeral, suffix] = m;
  const deg = ROMAN_DEGREES.indexOf(numeral.toLowerCase());
  // Roman numerals are spelled against the parallel major/minor; modal colour lives in the
  // melody's scale and in explicitly modal chords (e.g. II in Lydian, IV in Dorian).
  const scale = MODES[MODE_FAMILY[base.mode] === 'minor' ? 'minor' : 'major'];
  const shift = acc === 'b' || acc === '♭' ? -1 : acc ? 1 : 0;
  const root = mod12(base.tonic + scale[deg] + shift);
  const upper = numeral === numeral.toUpperCase();
  const parsed = parseSuffix(suffix);
  const quality = parsed.quality || (upper ? 'maj' : 'min');
  let func = secondary ? 'D' : FUNCTION_BY_DEGREE[deg];
  if (shift && !secondary) func = deg === 1 ? 'S' : 'C'; // bII is predominant; other chromatic = colour
  return makeChord({ root, quality, seventh: parsed.seventh, ext: parsed.ext, roman: token, func, flats });
}

export function withExtensions(chord, { seventh, ext = [] }, flats) {
  return makeChord({
    root: chord.root,
    quality: chord.quality,
    seventh: seventh === undefined ? chord.seventh : seventh,
    ext: [...new Set([...chord.ext, ...ext])],
    roman: chord.roman,
    func: chord.func,
    flats,
    label: chord.label,
  });
}

// Chord-scale: the key's scale with chord tones substituted for their
// chromatic neighbours (e.g. V/V in C major borrows F♯ instead of F).
export function chordScale(key, chord) {
  const scale = scalePcs(key);
  const out = scale.slice();
  for (const pc of chord.pcs) {
    if (out.includes(pc)) continue;
    let best = -1;
    for (let i = 0; i < out.length; i++) {
      const d = Math.min(mod12(out[i] - pc), mod12(pc - out[i]));
      if (d === 1 && !chord.pcs.includes(out[i])) { best = i; break; }
    }
    if (best >= 0) out[best] = pc;
    else out.push(pc);
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

export function pitchesInRange(pcs, lo, hi) {
  const set = new Set(pcs.map(mod12));
  const out = [];
  for (let p = lo; p <= hi; p++) if (set.has(mod12(p))) out.push(p);
  return out;
}

export function nearestPitchWithPc(pc, target) {
  const base = target - mod12(target - pc);
  const up = base + 12;
  return Math.abs(target - base) <= Math.abs(up - target) ? base : up;
}

// Move `steps` scale degrees from `pitch` along the given pitch-class set.
export function stepAlong(pitch, steps, pcs) {
  const set = new Set(pcs);
  let p = pitch;
  if (!set.has(mod12(p))) {
    // snap to nearest member first
    for (let d = 1; d < 12; d++) {
      if (set.has(mod12(p - d))) { p -= d; break; }
      if (set.has(mod12(p + d))) { p += d; break; }
    }
  }
  const dir = Math.sign(steps);
  for (let i = 0; i < Math.abs(steps); i++) {
    do { p += dir; } while (!set.has(mod12(p)));
  }
  return p;
}

export function scaleStepDistance(a, b, pcs) {
  if (a === b) return 0;
  const set = new Set(pcs);
  const dir = Math.sign(b - a);
  let n = 0;
  for (let p = a + dir; dir > 0 ? p <= b : p >= b; p += dir) if (set.has(mod12(p))) n++;
  return n * dir;
}

// Neo-Riemannian transformations on major/minor triads.
export const NEO_RIEMANN = {
  P: (c) => ({ root: c.root, quality: c.quality === 'maj' ? 'min' : 'maj' }),
  R: (c) => (c.quality === 'maj' ? { root: mod12(c.root - 3), quality: 'min' } : { root: mod12(c.root + 3), quality: 'maj' }),
  L: (c) => (c.quality === 'maj' ? { root: mod12(c.root + 4), quality: 'min' } : { root: mod12(c.root - 4), quality: 'maj' }),
  N: (c) => (c.quality === 'maj' ? { root: mod12(c.root + 5), quality: 'min' } : { root: mod12(c.root - 5), quality: 'maj' }),
  S: (c) => (c.quality === 'maj' ? { root: mod12(c.root + 1), quality: 'min' } : { root: mod12(c.root - 1), quality: 'maj' }),
  H: (c) => (c.quality === 'maj' ? { root: mod12(c.root + 8), quality: 'min' } : { root: mod12(c.root + 4), quality: 'maj' }),
  'T+2': (c) => ({ root: mod12(c.root + 2), quality: c.quality }),
  'T-2': (c) => ({ root: mod12(c.root - 2), quality: c.quality }),
};

// Circle-of-fifths distance between two pitch classes (0..6).
export function fifthsDistance(a, b) {
  const d = mod12((b - a) * 7);
  return Math.min(d, 12 - d);
}

// ---------------------------------------------------------------------------
// Meter

export function makeMeter(num, den) {
  const barQ = (num * 4) / den;
  let pulses;
  let accents;
  if (den === 8 && num % 3 === 0) {
    pulses = Array(num / 3).fill(1.5);
    accents = pulses.map((_, i) => (i === 0 ? 1 : i === pulses.length / 2 ? 0.75 : 0.55));
  } else if (den === 8) {
    const groups = num === 5 ? [3, 2] : num === 7 ? [2, 2, 3] : Array(Math.floor(num / 2)).fill(2).concat(num % 2 ? [num % 2 + 0] : []);
    pulses = groups.map((g) => g / 2);
    accents = pulses.map((_, i) => (i === 0 ? 1 : 0.6));
  } else if (num === 5) {
    pulses = Array(5).fill(4 / den);
    accents = [1, 0.45, 0.45, 0.75, 0.45];
  } else {
    pulses = Array(num).fill(4 / den);
    accents = pulses.map((_, i) => (i === 0 ? 1 : num === 4 && i === 2 ? 0.75 : 0.5));
  }
  const pulseStarts = [];
  let acc = 0;
  for (const p of pulses) { pulseStarts.push(acc); acc += p; }
  return { num, den, barQ, pulses, pulseStarts, accents, compound: den === 8 && num % 3 === 0 };
}

// Metric strength of a position (in quarters) within a bar: 0..1
export function metricStrength(meter, posInBar) {
  const eps = 1e-6;
  for (let i = 0; i < meter.pulseStarts.length; i++) {
    if (Math.abs(posInBar - meter.pulseStarts[i]) < eps) return meter.accents[i];
  }
  for (let i = 0; i < meter.pulseStarts.length; i++) {
    const start = meter.pulseStarts[i];
    const len = meter.pulses[i];
    const rel = posInBar - start;
    if (rel > 0 && rel < len) {
      const sub = meter.compound ? 0.5 : len / 2;
      return Math.abs(rel % sub) < eps ? 0.3 : 0.12;
    }
  }
  return 0.12;
}
