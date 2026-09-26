// Piano synthesis.
// At start-up, a set of multisamples (every minor third, A0–C8) is rendered with an
// OfflineAudioContext from a physically-inspired additive model: inharmonic partials
// (string stiffness), per-partial two-stage decay, detuned unison strings (beating),
// hammer-position spectral comb, hammer noise and soundboard knock. Playback then works
// like a sampled piano: pitch-shift the nearest sample, shape brightness by velocity,
// apply damper release (none above the damper range), stereo placement and a
// synthetic hall reverb.

const SAMPLE_STEP = 3;
const LOWEST = 21;
const HIGHEST = 108;
const SR = 44100;

function sampleLengthFor(m) {
  if (m < 48) return 9;
  if (m < 75) return 6.5;
  return 4;
}

function makeNoise(ctx, seconds) {
  const buf = ctx.createBuffer(1, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function renderNoteInto(octx, dest, midi, length, noise) {
  const f0 = 440 * 2 ** ((midi - 69) / 12);
  const pos = (midi - LOWEST) / (HIGHEST - LOWEST); // 0 bass … 1 treble
  const B = Math.min(0.004, 0.00006 * 2 ** ((midi - 21) / 14)); // inharmonicity
  const tau1 = 7.5 * 2 ** (-(midi - 21) / 21); // fundamental decay (s)
  const strings = midi < 32 ? 1 : midi < 46 ? 2 : 3;
  const detunes = [0, 0.8 + pos * 0.8, -(0.6 + pos * 0.7)];
  const maxPartials = midi < 40 ? 30 : midi < 60 ? 20 : midi < 80 ? 12 : 7;
  const rolloff = 0.85 + pos * 1.0;
  const hammer = 1 / 7.3;
  const attack = 0.002 + (1 - pos) * 0.003;

  const bus = octx.createGain();
  bus.connect(dest);
  // Fade the very end of the sample to avoid clicks when it runs out.
  bus.gain.setValueAtTime(1, 0);
  bus.gain.setValueAtTime(1, length - 0.35);
  bus.gain.linearRampToValueAtTime(0, length - 0.02);

  for (let n = 1; n <= maxPartials; n++) {
    const fn = n * f0 * Math.sqrt(1 + B * n * n);
    if (fn > 15500) break;
    let amp = (Math.abs(Math.sin(Math.PI * n * hammer)) + 0.08) / n ** rolloff;
    if (midi < 40 && n === 1) amp *= 0.55; // weak bass fundamentals, strong 2nd/3rd partials
    const taun = tau1 / (1 + 0.32 * (n - 1) * (0.6 + pos));
    const ns = n <= 6 ? strings : 1;
    for (let s = 0; s < ns; s++) {
      const osc = octx.createOscillator();
      osc.frequency.value = fn * 2 ** ((detunes[s] * (1 + 0.08 * n)) / 1200);
      osc.phase = Math.random();
      const g = octx.createGain();
      const a = amp / ns;
      g.gain.setValueAtTime(0, 0);
      g.gain.linearRampToValueAtTime(a, attack);
      // Two-stage decay: fast "prompt sound" then slow "aftersound".
      g.gain.setTargetAtTime(a * 0.32, attack, Math.max(0.02, taun * 0.16));
      g.gain.setTargetAtTime(0, attack + taun * 0.45, taun);
      osc.connect(g).connect(bus);
      osc.start(0);
      osc.stop(length);
    }
  }
  // Hammer strike noise.
  const hn = octx.createBufferSource();
  hn.buffer = noise;
  const bp = octx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = Math.min(4200, f0 * 3.5 + 400);
  bp.Q.value = 0.9;
  const hg = octx.createGain();
  hg.gain.setValueAtTime(0, 0);
  hg.gain.linearRampToValueAtTime(0.06 + pos * 0.05, 0.0012);
  hg.gain.setTargetAtTime(0, 0.002, 0.008 + (1 - pos) * 0.01);
  hn.connect(bp).connect(hg).connect(bus);
  hn.start(0);
  hn.stop(0.2);
  // Soundboard knock (low thump).
  const kn = octx.createBufferSource();
  kn.buffer = noise;
  const lp = octx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 180;
  const kg = octx.createGain();
  kg.gain.setValueAtTime(0, 0);
  kg.gain.linearRampToValueAtTime(0.18, 0.002);
  kg.gain.setTargetAtTime(0, 0.004, 0.025);
  kn.connect(lp).connect(kg).connect(bus);
  kn.start(0);
  kn.stop(0.3);
}

async function renderGroup(midis, length) {
  const octx = new OfflineAudioContext(midis.length, Math.ceil(length * SR), SR);
  const merger = octx.createChannelMerger(midis.length);
  merger.connect(octx.destination);
  const noise = makeNoise(octx, 0.3);
  midis.forEach((m, i) => {
    const g = octx.createGain();
    g.connect(merger, 0, i);
    renderNoteInto(octx, g, m, length, noise);
  });
  const rendered = await octx.startRendering();
  return midis.map((m, i) => {
    const data = rendered.getChannelData(i);
    let peak = 0;
    for (let k = 0; k < data.length; k++) peak = Math.max(peak, Math.abs(data[k]));
    const target = 0.85 * (1.08 - (m - LOWEST) / (HIGHEST - LOWEST) * 0.35);
    const buf = new AudioBuffer({ length: data.length, sampleRate: SR, numberOfChannels: 1 });
    const out = buf.getChannelData(0);
    const k = peak > 0 ? target / peak : 1;
    for (let j = 0; j < data.length; j++) out[j] = data[j] * k;
    return { midi: m, buffer: buf };
  });
}

function makeImpulse(ctx, seconds = 2.6, decay = 2.8) {
  const len = Math.ceil(seconds * ctx.sampleRate);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate;
      const env = (1 - t / seconds) ** decay;
      const early = t < 0.08 && Math.random() < 0.004 ? (Math.random() * 2 - 1) * 0.8 : 0;
      const n = (Math.random() * 2 - 1) * env + early;
      // Air absorption: darker tail over time.
      const a = 0.35 + 0.6 * Math.min(1, t / seconds);
      lp = lp * a + n * (1 - a);
      d[i] = t < 0.012 ? 0 : lp;
    }
  }
  return buf;
}

