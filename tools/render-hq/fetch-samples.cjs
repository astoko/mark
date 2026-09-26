// Downloads the Salamander Grand Piano V3 samples used by render.cjs (CC-BY 3.0, Alexander Holm):
// 6 of 16 velocity layers, every minor third from A0 to C8 — 180 FLAC files, about 260 MB.
//   node tools/render-hq/fetch-samples.cjs [dir]
const fs = require('fs');
const path = require('path');
const dir = process.argv[2] || process.env.SALAMANDER_DIR || path.join(require('os').tmpdir(), 'salamander16');
const BASE = 'https://raw.githubusercontent.com/sfzinstruments/SalamanderGrandPiano/master/Samples/';
const names = [];
for (let m = 21; m <= 108; m += 3) {
  const n = ['C', 'D#', 'F#', 'A'][[0, 3, 6, 9].indexOf(m % 12)] + (Math.floor(m / 12) - 1);
  for (const v of [2, 5, 8, 11, 14, 16]) names.push(`${n}v${v}`);
}
fs.mkdirSync(dir, { recursive: true });
(async () => {
  const todo = names.filter((n) => !fs.existsSync(path.join(dir, `${n}.flac`)));
  for (let i = 0; i < todo.length; i += 8) {
    await Promise.all(todo.slice(i, i + 8).map(async (n) => {
      const r = await fetch(BASE + encodeURIComponent(`${n}.flac`));
      if (!r.ok) throw new Error(`${n}: HTTP ${r.status}`);
      fs.writeFileSync(path.join(dir, `${n}.flac`), Buffer.from(await r.arrayBuffer()));
    }));
    process.stdout.write(`\r${Math.min(i + 8, todo.length)}/${todo.length}`);
  }
  console.log(`\nsamples in ${dir}`);
})();
