// Screenshots + Konsolenfehler + Überlaufprüfung
// node tools/shot.mjs <outdir> <width>x<height> <path> [<path> ...] [--full] [--dark] [--part=1800]
// --full: lädt per Scrollen alle Lazy-Bilder und speichert die ganze Seite in Teilen (<name>_partN.png)
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import fs from 'node:fs';
import { existsSync as __exists, mkdirSync as __mkdir } from 'node:fs';
// Browser: CHROMIUM_PATH, sonst vorinstallierte Headless-Shell, sonst installiertes Google Chrome
function launchOpts() { const p = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'; return __exists(p) ? { executablePath: p } : { channel: 'chrome' }; }
const args = process.argv.slice(2);
const out = args[0]; const [w, h] = args[1].split('x').map(Number);
const full = args.includes('--full'); const dark = args.includes('--dark');
const partH = Number((args.find((a) => a.startsWith('--part=')) || '--part=1800').slice(7));
const paths = args.slice(2).filter((a) => !a.startsWith('--'));
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch(launchOpts());
const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: dark ? 'dark' : 'light', isMobile: w < 768, hasTouch: w < 768 });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[failed] ${r.url()} ${r.failure()?.errorText}`));
page.on('response', (r) => { if (r.status() >= 400) logs.push(`[${r.status()}] ${r.url()}`); });
for (const p of paths) {
  const url = p.startsWith('http') ? p : 'http://localhost:8080' + p;
  logs.push(`--- ${p}`);
  await page.goto(url, { waitUntil: 'networkidle' }).catch((e) => logs.push('[goto] ' + e.message));
  await page.waitForTimeout(500);
  const name = (p.replace(/^https?:\/\/[^/]+/, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root') + (dark ? '_dark' : '') + '_' + w;
  await page.screenshot({ path: `${out}/${name}.png` });
  if (full) {
    // Lazy-Inhalte laden
    await page.evaluate(async () => {
      const H = document.documentElement.scrollHeight;
      for (let y = 0; y < H; y += Math.round(innerHeight * 0.8)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
      scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(400);
    const buf = await page.screenshot({ fullPage: true });
    const meta = await sharp(buf).metadata();
    const n = Math.ceil(meta.height / partH);
    for (let i = 0; i < n; i++) {
      const top = i * partH; const hh = Math.min(partH, meta.height - top);
      await sharp(buf).extract({ left: 0, top, width: meta.width, height: hh }).png().toFile(`${out}/${name}_part${i}.png`);
    }
    logs.push(`[full] ${meta.height}px → ${n} Teile`);
  }
  // horizontale Überläufe
  const ov = await page.evaluate(() => { const W = document.documentElement.clientWidth; const bad = []; for (const el of document.querySelectorAll('body *')) { const r = el.getBoundingClientRect(); if (r.right > W + 1 && r.width > 0 && !(el.ownerSVGElement) && getComputedStyle(el).position !== 'fixed' && !el.closest('[data-overflow-ok]')) bad.push(el.tagName.toLowerCase() + '.' + [...el.classList].join('.') + ' ' + Math.round(r.right)); if (bad.length > 8) break; } return { sw: document.documentElement.scrollWidth, W, bad }; });
  if (ov.sw > ov.W + 1) logs.push(`[overflow] scrollWidth ${ov.sw} > ${ov.W}: ${ov.bad.join(' | ')}`);
  // Bilder ohne Inhalt
  const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.loading !== 'lazy').map((i) => i.currentSrc || i.src).slice(0, 8));
  if (broken.length) logs.push(`[img] defekt: ${broken.join(' ')}`);
}
fs.writeFileSync(`${out}/log_${w}${dark ? '_dark' : ''}.txt`, logs.join('\n'));
console.log(logs.join('\n'));
await browser.close();
