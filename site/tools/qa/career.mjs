// Karriereseite: Stationen und Filter der Stellenliste prüfen (statische Seite)
// Aufruf: node tools/qa/career.mjs [Basis-URL] (Standard http://localhost:8080)
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:8080';
const exe = process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch({ executablePath: exe });
let fail = 0;
const ok = (c, msg) => { console.log(`${c ? 'ok  ' : 'FEHL'} ${msg}`); if (!c) fail++; };

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) { /* */ } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.goto(`${BASE}/de/karriere/`, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('[data-stn-b]')?.closest('.stn'));
await page.waitForTimeout(300);

const state = () => page.evaluate(() => ({
  rows: [...document.querySelectorAll('[data-job]')].filter((r) => !r.hidden).length,
  stn: Object.fromEntries([...document.querySelectorAll('[data-stn-b]')].map((b) => [b.dataset.stnB, +b.querySelector('b').textContent])),
  loc: Object.fromEntries([...document.querySelectorAll('[data-jb-loc]')].filter((c) => c.dataset.jbLoc).map((c) => [c.dataset.jbLoc, +c.querySelector('[data-n]').textContent])),
  count: document.querySelector('[data-jb-count]').textContent.trim(),
  empty: !document.querySelector('[data-jb-empty]').hidden,
  pill: document.querySelector('[data-jb-area]').hidden ? '' : document.querySelector('[data-jb-area-l]').textContent,
  mail: document.querySelector('[data-jb-mail]').getAttribute('href'),
  url: location.search,
  pressed: [...document.querySelectorAll('[aria-pressed="true"]')].map((b) => b.dataset.stnB || b.dataset.jbLoc || b.dataset.jbType || '*'),
}));

let s = await state();
ok(s.rows === 15, `Anfang: 15 Stellen sichtbar (${s.rows})`);
ok(JSON.stringify(s.stn) === JSON.stringify({ sales: 0, dev: 3, make: 4, test: 4, log: 2, org: 2 }), `Stationen zählen ${JSON.stringify(s.stn)}`);
ok(s.count.startsWith('15'), `Zähler „${s.count}“`);

await page.click('[data-stn-b="test"]');
s = await state();
ok(s.rows === 4 && s.pill === 'Prüffeld & Qualität' && s.url.includes('area=test'), `Station Prüfen: ${s.rows} Stellen, Hinweis „${s.pill}“, Adresse ${s.url}`);
ok(JSON.stringify(s.loc) === JSON.stringify({ hamburg: 0, kirchaich: 1, dresden: 3 }), `Standortzahlen bei „Prüfen“ ${JSON.stringify(s.loc)}`);

await page.click('[data-jb-loc="kirchaich"]');
s = await state();
ok(s.rows === 1, `Prüfen + Kirchaich: ${s.rows} Stelle`);
ok(JSON.stringify(s.stn) === JSON.stringify({ sales: 0, dev: 1, make: 1, test: 1, log: 1, org: 0 }), `Stationen bei Kirchaich ${JSON.stringify(s.stn)}`);

await page.click('[data-jb-type="training"]');
s = await state();
ok(s.rows === 0 && s.empty, `Prüfen + Kirchaich + Ausbildung: leer, Hinweis sichtbar (${s.empty})`);
ok(s.mail.startsWith('mailto:personal.kirchaich@') && decodeURIComponent(s.mail).includes('Initiativbewerbung – Prüffeld & Qualität – Kirchaich'), `Initiativ-Mail ${decodeURIComponent(s.mail)}`);

await page.click('.jb__reset');
s = await state();
ok(s.rows === 15 && !s.url && !s.pill, `Zurücksetzen: ${s.rows} Stellen, Adresse „${s.url}“`);

await page.fill('[data-jb-q]', 'prüf');
await page.waitForTimeout(400);
s = await state();
ok(s.rows === 4, `Suche „prüf“: ${s.rows} Stellen`);
await page.fill('[data-jb-q]', 'konstrukteur hamburg');
await page.waitForTimeout(400);
s = await state();
ok(s.rows === 1, `Suche „konstrukteur hamburg“: ${s.rows} Stelle`);
await page.fill('[data-jb-q]', '');
await page.waitForTimeout(400);

// Station abwählen (zweiter Klick)
await page.click('[data-stn-b="log"]');
await page.click('[data-stn-b="log"]');
s = await state();
ok(s.rows === 15 && !s.pressed.includes('log'), `Station zweimal: wieder alle (${s.rows})`);

// Standortkarte
await page.click('[data-jb-goto="kirchaich"]');
await page.waitForTimeout(700);
s = await state();
const top = await page.evaluate(() => Math.round(document.querySelector('[data-jb]').getBoundingClientRect().top));
ok(s.rows === 4 && s.pressed.includes('kirchaich') && top >= 0 && top < 200, `Standortkarte Kirchaich: ${s.rows} Stellen, Liste oben (${top} px)`);

// Vorgefiltert über die Adresse
await page.goto(`${BASE}/de/karriere/?area=log&loc=dresden#stellen`, { waitUntil: 'networkidle' });
await page.waitForTimeout(300);
s = await state();
ok(s.rows === 1 && s.pressed.includes('log') && s.pressed.includes('dresden'), `Adresse ?area=log&loc=dresden: ${s.rows} Stelle`);

// Tastatur: Station per Tab und Leertaste
await page.goto(`${BASE}/de/karriere/`, { waitUntil: 'networkidle' });
await page.focus('[data-stn-b="dev"]');
await page.keyboard.press('Space');
s = await state();
ok(s.rows === 3, `Tastatur: Entwickeln gewählt (${s.rows})`);

// Telefon: keine waagerechte Überbreite
const m = await browser.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const mp = await m.newPage();
await mp.goto(`${BASE}/de/karriere/`, { waitUntil: 'networkidle' });
const sw = await mp.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
ok(sw[0] <= sw[1], `Telefon 360 px: Seitenbreite ${sw[0]} ≤ ${sw[1]}`);
await mp.tap('[data-stn-b="make"]');
const mrows = await mp.evaluate(() => [...document.querySelectorAll('[data-job]')].filter((r) => !r.hidden).length);
ok(mrows === 4, `Telefon: Station Fertigen tippen → ${mrows} Stellen`);

ok(!errs.length, `keine Skriptfehler ${errs.join(' | ')}`);
await browser.close();
console.log(fail ? `${fail} Fehler` : 'alles in Ordnung');
process.exit(fail ? 1 : 0);
