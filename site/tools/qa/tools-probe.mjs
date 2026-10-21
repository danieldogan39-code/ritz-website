// Schnelltest Werkzeuge: node tools/qa/tools-probe.mjs <outdir> [width] [de|en|fr|hu|es]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = process.argv[2] || '/tmp/tools-probe'; const W = Number(process.argv[3] || 1440); const L = process.argv[4] || 'de';
const PATHS = { de: ['/de/werkzeuge/spezifikations-check/', '/de/werkzeuge/wandler-rechner/'], en: ['/en/tools/specification-check/', '/en/tools/calculators/'], fr: ['/fr/outils/analyse-specification/', '/fr/outils/calculateurs/'], hu: ['/hu/eszkozok/specifikacio-ellenorzes/', '/hu/eszkozok/kalkulatorok/'], es: ['/es/herramientas/analisis-especificacion/', '/es/herramientas/calculadoras/'] }[L];
fs.mkdirSync(out, { recursive: true });
const exe = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : { channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: W, height: 1000 }, isMobile: W < 768, hasTouch: W < 768 });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400) logs.push(`[${r.status()}] ${r.url()}`); });
await page.goto('http://localhost:8080' + PATHS[0], { waitUntil: 'networkidle' });
await page.click('[data-sc-example="0"]');
await page.waitForSelector('.scp', { timeout: 15000 });
await page.waitForTimeout(400);
console.log('Status:', await page.textContent('[data-sc-status]'));
console.log('Karten:', await page.$$eval('.scp:not(.scp--pre)', (els) => els.map((e) => e.querySelector('.scp__ref')?.textContent + ' → ' + (e.querySelector('.scp__name b')?.textContent || '-') + ' ' + (e.querySelector('.scp__score b')?.textContent || '') + ' [' + e.className.replace('scp ', '') + ']')));
await page.screenshot({ path: `${out}/check-${L}-${W}.png`, fullPage: true });
await page.click('[data-sc-example="1"]');
await page.waitForTimeout(800);
console.log('E-Mail:', await page.$$eval('.scp:not(.scp--pre)', (els) => els.map((e) => e.querySelector('.scp__ref')?.textContent + ' → ' + (e.querySelector('.scp__name b')?.textContent || '-') + ' ' + (e.querySelector('.scp__score b')?.textContent || ''))));
await page.click('[data-sc-example="2"]');
await page.waitForTimeout(800);
console.log('Excel:', await page.$$eval('.scp:not(.scp--pre)', (els) => els.map((e) => e.querySelector('.scp__ref')?.textContent + ' → ' + (e.querySelector('.scp__name b')?.textContent || '-') + ' ' + (e.querySelector('.scp__score b')?.textContent || ''))));
await page.screenshot({ path: `${out}/check-excel-${L}-${W}.png`, fullPage: true });
await page.click('[data-sc-addall]');
await page.waitForTimeout(300);
console.log('Projektmappe:', await page.evaluate(() => JSON.parse(localStorage.getItem('ritz-basket') || '[]').map((i) => `${i.qty}× ${i.code} ref=${i.ref} special=${i.special}`)));
// Rechner
await page.goto('http://localhost:8080' + PATHS[1], { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/calc-${L}-${W}.png`, fullPage: true });
for (const c of ['factor', 'short', 'primary', 'vt']) {
  await page.click(`[data-tab="${c}"]`);
  await page.waitForTimeout(250);
  console.log(c, (await page.textContent(`[data-out="${c}"] .kpis`))?.replace(/\s+/g, ' ').trim());
  await page.screenshot({ path: `${out}/calc-${c}-${L}-${W}.png`, fullPage: true });
}
console.log('URL:', page.url());
console.log(logs.join('\n') || 'keine Konsolenfehler');
await browser.close();
