// Ladeverhalten unter Mobilfunkbedingungen (Chromium, 150 ms Latenz, 1,6 Mbit/s, CPU 4× gedrosselt, ohne Cache):
// FCP, LCP, CLS, TBT (Summe langer Aufgaben über 50 ms nach dem ersten Bild), Anfragen, übertragene Bytes, DOM-Knoten.
// Für aussagekräftige Werte den Server mit Komprimierung betreiben (wie Apache mit der mitgelieferten .htaccess);
// python3 -m http.server komprimiert nicht.   Aufruf: node tools/qa/perf.mjs [basis-url] [läufe]
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
const base = process.argv[2] || 'http://localhost:8080';
const runs = +(process.argv[3] || 1);
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : { channel: 'chrome' });
const PAGES = ['/de/', '/de/produkte/', '/de/produkte/niederspannung/', '/de/produkte/mittelspannung/gsef-10-45/', '/de/produktfinder/', '/de/anwendungen/energieversorgung-netze/', '/de/unternehmen/standorte/', '/de/karriere/', '/de/news/', '/en/', '/hu/'];
console.log('Seite'.padEnd(44), '  FCP', '  LCP', '  CLS', '  TBT', 'Req', '   KB', '  DOM');
const med = (a) => { const v = [...a].sort((x, y) => x - y); return v[(v.length - 1) >> 1]; };
for (const path of PAGES) {
  const all = [];
  for (let r = 0; r < runs; r++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    let bytes = 0, reqs = 0;
    cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; reqs++; });
    await page.addInitScript(() => {
      try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) { /* */ }
      window.__m = { lcp: 0, cls: 0, lt: [] };
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true });
    });
    await page.goto(base + path, { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(3000);
    const m = await page.evaluate(() => {
      const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;
      return { fcp, lcp: window.__m.lcp, cls: window.__m.cls, tbt: window.__m.lt.filter(([s]) => s >= fcp).reduce((a, [, d]) => a + Math.max(0, d - 50), 0), dom: document.getElementsByTagName('*').length };
    });
    all.push({ ...m, bytes, reqs });
    await ctx.close();
  }
  const k = (n) => med(all.map((x) => x[n]));
  console.log(path.padEnd(44), String(Math.round(k('fcp'))).padStart(5), String(Math.round(k('lcp'))).padStart(5), k('cls').toFixed(3), String(Math.round(k('tbt'))).padStart(5), String(k('reqs')).padStart(3), String(Math.round(k('bytes') / 1024)).padStart(5), String(k('dom')).padStart(5));
}
await browser.close();
