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

function reveal(el, i) {
  const kind = el.dataset.reveal;
  if (kind === 'img') el.style.setProperty('--rv-i', i);
  if (kind === 'facts') [...el.children].forEach((c, k) => c.style.setProperty('--rv-i', k));
  el.classList.add('is-in');
  if (kind === 'facts') runCounts(el);
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
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      reveal(e.target, n++);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });
  for (const el of els) io.observe(el);
}
