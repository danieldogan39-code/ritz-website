// Vorschau der Schemazeichnungen: alle Produkte ohne Foto als Karten + Detailansichten
// node tools/qa/pv-preview.mjs <outdir> [filter]
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { readDims } from '../../src/lib/dims.js';
import { productVisual, visualFamily } from '../../src/lib/visual.js';

const out = process.argv[2] || '/tmp/pv';
const filt = process.argv[3] || '';
fs.mkdirSync(out, { recursive: true });
const P = JSON.parse(fs.readFileSync('src/data/build/products.json', 'utf8'));
const I = JSON.parse(fs.readFileSync('src/data/build/images.json', 'utf8'));
const noimg = P.filter((p) => !(p.images || []).some((k) => I[k])).filter((p) => !filt || (p.dk?.n || p.kind).includes(filt) || p.code.includes(filt));
const css = fs.readFileSync('src/styles/visual.css', 'utf8');
// je Familie (dk.n) erste drei Produkte
const seen = {};
const pick = noimg.filter((p) => { const k = p.dk?.n || p.kind; seen[k] = (seen[k] || 0) + 1; return filt ? true : seen[k] <= 2; });
const fmt = (v) => String(+(+v).toFixed(1)).replace('.', ',');
const cards = pick.map((p) => { p.dm = readDims(p.desc); return `<figure><div class="st"><div class="pvw">${productVisual(p, { label: p.code })}</div></div><figcaption><b>${p.code}</b> ${p.dk?.n || p.kind} · ${visualFamily(p)}</figcaption></figure>`; }).join('');
const details = pick.slice(0, filt ? 12 : 40).map((p) => `<figure class="d"><div class="st4"><div class="pvw">${productVisual(p, { detail: true, label: p.code, fmt })}</div></div><figcaption><b>${p.code}</b> ${JSON.stringify(p.dm)}</figcaption></figure>`).join('');
const html = `<!doctype html><meta charset="utf-8"><style>:root{--stage:#eeedeb;--ease:cubic-bezier(.2,.7,.2,1);--line:#ddd;--muted:#666}body{font:13px Arial;margin:16px;background:#fff}
.g{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}.st{aspect-ratio:4/3}.st4{aspect-ratio:4/3}.dg{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:24px}figure{margin:0}figcaption{font-size:11px;padding:4px 0}${css}</style>
<div class="g">${cards}</div><div class="dg">${details}</div>`;
fs.writeFileSync(path.join(out, 'pv.html'), html);
const exe = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('file://' + path.resolve(out, 'pv.html'));
await (await page.$('.g')).screenshot({ path: path.join(out, 'cards.png') });
const dg = await page.$('.dg');
await dg.screenshot({ path: path.join(out, 'details.png') });
console.log('Karten', pick.length, 'Bytes je Karte ~', Math.round(cards.length / pick.length), errs.join('\n'));
await browser.close();
