// Schaltbilder der Anwendungsseiten: je Branche die typische Anlage als einpoliges Übersichtsschaltbild im Stil einer
// Leitwarte (dunkle Tafel, Spannungsebenen farbig), darin rot und nummeriert die Stellen, an denen RITZ-Produkte sitzen.
// Die Nummern entsprechen den Produktgruppen der Seite (pages.sectors.items.<branche>.groups, 1-basiert).
// Symbole vereinfacht nach IEC 60617: Sammelschiene, Leistungsschalter (Quadrat), Transformator (zwei Kreise),
// Stromwandler (Ring um den Leiter), Spannungswandler (Abzweig mit zwei Kreisen), Generator, Stromrichter, Zähler.
// Zeichenfläche 960 × 440 Einheiten; Beschriftungen kommen aus den Sprachdateien (items.<branche>.map.l).
import { esc } from '../lib/util.js';

export const MAP_W = 960, MAP_H = 440;

// Beschriftungen wachsen mit der Sprache: Breite grob schätzen (Archivo bei 92 % Laufweite ≈ 0,55 em je Zeichen,
// gemessen) und zu lange Texte an der Leerstelle nahe der Mitte auf zwei Zeilen umbrechen.
const FS = { f: 12.5, s: 13, v: 14, hv: 14, b: 12 };
const tw = (s, px = 14) => [...String(s)].length * px * 0.55;
function lines(s, max, px) {
  s = String(s);
  if (!max || tw(s, px) <= max || !s.includes(' ')) return [s];
  const mid = s.length / 2;
  const i = [...s.matchAll(/ /g)].map((m) => m.index).reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
  return [s.slice(0, i), s.slice(i + 1)];
}

// ---------- Zeichenbausteine ----------
function plan() {
  const wires = [], sec = [], eq = [], labels = [], pts = new Map();
  let vy = 0, vh = MAP_H;
  const api = {
    // sichtbarer Ausschnitt (senkrecht), wenn die Zeichnung oben oder unten Luft lässt
    view(y, h) { vy = y; vh = h; return api; },
    // Leiter: Polylinie aus Punkten [[x,y], …]; cls: '' (Mittelspannung), 'hv' (Hochspannung), 'lv' (Niederspannung), 'dc'
    w(points, cls = '') { wires.push(`<path class="mp-w${cls ? ` mp-w--${cls}` : ''}" d="M${points.map((p) => p.join(' ')).join('L')}" pathLength="1"/>`); return api; },
    bus(x1, x2, y, cls = '') { wires.push(`<path class="mp-bus${cls ? ` mp-w--${cls}` : ''}" d="M${x1} ${y}H${x2}" pathLength="1"/>`); return api; },
    // senkrechte Sammelschiene; pathLength="1" brauchen alle Leiter und Schienen für das Einzeichnen (sector.css)
    vbus(x, y1, y2, cls = '') { wires.push(`<path class="mp-bus${cls ? ` mp-w--${cls}` : ''}" d="M${x} ${y1}V${y2}" pathLength="1"/>`); return api; },
    // Sekundär- und Signalleitung (gestrichelt)
    s(points) { sec.push(`<path class="mp-s" d="M${points.map((p) => p.join(' ')).join('L')}"/>`); return api; },
    e(svg) { eq.push(svg); return api; },
    // Beschriftung; max: verfügbare Breite – darüber zweizeilig (zweite Zeile 16 Einheiten tiefer)
    t(x, y, s, { a = 'start', c = '', max = 0 } = {}) {
      const ls = lines(s, max, FS[c] || 14);
      const body = ls.length > 1 ? ls.map((l, i) => `<tspan x="${x}"${i ? ' dy="16"' : ''}>${esc(l)}</tspan>`).join('') : esc(ls[0]);
      labels.push(`<text x="${x}" y="${y}"${a !== 'start' ? ` text-anchor="${a}"` : ''}${c ? ` class="mp-t--${c}"` : ''}>${body}</text>`);
      return api;
    },
    // RITZ-Einbauort n (1-basiert): Symbole und Kennziffer
    p(n, svg) { if (!pts.has(n)) pts.set(n, []); pts.get(n).push(svg); return api; },
    svg() {
      const points = [...pts.entries()].sort((a, b) => a[0] - b[0])
        .map(([n, parts]) => `<g class="mp-pt" data-pt="${n}" style="--pi:${n}">${parts.join('')}</g>`).join('');
      return `<svg class="mp__svg" viewBox="0 ${vy} ${MAP_W} ${vh}" aria-hidden="true" focusable="false">
        <g class="mp-wires">${wires.join('')}</g><g class="mp-secs">${sec.join('')}</g><g class="mp-eqs">${eq.join('')}</g>
        <g class="mp-labels">${labels.join('')}</g><g class="mp-pts">${points}</g></svg>`;
    },
  };
  return api;
}
// Betriebsmittel
const brk = (x, y) => `<rect class="mp-eq" x="${x - 7}" y="${y - 7}" width="14" height="14"/>`;
const xfv = (x, y, r = 17) => `<circle class="mp-eq mp-eq--o" cx="${x}" cy="${y - 12}" r="${r}"/><circle class="mp-eq mp-eq--o" cx="${x}" cy="${y + 12}" r="${r}"/>`;
const xfh = (x, y, r = 17) => `<circle class="mp-eq mp-eq--o" cx="${x - 12}" cy="${y}" r="${r}"/><circle class="mp-eq mp-eq--o" cx="${x + 12}" cy="${y}" r="${r}"/>`;
const gen = (x, y) => `<circle class="mp-eq" cx="${x}" cy="${y}" r="26"/><text class="mp-sym" x="${x}" y="${y + 2}">G</text><text class="mp-sym mp-sym--s" x="${x}" y="${y + 17}">~</text>`;
const motor = (x, y) => `<circle class="mp-eq" cx="${x}" cy="${y}" r="16"/><text class="mp-sym mp-sym--m" x="${x}" y="${y + 1}">M</text>`;
const conv = (x, y, s = 54) => `<rect class="mp-eq" x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}"/><path class="mp-eq-l" d="M${x - s / 2} ${y + s / 2}L${x + s / 2} ${y - s / 2}"/>`
  + `<text class="mp-sym mp-sym--s" x="${x - s / 4}" y="${y - s / 8}">~</text><text class="mp-sym mp-sym--s" x="${x + s / 4}" y="${y + s / 4}">=</text>`;
