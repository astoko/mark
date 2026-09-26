// Engraves "As We Know It" as MusicXML (4/4, two staves, four voices).
//   node examples/as-we-know-it/as_we_know_it.mjs && node examples/as-we-know-it/engrave.mjs
// Notes crossing the half-bar are split and tied; eighths are beamed per half-bar (per
// 3+3+2 group where the score limps or sways), sixteenths per beat; secondary-voice rests
// are hidden; accidentals are computed per measure against the current key signature
// (C major, then F♯ major from the new world); very high/low passages get 8va/15ma/8vb.

import { readFileSync, writeFileSync } from 'node:fs';

const here = (f) => new URL(f, import.meta.url);
const { bars, notes } = JSON.parse(readFileSync(here('./as_we_know_it_notation.json'), 'utf8'));

const DIV = 24; // per quarter → eighth 12, 16th 6, 32nd 3
const E = 12; // divisions per eighth
const MEASURE = 96;
const HALF = 48;
const VOICE = { rh: { staff: 1, n: 1, up: true }, rh2: { staff: 1, n: 2, up: false }, lh: { staff: 2, n: 5, up: false }, lh2: { staff: 2, n: 6, up: true } };
const TYPE = { 96: ['whole', 0], 72: ['half', 1], 48: ['half', 0], 36: ['quarter', 1], 24: ['quarter', 0], 18: ['eighth', 1], 12: ['eighth', 0], 9: ['16th', 1], 6: ['16th', 0], 3: ['32nd', 0] };
const SHARPS = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const keyMap = (fifths) => Object.fromEntries(SHARPS.slice(0, fifths).map((s) => [s, 1]));
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function spell(name) {
  const m = /^([A-G])(##|#|bb|b)?(\d)$/.exec(name);
  const alter = { '#': 1, '##': 2, b: -1, bb: -2 }[m[2]] || 0;
  return { step: m[1], alter, octave: Number(m[3]), midi: PC[m[1]] + alter + (Number(m[3]) + 1) * 12 };
}

// Split [s, e) into engravable values: never cross the half-bar except a dotted half from
// the downbeat or a whole bar.
function segments(s, e, groupCuts) {
  if (s === 0 && e === MEASURE) return [[0, 96]];
  // In 3+3+2 bars a note filling one group is written as one value (dotted quarter / quarter).
  if (groupCuts && groupCuts.has(s) && groupCuts.has(e) && (e - s === 36 || e - s === 24)) return [[s, e]];
  const cuts = [s];
  if (s < HALF && e > HALF && !(s === 0 && e === 72)) cuts.push(HALF);
  cuts.push(e);
  const out = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    let a = cuts[i]; const b = cuts[i + 1];
    while (a < b) {
      const len = b - a;
      const fit = [72, 48, 36, 24, 18, 12, 9, 6, 3].find((d) => d <= len
        && (d !== 72 || a === 0) && (d !== 48 || a % HALF === 0) && (d !== 36 || a % 12 === 0)
        && (d !== 24 || a % 12 === 0) && (d > 18 || a % (d === 9 ? 3 : Math.min(d, 6)) === 0));
      out.push([a, a + fit]);
      a += fit;
    }
  }
  return out;
}

function accidental(state, s, key) {
  const k = `${s.step}${s.octave}`;
  const cur = k in state ? state[k] : (key[s.step] || 0);
  if (cur === s.alter) return null;
  state[k] = s.alter;
  return { '-2': 'flat-flat', '-1': 'flat', 0: 'natural', 1: 'sharp', 2: 'double-sharp' }[String(s.alter)];
}

