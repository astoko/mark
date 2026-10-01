// Form planning: decides sections, phrase layout, cadence plan, key areas,
// energy curve and which phrases restate earlier material — before any notes exist.

import { makeMeter, mod12 } from './theory.js';

const BASE_ENERGY = { intro: 0.3, theme: 0.5, development: 0.66, climax: 0.92, outro: 0.24 };

function allocate(total, sections) {
  // Largest-remainder allocation of phrases proportional to weight, respecting minimums.
  const out = sections.map((s) => s.min || 1);
  let left = total - out.reduce((a, b) => a + b, 0);
  if (left <= 0) return out;
  const wsum = sections.reduce((a, s) => a + s.weight, 0);
  const ideal = sections.map((s) => (s.weight / wsum) * total);
  const deficit = ideal.map((v, i) => v - out[i]);
  while (left > 0) {
    let best = 0;
    for (let i = 1; i < deficit.length; i++) if (deficit[i] > deficit[best]) best = i;
    out[best]++;
    deficit[best] -= 1;
    left--;
  }
  return out;
}

export function planStructure(params, style, rng) {
  const meter = makeMeter(params.meter[0], params.meter[1]);
  const pulseQ = meter.barQ / meter.pulses.length;
  const qTempo = params.tempo * pulseQ;
  const secPerBar = (meter.barQ * 60) / qTempo;
  // Leave room for the final ritardando / fermata.
  const totalBars = Math.max(8, Math.min(480, Math.round(params.duration / secPerBar - 0.5)));

  let phraseLen = 4;
  if (style.id === 'jazz' && totalBars >= 48) phraseLen = 8;
  if (totalBars < 16) phraseLen = 2;
  let nPhrases = Math.max(3, Math.floor(totalBars / phraseLen));
  const remainder = totalBars - nPhrases * phraseLen;

  // Choose which form sections fit.
  let form = style.form.map((f) => ({ ...f }));
  const fixedCount = () => form.filter((f) => f.fixed).length;
  const minMain = () => form.filter((f) => !f.fixed).reduce((a, f) => a + (f.min || 1), 0);
  if (nPhrases - fixedCount() < minMain()) form.forEach((f) => { if (!f.fixed) f.min = 1; });
  const dropOrder = ['development', 'intro', 'climax'];
  for (const t of dropOrder) {
    if (nPhrases - fixedCount() >= minMain()) break;
    form = form.filter((f) => f.type !== t);
  }
  const main = form.filter((f) => !f.fixed);
  const alloc = allocate(nPhrases - fixedCount(), main);
  let mi = 0;
  for (const f of form) f.phrases = f.fixed ? 1 : alloc[mi++];

  // Key areas.
  const home = { ...params.key };
  const family = ['major', 'lydian', 'mixolydian'].includes(home.mode) ? 'major' : 'minor';
  const plan = style.keyPlan && style.keyPlan[family];
  const modulate = plan && params.complexity > 0.2;
  const devKey = modulate && plan.development
    ? { tonic: mod12(home.tonic + plan.development[0]), mode: plan.development[1] } : home;
  const altKey = modulate && plan.alt && rng.chance(0.55)
    ? { tonic: mod12(home.tonic + plan.alt[0]), mode: plan.alt[1] } : null;

  const moodEnergy = params.energyBias || 0;
  const sections = [];
  const phrases = [];
  let bar = 0;
  let spareBars = 0;
  const themeSectionPhrases = [];

  form.forEach((f, si) => {
    const isLast = si === form.length - 1;
    const count = f.phrases;
    const section = {
      index: si, type: f.type, name: f.name, startBar: bar, bars: 0,
      // Arc > 1 (emotional requests) widens the contrast between quiet and climactic sections.
      energy: Math.max(0.08, Math.min(1, 0.5 + ((style.energy?.[f.type] ?? BASE_ENERGY[f.type]) - 0.5) * (params.arc || 1) + moodEnergy)),
      phraseIdx: [],
    };
    for (let p = 0; p < count; p++) {
      let bars = phraseLen;
      if (f.fixed && f.type === 'intro' && nPhrases < 8 && phraseLen > 2) { bars = Math.max(2, phraseLen / 2); spareBars += phraseLen - bars; }
      if (isLast && p === count - 1) bars += remainder + spareBars;
      let key = home;
      if (f.type === 'development') key = altKey && p >= Math.ceil(count / 2) ? altKey : devKey;

      const phrase = {
        index: phrases.length, section: si, sectionType: f.type, startBar: bar, bars, key,
        cadence: 'PAC', contour: 'arch', role: 'A', reuseFrom: null, reuseHarmonyFrom: null,
        posInSection: p, sectionLength: count,
      };

      // Cadence plan and restatement.
      if (f.type === 'intro') phrase.cadence = 'HC';
      else if (f.type === 'theme') {
        if (f.jazzHead) {
          const roles = count >= 4 ? ['A', 'A', 'B', 'A'] : ['A', 'A', 'B', 'A'].slice(0, count);
          phrase.role = roles[p % roles.length];
          phrase.cadence = phrase.role === 'B' ? 'HC' : p === 0 ? 'TURN' : 'PAC';
          if (p > 0 && phrase.role === 'A') phrase.reuseFrom = themeSectionPhrases[0];
        } else {
          phrase.cadence = count === 1 || p % 2 === 1 ? 'PAC' : 'HC';
          phrase.role = p % 4 === 2 ? 'B' : 'A';
          // Parallel period: consequent restates the antecedent's opening.
          if (p % 2 === 1 && style.id !== 'minimalist') phrase.reuseFrom = phrases.length - 1;
          if (p % 4 === 3 && themeSectionPhrases.length) phrase.reuseFrom = themeSectionPhrases[0];
        }
        themeSectionPhrases.push(phrase.index);
      } else if (f.type === 'development') {
        phrase.cadence = p === count - 1 ? 'HC' : rng.weighted({ HC: 2, DC: 1.5, PAC: 1 });
        phrase.role = 'D';
        if (f.reuseHarmony === 'theme' && themeSectionPhrases.length) {
          phrase.reuseHarmonyFrom = themeSectionPhrases[p % themeSectionPhrases.length];
          phrase.cadence = phrases[phrase.reuseHarmonyFrom].cadence;
        }
      } else if (f.type === 'climax') {
        phrase.cadence = p === count - 1 ? 'PAC' : p % 2 === 0 ? 'HC' : 'PAC';
        if (themeSectionPhrases.length) {
          const src = themeSectionPhrases[p % themeSectionPhrases.length];
          if (f.reuse === 'theme') phrase.reuseFrom = src;
          if (f.reuseHarmony === 'theme') phrase.reuseHarmonyFrom = src;
          phrase.cadence = p === count - 1 ? 'PAC' : phrases[src].cadence;
          phrase.role = phrases[src].role;
        }
      } else if (f.type === 'outro') {
        phrase.cadence = 'PAC';
        phrase.role = 'C';
      }
      if (isLast && p === count - 1) phrase.cadence = 'FINAL';

      phrase.contour = f.type === 'climax'
        ? rng.weighted({ arch: 3, ascending: 2 })
        : f.type === 'outro' ? rng.weighted({ descending: 3, arch: 1 })
          : f.type === 'development' && style.risingDevelopment ? 'ascending'
            : rng.weighted(style.melody.contours);

      phrases.push(phrase);
      section.phraseIdx.push(phrase.index);
      section.bars += bars;
      bar += bars;
    }
    section.key = section.phraseIdx.length ? phrases[section.phraseIdx[0]].key : home;
    sections.push(section);
  });

  return {
    meter, qTempo, secPerBar, totalBars: bar, phraseLen, home, sections, phrases,
    modulates: devKey !== home || !!altKey, devKey, altKey,
  };
}
