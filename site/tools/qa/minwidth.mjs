// Was erzwingt die Mindestbreite? Längste unteilbare Wörter und breiteste starre Elemente auf einer Seite (nach Scrollen).
// node tools/qa/minwidth.mjs 360 /hu/eszkozok/kalkulatorok/
import { chromium } from 'playwright-core';
const [w = '360', ...paths] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const page = await browser.newPage({ viewport: { width: +w, height: 860 }, isMobile: true, hasTouch: true });
await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro', '1'); } catch (e) {} });
for (const p of paths) {
  await page.goto('http://localhost:8080' + p, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } });
  const r = await page.evaluate(() => {
    const c = document.createElement('canvas').getContext('2d');
    const words = [];
    const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      const el = n.parentElement; if (!el || !el.offsetParent) continue;
      const cs = getComputedStyle(el);
      if (cs.overflowWrap === 'anywhere' || cs.wordBreak === 'break-all') continue;
      c.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const ws = cs.whiteSpace === 'nowrap' || cs.whiteSpace === 'pre' ? [n.textContent.trim()] : n.textContent.split(/[\s​-]+/);
      for (const x of ws) if (x.length > 6) { const wd = c.measureText(x).width * (cs.letterSpacing !== 'normal' ? 1.02 : 1); words.push([Math.round(wd), x, el.tagName.toLowerCase() + '.' + [...el.classList].join('.'), cs.fontSize]); }
    }
    words.sort((a, b) => b[0] - a[0]);
    return { sw: document.documentElement.scrollWidth, words: words.slice(0, 8) };
  });
  console.log(p, 'scrollWidth', r.sw); for (const x of r.words) console.log('  ', x.join('  '));
}
await browser.close();
