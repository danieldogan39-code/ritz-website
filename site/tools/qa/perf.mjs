// Ladeverhalten unter Mobilfunkbedingungen: LCP, CLS, Anfragen, übertragene Bytes (Chromium, CPU 4× gedrosselt)
// node tools/qa/perf.mjs [basis-url]
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
const base = process.argv[2] || 'http://localhost:8080';
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : { channel: 'chrome' });
const PAGES = ['/de/', '/de/produkte/', '/de/produkte/mittelspannung/gsef-10-45/', '/de/produktfinder/', '/de/unternehmen/standorte/', '/en/', '/de/news/'];
console.log('Seite'.padEnd(44), 'LCP ms', ' CLS ', 'Req', '   KB');
for (const path of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let bytes = 0, reqs = 0;
  cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; reqs++; });
  await page.addInitScript(() => {
    window.__lcp = 0; window.__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const { lcp, cls } = await page.evaluate(() => ({ lcp: window.__lcp, cls: window.__cls }));
  console.log(path.padEnd(44), String(Math.round(lcp)).padStart(6), cls.toFixed(3), String(reqs).padStart(4), String(Math.round(bytes / 1024)).padStart(6));
  await ctx.close();
}
await browser.close();
