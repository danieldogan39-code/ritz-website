// Bedienelemente: Kopfnavigation, Drawer, Sprache, Darstellung, Kopieren, Galerie, Tabs, Filter, Kontaktfinder
import { $, $$, getT, getData, clientCtx, CFG, store, readQuery } from './core.js';
import { esc, icon, phoneTxt } from '../lib/util.js';
import { copyText, bindForm } from './basket.js';
import { personCard } from '../views/layout.js';

// App-Leiste (Telefon): beim Tippen in ein Eingabefeld zieht sie sich zurück, damit sie nicht über der Tastatur klebt
// App-Leiste: weicht der Bildschirmtastatur. Ob die Tastatur offen ist, zeigt die sichtbare Fläche (visualViewport) –
// sie schrumpft um die Tastatur. Der Fokus allein genügt nicht: Schließt man die Tastatur, ohne das Feld zu verlassen
// (Android „Zurück“, iOS nach unten wischen), bliebe die Leiste sonst verschwunden.
export function initAppBar() {
  const bar = $('[data-abar]');
  if (!bar || document.__abar) return;
  document.__abar = true;
  const root = document.documentElement;
  const vv = window.visualViewport;
  const typing = (el) => el && el.matches?.('input:not([type="checkbox"], [type="radio"], [type="button"], [type="submit"], [type="reset"], [type="range"], [type="color"], [type="file"]), textarea, select, [contenteditable="true"]');
  let full = 0, width = 0;
  const update = () => {
    const h = vv ? vv.height * (vv.scale || 1) : innerHeight;
    if (Math.abs(innerWidth - width) > 40) { width = innerWidth; full = 0; } // gedreht: neu messen
    full = Math.max(full, h);
    root.classList.toggle('is-typing', !!typing(document.activeElement) && h < full - 120);
  };
  update();
  vv?.addEventListener('resize', update);
  addEventListener('resize', update);
  document.addEventListener('focusin', () => { update(); setTimeout(update, 400); });
  document.addEventListener('focusout', () => setTimeout(update, 60));
}

export function initHeader() {
  const hdr = $('[data-hdr]');
  if (!hdr || hdr.__bound) return;
  hdr.__bound = true;
  let openKey = null, hoverT = null;
  const panels = () => $$('[data-mega-panel]', hdr);
  // Ausblenden: Panel bleibt kurz sichtbar und blendet aus (motion.css, .is-leaving), dann hidden
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hide = (p) => {
    if (p.hidden || p.classList.contains('is-leaving')) return;
    if (still()) { p.hidden = true; return; }
    p.classList.add('is-leaving');
    p.__leaveT = setTimeout(() => { p.classList.remove('is-leaving'); p.hidden = true; }, 170);
  };
  const show = (p) => { clearTimeout(p.__leaveT); p.classList.remove('is-leaving'); p.hidden = false; };
  const close = () => { openKey = null; hdr.classList.remove('is-open'); panels().forEach(hide); $$('[data-mega]', hdr).forEach((b) => b.setAttribute('aria-expanded', 'false')); };
  // Vorschau-Spalte: Die Liste ist mindestens so hoch wie die sichtbare Vorschau (diese liegt absolut daneben)
  const fit = (list) => { const p = list && list.querySelector('.mg__row.is-on .mg__pane'); if (list) list.style.minHeight = p ? `${p.offsetHeight}px` : ''; };
  const pick = (row) => {
    if (!row || row.classList.contains('is-on')) return;
    for (const r of row.parentElement.children) r.classList.toggle('is-on', r === row);
    fit(row.parentElement);
  };
  const open = (key) => {
    openKey = key; hdr.classList.add('is-open');
    panels().forEach((p) => {
      if (p.dataset.megaPanel !== key) { hide(p); return; }
      show(p);
      p.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
      fit(p.querySelector('.mg__list'));
    });
    $$('[data-mega]', hdr).forEach((b) => b.setAttribute('aria-expanded', String(b.dataset.mega === key)));
  };
  // Eintrag per Zeiger erst nach kurzer Verweildauer wählen (Diagonale zur Vorschau schaltet nicht um), per Tastatur sofort
  let rowT = null;
  hdr.addEventListener('pointerover', (e) => { const it = e.target.closest('.mg__item'); clearTimeout(rowT); if (it) rowT = setTimeout(() => pick(it.parentElement), 70); });
  hdr.addEventListener('focusin', (e) => { const it = e.target.closest('.mg__item'); if (it) pick(it.parentElement); });
  // Zeiger: Öffnen und Schließen mit getrennten Zeitgebern. Fährt die Maus von außen direkt auf einen Menüpunkt,
  // meldet der Browser erst „pointerover“ am Punkt und danach „pointerenter“ an der Kopfleiste – das Betreten darf
  // deshalb nur ein geplantes Schließen aufheben, nie das gerade geplante Öffnen.
  let openT = null, hoverAt = 0;
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const mouse = (e) => fine.matches && e.pointerType !== 'touch';
  hdr.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mega]');
    if (b) {
      e.preventDefault();
      clearTimeout(openT);
      // gerade per Zeiger geöffnet: ein Klick aus Gewohnheit bestätigt nur, statt das Menü wieder zu schließen
      if (openKey === b.dataset.mega) { if (performance.now() - hoverAt > 600) close(); } else open(b.dataset.mega);
    }
    if (e.target.closest('[data-mega-panel] a')) close();
  });
  hdr.addEventListener('pointerover', (e) => {
    if (!mouse(e)) return;
    const b = e.target.closest('[data-mega]');
    if (b) {
      clearTimeout(hoverT);
      clearTimeout(openT);
      if (openKey === b.dataset.mega) return;
      // ist schon ein Menü offen, wechselt es schneller
      openT = setTimeout(() => { open(b.dataset.mega); hoverAt = performance.now(); }, openKey ? 70 : 120);
      return;
    }
    clearTimeout(openT);
    if (e.target.closest('[data-mega-panel]')) { clearTimeout(hoverT); return; } // im offenen Panel bleibt es offen
    if (e.target.closest('.nav__link')) { clearTimeout(hoverT); hoverT = setTimeout(close, 120); }
  });
  hdr.addEventListener('pointerleave', (e) => { if (!mouse(e)) return; clearTimeout(openT); clearTimeout(hoverT); hoverT = setTimeout(close, 220); });
  hdr.addEventListener('pointerenter', () => clearTimeout(hoverT));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openKey) { const b = $(`[data-mega="${openKey}"]`, hdr); close(); b?.focus(); } });
  // Fokus verlässt Knopf und Panel (Tab weiter zum nächsten Menüpunkt): Menü schließen
  hdr.addEventListener('focusout', (e) => {
    if (!openKey || !e.relatedTarget) return;
    const item = $(`[data-mega="${openKey}"]`, hdr)?.parentElement;
    if (item && !item.contains(e.relatedTarget)) close();
  });
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

