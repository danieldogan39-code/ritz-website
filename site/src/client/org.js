// Firmenstruktur (Über RITZ): Leitungen als SVG über dem Organigramm, gemessen an den Bausteinen – auf breiten
// Bildschirmen ein Baum mit Sammelschiene, sonst eine Schiene links. Beim Erscheinen zeichnen sich die Leitungen von der
// Stiftung über die Gruppe zu den Gesellschaften (Karten erscheinen, wenn ihre Leitung ankommt); danach fließt in
// Abständen ein Stromimpuls durch die Struktur, jede Station leuchtet bei seiner Ankunft kurz auf. Zeigen oder Fokus auf
// eine Gesellschaft hebt ihren Weg hervor und schickt einen Funken hinüber. Ohne JavaScript bleiben die CSS-Linien.
const NS = 'http://www.w3.org/2000/svg';
const DRAW = 520; // px/s beim Aufbau
const FLOW = 760; // px/s für den Impuls
const PERIOD = 6200; // ms je Impuls
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initOrg(root = document) {
  for (const org of root.querySelectorAll('[data-org]')) {
    if (org.__org) continue;
    org.__org = true;
    try { wire(org); } catch (e) { console.error(e); }
  }
}

function wire(org) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'org__svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  org.prepend(svg);
  const stems = [...org.querySelectorAll(':scope > .org__stem')];
  const cos = [...org.querySelectorAll(':scope .org__co')];
  const glow = (host, cls = '') => {
    const g = document.createElement('span');
    g.className = `org__glow${cls}`;
    g.setAttribute('aria-hidden', 'true');
    host.appendChild(g);
    return g;
  };
  const gF = glow(stems[0] || org, ' org__glow--src'); // Quelle: Punkt unter der Stiftung (die Tafel selbst ist beschnitten)
  const gG = glow(org.querySelector('.org__logo') || org.querySelector('.org__node--group'), ' org__glow--ring');
  const cards = cos.map((li) => {
    const c = li.querySelector(':scope > .org__card');
    const sub = li.querySelector('.org__sub .org__card');
    return { li, c, sub, g: glow(c), gs: sub ? glow(sub) : null };
  });

  let segs = [], loops = [], drawn = false, visible = true, sparkAnims = [];
  const path = (d, cls, extra = {}) => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('class', cls);
    svg.appendChild(p);
    const len = p.getTotalLength();
    return { p, d, len, ...extra };
  };

  function layout() {
    const R = org.getBoundingClientRect();
    if (!R.width || stems.length < 2) return false;
    const rel = (el) => { const r = el.getBoundingClientRect(); return { l: r.left - R.left, t: r.top - R.top, r: r.right - R.left, b: r.bottom - R.top, cx: (r.left + r.right) / 2 - R.left }; };
    svg.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`);
    svg.replaceChildren();
    const s1 = rel(stems[0]), s2 = rel(stems[1]);
    const box = cards.map((k) => ({ ...k, rc: rel(k.c), rs: k.sub ? rel(k.sub) : null, rsub: k.sub ? rel(k.sub.closest('.org__sub')) : null }));
    const tree = box.length > 1 && Math.abs(box[1].rc.t - box[0].rc.t) < 4; // Karten nebeneinander
    const r = 12;
    segs = [];
    const A = path(`M${s1.cx} ${s1.t}V${s1.b}`, 'org__wire');
    const B = path(`M${s2.cx} ${s2.t}V${s2.b}`, 'org__wire');
    const x0 = s2.cx, yb = s2.b;
    for (const k of box) {
      const c = k.rc;
      let d;
      if (tree) {
        const xk = c.cx, rr = Math.min(r, (c.t - yb) / 2);
        if (Math.abs(xk - x0) < 1.5) d = `M${x0} ${yb}V${c.t}`;
        else { const dir = Math.sign(xk - x0); d = `M${x0} ${yb}H${xk - dir * rr}Q${xk} ${yb} ${xk} ${yb + rr}V${c.t}`; }
      } else {
        const yk = c.t + 26;
        d = `M${x0} ${yb}V${yk - r}Q${x0} ${yk} ${x0 + r} ${yk}H${c.l}`;
      }
      k.w = path(d, 'org__wire');
      if (k.sub) {
        const s = k.rs;
        if (tree) k.ws = path(`M${c.cx} ${c.b}V${s.t}`, 'org__wire');
        else {
          const px = k.rsub.l + 12, ys = s.t + 26;
          k.ws = path(`M${px} ${c.b}V${ys - r}Q${px} ${ys} ${px + r} ${ys}H${s.l}`, 'org__wire');
        }
      }
    }
    segs = { A, B, box };
    return true;
  }

  // Zeitplan: wann erreicht der Strom welche Station (ab Start an der Stiftung, in ms); kurze Stücke mit Mindestdauer
  function schedule(speed, start, gap = 60, minA = 0) {
    const { A, B, box } = segs;
    const T = { A: [start, Math.max(minA, A.len / speed * 1000)] };
    T.G = T.A[0] + T.A[1];
    T.B = [T.G + gap, Math.max(minA * 0.7, B.len / speed * 1000)];
    const tb = T.B[0] + T.B[1];
    T.k = box.map((k) => {
      const t = [tb, k.w.len / speed * 1000];
      const at = t[0] + t[1];
      const s = k.ws ? [at + 40, k.ws.len / speed * 1000] : null;
      return { t, at, s, sat: s ? s[0] + s[1] : 0 };
    });
    return T;
  }

  function drawIn() {
    if (drawn) return;
    drawn = true;
    org.classList.add('is-drawing');
    const T = schedule(DRAW, 320, 300, 240);
    org.style.setProperty('--at-g', `${Math.round(T.G - 60)}ms`);
    const run = (seg, [delay, dur]) => {
      seg.p.style.strokeDasharray = `${seg.len} ${seg.len}`;
      seg.p.animate([{ strokeDashoffset: seg.len }, { strokeDashoffset: 0 }], { duration: Math.max(120, dur), delay, easing: 'cubic-bezier(.65, 0, .35, 1)', fill: 'backwards' })
        .finished.then(() => { seg.p.style.strokeDasharray = ''; }).catch(() => {});
    };
    run(segs.A, T.A); run(segs.B, T.B);
    segs.box.forEach((k, i) => {
      run(k.w, T.k[i].t);
      // Karte erscheint, wenn ihre Leitung ankommt (CSS-Animation, Verzögerung hier)
      k.li.style.setProperty('--at', `${Math.round(T.k[i].at - 90)}ms`);
      flash(k.g, T.k[i].at);
      if (k.ws) { run(k.ws, T.k[i].s); k.li.style.setProperty('--at-sub', `${Math.round(T.k[i].sat - 90)}ms`); flash(k.gs, T.k[i].sat); }
    });
    flash(gF, 260, 700);
    flash(gG, T.G + 260);
    const end = Math.max(...T.k.map((x) => Math.max(x.at, x.sat))) + 500;
    setTimeout(() => { org.classList.remove('is-drawing'); org.classList.add('is-live'); relayout(); loop(); }, end);
  }
  function flash(el, at, dur = 900) {
    if (!el) return;
    el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.18 }, { opacity: 0 }], { duration: dur, delay: at, easing: 'ease-out', fill: 'none' });
  }

  // Wiederkehrender Impuls: Lichtpunkt je Leitung, gleiche Geschwindigkeit (überlagerte Strecken laufen deckungsgleich)
  function loop() {
    stopLoop();
    if (still()) return;
    const T = schedule(FLOW, 0);
    const comet = 26;
    const mk = (seg, [t0, dur]) => {
      const p = seg.p.cloneNode();
      p.setAttribute('class', 'org__pulse');
      p.style.strokeDasharray = `${comet} ${seg.len + comet}`;
      svg.appendChild(p);
      const a = t0 / PERIOD, b = Math.min(0.999, (t0 + dur + comet / FLOW * 1000) / PERIOD);
      const an = p.animate([
        { offset: 0, strokeDashoffset: comet, opacity: 0 },
        { offset: a, strokeDashoffset: comet, opacity: 0 },
        { offset: Math.min(b - 0.0005, a + 0.0005), strokeDashoffset: comet, opacity: 1 },
        { offset: b, strokeDashoffset: -seg.len, opacity: 1 },
        { offset: Math.min(1, b + 0.0005), strokeDashoffset: -seg.len, opacity: 0 },
        { offset: 1, strokeDashoffset: -seg.len, opacity: 0 },
      ], { duration: PERIOD, iterations: Infinity });
      loops.push({ an, p });
    };
    const blink = (el, at) => {
      if (!el) return;
      const a = at / PERIOD, b = Math.min(1, (at + 160) / PERIOD), c = Math.min(1, (at + 1000) / PERIOD);
      const an = el.animate([{ offset: 0, opacity: 0 }, { offset: a, opacity: 0 }, { offset: b, opacity: 0.9 }, { offset: c, opacity: 0 }, { offset: 1, opacity: 0 }], { duration: PERIOD, iterations: Infinity });
      loops.push({ an });
    };
    blink(gF, 0);
    mk(segs.A, T.A);
    blink(gG, T.G);
    mk(segs.B, T.B);
    segs.box.forEach((k, i) => {
      mk(k.w, T.k[i].t);
      blink(k.g, T.k[i].at);
      if (k.ws) { mk(k.ws, T.k[i].s); blink(k.gs, T.k[i].sat); }
    });
    if (!visible || document.hidden) loops.forEach((l) => l.an.pause());
  }
  function stopLoop() { for (const l of loops) { l.an.cancel(); l.p?.remove(); } loops = []; }

  // Weg einer Gesellschaft hervorheben, Funken hinüberschicken
  let hot = null;
  function setHot(k) {
    if (hot === k) return;
    hot = k;
    org.classList.toggle('has-hot', !!k);
    for (const x of segs.box || []) {
      x.li.classList.toggle('is-hot', x === k);
      x.w.p.classList.toggle('is-hot', x === k);
      x.ws?.p.classList.toggle('is-hot', x === k);
    }
    segs.A?.p.classList.toggle('is-hot', !!k);
    segs.B?.p.classList.toggle('is-hot', !!k);
    for (const a of sparkAnims) { a.an.cancel(); a.p.remove(); }
    sparkAnims = [];
    if (!k || still() || !org.classList.contains('is-live')) return;
    const T = schedule(1500, 0, 30);
    const i = segs.box.indexOf(k);
    const go = (seg, [t0, dur]) => {
      const p = seg.p.cloneNode();
      p.setAttribute('class', 'org__pulse org__pulse--spark');
      p.style.strokeDasharray = `34 ${seg.len + 34}`;
      svg.appendChild(p);
      const an = p.animate([{ strokeDashoffset: 34, opacity: 1 }, { strokeDashoffset: -seg.len, opacity: 1 }], { duration: Math.max(90, dur + 34 / 1.5), delay: t0, fill: 'both', easing: 'linear' });
      an.finished.then(() => p.remove()).catch(() => {});
      sparkAnims.push({ an, p });
    };
    go(segs.A, T.A); go(segs.B, T.B); go(k.w, T.k[i].t);
    if (k.ws) go(k.ws, T.k[i].s);
  }
  const which = (t) => { const li = t?.closest?.('.org__co'); return li ? (segs.box || []).find((x) => x.li === li) : null; };
  org.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') setHot(which(e.target)); });
  org.addEventListener('pointerleave', () => setHot(null));
  org.addEventListener('focusin', (e) => setHot(which(e.target)));
  org.addEventListener('focusout', (e) => { if (!org.contains(e.relatedTarget)) setHot(null); });

  // Aufbau
  if (!layout()) return;
  org.classList.add('is-wired');
  // Größe ändert sich (Schrift geladen, Fenster): Leitungen neu messen – nicht während des Aufbaus
  let size = `${org.offsetWidth}x${org.offsetHeight}`;
  const relayout = () => {
    const now = `${org.offsetWidth}x${org.offsetHeight}`;
    if (now === size) return;
    if (org.classList.contains('is-drawing')) { clearTimeout(relayout.t); relayout.t = setTimeout(relayout, 400); return; }
    size = now;
    setHot(null);
    if (layout() && org.classList.contains('is-live')) loop();
  };
  if ('ResizeObserver' in window) new ResizeObserver(() => { clearTimeout(relayout.t); relayout.t = setTimeout(relayout, 120); }).observe(org);
  // Ohne Aufbau (Bewegung reduziert, schon eingeblendet, kein Einblenden): Leitungen stehen, Impulse laufen
  const live = () => { drawn = true; org.classList.add('is-live'); loop(); };
  if (still() || org.classList.contains('is-in') || !document.documentElement.classList.contains('rv')) live();
  else new MutationObserver((m, mo) => { if (org.classList.contains('is-in')) { mo.disconnect(); drawIn(); } }).observe(org, { attributes: true, attributeFilter: ['class'] });
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    for (const l of loops) { if (visible && !document.hidden) l.an.play(); else l.an.pause(); }
  }).observe(org);
  document.addEventListener('visibilitychange', () => { for (const l of loops) { if (visible && !document.hidden) l.an.play(); else l.an.pause(); } });
}
