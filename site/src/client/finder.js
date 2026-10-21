// Produktfinder
import { $, $$, getIndex, getT, clientCtx, readQuery, writeQuery, debounce, store } from './core.js';
import { esc, icon, tpl, fmtNum, UM_STEPS, fmtCls } from '../lib/util.js';
import { productCard, filterProducts, facetValues, parseQuery, buildQuery, FACETS } from '../lib/product.js';
import { initCompareToggles } from './basket.js';

const PAGE = 36;

export async function initFinder(root) {
  const el = $('[data-finder]', root);
  if (!el) return;
  const [idx, t, ctx] = await Promise.all([getIndex(), getT(), clientCtx()]);
  const products = idx.products;
  const F = t.finder;
  let q = parseQuery(readQuery());
  let shown = PAGE;
  const res = $('[data-results]', el), more = $('[data-more]', el), facetsBox = $('[data-facets]', el);
  const countEl = $('[data-count]', el), countInline = $('[data-count-inline]', el), activeBox = $('[data-active-filters]', el);
  const qInput = $('[data-finder-q]', el), sortSel = $('[data-finder-sort]', el), filters = $('[data-filters]', el);
  qInput.value = q.q || '';
  sortSel.value = q.sort || (q.q ? 'relevance' : 'code');
  let view = q.view || store.get('ritz-view', 'grid');

  const labelOf = (f, v) => {
    switch (f) {
      case 'area': return t.lbl.area[v];
      case 'kindGroup': return t.lbl.kindGroup[v];
      case 'install': return t.lbl.install[v];
      case 'app': return t.lbl.app[v] || v;
      case 'form': return t.lbl.form[v] || v;
      case 'made': return t.lbl.made[v] || v;
      case 'isr': return `${v} A`;
      case 'classes': return fmtCls(v, ctx.lang);
      case 'freq': return v === '16.7' ? F.freq167 : v === 'broad' ? F.freqBroad : `${v} Hz`;
      default: return v;
    }
  };
  const ORDER = {
    area: ['niederspannung', 'mittelspannung', 'hochspannung', 'elektronik-sensoren', 'stromschienen-sis', 'giessharzteile-duromer'],
    kindGroup: ['ct', 'vt', 'combined', 'sensor', 'electronic', 'other'], install: ['indoor', 'outdoor'],
    classes: ['0.1', '0.2', '0.2S', '0.5', '0.5S', '1', '3', '5P', '10P', 'PX', '6P'], isr: ['1', '5'], freq: ['16.7', '50', '60', 'broad'],
  };
  const OPEN = ['area', 'kindGroup', 'install', 'um', 'app'];

  function counts(f) {
    const base = filterProducts(products, q, t, { except: f });
    const c = {};
    for (const p of base) for (const v of new Set(facetValues(p, f))) c[v] = (c[v] || 0) + 1;
    return c;
  }
  function renderFacets() {
    const parts = [];
    const group = (key, title, body, active) => `<details class="fgroup" data-fg="${key}" ${OPEN.includes(key) || active ? 'open' : ''}><summary>${esc(title)}${active ? ` <span class="tag tag--red">${active}</span>` : ''}${icon('down')}</summary><div class="fgroup__body">${body}</div></details>`;
    for (const f of ['area', 'kindGroup', 'install']) parts.push(checkGroup(f));
    // Spannung
    const umAvail = UM_STEPS.filter((v) => products.some((p) => (p.um || []).includes(v)));
    parts.push(group('um', F.facets.um, `<div class="fseg">${['', ...umAvail].map((v) => `<button type="button" class="chip${(q.um || '') === String(v) ? ' is-on' : ''}" data-um="${v}" aria-pressed="${(q.um || '') === String(v)}">${v === '' ? esc(t.ui.all) : esc(fmtNum(v, ctx.lang))}</button>`).join('')}</div><p class="small faint">kV</p>`, q.um ? 1 : 0));
    parts.push(checkGroup('app'));
    // Primärstrom
    parts.push(group('ipr', F.facets.ipr, `<div class="frange"><label class="small" for="f-ipr">${esc(F.iprHint)}</label><input class="input" id="f-ipr" type="number" min="0" step="any" inputmode="decimal" value="${esc(q.ipr || '')}" data-ipr placeholder="400"></div>`, q.ipr ? 1 : 0));
    for (const f of ['isr', 'classes', 'form', 'std', 'freq']) parts.push(checkGroup(f));
    // Lieferzeit
    parts.push(group('weeks', F.facets.weeks, `<select class="select" data-weeks aria-label="${esc(F.facets.weeks)}"><option value="">${esc(t.ui.all)}</option>${[3, 4, 6, 8].map((w) => `<option value="${w}"${String(q.weeks) === String(w) ? ' selected' : ''}>${esc(tpl(F.weeksMax, { n: w }))}</option>`).join('')}</select>`, q.weeks ? 1 : 0));
    parts.push(checkGroup('made'));
    facetsBox.innerHTML = parts.join('');
    function checkGroup(f) {
      const c = counts(f);
      let vals = Object.keys(c);
      for (const v of q[f] || []) if (!vals.includes(v)) vals.push(v);
      const ord = ORDER[f];
      vals.sort((a, b) => (ord ? (ord.indexOf(a) + 1 || 99) - (ord.indexOf(b) + 1 || 99) : 0) || (c[b] || 0) - (c[a] || 0) || String(labelOf(f, a)).localeCompare(String(labelOf(f, b))));
      if (!vals.length) return '';
      const sel = q[f] || [];
      const body = vals.map((v) => `<label class="fopt${!c[v] ? ' is-zero' : ''}"><input type="checkbox" data-f="${f}" value="${esc(v)}"${sel.includes(v) ? ' checked' : ''}><span>${esc(labelOf(f, v))}</span><span class="n">${c[v] || 0}</span></label>`).join('');
      return group(f, F.facets[f], body, sel.length);
    }
  }
  function renderActive() {
    const chips = [];
    for (const f of FACETS) for (const v of q[f] || []) chips.push(`<button class="chip" type="button" data-rm-f="${f}" data-rm-v="${esc(v)}">${esc(labelOf(f, v))}${icon('close')}</button>`);
    if (q.um) chips.push(`<button class="chip" type="button" data-rm-f="um">${esc(fmtNum(parseFloat(q.um), ctx.lang))} kV${icon('close')}</button>`);
    if (q.ipr) chips.push(`<button class="chip" type="button" data-rm-f="ipr">${esc(fmtNum(parseFloat(q.ipr), ctx.lang))} A${icon('close')}</button>`);
    if (q.weeks) chips.push(`<button class="chip" type="button" data-rm-f="weeks">${esc(tpl(F.weeksMax, { n: q.weeks }))}${icon('close')}</button>`);
    if (q.q) chips.push(`<button class="chip" type="button" data-rm-f="q">„${esc(q.q)}“${icon('close')}</button>`);
    activeBox.innerHTML = chips.join('');
    const n = chips.length;
    const fa = $('[data-filters-active]', el);
    if (fa) fa.textContent = n ? `(${n})` : '';
  }
  function renderResults() {
    const list = filterProducts(products, q, t);
    countEl.textContent = list.length;
    if (countInline) countInline.textContent = `(${list.length})`;
    res.classList.toggle('plist', view === 'list');
    $$('[data-view]', el).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    if (!list.length) {
      res.innerHTML = `<div class="empty"><h3>${esc(F.empty)}</h3><p>${esc(F.emptyHint)}</p><div class="cluster"><button class="btn btn--ghost" type="button" data-reset>${esc(t.ui.resetFilters)}</button><a class="btn" href="${ctx.href('inquiry')}">${esc(F.emptyCta)}</a></div></div>`;
      more.innerHTML = '';
      return;
    }
    res.innerHTML = list.slice(0, shown).map((p) => productCard(ctx, p)).join('');
    more.innerHTML = list.length > shown ? `<button class="btn btn--ghost" type="button" data-show-more>${esc(tpl(F.showMore, { n: Math.min(PAGE, list.length - shown) }))}</button>` : '';
    initCompareToggles(res);
  }
  function update({ facets = true } = {}) {
    shown = PAGE;
    writeQuery(buildQuery({ ...q, view: view === 'grid' ? '' : view }));
    if (facets) renderFacets();
    renderActive();
    renderResults();
  }
  update();

  facetsBox.addEventListener('change', (e) => {
    const cb = e.target.closest('[data-f]');
    if (cb) {
      const f = cb.dataset.f;
      const set = new Set(q[f] || []);
      cb.checked ? set.add(cb.value) : set.delete(cb.value);
      q[f] = [...set];
      update();
      return;
    }
    if (e.target.matches('[data-weeks]')) { q.weeks = e.target.value; update(); }
  });
  facetsBox.addEventListener('input', debounce((e) => { if (e.target.matches('[data-ipr]')) { q.ipr = e.target.value; update({ facets: false }); renderFacetsKeepFocus(); } }, 350));
  function renderFacetsKeepFocus() {
    const a = document.activeElement?.matches?.('[data-ipr]');
    const pos = a ? document.activeElement.selectionStart : null;
    renderFacets();
    if (a) { const i = $('[data-ipr]', facetsBox); i?.focus(); try { i.setSelectionRange(pos, pos); } catch (e) { /* number */ } }
  }
  facetsBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-um]');
    if (b) { q.um = b.dataset.um; update(); }
  });
  activeBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm-f]');
    if (!b) return;
    const f = b.dataset.rmF;
    if (b.dataset.rmV !== undefined && Array.isArray(q[f])) q[f] = q[f].filter((x) => x !== b.dataset.rmV);
    else { q[f] = ''; if (f === 'q') qInput.value = ''; }
    update();
  });
  qInput.addEventListener('input', debounce(() => { q.q = qInput.value.trim(); if (q.q && !q.sort) sortSel.value = 'relevance'; update(); }, 200));
  sortSel.addEventListener('change', () => { q.sort = sortSel.value; update({ facets: false }); });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-show-more]')) { shown += PAGE; renderResults(); return; }
    if (e.target.closest('[data-reset]') || e.target.closest('[data-filters-reset]')) { q = {}; qInput.value = ''; sortSel.value = 'code'; update(); return; }
    const v = e.target.closest('[data-view]');
    if (v) { view = v.dataset.view; store.set('ritz-view', view); renderResults(); writeQuery(buildQuery({ ...q, view: view === 'grid' ? '' : view })); return; }
    if (e.target.closest('[data-filters-open]')) openFilters(true);
    if (e.target.closest('[data-filters-close]')) openFilters(false);
  });
  let scrim = null;
  function openFilters(on) {
    filters.classList.toggle('is-open', on);
    if (on) {
      scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.addEventListener('click', () => openFilters(false)); document.body.appendChild(scrim);
      document.body.style.overflow = 'hidden';
      setTimeout(() => filters.querySelector('summary, input, button')?.focus(), 50);
    } else {
      scrim?.remove(); scrim = null; document.body.style.overflow = '';
    }
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && filters.classList.contains('is-open')) openFilters(false); });
}
