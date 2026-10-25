// Bewegung auf der Startseite: Einblenden beim Scrollen, Zählwerke und Standortnetz.
// Die Ausgangszustände setzt das CSS, und zwar nur unter :root.rv (Kopfskript in build.mjs). Hier wird nur
// ausgelöst. Ohne JavaScript, ohne IntersectionObserver oder bei reduzierter Bewegung bleibt alles sichtbar.
const d = document.documentElement;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Erste Zahl im Text, ggf. mit Tausendertrennzeichen; Bereiche („0,72–550 kV“) und Jahreszahlen bleiben stehen
const NUM = /^(\D*?)(\d{1,3}(?:([.,   ])\d{3})+|\d+)(\D*)$/;
const fmt = (v, sep) => (sep ? String(v).replace(/\B(?=(\d{3})+(?!\d))/g, sep) : String(v));

function prepCounts(el) {
  for (const s of el.querySelectorAll('[data-count]')) {
    if (s.__count) continue;
    const txt = s.textContent.trim();
    const m = NUM.exec(txt);
    if (!m) continue;
    const [, pre, num, sep, post] = m;
    const val = parseInt(num.replace(/\D/g, ''), 10);
    if (!val || (!sep && num.length === 4 && val >= 1800 && val <= 2100)) continue;
    // Vorleser hören immer den Endwert; sichtbar läuft das Zählwerk
    const vh = document.createElement('span');
    vh.className = 'vh';
    vh.textContent = txt;
    const vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    const n = document.createElement('span');
    n.className = 'cnt__n';
    n.textContent = num;
    vis.append(pre, n, post);
    s.replaceChildren(vh, vis);
    s.__count = { n, val, sep, num };
  }
}

function runCounts(el) {
  for (const s of el.querySelectorAll('[data-count]')) {
    const c = s.__count;
    if (!c) continue;
    const { n, val, sep, num } = c;
    n.textContent = num;
    n.style.minWidth = `${Math.ceil(n.getBoundingClientRect().width)}px`; // Breite des Endwerts: nichts springt
    n.textContent = fmt(0, sep);
    const t0 = performance.now();
    const dur = val >= 100 ? 1400 : 1100;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 4);
      n.textContent = fmt(Math.round(val * e), sep);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}

// Zählwerke erst nach dem Intro starten (sonst laufen sie unsichtbar hinter dem Vorhang ab)
function afterIntro(fn) {
  if (d.dataset.intro !== 'play') { fn(); return; }
  const mo = new MutationObserver(() => { if (d.dataset.intro !== 'play') { mo.disconnect(); fn(); } });
  mo.observe(d, { attributes: true, attributeFilter: ['data-intro'] });
}

function reveal(el, i) {
  const kind = el.dataset.reveal;
  if (kind === 'img') el.style.setProperty('--rv-i', i);
  if (kind === 'facts' || kind === 'team') [...el.children].forEach((c, k) => c.style.setProperty('--rv-i', k));
  el.classList.add('is-in');
  if (kind === 'facts') afterIntro(() => runCounts(el));
}

