// App-Leiste auf dem Telefon: Aufnahmen und Prüfungen (Platz, aktive Seite, Zähler, Tastatur, Überdeckung)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const out = process.env.QA_OUT || 'qa-shots';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const errs = [];
const open = async (url, w = 390, h = 844, scheme = 'light') => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme });
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
  await page.goto('http://localhost:8080' + url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  return page;
};
const info = (page) => page.evaluate(() => {
  const b = document.querySelector('[data-abar]'); const r = b.getBoundingClientRect();
  const on = [...b.querySelectorAll('.abar__it')].map((x) => (x.classList.contains('is-on') ? '*' : '') + x.querySelector('.abar__l').textContent);
  const hdr = [...document.querySelectorAll('.hdr__bar > *, .hdr__tools > *')].filter((x) => getComputedStyle(x).display !== 'none').map((x) => x.className.split(' ').pop());
  return { vis: getComputedStyle(b).display, top: Math.round(r.top), h: Math.round(r.height), on: on.join(' | '), hdr: hdr.join(','), pad: getComputedStyle(document.body).paddingBottom, sw: document.documentElement.scrollWidth };
});
let page = await open('/de/');
console.log('Start', JSON.stringify(await info(page)));
await page.screenshot({ path: `${out}/abar-start.png` });
await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/abar-ende.png` });
// Fuß darf nicht unter der Leiste verschwinden: letztes Element über der Leiste?
console.log('Fußende frei', await page.evaluate(() => { const f = document.querySelector('.ftr .theme-toggle, .ftr__funding'); const bar = document.querySelector('[data-abar]').getBoundingClientRect(); const r = [...document.querySelectorAll('.ftr__base > *')].map((x) => x.getBoundingClientRect().bottom); return Math.max(...r) <= bar.top + 1; }));
// Menü über die Leiste
await page.locator('[data-abar] [data-drawer-open]').click();
await page.waitForTimeout(700);
console.log('Menü offen', await page.evaluate(() => document.querySelector('[data-drawer]').classList.contains('is-open')), await page.evaluate(() => document.querySelector('[data-abar] [data-drawer-open]').getAttribute('aria-expanded')));
await page.screenshot({ path: `${out}/abar-menue.png` });
await page.locator('.drawer__head [data-drawer-close]').click();
await page.waitForTimeout(500);
// Suche über die Leiste, Leiste weicht beim Tippen
await page.locator('[data-abar] [data-search-open]').click();
await page.waitForTimeout(500);
console.log('Suche offen', await page.evaluate(() => !document.querySelector('[data-search]').hidden), 'tippen', await page.evaluate(() => document.documentElement.classList.contains('is-typing')));
await page.keyboard.press('Escape');
await page.close();
for (const [url, name] of [['/de/produktfinder/', 'finder'], ['/de/produkte/mittelspannung/', 'produkte'], ['/de/anfrage/', 'mappe'], ['/en/products/', 'en'], ['/hu/', 'hu'], ['/fr/', 'fr'], ['/es/', 'es']]) {
  page = await open(url);
  const i = await info(page);
  console.log(name, i.on, '| Kopf:', i.hdr, '| Breite', i.sw);
  if (['finder', 'hu', 'fr'].includes(name)) await page.screenshot({ path: `${out}/abar-${name}.png` });
  await page.close();
}
// Zähler der Projektmappe
page = await open('/de/');
await page.evaluate(() => { localStorage.setItem('ritz-basket', JSON.stringify([{ id: 'gse12', qty: 2 }, { id: 'kso-100', qty: 1 }])); });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);
console.log('Zähler', await page.evaluate(() => { const c = document.querySelector('[data-abar] [data-basket-count]'); return [c.hidden, c.textContent, document.querySelector('[data-abar] [data-basket-link]').getAttribute('aria-label')]; }));
await page.close();
// dunkel, breitere Telefone, Tablet
for (const [w, h, scheme] of [[390, 844, 'dark'], [360, 740, 'light'], [430, 932, 'light'], [768, 1024, 'light']]) {
  page = await open('/de/unternehmen/', w, h, scheme);
  const i = await info(page);
  console.log(w, scheme, 'Leiste', i.vis, '| Kopf:', i.hdr, '| Breite', i.sw);
  await page.screenshot({ path: `${out}/abar-${w}-${scheme}.png` });
  await page.close();
}
console.log(errs.length ? 'FEHLER: ' + errs.join('\n') : 'keine Konsolenfehler');
await browser.close();
