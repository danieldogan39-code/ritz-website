// Dokumente je Sprachfassung: neue Daten (vis/alt/tl, lib/doclang.js) gegen die PDF-Listen der alten Seiten (raw/main_docs.json)
//   node tools/qa/doc-langs.mjs            Zusammenfassung und Abweichungen
//   node tools/qa/doc-langs.mjs --all      zusätzlich die vollständigen Listen je Seite und Sprache
//   BUILD=<Ordner> node tools/qa/doc-langs.mjs   andere Datenausgabe prüfen (Standard: src/data/build)
//
// Geprüft wird je Sprachfassung (byte-gleiche Kopien, Feld same, gelten als dasselbe Dokument):
//   Produktbereiche   docsForArea(Hauptseiten-Dokumente, Bereich, Sprache) gegen die PDFs der Bereichsseite dieser Sprache
//                     (zum Vergleich auch docsForLang über alle Dokumente des Bereichs ohne areaLangs);
//                     außerdem je Produkt die Dokumente der Bereichsseite, die die Produktseite in dieser Sprache zeigen würde
//   Downloads, Qualität, Verantwortung, Karriere …   a) docsForLang(Liste der deutschen Seite – bzw. der englischen, wenn es
//                     keine deutsche gibt) und b) docsForLang(Listen aller Sprachfassungen) gegen die Liste der Seite in dieser
//                     Sprache; außerdem: sind alle Dokumente der Seite in dieser Sprache sichtbar? (Abweichungen hier sind
//                     erklärbar – ein Dokument ist pro Sprache sichtbar oder nicht, unabhängig von der Seite – und zählen nicht
//                     für den Rückgabewert)
//   News              docsForLang(Anhänge des Beitrags) gegen die PDFs des Beitrags in dieser Sprache
//   Titel             kein Dateiname/Kürzel als Titel (docTitleFor) für Dokumente, die eine Seite in dieser Sprache zeigt
// Rückgabewert 1 bei Abweichungen auf Produktbereichen, Produkten, News oder bei Titeln
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { docsForLang, docsForArea, docVisible, docTitleFor } from '../../src/lib/doclang.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const ROOT = path.resolve(SITE, '..');
const BUILD = process.env.BUILD || path.join(SITE, 'src/data/build');
const ALL = process.argv.includes('--all');
const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const docs = rd(path.join(BUILD, 'docs.json'));
const products = rd(path.join(BUILD, 'products.json'));
const news = rd(path.join(BUILD, 'news.json'));
const mainDocs = rd(path.join(ROOT, 'raw/main_docs.json'));
const crawl = rd(path.join(ROOT, 'raw/crawl.json')).filter((p) => p.url);
const LANGS = ['de', 'en', 'fr', 'hu', 'es'];
const dataLang = (l) => (l === 'de' ? 'de' : 'en');

