// 88-key keyboard that lights up per sounding note, colour-coded by layer.

const BLACK = new Set([1, 3, 6, 8, 10]);
const PRIORITY = { melody: 3, bass: 2, harmony: 1 };

export class Keyboard {
  constructor(el) {
    this.el = el;
    this.keys = new Map();
    this.active = new Map();
    this.build();
  }

  build() {
    this.el.innerHTML = '';
    const whites = [];
    for (let m = 21; m <= 108; m++) if (!BLACK.has(m % 12)) whites.push(m);
    const whiteW = 100 / whites.length;
    let wi = 0;
    for (let m = 21; m <= 108; m++) {
      const k = document.createElement('div');
      const black = BLACK.has(m % 12);
      k.className = black ? 'key black' : 'key white';
      k.dataset.midi = m;
      if (black) {
        k.style.left = `${wi * whiteW - whiteW * 0.3}%`;
        k.style.width = `${whiteW * 0.6}%`;
      } else {
        k.style.left = `${wi * whiteW}%`;
        k.style.width = `${whiteW}%`;
        if (m % 12 === 0) {
          const label = document.createElement('span');
          label.className = 'key-label';
          label.textContent = `C${Math.floor(m / 12) - 1}`;
          k.appendChild(label);
        }
        wi++;
      }
      this.el.appendChild(k);
      this.keys.set(m, k);
    }
  }

  // notes: [{pitch, layer, velocity}] (already transposed)
  update(notes) {
    const next = new Map();
    for (const n of notes) {
      const cur = next.get(n.pitch);
      if (!cur || PRIORITY[n.layer] > PRIORITY[cur.layer]) next.set(n.pitch, n);
    }
    for (const [p, n] of this.active) {
      if (!next.has(p) || next.get(p).layer !== n.layer) {
        const k = this.keys.get(p);
        if (k) { k.classList.remove('on', `on-${n.layer}`); k.style.removeProperty('--vel'); }
      }
    }
    for (const [p, n] of next) {
      const k = this.keys.get(p);
      if (!k) continue;
      k.classList.add('on', `on-${n.layer}`);
      k.style.setProperty('--vel', (0.45 + (n.velocity / 127) * 0.55).toFixed(2));
    }
    this.active = next;
  }

  clear() { this.update([]); }
}
