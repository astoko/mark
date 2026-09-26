// Transport + lookahead scheduler. Works in "composition seconds" advanced at a playback
// rate, so tempo changes, pause/seek and transposition apply live.

export function buildEvents(comp) {
  const pedal = comp.pedal || [];
  const pedalAt = (t) => pedal.find((p) => t >= p.time - 1e-3 && t < p.endTime);
  const events = [];
  for (const layer of ['bass', 'harmony', 'melody']) {
    for (const n of comp.layers[layer] || []) {
      const keyUp = n.time + n.dur;
      const p = pedalAt(keyUp);
      const sustainEnd = p ? Math.min(Math.max(keyUp, p.endTime), n.time + 14) : keyUp;
      events.push({ ...n, layer, keyUp, sustainEnd });
    }
  }
  events.sort((a, b) => a.time - b.time);
  return events;
}

export class Player {
  constructor(synth) {
    this.synth = synth;
    this.comp = null;
    this.events = [];
    this.rate = 1;
    this.transpose = 0;
    this.volume = 0.8;
    this.state = 'stopped';
    this.anchorPos = 0;
    this.anchorCtx = 0;
    this.pausedAt = 0;
    this.nextIdx = 0;
    this.voices = [];
    this.timer = null;
    this.listeners = new Set();
    this.maxDur = 1;
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const fn of this.listeners) fn(this.state); }

  get duration() {
    if (!this.comp) return 0;
    return Math.max(this.comp.meta.duration, ...this.events.slice(-40).map((e) => e.keyUp));
  }

  get position() {
    if (this.state !== 'playing') return this.pausedAt;
    const ctx = this.synth.ctx;
    return this.anchorPos + (ctx.currentTime - this.anchorCtx) * this.rate;
  }

  load(comp) {
    this.stop();
    this.comp = comp;
    this.events = buildEvents(comp);
    this.maxDur = Math.max(1, ...this.events.map((e) => e.dur));
    const reverb = { ambient: 0.34, romantic: 0.24, contemporary: 0.26, jazz: 0.14, baroque: 0.15, classical: 0.18, minimalist: 0.2 }[comp.meta.style] ?? 0.2;
    this.synth.reverbMix = reverb;
    if (this.synth.output) this.synth.setReverb(this.synth.output, reverb);
    this.emit();
  }

  indexAt(t) {
    let lo = 0; let hi = this.events.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (this.events[m].time < t) lo = m + 1; else hi = m; }
    return lo;
  }

  play(from = null) {
    if (!this.comp) return;
    const ctx = this.synth.ensureContext();
    if (from !== null) this.pausedAt = from;
    if (this.pausedAt >= this.duration - 0.05) this.pausedAt = 0;
    this.anchorPos = this.pausedAt;
    this.anchorCtx = ctx.currentTime + 0.06;
    this.nextIdx = this.indexAt(this.pausedAt);
    this.state = 'playing';
    this.synth.output.master.gain.setTargetAtTime(this.volume, ctx.currentTime, 0.02);
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), 25);
    this.tick();
    this.emit();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.pausedAt = this.position;
    this.state = 'paused';
    clearInterval(this.timer);
    this.silence();
    this.emit();
  }

  stop() {
    clearInterval(this.timer);
    this.silence();
    this.pausedAt = 0;
    this.state = 'stopped';
    this.emit();
  }

  seek(t) {
    const wasPlaying = this.state === 'playing';
    this.silence();
    this.pausedAt = Math.max(0, Math.min(t, this.duration));
    if (wasPlaying) this.play(); else this.emit();
  }

  setRate(r) {
    const pos = this.position;
    this.rate = r;
    if (this.state === 'playing') {
      this.anchorPos = pos;
      this.anchorCtx = this.synth.ctx.currentTime;
    }
  }

  setTranspose(n) { this.transpose = n; }

  setVolume(v) {
    this.volume = v;
    if (this.synth.output) this.synth.output.master.gain.setTargetAtTime(v, this.synth.ctx.currentTime, 0.03);
  }

  silence() {
    const ctx = this.synth.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const v of this.voices) {
      try {
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setTargetAtTime(0, now, 0.03);
        v.src.stop(now + 0.25);
      } catch { /* already stopped */ }
    }
    this.voices = [];
  }

  tick() {
    const ctx = this.synth.ctx;
    const pos = this.position;
    const horizon = pos + 0.2 * this.rate;
    const toCtx = (t) => this.anchorCtx + (t - this.anchorPos) / this.rate;
    while (this.nextIdx < this.events.length && this.events[this.nextIdx].time < horizon) {
      const e = this.events[this.nextIdx++];
      if (e.time < pos - 0.05) continue;
      const pitch = e.pitch + this.transpose;
      if (pitch < 21 || pitch > 108) continue;
      const v = this.synth.playNote(this.synth.output, {
        pitch, velocity: e.velocity,
        when: Math.max(ctx.currentTime, toCtx(e.time)),
        keyUp: toCtx(e.keyUp), sustainEnd: toCtx(e.sustainEnd),
      });
      if (v) this.voices.push(v);
    }
    if (this.voices.length > 256) this.voices = this.voices.filter((v) => v.end > ctx.currentTime);
    if (pos >= this.duration + 0.5) {
      clearInterval(this.timer);
      this.state = 'stopped';
      this.pausedAt = 0;
      this.voices = [];
      this.emit();
    }
  }

  // Notes whose keys are down at time t (for keyboard lighting / roll highlighting).
  activeAt(t) {
    const out = [];
    const end = this.indexAt(t + 1e-6);
    for (let i = end - 1; i >= 0; i--) {
      const e = this.events[i];
      if (e.time < t - this.maxDur) break;
      if (t >= e.time && t < e.keyUp) out.push(e);
    }
    return out;
  }
}
