// Übersetzungen prüfen: gleiche Schlüssel, gleiche Listenlängen, gleiche Platzhalter wie die Referenz.
// node tools/qa/i18n-check.mjs <datei> [referenz]   z. B. node tools/qa/i18n-check.mjs src/i18n/x/fr.js src/i18n/x/en.js
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [file, refFile = 'src/i18n/x/en.js'] = process.argv.slice(2);
const load = async (f) => (await import(pathToFileURL(path.resolve(f)) + '?t=' + Date.now())).default;
const [a, ref] = await Promise.all([load(file), load(refFile)]);
const ph = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const errs = [];
let strings = 0, same = 0;
function walk(x, r, p) {
  if (typeof r === 'string') {
    if (typeof x !== 'string') { errs.push(`${p}: Text erwartet`); return; }
    strings++;
    if (ph(x) !== ph(r)) errs.push(`${p}: Platzhalter ${ph(x) || '–'} statt ${ph(r) || '–'}`);
    if (x === r && /[a-z]{4,}/i.test(r) && r.length > 12) same++;
    return;
  }
  if (Array.isArray(r)) {
    if (!Array.isArray(x)) { errs.push(`${p}: Liste erwartet`); return; }
    if (x.length !== r.length) errs.push(`${p}: ${x.length} Einträge statt ${r.length}`);
    r.forEach((v, i) => walk(x[i], v, `${p}[${i}]`));
    return;
  }
  if (r && typeof r === 'object') {
    if (!x || typeof x !== 'object') { errs.push(`${p}: Objekt erwartet`); return; }
    for (const k of Object.keys(r)) if (!(k in x)) errs.push(`${p}.${k}: fehlt`); else walk(x[k], r[k], `${p}.${k}`);
    for (const k of Object.keys(x)) if (!(k in r)) errs.push(`${p}.${k}: zusätzlich`);
    return;
  }
  if (typeof x !== typeof r) errs.push(`${p}: Typ ${typeof x} statt ${typeof r}`);
}
walk(a, ref, 'x');
console.log(`${strings} Texte geprüft, ${same} unverändert aus der Referenz übernommen (längere Texte)`);
if (errs.length) { console.log(errs.slice(0, 60).join('\n')); process.exit(1); }
console.log('Struktur und Platzhalter stimmen.');
