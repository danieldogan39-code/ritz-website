// Karten-Test: Darstellung, Regionen, Zoom, Pan, Auswahl, Liste, Filter
import { chromium } from 'playwright-core';
import { existsSync as __exists, mkdirSync as __mkdir } from 'node:fs';
// Browser: CHROMIUM_PATH, sonst vorinstallierte Headless-Shell, sonst installiertes Google Chrome
function launchOpts() { const p = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'; return __exists(p) ? { executablePath: p } : { channel: 'chrome' }; }
if (!process.argv[3]) __mkdir(process.env.QA_OUT || 'qa-shots/', { recursive: true });
const url = process.argv[2] || 'http://localhost:8080/de/unternehmen/standorte/';
const out = process.argv[3] || (process.env.QA_OUT || 'qa-shots/');
const vw = Number(process.argv[4] || 1440), vh = Number(process.argv[5] || 900);
const browser = await chromium.launch(launchOpts());
const page = await browser.newPage({ viewport: { width: vw, height: vh }, hasTouch: vw < 768, isMobile: vw < 768 });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.text()); });
page.on('pageerror', (e) => logs.push('pageerror ' + e.message));
await page.goto(url, { waitUntil: 'networkidle' });
const box = page.locator('[data-map]').first();
await box.scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
const info = await page.evaluate(() => {
  const b = document.querySelector('[data-map]');
  const q = (s) => [...b.querySelectorAll(s)];
  return {
    regions: q('[data-map-regions] button').map((x) => x.textContent.trim()),
    ctrl: q('.map__ctrl button').map((x) => ({ label: x.getAttribute('aria-label'), html: x.innerHTML.slice(0, 60), r: x.getBoundingClientRect().toJSON() })),
    markers: q('[data-id]').length,
    svg: !!b.querySelector('svg'),
    list: q('[data-map-list] [data-entry], [data-map-list] button, [data-map-list] a').length,
    skip: (() => { const s = b.querySelector('.skip'); const r = s.getBoundingClientRect(); return { r: r.toJSON(), vis: getComputedStyle(s).visibility, op: getComputedStyle(s).opacity, tr: getComputedStyle(s).transform, pos: getComputedStyle(s).position }; })(),
  };
});
console.log(JSON.stringify(info, null, 1));
await box.screenshot({ path: out + 'map0.png' });
// Zoom in, Pan
const canvas = page.locator('[data-map-canvas]').first();
const cb = await canvas.boundingBox();
await page.click('[data-map-zoom="in"]'); await page.waitForTimeout(350);
await page.click('[data-map-zoom="in"]'); await page.waitForTimeout(350);
await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
await page.mouse.down(); await page.mouse.move(cb.x + cb.width / 2 + 160, cb.y + cb.height / 2 + 60, { steps: 8 }); await page.mouse.up();
await page.waitForTimeout(300);
await box.screenshot({ path: out + 'map1.png' });
// Region Europa
const eu = page.locator('[data-map-regions] button').nth(1);
if (await eu.count()) { await eu.click(); await page.waitForTimeout(700); }
await box.screenshot({ path: out + 'map2.png' });
// Marker/Listeneintrag auswählen
const item = page.locator('[data-map-list] [data-entry]').first();
if (await item.count()) { await item.click(); await page.waitForTimeout(700); }
await box.screenshot({ path: out + 'map3.png' });
const detail = await page.$eval('[data-map-detail]', (d) => ({ hidden: d.hidden, text: d.textContent.replace(/\s+/g, ' ').trim().slice(0, 300) })).catch(() => null);
console.log('detail', JSON.stringify(detail));
// Filter
await page.fill('[data-map-filter]', 'Shanghai'); await page.waitForTimeout(400);
console.log('filtered', await page.$$eval('[data-map-list] [data-entry]', (els) => els.filter((e) => !e.hidden && e.offsetParent).map((e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 60))));
await box.screenshot({ path: out + 'map4.png' });
console.log(logs.join('\n'));
await browser.close();