const box = (x, y, w, h, txt = '') => `<rect class="mp-eq" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="2"/>${txt ? `<text class="mp-sym mp-sym--b" x="${x}" y="${y + 1}">${esc(txt)}</text>` : ''}`;
// Kasten mit Beschriftung, der mit dem Text wächst (min … max) und darüber zweizeilig umbricht;
// at: Bezugskante 'c' (Mitte bei x), 'l' (linke Kante bei x)
function tbox(x, y, txt, { min = 44, max = 150, h = 30, at = 'c' } = {}) {
  const ls = lines(txt, max - 16, FS.b);
  const w = Math.min(max, Math.max(min, Math.ceil(Math.max(...ls.map((l) => tw(l, FS.b))) + 18)));
  const hh = ls.length > 1 ? Math.max(h, 36) : h;
  const cx = at === 'l' ? x + w / 2 : x;
  const text = ls.length > 1
    ? ls.map((l, i) => `<text class="mp-sym mp-sym--b" x="${cx}" y="${y + (i ? 8 : -6)}">${esc(l)}</text>`).join('')
    : `<text class="mp-sym mp-sym--b" x="${cx}" y="${y + 1}">${esc(ls[0])}</text>`;
  return `<rect class="mp-eq" x="${cx - w / 2}" y="${y - hh / 2}" width="${w}" height="${hh}" rx="2"/>${text}`;
}
const frame = (x, y, w, h) => `<rect class="mp-frame" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>`;
const arrowD = (x, y) => `<path class="mp-arr" d="M${x - 6} ${y - 9}H${x + 6}L${x} ${y}Z"/>`;
const arrowR = (x, y) => `<path class="mp-arr" d="M${x - 9} ${y - 6}V${y + 6}L${x} ${y}Z"/>`;
const earth = (x, y) => `<path class="mp-eq-l" d="M${x} ${y - 8}V${y}M${x - 9} ${y}H${x + 9}M${x - 6} ${y + 4}H${x + 6}M${x - 3} ${y + 8}H${x + 3}"/>`;
const fuse = (x, y) => `<rect class="mp-eq" x="${x - 5}" y="${y - 10}" width="10" height="20"/><path class="mp-eq-l" d="M${x} ${y - 10}V${y + 10}"/>`;
const pole = (x, y) => `<path class="mp-eq-l" d="M${x} ${y - 9}V${y + 22}M${x - 8} ${y - 9}H${x + 8}"/>`;
const turbine = (x, y) => `<path class="mp-eq-l" d="M${x} ${y}V${y + 40}"/><path class="mp-eq-l" d="M${x} ${y}L${x - 2} ${y - 22}M${x} ${y}L${x + 19} ${y + 10}M${x} ${y}L${x - 18} ${y + 12}"/><circle class="mp-eq" cx="${x}" cy="${y}" r="3"/>`;
const pv = (x, y) => `<path class="mp-eq-l" d="M${x - 22} ${y + 10}L${x - 12} ${y - 12}H${x + 22}L${x + 12} ${y + 10}Z M${x - 17} ${y - 1}H${x + 17} M${x - 5} ${y - 12}L${x - 10} ${y + 10} M${x + 9} ${y - 12}L${x + 4} ${y + 10}"/><path class="mp-eq-l" d="M${x} ${y + 10}V${y + 26}"/>`;
// RITZ-Symbole
const rct = (x, y, r = 11) => `<circle class="mp-r" cx="${x}" cy="${y}" r="${r}"/>`;
const rvtR = (x, y, len = 22) => `<path class="mp-r-l" d="M${x} ${y}H${x + len}"/><circle class="mp-r mp-r--f" cx="${x + len + 8}" cy="${y}" r="8"/><circle class="mp-r mp-r--f" cx="${x + len + 20}" cy="${y}" r="8"/>`;
const rvtL = (x, y, len = 22) => `<path class="mp-r-l" d="M${x} ${y}H${x - len}"/><circle class="mp-r mp-r--f" cx="${x - len - 8}" cy="${y}" r="8"/><circle class="mp-r mp-r--f" cx="${x - len - 20}" cy="${y}" r="8"/>`;
const rvtU = (x, y, len = 18) => `<path class="mp-r-l" d="M${x} ${y}V${y - len}"/><circle class="mp-r mp-r--f" cx="${x}" cy="${y - len - 8}" r="8"/><circle class="mp-r mp-r--f" cx="${x}" cy="${y - len - 20}" r="8"/>`;
const rvtD = (x, y, len = 18) => `<path class="mp-r-l" d="M${x} ${y}V${y + len}"/><circle class="mp-r mp-r--f" cx="${x}" cy="${y + len + 8}" r="8"/><circle class="mp-r mp-r--f" cx="${x}" cy="${y + len + 20}" r="8"/>`;
const rhouse = (x, y, w, h) => `<rect class="mp-r mp-r--h" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="7"/>`;
const rbox = (x, y, w, h, txt = '') => `<rect class="mp-r mp-r--f" x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="2"/>${txt ? `<text class="mp-sym mp-sym--r" x="${x}" y="${y + 1}">${esc(txt)}</text>` : ''}`;
const rbar = (points) => `<path class="mp-r-bar" d="M${points.map((p) => p.join(' ')).join('L')}"/><path class="mp-r-bar2" d="M${points.map((p) => p.join(' ')).join('L')}"/>`;
// Kennziffer mit Hinweislinie vom Symbol (ax, ay) zur Ziffer (x, y)
const badge = (n, x, y, ax, ay) => `${ax != null ? `<path class="mp-lead" d="M${ax} ${ay}L${x} ${y}"/>` : ''}<g class="mp-b"><circle cx="${x}" cy="${y}" r="13"/><text x="${x}" y="${y + 1}">${n}</text></g>`;

