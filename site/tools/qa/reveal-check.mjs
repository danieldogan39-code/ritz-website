// Einblenden beim Scrollen (data-reveal) auf beliebigen Seiten: nach dem Durchscrollen muss alles eingeblendet sein
// node tools/qa/reveal-check.mjs [breite] /de/ /de/unternehmen/ …
import { chromium } from 'playwright-core';
const [w = '1440', ...paths] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
let bad = 0;
for (const p of paths.length ? paths : ['/de/', '/de/unternehmen/', '/de/werkzeuge/']) {
  const page = await browser.newPage({ viewport: { width: +w, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro', '1'); } catch (e) {} });
  await page.goto('http://localhost:8080' + p, { waitUntil: 'networkidle' });
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 600) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(90); }
  await page.waitForTimeout(3000);
  const r = await page.evaluate(() => ({ rv: document.documentElement.classList.contains('rv'), all: document.querySelectorAll('[data-reveal]').length,
    out: [...document.querySelectorAll('[data-reveal]')].filter((e) => !e.classList.contains('is-in')).map((e) => e.className.slice(0, 40)),
    hidden: [...document.querySelectorAll('[data-reveal], [data-reveal] *')].filter((e) => { const cs = getComputedStyle(e); return cs.opacity === '0' && e.getBoundingClientRect().width > 4 && !e.closest('[aria-hidden="true"], .vaxis, .intro, .org__svg, .org__glow, .hx__frame, .hx__tip, .st__hud, .hud') && !e.matches('.org__glow, .vh, input'); }).map((e) => e.tagName.toLowerCase() + '.' + [...e.classList].join('.')).slice(0, 6) }));
  if (r.out.length || r.hidden.length || errs.length) bad++;
  console.log(p, r.rv ? 'rv' : 'ohne rv', r.all, r.out.length ? 'nicht eingeblendet: ' + r.out.join(', ') : 'ok', r.hidden.length ? 'unsichtbar: ' + r.hidden.join(', ') : '', errs.join(' '));
  await page.close();
}
await browser.close();
process.exit(bad ? 1 : 0);
