// Bedienelemente: Kopfnavigation, Drawer, Sprache, Darstellung, Kopieren, Galerie, Tabs, Filter, Kontaktfinder
import { $, $$, getT, getData, clientCtx, CFG, store, readQuery } from './core.js';
import { esc, icon, phoneTxt } from '../lib/util.js';
import { copyText, bindForm } from './basket.js';
import { personCard } from '../views/layout.js';

export function initHeader() {
  const hdr = $('[data-hdr]');
  if (!hdr || hdr.__bound) return;
  hdr.__bound = true;
  let openKey = null, hoverT = null;
  const panels = () => $$('[data-mega-panel]', hdr);
  const close = () => { openKey = null; panels().forEach((p) => (p.hidden = true)); $$('[data-mega]', hdr).forEach((b) => b.setAttribute('aria-expanded', 'false')); };
  const open = (key) => { openKey = key; panels().forEach((p) => (p.hidden = p.dataset.megaPanel !== key)); $$('[data-mega]', hdr).forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.mega === key))); };
  hdr.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mega]');
    if (b) { e.preventDefault(); openKey === b.dataset.mega ? close() : open(b.dataset.mega); }
    if (e.target.closest('[data-mega-panel] a')) close();
  });
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  hdr.addEventListener('pointerover', (e) => {
    if (!fine.matches) return;
    const b = e.target.closest('[data-mega]');
    clearTimeout(hoverT);
    if (b) hoverT = setTimeout(() => open(b.dataset.mega), 120);
    else if (e.target.closest('.nav__link') && !e.target.closest('[data-mega]')) hoverT = setTimeout(close, 120);
  });
  hdr.addEventListener('pointerleave', () => { if (!fine.matches) return; clearTimeout(hoverT); hoverT = setTimeout(close, 220); });
  hdr.addEventListener('pointerenter', () => clearTimeout(hoverT));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openKey) { const b = $(`[data-mega="${openKey}"]`, hdr); close(); b?.focus(); } });
  document.addEventListener('click', (e) => { if (openKey && !e.target.closest('[data-hdr]')) close(); });
  // Sprache
  const lb = $('.lang__btn', hdr), lm = $('#lang-menu', hdr);
  lb?.addEventListener('click', () => { const o = lm.hidden; lm.hidden = !o; lb.setAttribute('aria-expanded', String(o)); if (o) lm.querySelector('a')?.focus(); });
  document.addEventListener('click', (e) => { if (lm && !lm.hidden && !e.target.closest('[data-lang]')) { lm.hidden = true; lb.setAttribute('aria-expanded', 'false'); } });
  lm?.addEventListener('keydown', (e) => { if (e.key === 'Escape') { lm.hidden = true; lb.setAttribute('aria-expanded', 'false'); lb.focus(); } });
  // Schatten beim Scrollen
  const onScroll = () => hdr.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
}

export function initDrawer() {
  const dr = $('[data-drawer]');
  if (!dr || dr.__bound) return;
  dr.__bound = true;
  let last = null;
  const set = (on) => {
    dr.hidden = !on;
    document.body.style.overflow = on ? 'hidden' : '';
    $$('[data-drawer-open]').forEach((b) => b.setAttribute('aria-expanded', String(on)));
    if (on) { last = document.activeElement; dr.querySelector('.drawer__panel button, .drawer__panel a')?.focus(); } else last?.focus?.();
  };
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-drawer-open]')) set(true);
    else if (e.target.closest('[data-drawer-close]')) set(false);
    else if (!dr.hidden && e.target.closest('.drawer__panel a')) set(false);
    else if (!dr.hidden && e.target.closest('.drawer__panel [data-search-open]')) set(false);
  });
  document.addEventListener('keydown', (e) => {
    if (dr.hidden) return;
    if (e.key === 'Escape') { set(false); return; }
    // Fokus im geöffneten Menü halten
    if (e.key === 'Tab') {
      const f = $$('.drawer__panel a[href], .drawer__panel button:not([disabled]), .drawer__panel input, .drawer__panel select', dr).filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}

export function initTheme() {
  const apply = (v) => {
    const d = document.documentElement;
    // „System“: Vorgabe der umgebenden Ansicht (falls vorhanden) wiederherstellen, sonst Betriebssystem
    if (v === 'light' || v === 'dark') d.dataset.theme = v; else if (d.dataset.hostTheme) d.dataset.theme = d.dataset.hostTheme; else delete d.dataset.theme;
    $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === (v || 'auto'))));
  };
  apply(store.get('ritz-theme', 'auto'));
  if (document.__themeBound) return;
  document.__themeBound = true;
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-theme-set]'); if (b) { store.set('ritz-theme', b.dataset.themeSet); apply(b.dataset.themeSet); } });
}

