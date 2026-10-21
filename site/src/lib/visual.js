// Schemazeichnungen für Produkte ohne Foto (isomorph: Build und Browser).
// Isometrische Linienzeichnung mit Flächentönen: Gießharzkörper, Fenster, Primärleiter (rot),
// Klemmen, Abdeckungen, Tragschiene. Proportionen und Bemaßung aus den Datenblatt-Angaben (p.dm).
import { esc } from './util.js';

const C = Math.cos(Math.PI / 6);
const S = 0.5;
const RX = Math.sqrt(1.5);
const RY = Math.sqrt(0.5);
const ROT = { x: -60, y: 60, z: 0 };
const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const iso = (p) => [(p[0] - p[1]) * C, (p[0] + p[1]) * S - p[2]];
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const onPlane = (n, o, u, v) => (n === 'x' ? [o, u, v] : n === 'y' ? [u, o, v] : [u, v, o]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const LIGHT = (() => { const l = [-0.35, 0.55, 0.78]; const m = Math.hypot(...l); return l.map((x) => x / m); })();

// ---------- Szene ----------
class Scene {
  constructor() { this.out = []; this.bb = [Infinity, Infinity, -Infinity, -Infinity]; }
  ext(x, y) { const b = this.bb; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y; }
  P(p3) { const s = iso(p3); this.ext(s[0], s[1]); return s; }
  // Pfad aus Befehlen [['M',x,y],['L',x,y],['A',rx,ry,rot,la,sw,x,y],['Z']]
  path(cmds, cls, extra = '') { this.out.push({ t: 'p', c: cmds, cls, extra }); }
  ell(cx, cy, rx, ry, rot, cls) { this.out.push({ t: 'e', v: [cx, cy, rx, ry, rot], cls }); const hw = Math.hypot(rx * Math.cos(rot * Math.PI / 180), ry * Math.sin(rot * Math.PI / 180)); const hh = Math.hypot(rx * Math.sin(rot * Math.PI / 180), ry * Math.cos(rot * Math.PI / 180)); this.ext(cx - hw, cy - hh); this.ext(cx + hw, cy + hh); }
  line(a, b, cls) { this.out.push({ t: 'l', v: [a[0], a[1], b[0], b[1]], cls }); }
  poly(pts, cls, extra = '') { this.out.push({ t: 'pl', v: pts, cls, extra }); for (const p of pts) this.ext(p[0], p[1]); }
  text(x, y, s, rot, cls, anchor = 'middle') { this.out.push({ t: 't', v: [x, y, rot], s, cls, anchor }); }
}

// Kreis in einer Ebene: Bildschirmpunkt zum Winkel t
const circPt = (sc, n, o, cu, cv, r, t) => sc.P(onPlane(n, o, cu + r * Math.cos(t), cv + r * Math.sin(t)));
// Bogenbefehl (Flags aus Mittelpunkt bestimmt)
function arcCmd(n, r, A, B, M, large = 0) {
  const cross = (B[0] - A[0]) * (M[1] - A[1]) - (B[1] - A[1]) * (M[0] - A[0]);
  return ['A', RX * r, RY * r, ROT[n], large, cross > 0 ? 0 : 1, B[0], B[1]];
}
function arcSeg(sc, n, o, cu, cv, r, t0, t1) {
  const A = circPt(sc, n, o, cu, cv, r, t0);
  const B = circPt(sc, n, o, cu, cv, r, t1);
  const M = circPt(sc, n, o, cu, cv, r, (t0 + t1) / 2);
  for (let k = 1; k < 4; k++) circPt(sc, n, o, cu, cv, r, t0 + ((t1 - t0) * k) / 4);
  return arcCmd(n, r, A, B, M, Math.abs(t1 - t0) > Math.PI + 1e-6 ? 1 : 0);
}
function circCmds(sc, n, o, cu, cv, r) {
  const A = circPt(sc, n, o, cu, cv, r, 0);
  return [['M', A[0], A[1]], arcSeg(sc, n, o, cu, cv, r, 0, Math.PI), arcSeg(sc, n, o, cu, cv, r, Math.PI, 2 * Math.PI), ['Z']];
}
function polyCmds(sc, pts3) {
  return [...pts3.map((p, i) => { const s = sc.P(p); return [i ? 'L' : 'M', s[0], s[1]]; }), ['Z']];
}
const rectCmds = (sc, n, o, u0, v0, u1, v1) => polyCmds(sc, [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => onPlane(n, o, u, v)));
function rrectCmds(sc, n, o, u0, v0, u1, v1, rr) {
  rr = Math.min(rr, (u1 - u0) / 2, (v1 - v0) / 2);
  if (rr <= 0.01) return rectCmds(sc, n, o, u0, v0, u1, v1);
  const P = (u, v) => sc.P(onPlane(n, o, u, v));
  const c = [];
  const s0 = P(u0 + rr, v0); c.push(['M', s0[0], s0[1]]);
  const L = (u, v) => { const s = P(u, v); c.push(['L', s[0], s[1]]); };
  const Ar = (cu, cv, t0, t1) => c.push(arcSeg(sc, n, o, cu, cv, rr, t0, t1));
  L(u1 - rr, v0); Ar(u1 - rr, v0 + rr, -Math.PI / 2, 0);
  L(u1, v1 - rr); Ar(u1 - rr, v1 - rr, 0, Math.PI / 2);
  L(u0 + rr, v1); Ar(u0 + rr, v1 - rr, Math.PI / 2, Math.PI);
  L(u0, v0 + rr); Ar(u0 + rr, v0 + rr, Math.PI, 1.5 * Math.PI);
  c.push(['Z']);
  return c;
}
function holeCmds(sc, n, o, h) {
  if (h.c) return circCmds(sc, n, o, h.c[0], h.c[1], h.c[2]);
  if (h.rr) return rrectCmds(sc, n, o, ...h.rr);
  return rectCmds(sc, n, o, ...h.r);
}

// ---------- Grundkörper ----------
// Quader ab Ecke o=[x,y,z], Maße [w (x), d (y), h (z)]; Löcher je sichtbarer Fläche (lokale Koordinaten)
function box(sc, o, [w, d, h], m, holes = {}, faces = 'tfr') {
  const [x, y, z] = o;
  const fr = (cmds, list, n, off, cls) => {
    const all = [...cmds];
    for (const hl of list || []) all.push(...holeCmds(sc, n, off, hl));
    sc.path(all, cls, list?.length ? ' fill-rule="evenodd"' : '');
  };
  if (faces.includes('t')) fr(rectCmds(sc, 'z', z + h, x, y, x + w, y + d), holes.t, 'z', z + h, `${m}-t`);
  if (faces.includes('f')) fr(rectCmds(sc, 'y', y + d, x, z, x + w, z + h), holes.f, 'y', y + d, `${m}-f`);
  if (faces.includes('r')) fr(rectCmds(sc, 'x', x + w, y, z, y + d, z + h), holes.r, 'x', x + w, `${m}-r`);
}
// Innenwand eines Durchgangs entlang y (zwischen y0 und y1), vor dem Körper zeichnen
function tunnel(sc, y0, y1, h, m) {
  if (h.c) {
    const [cu, cv, r] = h.c;
    sc.path([...circCmds(sc, 'y', y1, cu, cv, r), ...circCmds(sc, 'y', y0, cu, cv, r)], `${m}-w`, ' fill-rule="evenodd"');
    return;
  }
  const [u0, v0, u1, v1] = h.rr ? h.rr : h.r;
  sc.path(polyCmds(sc, [[u0, y0, v0], [u1, y0, v0], [u1, y1, v0], [u0, y1, v0]]), `${m}-wt`);
  sc.path(polyCmds(sc, [[u0, y0, v0], [u0, y1, v0], [u0, y1, v1], [u0, y0, v1]]), `${m}-wr`);
}
// Zylinder entlang +Achse ab Mittelpunkt c0 (Länge len); Deckel am Ende (sichtbar)
function cyl(sc, axis, c0, r, len, m, { cap = true, hl = true, capCls = null } = {}) {
  const a = AX[axis];
  const c1 = add(c0, a, len);
  const E0 = iso(c0), E1 = iso(c1);
  const rx = RX * r, ry = RY * r, rd = ROT[axis], ro = (rd * Math.PI) / 180;
  const dir = iso(a); const dir0 = iso([0, 0, 0]);
  const ad = [dir[0] - dir0[0], dir[1] - dir0[1]];
  const ax = ad[0] * Math.cos(-ro) - ad[1] * Math.sin(-ro);
  const ay = ad[0] * Math.sin(-ro) + ad[1] * Math.cos(-ro);
  const ts = Math.atan2(-ry * ax, rx * ay);
  const pt = (E, t) => { const lx = rx * Math.cos(t), ly = ry * Math.sin(t); return [E[0] + lx * Math.cos(ro) - ly * Math.sin(ro), E[1] + lx * Math.sin(ro) + ly * Math.cos(ro)]; };
  const dotA = (E, t) => { const p = pt(E, t); return (p[0] - E[0]) * ad[0] + (p[1] - E[1]) * ad[1]; };
  const far1 = dotA(E1, ts + Math.PI / 2) > 0 ? ts + Math.PI / 2 : ts - Math.PI / 2;
  const far0 = far1 + Math.PI;
  const A0 = pt(E0, ts), A1 = pt(E1, ts), B0 = pt(E0, ts + Math.PI), B1 = pt(E1, ts + Math.PI);
  const flag = (A, B, M) => ((B[0] - A[0]) * (M[1] - A[1]) - (B[1] - A[1]) * (M[0] - A[0]) > 0 ? 0 : 1);
  if (len > 0.01) {
    sc.path([['M', A0[0], A0[1]], ['L', A1[0], A1[1]], ['A', rx, ry, rd, 0, flag(A1, B1, pt(E1, far1)), B1[0], B1[1]], ['L', B0[0], B0[1]], ['A', rx, ry, rd, 0, flag(B0, A0, pt(E0, far0)), A0[0], A0[1]], ['Z']], `${m}-s`);
    for (const t of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) { const p = pt(E0, t); sc.ext(p[0], p[1]); }
    if (hl) {
      // Glanzlinie: Mantellinie, die dem Licht zugewandt ist (nur wenn sie zum Betrachter zeigt)
      const lp = add(LIGHT, a, -(LIGHT[0] * a[0] + LIGHT[1] * a[1] + LIGHT[2] * a[2]));
      const lm = Math.hypot(...lp);
      if (lm > 0.2 && lp[0] + lp[1] + lp[2] > 0.05) {
        const off = lp.map((v) => (v / lm) * r * 0.62);
        const h0 = iso(add(add(c0, off), a, len * 0.04)), h1 = iso(add(add(c0, off), a, len * 0.96));
        sc.line(h0, h1, 'pv-hl');
      }
    }
  }
  if (cap) sc.ell(E1[0], E1[1], rx, ry, rd, capCls || `${m}-c`);
  return { E0, E1 };
}
// Sechskantmutter (vereinfacht als kurzer Zylinder mit Kante)
const nut = (sc, axis, c0, r, len) => cyl(sc, axis, c0, r, len, 'm', { hl: false });
// Schraubenkopf von oben (z) mit Schlitz
function screw(sc, c, r, cls = 'm') {
  cyl(sc, 'z', c, r, r * 0.55, cls, { hl: false });
  const top = add(c, [0, 0, r * 0.55]);
  sc.line(iso(add(top, [-r * 0.62, r * 0.62, 0])), iso(add(top, [r * 0.62, -r * 0.62, 0])), 'pv-slot');
}
// Bodenschatten
function shadow(sc, x0, y0, x1, y1, z = 0, k = 1) {
  const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => iso([x, y, z]));
  const dx = 6 * k, dy = 4 * k;
  sc.out.unshift({ t: 'pl', v: pts.map(([x, y], i) => [x + (i === 1 || i === 2 ? dx : 0), y + (i >= 2 ? dy : 0)]), cls: 'pv-sh', extra: '' });
}
// biegsame Leitung (Röhrenoptik über zwei Striche) aus 3D-Stützpunkten (Bézier-Kette)
function rope(sc, pts3, wid, cls) {
  const p = pts3.map((q) => sc.P(q));
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i + 2 < p.length + 1; i += 3) {
    const [a, b, c] = [p[i], p[i + 1] || p[i], p[i + 2] || p[i + 1] || p[i]];
    d += `C${a[0]} ${a[1]} ${b[0]} ${b[1]} ${c[0]} ${c[1]}`;
  }
  sc.out.push({ t: 'r', d: p, w: wid, cls });
}

