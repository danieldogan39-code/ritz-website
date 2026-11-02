// Firmenfilm: Standbild mit Startknopf, Kapitelleiste mit Fortschritt, Sprung von der Bühne aus.
// Ohne Skript steht der Film mit den Bedienelementen des Browsers da (preload none, es lädt erst beim Abspielen).
// Telefone und „Daten sparen“ bekommen die 720p-Fassung. Verlässt der Film den Sichtbereich, hält er an.
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = () => matchMedia('(max-width: 900px)').matches || !!navigator.connection?.saveData;

export function initFilm(root = document) {
  for (const el of root.querySelectorAll('[data-film]')) {
    if (el.dataset.filmReady) continue;
    el.dataset.filmReady = '1';
    setup(el);
  }
}

function setup(el) {
  const video = el.querySelector('video');
  const cover = el.querySelector('[data-film-play]');
  const stage = el.querySelector('.film__stage');
  const rail = el.querySelector('.film__rail');
  const chs = [...el.querySelectorAll('[data-film-ch]')].map((b) => ({ b, s: +b.dataset.filmCh, e: +b.dataset.filmEnd, bar: b.querySelector('.film__track i'), k: -1 }));
  if (!video || !cover) return;
  video.controls = false;
  cover.hidden = false;
  el.classList.add('is-ready');
  let started = false, raf = 0, active = -1;

  const paint = () => {
    const t = video.currentTime || 0;
    let on = -1;
    chs.forEach((c, i) => {
      const k = Math.max(0, Math.min(1, (t - c.s) / (c.e - c.s)));
      if (Math.abs(k - c.k) > 0.002) { c.bar.style.transform = `scaleX(${k.toFixed(4)})`; c.k = k; }
      if (t >= c.s && t < c.e) on = i;
    });
    if (video.ended) on = chs.length - 1;
    if (on !== active) {
      if (chs[active]) chs[active].b.removeAttribute('aria-current');
      active = on;
      if (chs[on]) {
        chs[on].b.setAttribute('aria-current', 'true');
        // Telefon: die Leiste scrollt seitlich mit (nur die Leiste, nie die Seite)
        if (rail && rail.scrollWidth > rail.clientWidth + 4) {
          const li = chs[on].b.parentElement;
          rail.scrollTo({ left: li.offsetLeft - (rail.clientWidth - li.offsetWidth) / 2, behavior: reduced() ? 'auto' : 'smooth' });
        }
      }
    }
  };
  const loop = () => { paint(); raf = video.paused || video.ended ? 0 : requestAnimationFrame(loop); };
  video.addEventListener('play', () => { el.classList.add('is-playing'); if (!raf) raf = requestAnimationFrame(loop); });
  video.addEventListener('pause', () => { el.classList.remove('is-playing'); paint(); });
  video.addEventListener('seeked', paint);
  video.addEventListener('ended', () => { el.classList.remove('is-playing'); paint(); });

  const start = (t = 0) => {
    if (!started) {
      started = true;
      const src = small() ? el.dataset.srcS : el.dataset.src;
      const so = video.querySelector('source');
      if (src && so && !so.src.endsWith(src)) { so.src = src; video.load(); }
      video.preload = 'auto';
      el.classList.add('is-started');
      cover.hidden = true;
      video.controls = true;
    }
    if (t > 0) {
      if (video.readyState >= 1) video.currentTime = t;
      else video.addEventListener('loadedmetadata', () => { video.currentTime = t; }, { once: true });
    }
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  };

  cover.addEventListener('click', () => { start(0); video.focus({ preventScroll: true }); });
  for (const c of chs) c.b.addEventListener('click', () => {
    if (started) { video.currentTime = c.s; if (video.paused) video.play().catch(() => {}); paint(); }
    else start(c.s);
  });

  // Sprung von der Bühne („Film ansehen“): hinscrollen und abspielen (der Klick erlaubt den Start mit Ton)
  for (const a of document.querySelectorAll('[data-film-go]')) a.addEventListener('click', (e) => {
    e.preventDefault();
    (stage || el).scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
    start(0);
    video.focus({ preventScroll: true });
  });

  // außer Sicht anhalten (nicht wieder von selbst starten)
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { if (!e.isIntersecting && !video.paused) video.pause(); }, { threshold: 0 }).observe(stage || el);
  }
}