export function initCopy() {
  if (document.__copyBound) return;
  document.__copyBound = true;
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b || b.closest('[data-map-detail]')) return;
    e.preventDefault();
    copyText(b.dataset.copy, await getT());
  });
}

export function initGallery(root) {
  const g = $('[data-gallery]', root);
  if (!g) return;
  const main = $('[data-gallery-main]', g);
  g.addEventListener('click', (e) => {
    const vb = e.target.closest('[data-gallery-view]');
    if (vb) {
      $$('[data-gallery-view]', g).forEach((x) => x.setAttribute('aria-current', String(x === vb)));
      $$('[data-view]', g).forEach((v) => { v.hidden = v.dataset.view !== vb.dataset.galleryView; });
      return;
    }
    const th = e.target.closest('[data-gallery-thumb]');
    if (th) {
      $$('[data-gallery-thumb]', g).forEach((x) => x.setAttribute('aria-current', String(x === th)));
      const img = main.querySelector('img'), src = th.querySelector('img');
      if (img && src) { img.srcset = th.dataset.srcset || src.srcset; img.src = th.dataset.full || src.src; img.sizes = th.dataset.sizes || '(max-width: 900px) 100vw, 58vw'; img.classList.toggle('is-lowres', 'lowres' in th.dataset); }
      return;
    }
    if (e.target.closest('[data-gallery-main]')) {
      const img = main.querySelector('img');
      if (!img) return;
      const lb = document.createElement('div');
      lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
      lb.innerHTML = `<img src="${img.currentSrc || img.src}" alt="${esc(img.alt)}"><button class="icon-btn" type="button" aria-label="×">${icon('close')}</button>`;
      const close = () => { lb.remove(); document.removeEventListener('keydown', esc_); main.focus(); };
      const esc_ = (ev) => { if (ev.key === 'Escape') close(); };
      lb.addEventListener('click', close);
      document.addEventListener('keydown', esc_);
      document.body.appendChild(lb);
      lb.querySelector('button').focus();
    }
  });
}

export function initTabs(root) {
  const bar = $('[data-tabs]', root);
  if (!bar) return;
  const links = $$('a', bar);
  const secs = links.map((a) => document.getElementById(a.getAttribute('href').slice(1)));
  let cur = -1;
  // Aktiv ist der letzte Abschnitt, dessen Oberkante die 35-%-Linie passiert hat
  window.__ritzTabs = () => {
    if (!bar.isConnected) { window.__ritzTabs = null; return; }
    const line = innerHeight * 0.35;
    let i = 0;
    secs.forEach((s, k) => { if (s && s.getBoundingClientRect().top <= line) i = k; });
    if (i === cur) return;
    cur = i;
    links.forEach((a, k) => { a.classList.toggle('is-active', k === i); if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    const a = links[i];
    if (bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: Math.max(0, a.offsetLeft - 16), behavior: 'smooth' });
  };
  if (!window.__ritzTabsBound) {
    window.__ritzTabsBound = true;
    let ticking = false;
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; window.__ritzTabs?.(); }); } }, { passive: true });
  }
  window.__ritzTabs();
}

export function initFilters(root) {
  // Stellen
  const jobs = $('[data-jobs]', root);
  if (jobs) {
    const loc = $('[data-jobs-loc]', jobs), ty = $('[data-jobs-type]', jobs);
    const run = () => $$('[data-city]', jobs).forEach((j) => { j.hidden = (loc.value && j.dataset.city !== loc.value) || (ty.value && j.dataset.type !== ty.value); });
    loc?.addEventListener('change', run); ty?.addEventListener('change', run);
  }
  // News
  const news = $('[data-news]', root);
  if (news) news.addEventListener('click', (e) => {
    const b = e.target.closest('[data-news-cat]');
    if (!b) return;
    $$('[data-news-cat]', news).forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    $$('[data-cat]', news).forEach((c) => { c.hidden = b.dataset.newsCat && c.dataset.cat !== b.dataset.newsCat; });
  });
}

