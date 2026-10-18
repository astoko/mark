// Exports: MIDI (shared writer) and WAV (offline render through the same piano + reverb).

import { compositionToMidi } from '/shared/midi.js';
import { buildEvents } from './player.js';

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

const fileName = (comp, ext) => `${(comp.title || 'piece').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'piece'}.${ext}`;

export function exportMidi(comp, { transpose = 0, rate = 1 } = {}) {
  const bytes = compositionToMidi(comp, { transpose, tempoScale: rate });
  download(new Blob([bytes], { type: 'audio/midi' }), fileName(comp, 'mid'));
}

function encodeWav(buffer) {
  const ch = buffer.numberOfChannels;
  const len = buffer.length;
  const data = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) data.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); data.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true);
  data.setUint32(24, buffer.sampleRate, true); data.setUint32(28, buffer.sampleRate * ch * 2, true);
  data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); w(36, 'data'); data.setUint32(40, len * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, i) => buffer.getChannelData(i));
  let o = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, chans[c][i]));
      data.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([data], { type: 'audio/wav' });
}

export async function exportWav(comp, synth, { transpose = 0, rate = 1, volume = 0.8 } = {}) {
  await synth.ready;
  const events = buildEvents(comp);
  const total = Math.max(...events.map((e) => e.sustainEnd)) / rate + 3;
  const sr = 44100;
  const octx = new OfflineAudioContext(2, Math.ceil(total * sr), sr);
  const chain = synth.buildChain(octx, octx.destination, { volume });
  synth.setReverb(chain, synth.reverbMix);
  for (const e of events) {
    const pitch = e.pitch + transpose;
    if (pitch < 21 || pitch > 108) continue;
    synth.playNote(chain, {
      pitch, velocity: e.velocity, when: 0.05 + e.time / rate, keyUp: 0.05 + e.keyUp / rate, sustainEnd: 0.05 + e.sustainEnd / rate,
    });
  }
  const buf = await octx.startRendering();
  download(encodeWav(buf), fileName(comp, 'wav'));
}
