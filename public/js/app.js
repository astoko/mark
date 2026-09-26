// Chat UI + wiring: request → server composition → auto-play with live visualization.

import { PianoSynth } from './synth.js';
import { Player } from './player.js';
import { Keyboard } from './keyboard.js';
import { PianoRoll, Overview } from './roll.js';
import { exportMidi, exportWav } from './export.js';

const $ = (id) => document.getElementById(id);
const els = {
  messages: $('messages'), form: $('composer'), prompt: $('prompt'), send: $('send'), chipsRemix: $('remixChips'),
  title: $('title'), chips: $('chips'), liveSection: $('liveSection'), liveChord: $('liveChord'),
  play: $('playBtn'), stop: $('stopBtn'), time: $('time'), tempo: $('tempo'), tempoVal: $('tempoVal'),
  volume: $('volume'), trDown: $('trDown'), trUp: $('trUp'), trVal: $('trVal'), midi: $('midiBtn'), wav: $('wavBtn'),
  synthStatus: $('synthStatus'), historyBtn: $('historyBtn'), historyDlg: $('historyDlg'), historyList: $('historyList'),
};

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

let sessionId = store.get('mark.session', null);
if (!sessionId) { sessionId = (crypto.randomUUID?.() || String(Math.random()).slice(2)); store.set('mark.session', sessionId); }

const synth = new PianoSynth();
const player = new Player(synth);
const keyboard = new Keyboard($('keyboard'));
const roll = new PianoRoll($('roll'), { onSeek: (t) => player.seek(t) });
const overview = new Overview($('overview'), { onSeek: (t) => player.seek(t) });

let current = null; // {id, composition}
let transpose = 0;
let busy = false;
const pieceCache = new Map();

synth.init((p) => { els.synthStatus.textContent = `Preparing piano… ${Math.round(p * 100)}%`; })
  .then(() => { els.synthStatus.textContent = `${synth.kind === 'sampled' ? 'Grand piano (Salamander samples)' : 'Synthesized piano'} ready · Space = play/pause · click the roll to seek`; })
  .catch((e) => { els.synthStatus.textContent = `Audio unavailable: ${e.message}`; });

// ---------------------------------------------------------------------------- chat
const EXAMPLES = [
  'Melancholic ambient piece in A minor',
  'Bright classical sonatina in G major, 90 seconds',
  'Late-night jazz ballad in F',
  'Hypnotic minimalist piece in 7/8',
  'Stormy romantic nocturne, 3 minutes',
  'Baroque invention in D minor, allegro',
  'Mysterious cinematic contemporary piece',
];
const REMIX = ['Variation', 'Make it jazzier', 'Simplify it', 'More complex', 'Darker', 'Brighter', 'Faster', 'Slower', 'Longer'];