// Tragschiene TH35 (Hutprofil) unter dem Gerät
function dinRail(sc, W, T) {
  const x0 = -W * 0.55 - 20, x1 = W * 1.55 + 20, y0 = T / 2 - 17.5;
  box(sc, [x0, y0, -7.5], [x1 - x0, 35, 7.5], 'm');
  for (const y of [y0 + 5, y0 + 30]) sc.line(iso([x0, y, 0]), iso([x1, y, 0]), 'pv-ln');
  for (const x of [x0 + 12, x1 - 22]) { const c = iso([x, T / 2, 0]); sc.ell(c[0], c[1], RX * 3.2, RY * 3.2, 0, 'pv-hole'); }
}

// ---------- Familien ----------
function famOf(p) {
  const n = p.dk?.n || '';
  const mv = p.area === 'mittelspannung' || p.area === 'hochspannung';
  if (/^GB/.test(p.code || '') && mv) return 'metalclad';
  if (n === 'vt.metalclad') return 'metalclad';
  if (n === 'ct.splitcore') return 'split';
  if (['ct.window', 'ct.bushing.lv', 'ct.frame', 'ct.threading', 'ct.tubebar', 'ct.busbar', 'cs.tubebar'].includes(n)) return 'window';
  if (['ct.generator', 'ct.highcurrent'].includes(n)) return 'mvwindow';
  if (['ct.bushing', 'ct.bushingbar'].includes(n) || p.kind === 'bushing') return 'bushing';
  if (n === 'ct.cascade') return 'cascade';
  if (n === 'ct.support' || n === 'combined' || (mv && p.kind === 'ct')) return 'support';
  if (mv && (p.kind === 'vt' || n.startsWith('vt.'))) return 'mvvt';
  return 'lvbox';
}

