// Startseite
import { esc, icon, imgTag, tpl, fmtDate, axisPos, AXIS_TICKS, fmtNum, htmlText, UM_STEPS } from '../lib/util.js';
import { shorten } from './layout.js';
import { netMapHome } from './netmap.js';
import { HISTORY_IMG, AREA_IMG, SECTOR_IMG } from '../lib/catalog.js';
import { coversUm } from '../lib/product.js';

export { AREA_IMG, SECTOR_IMG };
// Bänder der Spannungsachse
export const AXIS_BANDS = [
  ['niederspannung', 0.72, 3.6], ['mittelspannung', 3.6, 72.5], ['hochspannung', 72.5, 550], ['elektronik-sensoren', 0.72, 90], ['stromschienen-sis', 3.6, 72.5],
];

// Spannungsachse: logarithmische Skala, Bänder je Produktbereich, Sonde mit Trefferpunkten.
// Reines HTML (Prozent-Positionen), damit Schrift und Kreise bei jeder Breite unverzerrt bleiben.
const pct = (v) => `${(axisPos(v) * 100).toFixed(3)}%`;
export function voltageAxisPlot(ctx, { value = 24 } = {}) {
  const { t, lang } = ctx;
  const rowH = 20, gap = 6, top = 4;
  const axisY = top + AXIS_BANDS.length * (rowH + gap) + 4;
  const on = (lo, hi) => value >= lo - 1e-6 && value <= hi + 1e-6;
  const bands = AXIS_BANDS.map(([a, lo, hi], i) => {
    const y = top + i * (rowH + gap);
    const st = on(lo, hi) ? ' is-on' : ' is-dim';
    return `<span class="vaxis__band${st}" data-band="${a}" data-lo="${lo}" data-hi="${hi}" style="--bi:${i};left:${pct(lo)};width:${((axisPos(hi) - axisPos(lo)) * 100).toFixed(3)}%;top:${y}px;height:${rowH}px"><span>${esc(t.lbl.area[a])}</span></span>`;
  }).join('');
  const hits = AXIS_BANDS.map(([a, lo, hi], i) => `<i class="vaxis__hit${on(lo, hi) ? ' is-on' : ''}" data-lo="${lo}" data-hi="${hi}" style="top:${top + i * (rowH + gap) + rowH / 2}px"></i>`).join('');
  const ticks = AXIS_TICKS.map((v, i) => `<span class="vaxis__tick" style="left:${pct(v)}"><span>${esc(fmtNum(v, lang))}${i === AXIS_TICKS.length - 1 ? '&nbsp;kV' : ''}</span></span>`).join('');
  return `<div class="vaxis__scale" aria-hidden="true" style="--ay:${axisY}px;height:${axisY + 24}px">
    ${ticks}<span class="vaxis__line"></span>${bands}
    <span class="vaxis__probe" data-probe style="--p:${axisPos(value).toFixed(4)}">${hits}</span>
  </div>`;
}

export function voltageAxis(ctx, { dark = true, sweep = false } = {}) {
  const { t } = ctx;
  const H = t.pages.home;
  // Trefferzahl schon im HTML (sonst verschiebt das spätere Nachladen das Layout)
  const n0 = (ctx.data.products || []).filter((p) => coversUm(p, 24)).length;
  const nAll = UM_STEPS.map((v) => (ctx.data.products || []).filter((p) => coversUm(p, v)).length).join(',');
  return `<div class="vaxis${dark ? '' : ' vaxis--light'}" data-vaxis data-counts="${nAll}"${sweep ? ' data-vaxis-sweep' : ''}>
  <div class="vaxis__head">
    <span class="vaxis__title" id="vaxis-title">${esc(H.axisTitle)}</span>
    <span class="vaxis__readout"><strong data-vaxis-value>24&nbsp;kV</strong><span data-vaxis-count aria-live="polite">${n0 ? esc(tpl(H.axisMatches, { n: n0 })) : ''}</span></span>
  </div>
  <div class="vaxis__plot" data-vaxis-plot>
    ${voltageAxisPlot(ctx)}
    <input class="vaxis__range" type="range" min="0" max="1000" step="1" value="${Math.round(axisPos(24) * 1000)}" aria-labelledby="vaxis-title" aria-valuetext="24 kV" data-vaxis-range>
    <span class="vaxis__focus" aria-hidden="true"></span>
  </div>
  <div class="vaxis__foot"><span>${esc(H.axisHelp)}</span><a class="btn btn--light btn--small" data-vaxis-go href="${ctx.href('finder', {}, { um: '24' })}">${esc(H.axisOpen)}</a></div>
</div>`;
}

