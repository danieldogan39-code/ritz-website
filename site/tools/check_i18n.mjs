// Prüft, ob eine Sprachdatei exakt dieselbe Struktur wie en.js hat.
// Aufruf: node tools/check_i18n.mjs fr
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const lang = process.argv[2];
const base = path.resolve('src/i18n');
const en = (await import(pathToFileURL(path.join(base, 'en.js')))).default;
const other = (await import(pathToFileURL(path.join(base, `${lang}.js`)) + '?t=' + Date.now())).default;
const errors = [];
const KEEP = [/=/, /\.pdf$/i, /@/, /^\+?\d[\d\s\-()]+$/, /^(QM15|UM15|EMSt21|17025|IRIS-Certificate|IRIS_silver_status|AEO-F)$/];
function walk(a, b, p) {
  if (Array.isArray(a)) {
    if (!Array.isArray(b)) return errors.push(`${p}: expected array`);
    if (a.length !== b.length) errors.push(`${p}: array length ${b.length} != ${a.length}`);
    a.forEach((x, i) => walk(x, b[i], `${p}[${i}]`));
  } else if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return errors.push(`${p}: expected object`);
    for (const k of Object.keys(a)) if (!(k in b)) errors.push(`${p}.${k}: missing`);
    for (const k of Object.keys(b)) if (!(k in a)) errors.push(`${p}.${k}: unexpected key`);
    for (const k of Object.keys(a)) if (k in b) walk(a[k], b[k], `${p}.${k}`);
  } else if (typeof a === 'string') {
    if (typeof b !== 'string') return errors.push(`${p}: expected string`);
    const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
    if (ph(a) !== ph(b)) errors.push(`${p}: placeholders differ (${ph(a)} vs ${ph(b)})`);
    if (KEEP.some((r) => r.test(a)) && a !== b && !/\s/.test(a.replace(/[=&]/g, ''))) errors.push(`${p}: must stay unchanged ("${a}")`);
    if (!b.trim() && a.trim()) errors.push(`${p}: empty`);
  }
}
walk(en, other, lang);
if (other.meta?.lang !== lang) errors.push(`meta.lang must be "${lang}"`);
if (errors.length) {
  console.log(`${errors.length} problem(s):\n` + errors.slice(0, 80).join('\n'));
  process.exit(1);
} else console.log(`${lang}.js OK – structure matches en.js`);