// LV-Fenster-/Aufsteckwandler, Frame, Rohrstab, Schienenwandler
function drawWindow(sc, p, d, A) {
  const n = p.dk?.n || '';
  const inner = d.inner?.[0];
  let [W, H, T] = d.box || [];
  const known = { w: !!W, h: !!H, t: !!T };
  if (!W && !H && inner) { W = inner * 1.75 + 34; H = W * 1.18; T = clamp(W * 0.36, 30, 90); }
  if (n === 'ct.bushing.lv' && !inner && !d.box) { W = 230; H = 120; T = 70; }
  W = W || (H ? H * 0.8 : 100); H = H || W * 1.24; T = T || clamp(W * 0.5, 30, 90);
  // Fenster
  let hole;
  let cx = W / 2, cz = H * 0.46;
  if (d.win || (n === 'ct.bushing.lv' && !inner) || (n === 'ct.frame' && !inner)) {
    let [ww, wh] = d.win || [W * 0.62, H * 0.3];
    if (W > H && wh > ww) [ww, wh] = [wh, ww];
    if (ww > W * 0.86) { ww = W * 0.72; known.w = false; }
    if (wh > H * 0.7) wh = H * 0.5;
    cz = clamp(cz, wh / 2 + H * 0.12, H - wh / 2 - H * 0.16);
    hole = { rr: [cx - ww / 2, cz - wh / 2, cx + ww / 2, cz + wh / 2, Math.min(ww, wh) * 0.16], ww, wh };
    A.win = d.win ? [ww, wh] : null;
  } else {
    let r = (inner || W * 0.42) / 2;
    if (!inner && d.bar) { const nb = clamp(d.nbar || 1, 1, 4); r = Math.hypot((2 * nb - 1) * d.bar[1], d.bar[0]) / 2 / 0.85; }
    if (r > Math.min(W, H) * 0.4) { r = Math.min(W, H) * 0.36; if (inner) A.innerOff = true; }
    cz = clamp(cz, r + H * 0.1, H - r - H * 0.18);
    hole = { c: [cx, cz, r] };
  }
  const o = [0, 0, 0];
  if (d.din) dinRail(sc, W, T);
  shadow(sc, 0, 0, W, T, d.din ? -7.5 : 0, W / 100);
  // Primärleiter
  const lfRod = clamp(T * 0.75 + W * 0.18, 18, 220);
  const lfBar = clamp(T * 0.5 + W * 0.08, 14, 130);
  const cond = [];
  if (hole.c) {
    const r = hole.c[2];
    if (n === 'ct.tubebar' || n === 'cs.tubebar') {
      const rb = n === 'cs.tubebar' ? r * 0.86 : d.bolt ? Math.min(r * 0.92, d.bolt / 2) : r * 0.92;
      cond.push({ k: 'rod', r: rb, nut: n === 'ct.tubebar', tube: n === 'cs.tubebar' });
    } else if (d.bar) {
      cond.push({ k: 'bars', n: clamp(d.nbar || 1, 1, 4), bw: d.bar[0], bt: d.bar[1], vert: true, fitR: r });
    } else if (n === 'ct.threading') {
      cond.push({ k: 'loop', r: clamp(r * 0.32, 3, 14) });
    } else if (r >= 24) {
      // großer Durchgang: isoliertes Kabel (Mantel dunkel, Kupferleiter rot)
      cond.push({ k: 'rod', r: clamp(r * 0.6, 8, W * 0.2), cable: true });
    } else {
      cond.push({ k: 'rod', r: clamp((d.cable ? Math.min(d.cable / 2, r * 0.8) : r * 0.72), 2, r * 0.82) });
    }
  } else {
    const { ww, wh } = hole;
    const bw = d.bar?.[0] || ww * 0.66, bt = d.bar?.[1] || Math.max(5, wh * 0.24);
    cond.push({ k: 'bars', n: clamp(d.nbar || (ww / wh > 2.6 ? 1 : 2), 1, 4), bw, bt, vert: wh > ww, box: [ww, wh] });
  }
  // Leiter-Geometrie
  const conds = [];
  for (const c of cond) {
    const lf = c.k === 'bars' ? lfBar : lfRod, lb = lf * 0.8;
    if (c.k === 'rod' && c.cable) conds.push({ back: () => cyl(sc, 'y', [cx, -lb, cz], c.r, lb + T, 'k', { cap: false }), front: () => { cyl(sc, 'y', [cx, T, cz], c.r, lf, 'k'); const E = iso([cx, T + lf, cz]); sc.ell(E[0], E[1], RX * c.r * 0.62, RY * c.r * 0.62, 60, 'pv-ins'); sc.ell(E[0], E[1], RX * c.r * 0.46, RY * c.r * 0.46, 60, 'e-c'); } });
    else if (c.k === 'rod') conds.push({ back: () => cyl(sc, 'y', [cx, -lb, cz], c.r, lb + T, 'e', { cap: false }), front: () => { const e = cyl(sc, 'y', [cx, T, cz], c.r, lf, 'e', { capCls: c.tube ? 'e-c' : null }); if (c.tube) { const E = iso([cx, T + lf, cz]); sc.ell(E[0], E[1], RX * c.r * 0.62, RY * c.r * 0.62, 60, 'pv-hole'); } if (c.nut) { nut(sc, 'y', [cx, T, cz], c.r * 1.75, Math.max(3, c.r * 0.9)); cyl(sc, 'y', [cx, T + c.r * 0.9, cz], c.r, lf * 0.5, 'e'); } return e; } });
    if (c.k === 'loop') {
      const rr = c.r;
      conds.push({ back: () => cyl(sc, 'y', [cx, -lb, cz], rr, lb + T, 'e', { cap: false }),
        front: () => { const L = lf; rope(sc, [[cx, T - 1, cz], [cx, T + L * 0.55, cz], [cx, T + L * 0.95, cz - L * 0.12], [cx, T + L * 1.05, cz - L * 0.62]], rr * 2, 'e'); } });
    }
    if (c.k === 'bars') {
      const list = [];
      let { bw, bt } = c;
      const nb = c.n;
      if (c.box) {
        const [ww, wh] = c.box;
        if (c.vert) { const tot = nb * bt + (nb - 1) * bt; const s = Math.min(1, (ww * 0.8) / tot, (wh * 0.8) / bw); bw *= s; bt *= s; for (let i = 0; i < nb; i++) list.push({ x: cx - (nb * bt + (nb - 1) * bt) / 2 + i * 2 * bt, z: cz - bw / 2, w: bt, h: bw }); }
        else { const tot = nb * bt + (nb - 1) * bt; const s = Math.min(1, (wh * 0.8) / tot, (ww * 0.8) / bw); bw *= s; bt *= s; for (let i = 0; i < nb; i++) list.push({ x: cx - bw / 2, z: cz - tot * s / 2 + i * 2 * bt, w: bw, h: bt }); }
      } else {
        const R = c.fitR * 0.9;
        const tot = nb * bt + (nb - 1) * bt;
        const s = Math.min(1, R * 2 / Math.hypot(tot, bw));
        bw *= s; bt *= s;
        const t2 = nb * bt + (nb - 1) * bt;
        for (let i = 0; i < nb; i++) list.push({ x: cx - t2 / 2 + i * 2 * bt, z: cz - bw / 2, w: bt, h: bw });
      }
      list.sort((a, b) => a.x + a.z - (b.x + b.z));
      conds.push({ back: () => { for (const b of list) box(sc, [b.x, -lb, b.z], [b.w, lb + T, b.h], 'e', {}, 'tr'); },
        front: () => { for (const b of list) { const holes = {}; const hr = Math.min(b.w, b.h) * 0.22; if (b.w < b.h) holes.r = [{ c: [T + lf * 0.62, b.z + b.h / 2, Math.min(hr * 1.3, b.h * 0.18)] }]; else holes.t = [{ c: [b.x + b.w / 2, T + lf * 0.62, Math.min(hr * 1.3, b.w * 0.16)] }]; box(sc, [b.x, T, b.z], [b.w, lf, b.h], 'e', holes); } } });
    }
  }
  tunnel(sc, 0, T, hole, 'r');
  for (const c of conds) c.back();
  box(sc, o, [W, T, H], 'r', { f: [hole] });
  sc.line(iso([W * 0.04, T, H * 0.985]), iso([W * 0.96, T, H * 0.985]), 'pv-edge');
  for (const c of conds) c.front();
  // Sekundärklemmen oben (mit Abdeckung)
  const tw = clamp(W * 0.42, 24, 90), th = clamp(H * 0.05, 4, 12), td = clamp(T * 0.62, 16, 60);
  const tx = W / 2 - tw / 2, ty = (T - td) / 2;
  if (d.leads || (n === 'ct.bushing.lv' && !inner && !d.box)) {
    // Anschlussleitungen (Gewebeschlauch) seitlich
    const y = T * 0.5;
    const lw = clamp(W * 0.032, 4, 12);
    for (let i = 0; i < 3; i++) rope(sc, [[W - 2, y - lw * 1.5 + i * lw * 1.5, H * 0.74], [W + W * 0.2, y - lw * 1.5 + i * lw * 1.5, H * 0.74], [W + W * 0.22, y + i * lw * 1.5, H * 0.24], [W + W * 0.42, y + lw + i * lw * 1.5, H * 0.1]], lw, 'k');
    A.terms = [];
  } else {
    box(sc, [tx, ty, H], [tw, td, th], 'k');
    const sr = clamp(tw * 0.1, 2.4, 6.5);
    const s1 = [tx + tw * 0.27, ty + td / 2, H + th], s2 = [tx + tw * 0.73, ty + td / 2, H + th];
    screw(sc, s1, sr); screw(sc, s2, sr);
    if (d.cover) box(sc, [tx - 2, ty - 2, H], [tw + 4, td + 4, th * 2.3], 'g');
    A.terms = [[add(s1, [0, 0, th * (d.cover ? 1.5 : 0.8)]), 'S1'], [add(s2, [0, 0, th * (d.cover ? 1.5 : 0.8)]), 'S2']];
  }
  A.box = { o, w: W, d: T, h: H, known };
  A.hole = hole.c ? { c: [hole.c[0], T, hole.c[1]], r: hole.c[2] } : { rect: [hole.rr[0], hole.rr[1], hole.rr[2], hole.rr[3]], y: T };
}

