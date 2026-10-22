// Telefon: Blatt „Ansicht“ (Ebenen, Regionen) der Karte
import { chromium } from 'playwright-core';
const out = process.argv[2];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
let fails = 0;
const check = (ok, msg) => { if (!ok) fails++; console.log(ok ? '  ok  ' : '  FAIL', msg); };
const errs = [];
for (const [url, name] of [['/de/', 'home'], ['/de/kontakt/', 'con']]) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
  await page.goto('http://localhost:8080' + url, { waitUntil: 'networkidle' });
  await page.evaluate(() => { const s = document.querySelector('[data-nm-bar]'); scrollTo(0, s.getBoundingClientRect().top + scrollY - 90); });
  await page.waitForFunction(() => document.querySelector('[data-nm]')?.classList.contains('is-done'), null, { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.locator('[data-nm-viewbtn]').tap();
  await page.waitForTimeout(450);
  const st = await page.evaluate(() => { const v = document.querySelector('[data-nm-view]'); const r = v.getBoundingClientRect(); return { open: document.querySelector('[data-nm]').classList.contains('is-viewing'), role: v.getAttribute('role'), y: Math.round(r.top), h: Math.round(r.height), exp: document.querySelector('[data-nm-viewbtn]').getAttribute('aria-expanded'), focus: document.activeElement === v }; });
  console.log(name, JSON.stringify(st));
  check(st.open && st.role === 'dialog' && st.exp === 'true' && st.focus && st.y + st.h <= 845, `${name}: Blatt offen, Dialog, Fokus im Blatt`);
  await page.screenshot({ path: `${out}/mv-${name}-open.png` });
  // Ebene ausblenden → Punkt am Knopf
  await page.locator('[data-nm-view] [data-nm-layer="reps"]').tap();
  await page.waitForTimeout(250);
  const dot = await page.evaluate(() => document.querySelector('[data-nm-viewbtn]').classList.contains('has-filter'));
  check(dot, `${name}: ausgeblendete Ebene markiert den Knopf`);
  await page.locator('[data-nm-view] [data-nm-layer="reps"]').tap();
  await page.waitForTimeout(200);
  // Region wählen → Blatt schließt, Region aktiv
  await page.locator('[data-nm-view] [data-nm-region="europe"]').tap();
  await page.waitForTimeout(600);
  const st2 = await page.evaluate(() => ({ open: document.querySelector('[data-nm]').classList.contains('is-viewing'), eu: document.querySelector('[data-nm-region="europe"]').getAttribute('aria-pressed'), dot: document.querySelector('[data-nm-viewbtn]').classList.contains('has-filter') }));
  check(!st2.open && st2.eu === 'true' && !st2.dot, `${name}: Region gewählt, Blatt zu, Knopf ohne Markierung`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/mv-${name}-europe.png` });
  // Schleier antippen schließt
  await page.locator('[data-nm-viewbtn]').tap();
  await page.waitForTimeout(400);
  await page.touchscreen.tap(195, 60);
  await page.waitForTimeout(400);
  check(!(await page.evaluate(() => document.querySelector('[data-nm]').classList.contains('is-viewing'))), `${name}: Schleier schließt`);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check(sw <= 390, `${name}: kein seitliches Scrollen (${sw})`);
  await page.close();
}
// Desktop (Startseite): zwei feste Zeilen – Ebenen und Länderwahl oben, Regionen darunter; Knopf „Ansicht“ unsichtbar
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
await page.goto('http://localhost:8080/de/', { waitUntil: 'networkidle' });
await page.evaluate(() => { const s = document.querySelector('[data-nm-bar]'); scrollTo(0, s.getBoundingClientRect().top + scrollY - 120); });
await page.waitForTimeout(800);
const d = await page.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(); return { btn: getComputedStyle(document.querySelector('[data-nm-viewbtn]')).display, layers: Math.round(r('.nm__layers').top), regions: Math.round(r('.nm__regions').top), pick: Math.round(r('.nm__pick').top), bar: Math.round(r('[data-nm-bar]').height) }; });
console.log('desktop', JSON.stringify(d));
check(d.btn === 'none' && Math.abs(d.layers - d.pick) < 6 && d.regions > d.layers + 30 && d.bar < 130, 'Desktop: Ebenen und Länderwahl oben, Regionen darunter');
await page.screenshot({ path: `${out}/mv-desktop.png`, clip: { x: 0, y: 40, width: 1440, height: 140 } });
await browser.close();
console.log(errs.length ? errs.join('\n') : 'keine Fehler');
console.log(fails ? fails + ' FAIL' : 'alle ok');