// Intro (beim ersten Aufruf und dann bei jedem dritten Neuladen, jederzeit zu überspringen): das Messwandler-Prinzip. Ein großer Primärstrom läuft
// in den Ringkern, heraus kommt ein kleiner, proportionaler Sekundärstrom; dann setzt sich das RITZ-Zeichen
// Buchstabe für Buchstabe zusammen und fliegt an seinen Platz im Seitenkopf. Den Ablauf steuert das kleine
// Skript im Kopf der Startseite (build.mjs, introScript) über data-intro am Wurzelelement.
const LOGO_FRAME = 'M74.74,103.3h109.25l-54.62,29.99-54.62-29.99ZM12.89,70.11l51.17-28.1H194.66l51.17,28.1-51.17,27.57H64.06L12.89,70.11ZM129.36,6.64l54.62,29.76H74.74L129.36,6.64Zm.05-6.64L0,70.11l129.31,69.98,129.41-69.98L129.41,0Z';
const LOGO_LETTERS = [
  'M84.2,57.19c4.75,0,7.08,.9,7.08,5.06s-2.33,5.12-7.08,5.12h-9.78v-10.18h9.78ZM66.45,49.99v40.37h7.98v-15.85h9.4l8.35,15.85h8.98l-9.46-16.87c4.91-1.12,7.66-5.12,7.66-11.36,0-8.49-4.28-12.14-13.26-12.14h-19.66Z',
  'M117.12,49.99h-8.35v40.37h8.35V49.99Z',
  'M135.93,57.07v33.28h8.24V57.08h12.31v-7.03h-32.81v7.03h12.26Z',
  'M172.99,83.46l19.27-33.73h-29.93v6.9h16.36l-19.33,33.73h31.85v-6.9h-18.23Z',
];
function introWave(u0, u1, A, flip) {
  // Primärstrom endet, Sekundärstrom beginnt im Ringkern (u = 525 bzw. 675 liegen unter dem Kernband)
  let d = '';
  for (let u = u0; u <= u1; u += 4) {
    const v = A * Math.sin((2 * Math.PI * u) / 150);
    d += `${u === u0 ? 'M' : 'L'}${flip ? `${(250 + v).toFixed(1)} ${u}` : `${u} ${(250 + v).toFixed(1)}`}`;
  }
  return d;
}
function introDrawing(flip) {
  const p1 = introWave(0, 524, 132, flip), p2 = introWave(676, 1200, 16, flip);
  const [cx, cy] = flip ? [250, 600] : [600, 250];
  const L = flip
    ? [[30, 64, 'start'], [30, 1150, 'start'], [362, 611, 'start']]
    : [[96, 84, 'start'], [1104, 206, 'end'], [600, 398, 'middle']];
  return `<svg class="intro__svg intro__svg--${flip ? 'p' : 'l'}" viewBox="0 0 ${flip ? '500 1200' : '1200 500'}" preserveAspectRatio="xMidYMid meet" focusable="false">
  <g class="intro__draw">
    <line class="intro__axis" ${flip ? 'x1="250" y1="0" x2="250" y2="1200"' : 'x1="0" y1="250" x2="1200" y2="250"'}/>
    <path class="intro__w intro__w1" d="${p1}" pathLength="1"/><path class="intro__w intro__w2" d="${p2}" pathLength="1"/>
    <path class="intro__pulse intro__p1" d="${p1}" pathLength="1"/><path class="intro__pulse intro__p2" d="${p2}" pathLength="1"/>
    <circle class="intro__ring" cx="${cx}" cy="${cy}" r="74"/><circle class="intro__winding" cx="${cx}" cy="${cy}" r="74"/>
    <circle class="intro__edge intro__e1" cx="${cx}" cy="${cy}" r="56" pathLength="1"/><circle class="intro__edge intro__e2" cx="${cx}" cy="${cy}" r="92" pathLength="1"/>
    <text class="intro__l intro__l1" x="${L[0][0]}" y="${L[0][1]}" text-anchor="${L[0][2]}">2000 A</text>
    <text class="intro__l intro__l2" x="${L[1][0]}" y="${L[1][1]}" text-anchor="${L[1][2]}">5 A</text>
    <text class="intro__l intro__l3" x="${L[2][0]}" y="${L[2][1]}" text-anchor="${L[2][2]}">2000/5 A</text>
  </g>
</svg>`;
}
function introOverlay(ctx) {
  const letters = LOGO_LETTERS.map((d, i) => `<path class="intro__ch" style="--i:${i}" d="${d}"/>`).join('');
  return `<div class="intro" aria-hidden="true">
  ${introDrawing(false)}${introDrawing(true)}
  <div class="intro__logo"><svg viewBox="0 0 258.72 140.09" focusable="false"><polygon class="intro__diamond" points="129.4,0 258.7,70.1 129.3,140.1 0,70.1" pathLength="1"/><path class="intro__frame" d="${LOGO_FRAME}"/><g class="intro__mark">${letters}</g></svg><p class="intro__tag">${esc(ctx.t.ui.introLine)}</p></div>
</div>
<button class="intro__skip" type="button" data-intro-skip>${esc(ctx.t.ui.skipIntro)}</button>`;
}

