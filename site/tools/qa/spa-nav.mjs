// Vorschau (SPA): Karte auf Start, Standorte, Kontakt; schnelles Hin- und Herwechseln; Konsolenfehler
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const out = (process.env.QA_OUT || 'qa-shots');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push(String(e)));
await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
await page.goto('http://localhost:8081/index.html#de', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const toMap = () => page.evaluate(() => { const s = document.querySelector('[data-nm-stage]'); if (s) scrollTo(0, s.getBoundingClientRect().top + scrollY - 140); });
const mapState = () => page.evaluate(() => { const m = document.querySelector('[data-nm]'); return m ? `${m.dataset.nmMode} ${m.className} marker=${m.querySelectorAll('.nm__mk').length}` : 'keine Karte'; });
await toMap();
await page.waitForTimeout(5000);
console.log('Start', await mapState());
for (const h of ['#de.unternehmen.standorte', '#de.kontakt']) {
  await page.evaluate((h) => { location.hash = h; }, h);
  await page.waitForTimeout(1500);
  await toMap();
  await page.waitForTimeout(4500);
  console.log(h, await mapState());
  await page.locator('.nm__entry').nth(2).click();
  await page.waitForTimeout(1200);
  console.log('  Karte', await page.evaluate(() => document.querySelector('[data-nm-card]').className));
  await page.screenshot({ path: `${out}/spa-${h.slice(4).replace(/\./g, '-')}.png` });
}
// schnelles Wechseln mit laufender Karte
const hs = ['#de', '#de.unternehmen.standorte', '#de.kontakt', '#en', '#en.contact', '#de'];
for (let i = 0; i < 24; i++) {
  await page.evaluate((h) => { location.hash = h; }, hs[i % hs.length]);
  await page.waitForTimeout(80 + (i % 4) * 120);
  if (i % 3 === 0) await toMap();
  if (i % 5 === 0) { await page.mouse.move(500 + i * 10, 500); await page.mouse.move(700, 520, { steps: 4 }); }
}
await page.waitForTimeout(2500);
await toMap();
await page.waitForTimeout(4000);
console.log('Ende', await mapState(), await page.evaluate(() => [location.hash, document.querySelector('h1')?.textContent?.slice(0, 40), document.querySelectorAll('[data-nm]').length, document.body.className]));
await page.waitForTimeout(4000);
console.log('Ende+4s', await mapState());
console.log(errs.length ? 'FEHLER:\n' + errs.join('\n') : 'keine Konsolenfehler');
await browser.close();
