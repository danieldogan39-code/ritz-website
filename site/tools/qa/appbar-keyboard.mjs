// App-Leiste und Bildschirmtastatur (Tastatur nachgestellt über eine kleinere sichtbare Fläche)
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.addInitScript(() => {
  try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {}
  // sichtbare Fläche steuerbar machen
  window.__vvH = null;
  const vv = window.visualViewport;
  const d = Object.getOwnPropertyDescriptor(VisualViewport.prototype, 'height');
  Object.defineProperty(vv, 'height', { get() { return window.__vvH ?? d.get.call(vv); } });
});
await page.goto('http://localhost:8080/de/produktfinder/', { waitUntil: 'networkidle' });
const st = () => page.evaluate(() => ({ typing: document.documentElement.classList.contains('is-typing'), bar: getComputedStyle(document.querySelector('.abar')).translate, focus: document.activeElement?.tagName }));
const kb = (h) => page.evaluate((h) => { window.__vvH = h; visualViewport.dispatchEvent(new Event('resize')); }, h);
let fails = 0;
const check = (ok, msg, st) => { if (!ok) fails++; console.log(ok ? '  ok  ' : '  FAIL', msg, JSON.stringify(st)); };
await page.locator('input[type="search"], input[type="text"]').first().tap();
await page.waitForTimeout(500);
let s = await st(); check(!s.typing, 'Fokus, Tastatur noch zu: Leiste bleibt', s);
await kb(500); await page.waitForTimeout(400);
s = await st(); check(s.typing, 'Tastatur offen: Leiste weicht', s);
await kb(null); await page.waitForTimeout(400);
s = await st(); check(!s.typing && s.focus === 'INPUT', 'Tastatur zu, Feld behält den Fokus: Leiste ist zurück', s);
await kb(500); await page.waitForTimeout(400);
s = await st(); check(s.typing, 'wieder offen: Leiste weicht', s);
await page.evaluate(() => document.activeElement.blur()); await kb(null); await page.waitForTimeout(400);
s = await st(); check(!s.typing, 'Feld verlassen: Leiste da', s);
await browser.close();
console.log(fails ? fails + ' FAIL' : 'alle ok');
process.exit(fails ? 1 : 0);