const docsById = Object.fromEntries(docs.map((d) => [d.id, d]));
const nurl = (u) => { let s = u.split('?')[0].trim(); try { s = decodeURIComponent(s); } catch (e) { /* roh */ } return s.replace(/^https?:\/\/(www\.)?/, 'https://'); };
const docByUrl = new Map(docs.map((d) => [nurl(d.url), d]));
const pageLang = (p) => (/^\/(en|fr|hu|es)\//.exec(p) || [0, 'de'])[1];
const upath = (u) => { const p = new URL(u).pathname || '/'; return p.endsWith('/') ? p : p + '/'; };
const fileOf = (u) => decodeURIComponent(new URL(u).pathname.split('/').pop());
const name = (id) => docsById[id]?.file || id;

// Linkziel eines verketteten hrefs (zwei Adressen in einem Link): Teil in der Sprache der Seite, sonst der letzte
const LANG_TOK = { de: ['de', 'ger', 'deutsch', 'dtsch', 'german'], en: ['en', 'eng', 'engl', 'englisch', 'english'], fr: ['fr', 'fra'], hu: ['hu', 'hun'], es: ['es', 'esp'] };
const fileLang = (f) => { const t = f.toLowerCase().replace(/\.[a-z]+$/, '').split(/[^a-z0-9]+/); return Object.keys(LANG_TOK).find((l) => LANG_TOK[l].some((x) => t.includes(x))); };
const hrefPart = (href, lang) => {
  const parts = href.split(/(?:%20|\s)+(?=https?:\/\/)/).filter(Boolean);
  return parts.length > 1 ? (parts.find((x) => fileLang(fileOf(x)) === lang) || parts[parts.length - 1]) : parts[0];
};

// Originallisten: Seite → Dokument-IDs
const pageDocs = new Map();
for (const [url, info] of Object.entries(mainDocs)) {
  for (const pg of info.pages) {
    const d = docByUrl.get(nurl(hrefPart(url, pageLang(pg))));
    if (!d) { console.log(`! Dokument fehlt in docs.json: ${url}`); continue; }
    if (!pageDocs.has(pg)) pageDocs.set(pg, new Set());
    pageDocs.get(pg).add(d.id);
  }
}

// Sprachfassungen derselben Seite (hreflang)
const parent = new Map();
const find = (x) => { if (!parent.has(x)) parent.set(x, x); while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(rb, ra); };
for (const p of crawl) {
  find(upath(p.url));
  for (const [l, u] of p.hreflang || []) if (l !== 'x-default' && u.includes('ritz-international.com')) union(upath(p.url), upath(u));
}
const versions = (pth) => {
  const g = find(pth);
  const out = {};
  for (const p of crawl) { const q = upath(p.url); if (find(q) === g) (out[pageLang(q)] ||= new Set()).add(q); }
  return out; // Sprache → Seitenpfade
};
const docsOn = (paths) => { const s = new Set(); for (const p of paths || []) for (const id of pageDocs.get(p) || []) s.add(id); return s; };
const ordered = (paths) => { const out = []; for (const p of paths || []) for (const id of pageDocs.get(p) || []) if (!out.includes(id)) out.push(id); return out; };

const AREAS = {
  '/produkte/mittelspannungswandler/': 'mittelspannung', '/produkte/niederspannungswandler/': 'niederspannung', '/produkte/hochspannungswandler/': 'hochspannung',
  '/produkte/stromschienen/': 'stromschienen-sis', '/produkte/giessharzteile-duromer/': 'giessharzteile-duromer',
  '/produkte/elektronische-messwandler-und-sensoren/': 'elektronik-sensoren',
};
const PAGES = {
  '/downloads/': 'Downloads', '/en/latest-news/downloads/': 'Downloads (News)', '/produktkataloge/': 'Produktkataloge', '/unternehmen/qualitaetsmanagement/': 'Qualitätsmanagement',
  '/unternehmen/verantwortung/': 'Verantwortung', '/karriere/ausbildung/': 'Ausbildung', '/en/career/vacancies/': 'Stellenangebote',
};
const main = docs.filter((d) => d.source === 'main');
// Vergleich über den Inhalt: byte-gleiche Kopien (same) zählen als dasselbe Dokument
const key = (id) => docsById[id]?.same || id;
const diff = (got, want) => {
  const gk = new Set([...got].map(key)), wk = new Set([...want].map(key));
  return { missing: [...want].filter((x) => !gk.has(key(x))), extra: [...got].filter((x) => !wk.has(key(x))),
    copies: [...got].filter((x) => !want.has(x) && wk.has(key(x))) };
};
const fmt = (ids) => ids.map(name).join(', ');
let areaMismatch = 0, areaExplained = 0, areaPlain = 0, pageMismatch = 0, titleIssues = 0;
const rows = [];

console.log('Dokumente je Sprachfassung – Abgleich mit den PDF-Listen der alten Seiten\n');
console.log('Sichtbare Hauptseiten-Dokumente je Sprache:', Object.fromEntries(LANGS.map((l) => [l, main.filter((d) => docVisible(d, l)).length])));
console.log(`Hauptseiten-Dokumente ohne vis: ${main.filter((d) => !Array.isArray(d.vis)).length}, ohne Titel in einer sichtbaren Sprache: ${main.filter((d) => (d.vis || []).some((l) => !d.tl?.[l])).length}\n`);

// ---- Produktbereiche
console.log('== Produktbereiche (docsForArea gegen die Bereichsseite der Sprache) ==');
for (const [dePath, area] of Object.entries(AREAS)) {
  const vers = versions(dePath);
  const onAnyVersion = docsOn(Object.values(vers).flatMap((s) => [...s]));
  for (const l of LANGS) {
    const want = docsOn(vers[l]);
    const got = new Set(docsForArea(main, area, l, docsById).map((d) => d.id));
    const { missing, extra, copies } = diff(got, want);
    const otherPage = extra.filter((id) => onAnyVersion.has(id));   // auf der Bereichsseite einer anderen Sprache verlinkt
    const viaProduct = extra.filter((id) => !onAnyVersion.has(id)); // Bereich nur über ein Produkt (nicht auf der alten Bereichsseite)
    // nur zum Vergleich: docsForLang über alle Dokumente des Bereichs (ohne areaLangs)
    const plain = diff(new Set(docsForLang(main.filter((d) => d.areas.includes(area)), l, docsById).map((d) => d.id)), want);
    const plainOther = plain.extra.filter((id) => onAnyVersion.has(id));
    areaMismatch += missing.length + otherPage.length;
    areaExplained += viaProduct.length;
    areaPlain += plain.missing.length + plainOther.length;
    rows.push([area, l, want.size, got.size, missing.length, otherPage.length, viaProduct.length, copies.length, plain.missing.length + plainOther.length]);
    if (missing.length) console.log(`  ${area} ${l}: FEHLT ${fmt(missing)}`);
    if (otherPage.length) console.log(`  ${area} ${l}: ZUSÄTZLICH (Bereichsseite einer anderen Sprache) ${fmt(otherPage)}`);
    if (copies.length) console.log(`  ${area} ${l}: byte-gleiche Kopie statt Original: ${fmt(copies)}`);
    if (plainOther.length || plain.missing.length) console.log(`  ${area} ${l}: (nur docsForLang ohne areaLangs: zusätzlich ${fmt(plainOther) || '–'}${plain.missing.length ? `; fehlt ${fmt(plain.missing)}` : ''})`);
    if (viaProduct.length && ALL) console.log(`  ${area} ${l}: zusätzlich über Produktzuordnung ${fmt(viaProduct)}`);
    if (ALL) console.log(`  ${area} ${l}: ${[...got].map((id) => `${name(id)} „${docTitleFor(docsById[id], l, dataLang(l))}“`).join(' · ')}`);
  }
}
console.log('\n  Bereich                 Sprache  alt  neu  fehlt  zusätzl.(andere Sprache)  zusätzl.(Produkt)  Kopie  | nur docsForLang: Abw.');
for (const r of rows) console.log(`  ${r[0].padEnd(23)} ${r[1].padEnd(7)} ${String(r[2]).padStart(4)} ${String(r[3]).padStart(4)} ${String(r[4]).padStart(6)} ${String(r[5]).padStart(25)} ${String(r[6]).padStart(18)} ${String(r[7]).padStart(6)}  | ${String(r[8]).padStart(5)}`);

// ---- Produkte mit Dokumenten einer Bereichsseite: je Sprache die Dokumente, die die alte Bereichsseite dieser Sprache für das
//      Produkt zeigte (Familien-Datenblätter der Mittelspannung/Elektronik/Niederspannung, Hochspannungsbroschüren …)
console.log('\n== Produkte: Dokumente der Bereichsseite je Sprache (docsForLang(Produktdokumente)) ==');
const areaPath = Object.fromEntries(Object.entries(AREAS).map(([p, a]) => [a, p]));
let famChecked = 0, famBad = 0;
for (const p of products) {
  const vers = versions(areaPath[p.area] || '/');
  const onArea = docsOn(Object.values(vers).flatMap((s) => [...s]));
  const own = p.docs.filter((id) => onArea.has(id));
  if (!own.length) continue;
  // verwandte Dokumente: Produktdokumente und ihre Gegenstücke
  const related = new Set(own);
  for (const id of own) for (const a of Object.values(docsById[id]?.alt || {})) related.add(a);
  for (const l of LANGS) {
    const want = docsOn(vers[l]);
    if (!want.size) continue;
    const expected = [...want].filter((id) => related.has(id));
    const shown = docsForLang(p.docs, l, docsById).filter((d) => onArea.has(d.id)).map((d) => d.id);
    famChecked++;
    const d = diff(new Set(shown), new Set(expected));
    if (d.missing.length || d.extra.length) {
      famBad++;
      console.log(`  ${p.code} ${l}: zeigt ${fmt(shown) || '–'}; Bereichsseite ${l}: ${fmt(expected) || '–'}`);
    }
  }
}
console.log(`  ${famChecked} Produkt×Sprache geprüft, ${famBad} Abweichungen`);

// ---- Downloads, Unternehmens- und Karriereseiten
//   a) docsForLang(Liste der deutschen – sonst englischen – Seite): Gegenstücke (alt) einer festen Liste, wie sie die Ansichten
//      z. B. für Zertifikate oder hervorgehobene Downloads verwenden
//   b) docsForLang(alle Sprachfassungen der Seite zusammen): Sichtbarkeit (vis) und Gegenstücke zusammen
console.log('\n== Weitere Seiten: a) aus der deutschen bzw. englischen Liste, b) aus allen Sprachfassungen ==');
let pageMismatchUnion = 0;
for (const [ref, label] of Object.entries(PAGES)) {
  const vers = versions(ref);
  const refLang = vers.de && ordered(vers.de).length ? 'de' : 'en';
  const refList = ordered(vers[refLang]);
  const unionList = LANGS.flatMap((l) => ordered(vers[l]));
  for (const l of LANGS) {
    if (!vers[l]) continue;
    const want = docsOn(vers[l]);
    const invisible = [...want].filter((id) => !docVisible(docsById[id], l));
    const a = diff(new Set(docsForLang(refList, l, docsById).map((d) => d.id)), want);
    const b = diff(new Set(docsForLang(unionList, l, docsById).map((d) => d.id)), want);
    pageMismatch += a.missing.length + a.extra.length + invisible.length;
    pageMismatchUnion += b.missing.length + b.extra.length;
    const st = (x) => (!x.missing.length && !x.extra.length ? 'gleich' : `${x.missing.length} fehlen, ${x.extra.length} zusätzlich`) + (x.copies.length ? ` (${x.copies.length} byte-gleiche Kopie)` : '');
    console.log(`  ${label.padEnd(20)} ${l}: ${String(want.size).padStart(2)} PDFs | a) ${refLang}-Liste: ${st(a)} | b) alle Fassungen: ${st(b)}`);
    if (invisible.length) console.log(`      NICHT SICHTBAR: ${fmt(invisible)}`);
    if (a.missing.length) console.log(`      a) fehlt: ${fmt(a.missing)}`);
    if (a.extra.length) console.log(`      a) zusätzlich: ${fmt(a.extra)}`);
    if (b.missing.length) console.log(`      b) fehlt: ${fmt(b.missing)}`);
    if (b.extra.length) console.log(`      b) zusätzlich: ${fmt(b.extra)}`);
  }
}

// ---- News: Anhänge je Sprachfassung des Beitrags
console.log('\n== News: docsForLang(Anhänge) gegen die PDFs des Beitrags in dieser Sprache ==');
let newsChecked = 0, newsBad = 0;
for (const n of news) {
  for (const [l, v] of Object.entries(n.v)) {
    if (!v.old || !LANGS.includes(l)) continue;
    const want = docsOn([upath(v.old)]);
    const got = new Set(docsForLang(n.docs, l, docsById).filter((d) => d.source === 'main').map((d) => d.id));
    if (!want.size && !got.size) continue;
    newsChecked++;
    const d = diff(got, want);
    if (d.missing.length || d.extra.length) {
      newsBad++;
      console.log(`  ${n.id} ${l}: zeigt ${fmt([...got]) || '–'}; alter Beitrag: ${fmt([...want]) || '–'}`);
    }
  }
}
console.log(`  ${newsChecked} Beitrag×Sprache mit Anhängen geprüft, ${newsBad} Abweichungen`);

// ---- Titel
console.log('\n== Titel ==');
const GENERIC = /^(datenblatt|data ?sheet|fiche (technique|de données)|adatlap|ficha de datos|produktbroschüre|product brochure|download|weiterlesen|read more|hier|here)$/i;
for (const l of LANGS) {
  for (const d of main.filter((x) => docVisible(x, l))) {
    const t = docTitleFor(d, l, dataLang(l));
    const stem = d.file.replace(/\.[a-z]+$/i, '');
    if (!t || t.includes('_') || GENERIC.test(t) || t === stem || t === d.file) {
      titleIssues++;
      console.log(`  ${l} ${d.file}: „${t}“`);
    }
  }
}
if (!titleIssues) console.log('  keine Dateinamen oder generischen Linktexte als Titel');

console.log(`\nErgebnis: Produktbereiche ${areaMismatch} Abweichung(en) mit docsForArea (nur docsForLang: ${areaPlain}; ` +
  `+${areaExplained} zusätzliche Dokumente über Produktzuordnung), Produkte ${famBad}, News ${newsBad}, ` +
  `weitere Seiten a) ${pageMismatch} / b) ${pageMismatchUnion} (siehe oben), Titel ${titleIssues}`);
process.exitCode = areaMismatch || famBad || newsBad || titleIssues ? 1 : 0;
