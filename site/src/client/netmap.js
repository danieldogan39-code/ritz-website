// Weltkarte „Weltweit vernetzt“: Leinwand mit Punktraster und Netz, Marker als Knöpfe darüber.
// Modi (data-nm-mode): home – Standorte und Vertretungen, Netzaufbau beim Erscheinen; locations – nur RITZ-Standorte mit
// Liste; contact – alle mit Suche, Liste, Route und allen Angaben. Das Modell schreibt src/views/netmap.js als JSON.
//
// Bedienung
// – Andocken: Der Zeiger rastet am nächsten Punkt im Umkreis ein (mit Hysterese); ein Zielring gleitet hin und zieht sich
//   zusammen, die Verbindung leuchtet auf, eine Vorschau erscheint. Klick heftet die Karte an (Anschrift, Telefon, Link).
// – Karte folgt: Verweilt der Zeiger kurz auf einem Punkt, fliegt die Karte so, dass der Punkt in die Mitte rückt – mit
//   sanftem Zoom, bei dichten Nachbarn so weit, dass sie auseinanderrücken. Der Punkt bleibt angedockt, bis die Maus sich
//   deutlich bewegt. Verlässt der Zeiger die Karte, fliegt sie zur Ausgangsansicht zurück. Ausdrückliches Zoomen, Ziehen
//   und Regionen beenden diesen Modus. Liste, Länderwahl und Tastatur zentrieren genauso.
// – Touch: Tippen auf einen Punkt mit dichten Nachbarn zoomt erst, sonst öffnet es die Karte; Wischen verschiebt waagrecht
//   (senkrecht scrollt die Seite), zwei Finger zoomen und verschieben.
// – Regionen, Länderwahl, Liste und Suche fliegen die Kamera an; Zoom-Knöpfe, Doppelklick, Trackpad bzw. Strg/⌘ + Mausrad.
// – Tastatur: Pfeiltasten springen zum nächsten Punkt in Pfeilrichtung (Zoom folgt bei dichten Punkten), Eingabe heftet an,
//   Escape schließt, Plus/Minus zoomen.
// Ohne JavaScript bleibt das Punktbild img/world-dots.svg mit den Markern (und auf Unterseiten die Liste).
import { esc, icon, phoneTxt } from '../lib/util.js';