export function initMotion(root = document) {
  const els = [...root.querySelectorAll('[data-reveal]')].filter((el) => !el.dataset.rvReady);
  if (!els.length) return;
  for (const el of els) el.dataset.rvReady = '1';
  const ok = !reduced() && 'IntersectionObserver' in window;
  // Vorschau: Inhalte entstehen erst per JavaScript, die Ausgangszustände können also hier gesetzt werden
  if (ok && window.__RITZ__?.mode === 'spa') d.classList.add('rv');
  if (!ok || !d.classList.contains('rv')) {
    for (const el of els) el.classList.add('is-in');
    return;
  }
  d.classList.add('rv-ok');
  for (const el of els) if (el.dataset.reveal === 'facts') prepCounts(el);
  const io = new IntersectionObserver((entries) => {
    let n = 0;
    for (const e of entries) {
      // auch was schon über den oberen Rand hinaus ist (schnelles Scrollen, Sprung, beschäftigter Hauptthread):
      // sonst bliebe es unsichtbar, bis man zurückscrollt
      if (!e.isIntersecting && !(e.boundingClientRect.bottom < (e.rootBounds?.top ?? 0))) continue;
      io.unobserve(e.target);
      reveal(e.target, n++);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });
  for (const el of els) io.observe(el);
}

// Bühne der Startseite: Bildwechsel alle 7 s (Überblendung), anhalten per Knopf, bei verborgenem Tab, außerhalb
// des Sichtbereichs und während des Intros. Bei reduzierter Bewegung kein automatischer Wechsel.
const SLIDE_MS = 7000;
export function initHero2(root = document) {
  const h = root.querySelector('[data-hero2]');
  if (!h || h.__h2) return;
  h.__h2 = true;
  const slides = [...h.querySelectorAll('[data-slide]')];
  if (slides.length < 2) return;
  h.style.setProperty('--slide-ms', `${SLIDE_MS}ms`);
  const dots = [...h.querySelectorAll('[data-goto]')];
  const btn = h.querySelector('[data-hero2-pause]');
  let i = 0, timer = 0, visible = true, paused = reduced();
  const warm = (k) => { const img = slides[k % slides.length].querySelector('img'); if (img) img.loading = 'eager'; };
  const setPaused = (v) => {
    paused = v;
    h.classList.toggle('is-paused', v);
    if (btn) { btn.setAttribute('aria-pressed', String(v)); btn.setAttribute('aria-label', v ? btn.dataset.lPlay : btn.dataset.lPause); }
  };
  const show = (k) => {
    k = (k + slides.length) % slides.length;
    if (k === i) return;
    warm(k);
    slides[i].classList.remove('is-on');
    slides[k].classList.add('is-on');
    dots.forEach((dt, n) => dt.setAttribute('aria-current', String(n === k)));
    // Fortschrittsbalken neu starten
    const bar = dots[k]?.querySelector('i');
    if (bar) { bar.style.display = 'none'; void bar.offsetWidth; bar.style.display = ''; }
    i = k;
    warm(k + 1);
  };
  const tick = () => {
    clearTimeout(timer);
    if (!h.isConnected) { document.removeEventListener('visibilitychange', tick); return; }
    if (paused || !visible || document.hidden) return;
    if (d.dataset.intro === 'play') { timer = setTimeout(tick, 400); return; }
    timer = setTimeout(() => { show(i + 1); tick(); }, SLIDE_MS);
  };
  dots.forEach((dt) => dt.addEventListener('click', () => { show(+dt.dataset.goto); tick(); }));
  btn?.addEventListener('click', () => { setPaused(!paused); tick(); });
  document.addEventListener('visibilitychange', tick);
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; tick(); }, { threshold: 0.25 }).observe(h);
  setPaused(paused);
  // zweites Bild vorladen, sobald die Seite steht
  if ('requestIdleCallback' in window) requestIdleCallback(() => warm(1)); else setTimeout(() => warm(1), 1500);
  tick();
}