// Kabelumbau-Stromwandler (zweiteilig, Trennfuge sichtbar), Kabel mit drei Leitern
function drawSplit(sc, p, d, A) {
  const inner = d.inner?.[0];
  let [W, H, T] = d.box || [];
  const known = { w: !!W, h: !!H, t: !!T };
  if (!H && inner) H = inner * 1.6 + 60;
  H = H || 190; W = W || H * 0.9; T = T || clamp(W * 0.45, 40, 140);
  let r = (inner || W * 0.42) / 2;
  if (r > Math.min(W, H) * 0.42) { r = Math.min(W, H) * 0.38; A.innerOff = true; }
  const cx = W / 2, cz = clamp(H * 0.44, r + H * 0.1, H - r - H * 0.14);
  const g = clamp(H * 0.028, 2.5, 9);
  shadow(sc, 0, 0, W, T, 0, W / 100);
  const rc = clamp((d.cable ? Math.min(d.cable / 2, r * 0.78) : r * 0.74), 3, r * 0.8);
  const lf = clamp(T * 0.55 + W * 0.12, 26, 200), lb = lf * 0.75;
  tunnel(sc, 0, T, { c: [cx, cz, r] }, 'r');
  cyl(sc, 'y', [cx, -lb, cz], rc, lb + T, 'k', { cap: false });
  // Unterteil
  const P = (u, v) => onPlane('y', T, u, v);
  const lower = (() => { const c = []; const pts = [[0, 0], [W, 0], [W, cz], [cx + r, cz]]; pts.forEach(([u, v], i) => { const s = sc.P(P(u, v)); c.push([i ? 'L' : 'M', s[0], s[1]]); }); c.push(arcSeg(sc, 'y', T, cx, cz, r, 0, -Math.PI)); const s = sc.P(P(0, cz)); c.push(['L', s[0], s[1]], ['Z']); return c; })();
  sc.path(rectCmds(sc, 'x', W, 0, 0, T, cz), 'r-r');
  sc.path(lower, 'r-f');
  // Trennfuge: Oberseite des Unterteils (mit Kerbe), sichtbar im Spalt
  // Oberteil
  const z0 = cz + g, z1 = H + g;
  const upper = (() => { const c = []; const pts = [[0, z0], [cx - r, z0]]; pts.forEach(([u, v], i) => { const s = sc.P(P(u, v)); c.push([i ? 'L' : 'M', s[0], s[1]]); }); c.push(arcSeg(sc, 'y', T, cx, z0, r, Math.PI, 0)); for (const [u, v] of [[W, z0], [W, z1], [0, z1]]) { const s = sc.P(P(u, v)); c.push(['L', s[0], s[1]]); } c.push(['Z']); return c; })();
  sc.path(rectCmds(sc, 'x', W, 0, z0, T, z1), 'r-r');
  sc.path(upper, 'r-f');
  sc.path(rectCmds(sc, 'z', z1, 0, 0, W, T), 'r-t');
  sc.line(iso([W * 0.04, T, z1 - H * 0.015]), iso([W * 0.96, T, z1 - H * 0.015]), 'pv-edge');
  // Spannschrauben an der Trennfuge (vorn)
  const sr = clamp(W * 0.035, 3, 10);
  for (const u of [W * 0.12, W * 0.88]) { const c = iso([u, T, cz + g / 2]); sc.ell(c[0], c[1], RX * sr, RY * sr, 60, 'm-c'); sc.ell(c[0], c[1], RX * sr * 0.45, RY * sr * 0.45, 60, 'pv-hole'); }
  // Kabel vorn mit drei Leitern
  cyl(sc, 'y', [cx, T, cz], rc, lf, 'k', { capCls: 'k-c' });
  const capY = T + lf;
  for (let i = 0; i < 3; i++) {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
    const cu = cx + Math.cos(a) * rc * 0.44, cv = cz + Math.sin(a) * rc * 0.44;
    const E = sc.P([cu, capY, cv]);
    sc.ell(E[0], E[1], RX * rc * 0.36, RY * rc * 0.36, 60, 'e-c');
    sc.ell(E[0], E[1], RX * rc * 0.2, RY * rc * 0.2, 60, 'pv-core');
  }
  // Klemmen oben
  const tw = clamp(W * 0.3, 26, 80), td = clamp(T * 0.55, 16, 60), th = clamp(H * 0.045, 4, 12);
  const tx = W / 2 - tw / 2, ty = (T - td) / 2;
  box(sc, [tx, ty, z1], [tw, td, th], 'k');
  const s1 = [tx + tw * 0.28, ty + td / 2, z1 + th], s2 = [tx + tw * 0.72, ty + td / 2, z1 + th];
  const ssr = clamp(tw * 0.1, 2.4, 6.5);
  screw(sc, s1, ssr); screw(sc, s2, ssr);
  if (d.cover) box(sc, [tx - 2, ty - 2, z1], [tw + 4, td + 4, th * 2.3], 'g');
  A.terms = [[add(s1, [0, 0, th * 1.5]), 'S1'], [add(s2, [0, 0, th * 1.5]), 'S2']];
  A.box = { o: [0, 0, 0], w: W, d: T, h: H, known, hz: H + g };
  A.hole = { c: [cx, T, cz], r };
}

