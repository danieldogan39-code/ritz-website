// Gebaute Seiten: zeigt jede Sprachfassung nur Dokumente, die die bisherige Website in dieser Sprache gezeigt hat?
// (Hauptseiten-Dokumente mit vis; Produktfinder-Dokumente gelten überall; Links im Fließtext von News-Beiträgen bleiben außen vor)   node tools/qa/doc-pages.mjs [dist]
import fs from 'node:fs';
import path from 'node:path';
import { docVisible } from '../../src/lib/doclang.js';
const dist = process.argv[2] || 'dist';
const docs = JSON.parse(fs.readFileSync('src/data/build/docs.json', 'utf8'));
const byId = new Map(docs.map((d) => [d.id, d]));
const byPath = new Map(docs.map((d) => [String(d.path || '').replace(/^\/dokumente\//, ''), d]));
const bad = {}; let pages = 0, refs = 0;
const walk = (dir, lang) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, lang);
    else if (f.endsWith('.html')) {
      pages++;
      const html = fs.readFileSync(p, 'utf8');
      const hits = new Set();
      for (const m of html.matchAll(/data-doc-id="([^"]+)"/g)) hits.add(byId.get(m[1]));
      // Links im Fließtext eines Beitrags gehören zum Text (oft eine übernommene Fassung in anderer Sprache) – nur Anhänge prüfen
      if (!html.includes('class="wrap article"')) for (const m of html.matchAll(/href="\/dokumente\/([^"]+)"/g)) hits.add(byPath.get(decodeURI(m[1])));
      for (const d of hits) {
        if (!d) continue;
        refs++;
        if (!docVisible(d, lang)) (bad[`${lang} ${d.file}`] ||= []).push(path.relative(dist, p));
      }
    }
  }
};
for (const lang of ['de', 'en', 'fr', 'hu', 'es']) if (fs.existsSync(path.join(dist, lang))) walk(path.join(dist, lang), lang);
const keys = Object.keys(bad);
console.log(`${pages} Seiten, ${refs} Dokumentverweise geprüft`);
if (!keys.length) console.log('Jede Sprachfassung zeigt nur ihre Dokumente.');
else for (const k of keys.slice(0, 40)) console.log(`  ${k}  ← ${bad[k].slice(0, 3).join(', ')}${bad[k].length > 3 ? ` (+${bad[k].length - 3})` : ''}`);
process.exit(keys.length ? 1 : 0);
