// RITZ Relaunch – Build: statische Website (dist/) und Vorschau (artifact/)
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import sharp from 'sharp';
import * as esbuild from 'esbuild';
import { geoEqualEarth, geoPath } from 'd3-geo';
import * as topojson from 'topojson-client';
import { presimplify, simplify, quantile } from 'topojson-simplify';
import { LANGS, AREAS, SECTORS, pathFor, dataLang, LOCALES, LANG_NAMES } from './src/lib/routes.js';
import { makeCtx, newsSlugFor, spaHash } from './src/lib/ctx.js';
import { renderRoute } from './src/views/render.js';
import { header, drawer, footer, searchOverlay } from './src/views/layout.js';
import { descriptor } from './src/lib/product.js';
import { esc } from './src/lib/util.js';
import { locAddress } from './src/lib/geo.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); // Projektordner (raw/, site/, tools/)
const SRC = 'src';
const DIST = process.env.DIST || 'dist';
const ART = process.env.ART || 'artifact';
// Nach der Dokumentenmigration: DOCBASE=/dokumente/ setzt alle Dokumentlinks auf den eigenen Server
const DOCBASE = process.env.DOCBASE || null;
// SITE: Adresse für canonical, hreflang, og: und Sitemap. DRAFT=1: Entwurfsfassung (z. B. GitHub Pages) – für
// Suchmaschinen gesperrt, Formulare im Vorschaumodus (nichts wird versendet), Startadresse zeigt die deutsche
// Startseite direkt (keine Weiterleitung), kein PHP, keine Projektunterlagen.
const SITE = (process.env.SITE || 'https://ritz-international.com').replace(/\/$/, '');
const DRAFT = !!process.env.DRAFT;
const ONLY = process.env.ONLY || 'all'; // all | static | spa
const t0 = Date.now();
// Versionskennung für Cache-Busting: Prüfsumme über Quellcode und Daten (gleicher Stand → gleiche Kennung)
const V = (() => {
  const h = crypto.createHash('md5');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else h.update(path.relative(here, p)).update(fs.readFileSync(p));
    }
  };
  walk(path.join(here, SRC));
  h.update(fs.readFileSync(fileURLToPath(import.meta.url)));
  return h.digest('hex').slice(0, 8);
})();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const rd = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const wr = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };

// ---------------- Daten ----------------
const B = `${SRC}/data/build`;
const products = rd(`${B}/products.json`);
const docs = rd(`${B}/docs.json`);
const news = rd(`${B}/news.json`);
const jobs = rd(`${B}/jobs.json`);
const images = rd(`${B}/images.json`);
const oldurls = rd(`${B}/oldurls.json`);
const contacts = rd(`${SRC}/data/contacts.json`);
const world = rd(`${SRC}/assets/worldmap.json`);
const docsById = Object.fromEntries(docs.map((d) => [d.id, d]));
const data = { products, docs, docsById, news, jobs, contacts, worldmeta: { W: world.W, H: world.H, scale: world.scale, translate: world.translate } };

// Wörterbücher
const dicts = {};
const missingLangs = [];
for (const l of LANGS) {
  const f = `${SRC}/i18n/${l}.js`;
  if (fs.existsSync(f)) dicts[l] = (await import(pathToFileURL(path.resolve(f)) + '?v=' + V)).default;
  else { missingLangs.push(l); dicts[l] = { ...(await import(pathToFileURL(path.resolve(`${SRC}/i18n/en.js`)))).default, meta: { ...(await import(pathToFileURL(path.resolve(`${SRC}/i18n/en.js`)))).default.meta, lang: l } }; }
}
if (missingLangs.length) log('WARNUNG: Sprachdatei fehlt, Englisch als Ersatz:', missingLangs.join(', '));

// ---------------- Bilder ----------------
const IMG_SRC = { mimg: `${ROOT}/raw/img/mimg`, pimg: `${ROOT}/raw/img/pimg`, misc: `${ROOT}/raw/img/misc` };
const nameOf = (key) => key.replace(/\.(webp|png|jpe?g)$/i, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/-+/g, '-');
const PROD_WIDTHS = [320, 640, 960, 1280, 1920];
const manifest = {};
async function edgeTone(src, w, h) {
  const k = 3;
  const strips = [[0, 0, w, k], [0, h - k, w, k], [0, 0, k, h], [w - k, 0, k, h]];
  let sum = 0;
  for (const [left, top, width, height] of strips) {
    const st = await sharp(src).extract({ left, top, width, height }).removeAlpha().stats();
    sum += (st.channels[0].mean + st.channels[1].mean + st.channels[2].mean) / 3;
  }
  return sum / strips.length;
}

async function processImages() {
  const cacheDir = `${ROOT}/site/.imgcache`;
  fs.mkdirSync(cacheDir, { recursive: true });
  const entries = Object.entries(images);
  // misc (Förderlogo etc.)
  if (fs.existsSync(IMG_SRC.misc)) for (const f of fs.readdirSync(IMG_SRC.misc)) if (/\.(png|jpe?g|webp)$/i.test(f)) entries.push([`misc/${f.replace(/\.(png|jpe?g)$/i, '')}`, { file: f, dir: 'misc' }]);
  let n = 0;
  const edgeFile = `${cacheDir}/edges.json`;
  const edgeCache = fs.existsSync(edgeFile) ? JSON.parse(fs.readFileSync(edgeFile, 'utf8')) : {};
  await Promise.all(entries.map(async ([key, m]) => {
    const src = path.join(IMG_SRC[m.dir], m.file);
    if (!fs.existsSync(src)) return;
    const meta = await sharp(src).metadata();
    const w = meta.width, h = meta.height;
    const ws = PROD_WIDTHS.filter((x) => x < w);
    if (!ws.length || w - ws[ws.length - 1] > 80) ws.push(w);
    const nm = nameOf(key);
    for (const x of ws) {
      const out = `${cacheDir}/${nm}-${x}.webp`;
      if (!fs.existsSync(out)) {
        await sharp(src).resize({ width: x, withoutEnlargement: true }).webp({ quality: meta.hasAlpha ? 88 : 76, alphaQuality: 90, effort: 4 }).toFile(out);
        n++;
      }
    }
    // Randfarbe: weiße Freisteller werden eingepasst, Studio-/Szenenfotos füllen die Bühne
    const ck = `${m.file}|${fs.statSync(src).size}`;
    const edge = edgeCache[ck] ?? (edgeCache[ck] = await edgeTone(src, w, h));
    manifest[key] = { n: nm, w, h, ws, ...(edge >= 245 ? { bg: 'w' } : {}) };
  }));
  fs.writeFileSync(edgeFile, JSON.stringify(edgeCache));
  log('Bilder:', Object.keys(manifest).length, 'Motive,', n, 'neue Varianten');
  return cacheDir;
}