// Niederspannungs-Gehäuse mit Klemmen: Summen-, Zwischen-, Labor-, Wickelwandler, NS-Spannungswandler, Dämpfung
function drawLvBox(sc, p, d, A) {
  const n = p.dk?.n || '';
  const kind = p.kind;
  const DEF = { 'ct.summation': [100, 126, 88], 'ct.interposing': [60, 81, 30], 'ct.laboratory': [180, 120, 140], 'ct.wound': [60, 117, 52], 'vt.singlepole': [100, 126, 70], 'vt.twopole': [100, 126, 73], 'vt.threephase': [200, 118, 70], damping: [155, 214, 160], 'damping.choke': [250, 318, 135] };
  let [W, H, T] = d.box || [];
  const known = { w: !!W, h: !!H, t: !!T };
  const def = DEF[n] || (kind === 'electronic-vt' || kind === 'electronic-ct' ? [45, 100, 115] : [90, 110, 70]);
  W = W || def[0]; H = H || def[1]; T = T || def[2];
  const metal = n === 'damping' && p.install?.includes('indoor');
  const m = metal ? 'm' : kind.startsWith('electronic') ? 'k' : 'r';
  if (d.din) dinRail(sc, W, T);
  if (n === 'damping.choke') box(sc, [-10, -10, -8], [W + 20, T + 20, 8], 'm');
  shadow(sc, 0, 0, W, T, d.din ? -7.5 : 0, W / 100);
  box(sc, [0, 0, 0], [W, T, H], m);
  sc.line(iso([W * 0.04, T, H * 0.985]), iso([W * 0.96, T, H * 0.985]), 'pv-edge');
  const terms = [];
  // Front-Details
  if (n === 'damping') {
    for (let i = 0; i < 6; i++) { const z = H * (0.25 + i * 0.09); sc.path(rectCmds(sc, 'y', T, W * 0.2, z, W * 0.8, z + H * 0.035), 'pv-slotf'); }
  } else if (n === 'damping.choke') {
    const bx = W * 0.3, bw = W * 0.4, bz = H * 0.18, bh = H * 0.26;
    box(sc, [bx, T, bz], [bw, 18, bh], 'm');
    cyl(sc, 'x', [bx + bw, T + 9, bz + bh * 0.5], 5, 10, 'm', { hl: false });
  } else if (kind.startsWith('electronic')) {
    const E1 = iso([W * 0.3, T, H * 0.78]), E2 = iso([W * 0.62, T, H * 0.78]);
    sc.ell(E1[0], E1[1], 3.2, 2, 60, 'pv-led-g'); sc.ell(E2[0], E2[1], 3.2, 2, 60, 'pv-led-r');
    sc.path(rectCmds(sc, 'y', T, W * 0.18, H * 0.3, W * 0.82, H * 0.62), 'pv-label');
  } else if (n === 'vt.threephase') {
    for (const u of [W / 3, (2 * W) / 3]) sc.line(iso([u, T, 0]), iso([u, T, H]), 'pv-ln');
  }
  // Klemmen oben
  const sr = clamp(Math.min(W, T) * 0.07, 2.6, 7);
  const row = (count, y, cls, labels, zTop, x0 = W * 0.14, x1 = W * 0.86) => {
    const r = count > 1 ? Math.min(sr, ((x1 - x0) / (count - 1)) * 0.36) : sr;
    for (let i = 0; i < count; i++) {
      const x = count === 1 ? W / 2 : x0 + ((x1 - x0) * i) / (count - 1);
      const c = [x, y, zTop];
      screw(sc, c, r, cls);
      if (labels?.[i]) terms.push([add(c, [0, 0, sr * 1.6]), labels[i]]);
    }
  };
  const top = H;
  const strip = (y0, y1) => box(sc, [W * 0.06, y0, top], [W * 0.88, y1 - y0, 3.5], 'k');
  if (n === 'ct.summation') {
    const k = clamp(d.circ || 3, 2, 4);
    strip(T * 0.12, T * 0.44); strip(T * 0.6, T * 0.9);
    row(2 * k, T * 0.28, 'e', Array.from({ length: 2 * k }, (_, i) => (i === 0 ? '1' : i === 2 * k - 2 ? String(d.circ && d.circ > k ? d.circ : k) : '')), top + 3.5);
    row(2, T * 0.75, 'm', ['S1', 'S2'], top + 3.5, W * 0.3, W * 0.7);
  } else if (n === 'ct.laboratory') {
    strip(T * 0.12, T * 0.46);
    for (let i = 0; i < 5; i++) { const x = W * (0.16 + i * 0.17); cyl(sc, 'z', [x, T * 0.29, top + 3.5], sr * 1.25, sr * 2.2, 'e', { hl: false }); }
    strip(T * 0.6, T * 0.88); row(2, T * 0.74, 'm', ['S1', 'S2'], top + 3.5, W * 0.32, W * 0.68);
    terms.push([[W * 0.16, T * 0.29, top + sr * 4], 'P1'], [[W * 0.84, T * 0.29, top + sr * 4], 'Pn']);
  } else if (n === 'ct.wound') {
    for (const [x, l] of [[W * 0.28, 'P1'], [W * 0.72, 'P2']]) { cyl(sc, 'z', [x, T * 0.3, top], sr * 1.5, sr * 3.2, 'e'); nut(sc, 'z', [x, T * 0.3, top + sr * 1.2], sr * 2.1, sr * 0.9); terms.push([[x, T * 0.3, top + sr * 4.4], l]); }
    strip(T * 0.58, T * 0.9); row(2, T * 0.74, 'm', ['S1', 'S2'], top + 3.5, W * 0.3, W * 0.7);
  } else if (n === 'vt.threephase') {
    strip(T * 0.12, T * 0.44); strip(T * 0.6, T * 0.9);
    row(3, T * 0.28, 'e', ['A', 'B', 'C'], top + 3.5, W * 0.17, W * 0.83);
    row(3, T * 0.75, 'm', ['a', 'b', 'c'], top + 3.5, W * 0.17, W * 0.83);
  } else if (n.startsWith('vt.')) {
    strip(T * 0.12, T * 0.44); strip(T * 0.6, T * 0.9);
    row(2, T * 0.28, 'e', n === 'vt.twopole' ? ['A', 'B'] : ['A', 'N'], top + 3.5, W * 0.3, W * 0.7);
    row(2, T * 0.75, 'm', n === 'vt.twopole' ? ['a', 'b'] : ['a', 'n'], top + 3.5, W * 0.3, W * 0.7);
  } else if (n.startsWith('damping')) {
    for (const [x, l] of [[W * 0.3, '1'], [W * 0.7, '2']]) { cyl(sc, 'z', [x, T * 0.5, top], sr * 1.6, sr * 2.4, 'r'); cyl(sc, 'z', [x, T * 0.5, top + sr * 2.4], sr * 0.8, sr * 1.6, 'e', { hl: false }); terms.push([[x, T * 0.5, top + sr * 5], l]); }
  } else if (kind.startsWith('electronic')) {
    strip(T * 0.15, T * 0.85); row(3, T * 0.5, 'm', null, top + 3.5, W * 0.25, W * 0.75);
  } else {
    strip(T * 0.12, T * 0.44); strip(T * 0.6, T * 0.9);
    row(2, T * 0.28, 'e', ['P1', 'P2'], top + 3.5, W * 0.3, W * 0.7);
    row(2, T * 0.75, 'm', ['S1', 'S2'], top + 3.5, W * 0.3, W * 0.7);
  }
  if (d.cover && !n.startsWith('damping') && n !== 'ct.laboratory') box(sc, [W * 0.04, T * 0.08, top], [W * 0.92, T * 0.86, sr * 2.6 + 4], 'g');
  A.terms = terms;
  A.box = { o: [0, 0, 0], w: W, d: T, h: H, known };
}

