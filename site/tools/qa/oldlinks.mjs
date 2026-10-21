// Prüft gebaute Seiten auf Links zu den alten Websites (keine Weiterleitung weg von der neuen Seite)
// node tools/qa/oldlinks.mjs [dist]
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2] || 'dist';
// Alte Adressen: Produktdomain, WordPress-Medien und Pfade, die es auf der neuen Seite nicht gibt
// (Links auf die neue Seite unter der Produktivdomain – canonical, hreflang – sind erlaubt)
const OLD_HOST = /^(?:www\.)?(?:produkte\.)?ritz-international\.com$/;
const isOld = (u) => {
  let x; try { x = new URL(u); } catch (e) { return false; }
  if (!OLD_HOST.test(x.host)) return false;
  if (x.host.startsWith('produkte.')) return true;
  if (x.search.includes('page_id') || x.pathname.startsWith('/wp-content/')) return true;
  return !/^\/(?:$|(?:de|en|fr|hu|es|dokumente|img|assets|data)\/)/.test(x.pathname);
};
const counts = {}; const ex = {};
let files = 0, links = 0;
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== '_projekt' && e.name !== 'dokumente') walk(p); continue; }
    if (!/\.(html|json|js)$/.test(e.name)) continue;
    files++;
    const s = fs.readFileSync(p, 'utf8');
    for (const m of s.matchAll(/<a\b[^>]*?href=\\?"(https?:\/\/[^"\\]+)/g)) {
      links++;
      const u = m[1];
      if (!isOld(u)) continue;
      const k = new URL(u).host + (/\.(pdf|zip|dwg|docx?|xlsx?)$/i.test(u) ? ' (Datei)' : ' (Seite)');
      counts[k] = (counts[k] || 0) + 1; ex[k] ||= `${p}: ${u}`;
    }
    // Rohadressen in Daten (JSON/JS), z. B. "u":"https://…"
    for (const m of s.matchAll(/"(?:u|url)":"(https?:\/\/[^"]+)"/g)) { if (isOld(m[1])) { const k = 'Daten ' + new URL(m[1]).host; counts[k] = (counts[k] || 0) + 1; ex[k] ||= `${p}: ${m[1]}`; } }
  }
};
walk(dir);
console.log(`${files} Dateien, ${links} absolute Links geprüft`);
const keys = Object.keys(counts);
if (!keys.length) console.log('Keine Links auf die alten Websites.');
for (const k of keys) console.log(`${counts[k]}× ${k}  z. B. ${ex[k]}`);
process.exit(keys.length ? 1 : 0);
