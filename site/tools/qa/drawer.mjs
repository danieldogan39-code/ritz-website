// Handy-Menü: Akkordeon Bild für Bild messen (Höhe, Lage des angetippten Eintrags, Sprünge)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] || (process.env.QA_OUT || 'qa-shots');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const page = await browser.newPage({ viewport: { width: 390, height: 744 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
await page.goto('http://localhost:8080/de/', { waitUntil: 'networkidle' });
await page.locator('[data-drawer-open]:visible').first().click(); // Telefon: Menüknopf der App-Leiste
await page.waitForTimeout(900);
const rec = (i) => page.evaluate(async (i) => {
  const sums = document.querySelectorAll('.mnav details > summary');
  const sm = sums[i];
  const d = sm.parentElement, ul = d.querySelector(':scope > ul');
  const others = [...document.querySelectorAll('.mnav details')].filter((x) => x !== d && x.open).map((x) => x.querySelector(':scope > ul'));
  const frames = [];
  const t0 = performance.now();
  sm.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  await new Promise((res) => { const f = () => { const r = ul.getBoundingClientRect(); frames.push([Math.round(performance.now() - t0), Math.round(r.height * 10) / 10, Math.round(sm.getBoundingClientRect().top * 10) / 10, others.map((o) => Math.round(o.getBoundingClientRect().height))]); if (performance.now() - t0 < 520) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  return frames;
}, i);
const report = (name, fr) => {
  let maxJump = 0, prevH = null, prevTop = null, maxTop = 0;
  for (const [t, h, top] of fr) { if (prevH !== null) maxJump = Math.max(maxJump, Math.abs(h - prevH)); if (prevTop !== null) maxTop = Math.max(maxTop, Math.abs(top - prevTop)); prevH = h; prevTop = top; }
  console.log(name, 'Bilder', fr.length, 'erste Höhen', fr.slice(0, 4).map((f) => f[1]).join(' / '), '… letzte', fr.slice(-2).map((f) => f[1]).join(' / '), 'größter Höhensprung/Bild', maxJump.toFixed(1), 'Eintrag bewegt max', maxTop.toFixed(1));
};
report('Produkte auf', await rec(0));
await page.screenshot({ path: `${out}/dr5-a.png` });
await page.evaluate(() => { const b = document.querySelector('.drawer__body'); const sm = document.querySelectorAll('.mnav details > summary')[2]; b.scrollTop += sm.getBoundingClientRect().top - 420; });
await page.waitForTimeout(200);
console.log('gescrollt', await page.evaluate(() => document.querySelector('.drawer__body').scrollTop));
report('Unternehmen auf (Produkte zu)', await rec(2));
await page.screenshot({ path: `${out}/dr5-b.png` });
report('Unternehmen zu', await rec(2));
report('Anwendungen auf', await rec(1));
console.log(errs.length ? errs : 'keine Fehler');
await browser.close();
