// Spannungsachse: Spannungsebene per Ziehen, Tippen oder Pfeiltasten wählen und passende Produkte zählen.
// Auf der Startseite misst sich die Achse beim ersten Erscheinen einmal ein (Sonde fährt von 0,72 auf 24 kV).
import { $, $$, getIndex, getT, clientCtx } from './core.js';
import { axisPos, axisVal, snapUm, fmtNum, tpl, UM_STEPS } from '../lib/util.js';
import { coversUm } from '../lib/product.js';

export async function initVaxis(root) {
  for (const el of $$('[data-vaxis]', root)) {
    if (el.dataset.ready) continue;
    el.dataset.ready = '1';
    const range = $('[data-vaxis-range]', el), probe = $('[data-probe]', el), valEl = $('[data-vaxis-value]', el), cnt = $('[data-vaxis-count]', el), go = $('[data-vaxis-go]', el);
    const plot = $('[data-vaxis-plot]', el);
    const parts = $$('[data-lo]', el);
    let idx = null, t = null, ctx = null, last = null;
    const lang = () => ctx?.lang || document.documentElement.lang || 'de';
    const states = (v) => {
      for (const b of parts) {
        const on = v >= parseFloat(b.dataset.lo) - 1e-6 && v <= parseFloat(b.dataset.hi) + 1e-6;
        b.classList.toggle('is-on', on);
        if (b.dataset.band) b.classList.toggle('is-dim', !on);
      }
    };
    // Trefferzahlen je Normspannung liegen schon im HTML (data-counts), der Rest kommt mit dem Produktindex
    const pre = (el.dataset.counts || '').split(',').map(Number);
    const tmpl = cnt.textContent && pre.length === UM_STEPS.length ? cnt.textContent.replace(/\d+(?:[.,\u00a0\u202f ]\d{3})*/, '{n}') : null;
    const counts = (v) => {
      if (idx && t && ctx) {
        const n = idx.products.filter((p) => coversUm(p, v)).length;
        cnt.textContent = tpl(t.pages?.home?.axisMatches || t.axis?.matches || '{n}', { n });
        go.href = ctx.href('finder', {}, { um: String(v) });
        return;
      }
      const i = UM_STEPS.indexOf(v);
      if (tmpl && i > -1 && Number.isFinite(pre[i])) cnt.textContent = tmpl.replace('{n}', pre[i]);
    };
    const update = () => {
      const v = snapUm(axisVal(range.value / 1000));
      if (v === last && idx) return;
      last = v;
      probe.style.setProperty('--p', axisPos(v).toFixed(4));
      const label = `${fmtNum(v, lang())} kV`;
      valEl.textContent = label;
      range.setAttribute('aria-valuetext', label);
      states(v);
      counts(v);
    };
    // Einmessen (nur wenn die Sonde noch nicht zu sehen war; jede Bedienung bricht es ab)
    let sweep = null;
    const stopSweep = () => {
      if (!sweep) return;
      cancelAnimationFrame(sweep.raf);
      const p = sweep.p;
      sweep = null;
      plot.classList.remove('is-drag');
      cnt.setAttribute('aria-live', 'polite');
      if (p != null) { range.value = Math.round(p * 1000); last = null; update(); } // Regler dort, wo die Sonde steht
    };
    const wantSweep = el.hasAttribute('data-vaxis-sweep') && !matchMedia('(prefers-reduced-motion: reduce)').matches && !!probe.getAnimations;
    const fade = wantSweep ? probe.getAnimations().find((a) => a.animationName === 'fadeIn') : null;
    // weiter unten auf der Seite: Einmessen, sobald der Abschnitt eingeblendet wird (Einblendung startet fadeIn der Sonde)
    const later = wantSweep && !fade && document.documentElement.classList.contains('rv') && !!el.closest('[data-reveal]:not(.is-in)');
    if (later || (fade && (fade.playState === 'paused' || (fade.currentTime ?? 0) < 760))) {
      const p0 = axisPos(UM_STEPS[0]), p1 = axisPos(24);
      sweep = { raf: 0, wait: true };
      range.value = Math.round(p0 * 1000);
      update();
      probe.addEventListener('animationstart', (e) => {
        if (e.animationName !== 'fadeIn' || !sweep?.wait) return;
        sweep.wait = false;
        plot.classList.add('is-drag');
        cnt.setAttribute('aria-live', 'off');
        const t0 = performance.now(), dur = 950;
        let shown = null;
        const frame = (now) => {
          if (!sweep) return;
          const k = Math.min(1, (now - t0) / dur);
          const ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          const p = p0 + (p1 - p0) * ease;
          probe.style.setProperty('--p', p.toFixed(4));
          sweep.p = p;
          const v = snapUm(axisVal(p));
          if (v !== shown) { shown = v; valEl.textContent = `${fmtNum(v, lang())} kV`; states(v); counts(v); }
          if (k < 1) { sweep.raf = requestAnimationFrame(frame); return; }
          stopSweep();
        };
        sweep.raf = requestAnimationFrame(frame);
      }, { once: true });
    }
    // Tastatur (Pfeiltasten springen eine Normstufe weiter)
    range.addEventListener('input', () => { stopSweep(); update(); });
    range.addEventListener('focus', stopSweep);
    range.addEventListener('keydown', (e) => {
      stopSweep();
      const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const cur = snapUm(axisVal(range.value / 1000));
      const i = Math.min(UM_STEPS.length - 1, Math.max(0, UM_STEPS.indexOf(cur) + dir));
      range.value = Math.round(axisPos(UM_STEPS[i]) * 1000);
      update();
    });
    // Zeiger: Maus zieht sofort, Touch erst bei waagerechter Bewegung (senkrechtes Scrollen bleibt frei)
    const setFrom = (x) => { const r = plot.getBoundingClientRect(); range.value = Math.round(Math.min(1, Math.max(0, (x - r.left) / r.width)) * 1000); update(); };
    let start = null, dragging = false;
    plot.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      stopSweep();
      start = { x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType !== 'mouse' };
      if (!start.touch) { dragging = true; plot.setPointerCapture(e.pointerId); plot.classList.add('is-drag'); setFrom(e.clientX); e.preventDefault(); range.focus({ preventScroll: true, focusVisible: false }); }
    });
    plot.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      if (!dragging && start.touch) {
        const dx = Math.abs(e.clientX - start.x), dy = Math.abs(e.clientY - start.y);
        if (dx > 6 && dx > dy) { dragging = true; plot.setPointerCapture(e.pointerId); plot.classList.add('is-drag'); }
      }
      if (dragging) setFrom(e.clientX);
    });
    const end = (e) => {
      if (!start || e.pointerId !== start.id) return;
      if (e.type === 'pointerup' && start.touch && !dragging && Math.abs(e.clientX - start.x) < 8 && Math.abs(e.clientY - start.y) < 8) setFrom(e.clientX);
      start = null; dragging = false; plot.classList.remove('is-drag');
    };
    plot.addEventListener('pointerup', end);
    plot.addEventListener('pointercancel', end);
    if (!sweep) update();
    Promise.all([getIndex(), getT(), clientCtx()]).then(([a, b, c]) => { idx = a; t = b; ctx = c; if (!sweep) { last = null; update(); } });
  }
}
