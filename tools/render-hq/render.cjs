// High-quality offline renderer for hand-composed examples.
//   node tools/render-hq/fetch-samples.cjs            (once: ~260 MB of Salamander FLACs)
//   node tools/render-hq/render.cjs <composition.json> <out.wav>
// Uses the full Salamander Grand Piano V3 (6 of its 16 velocity layers, every minor third),
// cross-fading between the two nearest layers so timbre follows touch, real damper release
// (none above F6, like a real piano), and a stereo hall reverb. Rendering happens in headless
// Chromium (OfflineAudioContext decodes FLAC natively). Requires Playwright + Chromium.

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const { chromium } = require(`${execSync('npm root -g').toString().trim()}/playwright`);

const SAMPLES = process.env.SALAMANDER_DIR || path.join(require('os').tmpdir(), 'salamander16');
const LAYERS = [2, 5, 8, 11, 14, 16];
const [, , compPath, outPath] = process.argv;
if (!compPath || !outPath) { console.error('usage: render.cjs <composition.json> <out.wav>'); process.exit(1); }

const page = `<!doctype html><meta charset="utf-8"><script>
const NAMES = ['C','D#','F#','A'];
function sampleName(midi) { const o = Math.floor(midi / 12) - 1; return NAMES[[0,3,6,9].indexOf(midi % 12)] + o; }
function nearest(p) { let best = 21; for (let m = 21; m <= 108; m += 3) if (Math.abs(m - p) < Math.abs(best - p)) best = m; return best; }
function hallIR(ctx, seconds = 2.6) {
  const sr = ctx.sampleRate, n = Math.floor(sr * seconds), ir = ctx.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch); let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      const a = 1 - Math.min(0.97, 0.25 + t * 0.35);          // tail darkens with time
      lp = lp * (1 - a) + (Math.random() * 2 - 1) * a;
      d[i] = lp * Math.exp(-t * 6.9 / seconds) * (t < 0.012 ? t / 0.012 : 1);
    }
    for (const [ms, g] of [[11, 0.5], [19, 0.35], [27, 0.3], [41, 0.22], [53, 0.16]]) d[Math.floor((ms + ch * 3) * sr / 1000)] += g;
  }
  return ir;
}
window.render = async function (comp) {
  const events = [];
  const pedal = comp.pedal || [];
  const pedalAt = (t) => pedal.find((p) => t >= p.time - 1e-3 && t < p.endTime);
  for (const layer of ['bass', 'harmony', 'melody']) for (const n of comp.layers[layer] || []) {
    const keyUp = n.time + n.dur; const p = pedalAt(keyUp);
    events.push({ ...n, keyUp, sustainEnd: p ? Math.min(Math.max(keyUp, p.endTime), n.time + 16) : keyUp });
  }
  const len = Math.max(...events.map((e) => e.sustainEnd)) + 4;
  const sr = 44100;
  const ctx = new OfflineAudioContext(2, Math.ceil(len * sr), sr);
  // which samples are needed
  const layerPos = (v) => Math.max(0, Math.min(LAYERS.length - 1, (v / 127 * 16 - 2) / 14 * (LAYERS.length - 1)));
  const need = new Set();
  for (const e of events) { const s = nearest(e.pitch); const lp = layerPos(e.velocity); need.add(s + ':' + Math.floor(lp)); need.add(s + ':' + Math.ceil(lp)); }
  const buffers = {};
  await Promise.all([...need].map(async (k) => {
    const [m, li] = k.split(':').map(Number);
    const res = await fetch('/samples/' + encodeURIComponent(sampleName(m) + 'v' + LAYERS[li] + '.flac'));
    const full = await ctx.decodeAudioData(await res.arrayBuffer());
    const keep = Math.min(full.length, Math.floor(sr * (m < 60 ? 16 : m < 84 ? 11 : 7)));
    const b = ctx.createBuffer(2, keep, sr);
    for (let ch = 0; ch < 2; ch++) { const src = full.getChannelData(Math.min(ch, full.numberOfChannels - 1)); const dst = b.getChannelData(ch); dst.set(src.subarray(0, keep)); for (let i = 0; i < 2000; i++) dst[keep - 1 - i] *= i / 2000; }
    buffers[k] = b;
  }));
  const dry = ctx.createGain(); dry.gain.value = 0.82;
  const wet = ctx.createGain(); wet.gain.value = 0.30;
  const conv = ctx.createConvolver(); conv.buffer = hallIR(ctx);
  const pre = ctx.createDelay(); pre.delayTime.value = 0.018;
  const bus = ctx.createGain();
  const comp2 = ctx.createDynamicsCompressor(); comp2.threshold.value = -10; comp2.knee.value = 10; comp2.ratio.value = 2; comp2.attack.value = 0.02; comp2.release.value = 0.3;
  bus.connect(dry).connect(comp2); bus.connect(pre).connect(conv).connect(wet).connect(comp2); comp2.connect(ctx.destination);
  for (const e of events) {
    const s = nearest(e.pitch); const lp = layerPos(e.velocity); const lo = Math.floor(lp), hi = Math.ceil(lp), x = lp - lo;
    const when = 0.3 + e.time; const end = 0.3 + Math.max(e.sustainEnd, e.time + 0.05);
    const damp = e.pitch > 88 ? null : 0.07 + ((108 - e.pitch) / 87) * 0.22;
    const within = 0.55 + 0.45 * Math.min(1, e.velocity / 127 * 1.1); // finer loudness inside a layer
    for (const [li, w] of [[lo, Math.cos(x * Math.PI / 2)], [hi, Math.sin(x * Math.PI / 2)]]) {
      if (w < 0.02 || (li === hi && li === lo && w !== Math.cos(x * Math.PI / 2))) continue;
      const src = ctx.createBufferSource(); src.buffer = buffers[s + ':' + li]; src.playbackRate.value = 2 ** ((e.pitch - s) / 12);
      const g = ctx.createGain(); g.gain.setValueAtTime(w * within * 0.55, when);
      if (damp) g.gain.setTargetAtTime(0, end, damp);
      const pan = ctx.createStereoPanner(); pan.pan.value = Math.max(-0.35, Math.min(0.35, (e.pitch - 64) / 64 * 0.35));
      src.connect(g).connect(pan).connect(bus); src.start(when);
      src.stop(Math.min(when + src.buffer.duration / src.playbackRate.value, damp ? end + damp * 8 : Infinity));
      if (lo === hi) break;
    }
  }
  const out = await ctx.startRendering();
  const L = out.getChannelData(0), R = out.getChannelData(1);
  let peak = 0; for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const norm = 0.89 / peak; // −1 dBFS
  const pcm = new Int16Array(L.length * 2);
  for (let i = 0; i < L.length; i++) { pcm[2 * i] = Math.round(Math.max(-1, Math.min(1, L[i] * norm)) * 32767); pcm[2 * i + 1] = Math.round(Math.max(-1, Math.min(1, R[i] * norm)) * 32767); }
  const u8 = new Uint8Array(pcm.buffer); let bin = ''; for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return { b64: btoa(bin), sr, frames: L.length, samples: Object.keys(buffers).length, gainDb: 20 * Math.log10(norm) };
};
const LAYERS = ${JSON.stringify(LAYERS)};
</script>`;

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url);
  if (u === '/' ) { res.setHeader('content-type', 'text/html'); return res.end(page); }
  if (u.startsWith('/samples/')) {
    const f = path.join(SAMPLES, path.basename(u));
    if (fs.existsSync(f)) { res.setHeader('content-type', 'audio/flac'); return fs.createReadStream(f).pipe(res); }
  }
  res.statusCode = 404; res.end();
}).listen(0, async () => {
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--js-flags=--max-old-space-size=6000'] });
  const p = await browser.newPage();
  p.on('pageerror', (e) => console.error('[page]', e.message));
  await p.goto(`http://localhost:${port}/`);
  const comp = JSON.parse(fs.readFileSync(compPath, 'utf8'));
  const r = await p.evaluate((c) => window.render(c), comp);
  const pcm = Buffer.from(r.b64, 'base64');
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(r.sr, 24); h.writeUInt32LE(r.sr * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(outPath, Buffer.concat([h, pcm]));
  console.log(`${outPath}: ${(r.frames / r.sr).toFixed(1)} s, ${r.samples} sample buffers, normalised ${r.gainDb.toFixed(1)} dB`);
  await browser.close(); server.close();
});
