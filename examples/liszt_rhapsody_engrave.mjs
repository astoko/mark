// Engraves the hand-composed Rhapsody (see liszt_rhapsody_score.mjs) as MusicXML:
// two staves, D♭ major, spelled pitches, triplets, beams, dynamics, expression text,
// cadenza in grace notes, rolled chords and fermatas. Open the .musicxml in MuseScore,
// Sibelius, Finale or Dorico, or engrave it with Verovio.
//   node examples/liszt_rhapsody_score.mjs && node examples/liszt_rhapsody_engrave.mjs

import { readFileSync, writeFileSync } from 'node:fs';

const { bars, notes } = JSON.parse(readFileSync(new URL('./liszt_rhapsody_notation.json', import.meta.url), 'utf8'));
const DIV = 12; // divisions per quarter: 16ths = 3, triplet eighths = 4
const MEASURE = 4 * DIV;

// ---- spelling ----------------------------------------------------------------------
const CHORD_SPELL = {
  Db: { 1: 'Db', 5: 'F', 8: 'Ab' }, Bbm7: { 10: 'Bb', 1: 'Db', 5: 'F', 8: 'Ab' }, Gb: { 6: 'Gb', 10: 'Bb', 1: 'Db' },
  Gbm: { 6: 'Gb', 9: 'Bbb', 1: 'Db' }, Ab7: { 8: 'Ab', 0: 'C', 3: 'Eb', 6: 'Gb' }, Gdim7: { 7: 'G', 10: 'Bb', 1: 'Db', 4: 'Fb' },
  E7: { 4: 'E', 8: 'G#', 11: 'B', 2: 'D' }, A: { 9: 'A', 1: 'C#', 4: 'E' }, C: { 0: 'C', 4: 'E', 7: 'G' },
  Eb: { 3: 'Eb', 7: 'G', 10: 'Bb' }, Ebm7: { 3: 'Eb', 6: 'Gb', 10: 'Bb', 1: 'Db' }, Ab7b9: { 8: 'Ab', 0: 'C', 3: 'Eb', 6: 'Gb', 9: 'Bbb' },
};
const FLAT = { 0: 'C', 1: 'Db', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F', 6: 'Gb', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'Cb' };
const SHARP = { 0: 'C', 1: 'C#', 2: 'D', 3: 'D#', 4: 'E', 5: 'F', 6: 'F#', 7: 'G', 8: 'G#', 9: 'A', 10: 'A#', 11: 'B' };
const NATURAL = { ...FLAT, 11: 'B' };
const barSpelling = (b) => (b >= 17 && b <= 19 ? SHARP : b === 20 ? NATURAL : { ...FLAT, 11: 'B' });
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function spell(n) {
  let name = n.name ? n.name.replace(/-?\d+$/, '') : null;
  const pc = ((n.p % 12) + 12) % 12;
  if (!name) name = CHORD_SPELL[n.chord]?.[pc] || barSpelling(n.bar)[pc];
  const step = name[0];
  const alter = name.slice(1) === 'bb' ? -2 : name.slice(1) === 'b' ? -1 : name.slice(1) === '#' ? 1 : 0;
  const octave = Math.floor((n.p - alter - LETTER_PC[step]) / 12) - 1;
  return { step, alter, octave };
}

// ---- helpers -----------------------------------------------------------------------
const TYPES = [[48, 'whole', 0], [36, 'half', 1], [24, 'half', 0], [18, 'quarter', 1], [12, 'quarter', 0], [9, 'eighth', 1], [6, 'eighth', 0], [4, 'eighth', 0, true], [3, '16th', 0], [2, '16th', 0, true]];
const typeOf = (div) => TYPES.find(([d]) => d === div);
const splitRest = (div) => { const out = []; let r = div; for (const [d] of TYPES) while (r >= d && d !== 9 && d !== 18 && d !== 36) { out.push(d); r -= d; } if (r > 0) out.push(r); return out; };
const DYN = (v) => (v <= 32 ? 'ppp' : v <= 40 ? 'pp' : v <= 50 ? 'p' : v <= 60 ? 'mp' : v <= 75 ? 'mf' : v <= 92 ? 'f' : v <= 108 ? 'ff' : 'fff');
const TEXT = {
  0: ['Lento, quasi recitativo', 'con Ped.'], 3: ['Dolce cantabile'], 11: ['Più mosso, espressivo'], 19: ['Agitato — stringendo'],
  22: ['cresc. molto'], 24: ['rit.'], 25: ['Cadenza — a piacere'], 26: ['Grandioso, largamente'], 32: ['allargando'],
  33: ['dim.'], 34: ['Dolcissimo'], 38: ['morendo'],
};
const PARTS = { rh1: { staff: 1, voice: 1, stem: 'up' }, rh2: { staff: 1, voice: 2, stem: 'down' }, lh1: { staff: 2, voice: 5, stem: 'down' }, lh2: { staff: 2, voice: 6, stem: 'up' } };

// Accidental state per measure & staff, starting from the key signature (5 flats).
const KEY_ALTERS = { B: -1, E: -1, A: -1, D: -1, G: -1 };
function accidentalFor(state, s) {
  const k = `${s.step}${s.octave}`;
  const cur = k in state ? state[k] : (KEY_ALTERS[s.step] || 0);
  if (cur === s.alter) return null;
  state[k] = s.alter;
  return { '-2': 'flat-flat', '-1': 'flat', 0: 'natural', 1: 'sharp' }[s.alter];
}

function noteXml({ s, div, type, dot, triplet, chord, rest, part, grace, accidental, beams, tuplet, fermata, arp, isFirst }) {
  const P = PARTS[part];
  // Rests in the secondary voices are implied by the other voice on the staff: keep them invisible.
  let x = rest && P.voice % 2 === 0 ? '<note print-object="no">' : '<note>';
  if (grace) x += '<grace slash="no"/>';
  if (chord) x += '<chord/>';
  if (rest) x += '<rest/>';
  else x += `<pitch><step>${s.step}</step>${s.alter ? `<alter>${s.alter}</alter>` : ''}<octave>${s.octave}</octave></pitch>`;
  if (!grace) x += `<duration>${div}</duration>`;
  x += `<voice>${P.voice}</voice><type>${type}</type>`;
  if (dot) x += '<dot/>';
  if (accidental) x += `<accidental>${accidental}</accidental>`;
  if (triplet) x += '<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>';
  if (!rest && type !== 'whole') x += `<stem>${P.stem}</stem>`;
  x += `<staff>${P.staff}</staff>`;
  if (beams && !chord) for (const [lvl, val] of beams) x += `<beam number="${lvl}">${val}</beam>`;
  const nots = [];
  if (tuplet && !chord) nots.push(`<tuplet type="${tuplet}" bracket="${tuplet === 'start' ? 'no' : 'no'}"/>`);
  if (fermata && (isFirst || rest)) nots.push('<fermata type="upright"/>');
  if (arp && !rest) nots.push('<arpeggiate/>');
  if (nots.length) x += `<notations>${nots.join('')}</notations>`;
  return `${x}</note>`;
}

// Build a voice's element list for one measure: chords, rests, triplets, beams.
function voiceElements(evts, part) {
  const graces = evts.filter((e) => e.grace).sort((a, b) => a.order - b.order);
  const main = evts.filter((e) => !e.grace);
  const byOnset = new Map();
  for (const e of main) {
    const on = Math.round(e.rel * DIV);
    if (!byOnset.has(on)) byOnset.set(on, []);
    byOnset.get(on).push(e);
  }
  const onsets = [...byOnset.keys()].sort((a, b) => a - b);
  const els = [];
  let pos = 0;
  const pushRest = (len) => { for (const r of splitRest(len)) { els.push({ rest: true, on: pos, div: r }); pos += r; } };
  onsets.forEach((on, i) => {
    if (on > pos) pushRest(on - pos);
    const group = byOnset.get(on).sort((a, b) => a.p - b.p);
    const next = onsets[i + 1] ?? MEASURE;
    let div = Math.min(Math.round(Math.min(...group.map((g) => g.d)) * DIV), next - on, MEASURE - on);
    if (!typeOf(div)) div = [48, 36, 24, 18, 12, 9, 6, 4, 3, 2].find((d) => d <= div) || div;
    els.push({ on, div, group, part });
    pos = on + div;
  });
  if (pos < MEASURE && (els.length || part === 'rh1' || part === 'lh1')) pushRest(MEASURE - pos);
  // Beams: consecutive notes shorter than a quarter within one beat.
  for (let beat = 0; beat < 4; beat++) {
    const inBeat = els.filter((e) => !e.rest && e.div < 12 && e.on >= beat * 12 && e.on < (beat + 1) * 12);
    const runs = [];
    let cur = [];
    for (const e of els.filter((x) => x.on >= beat * 12 && x.on < (beat + 1) * 12)) {
      if (!e.rest && e.div < 12) cur.push(e); else { if (cur.length > 1) runs.push(cur); cur = []; }
    }
    if (cur.length > 1) runs.push(cur);
    for (const run of runs) {
      run.forEach((e, k) => { e.beams = [[1, k === 0 ? 'begin' : k === run.length - 1 ? 'end' : 'continue']]; });
      for (let k = 0; k < run.length; k++) {
        if (run[k].div > 3) continue;
        const prev16 = k > 0 && run[k - 1].div <= 3; const next16 = k < run.length - 1 && run[k + 1].div <= 3;
        if (prev16 || next16) run[k].beams.push([2, !prev16 ? 'begin' : !next16 ? 'end' : 'continue']);
      }
    }
    void inBeat;
  }
  // Triplet brackets: groups of three triplet-eighth slots starting on a beat.
  for (let k = 0; k < els.length; k++) {
    const e = els[k];
    if (e.div === 4 && e.on % 12 === 0 && els[k + 1]?.div === 4 && els[k + 2]?.div === 4) {
      e.tuplet = 'start'; els[k + 2].tuplet = 'stop';
    }
  }
  return { els, graces };
}

// ---- measures ----------------------------------------------------------------------
let xml = '';
let lastDyn = null;
for (let b = 0; b < bars.length; b++) {
  let m = `<measure number="${b + 1}">`;
  if (b === 0) {
    m += `<attributes><divisions>${DIV}</divisions><key><fifths>-5</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time>`
      + '<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>';
    m += '<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>63</per-minute></metronome></direction-type><staff>1</staff><sound tempo="63"/></direction>';
  }
  for (const t of TEXT[b] || []) m += `<direction placement="above"><direction-type><words font-style="italic" font-weight="bold">${t}</words></direction-type><staff>1</staff></direction>`;
  const dyn = DYN(bars[b].vel);
  if (dyn !== lastDyn) { m += `<direction placement="below"><direction-type><dynamics><${dyn}/></dynamics></direction-type><staff>1</staff></direction>`; lastDyn = dyn; }

  const inBar = notes.filter((x) => x.bar === b).map((x) => ({ ...x, rel: x.q - b * 4 }));
  const accState = { 1: {}, 2: {} };
  let first = true;
  for (const part of ['rh1', 'rh2', 'lh1', 'lh2']) {
    const evts = inBar.filter((x) => x.part === part);
    if (!evts.length && (part === 'rh2' || part === 'lh2')) continue;
    const { els, graces } = voiceElements(evts, part);
    if (!els.length && !graces.length) continue;
    if (!first) m += `<backup><duration>${MEASURE}</duration></backup>`;
    first = false;
    const staff = PARTS[part].staff;
    graces.forEach((g, k) => {
      const s = spell(g);
      const beams = [[1, k % 4 === 0 ? 'begin' : k % 4 === 3 || k === graces.length - 1 ? 'end' : 'continue'], [2, k % 4 === 0 ? 'begin' : k % 4 === 3 || k === graces.length - 1 ? 'end' : 'continue']];
      m += noteXml({ s, type: '16th', part, grace: true, accidental: accidentalFor(accState[staff], s), beams: graces.length - k === 1 && k % 4 === 0 ? null : beams, isFirst: true });
    });
    for (const e of els) {
      const [, type, dot, triplet] = typeOf(e.div) || [e.div, 'quarter', 0];
      if (e.rest) { m += noteXml({ rest: true, div: e.div, type, dot, triplet, part, beams: e.beams, tuplet: e.tuplet }); continue; }
      e.group.forEach((g, k) => {
        const s = spell(g);
        m += noteXml({ s, div: e.div, type, dot, triplet, chord: k > 0, part, accidental: accidentalFor(accState[staff], s), beams: e.beams, tuplet: e.tuplet, fermata: g.fermata, arp: g.arp, isFirst: k === 0 });
      });
    }
  }
  if (b === bars.length - 1) m += '<barline location="right"><bar-style>light-heavy</bar-style></barline>';
  xml += `${m}</measure>`;
}

const doc = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
<work><work-title>Rhapsody in D♭ major</work-title></work>
<movement-title>Rhapsody in D♭ major</movement-title>
<identification><creator type="composer">Claude (in the style of Liszt)</creator><rights>Hand-composed; free to use</rights></identification>
<credit page="1"><credit-type>title</credit-type><credit-words justify="center" valign="top" font-size="22">Rhapsody in D♭ major</credit-words></credit>
<credit page="1"><credit-type>subtitle</credit-type><credit-words justify="center" valign="top" font-size="12">in the style of Franz Liszt</credit-words></credit>
<credit page="1"><credit-type>composer</credit-type><credit-words justify="right" valign="top" font-size="11">Claude</credit-words></credit>
<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
<part id="P1">${xml}</part>
</score-partwise>
`;
writeFileSync(new URL('./liszt_rhapsody.musicxml', import.meta.url), doc);
console.log(`liszt_rhapsody.musicxml: ${bars.length} measures, ${(doc.length / 1024).toFixed(0)} KB`);