function esc(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function md(text) {
  return text.split('\n').map((line, i) => {
    const html = esc(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
    const dim = i > 1 && /^(Techniques|Inferred|Texture):/.test(line);
    return `<div class="line${dim ? ' dim' : ''}">${html}</div>`;
  }).join('');
}

function scrollDown() { els.messages.scrollTop = els.messages.scrollHeight; }

function addMessage(role, text, { pieceId = null, persist = true, error = false } = {}) {
  const div = document.createElement('div');
  div.className = `msg ${role === 'user' ? 'user' : 'bot'}${error ? ' err' : ''}`;
  if (role === 'user') div.textContent = text;
  else div.innerHTML = md(text);
  if (pieceId) {
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = `<button class="small" data-act="play">▶ Play</button><button class="small" data-act="midi">MIDI</button><button class="small" data-act="variation">Variation</button>`;
    actions.addEventListener('click', async (e) => {
      const act = e.target.dataset.act;
      if (!act) return;
      if (act === 'play') { await loadPiece(pieceId, true); }
      if (act === 'midi') { const p = await fetchPiece(pieceId); if (p) exportMidi(p, { transpose, rate: player.rate }); }
      if (act === 'variation') submit('Variation', pieceId);
    });
    div.appendChild(actions);
  }
  els.messages.appendChild(div);
  scrollDown();
  if (persist) {
    const log = store.get(`mark.log.${sessionId}`, []);
    log.push({ role, text, pieceId, error });
    store.set(`mark.log.${sessionId}`, log.slice(-80));
  }
  return div;
}

function welcome() {
  const div = document.createElement('div');
  div.className = 'msg bot welcome';
  div.innerHTML = `<div class="line">Describe a piece and I'll compose it from scratch — form, harmony, voice leading, melody and performance — then play it.</div>
    <div class="line dim">Style, key, tempo, meter, mood, length and complexity are all optional; anything you leave out is inferred.</div>
    <div class="examples">${EXAMPLES.map((e) => `<button class="small">${esc(e)}</button>`).join('')}</div>`;
  div.querySelector('.examples').addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') submit(e.target.textContent); });
  els.messages.appendChild(div);
}

function restoreLog() {
  const log = store.get(`mark.log.${sessionId}`, []);
  welcome();
  for (const m of log) addMessage(m.role, m.text, { pieceId: m.pieceId, persist: false, error: m.error });
  const last = [...log].reverse().find((m) => m.pieceId);
  if (last) { current = { id: last.pieceId }; renderRemixChips(); loadPiece(last.pieceId, false); }
}

function renderRemixChips() {
  els.chipsRemix.hidden = !current;
  els.chipsRemix.innerHTML = REMIX.map((r) => `<button>${r}</button>`).join('');
}
els.chipsRemix.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') submit(e.target.textContent); });

async function submit(text, previousId = current?.id) {
  const prompt = (text ?? els.prompt.value).trim();
  if (!prompt || busy) return;
  busy = true;
  els.send.disabled = true;
  els.prompt.value = '';
  // Unlock audio inside the user gesture so auto-play is allowed when the piece arrives.
  synth.resume().catch(() => {});
  addMessage('user', prompt);
  const pending = document.createElement('div');
  pending.className = 'msg bot';
  pending.innerHTML = '<span class="typing"><i></i><i></i><i></i></span> composing…';
  els.messages.appendChild(pending);
  scrollDown();
  const t0 = performance.now();
  try {
    const res = await fetch('/api/compose', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, sessionId, previousId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    pending.remove();
    pieceCache.set(data.id, data.composition);
    const ms = Math.round(performance.now() - t0);
    addMessage('bot', `${data.reply}\nComposed in ${ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`} (engine ${data.composition.analysis.generationMs} ms).`, { pieceId: data.id });
    current = { id: data.id, composition: data.composition };
    renderRemixChips();
    await showPiece(data.composition, true);
  } catch (err) {
    pending.remove();
    addMessage('bot', `Couldn't compose that: ${err.message}. Try again or rephrase.`, { error: true });
  } finally {
    busy = false;
    els.send.disabled = false;
    els.prompt.focus();
  }
}

els.form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
els.prompt.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
});

async function fetchPiece(id) {
  if (pieceCache.has(id)) return pieceCache.get(id);
  const res = await fetch(`/api/pieces/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  pieceCache.set(id, data.composition);
  return data.composition;
}

async function loadPiece(id, autoplay) {
  if (autoplay) synth.resume().catch(() => {});
  const comp = await fetchPiece(id);
  if (!comp) { if (autoplay) addMessage('bot', 'That piece is no longer on the server (it may have restarted).', { error: true }); return; }
  current = { id, composition: comp };
  await showPiece(comp, autoplay);
}

// ---------------------------------------------------------------------------- stage
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const NAMES_S = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const NAMES_F = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

function keyName(comp) {
  if (!transpose) return comp.meta.key;
  const flats = [5, 10, 3, 8, 1, 6].includes(((comp.meta.tonic + transpose) % 12 + 12 + (comp.meta.mode === 'minor' ? 3 : 0)) % 12);
  const n = (flats ? NAMES_F : NAMES_S)[((comp.meta.tonic + transpose) % 12 + 12) % 12];
  return `${n} ${comp.meta.key.split(' ').slice(1).join(' ')}`;
}

function transposeSymbol(sym) {
  if (!transpose) return sym;
  return sym.replace(/^([A-G])([♯♭]?)/, (m, l, a) => {
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[l] + (a === '♯' ? 1 : a === '♭' ? -1 : 0);
    const pc = ((base + transpose) % 12 + 12) % 12;
    return (a === '♭' || current?.composition?.meta.flats ? NAMES_F : NAMES_S)[pc];
  });
}

function renderMeta(comp) {
  const m = comp.meta;
  els.title.textContent = comp.title;
  const bpm = Math.round(m.tempo * player.rate);
  els.chips.innerHTML = [
    ['', m.styleLabel], ['Key ', keyName(comp)], ['', `${bpm} bpm`], ['', m.timeSignature.join('/')],
    ['', fmt(m.duration / player.rate)], ['Mood ', m.mood], ['Complexity ', Math.round(m.complexity * 100) + '%'],
  ].map(([k, v]) => `<span>${k}<b>${esc(String(v))}</b></span>`).join('');
}

async function showPiece(comp, autoplay) {
  player.load(comp);
  roll.transpose = transpose;
  roll.load(comp, player.events);
  overview.load(comp, player.duration);
  renderMeta(comp);
  [els.play, els.stop, els.midi, els.wav].forEach((b) => { b.disabled = false; });
  if (autoplay) {
    if (!synth.samples.length) els.synthStatus.textContent = 'Finishing piano samples…';
    await synth.ready;
    await synth.resume().catch(() => {});
    els.synthStatus.textContent = `${synth.kind === 'sampled' ? 'Grand piano (Salamander samples)' : 'Synthesized piano'} ready · Space = play/pause · click the roll to seek`;
    player.play(0);
  }
}

player.on((state) => {
  els.play.classList.toggle('playing', state === 'playing');
  els.play.setAttribute('aria-label', state === 'playing' ? 'Pause' : 'Play');
  if (state !== 'playing') keyboard.clear();
});

els.play.addEventListener('click', async () => {
  if (player.state === 'playing') player.pause();
  else { await synth.resume(); await synth.ready; player.play(); }
});
els.stop.addEventListener('click', () => player.stop());
els.tempo.addEventListener('input', () => {
  const r = els.tempo.value / 100;
  els.tempoVal.textContent = `${els.tempo.value}%`;
  player.setRate(r);
  if (current?.composition) { renderMeta(current.composition); overview.total = player.duration; }
});
els.volume.addEventListener('input', () => player.setVolume((els.volume.value / 100) ** 1.3));
function setTranspose(n) {
  transpose = Math.max(-12, Math.min(12, n));
  els.trVal.textContent = transpose > 0 ? `+${transpose}` : String(transpose);
  player.setTranspose(transpose);
  roll.transpose = transpose;
  if (current?.composition) renderMeta(current.composition);
}
els.trDown.addEventListener('click', () => setTranspose(transpose - 1));
els.trUp.addEventListener('click', () => setTranspose(transpose + 1));
els.midi.addEventListener('click', () => current?.composition && exportMidi(current.composition, { transpose, rate: player.rate }));
els.wav.addEventListener('click', async () => {
  if (!current?.composition) return;
  const label = els.wav.textContent;
  els.wav.disabled = true; els.wav.textContent = 'Rendering…';
  try { await exportWav(current.composition, synth, { transpose, rate: player.rate, volume: player.volume }); }
  catch (e) { addMessage('bot', `WAV export failed: ${e.message}`, { error: true, persist: false }); }
  finally { els.wav.disabled = false; els.wav.textContent = label; }
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !['TEXTAREA', 'INPUT', 'BUTTON'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    els.play.click();
  }
});

// History dialog.
els.historyBtn.addEventListener('click', async () => {
  els.historyList.innerHTML = '<li class="empty">Loading…</li>';
  els.historyDlg.showModal();
  try {
    const list = await (await fetch(`/api/history?sessionId=${encodeURIComponent(sessionId)}`)).json();
    if (!list.length) { els.historyList.innerHTML = '<li class="empty">No pieces yet in this session.</li>'; return; }
    els.historyList.innerHTML = list.map((p) => `<li><div class="h-main"><div class="h-title">${esc(p.title)}</div>
      <div class="h-sub">${esc(p.style)} · ${esc(p.key)} · ${p.tempo} bpm · ${fmt(p.duration)} — “${esc(p.prompt)}”</div></div>
      <button class="small" data-id="${p.id}">▶ Play</button></li>`).join('');
  } catch { els.historyList.innerHTML = '<li class="empty">Could not load history.</li>'; }
});
els.historyList.addEventListener('click', (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  els.historyDlg.close();
  loadPiece(id, true);
});

// ---------------------------------------------------------------------------- render loop
function frame() {
  const pos = player.position;
  let active = [];
  if (player.comp) {
    active = player.state === 'playing' ? player.activeAt(pos) : [];
    keyboard.update(active.map((e) => ({ pitch: e.pitch + transpose, layer: e.layer, velocity: e.velocity })));
    roll.draw(pos, active);
    overview.update(pos);
    els.time.textContent = `${fmt(pos / player.rate)} / ${fmt(player.duration / player.rate)}`;
    const comp = player.comp;
    const sec = comp.sections.find((s) => pos >= s.startTime && pos < s.endTime) || comp.sections[comp.sections.length - 1];
    els.liveSection.textContent = sec ? `${sec.name}${sec.key !== comp.meta.key ? ` · ${sec.key}` : ''}` : '—';
    const ch = comp.chords.find((c) => pos >= c.time && pos < c.time + c.dur);
    els.liveChord.textContent = ch ? `${transposeSymbol(ch.symbol)}${ch.roman && !ch.roman.includes(ch.symbol) ? `  (${ch.roman})` : ''}` : '—';
  } else {
    roll.draw(0, []);
  }
  requestAnimationFrame(frame);
}

restoreLog();
requestAnimationFrame(frame);
