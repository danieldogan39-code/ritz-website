import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const paths = { de: '/de/', en: '/en/', fr: '/fr/', hu: '/hu/', es: '/es/' };
for (const [lang, p] of Object.entries(paths)) {
  for (const w of [1181, 1240, 1300, 1440, 375, 414, 768]) {
    const page = await browser.newPage({ viewport: { width: w, height: 700 } });
    await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
    await page.goto('http://localhost:8080' + p, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const nav = document.querySelector('.nav'); const tools = document.querySelector('.hdr__tools'); const logo = document.querySelector('.hdr .logo');
      const nr = getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect() : logo.getBoundingClientRect();
      const tr = tools.getBoundingClientRect();
      return { gap: Math.round(tr.left - nr.right), over: document.documentElement.scrollWidth - innerWidth, h: Math.round(document.querySelector('.hdr__bar').getBoundingClientRect().height), fh: Math.round(document.querySelector('.hdr__finder').getBoundingClientRect().height) };
    });
    if (r.gap < 8 || r.over > 0 || r.fh > 42) console.log('PROBLEM', lang, w, JSON.stringify(r)); else console.log('ok', lang, w, JSON.stringify(r));
    await page.close();
  }
}
await browser.close();
