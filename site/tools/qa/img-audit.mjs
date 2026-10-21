// Bildprüfung: gerenderte Größe × Pixeldichte gegen tatsächliche Bildgröße; Seiten ohne Bild
// node tools/qa/img-audit.mjs [basisurl] [dpr]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8080';
const DPR = Number(process.argv[3] || 2);
const exe = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : { channel: 'chrome' });
const idx = JSON.parse(fs.readFileSync('dist/data/index.json', 'utf8')).products;
const paths = ['/de/', '/de/produkte/', '/de/produkte/mittelspannung/', '/de/produkte/niederspannung/', '/de/produkte/hochspannung/', '/de/produkte/elektronik-sensoren/', '/de/produkte/stromschienen-sis/', '/de/produkte/giessharzteile-duromer/', '/de/produktfinder/', '/de/anwendungen/', '/de/anwendungen/bahntechnik/', '/de/unternehmen/', '/de/unternehmen/standorte/', '/de/unternehmen/qualitaet/', '/de/unternehmen/verantwortung/', '/de/unternehmen/referenzen/', '/de/karriere/', '/de/karriere/ausbildung/', '/de/news/', '/de/downloads/', '/de/kontakt/', '/de/werkzeuge/', '/de/werkzeuge/spezifikations-check/', '/de/werkzeuge/wandler-rechner/', '/de/anfrage/',
  ...idx.filter((_, i) => i % 15 === 0).map((p) => `/de/produkte/${{ niederspannung: 'niederspannung', mittelspannung: 'mittelspannung', hochspannung: 'hochspannung', 'elektronik-sensoren': 'elektronik-sensoren', 'stromschienen-sis': 'stromschienen-sis', 'giessharzteile-duromer': 'giessharzteile-duromer' }[p.area]}/${p.id}/`)];
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: DPR });
const page = await ctx.newPage();
const rows = [], noimg = [];
for (const p of paths) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' }).catch(() => {});
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(400);
  const r = await page.evaluate((dpr) => [...document.images].filter((i) => i.offsetParent && i.getBoundingClientRect().width > 40).map((i) => {
    const b = i.getBoundingClientRect();
    const fit = getComputedStyle(i).objectFit;
    // bei cover/contain: tatsächlich benötigte Pixel
    const ratioImg = i.naturalWidth / i.naturalHeight, ratioBox = b.width / b.height;
    let need = b.width * dpr;
    if (fit === 'cover' && ratioImg > ratioBox) need = b.height * dpr * ratioImg;
    if (fit === 'contain' && ratioImg < ratioBox) need = b.height * dpr * ratioImg;
    const cur = (i.currentSrc || i.src).split('/').pop();
    const fileW = Number((cur.match(/-(\d+)\.webp$/) || [])[1]) || i.naturalWidth;
    const avail = Math.max(fileW, ...(i.srcset || '').split(',').map((x) => Number((x.trim().match(/\s(\d+)w$/) || [])[1]) || 0));
    return { src: cur, nat: fileW, avail, need: Math.round(need), up: +(need / fileW).toFixed(2), upMax: +(need / avail).toFixed(2), sizes: i.sizes, cls: i.className, box: Math.round(b.width) };
  }), DPR);
  const glyphs = await page.evaluate(() => document.querySelectorAll('.glyph, .plate:not(.plate--live)').length);
  if (!r.length) noimg.push(p);
  for (const x of r) rows.push({ page: p, ...x });
  console.log(p.padEnd(60), 'Bilder', String(r.length).padStart(3), 'hochskaliert>1.3:', r.filter((x) => x.up > 1.3).length, 'Platzhalter:', glyphs);
}
const sizesBad = rows.filter((x) => x.up > 1.3 && x.upMax <= 1.1);
console.log('\nFalsches sizes-Attribut (größere Variante vorhanden, aber kleine geladen):', sizesBad.length);
const sb = {};
for (const b of sizesBad) { const k = b.cls + ' | sizes=' + b.sizes; (sb[k] ||= { n: 0, ex: b.page + ' ' + b.src, box: b.box }).n++; }
for (const [k, v] of Object.entries(sb)) console.log(`  ${v.n}×  ${k}  (Box ${v.box}px, z. B. ${v.ex})`);
const bad = rows.filter((x) => x.upMax > 1.3);
const bySrc = {};
for (const b of bad) { const k = b.src.replace(/-\d+\.webp$/, ''); (bySrc[k] ||= { avail: b.avail, maxNeed: 0, pages: new Set() }); bySrc[k].maxNeed = Math.max(bySrc[k].maxNeed, b.need); bySrc[k].pages.add(b.page); }
console.log('\nQuelle zu klein (größte Variante < benötigt, DPR ' + DPR + '):', Object.keys(bySrc).length);
for (const [k, v] of Object.entries(bySrc).sort((a, b) => b[1].maxNeed / b[1].avail - a[1].maxNeed / a[1].avail).slice(0, 80)) console.log(`${(v.maxNeed / v.avail).toFixed(1)}×  ${k}  Quelle ${v.avail}px, benötigt ${v.maxNeed}px  (${[...v.pages].slice(0, 2).join(', ')})`);
console.log('\nSeiten ohne Bild:', noimg.join(' '));
fs.writeFileSync('/tmp/claude-0/-home-claude/aa80da2a-21a3-5cd4-8e1e-75b2af7584f4/scratchpad/img-audit.json', JSON.stringify(rows));
await browser.close();