// Mittelspannungs-Stützerstromwandler (DIN 42600), Kombiwandler
function mvBase(sc, W, T, x0 = 0) {
  const bp = 9;
  box(sc, [x0 - 14, -14, 0], [W + 28, T + 28, bp], 'm', { t: [{ c: [x0 - 2, -2, 5.5] }, { c: [x0 + W + 2, -2, 5.5] }, { c: [x0 - 2, T + 2, 5.5] }, { c: [x0 + W + 2, T + 2, 5.5] }].map((h) => ({ c: [h.c[0], h.c[1], h.c[2]] })) });
  return bp;
}
function sheds(sc, x, y, w, d, z0, z1, k, m = 'r') {
  const step = (z1 - z0) / k;
  for (let i = 0; i < k; i++) { const z = z0 + step * (i + 0.5) - 3; box(sc, [x - 7, y - 7, z], [w + 14, d + 14, 6], m); }
}
function termBox(sc, x, y, z, w, h, depth = 26) {
  box(sc, [x, y, z], [w, depth, h], 'r');
  box(sc, [x + w * 0.08, y + depth, z + h * 0.12], [w * 0.84, 3, h * 0.76], 'g');
  cyl(sc, 'x', [x + w, y + depth * 0.5, z + h * 0.5], Math.min(8, h * 0.18), 9, 'm', { hl: false });
}
function drawSupport(sc, p, d, A) {
  const um = Math.max(...(p.um || [12]));
  const narrow = p.form?.includes('narrow');
  const outdoor = p.install?.includes('outdoor') && !p.install?.includes('indoor');
  const W = narrow ? 120 : 150, T = clamp(220 + um * 1.2, 230, 330), H = clamp(170 + um * 3.6, 200, 470);
  shadow(sc, -14, -14, W + 14, T + 14, 0, 2);
  const bp = mvBase(sc, W, T);
  const h1 = H * 0.5, h2 = H * 0.5;
  box(sc, [0, 0, bp], [W, T, h1], 'r');
  const ins = W * 0.1;
  box(sc, [ins, T * 0.08, bp + h1], [W - 2 * ins, T * 0.84, h2], 'r');
  if (outdoor || um > 36) sheds(sc, ins, T * 0.08, W - 2 * ins, T * 0.84, bp + h1, bp + h1 + h2 * 0.92, outdoor ? 4 : 3);
  else for (let i = 1; i < 4; i++) { const z = bp + h1 + (h2 * i) / 4; sc.line(iso([ins, T * 0.92, z]), iso([W - ins, T * 0.92, z]), 'pv-ln'); sc.line(iso([W - ins, T * 0.92, z]), iso([W - ins, T * 0.08, z]), 'pv-ln'); }
  const top = bp + H;
  // Primäranschlüsse P1 / P2 (Flachanschlüsse mit Bohrungen)
  const pw = W * 0.34, pd = 46, ph = 9;
  const P1 = [W / 2 - pw / 2, T * 0.08 + 6, top], P2 = [W / 2 - pw / 2, T * 0.92 - 6 - pd, top];
  for (const q of [P1, P2]) box(sc, q, [pw, pd, ph], 'e', { t: [{ c: [q[0] + pw * 0.3, q[1] + pd / 2, 4] }, { c: [q[0] + pw * 0.7, q[1] + pd / 2, 4] }].map((h) => ({ c: [h.c[0], h.c[1], Math.min(h.c[2], pw * 0.12)] })) });
  if (p.dk?.n === 'combined') { cyl(sc, 'z', [W / 2, T / 2, top], 26, 34, 'r'); cyl(sc, 'z', [W / 2, T / 2, top + 34], 8, 14, 'e'); }
  termBox(sc, W * 0.22, T, bp + h1 * 0.12, W * 0.56, h1 * 0.5);
  if (d.ck) { const c = [W * 0.86, T, bp + h1 * 0.8]; cyl(sc, 'y', c, 7, 10, 'm', { hl: false }); }
  A.terms = [[add(P1, [pw / 2, pd / 2, ph + 4]), 'P1'], [add(P2, [pw / 2, pd / 2, ph + 4]), 'P2']];
  A.box = null;
}

// Mittelspannungs-Spannungswandler (einpolig / zweipolig / Eigenversorgung)
function drawMvVt(sc, p, d, A) {
  const n = p.dk?.n || '';
  const um = Math.max(...(p.um || [12]));
  const two = n === 'vt.twopole' || p.form?.includes('two-pole') || n === 'vt.supply';
  const narrow = p.form?.includes('narrow');
  const outdoor = p.install?.includes('outdoor') && !p.install?.includes('indoor');
  const sup = n === 'vt.supply';
  const W = narrow ? 130 : sup ? 200 : 165, T = clamp(230 + um * 1.6, 240, 360) + (sup ? 40 : 0), H = clamp(150 + um * 3, 180, 300);
  shadow(sc, -14, -14, W + 14, T + 14, 0, 2);
  const bp = mvBase(sc, W, T);
  box(sc, [0, 0, bp], [W, T, H], 'r');
  sc.line(iso([W * 0.04, T, bp + H * 0.985]), iso([W * 0.96, T, bp + H * 0.985]), 'pv-edge');
  const top = bp + H;
  const posts = two ? [[W / 2, T * 0.27, 'A'], [W / 2, T * 0.73, 'B']] : [[W / 2, T * 0.32, 'A']];
  const ph = clamp(60 + um * 2.6, 70, 190), pr = clamp(22 + um * 0.25, 22, 34);
  // hinterer Pol zuerst (Malerreihenfolge)
  posts.sort((a, b) => a[1] - b[1]);
  A.terms = [];
  for (const [x, y, l] of posts) {
    cyl(sc, 'z', [x, y, top], pr * 1.25, 10, 'r', { hl: false });
    const k = outdoor ? 4 : 3;
    for (let i = 0; i < k; i++) { const z = top + 10 + (ph * i) / k; cyl(sc, 'z', [x, y, z], pr, ph / k - 6, 'r'); cyl(sc, 'z', [x, y, z + ph / k - 6], pr * (outdoor ? 1.6 : 1.35), 6, 'r', { hl: false }); }
    nut(sc, 'z', [x, y, top + 10 + ph], pr * 0.62, 6);
    cyl(sc, 'z', [x, y, top + 16 + ph], pr * 0.3, 16, 'e');
    A.terms.push([[x, y, top + ph + 46], l]);
  }
  termBox(sc, W * 0.2, T, bp + H * 0.1, W * 0.6, H * (sup ? 0.42 : 0.34), sup ? 34 : 26);
  A.box = null;
}

// Durchführungs-, Generator- und Hochstromwandler (Mittelspannung, großer Primärdurchgang mit Schienen)
function drawMvWindow(sc, p, d, A) {
  const n = p.dk?.n || '';
  const um = Math.max(...(p.um || [24]));
  const outdoor = p.install?.includes('outdoor');
  const gen = n === 'ct.generator';
  const W = gen ? 420 : 260, H = gen ? 440 : 300, T = gen ? 210 : 230;
  const r = gen ? 118 : 70;
  const cx = W / 2, cz = H * (gen ? 0.5 : 0.56);
  shadow(sc, 0, 0, W, T, 0, 3);
  let bp = 0;
  if (!gen) bp = mvBase(sc, W, T);
  else { box(sc, [W * 0.08, -6, 0], [W * 0.18, T + 12, 12], 'm'); box(sc, [W * 0.74, -6, 0], [W * 0.18, T + 12, 12], 'm'); bp = 12; }
  const hole = { c: [cx, cz + bp, r] };
  const nb = clamp(d.nbar || (gen ? 3 : 2), 1, 4);
  const bw = Math.min(d.bar?.[0] || 80, r * 1.25), bt = Math.max(8, (d.bar?.[1] || 10) * (bw / (d.bar?.[0] || 80)));
  const s = Math.min(1, (r * 1.8) / Math.hypot(nb * bt * 2, bw));
  const list = Array.from({ length: nb }, (_, i) => ({ x: cx - (nb * 2 - 1) * bt * s / 2 + i * 2 * bt * s, z: cz + bp - bw * s / 2, w: bt * s, h: bw * s }));
  const lf = T * 0.9, lb = T * 0.7;
  tunnel(sc, 0, T, hole, 'r');
  for (const b of list) box(sc, [b.x, -lb, b.z], [b.w, lb + T, b.h], 'e', {}, 'tr');
  box(sc, [0, 0, bp], [W, T, H], 'r', { f: [{ c: [cx, cz + bp, r] }] });
  if (outdoor) for (let i = 1; i < 5; i++) { const z = bp + (H * i) / 5; sc.line(iso([0, T, z]), iso([W, T, z]), 'pv-ln'); sc.line(iso([W, T, z]), iso([W, 0, z]), 'pv-ln'); }
  for (const b of list) box(sc, [b.x, T, b.z], [b.w, lf, b.h], 'e', { r: [{ c: [T + lf * 0.7, b.z + b.h / 2, b.h * 0.13] }] });
  // Klemmenkasten oben
  const kw = W * 0.34, kd = T * 0.5, kh = 40;
  box(sc, [W / 2 - kw / 2, T * 0.25, bp + H], [kw, kd, kh], 'm');
  box(sc, [W / 2 - kw / 2 + 6, T * 0.25 + kd, bp + H + 6], [kw - 12, 2.5, kh - 12], 'g');
  A.terms = [];
  A.box = null;
}

