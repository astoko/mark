// Engraves Estuary as MusicXML (6/8, E major, two staves, four voices).
//   node examples/estuary/estuary.mjs && node examples/estuary/engrave.mjs
// Notes crossing a dotted-quarter beat are split and tied (compound-meter convention),
// eighths/16ths are beamed per beat, secondary-voice rests are hidden, accidentals are
// computed per measure from the spelled note names against the key signature.

import { readFileSync, writeFileSync } from 'node:fs';

const here = (f) => new URL(f, import.meta.url);
const { bars, notes } = JSON.parse(readFileSync(here('./estuary_notation.json'), 'utf8'));

const DIV = 12; // per quarter → eighth = 6, 16th = 3
const E = 6; // divisions per eighth
const MEASURE = 36;
const BEAT = 18; // dotted quarter
const KEY = { F: 1, C: 1, G: 1, D: 1 }; // E major
const VOICE = { rh: { staff: 1, n: 1, up: true }, rh2: { staff: 1, n: 2, up: false }, lh: { staff: 2, n: 5, up: false }, lh2: { staff: 2, n: 6, up: true } };
const TYPE = { 36: ['half', 1], 24: ['half', 0], 18: ['quarter', 1], 12: ['quarter', 0], 9: ['eighth', 1], 6: ['eighth', 0], 3: ['16th', 0] };

function spell(name) {
  const m = /^([A-G])(##|#|bb|b)?(-?\d)$/.exec(name);
  const alter = { '#': 1, '##': 2, b: -1, bb: -2 }[m[2]] || 0;
  return { step: m[1], alter, octave: Number(m[3]) };
}

// Split [s, e) into engravable segments: never cross the mid-bar beat (except a full-bar
// dotted half), and decompose each piece into single note values.
function segments(s, e) {
  if (s === 0 && e === MEASURE) return [[0, 36]];
  const cuts = [s];
  if (s < BEAT && e > BEAT) cuts.push(BEAT);
  cuts.push(e);
  const out = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    let a = cuts[i]; const b = cuts[i + 1];
    while (a < b) {
      const len = b - a;
      const fit = [18, 12, 9, 6, 3].find((d) => d <= len && (d !== 18 || a % BEAT === 0) && (d !== 9 || a % 6 === 0));
      out.push([a, a + fit]);
      a += fit;
    }
  }
  return out;
}

function accidental(state, s) {
  const k = `${s.step}${s.octave}`;
  const cur = k in state ? state[k] : (KEY[s.step] || 0);
  if (cur === s.alter) return null;
  state[k] = s.alter;
  return { '-2': 'flat-flat', '-1': 'flat', 0: 'natural', 1: 'sharp', 2: 'double-sharp' }[String(s.alter)];
}

function voiceElements(evts) {
  // evts: {start (eighths), dur, names|null, rest}
  const els = [];
  for (const ev of evts) {
    const s = Math.round(ev.start * E); const e = Math.round((ev.start + ev.dur) * E);
    const segs = segments(s, e);
    segs.forEach(([a, b], i) => els.push({ on: a, div: b - a, names: ev.rest ? null : ev.names, rest: ev.rest, tieStart: !ev.rest && i < segs.length - 1, tieStop: !ev.rest && i > 0, first: i === 0, fermata: ev.fermata && i === segs.length - 1, arp: ev.arp && i === 0 }));
  }
  // beams per dotted-quarter beat
  for (const beat of [0, 18]) {
    const group = els.filter((x) => x.on >= beat && x.on < beat + BEAT);
    let run = [];
    const flush = () => {
      if (run.length > 1) {
        run.forEach((x, k) => { x.beams = [[1, k === 0 ? 'begin' : k === run.length - 1 ? 'end' : 'continue']]; });
        for (let k = 0; k < run.length; k++) {
          if (run[k].div > 3) continue;
          const p = k > 0 && run[k - 1].div <= 3; const n = k < run.length - 1 && run[k + 1].div <= 3;
          if (p || n) run[k].beams.push([2, !p ? 'begin' : !n ? 'end' : 'continue']);
        }
      }
      run = [];
    };
    for (const x of group) { if (!x.rest && x.div < 18 && x.div !== 12) run.push(x); else flush(); }
    flush();
  }
  return els;
}