// ---------- Energieversorgung und Netze ----------
// Gruppen: 1 beglaubigungsfähige MS-Wandler, 2 Kombiwandler, 3 Freiluftwandler, 4 Hochspannungswandler, 5 Zusatzbürde
function netze(L) {
  const P = plan();
  // Umspannwerk: 110-kV-Schiene, Abgang mit Hochspannungswandlern, Transformator 110/20 kV
  P.bus(60, 330, 64, 'hv').t(60, 48, '110 kV', { c: 'hv' });
  P.w([[200, 64], [200, 187]], 'hv').e(brk(200, 92)).e(xfv(200, 202)).w([[200, 219], [200, 280]]);
  P.p(4, rct(200, 124)).p(4, rvtR(200, 150, 20)).p(4, badge(4, 146, 124, 189, 124));
  P.t(230, 206, L.sub, { c: 's' });
  // 20-kV-Schiene
  P.bus(60, 930, 280).t(60, 266, '20 kV', { c: 'v' });
  // Messfeld: beglaubigungsfähige Strom- und Spannungswandler, Zähler mit Zusatzbürde
  P.w([[360, 280], [360, 418]]).e(brk(360, 306)).e(arrowD(360, 428)).t(346, 302, L.panel, { a: 'end', c: 's' });
  P.p(1, rct(360, 340)).p(1, rvtL(360, 374, 18)).p(1, badge(1, 300, 330, 349, 338));
  P.s([[371, 340], [460, 340], [460, 380]]).e(box(460, 396, 44, 30, 'kWh')).t(460, 428, L.meter, { a: 'middle', c: 's' });
  P.p(5, rbox(420, 340, 22, 10)).p(5, badge(5, 420, 312, 420, 334));
  // Abgang zur Übergabestation mit metallgekapseltem Kombiwandler
  P.e(frame(540, 338, 190, 88)).t(612, 330, L.station, { c: 'f' });
  P.w([[600, 280], [600, 404], [700, 404]]).e(brk(600, 306)).e(arrowR(710, 404)).t(720, 420, L.customer, { a: 'end', c: 's' });
  P.p(2, rhouse(612, 366, 66, 34)).p(2, rct(600, 366)).p(2, rvtR(611, 366, 6)).p(2, badge(2, 680, 366, 646, 366));
  // Abgang Freileitung mit Freiluftwandlern
  P.w([[800, 280], [800, 352], [930, 352]]).e(brk(800, 306)).e(pole(900, 352)).e(arrowR(940, 352));
  P.p(3, rct(842, 352)).p(3, rvtU(866, 352, 14)).p(3, badge(3, 842, 404, 842, 363));
  P.t(816, 434, L.ohl, { c: 's' });
  return P;
}

