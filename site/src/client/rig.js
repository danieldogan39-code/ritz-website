// Prüffeld-Monitor (Startseite, „Jedes Gerät geprüft.“): spielt in Schleife eine Wechselspannungsprüfung (Sinus, der
// bis zur Prüfspannung anwächst), eine Hochstromprüfung (Kurzschlussstrom mit abklingendem Gleichanteil, der erste
// Scheitel ist der höchste) und das Prüfprotokoll ab. Läuft nur, solange der Monitor zu sehen ist. Ohne JavaScript und
// bei reduzierter Bewegung bleibt das Endbild aus dem HTML stehen.
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const W = 600, MID = 100, N = 150;
const PHASES = [{ k: 'u', dur: 3800 }, { k: 'i', dur: 3800 }, { k: 'ok', dur: 2800 }];
const TOTAL = PHASES.reduce((s, p) => s + p.dur, 0);

export function initRig(root = document) {
  for (const el of root.querySelectorAll('[data-rig]')) {
    if (el.__rig) continue;
    el.__rig = true;
    if (!reduced()) setup(el);
  }
}

function setup(el) {
  const trace = el.querySelector('[data-rig-trace]');
  const valEl = el.querySelector('[data-rig-val]'), unitEl = el.querySelector('[data-rig-unit]'), modeEl = el.querySelector('[data-rig-mode]');
  const steps = [...el.querySelectorAll('[data-rig-step]')];
  const figs = [...(el.closest('section')?.querySelectorAll('[data-rig-fig]') || [])];
  const num = (s) => parseFloat(String(s || '').replace(/\s/g, '').replace(',', '.')) || 0;
  const U = num(el.dataset.u), I = num(el.dataset.i);
  const units = [el.dataset.uu || '', el.dataset.iu || ''];
  const labels = steps.map((s) => s.querySelector('b')?.textContent || '');
  const pass = steps[2]?.querySelector('small')?.textContent || '';
  let raf = 0, on = false, t0 = 0, pausedAt = 0, last = { k: '', v: '', u: '' };

  // Spannung: Sinus über vier Perioden, läuft nach links durch; Amplitude 0…1
  const sine = (amp, ph) => {
    let d = '';
    for (let j = 0; j <= N; j++) {
      const x = (j / N) * W;
      d += `${j ? 'L' : 'M'}${x.toFixed(1)} ${(MID - 80 * amp * Math.sin((x / W) * 8 * Math.PI + ph)).toFixed(1)}`;
    }
    return d;
  };
  // Strom: -cos(ωt) + e^(-t/τ) – der erste Scheitel fast doppelt so hoch, dann symmetrisch; der Strahl zeichnet von links
  const fault = (sweep) => {
    let d = '';
    const n = Math.max(1, Math.round(N * sweep));
    for (let j = 0; j <= n; j++) {
      const x = (j / N) * W, c = (x / W) * 4; // vier Perioden
      const i = -Math.cos(2 * Math.PI * c) + Math.exp(-c / 0.9);
      d += `${j ? 'L' : 'M'}${x.toFixed(1)} ${(MID - 46 * i).toFixed(1)}`;
    }
    return d;
  };
  const show = (k, v, u) => {
    if (k !== last.k) {
      el.classList.toggle('is-i', k === 'i');
      el.classList.toggle('is-pass', k === 'ok');
      el.classList.toggle('is-run', k !== 'ok');
      modeEl.textContent = labels[k === 'u' ? 0 : k === 'i' ? 1 : 2];
      figs.forEach((f, n) => f.classList.toggle('is-hot', (k === 'u' && n === 0) || (k === 'i' && n === 1)));
    }
    if (v !== last.v) valEl.textContent = v;
    if (u !== last.u) unitEl.textContent = u;
    last = { k, v, u };
  };
  const fmt = (x) => String(Math.round(x));
  function frame(now, still = false) {
    raf = 0;
    if (!on && !still) return;
    let t = (now - t0) % TOTAL, k = 0;
    while (t > PHASES[k].dur) { t -= PHASES[k].dur; k++; }
    const p = t / PHASES[k].dur, kind = PHASES[k].k;
    steps.forEach((s, n) => {
      s.classList.toggle('is-done', n < k || (kind === 'ok' && n === k));
      s.classList.toggle('is-run', n === k && kind !== 'ok');
      if (n === k && kind !== 'ok') s.style.setProperty('--p', clamp(p / 0.85, 0, 1).toFixed(3));
      else s.style.removeProperty('--p');
    });
    if (kind === 'u') {
      const r = clamp(p / 0.8, 0, 1);
      trace.setAttribute('d', sine(0.06 + 0.9 * easeInOut(r), -now * 0.0062));
      show('u', fmt(U * easeOut(r)), units[0]);
    } else if (kind === 'i') {
      const r = clamp(p / 0.75, 0, 1);
      trace.setAttribute('d', fault(0.02 + 0.98 * easeOut(clamp(p / 0.55, 0, 1))));
      show('i', fmt(I * easeOut(r)), units[1]);
    } else {
      if (last.k !== 'ok') trace.setAttribute('d', fault(1));
      show('ok', pass, '');
    }
    if (!still) raf = requestAnimationFrame(frame);
  }
  // gleich in den Anfangszustand (das HTML zeigt das Endbild): sonst sähe man beim Hereinscrollen kurz das Ende
  t0 = performance.now();
  frame(t0, true);
  const start = () => {
    if (on) return;
    on = true;
    const now = performance.now();
    t0 = pausedAt ? now - pausedAt : now; // beim Wiedersehen dort weiter, wo der Monitor stand
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (!on) return;
    on = false;
    pausedAt = (performance.now() - t0) % TOTAL;
    cancelAnimationFrame(raf);
    raf = 0;
  };
  let seen = false;
  const io = new IntersectionObserver((es) => {
    for (const e of es) {
      if (!el.isConnected) { io.disconnect(); stop(); return; }
      seen = e.isIntersecting;
      if (seen && !document.hidden) start(); else stop();
    }
  }, { threshold: 0.35 });
  io.observe(el);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (seen && el.isConnected) start(); });
}
