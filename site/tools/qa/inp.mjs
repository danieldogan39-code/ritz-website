// Reaktionszeit typischer Interaktionen (Event Timing wie INP, CPU 4× gedrosselt): Zeit von der Eingabe bis zum
// nächsten Bild, je Interaktion der schlechteste Wert. Richtwert: unter 200 ms gilt als gut (auf echten Mittelklasse-
// Telefonen; die Drosselung bildet das grob nach).   Aufruf: node tools/qa/inp.mjs [Basis-URL]
import { chromium } from 'playwright-core';

const base = process.argv[2] || 'http://localhost:8080';
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch({ executablePath: exe });
const rows = [];
async function run(name, path, vp, act) {
  const mob = vp.width < 700;
  const ctx = await browser.newContext({ viewport: vp, isMobile: mob, hasTouch: mob });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) { /* */ }
    window.__ev = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) window.__ev.push([e.name, Math.round(e.duration)]); }).observe({ type: 'event', durationThreshold: 16, buffered: true });
  });
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => { window.__ev = []; });
  try { await act(page); } catch (e) { rows.push([name, 'Fehler: ' + e.message.split('\n')[0]]); await ctx.close(); return; }
  await page.waitForTimeout(800);
  const ev = await page.evaluate(() => window.__ev);
  const worst = ev.reduce((m, e) => (e[1] > m[1] ? e : m), ['–', 0]);
  rows.push([name, `${worst[1]} ms (${worst[0]})`]);
  await ctx.close();
}
const D = { width: 1440, height: 900 }, M = { width: 390, height: 844 };
await run('Mega-Menü öffnen', '/de/news/', D, (p) => p.click('[data-mega]'));
await run('Suche: Tippen', '/de/news/', D, async (p) => { await p.click('[data-search-open]'); await p.waitForTimeout(300); await p.keyboard.type('GSE 24', { delay: 120 }); });
await run('Produktfinder: Filter', '/de/produktfinder/', D, async (p) => { await p.click('input[type=checkbox] >> nth=0', { force: true }); await p.waitForTimeout(400); await p.click('input[type=checkbox] >> nth=3', { force: true }); });
await run('Produktfinder: Filter (Telefon)', '/de/produktfinder/', M, async (p) => { await p.click('[data-filters-open]'); await p.waitForTimeout(400); await p.click('input[type=checkbox] >> nth=0', { force: true }); });
await run('Bereich: Vergleichen', '/de/produkte/niederspannung/', D, async (p) => { await p.click('[data-compare-toggle] >> nth=0'); await p.waitForTimeout(300); await p.click('[data-basket-add] >> nth=1'); });
await run('Anwendung: Reiter', '/de/anwendungen/energieversorgung-netze/', D, async (p) => { await p.click('[data-sc-tab="2"]'); await p.waitForTimeout(300); await p.click('[data-sc-tab="3"]'); });
await run('Produkt: Reiter', '/de/produkte/mittelspannung/asn/', D, (p) => p.click('.pd-tabs__list a >> nth=1'));
await run('Downloads: Suche', '/de/downloads/', D, async (p) => { await p.click('[data-dl-q]'); await p.keyboard.type('Datenblatt', { delay: 120 }); });
await run('Karriere: Standort', '/de/karriere/', D, (p) => p.click('[data-jb-loc] >> nth=1'));
await run('Theme umschalten', '/de/news/', D, async (p) => { const b = await p.$('[data-theme-set="dark"], [data-theme="dark"]'); if (b) await b.click(); });
for (const [n, v] of rows) console.log(n.padEnd(34), v);
await browser.close();