// ---------- Schaltanlagenbau ----------
function schaltanlagenbau(L) {
  const P = plan();
  // Transformator, feststoffisolierte Stromschiene zum Einspeisefeld
  P.w([[110, 52], [110, 112]], 'hv').e(xfv(110, 128)).t(136, 122, L.trafo, { c: 's' }).t(136, 142, '110/20 kV', { c: 'hv' });
  P.p(5, rbar([[110, 145], [110, 214], [254, 214], [254, 330], [300, 330]])).p(5, badge(5, 180, 240, 180, 218));
  // Schaltanlage: Sammelschiene über fünf Felder
  P.bus(280, 930, 96).t(930, 80, '20 kV', { a: 'end', c: 'v' });
  const F = [[300, L.p1], [430, L.p2], [560, L.p3], [690, L.p4], [820, L.p5]];
  F.forEach(([x, name]) => P.e(frame(x - 54, 112, 108, 300)).t(x - 48, 432, name, { c: 's' }));
  // Einspeisung: Leistungsschalter, Stromwandler
  P.w([[300, 96], [300, 330]]).e(brk(300, 140)).p(1, rct(300, 190)).p(1, badge(1, 268, 252, 292, 198));
  // Abgang luftisoliert
  P.w([[430, 96], [430, 380]]).e(brk(430, 140)).e(arrowD(430, 390)).p(1, rct(430, 196)).p(1, badge(1, 466, 236, 440, 204));
  // Messfeld: Spannungswandler über Sicherung
  P.w([[560, 96], [560, 170]]).e(fuse(560, 160)).p(2, rvtD(560, 170, 6)).e(earth(560, 236)).p(2, badge(2, 600, 196, 570, 192));
  // Abgang gasisoliert: metallgekapselter Wandler mit Innenkonus
  P.w([[690, 96], [690, 380]]).e(brk(690, 140)).e(arrowD(690, 390));
  P.p(3, rhouse(690, 214, 40, 50)).p(3, rct(690, 214)).p(3, badge(3, 730, 262, 704, 230));
  // Abgang mit Sensoren und digitalem Schutz
  P.w([[820, 96], [820, 380]]).e(brk(820, 140)).e(arrowD(820, 390));
  P.p(4, rct(820, 200, 9)).p(4, rbox(842, 200, 14, 14)).p(4, badge(4, 784, 260, 812, 208));
  P.s([[842, 207], [842, 316], [882, 316]]).e(tbox(882, 316, L.ied, { min: 56, max: 76, at: 'l' }));
  return P;
}

