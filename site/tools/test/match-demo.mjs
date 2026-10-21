// Vorführung: Spezifikation → Produkte → automatische Konfiguration (node tools/test/match-demo.mjs)
import fs from 'node:fs';
import { parseSpec, setProductCodes } from '../../src/lib/spec.js';
import { matchProducts, autoConfigure } from '../../src/lib/match.js';
const idx = JSON.parse(fs.readFileSync(new URL('../../dist/data/index.json', import.meta.url))).products;
const cfg = JSON.parse(fs.readFileSync(new URL('../../dist/data/cfg-de.json', import.meta.url)));
setProductCodes(idx);
const SPECS = process.argv[2] ? [process.argv[2]] : [
  'Pos. 1.1 Stromwandler für Innenraum, Stützerbauform nach DIN 42600-8, Um 24 kV, Isolationspegel 24/50/125 kV, Übersetzung 400/5/5 A, Kern 1: Kl. 0,5 FS5, 15 VA; Kern 2: 5P20, 10 VA, Ith = 25 kA/1 s, Idyn 62,5 kA, 50 Hz, IEC 61869-2. Menge: 3 Stück',
  'Niederspannungs-Aufsteckstromwandler 1500/5 A Kl. 0,5 10 VA für Schiene 60x10, eichfähig (MID), 12 Stk.',
  'Spannungswandler einpolig, Innenraum, 20000/√3 / 100/√3 / 100/3 V, 0,5/3P 30 VA, Spannungsfaktor 1,9 Un / 8 h, Um 24 kV, 50 Hz, 3 Stück',
  'Klappwandler zum Nachrüsten, 400/1 A, Klasse 1, 2,5 VA, Innendurchmesser 42 mm',
  'Kabelumbau-Stromwandler für Erdschlusserfassung 60/1 A, 5P10 2,5 VA, Innendurchmesser 120 mm',
  '3 pcs current transformer, indoor, 12 kV, ratio 600/1 A, class 0.2S FS5 10VA, 50Hz, IEC 61869-2',
  'Bahnstromwandler 16,7 Hz 300/1 A 5P10 15 VA',
  'Stromwandler 36 kV Freiluft 200-400/1/1 A, 0,2S FS5 10 VA, 5P20 15 VA, Ith 31,5 kA 1 s',
];
for (const text of SPECS) {
  const r = parseSpec(text);
  for (const pos of r.positions) {
    console.log('\n■', text.slice(0, 110));
    console.log('  Anforderung:', JSON.stringify(pos.req));
    const res = matchProducts(pos.req, idx, cfg, { limit: 3 });
    for (const m of res.best) {
      const ac = cfg[m.p.id] ? autoConfigure(pos.req, m.p, cfg[m.p.id]) : null;
      const bad = m.checks.filter((c) => c.v < 1).map((c) => `${c.k}${c.core ? c.core : ''}=${c.v}${c.note ? '(' + c.note + ')' : ''}`).join(' ');
      console.log(`  → ${m.p.code.padEnd(18)} ${(m.score * 100).toFixed(0).padStart(3)} %  ${bad}`);
      if (ac) console.log(`     Konfig: ${ac.complete ? 'vollständig' : 'offen: ' + ac.missing.join(', ')} | ${ac.lines.map(([k, v]) => k.replace(/ \(.*\)/, '') + '=' + v).join('; ').slice(0, 260)}${ac.notes.length ? ' | Hinweise: ' + ac.notes.map((n) => n.join(' ')).join('; ') : ''}`);
    }
    if (!res.best.length) console.log('  → kein passendes Produkt', res.fallback ? `(nächstes: ${res.fallback.p.code} ${(res.fallback.score * 100).toFixed(0)} %, ${res.fallback.checks.filter((c) => c.hard).map((c) => c.k).join(',')})` : '');
  }
}