export async function initContactFinder(root) {
  const box = $('[data-contact-finder]', root);
  if (!box) return;
  const [contacts, t, ctx] = await Promise.all([getData('contacts'), getT(), clientCtx()]);
  const area = $('[data-cf-area]', box), country = $('[data-cf-country]', box), out = $('[data-cf-result]', box);
  let dn = null;
  try { dn = new Intl.DisplayNames([CFG.lang], { type: 'region' }); } catch (e) { /* alt */ }
  const run = () => {
    const parts = [];
    if (area.value) {
      const ppl = contacts.people.filter((p) => p.areas.includes(area.value));
      if (ppl.length) parts.push(`<h3 class="h5">${esc(t.lbl.area[area.value])}</h3><div class="people people--stack">${ppl.map((p) => personCard(ctx, p)).join('')}</div>`);
    }
    if (country.value) {
      const c = country.value;
      const name = dn && c.length === 2 ? dn.of(c) : c;
      const reps = c === 'DE' ? contacts.repsDE : contacts.reps.filter((r) => r.country === c);
      if (reps.length) parts.push(`<h3 class="h5">${esc(t.contactFinder.repFor.replace('{c}', name))}</h3><div class="people people--stack">${reps.map((r) => `<article class="person"><h3>${esc(r.company)}</h3>${(r.address || []).length ? `<address class="addr">${(CFG.lang === 'de' ? r.address : r.address_en || r.address).map(esc).join('<br>')}</address>` : ''}<div class="lines">${r.phone ? `<a href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}">${icon('phone')}<span>${phoneTxt(r.phone)}</span></a>` : ''}${r.email ? `<a href="mailto:${esc(r.email)}">${icon('mail')}<span>${esc(r.email)}</span></a>` : ''}</div></article>`).join('')}</div>`);
      else if (c !== 'other') parts.push(`<p class="notice small">${esc(t.contactFinder.noRep.replace('{c}', name))}</p>`);
    }
    out.innerHTML = parts.length ? `<div class="stack mt" style="--s:1rem">${parts.join('')}</div>` : '';
  };
  area.addEventListener('change', run); country.addEventListener('change', run);
}

export async function initForms(root) {
  const f = $('[data-contact-form]', root);
  if (!f) return;
  const [t, ctx] = await Promise.all([getT(), clientCtx()]);
  // Vorbelegung über die Adresse (z. B. Maßbild- oder Dokumentanforderung): ?topic=2&msg=…
  const qs = new URLSearchParams(readQuery());
  const msg = qs.get('msg'), topic = qs.get('topic');
  const sel = f.querySelector('[name=topic]'), ta = f.querySelector('[name=message]');
  if (topic && sel && sel.options[+topic]) sel.selectedIndex = +topic;
  if (msg && ta && !ta.value) ta.value = msg;
  bindForm(f, t, ctx, 'contact');
}

export function initHero(root) {
  const form = $('[data-hero-search]', root);
  if (!form) return;
  const input = form.querySelector('input');
  const go = async (q) => {
    const ctx = await clientCtx();
    const idx = ctx.data.products;
    const cq = q.toLowerCase().replace(/[^a-z0-9]/g, '');
    const exact = idx.find((p) => p.code.toLowerCase().replace(/[^a-z0-9]/g, '') === cq);
    location.href = exact ? ctx.href('product', { area: exact.area, slug: exact.id }) : ctx.href('finder', {}, { q });
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); if (input.value.trim()) go(input.value.trim()); });
  $$('[data-hint]', root).forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.hint; go(b.dataset.hint); }));
}

export function initGotoSearch(root) {
  const f = $('[data-goto-search]', root);
  if (!f) return;
  f.addEventListener('submit', async (e) => { e.preventDefault(); const ctx = await clientCtx(); location.href = ctx.href('search', {}, { q: f.querySelector('input').value }); });
}