function noteXml(x, voice, accState, showStem, hideRest) {
  const V = VOICE[voice];
  const [type, dot] = TYPE[x.div];
  const pieces = [];
  const members = x.rest ? [null] : x.names;
  members.forEach((nm, k) => {
    let s = '<note';
    if (x.rest && hideRest) s += ' print-object="no"';
    s += '>';
    if (k > 0) s += '<chord/>';
    let sp = null;
    if (x.rest) s += x.div === 36 ? '<rest measure="yes"/>' : '<rest/>';
    else { sp = spell(nm); s += `<pitch><step>${sp.step}</step>${sp.alter ? `<alter>${sp.alter}</alter>` : ''}<octave>${sp.octave}</octave></pitch>`; }
    s += `<duration>${x.div}</duration>`;
    if (x.tieStop) s += '<tie type="stop"/>';
    if (x.tieStart) s += '<tie type="start"/>';
    s += `<voice>${V.n}</voice><type>${type}</type>`;
    if (dot) s += '<dot/>';
    if (sp) { const acc = x.tieStop ? null : accidental(accState, sp); if (acc) s += `<accidental>${acc}</accidental>`; }
    if (!x.rest && showStem && type !== 'whole') s += `<stem>${V.up ? 'up' : 'down'}</stem>`;
    s += `<staff>${V.staff}</staff>`;
    if (k === 0 && x.beams) for (const [lvl, val] of x.beams) s += `<beam number="${lvl}">${val}</beam>`;
    const nots = [];
    if (x.tieStop) nots.push('<tied type="stop"/>');
    if (x.tieStart) nots.push('<tied type="start"/>');
    if (x.fermata && k === 0) nots.push('<fermata type="upright"/>');
    if (x.arp && !x.rest) nots.push('<arpeggiate/>');
    if (nots.length) s += `<notations>${nots.join('')}</notations>`;
    pieces.push(`${s}</note>`);
  });
  return pieces.join('');
}

const words = (t, placement = 'above', style = 'italic', weight = 'bold') => `<direction placement="${placement}"><direction-type><words font-style="${style}" font-weight="${weight}">${t}</words></direction-type><staff>1</staff></direction>`;
const dyn = (d) => (/^(ppp|pp|p|mp|mf|f|ff|fff)$/.test(d)
  ? `<direction placement="below"><direction-type><dynamics><${d}/></dynamics></direction-type><staff>1</staff></direction>`
  : words(d, 'below', 'italic', 'normal'));

let xml = '';
bars.forEach((bar, b) => {
  let m = `<measure number="${b + 1}">`;
  if (b === 0) {
    m += `<attributes><divisions>${DIV}</divisions><key><fifths>4</fifths><mode>major</mode></key><time><beats>6</beats><beat-type>8</beat-type></time>`
      + '<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>';
    m += '<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><beat-unit-dot/><per-minute>46</per-minute></metronome></direction-type><staff>1</staff><sound tempo="69"/></direction>';
  }
  for (const t of bar.marks) m += words(t);
  if (bar.dm) m += dyn(bar.dm);
  if (bar.wedge === 'start') m += '<direction placement="below"><direction-type><wedge type="crescendo"/></direction-type><staff>1</staff></direction>';
  if (bar.wedge === 'dim-start') m += '<direction placement="below"><direction-type><wedge type="diminuendo"/></direction-type><staff>1</staff></direction>';

  const inBar = notes.filter((n) => n.bar === b);
  const acc = { 1: {}, 2: {} };
  const present = (v) => inBar.some((n) => n.voice === v);
  let first = true;
  for (const voice of ['rh', 'rh2', 'lh', 'lh2']) {
    const evts = inBar.filter((n) => n.voice === voice);
    if (!evts.length) {
      // an empty staff still needs a full-bar rest in its main voice
      if ((voice === 'rh' && !present('rh2')) || (voice === 'lh' && !present('lh2'))) {
        if (!first) m += `<backup><duration>${MEASURE}</duration></backup>`;
        first = false;
        m += noteXml({ on: 0, div: 36, rest: true }, voice, acc[VOICE[voice].staff], false, false);
      }
      continue;
    }
    if (!first) m += `<backup><duration>${MEASURE}</duration></backup>`;
    first = false;
    const partner = { rh: 'rh2', rh2: 'rh', lh: 'lh2', lh2: 'lh' }[voice];
    const twoVoices = present(partner);
    const els = voiceElements(evts);
    // Dynamics that change inside the bar are anchored to the first note at that offset.
    for (const x of els) {
      if (voice === 'rh' && bar.dmAt) for (const [at, d] of Object.entries(bar.dmAt)) if (x.on === Number(at) * E) m += dyn(d);
      m += noteXml(x, voice, acc[VOICE[voice].staff], twoVoices, twoVoices && (voice === 'rh2' || voice === 'lh2'));
    }
  }
  if (bar.wedge === 'stop' || bar.wedge === 'dim-stop') m += '<direction placement="below"><direction-type><wedge type="stop"/></direction-type><staff>1</staff></direction>';
  if (b === bars.length - 1) m += '<barline location="right"><bar-style>light-heavy</bar-style></barline>';
  xml += `${m}</measure>`;
});

const doc = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
<work><work-title>Estuary</work-title></work>
<movement-title>Estuary</movement-title>
<identification><creator type="composer">Claude</creator><rights>Original composition, hand-written; free to perform and share</rights></identification>
<credit page="1"><credit-type>title</credit-type><credit-words justify="center" valign="top" font-size="24">Estuary</credit-words></credit>
<credit page="1"><credit-type>subtitle</credit-type><credit-words justify="center" valign="top" font-size="12">Nocturne for piano — where the river meets the sea</credit-words></credit>
<credit page="1"><credit-type>composer</credit-type><credit-words justify="right" valign="top" font-size="11">Claude</credit-words></credit>
<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
<part id="P1">${xml}</part>
</score-partwise>
`;
writeFileSync(here('./estuary.musicxml'), doc);
console.log(`estuary.musicxml: ${bars.length} measures, ${(doc.length / 1024).toFixed(0)} KB`);
