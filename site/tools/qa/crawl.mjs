// Stichprobe über viele Seiten: Konsolenfehler, fehlerhafte Ressourcen, horizontale Überläufe, kaputte interne Links
// node tools/qa/crawl.mjs [basis-url] [breite] [anzahl-produkte]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { existsSync } from 'node:fs';
const base = process.argv[2] || 'http://localhost:8080';
const width = Number(process.argv[3] || 1440);
const nProducts = Number(process.argv[4] || 40);
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : { channel: 'chrome' });
const sm = fs.readFileSync('dist/sitemap.xml', 'utf8');
const all = [...sm.matchAll(/<loc>https:\/\/ritz-international\.com([^<]+)<\/loc>/g)].map((m) => m[1]);
const isProduct = (u) => /\/(produkte|products|produits|termekek|productos)\/[^/]+\/[^/]+\/$/.test(u);
const pages = all.filter((u) => !isProduct(u));
const prods = all.filter(isProduct).sort(() => Math.random() - 0.5).slice(0, nProducts);
const urls = [...pages, ...prods];
console.log(`Prüfe ${urls.length} Seiten (${pages.length} Inhaltsseiten, ${prods.length} Produkte) bei ${width}px`);
const problems = [];
const internal = new Set();
let i = 0;
async function worker() {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 });
  const page = await ctx.newPage();
  let cur = '';
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`${cur} console: ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => problems.push(`${cur} pageerror: ${e.message.slice(0, 160)}`));
  page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(base)) problems.push(`${cur} ${r.status()} ${r.url().replace(base, '')}`); });
  while (i < urls.length) {
    const u = urls[i++]; cur = u;
    try {
      await page.goto(base + u, { waitUntil: 'networkidle', timeout: 30000 });
      const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: document.documentElement.clientWidth, links: [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href').split('#')[0].split('?')[0]) }));
      if (r.sw > r.w + 1) problems.push(`${u} overflow ${r.sw}>${r.w}`);
      r.links.forEach((l) => internal.add(l));
    } catch (e) { problems.push(`${u} goto: ${e.message.slice(0, 100)}`); }
  }
  await ctx.close();
}
await Promise.all([worker(), worker(), worker(), worker()]);
// interne Links gegen dist prüfen
let broken = 0;
for (const l of internal) {
  if (!l || l.startsWith('//')) continue;
  const p = 'dist' + decodeURI(l);
  const ok = fs.existsSync(p) && (fs.statSync(p).isFile() || fs.existsSync(p + '/index.html') || fs.existsSync(p + 'index.html'));
  if (!ok) { broken++; if (broken <= 15) problems.push(`Link ohne Ziel: ${l}`); }
}
console.log(`Interne Links: ${internal.size}, ohne Ziel: ${broken}`);
console.log(problems.length ? problems.slice(0, 60).join('\n') : 'Keine Probleme gefunden.');
await browser.close();