// Durchführungsstromwandler / Durchführungen (Flansch, Gießharzkörper, Primärbolzen)
function drawBushing(sc, p, d, A) {
  const n = p.dk?.n || '';
  const bar = n === 'ct.bushingbar';
  const R = 70, L1 = 150, L2 = 170, fl = 14;
  const cz = R * 1.45;
  shadow(sc, -R * 1.3, -L1, R * 1.3, L2 + fl, 0, 2);
  // hinterer Körper
  cyl(sc, 'y', [0, -L1, cz], R * 0.82, L1, 'r', { cap: false });
  // Flansch
  box(sc, [-R * 1.4, 0, cz - R * 1.4], [R * 2.8, fl, R * 2.8], 'm', { f: [{ c: [-R * 1.15, cz - R * 1.15, 6] }, { c: [R * 1.15, cz - R * 1.15, 6] }, { c: [-R * 1.15, cz + R * 1.15, 6] }, { c: [R * 1.15, cz + R * 1.15, 6] }] });
  // Körper vorn mit Schirmen
  cyl(sc, 'y', [0, fl, cz], R, L2 * 0.25, 'r', { cap: false });
  cyl(sc, 'y', [0, fl + L2 * 0.25, cz], R * 0.86, L2 * 0.75, 'r');
  if (p.kind === 'bushing' || p.install?.includes('outdoor')) for (let i = 0; i < 3; i++) cyl(sc, 'y', [0, fl + L2 * (0.36 + i * 0.2), cz], R * 1.12, 7, 'r', { hl: false });
  // Primärleiter
  if (bar) box(sc, [-9, fl + L2, cz - 30], [18, 70, 60], 'e', { r: [{ c: [fl + L2 + 45, cz, 9] }] });
  else { cyl(sc, 'y', [0, fl + L2, cz], R * 0.3, 60, 'e'); nut(sc, 'y', [0, fl + L2 + 8, cz], R * 0.46, 10); }
  // Klemmenkasten auf dem Flansch
  if (p.kind !== 'bushing') { box(sc, [-R * 0.45, -R * 0.5, cz + R * 1.4], [R * 0.9, R * 0.62 + fl, 30], 'm'); box(sc, [-R * 0.38, fl + R * 0.12, cz + R * 1.4 + 5], [R * 0.76, 2.5, 20], 'g'); }
  A.terms = [];
  A.box = null;
}

// Metallgekapselte Wandler (Innen-/Außenkonus)
function drawMetalclad(sc, p, d, A) {
  const two = p.form?.includes('two-pole') || /Z/.test(p.code);
  const outer = /A\b|A[ (/]|\/ ?\w*A/.test(p.code) && !/I/.test(p.code.slice(-2));
  const R = 115, H = 260;
  shadow(sc, -R - 20, -R - 20, R + 20, R + 20, 0, 3);
  box(sc, [-R - 20, -R - 20, 0], [2 * R + 40, 2 * R + 40, 10], 'm', { t: [{ c: [-R - 8, -R - 8, 5] }, { c: [R + 8, -R - 8, 5] }, { c: [-R - 8, R + 8, 5] }, { c: [R + 8, R + 8, 5] }] });
  cyl(sc, 'z', [0, 0, 10], R, H, 'm');
  cyl(sc, 'z', [0, 0, 10 + H], R * 1.06, 8, 'm', { hl: false });
  const cones = two ? [[-R * 0.42, 0], [R * 0.42, 0]] : [[0, 0]];
  cones.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [x, y] of cones) {
    if (outer) { cyl(sc, 'z', [x, y, 18 + H], R * 0.3, 18, 'r'); cyl(sc, 'z', [x, y, 36 + H], R * 0.22, 40, 'r'); cyl(sc, 'z', [x, y, 76 + H], R * 0.08, 14, 'e'); }
    else { cyl(sc, 'z', [x, y, 18 + H], R * 0.3, 10, 'r', { capCls: 'r-c' }); const E = iso([x, y, 28 + H]); sc.ell(E[0], E[1], RX * R * 0.17, RY * R * 0.17, 0, 'pv-hole'); sc.ell(E[0], E[1], RX * R * 0.06, RY * R * 0.06, 0, 'e-c'); }
  }
  // Klemmenkasten seitlich
  box(sc, [-R * 0.35, R * 0.92, 40], [R * 0.7, 40, 70], 'm');
  box(sc, [-R * 0.3, R * 0.92 + 40, 48], [R * 0.6, 2.5, 54], 'g');
  A.terms = [];
  A.box = null;
}

// Freiluft-Kaskadenwandler
function drawCascade(sc, p, d, A) {
  const R = 60, H = 420;
  shadow(sc, -90, -90, 90, 90, 0, 3);
  box(sc, [-90, -90, 0], [180, 180, 60], 'm');
  cyl(sc, 'z', [0, 0, 60], R, H, 'r');
  for (let i = 0; i < 7; i++) cyl(sc, 'z', [0, 0, 80 + i * 54], R * 1.65, 6, 'r', { hl: false });
  box(sc, [-80, -70, 60 + H], [160, 140, 90], 'm');
  for (const x of [-80, 80]) cyl(sc, 'x', [x < 0 ? -112 : 80, 0, 60 + H + 45], 16, 32, 'e');
  termBox(sc, -40, 90, 10, 80, 40, 20);
  A.terms = [[[-112, 0, 60 + H + 80], 'P1'], [[112, 0, 60 + H + 80], 'P2']];
  A.box = null;
}

const BUILDERS = { window: drawWindow, split: drawSplit, lvbox: drawLvBox, support: drawSupport, mvvt: drawMvVt, mvwindow: drawMvWindow, bushing: drawBushing, metalclad: drawMetalclad, cascade: drawCascade };

// ---------- Bemaßung ----------
function dimLine(sc, P0, P1, off, label, u) {
  const Q0 = iso(add(P0, off)), Q1 = iso(add(P1, off));
  const E0 = iso(P0), E1 = iso(P1);
  const ext = (E, Q) => { const dx = Q[0] - E[0], dy = Q[1] - E[1]; const L = Math.hypot(dx, dy) || 1; const k = 4 * u; sc.line([E[0] + (dx / L) * k, E[1] + (dy / L) * k], [Q[0] + (dx / L) * k, Q[1] + (dy / L) * k], 'pv-ext'); };
  ext(E0, Q0); ext(E1, Q1);
  sc.line(Q0, Q1, 'pv-dim');
  const ang = Math.atan2(Q1[1] - Q0[1], Q1[0] - Q0[0]);
  for (const Q of [Q0, Q1]) { const a = ang + Math.PI / 4, k = 4.5 * u; sc.line([Q[0] - Math.cos(a) * k, Q[1] - Math.sin(a) * k], [Q[0] + Math.cos(a) * k, Q[1] + Math.sin(a) * k], 'pv-tick'); }
  let deg = (ang * 180) / Math.PI;
  if (deg > 90.5) deg -= 180; if (deg <= -90.5) deg += 180;
  const M = [(Q0[0] + Q1[0]) / 2, (Q0[1] + Q1[1]) / 2];
  sc.ext(M[0] - 22 * u, M[1] - 10 * u); sc.ext(M[0] + 22 * u, M[1] + 10 * u);
  sc.text(M[0], M[1], label, deg, 'pv-tx');
}

