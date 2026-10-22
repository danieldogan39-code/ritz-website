// Weltweit vernetzt (Startseite): Weltkarte aus Lichtpunkten mit allen RITZ-Standorten und Vertretungen.
// – Aufbau beim ersten Erscheinen: Von Hamburg aus breitet sich eine Welle über die Kontinente aus, Bögen laufen zu den
//   Standorten und von dort weiter zu den Vertretungen; jeder Marker blitzt bei Ankunft auf, das Land ringsum leuchtet.
// – danach ruhig: ab und zu wandert ein Lichtpunkt über eine Verbindung (nur im Bild und ohne „Bewegung reduzieren“).
// – Kamera: Regionen, Länderwahl, Zoom-Knöpfe, Ziehen, Trackpad-Zoom bzw. Strg/⌘ + Mausrad, Doppelklick. Je Zoomstufe
//   ein passendes Punktraster (Teilung auf dem Bildschirm bleibt ähnlich), Marker und Linien bleiben gleich groß.
// – Bedienung: Zeigen öffnet eine Vorschau, Klick oder Eingabe heftet die Karte mit Anschrift, Telefon, E-Mail und Link an;
//   Pfeiltasten springen zum nächsten Punkt in Pfeilrichtung, Escape schließt, Plus/Minus zoomen; Ebenen ein- und ausblenden.
// Das Modell (Knoten, Bögen, Zeitplan, Texte) schreibt die Ansicht als JSON in die Seite (views/home.js, netModel).
// Die Landmaske entsteht im Browser aus img/world-land.svg (Path2D → Leinwand → Pixel); ohne JavaScript bleibt das
// Punktbild img/world-dots.svg mit den Markern stehen.
import { esc, icon, phoneTxt } from '../lib/util.js';

const W = 1000, H = 520;
const LEVELS = [8, 4.6, 2.4, 1.2, 0.62]; // Punktteilung in Karteneinheiten (gleiches Gitter wie world-dots.svg bei 4,6)
const EU = [455, 50, 615, 172]; // Ausschnitt mit feiner Landmaske (Europa), Kartenkoordinaten
const TARGET_PX = 6.3; // gewünschter Punktabstand auf dem Bildschirm
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const WAVE_MS = 2600;
// Welle von Hamburg: erst zügig, dann gleichmäßig über die Kontinente (Anteil des Kartenradius)
const wave = (t) => { const p = clamp(t / WAVE_MS, 0, 1); return p * (0.55 + 0.45 * (1 - Math.pow(1 - p, 2))); };
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rgb = (hex, fb) => {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(hex).trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : fb;
};
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;

export function initNetMap(root = document) {
  for (const el of root.querySelectorAll('[data-nm]')) {
    if (el.__nm) continue;
    el.__nm = true;
    try { setup(el); } catch (e) { console.error(e); }
  }
}

