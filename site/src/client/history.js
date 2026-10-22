// Geschichte als Zeitreise (Seite „Über RITZ“): Die Etappe in der Bildschirmmitte ist aktiv; die Bühne zeigt ihre
// Jahreszahl (rollende Ziffern), ihr Bild (Wischblende in Scrollrichtung) und den Stand auf der Zeitskala.
// Springen per Klick auf die Skala, Pfeiltasten, Pos1/Ende auf der Skala sowie Zurück/Weiter.
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initHistory(root = document) {
  const hx = root.querySelector('[data-hx]');
  if (!hx || hx.__hx) return;
  hx.__hx = true;
  const steps = [...hx.querySelectorAll('[data-hx-step]')];
  if (steps.length < 2 || !('IntersectionObserver' in window)) return;
  const shots = [...hx.querySelectorAll('[data-hx-shot]')];
  const marks = [...hx.querySelectorAll('[data-hx-go]')];
  const digs = [...hx.querySelectorAll('.hx__dig')];
  const frame = hx.querySelector('.hx__frame');
  const nEl = hx.querySelector('[data-hx-n]');
  const label = hx.querySelector('[data-hx-label]');
  const prev = hx.querySelector('[data-hx-prev]');
  const next = hx.querySelector('[data-hx-next]');
  const last = steps.length - 1;
  hx.classList.add('is-live');
  let cur = -1, lock = 0;
  const warm = (i) => { const img = shots[i]?.querySelector('img'); if (img && img.loading === 'lazy') img.loading = 'eager'; };
  const set = (i) => {
    i = Math.max(0, Math.min(last, i));
    if (i === cur) return;
    const was = cur;
    hx.classList.toggle('is-back', was > i);
    shots.forEach((s, k) => { s.classList.toggle('is-prev', k === was); s.classList.toggle('is-on', k === i); });
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    marks.forEach((m, k) => { m.classList.toggle('is-past', k < i); if (k === i) m.setAttribute('aria-current', 'step'); else m.removeAttribute('aria-current'); });
    const y = steps[i].dataset.year || '';
    [...y].forEach((c, k) => digs[k]?.style.setProperty('--d', c));
    hx.style.setProperty('--hx-p', (i / last).toFixed(4));
    if (nEl) nEl.textContent = String(i + 1).padStart(2, '0');
    if (label) label.textContent = y;
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === last;
    if (frame && was >= 0 && !reduced()) { frame.classList.remove('is-wipe'); void frame.offsetWidth; frame.classList.add('is-wipe'); }
    cur = i;
    warm(i + 1); warm(i - 1);
  };
  // Aktiv ist die Etappe, die die waagerechte Mittellinie des Fensters schneidet
  const io = new IntersectionObserver((entries) => {
    if (performance.now() < lock) return;
    for (const e of entries) if (e.isIntersecting) set(+e.target.dataset.hxStep);
  }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
  for (const s of steps) io.observe(s);
  const go = (i) => {
    i = Math.max(0, Math.min(last, i));
    set(i);
    lock = performance.now() + (reduced() ? 120 : 1100); // während des Bildlaufs nicht über Zwischenetappen zurückschalten
    steps[i].scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
  };
  marks.forEach((m) => m.addEventListener('click', () => go(+m.dataset.hxGo)));
  prev?.addEventListener('click', () => go(cur - 1));
  next?.addEventListener('click', () => go(cur + 1));
  hx.querySelector('[data-hx-ruler]')?.addEventListener('keydown', (e) => {
    if (!e.target.closest('[data-hx-go]')) return;
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (d == null && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const i = Math.max(0, Math.min(last, e.key === 'Home' ? 0 : e.key === 'End' ? last : cur + d));
    go(i);
    marks[i]?.focus();
  });
  set(0);
  warm(0);
}
