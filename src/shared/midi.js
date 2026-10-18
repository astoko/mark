// Standard MIDI File (format 1) writer. Pure ESM with no Node/Browser dependencies so the
// server and the web client share it. Layers become separate tracks/channels, rubato is
// preserved through tempo events, swing through performance beat positions.

const PPQ = 480;

function vlq(n) {
  const bytes = [n & 0x7f];
  n >>>= 7;
  while (n > 0) { bytes.unshift((n & 0x7f) | 0x80); n >>>= 7; }
  return bytes;
}

function textEvent(type, text) {
  const data = Array.from(new TextEncoder().encode(text));
  return [0xff, type, ...vlq(data.length), ...data];
}

function track(events) {
  // events: [{tick, data:[...], order}]
  events.sort((a, b) => a.tick - b.tick || (a.order ?? 1) - (b.order ?? 1));
  const bytes = [];
  let last = 0;
  for (const e of events) {
    bytes.push(...vlq(Math.max(0, e.tick - last)), ...e.data);
    last = Math.max(last, e.tick);
  }
  bytes.push(0x00, 0xff, 0x2f, 0x00);
  const len = bytes.length;
  return [0x4d, 0x54, 0x72, 0x6b, (len >>> 24) & 255, (len >>> 16) & 255, (len >>> 8) & 255, len & 255, ...bytes];
}

export function compositionToMidi(comp, { transpose = 0, tempoScale = 1 } = {}) {
  const tick = (q) => Math.max(0, Math.round(q * PPQ));
  const [num, den] = comp.meta.timeSignature;

  const t0 = [
    { tick: 0, data: textEvent(0x03, comp.title), order: 0 },
    { tick: 0, data: [0xff, 0x58, 0x04, num, Math.log2(den), 24, 8], order: 0 },
  ];
  const tempos = comp.tempoMap?.length ? comp.tempoMap : [{ q: 0, bpm: comp.meta.quarterTempo }];
  for (const t of tempos) {
    const us = Math.round(60000000 / (t.bpm * tempoScale));
    t0.push({ tick: tick(t.q), data: [0xff, 0x51, 0x03, (us >> 16) & 255, (us >> 8) & 255, us & 255], order: 0 });
  }
  const tracks = [track(t0)];

  const layerNames = ['melody', 'harmony', 'bass'];
  layerNames.forEach((name, ch) => {
    const ev = [
      { tick: 0, data: textEvent(0x03, `Piano – ${name}`), order: 0 },
      { tick: 0, data: [0xc0 | ch, 0], order: 0 },
    ];
    for (const n of comp.layers[name] || []) {
      const pitch = Math.max(0, Math.min(127, n.pitch + transpose));
      const s = n.perfStart ?? n.start;
      const d = n.perfBeats ?? n.beats;
      ev.push({ tick: tick(s), data: [0x90 | ch, pitch, Math.max(1, Math.min(127, n.velocity))], order: 2 });
      ev.push({ tick: tick(s + Math.max(0.05, d)), data: [0x80 | ch, pitch, 0], order: 1 });
    }
    for (const p of comp.pedal || []) {
      ev.push({ tick: tick(p.start), data: [0xb0 | ch, 64, 127], order: 3 });
      ev.push({ tick: tick(p.end), data: [0xb0 | ch, 64, 0], order: 0 });
    }
    tracks.push(track(ev));
  });

  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length, (PPQ >> 8) & 255, PPQ & 255];
  const total = header.length + tracks.reduce((a, t) => a + t.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  out.set(header, off); off += header.length;
  for (const t of tracks) { out.set(t, off); off += t.length; }
  return out;
}