// Überschrift Wort für Wort (Maske), damit der Einstieg ohne Layoutverschiebung läuft
const words = (text) => String(text).split(' ').map((w, i) => `<span class="h1w"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');

// Kennzahlen aus den Stammdaten (Standorte, Mitarbeitende, Vertretungen)
export function groupStats(ctx) {
  const locs = ctx.data.contacts.locations;
  const plants = locs.filter((l) => l.type === 'production');
  const staff = locs.reduce((s, l) => s + (+l.employees || 0), 0);
  const repCountries = new Set((ctx.data.contacts.reps || []).map((r) => r.country).filter(Boolean)).size;
  return { plants: plants.length, plantCountries: new Set(plants.map((l) => l.country)).size, staff, staffRound: Math.floor(staff / 100) * 100, repCountries };
}

// ---------- Bühne: ein Ringkern-Stromwandler in der Fertigung, darüber das Messwerk mit Röntgenblick ----------
// Foto und Einblendungen teilen ein Koordinatensystem (Pixel des Fotos): Die Fläche hat das Seitenverhältnis des
// Fotos und wird wie ein Titelbild beschnitten, so liegen Skala, Röntgenbild und Hinweise bei jeder Fenstergröße
// genau auf dem Ring. Die Kamera steht leicht rechts der Ringachse, die Stirnseite erscheint deshalb waagerecht
// verkürzt: Skala und Röntgenbild werden als Kreise gezeichnet und mit E = rx / ry auf die Stirnseite gelegt.
// Ablauf: Das Messwerk legt sich um das Fenster, dann fährt ein Scanner von links nach rechts über den Ring.
// Im Streifen wird das Foto abgedunkelt und das Innere scharf sichtbar (Ringkern mit Bandlagen, Sekundärwicklung,
// Außenkante des Gießharzkörpers, Lage des Primärleiters); hinter dem Scanner bleibt die Zeichnung zart stehen.
// Die Hinweise erscheinen in dem Moment, in dem der Scanner ihren Punkt erreicht. Danach läuft alle 14 s ein
// leiser zweiter Scan. Auf dem Telefon liegt nur das Messwerk im Hintergrund hinter dem Text (ohne Scanner).
// Rechenlast: Jede Bewegung ist transform oder opacity auf einer eigenen, kleinen Ebene und läuft im Compositor
// ohne Hauptthread – die Bögen drehen sich als eigene SVG-Ebenen, das Leuchten pulsiert über die Deckkraft seiner
// Ebene, die Messkurven gleiten als Ganzes, Scanner und Röntgenbild verschieben nur Ebenen. Neu gezeichnet werden
// allein Ring und Führungslinien, während sie sich beim Einstieg aufziehen (je eine kleine Ebene).
// Bei einem neuen Foto genügt es, STAGE neu einzumessen.
const STAGE_IMG = 'mimg/buehne-ringkernwandler.webp';
const STAGE = {
  w: 2912, h: 1440,
  cx: 1992, cy: 745, rx: 395, ry: 438, // Öffnung: Mitte und Halbachsen an der Kante der Aluminiumhülse
  outer: [2010, 745, 692, 752], // Außenkante der Stirnseite (Mitte, Halbachsen; rechts durch die Perspektive größer)
  // Bauteile auf der Stirnseite (x, y, Breite, Höhe): Aufkleber P1, CE mit Gewindeeinsatz, Klemmenkasten.
  // Das Röntgenbild spart sie aus, damit sie sauber über der Zeichnung liegen.
  parts: [[2511, 567, 157, 125], [2465, 690, 180, 112], [2438, 834, 245, 285]],
};
const E = STAGE.rx / STAGE.ry; // Verkürzung der Stirnseite
const U = STAGE.ry / 292; // Maßeinheit der Einblendung (1 = Skala auf dem ersten Bühnenfoto)
// Röntgenbild in Vielfachen des Öffnungsradius: Ringkern und Wicklung liegen außerhalb der Skala (bis 1,22)
const XR = { core: [1.27, 1.45], wind: [1.25, 1.47], lam: 13, cond: 60, dot: [1.36, -40] };
// Scanner: Mitte des Streifens fährt gleichmäßig von x0 nach x1 (Fotopixel, Breite bw), Start t0, Dauer dur, Wiederholung loop (s)
const SCAN = { x0: 1180, x1: 2912, bw: 510, t0: 0.9, dur: 2.4, loop: 14 };
const scanAt = (x) => +(SCAN.t0 + ((x - SCAN.x0) / (SCAN.x1 - SCAN.x0)) * SCAN.dur).toFixed(2);
const f1 = (v) => v.toFixed(1);
const pcOf = (v, of) => `${((v / of) * 100).toFixed(3)}%`;
const P = (x, y) => `left:${pcOf(x, STAGE.w)};top:${pcOf(y, STAGE.h)}`;
const BOX = ([x0, y0, x1, y1]) => `left:${pcOf(x0, STAGE.w)};top:${pcOf(y0, STAGE.h)};width:${pcOf(x1 - x0, STAGE.w)};height:${pcOf(y1 - y0, STAGE.h)}`;
// SVG-Ebene über einem Ausschnitt des Fotos (x0, y0, x1, y1); gezeichnet wird weiter in Fotopixeln
const layer = (cls, box, inner, style = '') => `<svg class="${cls}" style="${BOX(box)}${style}" viewBox="${f1(box[0])} ${f1(box[1])} ${f1(box[2] - box[0])} ${f1(box[3] - box[1])}" preserveAspectRatio="none" focusable="false">${inner}</svg>`;
// Ausschnitt um die Mitte des Rings mit halber Breite a und halber Höhe b
const around = (a, b) => [STAGE.cx - a, STAGE.cy - b, STAGE.cx + a, STAGE.cy + b];
const rad = (a) => (a * Math.PI) / 180;
// Kreis um die Mitte (ungestaucht, für die Gruppe ON_FACE) und Punkt auf der Stirnseite (k-facher Öffnungsradius)
const lp = (r, a) => [STAGE.cx + r * Math.cos(rad(a)), STAGE.cy + r * Math.sin(rad(a))];
const face = (k, a) => [STAGE.cx + E * k * STAGE.ry * Math.cos(rad(a)), STAGE.cy + k * STAGE.ry * Math.sin(rad(a))];
const ON_FACE = `translate(${STAGE.cx} ${STAGE.cy}) scale(${E.toFixed(4)} 1) translate(${-STAGE.cx} ${-STAGE.cy})`;
function arcPath(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r.toFixed(1)} ${r.toFixed(1)} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}
const circ = (r) => `M${f1(STAGE.cx + r)} ${STAGE.cy}A${f1(r)} ${f1(r)} 0 1 1 ${f1(STAGE.cx - r)} ${STAGE.cy}A${f1(r)} ${f1(r)} 0 1 1 ${f1(STAGE.cx + r)} ${STAGE.cy}`;
const polyline = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('');
// Hinweise: Ankerpunkte in Fotopixeln (Schilder rechtsbündig an der Linie, Messwerte mit der linken unteren Ecke)
function stageMarks() {
  const { cx, cy, rx, ry } = STAGE, u = U;
  const [kx, ky] = face(...XR.dot);
  const ly = cy - 1.2 * ry;
  return {
    lead1: [[cx, cy], [cx - 84 * u, cy + 84 * u], [cx - 136 * u, cy + 84 * u]],
    lead2: [[kx, ky], [kx - (ky - ly), ly], [cx + 0.22 * rx, ly]],
    chipA: [cx - 142 * u, cy + 84 * u],
    chipB: [cx + 0.22 * rx - 6 * u, ly],
    read: [cx - 0.12 * rx, cy + 0.8 * ry],
    dot2: [kx, ky],
  };
}
// Messwerk aus kleinen Ebenen: Leuchten, Ring, Skala (mit Fadenkreuz), zwei drehende Bögen, zwei Führungslinien,
// Punkte und Pulse als HTML-Elemente
function stageHud() {
  const { cx, cy, ry: r } = STAGE, u = U;
  let ticks = '', major = '';
  for (let a = 0; a < 360; a += 3) {
    const long = a % 15 === 0;
    const r1 = r + 22 * u, r2 = r1 + (long ? 18 : 8) * u;
    const [x1, y1] = lp(r1, a), [x2, y2] = lp(r2, a);
    const seg = `M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}`;
    if (long) major += seg; else ticks += seg;
  }
  const cross = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => `M${f1(cx + dx * 18 * u)} ${f1(cy + dy * 18 * u)}L${f1(cx + dx * 46 * u)} ${f1(cy + dy * 46 * u)}`).join('');
  const rRing = r + 8 * u, rScale = r + 40 * u, rOrbit = r + 64 * u + 8;
  const onFace = (inner) => `<g transform="${ON_FACE}">${inner}</g>`;
  // drehende Bögen: quadratischer Ausschnitt in Kreiskoordinaten, die Stauchung auf die Stirnseite übernimmt die Hülle
  const orbit = (cls, arcs) => `<svg class="hud__rot${cls}" viewBox="${f1(cx - rOrbit)} ${f1(cy - rOrbit)} ${f1(2 * rOrbit)} ${f1(2 * rOrbit)}" focusable="false">${arcs}</svg>`;
  const M = stageMarks();
  const t1 = scanAt(cx), t2 = scanAt(M.dot2[0]);
  const lead = (pts, n, t) => {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return layer(`hud hud--lead hud--lead${n}`, [Math.min(...xs) - 6, Math.min(...ys) - 6, Math.max(...xs) + 6, Math.max(...ys) + 6], `<path d="${polyline(pts)}" pathLength="1"/>`, `;--d:${t}s`);
  };
  return [
    layer('hud hud--glow', around(E * rRing + 60, rRing + 60), onFace(`<circle class="hud__glow" cx="${cx}" cy="${cy}" r="${f1(rRing)}"/>`)),
    layer('hud hud--ring', around(E * rRing + 8, rRing + 8), onFace(`<circle class="hud__ring" cx="${cx}" cy="${cy}" r="${f1(rRing)}" pathLength="1"/>`)),
    layer('hud hud--scale', around(E * rScale + 8, rScale + 8), onFace(`<path class="hud__ticks" d="${ticks}"/><path class="hud__major" d="${major}"/><path class="hud__cross" d="${cross}"/>`)),
    `<div class="hud-orbit" style="${BOX([cx - rOrbit, cy - rOrbit, cx + rOrbit, cy + rOrbit])};--e:${E.toFixed(4)}">`
      + orbit('', `<path class="hud__scan" d="${arcPath(cx, cy, r + 50 * u, -70, -18)}"/><path class="hud__scan hud__scan--2" d="${arcPath(cx, cy, r + 50 * u, 110, 162)}"/>`)
      + orbit(' hud__rot--rev', `<path class="hud__flow" d="${arcPath(cx, cy, r + 64 * u, 200, 232)}"/><path class="hud__flow" d="${arcPath(cx, cy, r + 64 * u, 20, 52)}"/>`)
      + '</div>',
    lead(M.lead1, 1, t1),
    lead(M.lead2, 2, t2),
    `<i class="st__ping" style="${P(cx, cy)};--d:${t1}s"></i><i class="st__ping st__ping--2" style="${P(...M.dot2)};--d:${t2}s"></i>`,
    `<i class="st__dot" style="${P(cx, cy)};--d:${t1}s"></i><i class="st__dot st__dot--2" style="${P(...M.dot2)};--d:${t2}s"></i>`,
  ].join('');
}
// Röntgenbild: Außenkante des Gießharzkörpers, Ringkern mit Bandlagen, Sekundärwicklung (radiale Windungen,
// zwischen den Skalenstrichen versetzt) und die Lage des Primärleiters im Fenster
function xrArt() {
  const r = STAGE.ry;
  const [c0, c1] = XR.core.map((k) => k * r), [w0, w1] = XR.wind.map((k) => k * r);
  let lam = '', wind = '';
  for (let q = c0 + XR.lam; q < c1 - 4; q += XR.lam) lam += circ(q);
  for (let a = 1.5; a < 360; a += 3) {
    const [x0, y0] = lp(w0, a), [x1, y1] = lp(w1, a);
    wind += `M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}`;
  }
  const [ox, oy, orx, ory] = STAGE.outer;
  return `<ellipse class="xr__o" cx="${ox}" cy="${oy}" rx="${orx}" ry="${ory}"/><g transform="${ON_FACE}"><path class="xr__l" d="${lam}"/><path class="xr__w" d="${wind}"/><path class="xr__c" d="${circ(c0)}${circ(c1)}"/><path class="xr__p" d="${circ(XR.cond * U)}"/></g>`;
}
// Aussparung der Bauteile (weiche Kanten); id je Ebene, weil die Zeichnung zweimal im Dokument steht
function xrMask(id) {
  const { w, h, parts } = STAGE;
  return `<defs><filter id="${id}f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#fff"/><g filter="url(#${id}f)">${parts.map(([x, y, pw, ph]) => `<rect x="${x}" y="${y}" width="${pw}" height="${ph}" rx="18" fill="#000"/>`).join('')}</g></mask></defs>`;
}
// Scanner als Ebenen, die sich nur verschieben: ein schmaler Streifen (weiche Kanten, dunkelt das Foto ab, trägt die
// Scanlinie) wandert über die Fläche, die scharfe Zeichnung darin läuft genau gegenläufig und bleibt so auf dem Ring
// stehen. Ebenso gibt eine mitlaufende Hülle die zarte Zeichnung hinter dem Scanner frei (rechte Kante = Scanlinie).
function stageXray() {
  const { w, h } = STAGE;
  const p4 = (v) => `${(v * 100).toFixed(4)}%`;
  const bw = SCAN.bw / w, l0 = (SCAN.x0 - SCAN.bw / 2) / w, l1 = (SCAN.x1 - SCAN.bw / 2) / w, c0 = SCAN.x0 / w;
  const vars = [
    `--bw:${p4(bw)}`, `--aw:${p4(1 / bw)}`,
    `--wa:${p4(l0 / bw)}`, `--wb:${p4(l1 / bw)}`,
    `--aa:${p4(-l0)}`, `--ab:${p4(-l1)}`,
    `--ra:${p4(c0 - 1)}`, `--rb:${p4(1 - c0)}`,
    `--xt:${SCAN.t0}s`, `--xd:${SCAN.dur}s`, `--xl:${SCAN.loop}s`, `--xl0:${+(SCAN.t0 + SCAN.loop).toFixed(2)}s`,
  ].join(';');
  const art = xrArt();
  const svg = (cls, id) => `<svg class="${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" focusable="false">${xrMask(id)}<g mask="url(#${id})">${art}</g></svg>`;
  // erster Scan und Wiederholung auf getrennten Ebenen: je Element nur eine Animation, sonst kann der Browser sie
  // nicht im Compositor abspielen
  return `<div class="xr" style="${vars}"><div class="xr__rev">${svg('xr__base', 'xrm-b')}</div>`
    + `<div class="xr__win">${svg('xr__art', 'xrm-a')}<i class="xr__line"></i></div>`
    + `<div class="xr__win xr__win--loop">${svg('xr__art', 'xrm-l')}<i class="xr__line"></i></div></div>`;
}
// Größen des Fotos für srcset: Telefon (Bühne mindestens 92 % der Fensterhöhe), sonst Höhe der Bühne bis 90 %
function stageSizes() {
  const ar = STAGE.w / STAGE.h;
  return `(max-width: 760px) ${Math.ceil(ar * 92)}vh, (max-aspect-ratio: ${Math.round(ar * 90)}/100) ${Math.ceil(ar * 90)}vh, 100vw`;
}
// kleine Messkurve (zwei Perioden, doppelt lang zum Durchlaufen)
function trace(amp) {
  let d = '';
  for (let x = 0; x <= 240; x += 4) d += `${x ? 'L' : 'M'}${x} ${(20 - amp * Math.sin((2 * Math.PI * x) / 60)).toFixed(1)}`;
  return `<span class="st__wave"><svg viewBox="0 0 240 40" preserveAspectRatio="none" focusable="false"><path d="${d}"/></svg></span>`;
}
function stage(ctx) {
  const { t, href, lang } = ctx;
  const H = t.pages.home, S = H.st;
  const g = groupStats(ctx);
  const facts = [
    ['1945', H.stats.founded],
    [`${fmtNum(g.staffRound, lang)}+`, H.stats.staff],
    [String(g.plants), tpl(H.stats.plants, { n: g.plantCountries })],
    [`${fmtNum(0.72, lang)}–550`, H.stats.range, 'kV'],
    ...(g.repCountries ? [[String(g.repCountries), H.stats.reps]] : []),
  ];
  const { w, h, cx } = STAGE;
  const photo = ctx.img[STAGE_IMG] ? imgTag(ctx, STAGE_IMG, { alt: '', sizes: stageSizes(), eager: true, cls: 'st__photo' }) : '';
  const M = stageMarks();
  const tA = scanAt(cx) + 0.2, tB = scanAt(M.dot2[0]) + 0.2, tR = scanAt(SCAN.x1) - 0.15;
  return `<section class="st hero--anim" data-stage aria-labelledby="st-title" style="--st-w:${w};--st-h:${h};--st-ar:${w} / ${h}">
  <div class="st__media" aria-hidden="true">
    <div class="st__frame">
      ${photo}
      ${stageXray()}
      ${stageHud()}
      <span class="st__chip st__chip--a" style="${P(...M.chipA)};--d:${tA.toFixed(2)}s">${esc(S.hudWindow)}</span>
      <span class="st__chip st__chip--b" style="${P(...M.chipB)};--d:${tB.toFixed(2)}s">${esc(S.hudCore)}</span>
      <span class="st__read" style="${P(...M.read)};--d:${tR.toFixed(2)}s">
        <span class="st__trace"><b>${esc(S.primary)}</b><i>2000 A</i>${trace(15)}</span>
        <span class="st__trace st__trace--s"><b>${esc(S.secondary)}</b><i>5 A</i>${trace(4)}</span>
      </span>
    </div>
  </div>
  <div class="wrap st__inner">
    <h1 class="st__title" id="st-title">${words(H.h1)}</h1>
    <p class="st__lead">${esc(S.lead)}</p>
    <div class="st__links"><a class="btn btn--light" href="#prinzip">${esc(S.cta1)}</a><a class="link link--light" href="${href('products')}">${esc(S.cta2)}</a></div>
  </div>
  <div class="st__foot">
    <dl class="wrap st__ruler" data-reveal="facts">${facts.map(([a, b, unit]) => `<div class="st__fact"><dt>${esc(b)}</dt><dd><strong${unit ? '' : ' data-count'}>${esc(a)}${unit ? `<small>${esc(unit)}</small>` : ''}</strong></dd></div>`).join('')}</dl>
  </div>
