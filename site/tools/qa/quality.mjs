// Qualitätsseite prüfen (statische Seite): Fehlergrenzen-Diagramm maßstäblich, Zertifikatsmatrix, Abschnitte, Belege,
// Seitenbreite auf dem Telefon – in allen fünf Sprachen.   Aufruf: node tools/qa/quality.mjs [Basis-URL]
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:8080';
const exe = process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const PAGES = { de: '/de/unternehmen/qualitaet/', en: '/en/company/quality/', fr: '/fr/entreprise/qualite/', hu: '/hu/vallalat/minoseg/', es: '/es/empresa/calidad/' };
// Silver-Statement verlinkten nur DE und EN (Dokumente je Sprachfassung)
const DOCS = { de: 7, en: 7, fr: 6, hu: 6, es: 6 };
const browser = await chromium.launch({ executablePath: exe });
let fail = 0;
const ok = (c, msg) => { console.log(`${c ? 'ok  ' : 'FEHL'} ${msg}`); if (!c) fail++; };
const errs = [];

for (const [lang, path] of Object.entries(PAGES)) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) { /* */ } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(`${lang}: ${e}`));
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const area = document.querySelector('.fg__area').getBoundingClientRect();
    const band = document.querySelector('.fg__band').getBoundingClientRect();
    const tabs = [...document.querySelectorAll('.pd-tabs__list a')].map((a) => a.getAttribute('href'));
    return {
      // Band ±0,010 % in einem Raum von ±0,9 %: Höhe = 0,02 / 1,8 der Fläche
      band: band.height, expect: area.height * (0.02 / 1.8),
      mid: band.top + band.height / 2 - (area.top + area.height / 2),
      label: document.querySelector('.fg__plot')?.getAttribute('aria-label') || '',
      rows: document.querySelectorAll('.certm tbody tr').length,
      on: document.querySelectorAll('.certm td.is-on').length,
      docs: document.querySelectorAll('.certm__doc').length,
      tabs, missing: tabs.filter((h) => !document.getElementById(h.slice(1))),
      rec: document.querySelectorAll('.qu-rec__i a').length,
      scope: document.querySelectorAll('.qu-scope tbody tr').length,
    };
  });
  ok(Math.abs(r.band - r.expect) < 1 && Math.abs(r.mid) < 1, `${lang}: Band maßstäblich (${r.band.toFixed(1)} px, erwartet ${r.expect.toFixed(1)} px, Mitte ${r.mid.toFixed(1)} px)`);
  ok(/0[.,]2S/.test(r.label) && /0[.,]010/.test(r.label), `${lang}: Diagramm hat Textalternative`);
  ok(r.rows === 8 && r.on === 21, `${lang}: Matrix ${r.rows} Nachweise, ${r.on} Standortfelder`);
  ok(r.docs === DOCS[lang], `${lang}: ${r.docs} Dokumente in der Matrix (erwartet ${DOCS[lang]})`);
  ok(r.tabs.length === 4 && !r.missing.length, `${lang}: Abschnittsleiste ${r.tabs.join(' ')}`);
  ok(r.rec === 3 && r.scope === 4, `${lang}: 3 Belege, 4 Zeilen Akkreditierungsumfang`);
  await ctx.close();
  for (const w of [320, 390]) {
    const m = await browser.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const p = await m.newPage();
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(sw <= w, `${lang}: ${w} px ohne Querscrollen (${sw})`);
    await m.close();
  }
}
ok(!errs.length, `keine Skriptfehler${errs.length ? ': ' + errs.join(' | ') : ''}`);
await browser.close();
console.log(fail ? `${fail} Fehler` : 'Qualitätsseite in Ordnung.');
process.exit(fail ? 1 : 0);
