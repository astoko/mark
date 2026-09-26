// Scrolling piano-roll with playhead, bar lines, section markers, chord symbols and
// sustain-pedal lane; plus a whole-piece overview strip for navigation.

export const LAYER_COLORS = { melody: '#ffb547', harmony: '#43d1c1', bass: '#a78bfa' };

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export class PianoRoll {
  constructor(canvas, { onSeek } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.comp = null;
    this.events = [];
    this.window = 9; // seconds visible
    this.onSeek = onSeek;
    this.transpose = 0;
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
    canvas.addEventListener('click', (e) => {
      if (!this.comp || !this.onSeek) return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      this.onSeek(this.lastPos + (x - this.playheadX()) / this.pxPerSec());
    });
    canvas.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      this.window = Math.max(3, Math.min(40, this.window * (e.deltaY > 0 ? 1.12 : 0.89)));
    }, { passive: false });
    this.lastPos = 0;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(10, r.width);
    this.h = Math.max(10, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw(this.lastPos, []);
  }

  load(comp, events) {
    this.comp = comp;
    this.events = events;
    let lo = 108; let hi = 21;
    for (const e of events) { lo = Math.min(lo, e.pitch); hi = Math.max(hi, e.pitch); }
    this.lo = lo - 2; this.hi = hi + 2;
  }

  pxPerSec() { return this.w / this.window; }
  playheadX() { return Math.min(this.w * 0.22, 180); }

  draw(pos, active) {
    const c = this.ctx;
    const W = this.w; const H = this.h;
    this.lastPos = pos;
    c.fillStyle = cssVar('--roll-bg', '#0d1017');
    c.fillRect(0, 0, W, H);
    if (!this.comp) {
      c.fillStyle = cssVar('--muted', '#6b7280');
      c.font = '14px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText('Ask for a piece in the chat — it will appear and play here.', W / 2, H / 2);
      return;
    }
    const top = 34; const pedalH = 10; const bottom = H - pedalH - 6;
    const lo = this.lo + this.transpose; const hi = this.hi + this.transpose;
    const rowH = (bottom - top) / (hi - lo + 1);
    const pps = this.pxPerSec();
    const px = this.playheadX();
    const x = (t) => px + (t - pos) * pps;
    const y = (p) => bottom - (p - lo + 1) * rowH;
    const t0 = pos - px / pps; const t1 = pos + (W - px) / pps;

    // Black-key lanes.
    c.fillStyle = cssVar('--roll-lane', 'rgba(255,255,255,0.025)');
    for (let p = lo; p <= hi; p++) if ([1, 3, 6, 8, 10].includes(((p % 12) + 12) % 12)) c.fillRect(0, y(p), W, rowH);
    // Octave lines.
    c.strokeStyle = cssVar('--roll-grid', 'rgba(255,255,255,0.06)');
    c.lineWidth = 1;
    for (let p = lo; p <= hi; p++) if (((p % 12) + 12) % 12 === 0) { c.beginPath(); c.moveTo(0, y(p) + rowH); c.lineTo(W, y(p) + rowH); c.stroke(); }

    // Bar lines.
    const bars = this.comp.bars || [];
    c.strokeStyle = cssVar('--roll-bar', 'rgba(255,255,255,0.08)');
    bars.forEach((bt, i) => {
      if (bt < t0 - 1 || bt > t1 + 1) return;
      c.beginPath(); c.moveTo(x(bt), top); c.lineTo(x(bt), bottom); c.stroke();
      if (i % 4 === 0) { c.fillStyle = cssVar('--muted', '#6b7280'); c.font = '10px ui-monospace, monospace'; c.textAlign = 'left'; c.fillText(String(i + 1), x(bt) + 3, bottom - 3); }
    });
    // Sections.
    for (const s of this.comp.sections) {
      if (s.endTime < t0 || s.startTime > t1) continue;
      const sx = x(s.startTime);
      c.strokeStyle = cssVar('--roll-section', 'rgba(255,255,255,0.28)');
      c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(sx, 0); c.lineTo(sx, bottom); c.stroke();
      c.setLineDash([]);
      c.fillStyle = cssVar('--text', '#e5e7eb');
      c.font = '600 11px system-ui, sans-serif';
      c.textAlign = 'left';
      c.fillText(s.name.toUpperCase(), Math.max(sx + 5, 4), 12);
    }
    // Chord symbols.
    c.font = '12px ui-monospace, SFMono-Regular, monospace';
    for (const ch of this.comp.chords) {
      if (ch.time + ch.dur < t0 || ch.time > t1) continue;
      const cx = x(ch.time);
      const on = pos >= ch.time && pos < ch.time + ch.dur;
      c.fillStyle = on ? cssVar('--accent', '#ffb547') : cssVar('--muted', '#8b93a1');
      c.fillText(ch.symbol, cx + 3, 27);
    }
    // Notes.
    const activeSet = new Set(active);
    for (const e of this.events) {
      if (e.time > t1) break;
      if (e.time + e.dur < t0) continue;
      const nx = x(e.time);
      const nw = Math.max(2, e.dur * pps - 1);
      const ny = y(e.pitch + this.transpose);
      const on = activeSet.has(e);
      c.globalAlpha = on ? 1 : 0.35 + (e.velocity / 127) * 0.5;
      c.fillStyle = LAYER_COLORS[e.layer];
      if (on) { c.shadowColor = LAYER_COLORS[e.layer]; c.shadowBlur = 12; }
      const rh = Math.max(2, rowH - 1);
      roundRect(c, nx, ny, nw, rh, Math.min(3, rh / 2));
      c.fill();
      c.shadowBlur = 0;
    }
    c.globalAlpha = 1;
    // Pedal lane.
    c.fillStyle = cssVar('--roll-pedal', 'rgba(167,139,250,0.35)');
    for (const p of this.comp.pedal || []) {
      if (p.endTime < t0 || p.time > t1) continue;
      c.fillRect(x(p.time), H - pedalH - 2, Math.max(1, (p.endTime - p.time) * pps - 2), pedalH);
    }
    // Playhead.
    c.strokeStyle = cssVar('--accent', '#ffb547');
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(px, 0); c.lineTo(px, H); c.stroke();
    c.lineWidth = 1;
  }
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

export class Overview {
  constructor(el, { onSeek }) {
    this.el = el;
    this.onSeek = onSeek;
    this.comp = null;
    el.addEventListener('click', (e) => {
      if (!this.comp) return;
      const r = el.getBoundingClientRect();
      this.onSeek(((e.clientX - r.left) / r.width) * this.total);
    });
  }

  load(comp, total) {
    this.comp = comp;
    this.total = total;
    this.el.innerHTML = '';
    for (const s of comp.sections) {
      const d = document.createElement('div');
      d.className = `ov-sec ov-${s.type}`;
      d.style.left = `${(s.startTime / total) * 100}%`;
      d.style.width = `${((s.endTime - s.startTime) / total) * 100}%`;
      d.title = `${s.name} · ${s.key} · ${s.bars} bars`;
      d.innerHTML = `<span>${s.name}</span>`;
      this.el.appendChild(d);
    }
    this.progress = document.createElement('div');
    this.progress.className = 'ov-progress';
    this.el.appendChild(this.progress);
  }

  update(pos) {
    if (this.progress && this.total) this.progress.style.width = `${Math.min(100, (pos / this.total) * 100)}%`;
  }
}
