// Breite Elemente nach vollständigem Scrollen finden (ohne Inhalte in Scroll-/Clip-Containern): node tools/qa/wide.mjs /hu/eszkozok/kalkulatorok/ …
import { chromium } from 'playwright-core';
const exe = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 360, height: 860 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
for (const p of process.argv.slice(2)) {
  await page.goto('http://localhost:8080' + p, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } });
  const r = await page.evaluate(() => {
    const W = 360, out = [];
    const clipped = (el) => { for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) { const cs = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) return true; } return false; };
    for (const el of document.querySelectorAll('body *')) {
      if (el.ownerSVGElement) continue;
      const b = el.getBoundingClientRect();
      if (b.right > W + 1 && b.width > 0 && !clipped(el)) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} r=${Math.round(b.right)} w=${Math.round(b.width)} "${(el.textContent || '').trim().slice(0, 40)}"`);
      if (out.length > 8) break;
    }
    return { sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, out };
  });
  console.log(p, 'scrollWidth', r.sw, r.bw, '\n  ' + r.out.join('\n  '));
}
await browser.close();