// ---------- Industrie und Infrastruktur ----------
function industrie(L) {
  const P = plan();
  P.t(40, 48, L.grid, { c: 'v' });
  P.w([[110, 60], [110, 94]]).e(xfv(110, 112)).t(140, 116, L.trafo, { c: 's' });
  // feststoffisolierte Stromschiene zur Hauptverteilung
  P.p(1, rbar([[110, 129], [110, 170], [250, 170], [250, 210]])).p(1, badge(1, 180, 140, 180, 165));
  P.bus(230, 930, 210).t(930, 196, L.main, { a: 'end', c: 's' });
  // Kabelabgang mit nachgerüstetem Kabelumbau-Stromwandler
  P.w([[330, 210], [330, 372]]).e(brk(330, 236)).e(motor(330, 390));
  P.p(2, `<path class="mp-r" d="M319.6 293A12 12 0 0 1 340.4 293M340.4 307A12 12 0 0 1 319.6 307"/>`).p(2, badge(2, 290, 330, 321, 308)).t(346, 304, L.retro, { c: 's', max: 108 });
  // Hochstromabgang zum Lichtbogenofen
  P.w([[480, 210], [480, 362]], 'thick').e(brk(480, 236)).e(box(480, 384, 50, 40, ''));
  P.e(`<path class="mp-eq-l" d="M470 364V396M480 364V398M490 364V396"/>`).t(480, 428, L.furnace, { a: 'middle', c: 's' });
  P.p(3, rct(480, 300, 14)).p(3, badge(3, 520, 296, 494, 300));
  // Gleichrichter und Elektrolyse mit DC-Messung
  P.w([[640, 210], [640, 266]]).e(brk(640, 236)).e(conv(640, 294, 48)).w([[640, 318], [640, 372]], 'dc');
  P.e(box(640, 392, 58, 36, '+ −')).t(640, 428, L.electro, { a: 'middle', c: 's' });
  P.p(4, rct(640, 346)).p(4, badge(4, 600, 346, 629, 346));
  // explosionsgefährdeter Bereich
  P.e(`<rect class="mp-ex" x="740" y="262" width="190" height="160" rx="4"/>`).t(752, 284, L.ex, { c: 'f', max: 108 });
  P.w([[872, 210], [872, 372]]).e(brk(872, 236)).e(motor(872, 390));
  P.p(5, rct(872, 330)).p(5, badge(5, 828, 330, 861, 330));
  return P;
}

// ---------- Bahntechnik ----------
// Gruppen: 1 Bahnwandler (Fahrzeug), 2 16,7 Hz (stationär)
function bahn(L) {
  const P = plan();
  // Kettenwerk: Tragseil und Fahrdraht mit Hängern
  const hang = [];
  for (let x = 60; x <= 920; x += 60) hang.push(`M${x} 50V72`);
  P.e(`<path class="mp-eq-l mp-eq-l--thin" d="M40 50H930${hang.join('')}"/>`);
  P.w([[40, 72], [930, 72]]).t(40, 34, L.ocl, { c: 'v' });
  // Fahrzeug: Stromabnehmer, Dachausrüstung mit Spannungs- und Stromwandler, Transformator, Antrieb
  P.e(`<path class="mp-eq-l" d="M184 74H216M200 76L220 96L200 116L180 96ZM200 116V138"/>`);
  P.e(`<rect class="mp-veh" x="60" y="138" width="440" height="196" rx="18"/>`).t(484, 166, L.vehicle, { a: 'end', c: 'f' });
  P.w([[200, 138], [200, 248]]).w([[200, 284], [200, 300], [300, 300], [300, 284]]);
  P.p(1, rvtL(200, 160, 18)).p(1, rct(200, 206)).p(1, badge(1, 246, 196, 211, 206));
  P.e(xfv(200, 266, 15)).e(conv(300, 262, 40)).w([[320, 262], [370, 262]]).e(motor(386, 262));
  // Energiemessung auf dem Fahrzeug
  P.s([[154, 160], [104, 160], [104, 220]]).s([[189, 206], [140, 206], [140, 220]]).e(tbox(116, 238, L.emf, { min: 104, max: 104, h: 36 }));
  // Radsätze, Schiene, Rückstrom über den Rückstromwandler
  P.e(`<circle class="mp-eq" cx="120" cy="348" r="14"/><circle class="mp-eq" cx="400" cy="348" r="14"/>`);
  P.w([[40, 362], [930, 362]], 'lv').t(930, 386, L.rail, { a: 'end', c: 's' });
  P.w([[200, 300], [200, 320], [140, 320], [124, 334]], 'lv');
  P.p(1, rct(170, 320, 9)).p(1, badge(1, 170, 292, 170, 311)).t(214, 324, L.ret, { c: 's' });
  // Unterwerk: 110-kV-Bahnstromnetz, Transformator, Speisung des Fahrdrahts, stationäre Spannungs- und Stromwandler
  P.t(930, 418, L.railgrid, { a: 'end', c: 'hv' });
  P.w([[800, 400], [800, 330]], 'hv').e(xfv(800, 312)).w([[800, 295], [800, 72]]).e(brk(800, 250)).t(776, 318, L.sub, { a: 'end', c: 's' });
  P.p(2, rct(800, 150)).p(2, rvtR(800, 200, 18)).p(2, badge(2, 756, 168, 789, 154));
  return P;
}