// ---------------- Weltkarte (Teaser) ----------------
function worldLite(fill = '#cfcac4') {
  let topo = rd('node_modules/world-atlas/countries-110m.json');
  topo = presimplify(topo);
  topo = simplify(topo, quantile(topo, 0.3));
  const geoms = topo.objects.countries.geometries.filter((g) => g.id !== '010');
  const proj = geoEqualEarth().scale(world.scale).translate(world.translate);
  const d = geoPath(proj).digits(0)(topojson.merge(topo, geoms));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${world.W} ${world.H}"><path fill="${fill}" d="${d}"/></svg>`;
}

// Detailreiche Landfläche als referenzierbarer Pfad (für Kartenausschnitte per <use>, Farbe per CSS)
function worldLand() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${world.W} ${world.H}"><path id="land" d="${world.land}"/></svg>`;
}

// ---------------- Routen ----------------
function allRoutes(lang) {
  const R = [];
  const add = (id, p = {}, extra = {}) => R.push({ id, p, ...extra });
  for (const id of ['home', 'products', 'finder', 'compare', 'inquiry', 'sectors', 'company', 'locations', 'quality', 'responsibility', 'references', 'downloads', 'contact', 'career', 'training', 'internships', 'news', 'imprint', 'privacy', 'search']) add(id);
  for (const a of AREAS) add('area', { area: a });
  for (const s of SECTORS) add('sector', { sector: s });
  for (const p of products) add('product', { area: p.area, slug: p.id }, { product: p });
  for (const n of news) add('article', { slug: newsSlugFor(n, lang) }, { news: n });
  return R;
}