// Bühne der Startseite: Kopf liegt transparent über der Bühne, bis sie verlassen ist; Schleifen ruhen außerhalb
// des Sichtbereichs. Spektrum: Bereich unter Zeiger oder Fokus wird hervorgehoben (Vorschau rechts).
// Werke: Listeneintrag hebt seinen Punkt auf der Karte hervor.
export function initStage(root = document) {
  const st = root.querySelector('[data-stage]');
  const hdrNow = () => document.querySelector('[data-hdr]');
  if (st && !st.__st) {
    st.__st = true;
    // Kopf transparent, solange die Bühne unter ihm liegt (Unterkante der Bühne tiefer als Kopfhöhe + 8 px).
    // IntersectionObserver mit oben um die Kopfhöhe verkleinertem Sichtbereich: keine Messung bei jedem Scrollbild
    const watch = () => {
      window.__stIO?.disconnect();
      const hh = hdrNow()?.offsetHeight || 68;
      if (!('IntersectionObserver' in window)) { hdrNow()?.classList.toggle('hdr--over', st.getBoundingClientRect().bottom > hh + 8); return; }
      window.__stIO = new IntersectionObserver(([e]) => { if (st.isConnected) hdrNow()?.classList.toggle('hdr--over', e.isIntersecting); else { window.__stIO?.disconnect(); hdrNow()?.classList.remove('hdr--over'); } }, { rootMargin: `-${hh + 8}px 0px 0px 0px` });
      window.__stIO.observe(st);
    };
    watch();
    let rt = 0;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (st.isConnected) watch(); }, 150); }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => st.classList.toggle('is-idle', !e.isIntersecting)).observe(st);
  } else if (!st) { window.__stIO?.disconnect(); hdrNow()?.classList.remove('hdr--over'); }
  const sp = root.querySelector('[data-spectrum]');
  if (sp && !sp.__sp) {
    sp.__sp = true;
    const rows = [...sp.querySelectorAll('[data-sp]')];
    const figs = [...sp.querySelectorAll('[data-sp-fig]')];
    const on = (a) => {
      rows.forEach((r) => r.classList.toggle('is-on', r.dataset.sp === a));
      figs.forEach((f) => f.classList.toggle('is-on', f.dataset.spFig === a));
    };
    rows.forEach((r) => { r.addEventListener('pointerenter', () => on(r.dataset.sp)); r.addEventListener('focus', () => on(r.dataset.sp)); });
  }
  const wl = root.querySelector('.world__list');
  if (wl && !wl.__wl) {
    wl.__wl = true;
    const hot = (id) => root.querySelectorAll('[data-loc-dot]').forEach((d) => d.classList.toggle('is-hot', d.dataset.locDot === id));
    wl.addEventListener('pointerover', (e) => { const a = e.target.closest('[data-loc]'); hot(a ? a.dataset.loc : null); });
    wl.addEventListener('pointerleave', () => hot(null));
    wl.addEventListener('focusin', (e) => { const a = e.target.closest('[data-loc]'); hot(a ? a.dataset.loc : null); });
    wl.addEventListener('focusout', () => hot(null));
  }
}

// Einblendungen mit Scroll-Zeitachse (motion.css): Jede aktive Animation dieser Art lässt den Browser bei jedem
// Scrollbild den Stil ihres Elements neu berechnen – auf langen Seiten mehrere hundert Elemente. Weit außerhalb des
// Bildschirms (mehr als gut eine Fensterhöhe) sieht man sie nicht, dort wird die Animation ausgesetzt (.sv-off).
// Oberhalb ist ihr Endzustand ohnehin „keine Veränderung“, unterhalb wird sie rechtzeitig vor dem Eintreten wieder
// angehängt – sichtbar ändert sich nichts. Nur Elemente, deren Animationen ausschließlich scrollgebunden sind.
let svIO = null;
export function initScrollGate() {
  if (!('IntersectionObserver' in window) || !document.getAnimations || typeof DocumentTimeline === 'undefined') return;
  const run = () => {
    // ausgesetzte Elemente haben keine Animation und fehlten sonst in der Liste: erst alle wieder freigeben
    svIO?.disconnect();
    document.querySelectorAll('.sv-off').forEach((el) => el.classList.remove('sv-off'));
    const hosts = new Map();
    for (const a of document.getAnimations()) {
      const t = a.effect?.target;
      if (!t) continue;
      const scroll = !!a.timeline && !(a.timeline instanceof DocumentTimeline);
      if (!scroll) hosts.set(t, false);
      else if (!hosts.has(t)) hosts.set(t, true);
    }
    svIO?.disconnect();
    svIO = new IntersectionObserver((es) => { for (const e of es) e.target.classList.toggle('sv-off', !e.isIntersecting); }, { rootMargin: '125% 0px 125% 0px' });
    for (const [el, ok] of hosts) if (ok && el.isConnected && el !== document.documentElement && !el.closest('.hdr')) svIO.observe(el);
  };
  requestAnimationFrame(() => requestAnimationFrame(run));
  // zweiter Durchgang, wenn Einstiegsanimationen (z. B. Seitenkopf) abgelaufen sind: deren Elemente kommen dann dazu
  clearTimeout(window.__svT); window.__svT = setTimeout(run, 2600);
}