function setup(el) {
  const M = JSON.parse(el.querySelector('[data-nm-model]').textContent);
  const stage = el.querySelector('[data-nm-stage]'), frame = el.querySelector('[data-nm-frame]');
  const cvB = el.querySelector('[data-nm-base]'), cvF = el.querySelector('[data-nm-fx]');
  const card = el.querySelector('[data-nm-card]'), img = el.querySelector('.nm__img');
  const g = cvB.getContext('2d'), fx = cvF.getContext('2d');
  const cs = getComputedStyle(el);
  const C = {
    dot: rgb(cs.getPropertyValue('--on-night'), [246, 240, 236]),
    red: rgb(cs.getPropertyValue('--hud-red'), [255, 74, 67]),
    cop: rgb(cs.getPropertyValue('--hud-copper'), [227, 154, 95]),
  };
  card.id = 'nm-card';

  // ---------- Modell ----------
  const nodes = M.nodes.map((n, i) => ({ ...n, i, el: el.querySelector(`.nm__mk[data-n="${i}"]`), on: true, site: n.k !== 'rep' }));
  const hq = nodes[M.hq];
  const arcs = M.arcs.map((a) => {
    const A = nodes[a.a], B = nodes[a.b];
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
    let nx = -dy / d, ny = dx / d;
    if (ny > 0) { nx = -nx; ny = -ny; } // Bögen wölben sich nach oben
    const h = Math.min(92, d * 0.3);
    return { ...a, A, B, cx: (A.x + B.x) / 2 + nx * h, cy: Math.max(3, (A.y + B.y) / 2 + ny * h), d };
  });
  for (const n of nodes) {
    const lbl = n.el?.querySelector('.nm__lbl');
    n.lbl = lbl;
    n.lw = 0;
  }

  // ---------- Zustand ----------
  const cam = { x: W / 2, y: H / 2, s: 1 };
  let vw = 0, vh = 0, dpr = 1, sMin = 1, sMax = 16;
  let raster = null, live = false, phase = 'wait'; // wait → run → done
  let t0 = 0, tEnd = Math.max(...nodes.map((n) => n.t)) + 650;
  let showNet = true, active = null, pinned = null, hovered = null, roving = hq, flight = null;
  let visible = false, raf = 0, idleRaf = 0, lastIdle = 0, nextPulse = 0;
  const pulses = [];
  const layers = new Map();

  // ---------- Landmaske und Punktraster ----------
  async function loadRaster() {
    const src = img.currentSrc || img.getAttribute('src');
    const url = new URL(src.replace(/world-dots\.svg.*$/, 'world-land.svg'), location.href).href;
    const txt = await (await fetch(url)).text();
    const d = /\sd="([^"]+)"/.exec(txt)?.[1];
    if (!d) throw new Error('Landfläche fehlt');
    const path = new Path2D(d);
    const mk = (box, R) => {
      const w = Math.ceil((box[2] - box[0]) * R), h = Math.ceil((box[3] - box[1]) * R);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.setTransform(R, 0, 0, R, -box[0] * R, -box[1] * R);
      x.fillStyle = '#fff';
      x.fill(path);
      const a = x.getImageData(0, 0, w, h).data;
      const m = new Uint8Array(w * h);
      for (let i = 0; i < m.length; i++) m[i] = a[i * 4 + 3] > 110 ? 1 : 0;
      return { box, R, w, h, m };
    };
    raster = { world: mk([0, 0, W, H], 1.6), eu: mk(EU, 6) };
  }
  const inEU = (x, y) => x >= EU[0] && x < EU[2] && y >= EU[1] && y < EU[3];
  function land(x, y, fine) {
    const r = fine && inEU(x, y) ? raster.eu : raster.world;
    const px = Math.floor((x - r.box[0]) * r.R), py = Math.floor((y - r.box[1]) * r.R);
    return px >= 0 && py >= 0 && px < r.w && py < r.h && r.m[py * r.w + px] === 1;
  }
  function level(li) {
    if (layers.has(li)) return layers.get(li);
    const sp = LEVELS[li], dy = (sp * Math.sqrt(3)) / 2, fine = li >= 3;
    const box = li === LEVELS.length - 1 ? EU : [0, 0, W, H];
    const xs = [], ys = [];
    for (let row = 0; dy / 2 + row * dy < H; row++) {
      const y = dy / 2 + row * dy;
      if (y < box[1] || y > box[3]) continue;
      const x0 = sp / 2 + (row % 2) * (sp / 2);
      for (let i = Math.max(0, Math.ceil((box[0] - x0) / sp)), i1 = Math.floor((box[2] - x0) / sp); i <= i1; i++) {
        const x = x0 + i * sp;
        if (land(x, y, fine)) { xs.push(x); ys.push(y); }
      }
    }
    const n = xs.length, X = Float32Array.from(xs), Y = Float32Array.from(ys);
    // Wärme: Land rund um eine Präsenz leuchtet (2 = nah, 1 = Umfeld); Zeitpunkt = Ankunft des Netzes dort
    const heat = new Uint8Array(n), lit = new Float32Array(n);
    const R2 = 15 * 15, R1 = 5.5 * 5.5;
    for (let i = 0; i < n; i++) {
      let best = Infinity, bt = 0;
      for (const nd of nodes) {
        const dx = nd.x - X[i], dy2 = nd.y - Y[i];
        if (Math.abs(dx) > 15 || Math.abs(dy2) > 15) continue;
        const q = dx * dx + dy2 * dy2;
        if (q < best) { best = q; bt = nd.t; }
      }
      if (best < R2) { heat[i] = best < R1 ? 2 : 1; lit[i] = bt; }
    }
    const L = { sp, n, X, Y, heat, lit, eu: li === LEVELS.length - 1 };
    layers.set(li, L);
    return L;
  }

  // ---------- Kamera ----------
  const sx = (x) => (x - cam.x) * cam.s + vw / 2;
  const sy = (y) => (y - cam.y) * cam.s + vh / 2;
  function clampCam(c = cam) {
    c.s = clamp(c.s, sMin, sMax);
    const hw = vw / (2 * c.s), hh = vh / (2 * c.s);
    c.x = hw * 2 >= W ? W / 2 : clamp(c.x, hw, W - hw);
    c.y = hh * 2 >= H ? H / 2 : clamp(c.y, hh, H - hh);
    return c;
  }
  function resize() {
    const r = frame.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const atWorld = cam.s <= sMin * 1.001;
    vw = r.width; vh = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const c of [cvB, cvF]) { c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr); }
    sMin = Math.min(vw / W, vh / H);
    sMax = Math.max(sMin * 4, 16);
    if (atWorld) { cam.s = sMin; cam.x = W / 2; cam.y = H / 2; }
    clampCam();
    for (const n of nodes) if (n.lbl) n.lw = n.lbl.offsetWidth;
    render(performance.now());
  }
  function flyTo(x, y, s, dur = 820) {
    const to = clampCam({ x, y, s });
    if (reduced() || !visible) dur = 0;
    const from = { ...cam };
    const ts = performance.now();
    flight = { from, to, ts, dur };
    if (!dur) { Object.assign(cam, to); flight = null; render(performance.now()); return; }
    kick();
  }
  function fitBox(b, pad = 0.08) {
    const bw = b[2] - b[0], bh = b[3] - b[1];
    const s = Math.min(vw / (bw * (1 + pad * 2)), vh / (bh * (1 + pad * 2)));
    flyTo((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, s);
  }
  const worldView = () => flyTo(W / 2, H / 2, sMin);
  function zoomAt(px, py, f, dur = 420) {
    const s = clamp(cam.s * f, sMin, sMax);
    const mx = (px - vw / 2) / cam.s + cam.x, my = (py - vh / 2) / cam.s + cam.y; // Kartenpunkt unter dem Zeiger bleibt stehen
    flyTo(mx - (px - vw / 2) / s, my - (py - vh / 2) / s, s, dur);
  }

  // ---------- Zeichnen ----------
  function drawDots(L, alpha, now, skipEU) {
    const s = cam.s;
    const size = clamp(L.sp * 0.34 * s, 0.9, 6);
    const pad = size + 2;
    const x0 = cam.x - (vw / 2 + pad) / s, x1 = cam.x + (vw / 2 + pad) / s, y0 = cam.y - (vh / 2 + pad) / s, y1 = cam.y + (vh / 2 + pad) / s;
    const run = phase === 'run';
    const t = now - t0;
    const R = run ? 1180 * wave(t) : Infinity;
    const round = size >= 2.6;
    const hx = hq.x, hy = hq.y;
    // Durchgänge: 0 Grundraster, 1 Umfeld, 2 nah, 3 Wellenfront/Aufblitzen
    const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const put = (p, X, Y) => { if (round) { p.moveTo(X + size / 2, Y); p.arc(X, Y, size / 2, 0, Math.PI * 2); } else p.rect(X - size / 2, Y - size / 2, size, size); };
    for (let i = 0; i < L.n; i++) {
      const x = L.X[i], y = L.Y[i];
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      if (skipEU && inEU(x, y)) continue;
      let k = L.heat[i];
      if (run) {
        const dd = Math.hypot(x - hx, y - hy);
        if (dd > R) continue;
        if (R - dd < 22 && R < 1150) k = 3;
        else if (k && t < L.lit[i]) k = 0;
        else if (k && t - L.lit[i] < 520) k = 3;
      }
      put(paths[k], sx(x), sy(y));
    }
    g.globalAlpha = alpha;
    g.fillStyle = rgba(C.dot, 0.28); g.fill(paths[0]);
    g.fillStyle = rgba(C.cop, 0.5); g.fill(paths[1]);
    g.fillStyle = rgba(C.red, 0.78); g.fill(paths[2]);
    g.fillStyle = rgba(C.dot, 0.9); g.fill(paths[3]);
    g.globalAlpha = 1;
  }
  function dotLevels() {
    const u = Math.log2(TARGET_PX / cam.s);
    const Lg = LEVELS.map((v) => Math.log2(v));
    if (u >= Lg[0]) return [[0, 1]];
    if (u <= Lg[Lg.length - 1]) return [[Lg.length - 1, 1]];
    let i = 0;
    while (!(Lg[i] >= u && u >= Lg[i + 1])) i++;
    const f = smooth(0.32, 0.68, (Lg[i] - u) / (Lg[i] - Lg[i + 1]));
    const out = [];
    if (f < 1) out.push([i, 1 - f]);
    if (f > 0) out.push([i + 1, f]);
    return out;
  }
  function quadAt(a, p) {
    const u = 1 - p;
    return [u * u * a.A.x + 2 * u * p * a.cx + p * p * a.B.x, u * u * a.A.y + 2 * u * p * a.cy + p * p * a.B.y];
  }
  function strokeArc(a, p0, p1) {
    // Teilstück [p0, p1] der quadratischen Kurve (de Casteljau), in Bildschirmkoordinaten
    const n = Math.max(6, Math.ceil(a.d * cam.s * (p1 - p0) / 8));
    g.beginPath();
    for (let k = 0; k <= n; k++) {
      const [x, y] = quadAt(a, p0 + ((p1 - p0) * k) / n);
      if (k) g.lineTo(sx(x), sy(y)); else g.moveTo(sx(x), sy(y));
    }
    g.stroke();
  }
  function arcVisible(a) { return showNet && a.A.on && a.B.on; }
  function hotArc(a) { const f = pinned || hovered; return !!f && (a.B === f || (f.site && a.A === f && !a.s) || (f === hq && a.s)); }
  function drawArcs(now) {
    const run = phase === 'run';
    const t = now - t0;
    const focus = pinned || hovered;
    g.lineCap = 'round';
    for (const pass of [0, 1]) { // 0 Glühen, 1 Linie
      for (const a of arcs) {
        if (!arcVisible(a)) continue;
        let p = 1;
        if (run) { p = ease(clamp((t - a.t0) / a.dur, 0, 1)); if (p <= 0) continue; }
        const hot = hotArc(a);
        const dim = focus && !hot ? 0.35 : 1;
        const col = a.s ? C.red : C.cop;
        if (pass === 0) {
          if (!a.s && !hot) continue;
          g.strokeStyle = rgba(col, (hot ? 0.26 : 0.13) * dim);
          g.lineWidth = hot ? 7 : 5;
        } else {
          g.strokeStyle = rgba(col, (a.s ? 0.9 : hot ? 0.95 : 0.42) * dim);
          g.lineWidth = a.s ? (hot ? 2.2 : 1.5) : hot ? 1.8 : 1;
        }
        strokeArc(a, 0, p);
        if (run && pass === 1 && p < 1) { // leuchtender Kopf
          const [x, y] = quadAt(a, p);
          const r = a.s ? 7 : 5;
          const grd = g.createRadialGradient(sx(x), sy(y), 0, sx(x), sy(y), r);
          grd.addColorStop(0, rgba([255, 255, 255], 0.95));
          grd.addColorStop(0.35, rgba(col, 0.8));
          grd.addColorStop(1, rgba(col, 0));
          g.fillStyle = grd;
          g.beginPath(); g.arc(sx(x), sy(y), r, 0, Math.PI * 2); g.fill();
        }
      }
    }
  }
  function drawRipple(now) {
    const t = now - t0;
    if (t > WAVE_MS + 500) return;
    const X = sx(hq.x), Y = sy(hq.y);
    for (const [delay, w] of [[0, 2], [420, 1.2]]) {
      const p = clamp((t - delay) / WAVE_MS, 0, 1);
      if (p <= 0 || p >= 1) continue;
      const r = 1180 * wave(t - delay) * cam.s;
      g.strokeStyle = rgba(C.red, 0.55 * (1 - p));
      g.lineWidth = w;
      g.beginPath(); g.arc(X, Y, r, 0, Math.PI * 2); g.stroke();
    }
  }
  function render(now) {
    if (!vw || !raster) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, vw, vh);
    if (phase === 'wait') { placeMarks(); return; } // bis zum Aufbau bleibt die Bühne leer
    for (const [li, a] of dotLevels()) {
      const L = level(li);
      if (L.eu && li > 0) drawDots(level(li - 1), a, now, true); // außerhalb Europas das gröbere Raster
      drawDots(L, a, now, false);
    }
    if (phase === 'run') drawRipple(now);
    drawArcs(now);
    placeMarks();
  }

  // ---------- Marker und Beschriftungen ----------
  function placeMarks() {
    const lblOn = cam.s >= 2.6;
    const placed = [];
    const RK = { hq: 3, production: 2, site: 1, sales: 1 };
    const order = nodes.filter((n) => n.lbl).sort((a, b) => (b === active) - (a === active) || (b === hq) - (a === hq) || RK[b.k] - RK[a.k] || b.x - a.x);
    for (const n of nodes) {
      if (!n.el) continue;
      const X = sx(n.x), Y = sy(n.y);
      const out = X < -30 || Y < -30 || X > vw + 30 || Y > vh + 30;
      n.el.style.translate = `${X.toFixed(1)}px ${Y.toFixed(1)}px`;
      n.el.classList.toggle('is-out', out);
      n.X = X; n.Y = Y; n.out = out;
    }
    const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    for (const n of order) if (n.on && !n.out) placed.push({ x0: n.X - 8, x1: n.X + 8, y0: n.Y - 8, y1: n.Y + 8, self: n }); // Marker der Standorte freihalten
    for (const n of order) {
      const want = n.on && !n.out && (lblOn || n === hq || n === active || n === hovered);
      let side = '';
      if (want) {
        const w = n.lw + 6, X = n.X, Y = n.Y;
        const r = { x0: X + 12, x1: X + 14 + w, y0: Y - 9, y1: Y + 9 }, l = { x0: X - 14 - w, x1: X - 12, y0: Y - 9, y1: Y + 9 };
        const own = (b) => !placed.some((o) => o.self !== n && overlap(b, o));
        if (own(r) && r.x1 < vw - 4) { side = 'r'; placed.push(r); } else if (own(l) && l.x0 > 4) { side = 'l'; placed.push(l); }
      }
      n.el.classList.toggle('is-lbl', !!side);
      n.el.classList.toggle('is-lbl-l', side === 'l');
    }
  }

  // ---------- Schleifen ----------
  function kick() { if (!raf) raf = requestAnimationFrame(frameLoop); }
  function frameLoop(now) {
    raf = 0;
    if (!el.isConnected) return;
    if (flight) {
      const p = flight.dur ? clamp((now - flight.ts) / flight.dur, 0, 1) : 1;
      const e = ease(p), f = flight.from, to = flight.to;
      cam.s = Math.exp(Math.log(f.s) + (Math.log(to.s) - Math.log(f.s)) * e);
      // Mittelpunkt bildschirmtreu interpolieren, damit der Flug nicht seitlich ausbricht
      cam.x = f.x + (to.x - f.x) * e;
      cam.y = f.y + (to.y - f.y) * e;
      clampCam();
      if (p >= 1) flight = null;
    }
    if (phase === 'run' && now - t0 >= tEnd) finish();
    render(now);
    if (pinned || hovered) positionCard();
    if (flight || phase === 'run') kick();
  }
  function start() {
    if (phase !== 'wait') return;
    if (reduced()) { finish(); return; }
    phase = 'run';
    t0 = performance.now();
    el.classList.add('is-run');
    img.classList.add('is-gone');
    kick();
  }
  function finish() {
    phase = 'done';
    el.classList.remove('is-run');
    el.classList.add('is-done');
    img.classList.add('is-gone');
    render(performance.now());
    idle();
  }
  // Lichtpunkte, die über Verbindungen wandern (eigene Leinwand, 30 Bilder/s)
  function idle() {
    if (reduced() || idleRaf) return;
    const tick = (now) => {
      idleRaf = 0;
      if (!el.isConnected) return;
      if (!visible || document.hidden) return;
      idleRaf = requestAnimationFrame(tick);
      if (now - lastIdle < 32) return;
      lastIdle = now;
      if (now > nextPulse) {
        const pool = arcs.filter((a) => arcVisible(a) && !(a.B.out && a.A.out));
        if (pool.length) {
          const main = pool.filter((x) => x.s);
          const from = main.length && Math.random() < 0.35 ? main : pool;
          const a = from[Math.floor(Math.random() * from.length)];
          pulses.push({ a, ts: now, dur: 900 + Math.min(1, a.d / 300) * 1300 });
        }
        nextPulse = now + 520 + Math.random() * 520;
      }
      fx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fx.clearRect(0, 0, vw, vh);
      fx.globalCompositeOperation = 'lighter';
      for (let k = pulses.length - 1; k >= 0; k--) {
        const P = pulses[k];
        const p = (now - P.ts) / P.dur;
        if (p >= 1 || !arcVisible(P.a)) { pulses.splice(k, 1); continue; }
        const col = P.a.s ? C.red : C.cop;
        const tail = 0.16;
        for (let j = 0; j < 8; j++) {
          const q = clamp(p - (tail * j) / 8, 0, 1);
          const [x, y] = quadAt(P.a, q);
          fx.fillStyle = rgba(j ? col : [255, 240, 230], (1 - j / 8) * 0.85 * Math.sin(Math.PI * Math.min(1, p * 1.05)));
          fx.beginPath(); fx.arc(sx(x), sy(y), j ? 2.2 - j * 0.18 : 2.6, 0, Math.PI * 2); fx.fill();
        }
      }
      fx.globalCompositeOperation = 'source-over';
    };
    idleRaf = requestAnimationFrame(tick);
  }
  function clearFx() { fx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.clearRect(0, 0, vw, vh); pulses.length = 0; }

  // ---------- Karte ----------
  const kindOf = (it) => M.L.types[it.k === 'l' ? it.ty : 'rep'] || '';
  function itemHTML(n, it, full, first) {
    const title = it.k === 'l' ? n.label : it.ti;
    let h = `<span class="nm__kind${it.k === 'r' ? ' nm__kind--rep' : ''}">${esc(kindOf(it))}</span>`;
    h += first ? `<h3 class="nm__title">${esc(title)}</h3>` : `<b class="nm__title nm__title--s">${esc(title)}</b>`;
    h += `<p class="nm__sub">${esc(it.k === 'l' ? `${it.su}, ${it.co}` : it.co)}</p>`;
    if (it.fn && first) h += `<p class="nm__fn">${esc(it.fn)}</p>`;
    if (it.st && first) h += `<p class="nm__fn">${esc(it.st)}</p>`;
    if (it.sv) h += `<p class="nm__fn">${esc(it.sv)}</p>`;
    if (full) {
      if (it.ad && first) h += `<p class="nm__addr">${it.ad.map(esc).join('<br>')}</p>`;
      const lines = [];
      if (it.te) lines.push(`<a href="tel:${esc(it.te.replace(/[^\d+]/g, ''))}">${icon('phone', 'width="15" height="15"')}${phoneTxt(it.te)}</a>`);
      if (it.ma) lines.push(`<a href="mailto:${esc(it.ma)}">${icon('mail', 'width="15" height="15"')}<span>${esc(it.ma)}</span></a>`);
      if (lines.length) h += `<p class="nm__lines">${lines.join('')}</p>`;
    }
    return h;
  }
  function cardHTML(n, full) {
    const [first, ...rest] = n.items;
    let h = full ? `<button type="button" class="nm__x" data-nm-close aria-label="${esc(M.L.close)}">${icon('close', 'width="16" height="16"')}</button>` : '';
    h += `<div class="nm__item">${itemHTML(n, first, full, true)}</div>`;
    if (rest.length) h += `<div class="nm__also"><span class="nm__alsoh">${esc(M.L.alsoHere)}</span>${rest.map((it) => `<div class="nm__item nm__item--s">${itemHTML(n, it, full, false)}</div>`).join('')}</div>`;
    if (full) {
      const link = first.k === 'l' ? [first.h, M.L.site] : [M.L.repHref, M.L.rep];
      h += `<p class="nm__cta"><a class="link link--light" href="${esc(link[0])}">${esc(link[1])}${icon('arrow')}</a></p>`;
    }
    return h;
  }
  let cardFor = null, cardFull = false;
  function showCard(n, full) {
    if (!n) { card.hidden = true; card.className = 'nm__card'; cardFor = null; return; }
    if (cardFor !== n || cardFull !== full) {
      card.innerHTML = cardHTML(n, full);
      card.className = `nm__card${full ? ' is-pin' : ''}${n.site ? '' : ' is-rep'}`;
      cardFor = n; cardFull = full;
    }
    card.hidden = false;
    positionCard();
  }
  function positionCard() {
    const n = cardFor;
    if (!n || card.hidden) return;
    card.classList.toggle('is-away', !!n.out);
    if (vw < 700) { card.style.left = card.style.top = ''; return; } // Telefon: Karte unter der Weltkarte
    const cw = card.offsetWidth, ch = card.offsetHeight;
    const lr = n.el?.classList.contains('is-lbl') && !n.el.classList.contains('is-lbl-l') ? n.lw + 10 : 0;
    const ll = n.el?.classList.contains('is-lbl-l') ? n.lw + 10 : 0;
    let left = n.X + 26 + lr, top = n.Y - 34;
    if (left + cw > vw - 12) left = n.X - 26 - ll - cw;
    if (left < 12) left = clamp(n.X - cw / 2, 12, vw - cw - 12);
    top = clamp(top, 12, vh - ch - 12);
    card.style.left = `${Math.round(left)}px`;
    card.style.top = `${Math.round(top)}px`;
  }
  function setActive(n) {
    active = n;
    for (const m of nodes) m.el?.classList.toggle('is-on', m === n);
  }
  function setRoving(n) {
    if (!n?.el) return;
    roving = n;
    for (const m of nodes) m.el?.setAttribute('tabindex', m === n ? '0' : '-1');
  }
  function pin(n, opts = {}) {
    if (!n) { unpin(); return; }
    pinned = n; hovered = null;
    setActive(n); setRoving(n);
    for (const m of nodes) { if (m.el) { if (m === n) { m.el.setAttribute('aria-expanded', 'true'); m.el.setAttribute('aria-controls', 'nm-card'); } else m.el.removeAttribute('aria-expanded'); } }
    showCard(n, true);
    if (opts.fly) {
      const s = Math.max(cam.s, opts.s || cam.s);
      flyTo(n.x, n.y, s);
    } else if (n.out) flyTo(n.x, n.y, cam.s);
    render(performance.now());
    if (opts.focus) n.el.focus({ preventScroll: true });
  }
  function unpin() {
    pinned = null;
    for (const m of nodes) m.el?.removeAttribute('aria-expanded');
    setActive(hovered);
    showCard(hovered, false);
    render(performance.now());
  }
  function hover(n) {
    if (pinned) return;
    hovered = n;
    setActive(n);
    showCard(n, false);
    render(performance.now());
  }

  // ---------- Ebenen, Regionen, Länder ----------
  const bar = el.querySelector('[data-nm-bar]');
  function applyLayers() {
    const st = Object.fromEntries([...bar.querySelectorAll('[data-nm-layer]')].map((b) => [b.dataset.nmLayer, b.getAttribute('aria-pressed') === 'true']));
    showNet = st.net;
    for (const n of nodes) {
      n.on = n.site ? st.sites : st.reps;
      n.el?.classList.toggle('is-off', !n.on);
    }
    if (pinned && !pinned.on) unpin();
    if (hovered && !hovered.on) hover(null);
    if (!roving.on) setRoving(nodes.find((n) => n.on && n.site) || nodes.find((n) => n.on) || hq);
    render(performance.now());
  }
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.nmLayer) {
      const on = b.getAttribute('aria-pressed') !== 'true';
      // mindestens eine Punktebene bleibt sichtbar
      const other = bar.querySelector(`[data-nm-layer="${b.dataset.nmLayer === 'sites' ? 'reps' : 'sites'}"]`);
      if (!on && b.dataset.nmLayer !== 'net' && other.getAttribute('aria-pressed') !== 'true') other.setAttribute('aria-pressed', 'true');
      b.setAttribute('aria-pressed', String(on));
      applyLayers();
    } else if (b.dataset.nmRegion) {
      if (pinned) unpin();
      setRegion(b.dataset.nmRegion);
      const r = b.dataset.nmRegion;
      if (r === 'world') worldView(); else fitBox(M.regions[r]);
    }
  });
  function setRegion(r) { for (const x of bar.querySelectorAll('[data-nm-region]')) x.setAttribute('aria-pressed', String(x.dataset.nmRegion === r)); }
  const sel = bar.querySelector('[data-nm-country]');
  sel.addEventListener('change', () => {
    const n = nodes[+sel.value];
    if (!sel.value || !n) return;
    if (!n.on) { for (const b of bar.querySelectorAll('[data-nm-layer]')) if (b.dataset.nmLayer === (n.site ? 'sites' : 'reps')) b.setAttribute('aria-pressed', 'true'); applyLayers(); }
    setRegion('');
    const dense = inEU(n.x, n.y);
    pin(n, { fly: true, s: Math.min(sMax, Math.max(vw / (dense ? 170 : 430), sMin * 1.5)), focus: true });
  });

  // ---------- Zeiger ----------
  const nodeOf = (t) => { const b = t.closest?.('.nm__mk'); return b ? nodes[+b.dataset.n] : null; };
  const marksBox = el.querySelector('[data-nm-marks]');
  marksBox.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') { const n = nodeOf(e.target); if (n && n !== hovered) hover(n); } });
  marksBox.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse' && nodeOf(e.target) && !nodeOf(e.relatedTarget || document.body)) hover(null); });
  marksBox.addEventListener('click', (e) => {
    const n = nodeOf(e.target);
    if (!n) return;
    if (pinned === n) unpin(); else pin(n);
  });
  card.addEventListener('click', (e) => { if (e.target.closest('[data-nm-close]')) { const n = pinned; unpin(); n?.el?.focus({ preventScroll: true }); } });
  // Ziehen (Maus in alle Richtungen, Finger waagerecht; senkrecht scrollt die Seite)
  let drag = null;
  frame.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || nodeOf(e.target) || e.target.closest('.nm__zoom')) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
  });
  frame.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.moved) { drag.moved = true; frame.setPointerCapture(e.pointerId); frame.classList.add('is-drag'); flight = null; }
    cam.x = drag.cx - dx / cam.s;
    cam.y = drag.cy - (e.pointerType === 'mouse' ? dy : 0) / cam.s;
    clampCam();
    setRegion('');
    kick();
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const was = drag.moved;
    drag = null;
    frame.classList.remove('is-drag');
    if (!was && e.type === 'pointerup' && pinned && !e.target.closest('.nm__card')) unpin(); // Klick ins Leere schließt
  };
  frame.addEventListener('pointerup', endDrag);
  frame.addEventListener('pointercancel', endDrag);
  frame.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return; // normales Mausrad scrollt die Seite
    e.preventDefault();
    const r = frame.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.012), 0);
    setRegion('');
  }, { passive: false });
  frame.addEventListener('dblclick', (e) => {
    if (nodeOf(e.target) || e.target.closest('.nm__zoom')) return;
    const r = frame.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, 2);
    setRegion('');
  });
  el.querySelector('[data-nm-zoom]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-nm-z]');
    if (!b) return;
    const z = b.dataset.nmZ;
    if (z === 'reset') { setRegion('world'); worldView(); return; }
    zoomAt(vw / 2, vh / 2, z === 'in' ? 1.7 : 1 / 1.7);
    setRegion('');
  });

  // ---------- Tastatur ----------
  function neighbor(n, key) {
    let best = null, bs = Infinity;
    for (const m of nodes) {
      if (m === n || !m.on || !m.el) continue;
      const dx = m.X - n.X, dy = m.Y - n.Y;
      const [main, cross] = key === 'ArrowRight' ? [dx, dy] : key === 'ArrowLeft' ? [-dx, dy] : key === 'ArrowDown' ? [dy, dx] : [-dy, dx];
      if (main <= 0.5) continue;
      const sc = main + Math.abs(cross) * 2.4;
      if (sc < bs) { bs = sc; best = m; }
    }
    return best;
  }
  marksBox.addEventListener('keydown', (e) => {
    const n = nodeOf(e.target);
    if (!n) return;
    if (/^Arrow/.test(e.key)) {
      e.preventDefault();
      const m = neighbor(n, e.key);
      if (!m) return;
      setRoving(m);
      m.el.focus({ preventScroll: true });
      if (m.out) flyTo(m.x, m.y, cam.s);
    } else if (e.key === 'Home') {
      e.preventDefault(); setRoving(hq); hq.el.focus({ preventScroll: true });
    } else if (e.key === 'Escape') {
      if (pinned) { e.preventDefault(); unpin(); }
    } else if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomAt(n.X, n.Y, 1.7); setRegion(''); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomAt(vw / 2, vh / 2, 1 / 1.7); setRegion(''); }
  });
  marksBox.addEventListener('focusin', (e) => { const n = nodeOf(e.target); if (n) { setRoving(n); if (!pinned) hover(n); } });
  marksBox.addEventListener('focusout', (e) => { if (!pinned && !nodeOf(e.relatedTarget || document.body)) hover(null); });
  card.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pinned) { const n = pinned; unpin(); n.el?.focus({ preventScroll: true }); } });

  // ---------- Start ----------
  if ('ResizeObserver' in window) new ResizeObserver(() => resize()).observe(frame);
  else addEventListener('resize', resize);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      visible = e.isIntersecting;
      el.classList.toggle('is-idle', !visible);
      if (visible && live && phase === 'wait' && e.intersectionRatio >= 0.3) start();
      if (visible && phase === 'done') idle();
      if (!visible && phase === 'done') clearFx();
    }
  }, { threshold: [0, 0.3] }) : null;
  document.addEventListener('visibilitychange', () => { if (!document.hidden && phase === 'done') idle(); });
  const boot = async () => {
    try { await loadRaster(); } catch (e) { return; } // ohne Landmaske (offline, Seitenwechsel während des Ladens) bleibt das Punktbild
    if (!el.isConnected) return;
    live = true;
    el.classList.add('is-live');
    if (!reduced()) img.classList.add('is-gone');
    bar.hidden = false;
    el.querySelector('[data-nm-zoom]').hidden = false;
    el.querySelector('[data-nm-legend]')?.setAttribute('hidden', '');
    resize();
    level(1);
    if (reduced() || !io) finish(); else io.observe(stage);
  };
  // Landmaske laden, sobald die Seite ruht (die Karte liegt weiter unten)
  if ('requestIdleCallback' in window) requestIdleCallback(boot, { timeout: 2500 }); else setTimeout(boot, 600);
}