function voiceElements(evts, group) {
  const els = [];
  const groupCuts = group ? new Set(group.reduce((acc, g) => [...acc, acc[acc.length - 1] + g * E], [0])) : null;
  for (const ev of evts) {
    const s = Math.round(ev.start * E); const e = Math.round((ev.start + ev.dur) * E);
    const segs = segments(s, e, groupCuts);
    segs.forEach(([a, b], i) => els.push({
      on: a, div: b - a, names: ev.rest ? null : ev.names, rest: ev.rest, flags: ev.flags,
      tieStart: !ev.rest && (i < segs.length - 1 || ev.tieStart), tieStop: !ev.rest && (i > 0 || ev.tieStop),
      fermata: ev.fermata && i === segs.length - 1, arp: ev.arp && i === 0, first: i === 0,
    }));
  }
  // Beam groups: 3+3+2 when the bar is grouped that way; otherwise half-bars of plain
  // eighths, or single beats when sixteenths or rests are involved.
  let ranges;
  if (group) { ranges = []; let a = 0; for (const g of group) { ranges.push([a * E, (a + g) * E]); a += g; } }
  else {
    ranges = [];
    for (const h of [0, HALF]) {
      const inHalf = els.filter((x) => x.on >= h && x.on < h + HALF);
      const plain = inHalf.length === 4 && inHalf.every((x) => !x.rest && x.div === 12);
      if (plain) ranges.push([h, h + HALF]); else ranges.push([h, h + 24], [h + 24, h + HALF]);
    }
  }
  for (const [lo, hi] of ranges) {
    const grp = els.filter((x) => x.on >= lo && x.on < hi);
    let run = [];
    const flush = () => {
      if (run.length > 1) {
        run.forEach((x, k) => { x.beams = [[1, k === 0 ? 'begin' : k === run.length - 1 ? 'end' : 'continue']]; });
        for (const [lvl, max] of [[2, 6], [3, 3]]) {
          for (let k = 0; k < run.length; k++) {
            if (run[k].div > max) continue;
            const p = k > 0 && run[k - 1].div <= max; const n = k < run.length - 1 && run[k + 1].div <= max;
            if (p || n) run[k].beams.push([lvl, !p ? 'begin' : !n ? 'end' : 'continue']);
            else run[k].beams.push([lvl, k === 0 ? 'forward hook' : 'backward hook']);
          }
        }
      }
      run = [];
    };
    for (const x of grp) { if (!x.rest && x.div <= 18) run.push(x); else flush(); }
    flush();
  }
  return els;
}

function noteXml(x, voice, accState, key, showStem, hideRest) {
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
    if (x.rest) s += x.div === 96 ? '<rest measure="yes"/>' : '<rest/>';
    else { sp = spell(nm); s += `<pitch><step>${sp.step}</step>${sp.alter ? `<alter>${sp.alter}</alter>` : ''}<octave>${sp.octave}</octave></pitch>`; }
    s += `<duration>${x.div}</duration>`;
    if (x.tieStop) s += '<tie type="stop"/>';
    if (x.tieStart) s += '<tie type="start"/>';
    s += `<voice>${V.n}</voice><type>${type}</type>`;
    if (dot) s += '<dot/>';
    if (sp) { const acc = x.tieStop ? null : accidental(accState, sp, key); if (acc) s += `<accidental>${acc}</accidental>`; }
    if (!x.rest && showStem && type !== 'whole') s += `<stem>${V.up ? 'up' : 'down'}</stem>`;
    s += `<staff>${V.staff}</staff>`;
    if (k === 0 && x.beams) for (const [lvl, val] of x.beams) s += `<beam number="${lvl}">${val}</beam>`;
    const nots = [];
    if (x.tieStop) nots.push('<tied type="stop"/>');
    if (x.tieStart) nots.push('<tied type="start"/>');
    if (x.fermata && k === 0) nots.push('<fermata type="upright"/>');
    if (x.arp && !x.rest) nots.push('<arpeggiate/>');
    if (k === 0 && x.first && x.flags?.some((f) => f.accent)) nots.push('<articulations><accent/></articulations>');
    if (nots.length) s += `<notations>${nots.join('')}</notations>`;
    pieces.push(`${s}</note>`);
  });
  return pieces.join('');
}

const words = (t, placement = 'above', style = 'italic', weight = 'bold', staff = 1) => `<direction placement="${placement}"><direction-type><words font-style="${style}" font-weight="${weight}">${t}</words></direction-type><staff>${staff}</staff></direction>`;
const dyn = (d) => (/^(ppp|pp|p|mp|mf|f|ff|fff)$/.test(d)
  ? `<direction placement="below"><direction-type><dynamics><${d}/></dynamics></direction-type><staff>1</staff></direction>`
  : words(d, 'below', 'italic', 'normal'));
const metro = (bpm, text) => `<direction placement="above"><direction-type>${text ? `<words font-weight="bold">${text} </words>` : ''}<metronome parentheses="no"><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type><staff>1</staff><sound tempo="${bpm}"/></direction>`;
const shift = (type, size, staff, number) => `<direction placement="${type === 'up' || (type === 'stop' && staff === 2) ? 'below' : 'above'}"><direction-type><octave-shift type="${type}" size="${size}" number="${number}"/></direction-type><staff>${staff}</staff></direction>`;

// Octave-shift need per element: 15ma for the top of the keyboard, 8va above ~A6, 8vb for the
// lowest cluster.
function shiftFor(x, voice) {
  if (x.rest) return 0;
  const ps = x.names.map((n) => spell(n).midi);
  const lo = Math.min(...ps); const hi = Math.max(...ps);
  if (voice === 'rh' || voice === 'rh2') { if (lo >= 100) return 15; if (lo >= 81 && hi >= 93) return 8; return 0; }
  if (lo <= 23) return -8; // only the bottom-of-the-keyboard cluster
  return 0;
}