// ---------- Erneuerbare, HGÜ und Power Quality ----------
function erneuerbare(L) {
  const P = plan().view(22, 392);
  // Wind und Photovoltaik speisen auf eine Mittelspannungsschiene
  P.e(turbine(60, 92)).e(turbine(110, 80)).e(pv(150, 120)).t(40, 44, L.gen, { c: 's' });
  P.w([[60, 132], [60, 170]]).w([[110, 120], [110, 170]]).w([[150, 146], [150, 170]]);
  P.bus(40, 260, 170).t(40, 196, L.mv, { c: 'v' });
  // Netzanschlusspunkt mit Breitbandwandlern für die Power-Quality-Messung
  P.w([[230, 170], [230, 234]]).e(xfv(230, 252)).w([[230, 269], [230, 300], [330, 300]], 'hv');
  P.p(1, rct(230, 206)).p(1, rvtL(230, 206, 26)).p(1, badge(1, 286, 160, 238, 198));
  P.s([[241, 206], [300, 206]]).e(box(330, 206, 56, 30, 'PQ')).t(262, 232, L.pcc, { c: 's' });
  // Stromrichterstation, Gleichstromstrecke, zweite Station, Wechselstromnetz
  P.e(conv(372, 300, 64)).t(372, 356, L.conv, { a: 'middle', c: 's' });
  P.w([[404, 284], [736, 284]], 'dc').w([[404, 316], [736, 316]], 'dc').t(570, 264, L.dc, { a: 'middle', c: 'v' });
  P.e(conv(768, 300, 64)).w([[800, 300], [870, 300]], 'hv').vbus(870, 120, 380, 'hv').t(870, 104, L.grid, { a: 'middle', c: 'hv' });
  P.p(2, rct(490, 284)).p(2, rct(650, 316)).p(2, badge(2, 490, 236, 490, 273)).p(2, badge(2, 650, 364, 650, 327));
  P.p(3, `<path class="mp-r-l" d="M570 316V340"/>`).p(3, rbox(570, 352, 12, 24)).p(3, `<path class="mp-r-l" d="M570 364V378"/>`).e(earth(570, 386)).p(3, badge(3, 608, 352, 576, 352));
  // statischer Blindleistungskompensator am Netz
  P.w([[870, 160], [920, 160], [920, 200]], 'hv').e(box(920, 222, 44, 40, 'SVC')).p(2, rct(920, 184, 9)).p(2, badge(2, 920, 130, 920, 175));
  return P;
}

