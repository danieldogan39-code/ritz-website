// Globale Suche (Overlay + Suchseite)
import { $, $$, getIndex, getT, getX, getData, clientCtx, debounce, CFG, handoff } from './core.js';
import { esc, icon, imgTag, productGlyph, tpl } from '../lib/util.js';
import { matchText, descriptor, imgFit, productThumb } from '../lib/product.js';
import { docVisible, dedupeCopies, docTitleFor } from '../lib/doclang.js';

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
  const docHits = dedupeCopies(docs.filter((d) => docVisible(d, CFG.lang))).map((d) => {
    const title = docTitleFor(d, CFG.lang, dl);
    return [d, scoreText(title, d.f + ' ' + (d.c || ''))];
  }).filter((x) => x[1]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  return { products: prods, pages: pageHits, docs: docHits, news: newsHits, ctx, t };
}

function hitHtml(kind, item, ctx, t, i, score = null) {
  if (kind === 'product') {
    const p = item;
    const img = productThumb(ctx, p, { sizes: '44px' });
    return `<a class="search__hit" role="option" id="sh-${i}" href="${ctx.href('product', { area: p.area, slug: p.id })}"><span class="ic">${img}</span><span><b>${esc(p.code)}</b><span>${esc(descriptor(p, t, ctx.lang))} – ${esc(t.lbl.area[p.area])}</span></span>${score != null ? `<em class="search__score">${score}&nbsp;%</em>` : ''}</a>`;
  }
  if (kind === 'doc') {
    const d = item;
    const title = docTitleFor(d, CFG.lang, ctx.dl);
    const local = !!ctx.docHref(d);
    return `<a class="search__hit" role="option" id="sh-${i}" ${ctx.docAttrs(d)}><span class="ic">${icon(local ? 'file' : 'mail')}</span><span><b>${esc(title)}</b><span>${esc([t.lbl.docTypeOne[d.ty], (d.l || '').toUpperCase(), local ? '' : t.downloads.req.onRequest].filter(Boolean).join(', '))}</span></span></a>`;
  }
  const p = item;
  return `<a class="search__hit" role="option" id="sh-${i}" href="${ctx.mode === 'spa' ? p.h : CFG.base + p.u}"><span class="ic">${icon(kind === 'news' ? 'calendar' : 'layers')}</span><span><b>${esc(p.t)}</b><span>${esc(p.s || '')}</span></span></a>`;
}

// Technische Anfrage (z. B. „400/5 A 0,5 FS5 24 kV“): erkannte Werte + passende Typen, Übergabe an den Spezifikations-Check
const TECH = /\d\s*[/:]\s*\d|\d\s*k?V\b|\bVA\b|\d\s*kA\b|\bHz\b|\b(?:5|10)P\s?\d|\bFS\s?\d|\b0[.,][125]S?\b/i;
async function smartBlock(q, ctx, t, i0) {
  if (!TECH.test(q)) return { html: '', n: 0 };
  const [{ parsePosition, reqWeight, setProductCodes }, { matchProducts }, { reqChipsHtml }, X, idx] = await Promise.all([import('../lib/spec.js'), import('../lib/match.js'), import('../lib/reqfmt.js'), getX(), getIndex()]);
  setProductCodes(idx.products);
  const { req } = parsePosition(q);
  if (reqWeight(req) < 1.5) return { html: '', n: 0 };
  const best = matchProducts(req, idx.products, null, { limit: 3 }).best;
  const S = X.smart;
  let i = i0;
  const html = `<div class="smart"><div class="smart__head">${icon('sliders', 'width="16" height="16"')}${esc(S.title)}</div><div class="smart__req">${reqChipsHtml(req, t, X.assist, ctx.lang)}</div>
    ${best.length ? `<div class="search__group">${esc(S.best)}</div>${best.map((m) => hitHtml('product', m.p, ctx, t, i++, Math.round(m.score * 100))).join('')}` : ''}
    <a class="link smart__go search__hit" role="option" id="sh-${i++}" href="${ctx.href('assistant')}" data-smart-go>${esc(S.open)}</a></div>`;
  return { html, n: i - i0 };
}
document.addEventListener('click', (e) => { const a = e.target.closest('[data-smart-go]'); if (a) handoff.put('spec', { text: a.closest('[data-search], [data-search-page]')?.querySelector('input')?.value || '' }); });

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
    const smart = await smartBlock(q, ctx, t, 0).catch(() => ({ html: '', n: 0 }));
    if (q !== input.value) return;
    i += smart.n;
    const sec = (title, list, kind, n) => (list.length ? `<div class="search__group">${esc(title)}</div>${list.slice(0, n).map((x) => hitHtml(kind, x, ctx, t, i++)).join('')}` : '');
    const html = smart.html + sec(t.search.groups.product, r.products, 'product', 6) + sec(t.search.groups.page, r.pages, 'page', 4) + sec(t.search.groups.news, r.news, 'news', 3) + sec(t.search.groups.doc, r.docs, 'doc', 4);
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
    const smart = await smartBlock(q, ctx, t, 0).catch(() => ({ html: '', n: 0 }));
    i += smart.n;
    const sec = (title, list, kind) => (list.length ? `<h2 class="h4 mt">${esc(title)} <span class="faint">${list.length}</span></h2><div class="search-list">${list.slice(0, 60).map((x) => hitHtml(kind, x, ctx, t, i++)).join('')}</div>` : '');
    const html = smart.html + sec(t.search.groups.product, r.products, 'product') + sec(t.search.groups.page, r.pages, 'page') + sec(t.search.groups.news, r.news, 'news') + sec(t.search.groups.doc, r.docs, 'doc');
    out.innerHTML = html || `<div class="empty"><p>${esc(tpl(t.search.empty, { q }))}</p><p class="small muted">${esc(t.search.emptyHint)}</p></div>`;
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  input.addEventListener('input', debounce(run, 200));
  run();
}