// ---------------- HTML-Rahmen ----------------
function themeScript() {
  return `<script>(function(){var d=document.documentElement;d.dataset.hostTheme=d.dataset.theme||'';try{var t=JSON.parse(localStorage.getItem('ritz-theme')||'"auto"');if(t==='light'||t==='dark')d.dataset.theme=t}catch(e){}})()</script>`;
}
// Bewegung: setzt vor dem ersten Bild :root.rv (Ausgangszustände fürs Einblenden) und startet auf der
// Startseite einmal je Sitzung das Intro (data-intro: play → out → entfernt). Überspringen per Klick, Taste,
// Mausrad oder Wischen; bei reduzierter Bewegung passiert nichts. mode: 'home' | 'spa' (Startseite am Hash).
function motionScript(mode) {
  const isHome = mode === 'spa' ? "(function(h){return !h||h==='#'||/^#(de|en|fr|hu|es)$/.test(h)})(location.hash)" : 'true';
  return `<script>(function(d){try{
if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
if('IntersectionObserver' in window){d.classList.add('rv');setTimeout(function(){if(!d.classList.contains('rv-ok'))d.classList.remove('rv')},4000)}
if(!${isHome})return;
try{var s=sessionStorage;if(s.getItem('ritz-intro'))return;s.setItem('ritz-intro','1')}catch(e){}
d.setAttribute('data-intro','play');
var done=0,EV=['pointerdown','keydown','wheel','touchstart'];
function q(x){return document.querySelector(x)}
function off(){d.removeAttribute('data-intro');var x=document.querySelectorAll('.intro,.intro__skip');for(var i=0;i<x.length;i++)x[i].parentNode.removeChild(x[i])}
function end(skip){if(done)return;done=1;
for(var i=0;i<EV.length;i++)removeEventListener(EV[i],onSkip,true);
var o=q('.intro');if(!o){off();return}
var lg=o.querySelector('.intro__logo'),sv=lg&&lg.querySelector('svg'),hd=q('.hdr .logo svg');
if(!skip&&sv&&hd){var a=sv.getBoundingClientRect(),b=hd.getBoundingClientRect();
if(a.width&&b.width){lg.style.setProperty('--fx',(b.left+b.width/2-a.left-a.width/2).toFixed(1)+'px');lg.style.setProperty('--fy',(b.top+b.height/2-a.top-a.height/2).toFixed(1)+'px');lg.style.setProperty('--fs',(b.width/a.width).toFixed(4));lg.style.setProperty('--fc',getComputedStyle(hd).color);o.classList.add('is-fly')}else skip=1}
if(skip)o.classList.add('is-skip');
d.setAttribute('data-intro','out');
setTimeout(off,skip?300:720)}
function onSkip(e){if(e.type==='keydown'&&/^(Shift|Control|Alt|Meta|CapsLock)$/.test(e.key))return;end(1)}
for(var i=0;i<EV.length;i++)addEventListener(EV[i],onSkip,{capture:true,passive:true});
addEventListener('animationend',function(e){if(e.animationName==='iTag')end(0)});
var fb=0;addEventListener('animationstart',function(e){if(e.animationName==='iFade'&&!fb)fb=setTimeout(function(){end(0)},3400)});
setTimeout(function(){end(0)},${mode === 'spa' ? 12000 : 6000});
}catch(e){}})(document.documentElement)</script>`.replace(/\n/g, '');
}
function jsonld(ctx, route, page) {
  const org = { '@context': 'https://schema.org', '@type': 'Organization', name: 'RITZ Instrument Transformers GmbH', url: SITE, logo: `${SITE}/assets/logo.svg`, foundingDate: '1945',
    address: { '@type': 'PostalAddress', streetAddress: 'Wandsbeker Zollstraße 92–98', postalCode: '22041', addressLocality: 'Hamburg', addressCountry: 'DE' }, telephone: '+49 40 51123-0', email: 'info@ritz-international.com' };
  const out = [];
  if (route.id === 'home') out.push(org);
  if (route.id === 'product') {
    const p = route.product;
    const img = (p.images || []).find((k) => ctx.img[k]);
    out.push({ '@context': 'https://schema.org', '@type': 'Product', name: p.code, sku: p.code, description: page.desc, brand: { '@type': 'Brand', name: 'RITZ' }, manufacturer: { '@type': 'Organization', name: 'RITZ Instrument Transformers GmbH' },
      category: ctx.t.lbl.area[p.area], ...(img ? { image: SITE + ctx.imgUrl(img, 960) } : {}) });
  }
  if (route.id === 'article') {
    const n = route.news;
    out.push({ '@context': 'https://schema.org', '@type': 'NewsArticle', headline: page.title, datePublished: n.date, publisher: { '@type': 'Organization', name: 'RITZ Instrument Transformers GmbH' } });
  }
  return out.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`).join('');
}
function shell(ctx, page, route, { url, alternates }) {
  const t = ctx.t;
  const title = route.id === 'home' ? `RITZ Instrument Transformers – ${page.title}` : `${page.title} | RITZ`;
  const ogImg = ctx.img['mimg/intro_home_slider_6.webp'] ? SITE + ctx.imgUrl('mimg/intro_home_slider_6.webp', 1280) : '';
  const cfg = { lang: ctx.lang, mode: 'static', base: '/', dataBase: '/data/', v: V, api: DRAFT ? null : '/api/', ...(DRAFT ? { preview: true } : {}), route: { id: route.id, p: route.p }, ...(DOCBASE ? { docBase: DOCBASE } : {}) };
  return `<!doctype html>
<html lang="${ctx.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(page.desc)}">
${DRAFT ? '<meta name="robots" content="noindex, nofollow">' : page.noindex || page.fallback ? '<meta name="robots" content="noindex, follow">' : ''}
<link rel="canonical" href="${SITE}${url}">
${alternates.map(([l, u]) => `<link rel="alternate" hreflang="${l}" href="${SITE}${u}">`).join('\n')}
<meta property="og:type" content="${page.type === 'article' ? 'article' : 'website'}"><meta property="og:title" content="${esc(page.title)}"><meta property="og:description" content="${esc(page.desc)}"><meta property="og:url" content="${SITE}${url}"><meta property="og:locale" content="${LOCALES[ctx.lang].replace('-', '_')}">${ogImg ? `<meta property="og:image" content="${ogImg}">` : ''}
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#141110" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="icon" href="/favicon-32.png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/main.css?v=${V}">
${themeScript()}
${route.id === 'home' ? motionScript('home') : ''}
<script>window.__RITZ__=${JSON.stringify(cfg)}</script>
<script type="module" src="/assets/app.js?v=${V}"></script>
${jsonld(ctx, route, page)}
</head>
<body class="${page.bodyClass || ''}">
<a class="skip" href="#main">${esc(t.ui.skip)}</a>
${header(ctx)}
${drawer(ctx)}
<main id="main" tabindex="-1">
${page.html}
</main>
${footer(ctx)}
${searchOverlay(ctx)}
</body>
</html>`;
}
function minify(html) {
  const keep = [];
  html = html.replace(/<(pre|textarea|script)[\s\S]*?<\/\1>/g, (m) => { keep.push(m); return `\u0000${keep.length - 1}\u0000`; });
  html = html.replace(/\n\s+/g, '\n').replace(/>\s+</g, (m) => (m.includes('\n') ? '>\n<' : m)).replace(/\n{2,}/g, '\n');
  return html.replace(/\u0000(\d+)\u0000/g, (_, i) => keep[i]);
}

// ---------------- Client-Daten ----------------
function indexEntry(p) {
  const img = (p.images || []).find((k) => manifest[k]);
  const e = { id: p.id, code: p.code, area: p.area, kind: p.kind, dk: p.dk, install: p.install, form: p.form, apps: p.apps, um: p.um, ipr: p.ipr, isr: p.isr, upr: p.upr, usr: p.usr,
    classes: p.classes, ith: p.ith, freq: p.freq, std: p.std, weeks: p.weeks, burden: p.burden, made: p.made, images: img ? [img] : [], catalog: p.catalog || undefined, isNew: p.isNew || undefined,
    aliases: p.aliases?.length ? p.aliases : undefined, specs: Object.keys(p.specs || {}).length ? p.specs : undefined, cfg: !p.catalog && (p.options?.de || []).length ? 1 : undefined };
  if (p.catalog) e.name = p.name;
  if (img) { const m = manifest[img]; e.im = [m.n, m.w, m.h, m.ws.filter((x) => x <= 640), ...(m.bg ? [m.bg] : [])]; }
  for (const k of Object.keys(e)) if (e[k] === null || e[k] === undefined || (Array.isArray(e[k]) && !e[k].length && !['images', 'um', 'install', 'form', 'apps'].includes(k))) delete e[k];
  return e;
}
function docsCompact() {
  return docs.map((d) => {
    const codes = d.products.map((id) => products.find((p) => p.id === id)?.code).filter(Boolean);
    const o = { id: d.id, t: d.title, u: d.url, pa: d.path, f: d.file, ty: d.type, l: d.lang, s: d.size || undefined, a: d.areas.length ? d.areas : undefined, p: d.products.length ? d.products : undefined, c: codes.length ? codes.join(' ') : undefined, e: d.ext !== 'pdf' ? d.ext : undefined };
    return JSON.parse(JSON.stringify(o));
  });
}
function clientT(t) {
  const { pages, ...rest } = t;
  return { ...rest, axis: { matches: pages.home.axisMatches, open: pages.home.axisOpen } };
}
function fullDetail(area) {
  const out = {};
  for (const p of products.filter((x) => x.area === area)) out[p.id] = { desc: p.desc, feats: p.feats, options: p.options, deps: p.deps, docs: p.docs, family: p.family, news: p.news, railText: p.railText, images: p.images.filter((k) => manifest[k]), name: p.name, specs: p.specs };
  return out;
}
function textOf(html) {
  return html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

// ---------------- Statischer Build ----------------
async function buildStatic(cacheDir) {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  const usedImgs = new Set();
  const sitemap = [];
  const searchIdx = {};
  let pages = 0;
  for (const lang of LANGS) {
    const t = dicts[lang];
    searchIdx[lang] = [];
    for (const route of allRoutes(lang)) {
      const ctx = makeCtx({ lang, mode: 'static', base: '/', t, data, img: manifest, route: { id: route.id, p: route.p, news: route.news }, docBase: DOCBASE });
      const page = renderRoute(ctx, route);
      const rel = pathFor(lang, route.id, route.p);
      const url = `/${lang}/${rel ? rel + '/' : ''}`;
      // hreflang nur zwischen echten Sprachfassungen (Beiträge ohne Übersetzung bzw. Kopien bleiben außen vor)
      const genuine = (n, l) => n.v[l] && !n.v[l].untranslated && (!n.v[l].contentLang || n.v[l].contentLang === l);
      const alternates = (route.id === 'article' ? LANGS.filter((l) => genuine(route.news, l)) : LANGS).map((l) => {
        const p = route.id === 'article' ? { slug: newsSlugFor(route.news, l) } : route.p;
        return [l, `/${l}/${pathFor(l, route.id, p) ? pathFor(l, route.id, p) + '/' : ''}`];
      });
      alternates.push(['x-default', (alternates.find(([l]) => l === 'de') || alternates[0])[1]]);
      let html = shell(ctx, page, route, { url, alternates });
      html = minify(html);
      for (const m of html.matchAll(/\/img\/([A-Za-z0-9_-]+)-(\d+)\.webp/g)) usedImgs.add(`${m[1]}-${m[2]}`);
      wr(`${DIST}${url}index.html`, html);
      pages++;
      if (!page.noindex && !page.fallback) sitemap.push({ url, alternates, lastmod: route.news?.date || '2026-10-21' });
      // Suchindex (ohne Produkte – die kommen aus index.json)
      if (!['home', 'product', 'compare', 'inquiry', 'search', 'finder'].includes(route.id) && !page.fallback) {
        const main = textOf(page.html).slice(0, 1600);
        searchIdx[lang].push({ k: route.id === 'article' ? 'news' : 'page', t: page.title, s: route.id === 'article' ? route.news.date : (page.desc || '').slice(0, 120), x: main, u: url.slice(1), h: spaHash(lang, rel) });
      }
    }
    // 404 je Sprache
    const ctx = makeCtx({ lang, mode: 'static', base: '/', t, data, img: manifest, route: { id: '404', p: {} }, docBase: DOCBASE });
    const page = renderRoute(ctx, { id: '404', p: {} });
    wr(`${DIST}/${lang}/404.html`, minify(shell(ctx, page, { id: '404', p: {} }, { url: `/${lang}/404.html`, alternates: LANGS.map((l) => [l, `/${l}/404.html`]) })));
  }
  log('Seiten:', pages);
  // Bilder kopieren (nur verwendete Varianten + alle 320/640 für Produktkarten im Client)
  const imgOut = `${DIST}/img`;
  fs.mkdirSync(imgOut, { recursive: true });
  const prodImgs = new Set(products.flatMap((p) => p.images).filter((k) => manifest[k]).map((k) => manifest[k].n));
  let copied = 0;
  for (const f of fs.readdirSync(cacheDir)) {
    const base = f.replace(/\.webp$/, '');
    const nm = base.replace(/-\d+$/, '');
    if (usedImgs.has(base) || prodImgs.has(nm)) { fs.copyFileSync(`${cacheDir}/${f}`, `${imgOut}/${f}`); copied++; }
  }
  log('Bildvarianten kopiert:', copied);
  // Daten
  const D = `${DIST}/data`;
  wr(`${D}/index.json`, JSON.stringify({ products: products.map(indexEntry) }));
  wr(`${D}/docs.json`, JSON.stringify(docsCompact()));
  wr(`${D}/contacts.json`, JSON.stringify(contacts));
  wr(`${D}/world.json`, JSON.stringify(world));
  for (const l of LANGS) { wr(`${D}/t-${l}.json`, JSON.stringify(clientT(dicts[l]))); wr(`${D}/pages-${l}.json`, JSON.stringify(searchIdx[l])); }
  // Assets
  await bundleAssets(DIST, 'static');
  // Sitemap, robots, Weiterleitungen, API
  if (!DRAFT) wr(`${DIST}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemap.map((s) => `<url><loc>${SITE}${s.url}</loc><lastmod>${s.lastmod}</lastmod>${s.alternates.map(([l, u]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${u}"/>`).join('')}</url>`).join('\n')}\n</urlset>\n`);
  wr(`${DIST}/robots.txt`, DRAFT ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /*/suche/\nDisallow: /*/search/\n\nSitemap: ${SITE}/sitemap.xml\n`);
  writeRedirects();
  writeServerFiles();
  return { pages, sitemap: sitemap.length };
}

// ---------------- Assets (CSS, JS, Fonts, Icons) ----------------
async function bundleAssets(out, mode) {
  let css = fs.readFileSync(`${SRC}/styles/main.css`, 'utf8') + '\n' + (fs.existsSync(`${SRC}/styles/extra.css`) ? fs.readFileSync(`${SRC}/styles/extra.css`, 'utf8') : '');
  if (mode === 'static') {
    css = css.replace('__FONT_LATIN__', '/assets/fonts/archivo-latin.woff2').replace('__FONT_LATIN_EXT__', '/assets/fonts/archivo-latin-ext.woff2');
    fs.mkdirSync(`${out}/assets/fonts`, { recursive: true });
    for (const f of ['archivo-latin.woff2', 'archivo-latin-ext.woff2']) fs.copyFileSync(`${SRC}/assets/fonts/${f}`, `${out}/assets/fonts/${f}`);
  } else {
    css = css.replace(/@font-face\s*{[^}]*}/g, '');
  }
  const cssMin = (await esbuild.transform(css, { loader: 'css', minify: true })).code;
  wr(mode === 'static' ? `${out}/assets/main.css` : `${out}/app.css`, cssMin);
  if (mode === 'static') {
    await esbuild.build({ entryPoints: [`${SRC}/client/app.js`], bundle: true, splitting: true, format: 'esm', minify: true, outdir: `${out}/assets`, chunkNames: 'chunks/[name]-[hash]', target: ['es2020'], legalComments: 'none' });
    // Logo & Favicons
    const logo = fs.readFileSync(`${SRC}/assets/logo.svg`, 'utf8').replace(/currentColor/g, '#cd1719');
    wr(`${out}/assets/logo.svg`, logo);
    const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#cd1719"/><path fill="#fff" d="M32 9 7 32l25 23 25-23Zm0 6.6L50 32 32 48.4 14 32Z"/><text x="32" y="38" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="15" fill="#fff">R</text></svg>`;
    wr(`${out}/favicon.svg`, fav);
    await sharp(Buffer.from(fav)).resize(32, 32).png().toFile(`${out}/favicon-32.png`);
    await sharp(Buffer.from(fav)).resize(180, 180).png().toFile(`${out}/apple-touch-icon.png`);
    await sharp(Buffer.from(fav)).resize(512, 512).png().toFile(`${out}/icon-512.png`);
    wr(`${out}/site.webmanifest`, JSON.stringify({ name: 'RITZ Instrument Transformers', short_name: 'RITZ', start_url: '/de/', display: 'browser', background_color: '#ffffff', theme_color: '#1c1311', icons: [{ src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] }));
    wr(`${out}/img/world-lite.svg`, worldLite());
    wr(`${out}/img/world-lite-dark.svg`, worldLite('#3a312d'));
    wr(`${out}/img/world-land.svg`, worldLand());
  } else {
    await esbuild.build({ entryPoints: [`${SRC}/client/spa.js`], bundle: true, format: 'esm', minify: true, outfile: `${out}/app.js`, target: ['es2020'], legalComments: 'none' });
    wr(`${out}/img/world-lite.svg`, worldLite());
    wr(`${out}/img/world-lite-dark.svg`, worldLite('#3a312d'));
    wr(`${out}/img/world-land.svg`, worldLand());
  }
}