</section>`;
}

// ---------- Prinzip ----------
function principle(ctx) {
  const Pr = ctx.t.pages.home.principle;
  return `<section class="ch" id="prinzip" aria-labelledby="pr-title">
  <div class="wrap ch__split">
    <h2 class="ch__title" id="pr-title" data-reveal="head">${esc(Pr.title)}</h2>
    <div class="ch__body" data-reveal="head"><p class="ch__text">${esc(Pr.text)}</p></div>
  </div>
  <div class="wrap ch__figs"><dl class="figs" data-reveal="facts">${Pr.facts.map(([v, l]) => `<div class="fig"><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>
</section>`;
}

// ---------- Spektrum: sechs Bereiche auf der Spannungsachse ----------
const BANDS = { niederspannung: [0.72, 3.6], mittelspannung: [3.6, 72.5], hochspannung: [72.5, 550], 'elektronik-sensoren': [0.72, 90], 'stromschienen-sis': [3.6, 40.5], 'giessharzteile-duromer': [0.72, 72.5] };
const pc = (v) => (axisPos(v) * 100).toFixed(2);
function spectrum(ctx) {
  const { t, href, lang } = ctx;
  const Sp = t.pages.home.spectrum;
  const order = ['niederspannung', 'mittelspannung', 'hochspannung', 'elektronik-sensoren', 'stromschienen-sis', 'giessharzteile-duromer'];
  const ticks = AXIS_TICKS.map((v, i) => `<span class="sp__tick" style="left:${pc(v)}%"><span>${esc(fmtNum(v, lang))}${i === AXIS_TICKS.length - 1 ? ' kV' : ''}</span></span>`).join('');
  return `<section class="ch ch--porcelain" aria-labelledby="sp-title">
  <div class="wrap">
    <div class="ch__head" data-reveal="head"><h2 class="ch__title" id="sp-title">${esc(Sp.title)}</h2><p class="ch__lead">${esc(Sp.lead)}</p></div>
    <div class="sp" data-spectrum>
      <div class="sp__chart" data-reveal="chart">
        <div class="sp__axis" aria-hidden="true">${ticks}</div>
        <ul class="sp__rows">${order.map((a, i) => {
          const [lo, hi] = BANDS[a];
          return `<li><a class="sp__row${i === 1 ? ' is-on' : ''}${a === 'giessharzteile-duromer' ? ' sp__row--part' : ''}" href="${href('area', { area: a })}" data-sp="${a}">
            <span class="sp__name">${esc(t.lbl.area[a])}</span><span class="sp__range">${esc(t.lbl.areaRange[a])}</span>
            <span class="sp__track" aria-hidden="true"><span class="sp__bar" style="--a:${pc(lo)}%;--b:${pc(hi)}%;--i:${i}"></span></span>
          </a></li>`;
        }).join('')}</ul>
      </div>
      <div class="sp__view" aria-hidden="true">${order.map((a, i) => `<figure class="sp__fig${i === 1 ? ' is-on' : ''}" data-sp-fig="${a}">${imgTag(ctx, AREA_IMG[a], { alt: '', sizes: '(max-width: 900px) 0px, 36vw', max: 1600, cover: 4 / 5 })}<figcaption><b>${esc(t.lbl.area[a])}</b><span>${esc(t.lbl.areaShort[a])}</span></figcaption></figure>`).join('')}</div>
    </div>
  </div>
</section>`;
}

// ---------- Fertigung: Bildband ----------
function making(ctx) {
  const M = ctx.t.pages.home.making;
  const k = 'mimg/intro_home_slider_5.webp';
  return `<section class="band" aria-labelledby="mk-title">
  <div class="band__media" aria-hidden="true">${ctx.img[k] ? imgTag(ctx, k, { alt: '', sizes: '100vw', max: 1920 }) : ''}</div>
  <div class="wrap band__inner" data-reveal="head"><h2 class="ch__title" id="mk-title">${esc(M.title)}</h2><p class="ch__text">${esc(M.text)}</p></div>
</section>`;
}

// ---------- Produktsuche: Bildwechsel aus den Werken, Suche nach Typ, Spannung oder Anwendung, Spannungsachse ----------
export const SEARCH_SLIDES = [
  ['mimg/intro_home_slider_7.webp', '62% 50%'],
  ['mimg/intro_home_slider_4.webp', '58% 50%'],
  ['mimg/2022__11__intro_home_slider_2.webp', '72% 40%'],
];
function finderSearch(ctx) {
  const { t, href } = ctx;
  const H = t.pages.home, Hs = H.hero2;
  const slides = SEARCH_SLIDES.filter(([k]) => ctx.img[k]);
  return `<section class="ps" data-hero2 aria-labelledby="ps-title">
  <div class="hero2__media" aria-hidden="true">${slides.map(([k, pos], i) => `<figure class="hero2__slide${i ? '' : ' is-on'}" data-slide="${i}" style="--pos:${pos}">${imgTag(ctx, k, { alt: '', sizes: '(max-width: 700px) 1800px, (max-width: 1100px) 150vw, 100vw', max: 1920 })}</figure>`).join('')}</div>
  <div class="wrap ps__inner">
    <div class="ps__copy" data-reveal="head">
      <h2 class="ch__title" id="ps-title">${esc(t.nav.megaFinderTitle)}</h2>
      <p class="ch__lead">${esc(t.nav.megaFinderText)}</p>
      <form class="hero__search" role="search" action="${href('search')}" data-hero-search>
        <label class="vh" for="ps-q">${esc(H.searchLabel)}</label>
        <input id="ps-q" name="q" type="search" placeholder="${esc(H.searchPh)}" autocomplete="off">
        <button type="submit">${icon('search')}<span>${esc(H.searchBtn)}</span></button>
      </form>
      <p class="hero__hint">${esc(H.hint)} ${H.hints.map((h) => `<button type="button" data-hint="${esc(h)}">${esc(h)}</button>`).join(', ')}</p>
    </div>
    <div class="ps__axis" data-reveal="chart">${voltageAxis(ctx, { dark: true, sweep: true })}</div>
    <p class="ps__cta"><a class="link link--light" href="${href('products')}">${esc(Hs.cta1)}${icon('arrow')}</a><a class="link link--light" href="${href('inquiry')}">${esc(Hs.cta2)}${icon('arrow')}</a></p>
  </div>
  ${slides.length > 1 ? `<div class="hero2__ctl wrap">
    <div class="hero2__dots">${slides.map((_, i) => `<button type="button" data-goto="${i}" aria-label="${esc(tpl(Hs.slide, { n: i + 1, total: slides.length }))}"${i ? '' : ' aria-current="true"'}><i></i></button>`).join('')}</div>
    <button class="hero2__pause" type="button" data-hero2-pause aria-pressed="false" aria-label="${esc(Hs.pause)}" data-l-pause="${esc(Hs.pause)}" data-l-play="${esc(Hs.play)}">${icon('pause', 'width="16" height="16"')}${icon('play', 'width="16" height="16"')}</button>
  </div>` : ''}
</section>`;
}

// ---------- Geschichte ----------
const HERITAGE_YEARS = ['1945', '1956', '1991', '2003', '2008', '2026'];
function heritage(ctx) {
  const { t, href } = ctx;
  const C = t.pages.company;
  const Hh = t.pages.home.heritage;
  const items = HERITAGE_YEARS.map((y) => C.history.find(([yy]) => yy === y)).filter(Boolean);
  return `<section class="ch" aria-labelledby="he-title">
  <div class="wrap">
    <div class="ch__head ch__head--row" data-reveal="head"><div><h2 class="ch__title" id="he-title">${esc(Hh.title)}</h2><p class="ch__lead">${esc(Hh.lead)}</p></div><a class="link" href="${href('company')}">${esc(Hh.cta)}${icon('arrow')}</a></div>
    <ol class="tl2" tabindex="0" aria-label="${esc(Hh.title)}">${items.map(([year, title, text]) => {
      const k = (HISTORY_IMG[year] || []).find((x) => ctx.img[x]);
      return `<li class="tl2__item"><span class="tl2__y">${esc(year)}</span>${k ? `<span class="tl2__img">${imgTag(ctx, k, { alt: '', sizes: '(max-width: 700px) 60vw, 16vw', max: 960 })}</span>` : '<span class="tl2__img tl2__img--none" aria-hidden="true"></span>'}<b>${esc(title)}</b><span>${esc(text)}</span></li>`;
    }).join('')}</ol>
  </div>
</section>`;
}

// ---------- Qualität ----------
// Prüffeld-Monitor: spielt die beiden Kennzahlen als Prüfung ab (Wechselspannung bis 400 kV, Hochstrom bis 50 kA,
// dann das Protokoll). Ohne JavaScript und bei reduzierter Bewegung steht das Endbild. Dekor: die Zahlen stehen rechts.
const RIG_GRID = (() => {
  let d = '';
  for (let x = 50; x < 600; x += 50) d += `M${x} 0V200`;
  for (let y = 25; y < 200; y += 25) d += `M0 ${y}H600`;
  return d;
})();
const RIG_SINE = (() => {
  const pts = [];
  for (let k = 0; k <= 120; k++) { const x = (k / 120) * 600; pts.push(`${x.toFixed(1)} ${(100 - 80 * Math.sin((x / 600) * 8 * Math.PI)).toFixed(1)}`); }
  return `M${pts.join('L')}`;
})();
function rigHTML(ctx) {
  const H = ctx.t.pages.home;
  const R = H.rig;
  const num = (s) => { const m = /([\d.,]+)\s*(\S+)/.exec(s || ''); return m ? [m[1], m[2]] : ['', '']; };
  const [uv, uu] = num(H.proofFacts[0]?.[0]), [iv, iu] = num(H.proofFacts[1]?.[0]);
  const steps = [[R.u, tpl(R.upTo, { v: H.proofFacts[0]?.[0] || '' })], [R.i, tpl(R.upTo, { v: H.proofFacts[1]?.[0] || '' })], [R.rep, R.pass]];
  return `<div class="rig" data-rig data-u="${esc(uv)}" data-uu="${esc(uu)}" data-i="${esc(iv)}" data-iu="${esc(iu)}" data-reveal="img" aria-hidden="true">
      <div class="rig__top"><span class="rig__mode"><i class="rig__led"></i><span data-rig-mode>${esc(R.u)}</span></span><span class="rig__read"><b data-rig-val>${esc(uv)}</b><small data-rig-unit>${esc(uu)}</small></span></div>
      <div class="rig__scope">
        <svg viewBox="0 0 600 200" preserveAspectRatio="none"><path class="rig__grid" d="${RIG_GRID}"/><path class="rig__axis" d="M0 100H600"/><path class="rig__trace" data-rig-trace d="${RIG_SINE}"/></svg>
        <span class="rig__stamp"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20"/><path d="M15 24.5l6 6 12-13"/></svg></span>
      </div>
      <ol class="rig__steps">${steps.map(([a, b], i) => `<li class="is-done" data-rig-step="${i}"><span class="rig__bar"><i></i></span><b>${esc(a)}</b><small>${esc(b)}</small></li>`).join('')}</ol>
    </div>`;
}
function quality(ctx) {
  const { t, href } = ctx;
  const H = t.pages.home;
  return `<section class="ch ch--porcelain ch--rig" aria-labelledby="qu-title">
  <div class="wrap ch__split">
    <div class="ch__lhs">
      <h2 class="ch__title" id="qu-title" data-reveal="head">${esc(H.qTitle)}</h2>
      ${rigHTML(ctx)}
    </div>
    <div class="ch__body" data-reveal="head">
      <p class="ch__text">${esc(H.proofLead)}</p>
      <dl class="figs figs--2" data-reveal="facts">${H.proofFacts.map(([v, l], i) => `<div class="fig"${i < 2 ? ` data-rig-fig="${i}"` : ''}><dt>${esc(l)}</dt><dd${i < 2 ? ' data-count' : ''}>${esc(v)}</dd></div>`).join('')}</dl>
      <p><a class="link" href="${href('quality')}">${esc(H.proofCta)}${icon('arrow')}</a></p>
    </div>
  </div>
</section>`;
}

// ---------- News: ruhige Liste ----------
function newsList(ctx) {
  const { t, href, lang } = ctx;
  const H = t.pages.home;
  const items = ctx.data.news.slice(0, 4);
  return `<section class="ch" aria-labelledby="nw-title">
  <div class="wrap">
    <div class="ch__head ch__head--row" data-reveal="head"><h2 class="ch__title" id="nw-title">${esc(H.newsTitle)}</h2><a class="link" href="${href('news')}">${esc(t.ui.allNews)}${icon('arrow')}</a></div>
    <ul class="nl">${items.map((n) => {
      const vf = n.v[lang] ? lang : n.v[ctx.dl] ? ctx.dl : n.v.de ? 'de' : Object.keys(n.v)[0];
      const v = n.v[vf];
      const vl = v.contentLang || vf;
      return `<li><a class="nl__item" href="${href('article', { slug: ctx.newsSlug(n) })}"><time datetime="${n.date}">${esc(fmtDate(n.date, lang))}</time><span class="nl__cat">${esc(t.lbl.newsCat[n.cat] || '')}</span><b${vl !== lang ? ` lang="${vl}"` : ''}>${esc(v.title)}</b>${icon('arrow')}</a></li>`;
    }).join('')}</ul>
  </div>
</section>`;
}

// ---------- Karriere ----------
function career(ctx) {
  const { t, href, data } = ctx;
  const H = t.pages.home;
  const k = 'mimg/stellenangebote_intro_slider_2_Produktion.webp';
  return `<section class="ch ch--flush" aria-labelledby="ca-title">
  <div class="wrap career2">
    <div class="career2__img" data-reveal="img">${ctx.img[k] ? imgTag(ctx, k, { alt: '', sizes: '(max-width: 900px) 100vw, 58vw', max: 1800, cover: 4 / 3 }) : ''}</div>
    <div class="career2__copy" data-reveal="head">
      <h2 class="ch__title" id="ca-title">${esc(H.careerTitle)}</h2>
      <p class="ch__text">${esc(H.careerLead)}</p>
      <p class="cluster"><a class="btn" href="${href('career')}">${esc(H.careerCta)}</a><span class="muted">${esc(ctx.plural(data.jobs.length, t.ui.jobCount))}</span></p>
    </div>
  </div>
</section>`;
}

export function home(ctx) {
  return `
${introOverlay(ctx)}
${stage(ctx)}
${netMapHome(ctx)}
${principle(ctx)}
${spectrum(ctx)}
${finderSearch(ctx)}
${heritage(ctx)}
${making(ctx)}
${quality(ctx)}
${newsList(ctx)}
${career(ctx)}`;
}

export function newsCard(ctx, n, { reveal = false, excerpt = true } = {}) {
  const { t, lang } = ctx;
  const vf = n.v[lang] ? lang : n.v[ctx.dl] ? ctx.dl : n.v.de ? 'de' : Object.keys(n.v)[0];
  const v = n.v[vf];
  const vl = v.contentLang || vf; // Sprache des Inhalts (Kopien aus dem Altbestand)
  const other = vl !== lang;
  const text = htmlText(v.html);
  const url = ctx.href('article', { slug: ctx.newsSlug(n) });
  const img = n.image || n.images?.[0];
  // kleine Altbilder (z. B. 212 × 300) nicht strecken: eingepasst vor unscharfem Hintergrund
  const small = !!(img && ctx.img[img] && ctx.img[img].w < 600);
  return `<a class="card" href="${url}">
  <div class="card__img${small ? ' card__img--small' : ''}"${small ? ` style="--bgimg:url(${ctx.imgUrl(img, 320)})"` : ''}${reveal ? ' data-reveal="img"' : ''}>${img && ctx.img[img] ? imgTag(ctx, img, { alt: '', sizes: small ? `${ctx.img[img].w}px` : '(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw', max: 1600 }) : `<span class="card__ph"><svg viewBox="0 0 80 40" width="80" height="40" aria-hidden="true"><path d="M40 2 78 20 40 38 2 20Z" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>${esc(t.lbl.newsCat[n.cat] || '')}</span></span>`}</div>
  <div class="card__meta"><time datetime="${n.date}">${esc(fmtDate(n.date, lang))}</time><span>${esc(t.lbl.newsCat[n.cat] || '')}</span>${other ? `<span class="card__lang" title="${esc(t.ui[vl] || vl)}">${esc(vl.toUpperCase())}</span>` : ''}</div>
  <h3${other ? ` lang="${vl}"` : ''}>${esc(v.title)}</h3>
  ${excerpt && text ? `<p${other ? ` lang="${vl}"` : ''}>${esc(shorten(text, 150))}</p>` : ''}
</a>`;
}