// Handy-Menü. Die Vorschau (SPA) ersetzt das Menü bei jedem Seitenwechsel: das Akkordeon hängt am jeweiligen Element,
// Öffnen, Schließen und Tastatur hängen einmal am Dokument und greifen auf das aktuelle Menü zu.
const DRW = { last: null, closeT: 0 };
const drawerStill = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Öffnen: sichtbar machen, Ausgangslage übernehmen lassen, dann .is-open (Übergänge in main.css);
// Schließen: .is-open entfernen und erst nach dem Hinausgleiten verbergen
function drawerSet(on) {
  const dr = $('[data-drawer]');
  if (!dr) return;
  const root = document.documentElement;
  clearTimeout(DRW.closeT);
  if (on) {
    root.classList.add('has-drawer'); // darunter liegende Leisten ohne Weichzeichner (siehe main.css)
    dr.hidden = false;
    void dr.offsetWidth;
    dr.classList.add('is-open');
  } else {
    dr.classList.remove('is-open');
    const gone = () => { dr.hidden = true; root.classList.remove('has-drawer'); };
    if (drawerStill()) gone(); else DRW.closeT = setTimeout(gone, 320);
  }
  document.body.style.overflow = on ? 'hidden' : '';
  $$('[data-drawer-open]').forEach((b) => b.setAttribute('aria-expanded', String(on)));
  if (on) { DRW.last = document.activeElement; dr.querySelector('.drawer__panel button, .drawer__panel a')?.focus({ preventScroll: true }); } else DRW.last?.focus?.({ preventScroll: true });
}
export function initDrawer() {
  const dr = $('[data-drawer]');
  if (!dr || dr.__bound) return;
  dr.__bound = true;
  const still = drawerStill;
  // Akkordeon: per Skript animiert (in allen Browsern gleich weich), nur ein Abschnitt offen. Schließt sich ein
  // Abschnitt oberhalb, bleibt der angetippte Eintrag an seinem Platz (Scrollausgleich je Bild).
  const body = dr.querySelector('.drawer__body');
  const run = new WeakMap();
  const EASE = 'cubic-bezier(.32, .72, 0, 1)'; // wie die Schublade selbst: weicher Anlauf ohne Sprung im ersten Bild
  const slide = (d, open) => {
    const ul = d.querySelector(':scope > ul');
    // läuft noch eine Animation (schnelles Tippen), geht es von der aktuellen Höhe aus weiter statt zu springen
    const prev = run.get(d);
    const from = prev && ul ? ul.getBoundingClientRect().height : null;
    const fromO = prev && ul ? parseFloat(getComputedStyle(ul).opacity) : null;
    prev?.cancel();
    run.delete(d);
    if (ul) ul.style.height = '';
    d.classList.toggle('is-closing', !open);
    if (still() || !ul?.animate) { d.open = open; d.classList.remove('is-closing'); return; }
    const done = (a, fn) => { a.onfinish = () => { fn?.(); ul.style.height = ''; a.cancel(); run.delete(d); }; };
    if (open) {
      ul.style.height = `${from ?? 0}px`; // Sicherheitsnetz: kein Bild in voller Höhe, bevor die Animation greift
      d.open = true;
      const h = ul.scrollHeight;
      const a = ul.animate([{ height: `${from ?? 0}px`, opacity: fromO ?? 0, translate: from === null ? '0 -6px' : '0 0' }, { height: `${h}px`, opacity: 1, translate: '0 0' }], { duration: 380, easing: EASE, fill: 'forwards' });
      run.set(d, a);
      done(a);
    } else {
      const h = from ?? ul.offsetHeight;
      const a = ul.animate([{ height: `${h}px`, opacity: fromO ?? 1 }, { height: '0px', opacity: 0 }], { duration: 340, easing: EASE, fill: 'forwards' });
      run.set(d, a);
      done(a, () => { d.open = false; d.classList.remove('is-closing'); });
    }
  };
  dr.addEventListener('click', (e) => {
    const sm = e.target.closest('.mnav summary');
    if (!sm) return;
    e.preventDefault();
    const d = sm.parentElement;
    const opening = !d.open || d.classList.contains('is-closing');
    const top0 = sm.getBoundingClientRect().top;
    // Abschnitte oberhalb, die jetzt zuklappen: ihre Höhe verschwindet über dem angetippten Eintrag
    const above = [...dr.querySelectorAll('.mnav details[open]')].filter((o) => o !== d && !o.classList.contains('is-closing') && (o.compareDocumentPosition(d) & Node.DOCUMENT_POSITION_FOLLOWING));
    const ulOf = (o) => o.querySelector(':scope > ul');
    const H = above.reduce((h, o) => h + (ulOf(o)?.offsetHeight || 0), 0);
    for (const o of dr.querySelectorAll('.mnav details[open]')) if (o !== d && !o.classList.contains('is-closing')) slide(o, false);
    slide(d, opening);
    if (!body || still() || !H) return;
    // Scrollausgleich im Takt der Animation: was der Scrollstand auffangen kann, bleibt ruhig; den Rest legt der Eintrag
    // in derselben Kurve zurück (kein Stehen-und-dann-Springen, wenn der Scrollstand oben anschlägt)
    const D = Math.max(0, H - body.scrollTop);
    const t0 = performance.now();
    const hold = () => {
      const hNow = above.reduce((h, o) => h + (o.open ? ulOf(o)?.getBoundingClientRect().height || 0 : 0), 0);
      const p = Math.min(1, Math.max(0, (H - hNow) / H));
      const dy = sm.getBoundingClientRect().top - (top0 - D * p);
      if (Math.abs(dy) > 0.5) body.scrollTop += dy;
      if (performance.now() - t0 < 420 && p < 1) requestAnimationFrame(hold);
    };
    requestAnimationFrame(hold);
  });
  if (document.__drawerDoc) return;
  document.__drawerDoc = true;
  document.addEventListener('click', (e) => {
    const cur = $('[data-drawer]');
    if (!cur) return;
    if (e.target.closest('[data-drawer-open]')) drawerSet(true);
    else if (e.target.closest('[data-drawer-close]')) drawerSet(false);
    else if (!cur.hidden && e.target.closest('.drawer__panel a')) drawerSet(false);
    else if (!cur.hidden && e.target.closest('.drawer__panel [data-search-open]')) drawerSet(false);
  });
  document.addEventListener('keydown', (e) => {
    const cur = $('[data-drawer]');
    if (!cur || cur.hidden || !cur.classList.contains('is-open')) return;
    if (e.key === 'Escape') { drawerSet(false); return; }
    // Fokus im geöffneten Menü halten
    if (e.key === 'Tab') {
      const f = $$('.drawer__panel a[href], .drawer__panel button:not([disabled]), .drawer__panel input, .drawer__panel select', cur).filter((x) => x.offsetParent !== null);
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
    const cat = b.dataset.newsCat;
    $$('[data-news-cat]', news).forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    // Ohne Filter stehen die drei Fokus-Beiträge oben als Karten; mit Filter erscheinen alle Treffer in der Liste
    const feat = $('[data-news-feat]', news);
    if (feat) feat.hidden = !!cat;
    $$('[data-cat]', news).forEach((c) => { c.hidden = cat ? c.dataset.cat !== cat : c.hasAttribute('data-feat'); });
    $$('[data-year]', news).forEach((y) => { y.hidden = !y.querySelector('[data-cat]:not([hidden])'); });
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