// ---------------- Weiterleitungen (alte URLs → neue) ----------------
function mapOldUrl(u) {
  const url = new URL(u);
  const host = url.host;
  let p = decodeURIComponent(url.pathname).replace(/\/+$/, '/') ;
  if (host.startsWith('produkte.')) {
    // Magento: /de/<slug>.html oder Kategorie
    const m = p.match(/^\/(de|en)\/(.+?)(\.html)?\/?$/);
    const lang = m ? m[1] : 'de';
    const prod = products.find((x) => [x.old?.de, x.old?.en].filter(Boolean).some((o) => o.replace(/\/$/, '') === u.replace(/\/$/, '')));
    if (prod) return `/${lang}/${pathFor(lang, 'product', { area: prod.area, slug: prod.id })}/`;
    if (/niederspannung|low-voltage/.test(p)) return `/${lang}/${pathFor(lang, 'area', { area: 'niederspannung' })}/`;
    if (/mittelspannung|medium-voltage/.test(p)) return `/${lang}/${pathFor(lang, 'area', { area: 'mittelspannung' })}/`;
    if (/elektronik|electronic|sensor/.test(p)) return `/${lang}/${pathFor(lang, 'area', { area: 'elektronik-sensoren' })}/`;
    return `/${lang}/${pathFor(lang, 'finder')}/`;
  }
  const lm = p.match(/^\/(en|fr|hu|es)\//);
  const lang = lm ? lm[1] : 'de';
  const rest = lm ? p.slice(3) : p;
  const R = (id, prm = {}) => `/${lang}/${pathFor(lang, id, prm) ? pathFor(lang, id, prm) + '/' : ''}`;
  const tests = [
    [/^\/?$/, () => R('home')],
    [/hochspannung|high-voltage|haute-tension|nagyfesz|alta-tension/, () => R('area', { area: 'hochspannung' })],
    [/mittelspannung|medium-voltage|moyenne|kozepfesz|közép|media-tension/, () => R('area', { area: 'mittelspannung' })],
    [/niederspannung|low-voltage|basse|kisfesz|baja-tension/, () => R('area', { area: 'niederspannung' })],
    [/stromschienen|bus-?bars|barres|sinek|barras/, () => R('area', { area: 'stromschienen-sis' })],
    [/duromer|giessharz|cast-resin|resine|gyanta|resina/, () => R('area', { area: 'giessharzteile-duromer' })],
    [/elektronische|electronic|electroni|elektronik|sensor/, () => R('area', { area: 'elektronik-sensoren' })],
    [/produktfinder|product-finder/, () => R('finder')],
    [/produkte\/?$|^\/products\/?$|produits\/?$|termekek\/?$|productos\/?$/, () => R('products')],
    [/produktkatalog|downloads|telechargements|letoltesek|descargas/, () => R('downloads')],
    [/qualitaetsmanagement|quality|qualite|minoseg|calidad/, () => R('quality')],
    [/produktionsstandorte|production-sites|sites-de-production|telephely|plantas|standorte/, () => R('locations')],
    [/verantwortung|responsibility|responsabilit|felelos/, () => R('responsibility')],
    [/referenzen|references|referenc|referencias/, () => R('references')],
    [/vision|unternehmen|company|entreprise|vallalat|empresa/, () => R('company')],
    [/ausbildung|apprentice|formation|szakkepzes|formacion/, () => R('training')],
    [/praktika|internship|stage|gyakornok|practicas/, () => R('internships')],
    [/karriere|career|carriere|karrier|empleo|stellenangebote|jobs/, () => R('career')],
    [/kontakt|contact|kapcsolat|contacto|ritz-kontakte|vertretungen|agencies|standorte\//, () => R('contact')],
    [/impressum|imprint|mentions|impresszum|aviso/, () => R('imprint')],
    [/datenschutz|privacy|confidentialite|adatvedelem|privacidad/, () => R('privacy')],
    [/news|aktuelles|latest-news|actualites|hirek|noticias|category|tag\//, () => R('news')],
  ];
  // News-Beiträge
  for (const n of news) for (const [l, v] of Object.entries(n.v)) if (v.old && v.old.replace(/\/$/, '') === u.replace(/\/$/, '')) return `/${l}/${pathFor(l, 'article', { slug: newsSlugFor(n, l) })}/`;
  for (const [re, fn] of tests) if (re.test(rest)) return fn();
  return R('home');
}
// Dokumentenmigration: Liste, Download-Skript und Weiterleitungen für die Altpfade
function writeDocMigration() {
  const rows = docs.map((d) => [d.id, d.url, d.path, d.type, d.lang, d.size || '']);
  wr(`${DIST}/_projekt/dokumente-migration.csv`, 'id;quelle;ziel;typ;sprache;bytes\n' + rows.map((r) => r.join(';')).join('\n') + '\n');
  const sh = ['#!/usr/bin/env bash', '# Lädt alle Dokumente der bisherigen Websites in ./dokumente (Zielstruktur der neuen Seite).',
    '# Aufruf im Webroot der neuen Seite: bash _projekt/dokumente-migration.sh', '# Danach Build mit DOCBASE=/dokumente/ erzeugen (siehe LIESMICH).', 'set -u', 'ok=0; fail=0',
    'get() { mkdir -p "$(dirname ".$2")"; if [ -s ".$2" ]; then ok=$((ok+1)); return; fi; if curl -fsSL --retry 2 --max-time 120 -A "RITZ-Website-Migration" -o ".$2" "$1"; then ok=$((ok+1)); else fail=$((fail+1)); echo "FEHLT: $1" >&2; rm -f ".$2"; fi; sleep 1; }',
    ...docs.map((d) => `get '${d.url.replace(/'/g, "'\''")}' '${d.path.replace(/'/g, "'\''")}'`),
    'echo "Fertig: $ok Dateien, $fail fehlgeschlagen."'];
  wr(`${DIST}/_projekt/dokumente-migration.sh`, sh.join('\n') + '\n');
  // Weiterleitungen alter Dokument-URLs (erst nach erfolgter Migration aktivieren)
  const esc = (p) => p.replace(/^\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const main = docs.filter((d) => new URL(d.url).host === 'ritz-international.com');
  const prod = docs.filter((d) => new URL(d.url).host.startsWith('produkte.'));
  wr(`${DIST}/_projekt/dokumente-redirects-hauptdomain.htaccess`, '# Alte WordPress-Dokumentpfade → /dokumente/ (in die .htaccess der neuen Seite übernehmen, sobald die Dateien migriert sind)\nRewriteEngine On\n' + main.map((d) => `RewriteRule ^${esc(decodeURI(new URL(d.url).pathname))}$ ${d.path} [R=301,L,NE]`).join('\n') + '\n');
  wr(`${DIST}/_projekt/dokumente-redirects-produktdomain.htaccess`, '# produkte.ritz-international.com: Medienpfade → neue Domain\nRewriteEngine On\n' + prod.map((d) => `RewriteRule ^${esc(decodeURI(new URL(d.url).pathname))}$ ${SITE}${d.path} [R=301,L,NE]`).join('\n') + '\n');
  log('Dokumentenmigration:', docs.length, 'Dateien (Liste, Skript, Weiterleitungen)');
}

// Inventarlisten (Bestandsaufnahme, für Redaktion und Abnahme)
const absUrl = (lang, id, p = {}) => { const rel = pathFor(lang, id, p); return `${SITE}/${lang}/${rel ? rel + '/' : ''}`; };
function writeInventory() {
  const q = (v) => { const x = Array.isArray(v) ? v.join(' | ') : (v ?? ''); return /[;"\n]/.test(String(x)) ? `"${String(x).replace(/"/g, '""')}"` : String(x); };
  const csv = (head, rows) => head.join(';') + '\n' + rows.map((r) => r.map(q).join(';')).join('\n') + '\n';
  wr(`${DIST}/_projekt/inventar-produkte.csv`, csv(['id', 'typ', 'bereich', 'art', 'bezeichnung_de', 'konfigurator', 'nur_katalog', 'bilder', 'dokumente', 'alt_de', 'alt_en', 'neu_de', 'neu_en'],
    products.map((p) => [p.id, p.code, p.area, p.kind, p.name?.de || '', !p.catalog && (p.options?.de || []).length ? 'ja' : 'nein', p.catalog ? 'ja' : 'nein', (p.images || []).length, (p.docs || []).length,
      p.old?.de || '', p.old?.en || '', absUrl('de', 'product', { area: p.area, slug: p.id }), absUrl('en', 'product', { area: p.area, slug: p.id })])));
  wr(`${DIST}/_projekt/inventar-news.csv`, csv(['id', 'datum', 'kategorie', 'sprachen', 'titel_de', 'alt_de', 'neu_de'],
    news.map((n) => [n.id, n.date, n.cat, Object.keys(n.v).join(' '), n.v.de?.title || '', n.v.de?.old || '', n.v.de ? absUrl('de', 'article', { slug: newsSlugFor(n, 'de') }) : ''])));
  wr(`${DIST}/_projekt/inventar-dokumente.csv`, csv(['id', 'typ', 'sprache', 'titel_de', 'titel_en', 'quelle', 'ziel', 'produkte', 'bereiche'],
    docs.map((d) => [d.id, d.type, d.lang, d.title?.de || '', d.title?.en || '', d.url, d.path, d.products, d.areas])));
  const contactRows = [...contacts.locations.map((l) => ['Standort', l.city, l.company, locAddress(l, 'de').join(', '), l.phone || '', l.email || '']),
    ...contacts.people.map((p) => ['Ansprechpartner', p.name, p.role?.de || '', p.location || '', p.phone || '', p.email || '']),
    ...[...contacts.reps, ...contacts.repsDE].map((r) => ['Vertretung', r.company, r.country_de || r.country, (r.address || []).join(', '), r.phone || '', r.email || ''])];
  wr(`${DIST}/_projekt/inventar-kontakte.csv`, csv(['art', 'name', 'zusatz', 'adresse', 'telefon', 'email'], contactRows));
  log('Inventar: Produkte, News, Dokumente, Kontakte');
}

function writeHandover() {
  const src = `${ROOT}/site/docs/LIESMICH.md`;
  if (fs.existsSync(src)) wr(`${DIST}/_projekt/LIESMICH.md`, fs.readFileSync(src, 'utf8'));
  const auditFile = `${SRC}/data/build/audit.json`;
  if (fs.existsSync(auditFile)) {
    const A = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
    const names = { produktdaten: 'Produktdaten', inhalt: 'Inhalte und Beiträge', altlasten: 'Altlasten' };
    const md = ['# Audit der bisherigen Websites', '', 'Automatisch beim Aufbereiten der Daten gefundene Auffälligkeiten. Die neue Website korrigiert sie, soweit eindeutig; offene Punkte sind markiert.', '',
      ...Object.entries(A).flatMap(([k, v]) => [`## ${names[k] || k} (${v.length})`, '', ...v.map((x) => `- ${x.msg}`), ''])];
    wr(`${DIST}/_projekt/audit.md`, md.join('\n'));
  }
}

function writeRedirects() {
  writeHandover();
  writeInventory();
  writeDocMigration();
  const rows = [];
  for (const u of oldurls) {
    try { rows.push([u, mapOldUrl(u)]); } catch (e) { /* ignore */ }
  }
  wr(`${DIST}/_projekt/redirects.csv`, 'alt;neu\n' + rows.map(([a, b]) => `${a};${SITE}${b}`).join('\n') + '\n');
  // Apache: nur Pfade der Hauptdomain (Produktdomain separat)
  const main = rows.filter(([a]) => new URL(a).host === 'ritz-international.com');
  const prod = rows.filter(([a]) => new URL(a).host.startsWith('produkte.'));
  const rule = ([a, b]) => { const p = new URL(a).pathname; return p === '/' ? null : `RewriteRule ^${p.replace(/^\//, '').replace(/\/$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$ ${b} [R=301,L,NE]`; };
  const ht = `# RITZ Relaunch – Apache-Konfiguration
Options -Indexes
DirectoryIndex index.html
AddDefaultCharset utf-8
AddType application/manifest+json .webmanifest
AddType image/webp .webp
AddType font/woff2 .woff2
ErrorDocument 404 /de/404.html

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Content-Security-Policy "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; frame-ancestors 'self'; form-action 'self'; base-uri 'self'"
  Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
  <FilesMatch "\\.(webp|woff2|svg|png)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(css|js)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(html|json|xml)$">
    Header set Cache-Control "public, max-age=600, must-revalidate"
  </FilesMatch>
</IfModule>
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml application/xml text/plain
</IfModule>

RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

# Projektunterlagen nicht öffentlich ausliefern
RewriteRule ^_projekt(/|$) - [F,L]

# Startseite: Sprache nach Browser
RewriteCond %{HTTP:Accept-Language} ^en [NC]
RewriteRule ^$ /en/ [R=302,L]
RewriteCond %{HTTP:Accept-Language} ^fr [NC]
RewriteRule ^$ /fr/ [R=302,L]
RewriteCond %{HTTP:Accept-Language} ^hu [NC]
RewriteRule ^$ /hu/ [R=302,L]
RewriteCond %{HTTP:Accept-Language} ^es [NC]
RewriteRule ^$ /es/ [R=302,L]
RewriteRule ^$ /de/ [R=302,L]

# Dokumente: bis zur Migration unter /wp-content/uploads/ belassen (Ordner übernehmen).
# Nach der Migration (_projekt/dokumente-migration.sh) die Regeln aus
# _projekt/dokumente-redirects-hauptdomain.htaccess hier einfügen und mit DOCBASE=/dokumente/ neu bauen.

# 301-Weiterleitungen der alten Seiten (${main.length})
${[...new Set(main.map(rule).filter(Boolean))].join('\n')}
`;
  wr(`${DIST}/.htaccess`, ht);
  // Produktdomain: eigene .htaccess für produkte.ritz-international.com
  wr(`${DIST}/_projekt/produkte-domain.htaccess`, `# Für produkte.ritz-international.com (alter Produktfinder)\nRewriteEngine On\n${prod.map(([a, b]) => `RewriteRule ^${new URL(a).pathname.replace(/^\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$ ${SITE}${b} [R=301,L,NE]`).join('\n')}\nRewriteRule ^(de|en)/?(.*)$ ${SITE}/$1/${pathFor('de', 'finder')}/ [R=301,L]\nRewriteRule ^ ${SITE}/de/${pathFor('de', 'finder')}/ [R=301,L]\n`);
  log('Weiterleitungen:', rows.length);
}

// ---------------- Server-Dateien (Formular-Endpunkte, Startseite) ----------------
function writeServerFiles() {
  const php = (kind) => `<?php
// RITZ – ${kind === 'inquiry' ? 'Anfrage' : 'Kontakt'}-Endpunkt (einfacher Mailversand, ohne Speicherung)
// Konfiguration: Empfänger je Produktbereich in $RECIPIENTS anpassen.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { http_response_code(405); echo '{"ok":false}'; exit; }
$raw = file_get_contents('php://input');
if (strlen($raw) > 100000) { http_response_code(413); echo '{"ok":false}'; exit; }
$in = json_decode($raw, true);
if (!is_array($in)) { http_response_code(400); echo '{"ok":false}'; exit; }
$f = $in['fields'] ?? [];
if (!empty($f['website'])) { echo '{"ok":true}'; exit; } // Honeypot
$email = filter_var(trim($f['email'] ?? ''), FILTER_VALIDATE_EMAIL);
if (!$email || empty(trim($f['name'] ?? '')) || empty($f['privacy'])) { http_response_code(422); echo '{"ok":false}'; exit; }
// einfache Drosselung pro IP (60 s)
$lock = sys_get_temp_dir() . '/ritz_' . md5($_SERVER['REMOTE_ADDR'] ?? '') . '.lock';
if (file_exists($lock) && time() - filemtime($lock) < 60) { http_response_code(429); echo '{"ok":false}'; exit; }
touch($lock);
$RECIPIENTS = [
  'default' => 'info@ritz-international.com',
  'niederspannung' => 'karola.walzer@ritz-international.com',
  'mittelspannung' => 'kay.leschick@ritz-international.com',
  'hochspannung' => 'sales@ritzusa.com',
  'elektronik-sensoren' => 'gregor.pohl@ritz-international.com',
  'stromschienen-sis' => 'sales.sis@ritz-international.com',
  'giessharzteile-duromer' => 'info@duromer.de',
];
$items = is_array($in['items'] ?? null) ? $in['items'] : [];
// Empfänger: alle Produktbereiche der Anfrageliste (ohne Liste: Zentrale)
$to = [];
foreach ($items as $it) { $a = $it['area'] ?? ''; if (isset($RECIPIENTS[$a])) $to[$RECIPIENTS[$a]] = true; }
$to = $to ? implode(', ', array_keys($to)) : $RECIPIENTS['default'];
$clean = function($s) { return trim(str_replace(["\\r", "\\n"], ' ', (string)$s)); };
$lines = [];
foreach (['company' => 'Firma', 'name' => 'Name', 'email' => 'E-Mail', 'phone' => 'Telefon', 'country' => 'Land', 'topic' => 'Thema'] as $k => $label) if (!empty($f[$k])) $lines[] = $label . ': ' . $clean($f[$k]);
$lines[] = '';
$lines[] = 'Nachricht:';
$lines[] = (string)($f['message'] ?? '');
if ($items) {
  $lines[] = ''; $lines[] = 'Anfrageliste:';
  foreach ($items as $it) {
    $lines[] = '- ' . intval($it['qty'] ?? 1) . ' x ' . $clean($it['code'] ?? '');
    foreach (($it['lines'] ?? []) as $l) $lines[] = '    ' . $clean($l[0] ?? '') . ': ' . $clean($l[1] ?? '');
  }
}
$lines[] = ''; $lines[] = 'Seite: ' . $clean($in['page'] ?? '') . ' | Sprache: ' . $clean($in['lang'] ?? '');
$subject = '=?UTF-8?B?' . base64_encode('Website-${kind === 'inquiry' ? 'Anfrage' : 'Kontakt'}: ' . $clean(($f['company'] ?? '') ?: ($f['name'] ?? ''))) . '?=';
$headers = "From: RITZ Website <noreply@ritz-international.com>\\r\\nReply-To: " . $email . "\\r\\nContent-Type: text/plain; charset=UTF-8";
$ok = @mail($to, $subject, implode("\\n", $lines), $headers);
if (!$ok) { @unlink($lock); http_response_code(500); }
echo json_encode(['ok' => (bool)$ok]);
`;
  if (!DRAFT) {
    wr(`${DIST}/api/anfrage.php`, php('inquiry'));
    wr(`${DIST}/api/kontakt.php`, php('contact'));
  }
  // Entwurf: Startadresse zeigt direkt die deutsche Startseite (alle Links sind absolut, das passt auch hier)
  if (DRAFT) wr(`${DIST}/index.html`, fs.readFileSync(`${DIST}/de/index.html`, 'utf8'));
  else wr(`${DIST}/index.html`, `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RITZ Instrument Transformers</title><link rel="canonical" href="${SITE}/de/"><meta http-equiv="refresh" content="0; url=/de/"><script>var l=(navigator.language||'de').slice(0,2);location.replace('/'+(['de','en','fr','hu','es'].indexOf(l)>-1?l:'de')+'/')</script></head><body><p>${LANGS.map((l) => `<a href="/${l}/" hreflang="${l}">${LANG_NAMES[l]}</a>`).join(' | ')}</p></body></html>`);
  wr(`${DIST}/404.html`, fs.readFileSync(`${DIST}/de/404.html`, 'utf8'));
}

// ---------------- Vorschau (Artifact) ----------------
async function buildSpa(cacheDir) {
  fs.rmSync(ART, { recursive: true, force: true });
  fs.mkdirSync(`${ART}/data`, { recursive: true });
  // Bilder: eine Breite je Motiv (≤ 960), nur tatsächlich verwendete Motive
  const used = new Set();
  // verwendete Motive aus statischem Build (deutsch) ermitteln
  const deDir = `${DIST}/de`;
  const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = `${d}/${f}`; if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.html')) for (const m of fs.readFileSync(p, 'utf8').matchAll(/\/img\/([A-Za-z0-9_-]+)-\d+\.webp/g)) used.add(m[1]); } };
  if (fs.existsSync(deDir)) walk(deDir);
  for (const p of products) for (const k of p.images) if (manifest[k]) used.add(manifest[k].n);
  const spaManifest = {};
  fs.mkdirSync(`${ART}/img`, { recursive: true });
  for (const [k, m] of Object.entries(manifest)) {
    if (!used.has(m.n)) continue;
    const w = m.ws.filter((x) => x <= 960).pop() || m.ws[0];
    fs.copyFileSync(`${cacheDir}/${m.n}-${w}.webp`, `${ART}/img/${m.n}-${w}.webp`);
    spaManifest[k] = { n: m.n, w: m.w, h: m.h, ws: [w] };
  }
  const D = `${ART}/data`;
  const idx = products.map((p) => { const e = indexEntry(p); const k = e.images[0]; if (k && spaManifest[k]) e.im = [spaManifest[k].n, spaManifest[k].w, spaManifest[k].h, spaManifest[k].ws]; else { delete e.im; e.images = []; } return e; });
  wr(`${D}/index.json`, JSON.stringify({ products: idx }));
  wr(`${D}/docs.json`, JSON.stringify(docsCompact()));
  wr(`${D}/contacts.json`, JSON.stringify(contacts));
  wr(`${D}/world.json`, JSON.stringify(world));
  wr(`${D}/news.json`, JSON.stringify(news));
  wr(`${D}/jobs.json`, JSON.stringify(jobs));
  wr(`${D}/img.json`, JSON.stringify(spaManifest));
  for (const a of AREAS) { const fd = fullDetail(a); for (const v of Object.values(fd)) v.images = v.images.filter((k) => spaManifest[k]); wr(`${D}/p-${a}.json`, JSON.stringify(fd)); }
  for (const l of LANGS) {
    wr(`${D}/t-${l}.json`, JSON.stringify(clientT(dicts[l])));
    wr(`${D}/tf-${l}.json`, JSON.stringify(dicts[l]));
    const pg = fs.existsSync(`${DIST}/data/pages-${l}.json`) ? fs.readFileSync(`${DIST}/data/pages-${l}.json`, 'utf8') : '[]';
    wr(`${D}/pages-${l}.json`, pg);
  }
  await bundleAssets(ART, 'spa');
  const cfg = { mode: 'spa', base: '', dataBase: 'data/', lang: 'de', v: V };
  // Artifact-Seite: ohne eigenes doctype/html/head/body (der Rahmen wird beim Veröffentlichen ergänzt)
  wr(`${ART}/index.html`, `<title>RITZ Instrument Transformers</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Vorschau der neuen Website von RITZ Instrument Transformers">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..820&display=swap">
<link rel="stylesheet" href="app.css?v=${V}">
${themeScript()}
${motionScript('spa')}
<script>window.__RITZ__=${JSON.stringify(cfg)}</script>
<div id="app"><p style="padding:24px;font-family:system-ui">RITZ …</p></div>
<script type="module" src="app.js?v=${V}"></script>
`);
  // Dateiliste für die Veröffentlichung
  const files = [];
  const walk2 = (d) => { for (const f of fs.readdirSync(d)) { const p = `${d}/${f}`; if (fs.statSync(p).isDirectory()) walk2(p); else files.push(path.relative(ART, p)); } };
  walk2(ART);
  wr(`${ART}.files.json`, JSON.stringify(files.filter((f) => f !== 'index.html')));
  log('Vorschau:', files.length, 'Dateien,', (files.reduce((s, f) => s + fs.statSync(`${ART}/${f}`).size, 0) / 1e6).toFixed(1), 'MB');
}

// ---------------- Start ----------------
const cacheDir = await processImages();
let res = {};
if (ONLY !== 'spa') res = await buildStatic(cacheDir);
if (ONLY !== 'static') await buildSpa(cacheDir);
log('Fertig.', JSON.stringify(res));