function annotate(sc, A, d, fmt, u) {
  const b = A.box;
  if (b) {
    const { o, w, d: dd, h } = b;
    const s = Math.max(w, dd, h);
    const gap = Math.max(14 * u, s * 0.1);
    const hz = b.hz || h;
    if (b.known.w && d.box?.[0]) dimLine(sc, [o[0], o[1] + dd, o[2]], [o[0] + w, o[1] + dd, o[2]], [0, 0, -gap - (d.din ? 8 : 0)], fmt(d.box[0]), u);
    if (b.known.h && d.box?.[1]) dimLine(sc, [o[0], o[1] + dd, o[2]], [o[0], o[1] + dd, o[2] + hz], [-gap, 0, 0], fmt(d.box[1]), u);
    if (b.known.t && d.box?.[2]) dimLine(sc, [o[0] + w, o[1], o[2]], [o[0] + w, o[1] + dd, o[2]], [gap * 0.9, 0, -gap * 0.35 - (d.din ? 8 : 0)], fmt(d.box[2]) + (d.box2 ? `…${fmt(d.box2)}` : ''), u);
  }
  const hl = A.hole;
  if (hl && (d.inner || d.win) && !A.innerOff) {
    let label, P0, P1, room;
    if (hl.c) {
      label = `Ø ${d.inner.length > 2 ? `${fmt(d.inner[0])}…${fmt(d.inner[d.inner.length - 1])}` : d.inner.map(fmt).join(' / ')}`;
      P0 = [hl.c[0] - hl.r, hl.c[1], hl.c[2]]; P1 = [hl.c[0] + hl.r, hl.c[1], hl.c[2]];
      room = (b ? (b.hz || b.h) : Infinity) - (hl.c[2] + hl.r);
      const lift = hl.r + Math.min(room * 0.5, Math.max(10 * u, hl.r * 0.35));
      if (room > 9 * u) { dimLine(sc, P0, P1, [0, 0, lift], label, u); label = null; }
    } else if (A.win) {
      const [u0, , u1, v1] = hl.rect;
      label = `${fmt(A.win[0])} × ${fmt(A.win[1])}`;
      room = (b ? b.h : Infinity) - v1;
      if (room > 9 * u) { dimLine(sc, [u0, hl.y, v1], [u1, hl.y, v1], [0, 0, Math.min(room * 0.5, 14 * u)], label, u); label = null; }
      P0 = [u0, hl.y, v1];
    }
    if (label && P0) {
      const R = iso(hl.c ? [hl.c[0] + hl.r * Math.cos(2.18), hl.c[1], hl.c[2] + hl.r * Math.sin(2.18)] : P0);
      const K = [R[0] - 26 * u, R[1] - 30 * u], E = [K[0] - 14 * u, K[1]];
      sc.out.push({ t: 'pl', v: [R, K, E], cls: 'pv-lead', extra: '' });
      sc.ell(R[0], R[1], 1.8 * u, 1.8 * u, 0, 'pv-dot');
      sc.ext(E[0] - 60 * u, E[1] - 10 * u);
      sc.text(E[0] - 3 * u, E[1] + 0.5 * u, label, 0, 'pv-tx', 'end');
    }
  }
  for (const [p3, l] of A.terms || []) { if (!l) continue; const q = iso(p3); sc.ext(q[0], q[1] - 8 * u); sc.text(q[0], q[1] - 2 * u, l, 0, 'pv-lb'); }
}

// ---------- Ausgabe ----------
function serialize(sc, vb, prec, u) {
  const f = (v) => +v.toFixed(prec);
  const cmd = (c) => c.map((x) => (x[0] === 'Z' ? 'Z' : x[0] === 'A' ? `A${f(x[1])} ${f(x[2])} ${x[3]} ${x[4]} ${x[5]} ${f(x[6])} ${f(x[7])}` : `${x[0]}${f(x[1])} ${f(x[2])}`)).join('');
  let s = '';
  for (const it of sc.out) {
    if (it.t === 'p') s += `<path class="${it.cls}"${it.extra} d="${cmd(it.c)}"/>`;
    else if (it.t === 'e') { const [cx, cy, rx, ry, rot] = it.v; s += `<ellipse class="${it.cls}" cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}"${rot ? ` transform="rotate(${rot} ${f(cx)} ${f(cy)})"` : ''}/>`; }
    else if (it.t === 'l') s += `<path class="${it.cls}" d="M${f(it.v[0])} ${f(it.v[1])}L${f(it.v[2])} ${f(it.v[3])}"/>`;
    else if (it.t === 'pl') s += `<path class="${it.cls}"${it.extra} d="${it.v.map((p, i) => `${i ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`).join('')}${it.cls === 'pv-lead' ? '' : 'Z'}"/>`;
    else if (it.t === 'r') {
      const p = it.d;
      let d = `M${f(p[0][0])} ${f(p[0][1])}`;
      if (p.length === 4) d += `C${f(p[1][0])} ${f(p[1][1])} ${f(p[2][0])} ${f(p[2][1])} ${f(p[3][0])} ${f(p[3][1])}`;
      else for (let i = 1; i < p.length; i++) d += `L${f(p[i][0])} ${f(p[i][1])}`;
      s += `<path class="pv-rope ${it.cls}-o" style="stroke-width:${f(it.w + 2.4 * u)}" d="${d}"/><path class="pv-rope ${it.cls}-i" style="stroke-width:${f(it.w)}" d="${d}"/>`;
    } else if (it.t === 't') { const [x, y, rot] = it.v; s += `<text class="${it.cls}" x="${f(x)}" y="${f(y)}" text-anchor="${it.anchor}" dominant-baseline="central"${rot ? ` transform="rotate(${f(rot)} ${f(x)} ${f(y)})"` : ''}>${esc(it.s)}</text>`; }
  }
  return s;
}

export const visualFamily = famOf;

// Schemazeichnung als SVG; detail=true: mit Bemaßung und Klemmbezeichnungen
export function productVisual(p, { detail = false, label = '', fmt = (v) => String(v).replace('.', ','), ratio = 4 / 3, tight = false } = {}) {
  const d = p.dm || {};
  const fam = famOf(p);
  const build = (u) => {
    const sc = new Scene();
    const A = {};
    BUILDERS[fam](sc, p, d, A);
    return { sc, A };
  };
  // erster Durchgang: Größe des Körpers bestimmen (für Schriftgröße / Abstände)
  let { sc, A } = build(1);
  let [x0, y0, x1, y1] = sc.bb;
  let u = 1;
  if (detail) {
    u = Math.max(x1 - x0, (y1 - y0) * ratio) / 470;
    annotate(sc, A, d, fmt, u);
    [x0, y0, x1, y1] = sc.bb;
  }
  const bw = x1 - x0, bh = y1 - y0;
  const pad = Math.max(bw, bh) * (detail ? 0.06 : tight ? 0.03 : 0.1);
  let W = bw + 2 * pad, H = bh + 2 * pad;
  if (W / H < ratio) W = H * ratio; else H = W / ratio;
  const vx = (x0 + x1) / 2 - W / 2, vy = (y0 + y1) / 2 - H / 2;
  // Karten: ganzzahlige Koordinaten genügen (≤ 0,5 Einheiten bei ~300 Einheiten Breite), Detail: eine Nachkommastelle
  const prec = !detail && W > 160 ? 0 : W > 900 ? 0 : 1;
  const uu = detail ? u : W / 470;
  return `<svg class="pv${detail ? ' pv--detail' : ''}" viewBox="${+vx.toFixed(prec)} ${+vy.toFixed(prec)} ${+W.toFixed(prec)} ${+H.toFixed(prec)}" style="--u:${+uu.toFixed(3)}" role="img"${label ? ` aria-label="${esc(label)}"` : ' aria-hidden="true"'}>${serialize(sc, [vx, vy, W, H], prec, uu)}</svg>`;
}
