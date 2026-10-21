// Laufzeit des Spezifikations-Checks bei großen Leistungsverzeichnissen: node tools/test/perf-spec.mjs [n]
import fs from 'node:fs';
import { parseSpec, setProductCodes } from '../../src/lib/spec.js';
import { bestConfigured } from '../../src/lib/match.js';
const idx = JSON.parse(fs.readFileSync(new URL('../../dist/data/index.json', import.meta.url))).products;
const cfg = JSON.parse(fs.readFileSync(new URL('../../dist/data/cfg-de.json', import.meta.url)));
setProductCodes(idx);
const N = Number(process.argv[2] || 80);
const ipr = [50, 75, 100, 150, 200, 300, 400, 600, 800, 1000, 1250, 1500, 2000];
const cls = ['0,5 FS5 10 VA', '0,2S FS5 5 VA', '0,5 FS10 15 VA', '1 FS5 5 VA'];
const lines = ['Allgemein: Innenraum, 20-kV-Netz, 50 Hz, IEC 61869.'];
for (let i = 0; i < N; i++) {
  const vt = i % 7 === 6;
  lines.push(vt ? `${i + 1}.10 Spannungswandler einpolig 20000/√3 / 100/√3 / 100/3 V, 0,5 ${[15, 30, 50][i % 3]} VA, Spannungsfaktor 1,9 Un 8 h. Menge: ${1 + (i % 5)} Stück`
    : `${i + 1}.10 Stromwandler ${ipr[i % ipr.length]}/${i % 2 ? 1 : 5}${i % 3 ? '' : '/' + (i % 2 ? 1 : 5)} A, Kern 1: Kl. ${cls[i % cls.length]}${i % 3 ? '' : ', Kern 2: 5P20 10 VA'}, Ith ${[16, 20, 25][i % 3]} kA / 1 s. Menge: ${1 + (i % 9)} Stück`);
}
const text = lines.join('\n');
let t0 = performance.now();
const spec = parseSpec(text);
const tParse = performance.now() - t0;
t0 = performance.now();
const cache = new Map();
let configured = 0, complete = 0;
for (const pos of spec.positions) {
  const k = JSON.stringify(pos.req);
  let r = cache.get(k);
  if (!r) { r = bestConfigured(pos.req, idx, cfg, { limit: 4, pool: 8 }); cache.set(k, r); }
  if (r.best[0]?.ac) configured++;
  if (r.best[0]?.ac?.complete) complete++;
}
const tMatch = performance.now() - t0;
console.log(`${spec.positions.length} Positionen (${text.length} Zeichen): Parsen ${tParse.toFixed(0)} ms, Abgleich+Konfiguration ${tMatch.toFixed(0)} ms (${(tMatch / spec.positions.length).toFixed(1)} ms/Position, ${cache.size} verschiedene), konfiguriert ${configured}, vollständig ${complete}`);
