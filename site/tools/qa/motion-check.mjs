// Bewegung prüfen: Nach vollständigem Durchscrollen darf kein Inhalt oberhalb des Fensters unsichtbar oder verschoben
// bleiben (Scroll-Zeitachsen, Einblendungen), keine Konsolenfehler.   node tools/qa/motion-check.mjs [breite] pfad …
import { chromium } from 'playwright-core';
const [w = '1440', ...paths] = process.argv.slice(2);
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch({ executablePath: exe });
const mob = +w < 700;
const page = await browser.newPage({ viewport: { width: +w, height: mob ? 844 : 900 }, isMobile: mob, hasTouch: mob });
await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
let bad = 0;
for (const p of paths) {
  await page.goto('http://localhost:8080' + p, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= H; y += 400) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(60); }
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const out = [];
    let n = 0;
    for (const el of document.querySelectorAll('body *')) {
      const an = el.getAnimations ? el.getAnimations().filter((a) => /^sv/.test(a.animationName || '') && !/^sv(Drift|Pan|PanS|Progress)$/.test(a.animationName)) : [];
      if (!an.length) continue;
      n++;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height || b.bottom > 0) continue; // nur, was ganz oberhalb des Fensters liegt
      const cs = getComputedStyle(el);
      const op = parseFloat(cs.opacity);
      const moved = an.some((a) => a.animationName === 'svRise') && cs.translate !== 'none' && cs.translate !== '0px';
      if (op < 0.99 || moved) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} op=${op} tr=${cs.translate}`);
      if (out.length > 6) break;
    }
    return { live: CSS.supports('animation-timeline: view()'), n, out };
  });
  if (r.out.length) bad++;
  console.log(p, r.live ? `${r.n} bewegte Elemente` : '(ohne Scroll-Zeitachsen)', r.out.length ? '\n  ' + r.out.join('\n  ') : 'ok');
}
console.log(errs.length ? errs.join('\n') : 'keine Konsolenfehler');
await browser.close();
process.exit(bad || errs.length ? 1 : 0);
