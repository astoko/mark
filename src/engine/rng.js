// Seeded PRNG (mulberry32) with helpers for weighted musical choices.
// Every compositional decision flows through here so a seed fully reproduces a piece.

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function randomSeed() {
  return (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
}

export function createRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const rng = {
    seed: seed >>> 0,
    next,
    float: (a = 0, b = 1) => a + (b - a) * next(),
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    // Gaussian via Box-Muller.
    gauss: (mean = 0, sd = 1) => {
      const u = Math.max(next(), 1e-9);
      const v = next();
      return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    // weighted(items, weights) or weighted({key: weight})
    weighted: (items, weights) => {
      if (!Array.isArray(items)) {
        const keys = Object.keys(items);
        return rng.weighted(keys, keys.map((k) => items[k]));
      }
      let total = 0;
      for (const w of weights) total += Math.max(0, w || 0);
      if (total <= 0) return items[Math.floor(next() * items.length)];
      let r = next() * total;
      for (let i = 0; i < items.length; i++) {
        r -= Math.max(0, weights[i] || 0);
        if (r <= 0) return items[i];
      }
      return items[items.length - 1];
    },
    shuffle: (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    fork: (label) => createRng(hashString(`${seed >>> 0}:${label}`)),
  };
  return rng;
}
