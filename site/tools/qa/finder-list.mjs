// Produktfinder: Listenansicht auf Desktop und Telefon
import { chromium } from 'playwright-core';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
for (const [w, h, mob] of [[1440, 900, false], [1024, 800, false], [390, 844, true]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: mob ? 2 : 1, isMobile: mob, hasTouch: mob });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
  await page.goto('http://localhost:8080/de/produktfinder/', { waitUntil: 'networkidle' });
  const btns = await page.evaluate(() => [...document.querySelectorAll('[data-view], [data-view-set], [aria-label*="Liste"], button')].filter((b) => /list|liste/i.test(b.getAttribute('aria-label') || b.dataset.viewSet || b.dataset.view || '')).map((b) => b.outerHTML.slice(0, 160)));
  console.log(w, 'Knöpfe', btns);
  await page.screenshot({ path: `${out}/fl-${w}-grid.png` });
  const lb = page.locator('button[aria-label*="Liste"], [data-view-set="list"], [data-view="list"]').first();
  if (await lb.count()) { if (mob) await lb.tap(); else await lb.click(); }
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/fl-${w}-list.png` });
  await page.evaluate(() => scrollTo(0, 700));
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/fl-${w}-list2.png` });
  const info = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, cls: document.querySelector('[data-finder] [data-results], .finder__results, .results')?.className }));
  console.log(w, JSON.stringify(info), errs.join(' | '));
  if (info.sw > info.cw || errs.length) { console.log('  FAIL', w, 'Überlauf oder Fehler'); process.exitCode = 1; }
  const cols = await page.evaluate(() => getComputedStyle(document.querySelector('.plist')).gridTemplateColumns.split(' ').length);
  console.log('  Spalten der Liste', cols); if (cols !== 1) { console.log('  FAIL Liste nicht einspaltig'); process.exitCode = 1; }
  await page.close();
}
await browser.close();
