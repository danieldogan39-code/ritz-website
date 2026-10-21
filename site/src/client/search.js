// Globale Suche (Overlay + Suchseite)
import { $, $$, getIndex, getT, getData, clientCtx, debounce, CFG } from './core.js';
import { esc, icon, imgTag, productGlyph, tpl } from '../lib/util.js';
import { matchText, descriptor, imgFit } from '../lib/product.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

async function searchAll(q) {
  const [idx, t, ctx, pages, docs] = await Promise.all([getIndex(), getT(), clientCtx(), getData('pages-' + CFG.lang).catch(() => []), getData('docs').catch(() => [])]);
  const qs = norm(q).trim();
  if (!qs) return { products: [], pages: [], docs: [], news: [], ctx, t };
  const words = qs.split(/\s+/);
  const prods = idx.products.map((p) => [p, matchText(p, q, t)]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1] || a[0].code.localeCompare(b[0].code, 'de', { numeric: true })).map((x) => x[0]);
  const scoreText = (title, text) => {
    const tt = norm(title), tx = norm(text);
    if (!words.every((w) => tt.includes(w) || tx.includes(w))) return 0;
    return (words.every((w) => tt.includes(w)) ? 10 : 0) + (tt.startsWith(qs) ? 5 : 0) + 1;
  };
  const pageHits = pages.filter((p) => p.k !== 'news').map((p) => [p, scoreText(p.t, p.x)]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  const newsHits = pages.filter((p) => p.k === 'news').map((p) => [p, scoreText(p.t, p.x)]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  const dl = ctx.dl;
  const docHits = docs.map((d) => {
    const title = d.t[dl] || d.t.de || d.t.en || d.f;
    return [d, scoreText(title, d.f + ' ' + (d.c || ''))];
  }).filter((x) => x[1]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  return { products: prods, pages: pageHits, docs: docHits, news: newsHits, ctx, t };
}

function hitHtml(kind, item, ctx, t, i) {
  if (kind === 'product') {
    const p = item;
    const img = p.images?.[0] && ctx.img[p.images[0]] ? imgTag(ctx, p.images[0], { alt: '', sizes: '44px', max: 320, cls: imgFit(ctx, p.images[0]) }) : productGlyph(p.kind);
    return `<a class="search__hit" role="option" id="sh-${i}" href="${ctx.href('product', { area: p.area, slug: p.id })}"><span class="ic">${img}</span><span><b>${esc(p.code)}</b><span>${esc(descriptor(p, t, ctx.lang))} – ${esc(t.lbl.area[p.area])}</span></span></a>`;
  }
  if (kind === 'doc') {
    const d = item;
    const title = d.t[ctx.dl] || d.t.de || d.t.en || d.f;
    return `<a class="search__hit" role="option" id="sh-${i}" href="${ctx.docHref({ url: d.u, path: d.pa })}" target="_blank" rel="noopener"><span class="ic">${icon('file')}</span><span><b>${esc(title)}</b><span>${esc([t.lbl.docTypeOne[d.ty], (d.l || '').toUpperCase()].filter(Boolean).join(', '))}</span></span></a>`;
  }
  const p = item;
  return `<a class="search__hit" role="option" id="sh-${i}" href="${ctx.mode === 'spa' ? p.h : CFG.base + p.u}"><span class="ic">${icon(kind === 'news' ? 'calendar' : 'layers')}</span><span><b>${esc(p.t)}</b><span>${esc(p.s || '')}</span></span></a>`;
}

export function initSearchOverlay() {
  const ov = $('[data-search]');
  if (!ov) return;
  const input = $('[data-search-input]', ov), out = $('[data-search-results]', ov);
  let active = -1, lastFocus = null;
  const open = (q = '') => {
    lastFocus = document.activeElement;
    ov.hidden = false;
    document.body.style.overflow = 'hidden';
    input.value = q;
    input.focus();
    run();
    // Daten vorladen
    getData('pages-' + CFG.lang).catch(() => {}); getData('docs').catch(() => {});
  };
  const close = () => { ov.hidden = true; document.body.style.overflow = ''; lastFocus?.focus?.(); };
  const run = debounce(async () => {
    const q = input.value;
    const r = await searchAll(q);
    const { t, ctx } = r;
    if (!q.trim()) { out.innerHTML = `<p class="search__group">${esc(t.search.lead)}</p>`; active = -1; return; }
    let i = 0;
    const sec = (title, list, kind, n) => (list.length ? `<div class="search__group">${esc(title)}</div>${list.slice(0, n).map((x) => hitHtml(kind, x, ctx, t, i++)).join('')}` : '');
    const html = sec(t.search.groups.product, r.products, 'product', 6) + sec(t.search.groups.page, r.pages, 'page', 4) + sec(t.search.groups.news, r.news, 'news', 3) + sec(t.search.groups.doc, r.docs, 'doc', 4);
    out.innerHTML = html ? html + `<a class="search__all" href="${ctx.href('search', {}, { q })}">${esc(t.search.allResults)}</a>` : `<div class="empty empty--small"><p>${esc(tpl(t.search.empty, { q }))}</p><p class="small muted">${esc(t.search.emptyHint)}</p></div>`;
    active = -1;
  }, 120);
  input.addEventListener('input', run);
  input.addEventListener('keydown', (e) => {
    const hits = $$('.search__hit', out);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!hits.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
      hits.forEach((h, j) => h.setAttribute('aria-selected', String(j === active)));
      input.setAttribute('aria-activedescendant', hits[active].id);
      hits[active].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      const h = hits[active >= 0 ? active : 0];
      if (h) { e.preventDefault(); h.click(); close(); }
    }
  });
  ov.addEventListener('click', (e) => {
    if (e.target === ov || e.target.closest('[data-search-close]')) close();
    else if (e.target.closest('.search__hit, .search__all')) setTimeout(close, 0);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !ov.hidden) { close(); return; }
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = ['input', 'textarea', 'select'].includes(tag) || e.target.isContentEditable;
    if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) { e.preventDefault(); open(); }
  });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-search-open]')) { e.preventDefault(); open(); } });
  // Fokusfalle
  ov.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = $$('input, a[href], button', ov).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  window.__openSearch = open;
}

export async function initSearchPage(root) {
  const box = $('[data-search-page]', root);
  if (!box) return;
  const form = $('[data-search-page-form]', box), input = form.querySelector('input'), out = $('[data-search-page-results]', box);
  const params = new URLSearchParams(CFG.mode === 'spa' ? (await import('./core.js')).readQuery() : location.search);
  input.value = params.get('q') || '';
  const run = async () => {
    const q = input.value;
    const r = await searchAll(q);
    const { t, ctx } = r;
    if (!q.trim()) { out.innerHTML = ''; return; }
    let i = 0;
    const sec = (title, list, kind) => (list.length ? `<h2 class="h4 mt">${esc(title)} <span class="faint">${list.length}</span></h2><div class="search-list">${list.slice(0, 60).map((x) => hitHtml(kind, x, ctx, t, i++)).join('')}</div>` : '');
    const html = sec(t.search.groups.product, r.products, 'product') + sec(t.search.groups.page, r.pages, 'page') + sec(t.search.groups.news, r.news, 'news') + sec(t.search.groups.doc, r.docs, 'doc');
    out.innerHTML = html || `<div class="empty"><p>${esc(tpl(t.search.empty, { q }))}</p><p class="small muted">${esc(t.search.emptyHint)}</p></div>`;
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  input.addEventListener('input', debounce(run, 200));
  run();
}