const METRO_AT = { 0: 63, 18: 64, 26: 76, 33: 86, 41: 60, 48: 60 };
let key = keyMap(0);
let wedgeOpen = false;
let xml = '';
bars.forEach((bar, b) => {
  let m = `<measure number="${b + 1}">`;
  if (b === 0) {
    m += `<attributes><divisions>${DIV}</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time>`
      + '<staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>';
  } else if (bar.key != null) {
    m += `<attributes><key><fifths>${bar.key}</fifths><mode>major</mode></key></attributes>`;
  }
  if (bar.key != null) key = keyMap(bar.key);
  if (b in METRO_AT) m += metro(METRO_AT[b], null);
  for (const t of bar.marks) m += words(t);
  if (bar.dm) m += dyn(bar.dm);
  if (bar.wedge === 'cresc' || bar.wedge === 'dim') {
    if (wedgeOpen) m += '<direction placement="below"><direction-type><wedge type="stop"/></direction-type><staff>1</staff></direction>';
    m += `<direction placement="below"><direction-type><wedge type="${bar.wedge === 'cresc' ? 'crescendo' : 'diminuendo'}"/></direction-type><staff>1</staff></direction>`;
    wedgeOpen = true;
  }

  const inBar = notes.filter((n) => n.bar === b);
  const acc = { 1: {}, 2: {} };
  const present = (v) => inBar.some((n) => n.voice === v);
  let first = true;
  for (const voice of ['rh', 'rh2', 'lh', 'lh2']) {
    const evts = inBar.filter((n) => n.voice === voice);
    if (!evts.length) {
      if ((voice === 'rh' && !present('rh2')) || (voice === 'lh' && !present('lh2'))) {
        if (!first) m += `<backup><duration>${MEASURE}</duration></backup>`;
        first = false;
        m += noteXml({ on: 0, div: 96, rest: true, fermata: bar.gp }, voice, acc[VOICE[voice].staff], key, false, false);
      }
      continue;
    }
    if (!first) m += `<backup><duration>${MEASURE}</duration></backup>`;
    first = false;
    const partner = { rh: 'rh2', rh2: 'rh', lh: 'lh2', lh2: 'lh' }[voice];
    const twoVoices = present(partner);
    const els = voiceElements(evts, bar.group);
    let cur = 0; const staff = VOICE[voice].staff; const num = voice === 'rh' ? 1 : voice === 'rh2' ? 2 : 3;
    for (const x of els) {
      const need = voice === 'rh2' ? 0 : shiftFor(x, voice);
      if (need !== cur) {
        if (cur) m += shift('stop', Math.abs(cur), staff, num);
        if (need) m += shift(need > 0 ? 'down' : 'up', Math.abs(need), staff, num);
        cur = need;
      }
      if (voice === 'rh' && bar.marksAt) for (const [at, t] of Object.entries(bar.marksAt)) if (x.on === Number(at) * E) m += words(t, 'above', 'italic', 'normal');
      m += noteXml(x, voice, acc[staff], key, twoVoices, twoVoices && (voice === 'rh2' || voice === 'lh2'));
    }
    if (cur) m += shift('stop', Math.abs(cur), staff, num);
  }
  if (bar.wedge === 'stop' && wedgeOpen) { m += '<direction placement="below"><direction-type><wedge type="stop"/></direction-type><staff>1</staff></direction>'; wedgeOpen = false; }
  if (b === 47 || b === 40) m += '<barline location="right"><bar-style>light-light</bar-style></barline>';
  if (b === bars.length - 1) m += '<barline location="right"><bar-style>light-heavy</bar-style></barline>';
  xml += `${m}</measure>`;
});

const TITLE = 'As We Know It';
const doc = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
<work><work-title>${TITLE}</work-title></work>
<movement-title>${TITLE}</movement-title>
<identification><creator type="composer">Claude</creator><rights>Original composition, hand-written; free to perform and share</rights></identification>
<credit page="1"><credit-type>title</credit-type><credit-words justify="center" valign="top" font-size="24">${TITLE}</credit-words></credit>
<credit page="1"><credit-type>subtitle</credit-type><credit-words justify="center" valign="top" font-size="12">the end of the world, in seven stages — for piano</credit-words></credit>
<credit page="1"><credit-type>composer</credit-type><credit-words justify="right" valign="top" font-size="11">Claude</credit-words></credit>
<part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
<part id="P1">${xml}</part>
</score-partwise>
`;
writeFileSync(here('./as_we_know_it.musicxml'), doc);
console.log(`as_we_know_it.musicxml: ${bars.length} measures, ${(doc.length / 1024).toFixed(0)} KB`);