const W = 1000, H = 520;
const LEVELS = [8, 4.6, 2.4, 1.2, 0.62]; // Punktteilung in Karteneinheiten (gleiches Gitter wie world-dots.svg bei 4,6)
const EU = [455, 50, 615, 172]; // Ausschnitt mit feiner Landmaske (Europa)
const EU_B = 14; // Übergangsband am Rand dieses Ausschnitts (Karteneinheiten): feines und grobes Raster mischen sich, keine Kante
const hash01 = (i) => (Math.imul(i ^ 0x9e3779b9, 2654435761) >>> 0) / 4294967296;
const euDepth = (x, y) => Math.min(x - EU[0], EU[2] - x, y - EU[1], EU[3] - y);
const TARGET_PX = 6.3; // gewünschter Punktabstand auf dem Bildschirm
const SNAP = 44, SNAP_TOUCH = 28; // Einrastradius in px
const CROWD = 30, SPREAD = 60; // Nachbar näher als CROWD px → Zoom, bis er etwa SPREAD px entfernt ist
const FOCUS = 1.45; // sanfter Zoom auf einen einzelnen Punkt (relativ zur Ausgangsansicht)
const DWELL = 340; // Verweildauer, bis die Karte folgt (ms)
const LOCK_R = 34; // so weit darf sich die Maus nach dem Zentrieren bewegen, ohne den Punkt loszulassen (px)
const IDLE_OUT = 4000; // Folge-Zoom: so lange auf keinem Punkt, dann zoomt die Karte von selbst heraus (ms)
const LUPE_K = 2; // Folge-Zoom: Höchstmaß, mit dem die Ansicht dem Zeiger folgt (1 = so schnell wie der Zeiger)
const CHASE_TAU = 0.12; // Glättung dieser Bewegung (s)
const WAKE = 700; // Mausrad: so lange muss der Zeiger auf der Karte ruhen, bis das Rad zoomt statt die Seite zu rollen (ms)
const WAVE_MS = 2600;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
// Welle von Hamburg: erst zügig, dann gleichmäßig über die Kontinente
const wave = (t) => { const p = clamp(t / WAVE_MS, 0, 1); return p * (0.55 + 0.45 * (1 - Math.pow(1 - p, 2))); };
const rgb = (hex, fb) => {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(String(hex).trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : fb;
};
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a, 0, 1).toFixed(3)})`;
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
const idle = (fn, timeout) => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout }) : setTimeout(fn, 200));

export function initNetMap(root = document) {
  for (const el of root.querySelectorAll('[data-nm]')) {
    if (el.__nm) continue;
    el.__nm = true;
    try { setup(el); } catch (e) { console.error(e); }
  }
}

function setup(el) {
  const M = JSON.parse(el.querySelector('[data-nm-model]').textContent);
  const mode = M.mode || 'home';
  const $ = (s) => el.querySelector(s);
  const stage = $('[data-nm-stage]'), frame = $('[data-nm-frame]'), img = $('.nm__img');
  const cvB = $('[data-nm-base]'), cvF = $('[data-nm-fx]'), card = $('[data-nm-card]'), ret = $('[data-nm-ret]');
  const bar = $('[data-nm-bar]'), zoomBox = $('[data-nm-zoom]'), marksBox = $('[data-nm-marks]');
  const listEl = $('[data-nm-list]'), qEl = $('[data-nm-q]'), countEl = $('[data-nm-count]');
  const g = cvB.getContext('2d'), fx = cvF.getContext('2d');
  const cs = getComputedStyle(el);
  const C = {
    dot: rgb(cs.getPropertyValue('--on-night'), [246, 240, 236]),
    red: rgb(cs.getPropertyValue('--hud-red'), [255, 74, 67]),
    cop: rgb(cs.getPropertyValue('--hud-copper'), [227, 154, 95]),
  };
  const cardId = `nm-card-${mode}`;
  card.id = cardId;

  // ---------- Modell ----------
  // Arten: Standorte (site), Vertretungen, Beiträge der Startseite (story: Projekte, neue Produkte, Neuigkeiten)
  const nodes = M.nodes.map((n, i) => ({ ...n, i, el: marksBox.querySelector(`.nm__mk[data-n="${i}"]`), on: true, match: true, site: n.k !== 'rep' && n.k !== 'story', story: n.k === 'story', X: 0, Y: 0, out: false, nn: Infinity }));
  const hq = nodes[M.hq] || nodes[0];
  const arcs = M.arcs.map((a) => {
    const A = nodes[a.a], B = nodes[a.b];
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
    let nx = -dy / d, ny = dx / d;
    if (ny > 0) { nx = -nx; ny = -ny; } // Bögen wölben sich nach oben
    const h = Math.min(92, d * 0.3);
    return { ...a, A, B, cx: (A.x + B.x) / 2 + nx * h, cy: Math.max(3, (A.y + B.y) / 2 + ny * h), d };
  });
  for (const n of nodes) { n.lbl = n.el?.querySelector('.nm__lbl') || null; n.lw = 0; n.arc = arcs.find((a) => a.B === n) || null; }
  // nächster sichtbarer Nachbar (Karteneinheiten): entscheidet, wie weit der Zoom einem Punkt folgt
  function neighbors() {
    for (const n of nodes) {
      n.nn = Infinity;
      if (!n.on || !n.match) continue;
      for (const m of nodes) if (m !== n && m.on && m.match) n.nn = Math.min(n.nn, Math.hypot(m.x - n.x, m.y - n.y));
    }
  }
  neighbors();
  const ext = nodes.reduce((b, n) => [Math.min(b[0], n.x), Math.min(b[1], n.y), Math.max(b[2], n.x), Math.max(b[3], n.y)], [Infinity, Infinity, -Infinity, -Infinity]);

  // ---------- Zustand ----------
  const cam = { x: W / 2, y: H / 2, s: 1 };
  let base = { x: W / 2, y: H / 2, s: 1 };
  let vw = 0, vh = 0, dpr = 1, sMin = 1, sMax = 26, sized = false, cardFloat = true, cw = 0, ch = 0;
  let raster = null, live = false, phase = 'wait'; // wait → run → done
  let t0 = 0;
  const tEnd = Math.max(0, ...nodes.map((n) => n.t)) + 650;
  let visible = false, raf = 0, idleRaf = 0, lastIdle = 0, nextPulse = 0, flight = null;
  let pinned = null, hovered = null, snap = null, roving = hq, lastFocus = null, focusAmt = 0;
  let markSig = ''; // zuletzt gesetzte Markerlage (placeMarks)
  let followBase = null, inside = false, backT = 0, dwellT = 0, glideT = 0, flashT = 0, lock = null, lastPX = 0, lastPY = 0;
  let pickSync = null; // Länderwahl zeigt das Land des angehefteten Punkts
  let viewSync = null; // Knopf „Ansicht“ (Telefon) markiert ausgeblendete Ebenen
  let chase = null, idleT = 0, lastCX = NaN, lastCY = NaN; // Folge-Zoom: Ziel der Ansicht, Auszeit, letzte Zeigerlage
  let wz = null, sleepUntil = Infinity; // Mausrad: Zielmaßstab mit Ankerpunkt; Karte „schläft“, bis der Zeiger auf ihr ruht
  const layer = { sites: 1, reps: 1, stories: 1, net: 1 }, fade = { sites: 1, reps: 1, stories: 1, net: 1 };
  const layerOf = (n) => (n.site ? 'sites' : n.story ? 'stories' : 'reps');
  const pulses = [], sparks = [], layers = new Map();

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
  // Punkte zeilenweise (Y aufsteigend), damit das Zeichnen nur die sichtbaren Zeilen durchläuft
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
    // Halbmesser mit der Teilung: auf dem Bildschirm bleibt der Hof um einen Punkt etwa gleich groß (~20 px)
    const hr = clamp((15 * sp) / 4.6, 3.2, 26), hr2 = hr * hr, near2 = hr2 * 0.135;
    const heat = new Uint8Array(n), lit = new Float32Array(n), owner = new Int16Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const px = X[i], py = Y[i];
      if (px < ext[0] - hr || px > ext[2] + hr || py < ext[1] - hr || py > ext[3] + hr) continue;
      let best = Infinity, bt = 0, bi = -1;
      for (const nd of nodes) {
        if (nd.story) continue; // Beiträge färben das Land nicht
        const ddx = nd.x - px, ddy = nd.y - py;
        if (ddx > hr || ddx < -hr || ddy > hr || ddy < -hr) continue;
        const q = ddx * ddx + ddy * ddy;
        if (q < best) { best = q; bt = nd.t; bi = nd.i; }
      }
      if (best < hr2) { heat[i] = best < near2 ? 2 : 1; lit[i] = bt; owner[i] = bi; }
    }
    const L = { sp, n, X, Y, heat, lit, owner, eu: li === LEVELS.length - 1 };
    layers.set(li, L);
    return L;
  }
  const firstRow = (Y, y) => { let lo = 0, hi = Y.length; while (lo < hi) { const m = (lo + hi) >> 1; if (Y[m] < y) lo = m + 1; else hi = m; } return lo; };

  // ---------- Kamera ----------
  const sx = (x) => (x - cam.x) * cam.s + vw / 2;
  const sy = (y) => (y - cam.y) * cam.s + vh / 2;
  // Die Karte füllt den Rahmen; damit jeder Punkt in die Mitte rücken kann, darf die Mitte bis zum äußersten Punkt
  // wandern – jenseits der Küsten ist die Karte ohnehin dunkel, der Rand fällt nicht auf
  function clampCam(c = cam) {
    c.s = clamp(c.s, sMin, sMax);
    const hw = vw / (2 * c.s), hh = vh / (2 * c.s);
    const x0 = Math.min(hw, ext[0]), x1 = Math.max(W - hw, ext[2]), y0 = Math.min(hh, ext[1]), y1 = Math.max(H - hh, ext[3]);
    c.x = x0 > x1 ? W / 2 : clamp(c.x, x0, x1);
    c.y = y0 > y1 ? H / 2 : clamp(c.y, y0, y1);
    return c;
  }
  // Ausgangsansicht: alle Punkte mit Rand für Marker und Beschriftungen
  function computeBase() {
    const padX = Math.max(46, (ext[2] - ext[0]) * 0.09), padY = Math.max(34, (ext[3] - ext[1]) * 0.14);
    const bw = ext[2] - ext[0] + 2 * padX, bh = ext[3] - ext[1] + 2 * padY;
    return clampCam({ x: (ext[0] + ext[2]) / 2, y: (ext[1] + ext[3]) / 2, s: Math.min(vw / bw, vh / bh) });
  }
  const atBase = () => Math.abs(cam.s / base.s - 1) < 0.004 && Math.abs(cam.x - base.x) < 0.6 && Math.abs(cam.y - base.y) < 0.6;
  function resize() {
    const r = frame.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const wasBase = !sized || atBase();
    const keep = { x: cam.x, y: cam.y, k: cam.s / base.s };
    vw = r.width; vh = r.height;
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1, Math.sqrt(4.4e6 / (vw * vh)))); // große Flächen: höchstens ~4,4 Mio. Pixel je Leinwand
    for (const c of [cvB, cvF]) { c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr); }
    sMin = Math.min(vw / W, vh / H);
    sMax = Math.max(sMin * 6, 26);
    base = computeBase();
    if (wasBase) Object.assign(cam, base);
    else { cam.s = base.s * keep.k; cam.x = keep.x; cam.y = keep.y; clampCam(); }
    if (followBase) followBase = { ...base };
    flight = null;
    sized = true;
    for (const n of nodes) if (n.lbl) n.lw = n.lbl.offsetWidth; markSig = '';
    cardFloat = getComputedStyle(card).position === 'absolute';
    if (!card.hidden) measureCard();
    render(performance.now());
    positionCard();
  }
  // Flug: Maßstab logarithmisch; mit Anker bleibt ein Kartenpunkt am selben Bildschirmort (Zoom um den Zeiger)
  function flyTo(x, y, s, dur = 820, anchor = null) {
    chase = null; wz = null;
    const to = clampCam({ x, y, s });
    if (reduced() || !visible || !vw) dur = 0;
    if (!dur) { Object.assign(cam, to); flight = null; render(performance.now()); positionCard(); return; }
    flight = { from: { ...cam }, to, ts: performance.now(), dur, anchor };
    kick();
  }
  function zoomAt(px, py, f, dur = 460) {
    const s = clamp(cam.s * f, sMin, sMax);
    const mx = (px - vw / 2) / cam.s + cam.x, my = (py - vh / 2) / cam.s + cam.y;
    flyTo(mx - (px - vw / 2) / s, my - (py - vh / 2) / s, s, dur, { mx, my, px, py });
  }
  function fitBox(b, pad = 0.08, dur = 820) {
    const bw = Math.max(60, b[2] - b[0]), bh = Math.max(36, b[3] - b[1]);
    const s = Math.min(vw / (bw * (1 + pad * 2)), vh / (bh * (1 + pad * 2)));
    flyTo((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, s, dur);
  }
  const home = () => flyTo(base.x, base.y, base.s);
  const userView = () => { followBase = null; lock = null; chase = null; clearTimeout(backT); clearTimeout(dwellT); clearTimeout(idleT); };
  // Folge-Zoom: steht der Zeiger 4 s lang auf keinem Punkt, zoomt die Karte von selbst wieder heraus
  function armIdle() {
    clearTimeout(idleT);
    if (!followBase || pinned || !inside || snap) return;
    idleT = setTimeout(() => {
      if (!followBase || pinned || !inside || snap || drag || pinch || !el.isConnected) return;
      const b = followBase;
      followBase = null; lock = null;
      flyTo(b.x, b.y, b.s, 1000);
    }, IDLE_OUT);
  }
  // Folge-Zoom: die Ansicht wandert mit dem Zeiger (wie eine Lupe über der Weltansicht), solange kein Punkt angedockt
  // ist. Je stärker der Zoom, desto weiter; über die Rahmenbreite erreicht der Zeiger so die ganze Ausgangsansicht.
  function chaseBy(dx, dy) {
    const k = Math.min(LUPE_K, cam.s / base.s - 1);
    if (k < 0.03 || (!dx && !dy)) return;
    const from = chase || cam;
    const to = clampCam({ x: from.x + (dx * k) / cam.s, y: from.y + (dy * k) / cam.s, s: cam.s });
    chase = { x: to.x, y: to.y, t: chase?.t || performance.now() };
    kick();
  }
  function scheduleBack() {
    clearTimeout(backT);
    if (!followBase || pinned || inside) return;
    backT = setTimeout(() => {
      if (inside || pinned || !followBase || !el.isConnected) return;
      const b = followBase;
      followBase = null;
      flyTo(b.x, b.y, b.s, 900);
    }, 480);
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
    const focus = pinned || hovered;
    // Durchgänge: 0 Grundraster, 1 Umfeld, 2 nah, 3 Wellenfront/Aufblitzen, 4 Umfeld des gewählten Punkts
    const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const hs = size / 2;
    for (let i = firstRow(L.Y, y0); i < L.n; i++) {
      const y = L.Y[i];
      if (y > y1) break;
      const x = L.X[i];
      if (x < x0 || x > x1) continue;
      if (skipEU) { if (inEU(x, y)) { const d = euDepth(x, y); if (d >= EU_B || hash01(i) < d / EU_B) continue; } } // grob: läuft im Band aus
      else if (L.eu) { const d = euDepth(x, y); if (d < EU_B && hash01(i) >= d / EU_B) continue; } // fein: setzt im Band ein
      let k = L.heat[i];
      if (k) { const o = nodes[L.owner[i]]; if (o && (!o.on || !o.match)) k = 0; }
      if (run) {
        const dd = Math.hypot(x - hx, y - hy);
        if (dd > R) continue;
        if (R - dd < 22 && R < 1150) k = 3;
        else if (k && t < L.lit[i]) k = 0;
        else if (k && t - L.lit[i] < 520) k = 3;
      } else if (k && focus && L.owner[i] === focus.i) k = 4;
      const X = (x - cam.x) * s + vw / 2, Y = (y - cam.y) * s + vh / 2, p = paths[k];
      if (round) { p.moveTo(X + hs, Y); p.arc(X, Y, hs, 0, 6.2832); } else p.rect(X - hs, Y - hs, size, size);
    }
    g.globalAlpha = alpha;
    g.fillStyle = rgba(C.dot, 0.28); g.fill(paths[0]);
    g.fillStyle = rgba(C.cop, 0.5); g.fill(paths[1]);
    g.fillStyle = rgba(C.red, 0.78); g.fill(paths[2]);
    g.fillStyle = rgba(C.dot, 0.9); g.fill(paths[3]);
    g.fillStyle = rgba(focus?.site ? C.red : focus?.story ? C.dot : C.cop, 0.95); g.fill(paths[4]);
    g.globalAlpha = 1;
  }
  // Raster je Zoomstufe: das passende wird kurz überblendet (zeitlich), in Ruhe liegt immer genau eines
  const lv = { cur: -1, prev: -1, t: 0 };
  const LF_MS = 260;
  function wantLevel() {
    const u = Math.log2(TARGET_PX / cam.s);
    let best = 0, bd = Infinity;
    LEVELS.forEach((v, i) => { const d = Math.abs(Math.log2(v) - u); if (d < bd) { bd = d; best = i; } });
    if (lv.cur >= 0 && best !== lv.cur && Math.abs(Math.log2(LEVELS[lv.cur]) - u) - bd < 0.14) return lv.cur; // Hysterese
    return best;
  }
  function dotLevels(now) {
    const want = wantLevel();
    if (lv.cur < 0) lv.cur = want;
    else if (want !== lv.cur) { lv.prev = lv.cur; lv.cur = want; lv.t = now; }
    const a = reduced() || lv.prev < 0 ? 1 : clamp((now - lv.t) / LF_MS, 0, 1);
    if (a >= 1) { lv.prev = -1; return [[lv.cur, 1]]; }
    kick();
    return [[lv.prev, 1 - a], [lv.cur, a]];
  }
  function quadAt(a, p) {
    const u = 1 - p;
    return [u * u * a.A.x + 2 * u * p * a.cx + p * p * a.B.x, u * u * a.A.y + 2 * u * p * a.cy + p * p * a.B.y];
  }
  function strokeArc(ctx2, a, p0, p1) {
    const n = Math.max(6, Math.ceil((a.d * cam.s * (p1 - p0)) / 12));
    const s = cam.s, ox = vw / 2 - cam.x * s, oy = vh / 2 - cam.y * s;
    ctx2.beginPath();
    for (let k = 0; k <= n; k++) {
      const p = p0 + ((p1 - p0) * k) / n, u = 1 - p;
      const x = (u * u * a.A.x + 2 * u * p * a.cx + p * p * a.B.x) * s + ox, y = (u * u * a.A.y + 2 * u * p * a.cy + p * p * a.B.y) * s + oy;
      if (k) ctx2.lineTo(x, y); else ctx2.moveTo(x, y);
    }
    ctx2.stroke();
  }
  // Deckkraft einer Verbindung: Ebenen (weich ein- und ausgeblendet) und Suche
  const arcAlpha = (a) => fade.net * (a.s ? fade.sites : Math.min(fade.sites, fade.reps)) * (a.B.match ? 1 : 0.12);
  const arcLive = (a) => arcAlpha(a) > 0.02;
  const hotArc = (a, f) => !!f && (a.B === f || (f.site && a.A === f && !a.s) || (f === hq && a.s));
  function drawArcs(now) {
    const run = phase === 'run';
    const t = now - t0;
    const f = pinned || hovered || lastFocus;
    g.lineCap = 'round';
    for (const pass of [0, 1]) { // 0 Glühen, 1 Linie
      for (const a of arcs) {
        const al = arcAlpha(a);
        if (al <= 0.01) continue;
        let p = 1;
        if (run) { p = ease(clamp((t - a.t0) / a.dur, 0, 1)); if (p <= 0) continue; }
        const hot = hotArc(a, f);
        const dim = hot ? 1 : 1 - 0.68 * focusAmt;
        const heat = hot ? focusAmt : 0;
        const col = a.s ? C.red : C.cop;
        if (pass === 0) {
          if (!a.s && heat < 0.05) continue;
          g.strokeStyle = rgba(col, (0.13 + 0.15 * heat) * dim * al);
          g.lineWidth = 5 + 2 * heat;
        } else {
          g.strokeStyle = rgba(col, (a.s ? 0.9 : 0.42 + 0.53 * heat) * dim * al);
          g.lineWidth = a.s ? 1.5 + 0.7 * heat : 1 + 0.8 * heat;
        }
        strokeArc(g, a, 0, p);
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
      g.strokeStyle = rgba(C.red, 0.55 * (1 - p));
      g.lineWidth = w;
      g.beginPath(); g.arc(X, Y, 1180 * wave(t - delay) * cam.s, 0, Math.PI * 2); g.stroke();
    }
  }
  function render(now) {
    if (!vw || !raster) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, vw, vh);
    if (phase !== 'wait') { // bis zum Aufbau bleibt die Bühne leer
      for (const [li, a] of dotLevels(now)) {
        const L = level(li);
        if (L.eu && li > 0) drawDots(level(li - 1), a, now, true); // außerhalb Europas das gröbere Raster
        drawDots(L, a, now, false);
      }
      if (phase === 'run') drawRipple(now);
      drawArcs(now);
    }
    placeMarks();
  }

  // ---------- Marker, Beschriftungen, Zielring ----------
  const RK = { hq: 3, production: 2, site: 1, sales: 1, rep: 0 };
  const LBL_AT = mode === 'locations' ? 0 : 2.2; // ab diesem Maßstab alle Standortnamen (Kollisionen ausgenommen)
  // Marker nur neu setzen, wenn sich Ansicht, Fokus oder sichtbare Einträge geändert haben: während das Netz sich
  // einzeichnet, steht die Kamera – bisher wurden trotzdem in jedem Bild alle Marker neu positioniert (Stil für ~80 Elemente)
  function placeMarks() {
    const focus = pinned || hovered;
    let sig = `${cam.x.toFixed(2)},${cam.y.toFixed(2)},${cam.s.toFixed(4)},${vw},${vh},${nodes.indexOf(focus)},${nodes.indexOf(snap)},${nodes.indexOf(pinned)}|`;
    for (const n of nodes) sig += (n.on ? 1 : 0) + (n.match ? 2 : 0) + (n.lbl ? 4 : 0);
    if (sig === markSig) { placeRet(); return; }
    markSig = sig;
    const lblOn = cam.s >= LBL_AT;
    const placed = [];
    const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    for (const n of nodes) {
      const X = sx(n.x), Y = sy(n.y);
      n.X = X; n.Y = Y;
      n.out = X < -24 || Y < -24 || X > vw + 24 || Y > vh + 24;
      if (!n.el) continue;
      n.el.style.translate = `${X.toFixed(1)}px ${Y.toFixed(1)}px`;
      n.el.classList.toggle('is-out', n.out);
    }
    const order = nodes.filter((n) => n.lbl).sort((a, b) => (b === focus) - (a === focus) || (b === hq) - (a === hq) || RK[b.k] - RK[a.k] || b.x - a.x);
    for (const n of nodes) if (n.on && !n.out && n.el) placed.push({ x0: n.X - 7, x1: n.X + 7, y0: n.Y - 7, y1: n.Y + 7, self: n });
    for (const n of order) {
      const want = n.on && n.match && !n.out && (lblOn || n === hq || n === focus);
      let side = '';
      if (want) {
        const w = n.lw + 6, X = n.X, Y = n.Y;
        const r = { x0: X + 12, x1: X + 14 + w, y0: Y - 9, y1: Y + 9 }, l = { x0: X - 14 - w, x1: X - 12, y0: Y - 9, y1: Y + 9 };
        const free = (b) => !placed.some((o) => o.self !== n && overlap(b, o));
        const must = n === focus || n === hq;
        if ((free(r) || must) && r.x1 < vw - 4) { side = 'r'; placed.push(r); } else if ((free(l) || must) && l.x0 > 4) { side = 'l'; placed.push(l); }
      }
      n.el.classList.toggle('is-lbl', !!side);
      n.el.classList.toggle('is-lbl-l', side === 'l');
    }
    placeRet();
  }
  function placeRet() {
    if (!ret) return;
    const n = snap || pinned;
    const on = !!n && !n.out && n.on;
    ret.classList.toggle('is-on', on);
    if (n) { ret.classList.toggle('is-site', n.site); ret.classList.toggle('is-story', n.story); ret.classList.toggle('is-hq', n === hq); ret.style.translate = `${n.X.toFixed(1)}px ${n.Y.toFixed(1)}px`; }
  }

  // ---------- Schleifen ----------
  function kick() { if (!raf && el.isConnected) raf = requestAnimationFrame(frameLoop); }
  function frameLoop(now) {
    raf = 0;
    if (!el.isConnected) return;
    let busy = false;
    if (flight) {
      const p = clamp((now - flight.ts) / flight.dur, 0, 1);
      const e = ease(p), f = flight.from, to = flight.to;
      cam.s = Math.exp(Math.log(f.s) + (Math.log(to.s) - Math.log(f.s)) * e);
      if (flight.anchor) { // Ankerpunkt bleibt am Bildschirmort
        const A = flight.anchor;
        cam.x = A.mx - (A.px - vw / 2) / cam.s;
        cam.y = A.my - (A.py - vh / 2) / cam.s;
      } else { cam.x = f.x + (to.x - f.x) * e; cam.y = f.y + (to.y - f.y) * e; }
      clampCam();
      if (p >= 1) { Object.assign(cam, clampCam({ ...to })); flight = null; } else busy = true;
    } else if (wz) { // Mausrad: weich zum Zielmaßstab, der Punkt unter dem Zeiger bleibt stehen
      const dt = clamp((now - wz.t) / 1000, 0, 0.05);
      wz.t = now;
      const a = 1 - Math.exp(-dt / 0.085);
      cam.s = Math.exp(Math.log(cam.s) + (Math.log(wz.s) - Math.log(cam.s)) * a);
      if (Math.abs(Math.log(cam.s / wz.s)) < 0.003) cam.s = wz.s;
      cam.x = wz.mx - (wz.px - vw / 2) / cam.s;
      cam.y = wz.my - (wz.py - vh / 2) / cam.s;
      clampCam();
      if (cam.s === wz.s) wz = null; else busy = true;
    } else if (chase) {
      const dt = clamp((now - chase.t) / 1000, 0, 0.05);
      chase.t = now;
      const a = 1 - Math.exp(-dt / CHASE_TAU);
      cam.x += (chase.x - cam.x) * a; cam.y += (chase.y - cam.y) * a;
      clampCam();
      if (Math.hypot(chase.x - cam.x, chase.y - cam.y) * cam.s < 0.35) { cam.x = chase.x; cam.y = chase.y; chase = null; } else busy = true;
    }
    for (const k of ['sites', 'reps', 'stories', 'net']) { // Ebenen weich ein- und ausblenden
      const d = layer[k] - fade[k];
      if (Math.abs(d) > 0.01) { fade[k] += d * 0.2; busy = true; } else fade[k] = layer[k];
    }
    const ft = pinned || hovered ? 1 : 0; // Hervorhebung der gewählten Verbindung
    if (Math.abs(ft - focusAmt) > 0.01) { focusAmt += (ft - focusAmt) * 0.24; busy = true; } else { focusAmt = ft; if (!ft) lastFocus = null; }
    if (phase === 'run' && now - t0 >= tEnd) finish();
    render(now);
    positionCard();
    if (busy || phase === 'run') kick();
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
    loop();
    // feinere Raster im Leerlauf vorbereiten, damit tiefes Zoomen nicht stockt
    const pre = (li) => { if (li < LEVELS.length && el.isConnected) idle(() => { level(li); pre(li + 1); }, 3000); };
    pre(2);
  }
  // Lichtpunkte über den Verbindungen und Funken beim Andocken (eigene Leinwand, 30 Bilder/s)
  function loop() {
    if (idleRaf || phase !== 'done' || reduced()) return;
    const tick = (now) => {
      idleRaf = 0;
      if (!el.isConnected || !visible || document.hidden) return;
      idleRaf = requestAnimationFrame(tick);
      if (now - lastIdle < 32) return;
      lastIdle = now;
      if (!reduced() && now > nextPulse) {
        const pool = arcs.filter((a) => arcLive(a) && !(a.B.out && a.A.out));
        if (pool.length) {
          const main = pool.filter((x) => x.s);
          const from = main.length && Math.random() < 0.35 ? main : pool;
          const a = from[Math.floor(Math.random() * from.length)];
          pulses.push({ a, ts: now, dur: 900 + Math.min(1, a.d / 300) * 1300 });
        }
        nextPulse = now + 560 + Math.random() * 560;
      }
      fx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fx.clearRect(0, 0, vw, vh);
      fx.globalCompositeOperation = 'lighter';
      const comet = (a, p, tail, size, al) => {
        const col = a.s ? C.red : C.cop;
        for (let j = 0; j < 8; j++) {
          const q = clamp(p - (tail * j) / 8, 0, 1);
          const [x, y] = quadAt(a, q);
          fx.fillStyle = rgba(j ? col : [255, 240, 230], (1 - j / 8) * al);
          fx.beginPath(); fx.arc(sx(x), sy(y), j ? Math.max(0.4, size - j * 0.18) : size + 0.4, 0, Math.PI * 2); fx.fill();
        }
      };
      for (let k = pulses.length - 1; k >= 0; k--) {
        const P = pulses[k];
        const p = (now - P.ts) / P.dur;
        if (p >= 1 || !arcLive(P.a)) { pulses.splice(k, 1); continue; }
        comet(P.a, p, 0.16, 2.2, 0.85 * Math.sin(Math.PI * Math.min(1, p * 1.05)) * arcAlpha(P.a));
      }
      for (let k = sparks.length - 1; k >= 0; k--) {
        const P = sparks[k];
        const p = (now - P.ts) / P.dur;
        if (p >= 1) { sparks.splice(k, 1); continue; }
        comet(P.a, easeOut(p), 0.22, 3, 0.95 * (1 - Math.max(0, p - 0.85) / 0.15) * arcAlpha(P.a));
      }
      fx.globalCompositeOperation = 'source-over';
    };
    idleRaf = requestAnimationFrame(tick);
  }
  function clearFx() { fx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.clearRect(0, 0, vw, vh); pulses.length = 0; sparks.length = 0; }
  // Funke von der Quelle zum gewählten Punkt: die Verbindung antwortet auf das Andocken
  function spark(n) {
    if (reduced() || phase !== 'done' || !n) return;
    const list = n === hq ? arcs.filter((a) => a.s) : n.arc ? [n.arc] : [];
    const now = performance.now();
    for (const a of list) if (arcLive(a) && !sparks.some((s) => s.a === a && now - s.ts < 300)) sparks.push({ a, ts: now, dur: 420 + Math.min(1, a.d / 300) * 380 });
  }

  // ---------- Karte zum Punkt ----------
  const kindOf = (it) => M.L.types[it.k === 'l' ? it.ty : 'rep'] || '';
  // Beitrag: Kategorie (wie auf der bisherigen Karte), Titel, in der angehefteten Karte ein kurzer Anriss
  function storyHTML(it, full, first) {
    const lg = it.tl ? ` lang="${esc(it.tl)}"` : '';
    let h = `<span class="nm__kind nm__kind--story">${esc(it.ca)}</span>`;
    h += first ? `<h3 class="nm__title"${lg}>${esc(it.ti)}</h3>` : `<b class="nm__title nm__title--s"${lg}>${esc(it.ti)}</b>`;
    if (full && first && it.tx) h += `<p class="nm__tx"${lg}>${esc(it.tx)}</p>`;
    if (full && !first && it.h) h += `<p class="nm__lines"><a href="${esc(it.h)}">${icon('arrow', 'width="15" height="15"')}<span>${esc(M.L.more)}</span></a></p>`;
    return h;
  }
  function itemHTML(n, it, full, first) {
    if (it.k === 's') return storyHTML(it, full, first);
    const title = it.k === 'l' ? n.label : it.ti;
    let h = `<span class="nm__kind${it.k === 'r' ? ' nm__kind--rep' : ''}">${esc(kindOf(it))}</span>`;
    h += first ? `<h3 class="nm__title">${esc(title)}</h3>` : `<b class="nm__title nm__title--s">${esc(title)}</b>`;
    h += `<p class="nm__sub">${esc(it.k === 'l' ? `${it.su}, ${it.co}` : it.co)}</p>`;
    if (it.fn && first) h += `<p class="nm__fn">${esc(it.fn)}</p>`;
    if (it.st && first) h += `<p class="nm__fn">${esc(it.st)}</p>`;
    if (it.sv) h += `<p class="nm__fn">${esc(it.sv)}</p>`;
    if (full) {
      if (it.ad && (first || mode !== 'home')) h += `<p class="nm__addr">${it.ad.map(esc).join('<br>')}</p>`;
      const lines = [];
      if (it.te) lines.push(`<a href="tel:${esc(it.te.replace(/[^\d+]/g, ''))}">${icon('phone', 'width="15" height="15"')}${phoneTxt(it.te)}</a>`);
      if (it.ma) lines.push(`<a href="mailto:${esc(it.ma)}">${icon('mail', 'width="15" height="15"')}<span>${esc(it.ma)}</span></a>`);
      if (it.rt) lines.push(`<a href="${esc(it.rt)}" target="_blank" rel="noopener">${icon('route', 'width="15" height="15"')}<span>${esc(M.L.route)}</span></a>`);
      if (lines.length) h += `<p class="nm__lines">${lines.join('')}</p>`;
    }
    return h;
  }
  function cardHTML(n, full, pick = 0) {
    let items = n.items.slice();
    if (pick > 0 && pick < items.length) items.unshift(...items.splice(pick, 1)); // aus der Liste gewählter Eintrag zuerst
    if (!layer.stories && !n.story) items = items.filter((it) => it.k !== 's'); // Ebene „Projekte & News“ aus
    const [first, ...rest] = items;
    let h = full ? `<button type="button" class="nm__x" data-nm-close aria-label="${esc(M.L.close)}">${icon('close', 'width="16" height="16"')}</button>` : '';
    if (full && first.im) h += `<div class="nm__pic"><img src="${esc(first.im)}" alt="" decoding="async"></div>`;
    h += `<div class="nm__item">${itemHTML(n, first, full, true)}</div>`;
    if (rest.length) h += `<div class="nm__also"><span class="nm__alsoh">${esc(M.L.alsoHere)}</span>${rest.map((it) => `<div class="nm__item nm__item--s">${itemHTML(n, it, full, false)}</div>`).join('')}</div>`;
    if (full) {
      const link = first.k === 's' ? (first.h ? [first.h, M.L.more] : null) : first.k === 'l' ? (first.h ? [first.h, M.L.site] : null) : M.L.repHref ? [M.L.repHref, M.L.rep] : null;
      if (link) h += `<p class="nm__cta"><a class="link link--light" href="${esc(link[0])}">${esc(link[1])}${icon('arrow')}</a></p>`;
    }
    return h;
  }
  let cardFor = null, cardFull = false, cardPick = 0, cardSide = '';
  function measureCard() { cw = card.offsetWidth; ch = card.offsetHeight; }
  function showCard(n, full, pick = 0) {
    if (!n) {
      if (!card.hidden) { card.hidden = true; card.className = 'nm__card'; card.removeAttribute('aria-hidden'); }
      cardFor = null;
      return;
    }
    const fresh = cardFor !== n || cardFull !== full || cardPick !== pick;
    if (fresh) {
      card.innerHTML = cardHTML(n, full, pick);
      card.className = `nm__card${full ? ' is-pin' : ''}${n.site ? '' : n.story ? ' is-story' : ' is-rep'}`;
      const pic = card.querySelector('.nm__pic'), pim = pic?.querySelector('img');
      if (pim) { // Foto blendet ein, sobald es geladen ist; fehlt es, bleibt die Karte ohne
        const ok = () => pic.classList.add('is-ok');
        if (pim.complete && pim.naturalWidth) ok(); else { pim.addEventListener('load', ok, { once: true }); pim.addEventListener('error', () => { pic.hidden = true; measureCard(); positionCard(true); }, { once: true }); }
      }
      if (full) card.removeAttribute('aria-hidden'); else card.setAttribute('aria-hidden', 'true'); // Vorschau: Inhalt steht im Namen des Markers
      cardFor = n; cardFull = full; cardPick = pick; cardSide = '';
    }
    card.hidden = false;
    if (fresh) measureCard();
    positionCard(true);
    if (fresh && !reduced()) { card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in'); }
  }
  // Lage der Karte: rechts, links, unter oder über dem Punkt – dort, wo sie die wenigsten Nachbarn verdeckt
  function positionCard(force = false) {
    const n = cardFor;
    if (!n || card.hidden) return;
    card.classList.toggle('is-away', n.out);
    if (!cardFloat) { if (force) card.style.translate = ''; return; } // schmal: unter der Karte
    const lr = n.el?.classList.contains('is-lbl') && !n.el.classList.contains('is-lbl-l') ? n.lw + 10 : 0;
    const ll = n.el?.classList.contains('is-lbl-l') ? n.lw + 10 : 0;
    const M0 = 10;
    const cands = [['l', n.X + 22 + lr, n.Y - 30, 0], ['r', n.X - 22 - ll - cw, n.Y - 30, 0.5], ['t', n.X - cw / 2, n.Y + 24, 1], ['b', n.X - cw / 2, n.Y - 24 - ch, 1.5]];
    let best = null, cur = null;
    for (const [side, x0, y0, pref] of cands) {
      const x = clamp(x0, M0, Math.max(M0, vw - cw - M0)), y = clamp(y0, M0, Math.max(M0, vh - ch - M0));
      let sc = pref + (Math.abs(x - x0) > 1 && side !== 't' && side !== 'b' ? 40 : 0) + (Math.abs(y - y0) > 1 && (side === 't' || side === 'b') ? 40 : 0);
      if (n.X > x - 16 && n.X < x + cw + 16 && n.Y > y - 16 && n.Y < y + ch + 16) sc += 100; // nie den Punkt selbst verdecken
      for (const m of nodes) {
        if (m === n || !m.on || !m.match || m.out) continue;
        if (m.X > x - 8 && m.X < x + cw + 8 && m.Y > y - 8 && m.Y < y + ch + 8) sc += m.site ? 3 : 1;
        if (m.lbl && m.el.classList.contains('is-lbl')) { // auch sichtbare Beschriftungen nicht verdecken
          const L = m.el.classList.contains('is-lbl-l'), x0 = L ? m.X - 14 - m.lw : m.X + 12, x1 = L ? m.X - 12 : m.X + 14 + m.lw;
          if (x0 < x + cw && x1 > x && m.Y - 9 < y + ch && m.Y + 9 > y) sc += 2;
        }
      }
      const c = { side, x, y, sc };
      if (side === cardSide) cur = c;
      if (!best || sc < best.sc) best = c;
    }
    const pick = cur && cur.sc <= best.sc + 2.5 ? cur : best; // nicht bei jedem Bild die Seite wechseln
    cardSide = pick.side;
    card.style.translate = `${Math.round(pick.x + frame.offsetLeft)}px ${Math.round(pick.y + frame.offsetTop)}px`;
    const oy = `${Math.round(clamp(n.Y - pick.y, 0, ch))}px`, ox = `${Math.round(clamp(n.X - pick.x, 0, cw))}px`;
    card.style.transformOrigin = pick.side === 'l' ? `0 ${oy}` : pick.side === 'r' ? `100% ${oy}` : pick.side === 't' ? `${ox} 0` : `${ox} 100%`;
  }
  function setActive(n) {
    for (const m of nodes) m.el?.classList.toggle('is-on', m === n);
    if (listEl) for (const b of listEl.querySelectorAll('.nm__entry')) b.classList.toggle('is-on', !!n && +b.dataset.n === n.i);
  }
  function setRoving(n) {
    if (!n?.el) return;
    roving = n;
    for (const m of nodes) m.el?.setAttribute('tabindex', m === n ? '0' : '-1');
  }
  function ripple(n) {
    if (reduced() || !n?.el) return;
    const r = document.createElement('span');
    r.className = 'nm__rip';
    r.setAttribute('aria-hidden', 'true');
    n.el.appendChild(r);
    const rm = () => r.remove();
    r.addEventListener('animationend', rm, { once: true });
    setTimeout(rm, 1200);
  }
  function scrollEntry(n, pick) {
    if (!listEl) return;
    const b = listEl.querySelector(`.nm__entry[data-n="${n.i}"][data-i="${pick}"]`) || listEl.querySelector(`.nm__entry[data-n="${n.i}"]`);
    if (!b || b.parentElement.hidden) return;
    const lr = listEl.getBoundingClientRect(), br = b.getBoundingClientRect();
    if (br.top < lr.top || br.bottom > lr.bottom) listEl.scrollTo({ top: listEl.scrollTop + br.top - lr.top - (lr.height - br.height) / 2, behavior: reduced() ? 'auto' : 'smooth' });
  }
  function pin(n, o = {}) {
    if (!n) { unpin(); return; }
    pinned = n; hovered = null; lastFocus = n;
    chase = null; clearTimeout(idleT);
    setActive(n); setRoving(n);
    pickSync?.(n);
    for (const m of nodes) {
      if (!m.el) continue;
      if (m === n) { m.el.setAttribute('aria-expanded', 'true'); m.el.setAttribute('aria-controls', cardId); } else { m.el.removeAttribute('aria-expanded'); m.el.removeAttribute('aria-controls'); }
    }
    clearTimeout(backT);
    showCard(n, true, o.pick || 0);
    ripple(n); spark(n);
    if (o.fly) { userView(); flyTo(n.x, n.y, Math.max(cam.s, o.s || cam.s)); } else if (n.out) flyTo(n.x, n.y, cam.s);
    placeRet(); kick();
    if (o.focus) n.el?.focus({ preventScroll: true });
    if (!o.fromList) scrollEntry(n, o.pick || 0);
    if (!cardFloat && o.reveal) { // schmal: Karte unter der Karte ins Bild holen
      const r = card.getBoundingClientRect();
      if (r.top > innerHeight - 90 || r.bottom > innerHeight + r.height * 0.4) card.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
    }
  }
  function unpin() {
    if (!pinned) return;
    pinned = null;
    pickSync?.(null);
    for (const m of nodes) { m.el?.removeAttribute('aria-expanded'); m.el?.removeAttribute('aria-controls'); }
    hovered = null;
    if (snap) hover(snap); else { setActive(null); showCard(null); }
    placeRet(); kick();
    scheduleBack();
    armIdle();
  }
  function hover(n) {
    if (pinned || hovered === n) return;
    hovered = n;
    if (n) lastFocus = n;
    setActive(n);
    showCard(n, false);
    if (n) spark(n);
    kick();
  }
  // Karte folgt dem Punkt: er rückt in die Mitte, dazu sanfter Fokus (iso) bzw. so viel Zoom, dass dichte Nachbarn
  // auseinanderrücken. track: nur bei der Maus (und Vorschauen aus Liste und Länderwahl) merkt sich die Karte die
  // Ausgangsansicht und fliegt beim Verlassen zurück; Tippen und Tastatur bewegen die Karte dauerhaft.
  function follow(n, { iso = false, quick = false, step = 3.2, track = false } = {}) {
    if (!n || !vw) return false;
    if (!track) { followBase = null; clearTimeout(backT); }
    const fb = followBase || { x: cam.x, y: cam.y, s: cam.s };
    let want = cam.s;
    if (iso) want = Math.max(want, fb.s * FOCUS);
    if (isFinite(n.nn) && n.nn * cam.s < CROWD) want = Math.max(want, Math.min(cam.s * step, SPREAD / n.nn));
    want = Math.min(want, sMax);
    const zoom = want > cam.s * 1.04;
    const off = Math.abs(n.X - vw / 2) > vw * 0.05 || Math.abs(n.Y - vh / 2) > vh * 0.07;
    if (!zoom && !off) return false;
    if (track && !followBase) followBase = fb;
    flyTo(n.x, n.y, zoom ? want : cam.s, quick ? 640 : 820);
    armIdle();
    return true;
  }
  const crowded = (n) => isFinite(n.nn) && n.nn * cam.s < CROWD && cam.s < sMax * 0.95;
  function setSnap(n, dwell = true) {
    if (snap === n) return;
    snap = n;
    clearTimeout(dwellT);
    armIdle();
    frame.classList.toggle('is-snap', !!n);
    if (ret) {
      ret.classList.remove('is-lock');
      if (n && ret.classList.contains('is-on')) { ret.classList.add('is-glide'); clearTimeout(glideT); glideT = setTimeout(() => ret.classList.remove('is-glide'), 260); }
    }
    if (pinned) setActive(pinned); else hover(n);
    placeRet();
    if (!n) return;
    requestAnimationFrame(() => { if (snap === n) ret?.classList.add('is-lock'); }); // Zielring zieht sich zusammen
    // verweilen: der Punkt wandert in die Mitte, der Zeiger bleibt. Ist eine Karte angeheftet, hält die Ansicht still –
    // man liest gerade; ein Klick auf einen anderen Punkt heftet diesen an und holt ihn in die Mitte
    if (dwell && !reduced() && !pinned) dwellT = setTimeout(() => {
      if (snap !== n || drag?.moved || pinch || !inside || pinned) return;
      if (follow(n, { iso: true, track: true })) lock = { n, x: lastPX, y: lastPY };
    }, DWELL);
  }
  // kurzer Zielring für Touch und Tastatur
  function flash(n, ms = 900) {
    snap = n; placeRet();
    requestAnimationFrame(() => ret?.classList.add('is-lock'));
    clearTimeout(flashT);
    flashT = setTimeout(() => { if (snap === n && !inside) { snap = null; ret?.classList.remove('is-lock'); placeRet(); } }, ms);
  }
  function nearest(px, py, R) {
    let best = null, bd = R;
    for (const n of nodes) {
      if (!n.on || !n.match || n.out || !n.el) continue;
      const d = Math.hypot(n.X - px, n.Y - py);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  // ---------- Ebenen, Regionen, Länder, Liste, Suche ----------
  function applyLayers() {
    const st = bar ? Object.fromEntries([...bar.querySelectorAll('[data-nm-layer]')].map((b) => [b.dataset.nmLayer, b.getAttribute('aria-pressed') === 'true'])) : {};
    layer.sites = st.sites === false ? 0 : 1;
    layer.reps = st.reps === false ? 0 : 1;
    layer.stories = st.stories === false ? 0 : 1;
    layer.net = st.net === false ? 0 : 1;
    for (const n of nodes) { n.on = !!layer[layerOf(n)]; n.el?.classList.toggle('is-off', !n.on); }
    if (cardFor && !card.hidden && cardFor.on) { const n0 = cardFor, f = cardFull, pk = cardPick; cardFor = null; showCard(n0, f, pk); } // Einträge der Ebene „Projekte & News“ in Standortkarten
    if (listEl) for (const b of listEl.querySelectorAll('.nm__entry')) b.parentElement.classList.toggle('is-off', !nodes[+b.dataset.n]?.on);
    neighbors();
    if (pinned && !pinned.on) unpin();
    if (snap && !snap.on) setSnap(null);
    if (hovered && !hovered.on) hover(null);
    if (!roving.on) setRoving(nodes.find((n) => n.on && n.site) || nodes.find((n) => n.on) || hq);
    viewSync?.();
    updateCount();
    kick();
  }
  function filter() {
    const q = norm(qEl?.value || '').trim();
    const hit = new Set();
    if (listEl) for (const b of listEl.querySelectorAll('.nm__entry')) {
      const ok = !q || b.dataset.q.includes(q);
      b.parentElement.hidden = !ok;
      if (ok) hit.add(+b.dataset.n);
    }
    for (const n of nodes) { n.match = !q || hit.has(n.i); n.el?.classList.toggle('is-dim', !n.match); }
    neighbors();
    if (pinned && !pinned.match) unpin();
    if (snap && !snap.match) setSnap(null);
    updateCount();
    kick();
  }
  function updateCount() {
    if (!countEl || !listEl) return;
    const vis = [...listEl.querySelectorAll('li')].filter((li) => !li.hidden && !li.classList.contains('is-off')).length;
    countEl.textContent = vis ? (vis === 1 ? M.L.count1 : M.L.countN).replace('{n}', vis) : M.L.none;
  }
  const setRegion = (r) => { if (bar) for (const x of bar.querySelectorAll('[data-nm-region]')) x.setAttribute('aria-pressed', String(x.dataset.nmRegion === r)); };
  const showLayerOf = (n) => {
    if (n.on || !bar) return;
    for (const b of bar.querySelectorAll('[data-nm-layer]')) if (b.dataset.nmLayer === layerOf(n)) b.setAttribute('aria-pressed', 'true');
    applyLayers();
  };
  const pinScale = (n) => Math.min(sMax, Math.max(cam.s, base.s * (inEU(n.x, n.y) ? 2.6 : 1.7), isFinite(n.nn) ? Math.min(SPREAD / n.nn, base.s * 8) : 0));
  if (bar) bar.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.nmLayer) {
      const on = b.getAttribute('aria-pressed') !== 'true';
      if (!on && b.dataset.nmLayer !== 'net') { // eine Punktebene bleibt immer an
        const others = [...bar.querySelectorAll('[data-nm-layer]')].filter((x) => x !== b && x.dataset.nmLayer !== 'net');
        if (!others.some((x) => x.getAttribute('aria-pressed') === 'true')) others[0]?.setAttribute('aria-pressed', 'true');
      }
      b.setAttribute('aria-pressed', String(on));
      applyLayers();
    } else if (b.dataset.nmRegion) {
      if (pinned) unpin();
      userView();
      setRegion(b.dataset.nmRegion);
      if (b.dataset.nmRegion === 'world') home(); else fitBox(M.regions[b.dataset.nmRegion]);
    }
  });
  // Telefon: Ebenen und Regionen als Blatt hinter „Ansicht“ (breit ist ihr Rahmen unsichtbar, siehe home.css)
  const viewEl = bar?.querySelector('[data-nm-view]'), viewBtn = bar?.querySelector('[data-nm-viewbtn]');
  if (viewEl && viewBtn) {
    const mq = matchMedia('(max-width: 700px)');
    const title = viewEl.querySelector('.nm__viewhead span')?.textContent || '';
    let vOpen = false, vT = 0;
    const openView = () => {
      if (vOpen || !mq.matches) return;
      vOpen = true;
      clearTimeout(vT);
      viewEl.classList.remove('is-leaving');
      el.classList.remove('is-view-leaving');
      el.classList.add('is-viewing');
      viewEl.setAttribute('role', 'dialog');
      viewEl.setAttribute('aria-label', title);
      viewBtn.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => viewEl.focus({ preventScroll: true }));
    };
    const closeView = (focusBtn = true) => {
      if (!vOpen) return;
      vOpen = false;
      viewBtn.setAttribute('aria-expanded', 'false');
      const gone = () => { el.classList.remove('is-viewing', 'is-view-leaving'); viewEl.classList.remove('is-leaving'); viewEl.removeAttribute('role'); viewEl.removeAttribute('aria-label'); };
      if (reduced()) gone();
      else { viewEl.classList.add('is-leaving'); el.classList.add('is-view-leaving'); vT = setTimeout(gone, 220); }
      if (focusBtn) viewBtn.focus({ preventScroll: true });
    };
    viewBtn.addEventListener('click', () => (vOpen ? closeView() : openView()));
    viewEl.querySelector('[data-nm-viewx]')?.addEventListener('click', () => closeView());
    viewEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeView(); } });
    viewEl.addEventListener('click', (e) => { if (e.target.closest('[data-nm-region]')) closeView(false); }); // Region gewählt: die Karte fliegt sichtbar
    viewEl.addEventListener('focusout', (e) => { if (vOpen && e.relatedTarget && !viewEl.contains(e.relatedTarget) && e.relatedTarget !== viewBtn) closeView(false); });
    const outsideV = (e) => {
      if (!el.isConnected) { document.removeEventListener('pointerdown', outsideV, true); return; }
      if (!vOpen || viewEl.contains(e.target) || viewBtn.contains(e.target)) return;
      closeView(false); // Schleier: Tippen schließt nur das Blatt, der folgende Klick geht ins Leere
      e.stopPropagation();
      const eat = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      document.addEventListener('click', eat, { capture: true, once: true });
      setTimeout(() => document.removeEventListener('click', eat, true), 700);
    };
    document.addEventListener('pointerdown', outsideV, true);
    mq.addEventListener?.('change', () => { if (!mq.matches) closeView(false); });
    viewSync = () => viewBtn.classList.toggle('has-filter', !layer.sites || !layer.reps || !layer.stories || !layer.net);
    viewSync();
  }
  // Länderwahl (Startseite): Knopf öffnet Suchfeld und Liste; Durchgehen zeigt das Land auf der Karte, Auswahl heftet an.
  // Der Knopf nennt immer das Land des angehefteten Punkts (auch nach einem Klick auf die Karte); das Kreuz hebt die Wahl auf.
  const pickEl = bar?.querySelector('[data-nm-pick]');
  if (pickEl) {
    const btn = pickEl.querySelector('[data-nm-pickbtn]'), pop = pickEl.querySelector('[data-nm-pop]'), pq = pickEl.querySelector('[data-nm-pickq]');
    const optsEl = pickEl.querySelector('[data-nm-opts]'), lbl = pickEl.querySelector('[data-nm-picklbl]'), nohit = pickEl.querySelector('[data-nm-nohit]');
    const xBtn = pickEl.querySelector('[data-nm-pickx]'), popX = pickEl.querySelector('[data-nm-popx]');
    const sheet = matchMedia('(max-width: 700px)'); // schmal: Auswahl als Blatt von unten, die Karte bleibt darüber sichtbar
    let openBy = '';
    const opts = [...optsEl.querySelectorAll('[role="option"]')], groups = [...optsEl.querySelectorAll('[role="group"]')];
    const ph = lbl.textContent;
    let isOpen = false, act = null, prevT = 0, closeT = 0;
    const vis = () => opts.filter((o) => !o.hidden);
    const optNode = (o) => nodes[+o.dataset.n];
    const has = (o, n) => !!o && !!n && o.dataset.ns.split(' ').includes(String(n.i));
    const chosen = () => opts.find((o) => o.getAttribute('aria-selected') === 'true') || null;
    const showValue = (o) => {
      for (const x of opts) x.setAttribute('aria-selected', String(x === o));
      lbl.textContent = o ? o.querySelector('span').textContent : ph;
      pickEl.classList.toggle('has-value', !!o);
      xBtn.hidden = !o;
    };
    pickSync = (n) => { if (!has(chosen(), n)) showValue(n ? opts.find((o) => has(o, n)) || null : null); };
    const previewOpt = (o) => {
      const n = optNode(o);
      if (!n || !isOpen || phase === 'wait') return;
      showLayerOf(n);
      clearTimeout(flashT);
      snap = n; placeRet();
      requestAnimationFrame(() => { if (snap === n) ret?.classList.add('is-lock'); });
      if (pinned) { setActive(n); showCard(n, n === pinned); } else hover(n); // angeheftet: die Vorschau gilt nur, solange die Liste offen ist
      follow(n, { iso: true, track: true, quick: true });
    };
    const activate = (o, { scroll = true, preview = true } = {}) => {
      act = o;
      for (const x of opts) x.classList.toggle('is-active', x === o);
      if (o) { pq.setAttribute('aria-activedescendant', o.id); if (scroll) o.scrollIntoView({ block: 'nearest' }); } else pq.removeAttribute('aria-activedescendant');
      clearTimeout(prevT);
      if (o && preview) prevT = setTimeout(() => previewOpt(o), 180);
    };
    const filterOpts = () => {
      const q = norm(pq.value).trim();
      for (const o of opts) o.hidden = !!q && !o.dataset.q.includes(q);
      for (const g of groups) g.hidden = !g.querySelector('[role="option"]:not([hidden])');
      const v = vis();
      nohit.hidden = v.length > 0;
      if (q) activate(v[0] || null);
      else if (act?.hidden) activate(null);
    };
    const openPick = () => {
      if (isOpen) return;
      isOpen = true;
      clearTimeout(closeT);
      pop.classList.remove('is-leaving');
      pop.hidden = false;
      pickEl.classList.add('is-open');
      el.classList.add('is-picking');
      btn.setAttribute('aria-expanded', 'true');
      pq.value = '';
      for (const o of opts) o.hidden = false;
      for (const g of groups) g.hidden = false;
      nohit.hidden = true;
      optsEl.scrollTop = 0;
      activate(chosen(), { preview: false });
      const touch = openBy === 'touch' && sheet.matches; // Finger: erst die Liste, die Tastatur erst beim Tippen ins Suchfeld
      openBy = '';
      requestAnimationFrame(() => (touch ? pop : pq).focus({ preventScroll: true }));
    };
    const closePick = (focusBtn = true, done = false) => {
      if (!isOpen) return;
      isOpen = false;
      clearTimeout(prevT);
      pickEl.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      const gone = () => { pop.hidden = true; pop.classList.remove('is-leaving'); el.classList.remove('is-picking'); };
      if (reduced()) gone();
      else { pop.classList.add('is-leaving'); closeT = setTimeout(gone, sheet.matches ? 220 : 150); }
      if (focusBtn) btn.focus({ preventScroll: true });
      if (done) return;
      if (pinned) { // Vorschau zurücknehmen: der angeheftete Punkt und seine Ansicht kehren zurück
        setActive(pinned); showCard(pinned, true);
        snap = null; ret?.classList.remove('is-lock'); placeRet();
        if (followBase) { const b = followBase; followBase = null; flyTo(b.x, b.y, b.s, 700); }
      } else if (!inside) { snap = null; ret?.classList.remove('is-lock'); placeRet(); hover(null); scheduleBack(); }
    };
    const choose = (o) => {
      const n = optNode(o);
      if (!n) return;
      showValue(o);
      closePick(true, true);
      showLayerOf(n);
      setRegion(''); userView();
      pin(n, { fly: true, s: pinScale(n) });
    };
    btn.addEventListener('pointerdown', (e) => { openBy = e.pointerType; });
    btn.addEventListener('click', () => (isOpen ? closePick() : openPick()));
    popX.addEventListener('click', () => closePick());
    pop.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePick(); } }); // auch vom Blatt selbst und vom Kreuz aus
    btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openPick(); } });
    xBtn.addEventListener('click', () => {
      closePick(false, true);
      showValue(null);
      unpin(); userView();
      setRegion('world'); home();
      btn.focus({ preventScroll: true });
    });
    pq.addEventListener('input', filterOpts);
    pq.addEventListener('keydown', (e) => {
      const v = vis(), i = v.indexOf(act);
      if (e.key === 'ArrowDown') { e.preventDefault(); activate(v[i < 0 ? 0 : Math.min(v.length - 1, i + 1)] || null); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activate(v[Math.max(0, i - 1)] || null); }
      else if (e.key === 'PageDown' || e.key === 'PageUp') { e.preventDefault(); activate(v[Math.max(0, Math.min(v.length - 1, i + (e.key === 'PageDown' ? 8 : -8)))] || null); }
      else if (e.key === 'Home' && !pq.value) { e.preventDefault(); activate(v[0] || null); }
      else if (e.key === 'End' && !pq.value) { e.preventDefault(); activate(v[v.length - 1] || null); }
      else if (e.key === 'Enter') { e.preventDefault(); if (act && !act.hidden) choose(act); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closePick(); }
      else if (e.key === 'Tab') closePick(false);
    });
    optsEl.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; const o = e.target.closest('[role="option"]'); if (o && o !== act) activate(o, { scroll: false }); });
    optsEl.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') e.preventDefault(); }); // Fokus bleibt im Suchfeld
    optsEl.addEventListener('click', (e) => { const o = e.target.closest('[role="option"]'); if (o) choose(o); });
    const outside = (e) => {
      if (!el.isConnected) { document.removeEventListener('pointerdown', outside, true); return; }
      if (!isOpen || (pickEl.contains(e.target) && e.target !== pickEl)) return; // pickEl selbst: der Schleier hinter dem Blatt
      closePick(false);
      if (e.target === pickEl) { // Schleier: Tippen schließt nur das Blatt, der folgende Klick geht ins Leere
        e.stopPropagation();
        const eat = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
        document.addEventListener('click', eat, { capture: true, once: true });
        setTimeout(() => document.removeEventListener('click', eat, true), 700);
        return;
      }
      // leere Kartenfläche: der Klick schließt nur die Liste (hebt nichts auf); ein Punkt lässt sich direkt anklicken
      if (frame.contains(e.target) && !e.target.closest('.nm__mk, .nm__zoom')) e.stopPropagation();
    };
    document.addEventListener('pointerdown', outside, true);
  }
  if (listEl) {
    listEl.addEventListener('click', (e) => {
      const b = e.target.closest('.nm__entry');
      const n = b ? nodes[+b.dataset.n] : null;
      if (!n) return;
      showLayerOf(n);
      setRegion('');
      pin(n, { fly: true, s: pinScale(n), pick: +b.dataset.i || 0, fromList: true });
      if (!cardFloat) { // schmal: Karte ins Bild holen, die Angaben stehen darunter
        const r = frame.getBoundingClientRect();
        if (r.top < 60 || r.bottom > innerHeight) frame.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
      }
    });
    const over = (e) => {
      const b = e.target.closest?.('.nm__entry');
      const n = b ? nodes[+b.dataset.n] : null;
      if (!n || !n.on || snap === n) return;
      clearTimeout(flashT);
      snap = n; placeRet();
      requestAnimationFrame(() => { if (snap === n) ret?.classList.add('is-lock'); });
      hover(n);
      // kurz verweilen: die Karte holt den Eintrag in die Mitte
      clearTimeout(dwellT);
      if (!reduced() && !pinned) dwellT = setTimeout(() => { if (snap === n && !inside && !pinned) follow(n, { iso: true, track: true }); }, DWELL + 60);
    };
    const leave = () => { if (!inside) { clearTimeout(dwellT); snap = null; ret?.classList.remove('is-lock'); placeRet(); hover(null); scheduleBack(); } };
    listEl.addEventListener('pointerover', over);
    listEl.addEventListener('focusin', over);
    listEl.addEventListener('pointerleave', leave);
    listEl.addEventListener('focusout', (e) => { if (!listEl.contains(e.relatedTarget)) leave(); });
  }
  let qT = 0, lastQ = '';
  qEl?.addEventListener('input', () => {
    filter();
    clearTimeout(qT);
    qT = setTimeout(() => { // Kamera folgt der Suche
      const q = norm(qEl.value).trim();
      if (q === lastQ) return;
      lastQ = q;
      userView(); setRegion(q ? '' : 'world');
      if (!q) { home(); return; }
      const hits = nodes.filter((n) => n.on && n.match);
      if (!hits.length || hits.length > 30) return;
      if (hits.length === 1) { pin(hits[0], { fly: true, s: pinScale(hits[0]) }); return; }
      fitBox(hits.reduce((b, n) => [Math.min(b[0], n.x), Math.min(b[1], n.y), Math.max(b[2], n.x), Math.max(b[3], n.y)], [Infinity, Infinity, -Infinity, -Infinity]), 0.18);
    }, 360);
  });

  // ---------- Zeiger: Andocken, Ziehen, Zwei-Finger-Zoom ----------
  const ptrs = new Map();
  let drag = null, pinch = null, lastPtr = 'mouse', dragEnd = 0, ptrT = 0;
  const local = (e) => { const r = frame.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const onScroll = () => {
    if (!el.isConnected) { removeEventListener('scroll', onScroll); return; }
    if (snap && inside) setSnap(null); // die Seite rollt unter dem Zeiger weg
  };
  addEventListener('scroll', onScroll, { passive: true });
  frame.addEventListener('pointerdown', (e) => {
    if (!live || e.button > 0 || e.target.closest('.nm__zoom')) return;
    lastPtr = e.pointerType;
    if (e.pointerType === 'mouse') sleepUntil = 0; // Klick weckt die Karte: das Mausrad zoomt sofort
    ptrT = performance.now();
    ptrs.set(e.pointerId, local(e));
    if (ptrs.size === 1) drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false, type: e.pointerType };
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      pinch = { d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, s0: cam.s, mx0: (mx - vw / 2) / cam.s + cam.x, my0: (my - vh / 2) / cam.s + cam.y };
      drag = null; flight = null; userView();
      for (const id of ptrs.keys()) try { frame.setPointerCapture(id); } catch (err) { /* bereits gelöst */ }
    }
  });
  frame.addEventListener('pointermove', (e) => {
    if (!live) return;
    const [px, py] = local(e);
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [px, py]);
    if (pinch && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      cam.s = clamp(pinch.s0 * (d / pinch.d0), sMin, sMax);
      cam.x = pinch.mx0 - (mx - vw / 2) / cam.s;
      cam.y = pinch.my0 - (my - vh / 2) / cam.s;
      clampCam(); setRegion(''); kick();
      return;
    }
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 5) {
        drag.moved = true;
        try { frame.setPointerCapture(e.pointerId); } catch (err) { /* bereits gelöst */ }
        frame.classList.add('is-drag');
        flight = null; userView(); setSnap(null);
        drag.x = e.clientX; drag.y = e.clientY; drag.cx = cam.x; drag.cy = cam.y; // kein Sprung um die Schwelle
        return;
      }
      if (drag.moved) {
        cam.x = drag.cx - dx / cam.s;
        cam.y = drag.cy - (drag.type === 'mouse' ? dy : 0) / cam.s; // Finger: senkrecht scrollt die Seite
        clampCam(); setRegion(''); kick();
        return;
      }
    }
    if (e.pointerType !== 'mouse' || phase === 'wait' || drag?.moved) return;
    inside = true;
    if (sleepUntil === Infinity) sleepUntil = performance.now() + WAKE;
    // Bewegung am Bildschirm (nicht im Rahmen): rollt nur die Seite unter dem Zeiger, bewegt das die Ansicht nicht
    const mdx = Number.isFinite(lastCX) ? e.clientX - lastCX : 0, mdy = Number.isFinite(lastCY) ? e.clientY - lastCY : 0;
    lastCX = e.clientX; lastCY = e.clientY;
    lastPX = px; lastPY = py;
    if (e.target.closest?.('.nm__zoom')) { lock = null; setSnap(null); return; }
    if (lock) { // nach dem Zentrieren bleibt der Punkt angedockt, bis sich die Maus deutlich bewegt
      if (lock.n === snap && lock.n.on && lock.n.match && Math.hypot(px - lock.x, py - lock.y) < LOCK_R) return;
      lock = null;
    }
    // Andocken mit Hysterese: der bisherige Punkt bleibt, bis ein anderer deutlich näher liegt
    let n = nearest(px, py, SNAP);
    if (snap && n !== snap && snap.on && snap.match && !snap.out) {
      const ds = Math.hypot(snap.X - px, snap.Y - py), dn = n ? Math.hypot(n.X - px, n.Y - py) : Infinity;
      if (ds < SNAP + 10 && ds - dn < 8) n = snap;
    }
    setSnap(n);
    if (!snap && followBase && !pinned && !flight && !drag) chaseBy(mdx, mdy);
  });
  const endPtr = (e) => {
    ptrs.delete(e.pointerId);
    if (pinch) { if (ptrs.size < 2) { pinch = null; drag = null; } return; }
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    frame.classList.remove('is-drag');
    if (d.moved) dragEnd = performance.now();
    // Marker selbst behandelt ihr click-Ereignis (auch für Screenreader und Tastatur)
    if (d.moved || e.type !== 'pointerup' || e.target.closest('.nm__zoom, .nm__mk') || phase === 'wait') return;
    const [px, py] = local(e);
    if (d.type === 'mouse') {
      // Klick: angedockten Punkt anheften (dichte Nachbarn rücken mit dem Zoom auseinander), leere Fläche schließt
      const n = snap || nearest(px, py, SNAP);
      if (!n) { if (pinned) unpin(); return; }
      if (pinned === n) { unpin(); return; }
      clearTimeout(dwellT);
      pin(n);
      if (follow(n, { quick: true, track: true })) { snap = n; lock = { n, x: px, y: py }; placeRet(); }
      return;
    }
    // Tippen: dichte Gruppe → erst zoomen, einzelner Punkt → Karte öffnen
    const n = nearest(px, py, SNAP_TOUCH);
    if (!n) { if (pinned) unpin(); return; }
    if (crowded(n) && pinned !== n) { flash(n); follow(n, { quick: true, step: 9 }); return; }
    if (pinned === n) unpin(); else { flash(n, 600); pin(n, { reveal: true }); }
  };
  frame.addEventListener('pointerup', endPtr);
  frame.addEventListener('pointercancel', endPtr);
  frame.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { inside = true; lastCX = e.clientX; lastCY = e.clientY; clearTimeout(backT); armIdle(); } });
  frame.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    inside = false;
    lock = null;
    lastCX = lastCY = NaN;
    sleepUntil = Infinity;
    setSnap(null);
    clearTimeout(idleT);
    scheduleBack();
  });
  // Mausrad: zoomt, sobald die Karte „wach“ ist – der Zeiger ruht kurz auf ihr (0,7 s) oder man hat hineingeklickt. Wer
  // die Seite scrollt und dabei über die Karte fährt, scrollt weiter (jedes Rad-Ereignis im Schlaf verlängert ihn); ganz
  // herausgezoomt rollt die Seite ebenfalls weiter. Strg/⌘ + Mausrad und das Zoomen am Trackpad wirken immer.
  frame.addEventListener('wheel', (e) => {
    if (!live) return;
    const now = performance.now();
    const pinchKey = e.ctrlKey || e.metaKey;
    if (!pinchKey && now < sleepUntil) { if (sleepUntil !== Infinity) sleepUntil = now + WAKE; return; }
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1);
    const target = wz ? wz.s : cam.s;
    if (!pinchKey && dy > 0 && target <= sMin * 1.002) { sleepUntil = now + WAKE; return; } // ganz heraus: die Seite rollt weiter
    e.preventDefault();
    const [px, py] = local(e);
    flight = null; userView(); setRegion('');
    const s = clamp(target * Math.exp(-clamp(dy, -240, 240) * (pinchKey ? 0.012 : 0.0028)), sMin, sMax);
    const mx = (px - vw / 2) / cam.s + cam.x, my = (py - vh / 2) / cam.s + cam.y;
    if (pinchKey && Math.abs(dy) < 40) { // Trackpad: unmittelbar
      wz = null;
      cam.s = s; cam.x = mx - (px - vw / 2) / s; cam.y = my - (py - vh / 2) / s;
      clampCam();
    } else wz = { s, mx, my, px, py, t: wz?.t || now };
    kick();
  }, { passive: false });
  // Safari: Trackpad-Geste statt Strg + Mausrad
  let gs = null;
  frame.addEventListener('gesturestart', (e) => { if (!live) return; e.preventDefault(); const [px, py] = local(e); gs = { s0: cam.s, px, py, mx: (px - vw / 2) / cam.s + cam.x, my: (py - vh / 2) / cam.s + cam.y }; flight = null; userView(); });
  frame.addEventListener('gesturechange', (e) => {
    if (!gs) return;
    e.preventDefault();
    cam.s = clamp(gs.s0 * e.scale, sMin, sMax);
    cam.x = gs.mx - (gs.px - vw / 2) / cam.s; cam.y = gs.my - (gs.py - vh / 2) / cam.s;
    clampCam(); setRegion(''); kick();
  });
  frame.addEventListener('gestureend', (e) => { if (gs) e.preventDefault(); gs = null; });
  frame.addEventListener('dblclick', (e) => {
    if (!live || e.target.closest('.nm__zoom')) return;
    const [px, py] = local(e);
    const n = lastPtr === 'mouse' ? snap : null;
    userView(); setRegion('');
    zoomAt(n ? n.X : px, n ? n.Y : py, 2);
    if (n && pinned !== n) pin(n);
  });
  zoomBox?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-nm-z]');
    if (!b) return;
    userView();
    const z = b.dataset.nmZ;
    if (z === 'reset') { setRegion('world'); if (pinned) unpin(); home(); return; }
    setRegion('');
    const c = pinned && !pinned.out ? [pinned.X, pinned.Y] : [vw / 2, vh / 2];
    zoomAt(c[0], c[1], z === 'in' ? 1.8 : 1 / 1.8);
  });
  // Marker: Klick, Tippen, Tastatur und Screenreader (Klicks daneben behandelt der Rahmen über das Andocken)
  marksBox.addEventListener('click', (e) => {
    const b = e.target.closest('.nm__mk');
    let n = b ? nodes[+b.dataset.n] : null;
    if (!n || !live || phase === 'wait' || performance.now() - dragEnd < 120) return;
    const touch = e.detail > 0 && lastPtr !== 'mouse';
    const mouse = e.detail > 0 && !touch;
    if (mouse && snap && snap !== n && snap.on && snap.match) n = snap; // Maus: es gilt der Punkt im Fadenkreuz – nach dem Zentrieren liegt unter dem Zeiger oft ein anderer
    if (touch && crowded(n) && pinned !== n) { flash(n); follow(n, { quick: true, step: 9 }); return; } // dichte Gruppe: erst zoomen
    clearTimeout(dwellT);
    if (pinned === n) { unpin(); return; }
    if (touch) flash(n, 600);
    pin(n, { reveal: touch });
    if (follow(n, { quick: true, track: mouse }) && mouse) { snap = n; lock = { n, x: lastPX, y: lastPY }; placeRet(); }
  });
  card.addEventListener('click', (e) => { if (e.target.closest('[data-nm-close]')) { const n = pinned; unpin(); n?.el?.focus({ preventScroll: true }); } });
  card.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pinned) { const n = pinned; unpin(); n.el?.focus({ preventScroll: true }); } });
  const nodeOf = (t) => { const b = t?.closest?.('.nm__mk'); return b && marksBox.contains(b) ? nodes[+b.dataset.n] : null; };
  function neighbor(n, key) {
    let best = null, bs = Infinity;
    for (const m of nodes) {
      if (m === n || !m.on || !m.match || !m.el) continue;
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
      if (m.out) flyTo(m.x, m.y, cam.s); else follow(m, { quick: true });
    } else if (e.key === 'Home') { e.preventDefault(); setRoving(hq); hq.el?.focus({ preventScroll: true }); }
    else if (e.key === 'Escape') { if (pinned) { e.preventDefault(); unpin(); } }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); userView(); setRegion(''); zoomAt(n.X, n.Y, 1.8); }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); userView(); setRegion(''); zoomAt(vw / 2, vh / 2, 1 / 1.8); }
  });
  marksBox.addEventListener('focusin', (e) => {
    const n = nodeOf(e.target);
    if (!n) return;
    setRoving(n);
    // nur Tastatur: Fokus durch Tippen oder Klicken öffnet keine Vorschau
    if (!inside && performance.now() - ptrT > 600) { clearTimeout(flashT); snap = n; placeRet(); requestAnimationFrame(() => { if (snap === n) ret?.classList.add('is-lock'); }); hover(n); }
  });
  marksBox.addEventListener('focusout', (e) => {
    if (nodeOf(e.relatedTarget) || inside) return;
    snap = null; ret?.classList.remove('is-lock'); placeRet();
    if (!pinned) hover(null);
  });

  // ---------- Start ----------
  let lastSize = '';
  const onResize = () => {
    if (!el.isConnected) return;
    const r = frame.getBoundingClientRect();
    const key = `${Math.round(r.width)}x${Math.round(r.height)}`;
    if (key === lastSize) return;
    lastSize = key;
    resize();
  };
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(frame);
  else addEventListener('resize', onResize);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      visible = e.isIntersecting;
      el.classList.toggle('is-idle', !visible);
      if (visible && live && phase === 'wait' && e.intersectionRatio >= 0.25) start();
      if (visible && phase === 'done') loop();
      if (!visible && phase === 'done') clearFx();
    }
  }, { threshold: [0, 0.25] }) : null;
  const onVis = () => { if (!el.isConnected) { document.removeEventListener('visibilitychange', onVis); return; } if (!document.hidden && phase === 'done') loop(); };
  document.addEventListener('visibilitychange', onVis);
  const boot = async () => {
    try { await loadRaster(); } catch (e) { return; } // ohne Landmaske (offline, Seitenwechsel während des Ladens) bleibt das Punktbild
    if (!el.isConnected) return;
    live = true;
    el.classList.add('is-live');
    if (!reduced()) img.classList.add('is-gone');
    if (bar) bar.hidden = false;
    if (zoomBox) zoomBox.hidden = false;
    el.querySelector('[data-nm-legend]')?.setAttribute('hidden', '');
    onResize();
    level(1); level(0);
    if (reduced() || !io) { visible = true; finish(); return; }
    io.observe(stage);
  };
  // Landmaske laden, sobald die Seite ruht (auf der Startseite liegt die Karte gleich unter der Bühne)
  idle(boot, mode === 'home' ? 1200 : 2500);
}
