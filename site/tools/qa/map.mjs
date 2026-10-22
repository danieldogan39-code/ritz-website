// Karten-Test (Weltkarte „Weltweit vernetzt“, Baustein src/views/netmap.js): Aufbau, Regionen, Liste, Suche, Karte,
// Tastatur. Aufruf: node tools/qa/map.mjs [url] [ausgabeordner] [breite] [höhe]
// Ausführlichere Prüfungen: _nm5.mjs (Andocken, Zoom folgt, Stresstest), _nmtouch.mjs, _axe-nm.mjs, _spa5.mjs
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const url = process.argv[2] || 'http://localhost:8080/de/kontakt/';
const out = process.argv[3] || process.env.QA_OUT || 'qa-shots/';
mkdirSync(out, { recursive: true });
const vw = Number(process.argv[4] || 1440), vh = Number(process.argv[5] || 900);
const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : { channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: vw, height: vh }, hasTouch: vw < 768, isMobile: vw < 768 });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.text()); });
page.on('pageerror', (e) => logs.push('pageerror ' + e.message));
await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
await page.goto(url, { waitUntil: 'networkidle' });
const toMap = () => page.evaluate(() => { const s = document.querySelector('[data-nm-stage]'); scrollTo(0, s.getBoundingClientRect().top + scrollY - 120); });
await toMap(); await page.waitForTimeout(500); await toMap();
await page.waitForFunction(() => document.querySelector('[data-nm]')?.classList.contains('is-done'), null, { timeout: 15000 });
const info = await page.evaluate(() => {
  const m = document.querySelector('[data-nm]');
  return { mode: m.dataset.nmMode, markers: m.querySelectorAll('.nm__mk').length, sites: m.querySelectorAll('.nm__mk--site, .nm__mk--hq').length, list: m.querySelectorAll('.nm__entry').length, regions: [...m.querySelectorAll('[data-nm-region]')].map((b) => b.textContent.trim()) };
});
console.log(JSON.stringify(info));
await page.screenshot({ path: `${out}/map-${vw}.png` });
for (const r of ['europe', 'americas', 'world']) { await page.locator(`[data-nm-region="${r}"]`).click(); await page.waitForTimeout(950); }
if (info.list) {
  const q = page.locator('[data-nm-q]');
  if (await q.count()) { await q.fill('deutsch'); await page.waitForTimeout(500); console.log('Suche „deutsch“:', await page.locator('[data-nm-count]').innerText()); await q.fill(''); await page.waitForTimeout(500); }
  await page.locator('.nm__entry').first().click();
  await page.waitForTimeout(1000);
  console.log('Liste → Karte:', await page.evaluate(() => { const c = document.querySelector('[data-nm-card]'); return c.hidden ? 'zu' : c.querySelector('.nm__title')?.textContent; }));
}
await page.keyboard.press('Escape');
await page.focus('.nm__mk:not([tabindex="-1"])');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('Enter');
await page.waitForTimeout(700);
console.log('Tastatur → Karte:', await page.evaluate(() => { const c = document.querySelector('[data-nm-card]'); return c.hidden ? 'zu' : c.querySelector('.nm__title')?.textContent; }));
await page.screenshot({ path: `${out}/map-${vw}-pin.png` });
console.log(logs.length ? logs.join('\n') : 'keine Konsolenfehler');
await browser.close();