export class PianoSynth {
  constructor() {
    this.ctx = null;
    this.samples = [];
    this.ready = null;
    this.impulse = null;
    this.reverbMix = 0.2;
  }

  ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.output = this.buildChain(this.ctx, this.ctx.destination);
    }
    return this.ctx;
  }

  async resume() {
    this.ensureContext();
    if (this.ctx.state !== 'running') await this.ctx.resume();
  }

  init(onProgress) {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      const points = [];
      for (let m = LOWEST; m <= HIGHEST; m += SAMPLE_STEP) points.push(m);
      if (points[points.length - 1] !== HIGHEST) points.push(HIGHEST);
      const groups = [
        points.filter((m) => m < 48),
        points.filter((m) => m >= 48 && m < 75),
        points.filter((m) => m >= 75),
      ];
      let done = 0;
      const results = await Promise.all(groups.map(async (g) => {
        const r = await renderGroup(g, sampleLengthFor(g[0]));
        done += g.length;
        onProgress?.(done / points.length);
        return r;
      }));
      this.samples = results.flat().sort((a, b) => a.midi - b.midi);
      return true;
    })();
    return this.ready;
  }

  buildChain(ctx, destination, { volume = 0.8 } = {}) {
    if (!this.impulse || this.impulse.sampleRate !== ctx.sampleRate) this.impulse = makeImpulse(ctx);
    const input = ctx.createGain();
    const body = ctx.createBiquadFilter(); // soundboard/body warmth
    body.type = 'peaking'; body.frequency.value = 220; body.Q.value = 0.8; body.gain.value = 2.5;
    const air = ctx.createBiquadFilter();
    air.type = 'highshelf'; air.frequency.value = 7000; air.gain.value = -3;
    const dry = ctx.createGain();
    const wet = ctx.createGain();
    const conv = ctx.createConvolver();
    conv.buffer = this.impulse;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.01; comp.release.value = 0.25;
    const master = ctx.createGain();
    master.gain.value = volume;
    input.connect(body).connect(air);
    air.connect(dry).connect(comp);
    air.connect(conv).connect(wet).connect(comp);
    comp.connect(master).connect(destination);
    const chain = { input, dry, wet, master, ctx };
    this.setReverb(chain, this.reverbMix);
    return chain;
  }

  setReverb(chain, mix) {
    chain.dry.gain.value = 1 - mix * 0.5;
    chain.wet.gain.value = mix;
  }

  sampleFor(pitch) {
    let best = this.samples[0];
    for (const s of this.samples) if (Math.abs(s.midi - pitch) < Math.abs(best.midi - pitch)) best = s;
    return best;
  }

  // Schedule one note. `sustainEnd` is when the damper actually falls (pedal-aware).
  playNote(chain, { pitch, velocity, when, keyUp, sustainEnd }) {
    const ctx = chain.ctx;
    const s = this.sampleFor(pitch);
    if (!s) return null;
    const rate = 2 ** ((pitch - s.midi) / 12);
    const v = Math.max(0.05, Math.min(1, velocity / 127));
    const f0 = 440 * 2 ** ((pitch - 69) / 12);

    const src = ctx.createBufferSource();
    src.buffer = s.buffer;
    src.playbackRate.value = rate;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    const bright = Math.min(18000, f0 * (1.6 + 26 * v ** 1.8) + 350);
    tone.frequency.setValueAtTime(bright, when);
    // Spectrum darkens as the note decays.
    tone.frequency.setTargetAtTime(Math.max(f0 * 2.2, bright * 0.45), when + 0.05, 1.2);
    tone.Q.value = 0.4;
    const g = ctx.createGain();
    const level = 0.1 + 0.9 * v ** 1.7;
    g.gain.setValueAtTime(level, when);
    const end = Math.max(sustainEnd ?? keyUp, when + 0.03);
    const hasDamper = pitch < 89;
    const damp = hasDamper ? 0.05 + ((108 - pitch) / 87) * 0.22 : 0.9;
    g.gain.setTargetAtTime(0, end, damp);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) pan.pan.value = Math.max(-0.6, Math.min(0.6, (pitch - 64) / 64 * 0.55));
    src.connect(tone).connect(g);
    if (pan) g.connect(pan).connect(chain.input); else g.connect(chain.input);
    const bufDur = s.buffer.duration / rate;
    const stopAt = Math.min(when + bufDur, end + damp * 7 + 0.05);
    src.start(when);
    src.stop(Math.max(when + 0.05, stopAt));
    return { src, gain: g, when, end: stopAt };
  }
}
