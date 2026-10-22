// Einstieg für die Vorschau (eine Seite, Navigation über den URL-Hash)
import { CFG, getData, getIndex, setData, $ } from './core.js';
import { makeCtx, parseSpaHash, spaHash, newsSlugFor } from '../lib/ctx.js';
import { matchPath, LANGS, pathFor } from '../lib/routes.js';
import { header, drawer, footer, searchOverlay } from '../views/layout.js';
import { renderRoute } from '../views/render.js';
import { initHeader, initDrawer, initTheme, initCopy } from './ui.js';
import { initBadges, initBasketButtons, initTray } from './basket.js';
import { initSearchOverlay } from './search.js';
import { initPage } from './app-page.js';

const app = document.getElementById('app');
let shellLang = null;
const full = {};

async function loadBase(lang) {
  const [idx, t, docsC, news, jobs, contacts, world, img] = await Promise.all([
    getIndex(), getData('tf-' + lang), getData('docs'), getData('news'), getData('jobs'), getData('contacts'), getData('world'), getData('img'),
  ]);
  CFG.t = t;
  CFG.img = img;
  const docs = docsC.map((d) => ({ id: d.id, title: d.t, local: !!d.lo, path: d.pa, file: d.f, type: d.ty, lang: d.l, size: d.s, areas: d.a || [], products: d.p || [], ext: d.e || 'pdf', vis: d.vis, tl: d.tl, alt: d.alt, areaLangs: d.al, same: d.same, codes: d.c || '' }));
  return { idx, t, data: { products: idx.products, docs, docsById: Object.fromEntries(docs.map((d) => [d.id, d])), news, jobs, contacts, worldmeta: { W: world.W, H: world.H, scale: world.scale, translate: world.translate } }, img };
}
async function fullProduct(p) {
  if (!full[p.area]) full[p.area] = await getData('p-' + p.area);
  return full[p.area][p.id] ? { ...p, ...full[p.area][p.id] } : p;
}

function resolveRoute(lang, path, base) {
  const m = matchPath(lang, path);
  if (!m) return { id: '404', p: {} };
  if (m.id === 'product') {
    const p = base.idx._byId[m.p.slug];
    if (!p || p.area !== m.p.area) return { id: '404', p: {} };
    return { ...m, product: p };
  }
  if (m.id === 'article') {
    const n = base.data.news.find((x) => LANGS.some((l) => newsSlugFor(x, l) === m.p.slug));
    if (!n) return { id: '404', p: {} };
    return { ...m, news: n, p: { slug: newsSlugFor(n, lang) } };
  }
  return m;
}

let rendering = 0;
async function render() {
  const my = ++rendering;
  let h = parseSpaHash(location.hash);
  if (!h) {
    // In-Page-Anker oder leer → Start
    if (location.hash && document.getElementById(location.hash.slice(1))) return;
    const l = (navigator.language || 'de').slice(0, 2);
    history.replaceState(null, '', spaHash(LANGS.includes(l) ? l : 'de', ''));
    h = parseSpaHash(location.hash);
  }
  const lang = h.lang;
  CFG.lang = lang;
  document.documentElement.lang = lang;
  const base = await loadBase(lang);
  if (my !== rendering) return;
  let route = resolveRoute(lang, h.path, base);
  if (route.id === 'product') route = { ...route, product: await fullProduct(route.product) };
  CFG.route = { id: route.id, p: route.p };
  const ctx = makeCtx({ lang, mode: 'spa', base: '', t: base.t, data: base.data, img: base.img, route: { id: route.id, p: route.p, news: route.news }, docBase: CFG.docBase || null });
  const page = renderRoute(ctx, route);
  // Seitenwechsel als View Transition (Kopf bleibt stehen, Inhalt blendet über), sonst wie bisher mit kurzem Einblenden
  const useVT = !!document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches && shellLang === lang && !!$('#main');
  const swap = () => {
    document.body.className = page.bodyClass || '';
    if (shellLang !== lang || !$('#main')) {
      app.innerHTML = `<a class="skip" href="#main" data-skip>${base.t.ui.skip}</a>${header(ctx)}${drawer(ctx)}<main id="main" tabindex="-1"></main>${footer(ctx)}${searchOverlay(ctx)}`;
      shellLang = lang;
      initHeader(); initDrawer(); initTheme(); initSearchOverlay(); initBadges();
    } else {
      // Kopf neu zeichnen (aktive Navigation, Sprachlinks)
      const old = $('[data-hdr]');
      const tmp = document.createElement('div');
      tmp.innerHTML = header(ctx);
      old.replaceWith(tmp.firstElementChild);
      initHeader(); initBadges();
      const dr = $('[data-drawer]');
      const tmp2 = document.createElement('div'); tmp2.innerHTML = drawer(ctx);
      dr.replaceWith(tmp2.firstElementChild); initDrawer();
    }
    $('#main').innerHTML = `<div class="${useVT ? 'route' : 'route-fade'}">${page.html}</div>`;
    document.title = `${page.title} | RITZ`;
    if (h.anchor) setTimeout(() => document.getElementById(h.anchor)?.scrollIntoView({ block: 'start' }), 30);
    else window.scrollTo(0, 0);
  };
  if (useVT) await document.startViewTransition(swap).updateCallbackDone.catch(() => {});
  else swap();
  if (my !== rendering) return;
  initPage($('#main'));
}

// In-Page-Anker ohne Routenwechsel behandeln
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (parseSpaHash(href)) return;
  const el = document.getElementById(href.slice(1));
  if (el) { e.preventDefault(); el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); if (a.dataset.skip !== undefined) el.focus(); }
});
window.addEventListener('hashchange', render);
initTheme(); initCopy(); initBasketButtons(document); initTray();
render().catch((e) => { console.error(e); app.innerHTML = '<p style="padding:24px">Die Vorschau konnte nicht geladen werden.</p>'; });