// ---------- Kraftwerke und Generatoren ----------
function kraftwerke(L) {
  const P = plan().view(62, 378);
  P.e(gen(90, 170)).t(90, 220, L.gen, { a: 'middle', c: 's' });
  // Generatorableitung mit Generatorwandlern, Generatorschalter, Maschinentransformator
  P.w([[116, 170], [432, 170]], 'thick').e(brk(300, 170));
  P.p(1, rct(190, 170, 15)).p(1, rct(360, 170, 15)).p(1, badge(1, 190, 120, 190, 155)).p(1, badge(1, 360, 120, 360, 155));
  P.e(xfh(458, 170)).w([[475, 170], [600, 170]], 'hv').t(458, 136, L.step, { a: 'middle', c: 's' });
  // Schaltanlage Höchstspannung mit Hochspannungswandlern
  P.p(3, rct(540, 170)).p(3, rvtU(570, 170, 16)).p(3, badge(3, 540, 230, 540, 181));
  P.vbus(600, 80, 260, 'hv').t(612, 96, L.hv, { c: 'hv' });
  P.w([[600, 120], [740, 120], [930, 120]], 'hv').e(brk(700, 120)).e(arrowR(930, 120)).t(930, 102, L.grid, { a: 'end', c: 's' });
  // Eigenbedarf: Abzweig, Transformator, Mittelspannungsschiene mit Eigenversorgungswandler
  P.w([[400, 170], [400, 266]]).e(xfv(400, 284)).w([[400, 301], [400, 340]]).t(430, 288, L.aux, { c: 's' });
  P.bus(250, 760, 340).t(250, 326, L.auxbus, { c: 'v' });
  P.w([[320, 340], [320, 400]]).e(motor(320, 416)).w([[480, 340], [480, 400]]).e(motor(480, 416));
  P.w([[640, 340], [640, 360]]).p(2, rvtD(640, 360, 4)).p(2, badge(2, 600, 396, 630, 384));
  P.s([[652, 392], [735, 392]]).e(tbox(735, 392, L.sec, { min: 100, max: 160, h: 34, at: 'l' }));
  return P;
}

// ---------- Mess-, Prüf- und Zählertechnik ----------
function messtechnik(L) {
  const P = plan();
  // Verrechnungsmessung an einer Mittelspannungsleitung
  P.t(40, 34, L.billing, { c: 'f' });
  P.w([[40, 90], [560, 90]]).e(arrowR(568, 90)).t(40, 72, '20 kV', { c: 'v' }).t(560, 72, L.customer, { a: 'end', c: 's' });
  P.p(1, rct(180, 90)).p(1, rvtD(300, 90, 12)).p(1, badge(1, 226, 50, 188, 82)).p(1, badge(1, 340, 132, 312, 118));
  // Offenspannungsschutz im Stromwandler, Prüfklemmleiste, Zähler
  P.p(3, rbox(180, 152, 34, 18, 'EOSS')).p(3, `<path class="mp-r-l" d="M180 101V143"/>`).p(3, badge(3, 132, 152, 163, 152));
  P.s([[180, 161], [180, 236]]).s([[300, 142], [300, 236]]);
  P.e(tbox(240, 252, L.terminal, { min: 150, max: 180 }));
  P.s([[240, 267], [240, 320]]).e(box(240, 344, 64, 46, 'kWh')).t(240, 390, L.meter, { a: 'middle', c: 's' });
  // Prüflabor: Laborwandler und Normalwandler im Vergleich
  P.e(frame(620, 40, 310, 370)).t(632, 66, L.lab, { c: 'f' });
  P.w([[660, 176], [660, 136], [880, 136], [880, 176]], 'lv').e(tbox(770, 136, L.source, { min: 76, max: 150, h: 28 }));
  P.w([[660, 176], [660, 306], [880, 306], [880, 176]], 'lv');
  P.p(2, rct(720, 306, 14)).p(2, badge(2, 720, 360, 720, 320)).e(`<circle class="mp-eq mp-eq--o" cx="820" cy="306" r="14"/>`);
  P.t(820, 342, L.ref, { a: 'middle', c: 's' });
  P.s([[734, 306], [770, 306], [770, 246]]).s([[806, 306], [790, 306], [790, 246]]).e(tbox(780, 230, L.comp, { min: 86, max: 130 }));
  return P;
}

const MAPS = { netze, schaltanlagenbau, industrie, bahn, erneuerbare, kraftwerke, messtechnik };

// Schaltbild einer Branche als SVG (für Vorleseprogramme verborgen – die Legende nennt die Einbauorte); L = Beschriftungen
export function sectorMap(sector, L) {
  const f = MAPS[sector];
  return f ? f(L).svg() : '';
}
export const hasMap = (sector) => !!MAPS[sector];
