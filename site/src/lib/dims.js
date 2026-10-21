// Abmessungen aus den Datenblatt-Texten lesen (Build): Außenmaße B/H/T, Innen-Ø, Fensteröffnung,
// Schienen und Kabel, Tragschiene, Kreise. Ergebnis kompakt (für Index und Schemazeichnung).
const num = (s) => {
  const v = parseFloat(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(v) && v > 0 ? v : null;
};
const N = '(\\d+(?:[.,]\\d+)?)';
const TRIPLE = new RegExp(`(\\*\\*|${N})\\s*\\*?\\s*\\/\\s*${N}\\s*\\*?\\s*\\/\\s*${N}(?:\\s*(?:…|\\.\\.\\.|-)\\s*${N})?\\s*\\*?\\s*mm`, 'i');
const BHT = /\b(?:B\s*\/\s*H\s*\/\s*[TL]|W\s*\/\s*H\s*\/\s*[LDT])\b|Abmessungen|Außenmaße|Outer dimensions|Größe\s*\(/i;
const TRIPLE_PRE = new RegExp(`in\\s*mm\\s*:?\\s*${N}\\s*\\/\\s*${N}\\s*\\/\\s*${N}`, 'i');
const INNER = new RegExp(`(?:Innen-?\\s*Ø|Innendurchmesser|inner\\s*(?:Ø|diameter))\\s*:?\\s*${N}((?:\\s*(?:,|oder|or|und|and)\\s*\\d+(?:[.,]\\d+)?)*)\\s*mm`, 'i');
const WIN = new RegExp(`(?:Fensteröffnung|Fenster|Durchgang|window(?:\\s*opening)?|aperture)\\s*:?\\s*${N}\\s*[x×]\\s*${N}\\s*mm`, 'i');
const BAR = new RegExp(`(?:Schienen?|bus\\s*bars?|bars?|rails?)\\s*(?:bis|up to)?\\s*(?:(\\d)\\s*[x×]\\s*)?${N}\\s*[x×]\\s*${N}\\s*mm`, 'i');
const CABLE = new RegExp(`(?:Kabel|Rundleiter|cables?|round\\s*(?:cables?|conductors?))\\s*(?:bis|up to)?\\s*Ø\\s*${N}\\s*mm`, 'i');
const WIDTH = new RegExp(`(?:Breite|width)\\s*:?\\s*${N}\\s*mm`, 'i');
const HEIGHT = new RegExp(`(?:Höhe|height)\\s*:?\\s*${N}((?:\\s*(?:,|und|and)\\s*\\d+(?:[.,]\\d+)?)*)\\s*mm`, 'i');
const DEPTH = new RegExp(`(?:Tiefe|depth)\\s*:?\\s*${N}((?:\\s*(?:,|und|and)\\s*\\d+(?:[.,]\\d+)?)*)\\s*mm`, 'i');
const CIRC = /(?:bis\s*|up to\s*|(\d+)\s*(?:…|\.\.\.|-)\s*)?(\d+)\s*(?:Kreise|circuits)/i;
const NBARS = /(zwei oder drei|two or three|drei|three|zwei|two)\s*(?:Schienen|bus\s*bars|bars|rails)/i;
const BOLT = /Bolzen\s*M\s*(\d+)|bolts?\s*M\s*(\d+)/i;

const list = (first, rest) => [num(first), ...String(rest || '').split(/,|oder|or|und|and/).map(num)].filter(Boolean);

export function readDims(desc) {
  const lines = [...(desc?.de || []), ...(desc?.en || [])];
  if (!lines.length) return null;
  const d = {};
  // Außenmaße: erstes Tripel nach einem B/H/T-Hinweis (gleiche oder vorige Zeile)
  let armed = false;
  for (const l of lines) {
    if (BHT.test(l)) armed = true;
    const pre = TRIPLE_PRE.exec(l);
    if (pre) { d.box = [num(pre[1]), num(pre[2]), num(pre[3])]; break; }
    const m = armed && TRIPLE.exec(l);
    if (m) {
      const w = m[1] === '**' ? null : num(m[2]);
      const h = num(m[3]);
      const t = num(m[4]);
      if (h && t) { d.box = [w, h, t]; if (m[5]) d.box2 = num(m[5]); }
      break;
    }
  }
  for (const l of lines) {
    let m;
    for (const mm of l.matchAll(new RegExp(INNER.source, 'gi'))) d.inner = [...(d.inner || []), ...list(mm[1], mm[2])];
    if (!d.win && (m = WIN.exec(l))) d.win = [num(m[1]), num(m[2])];
    if (!d.bar && (m = BAR.exec(l))) { d.bar = [num(m[2]), num(m[3])]; if (m[1]) d.nbar = +m[1]; }
    if (!d.cable && (m = CABLE.exec(l))) d.cable = num(m[1]);
    if (!d.w && (m = WIDTH.exec(l))) d.w = num(m[1]);
    if (!d.h && (m = HEIGHT.exec(l))) d.h = list(m[1], m[2]);
    if (!d.t && (m = DEPTH.exec(l))) d.t = list(m[1], m[2]);
    if (!d.circ && (m = CIRC.exec(l))) d.circ = +m[2];
    if (!d.nbar && (m = NBARS.exec(l))) d.nbar = /drei|three/i.test(m[1]) ? 3 : 2;
    if (!d.bolt && (m = BOLT.exec(l))) d.bolt = +(m[1] || m[2]);
  }
  const all = lines.join(' ');
  if (/TH\s*35|Tragschiene|Hutschiene|Hutprofil|DIN\s*rail|top-hat rail/i.test(all)) d.din = 1;
  if (/Klemmenabdeckung|Klemmabdeckung|terminal cover/i.test(all)) d.cover = 1;
  if (/Anschlussleitung|connecting (?:cable|lead)s?|flying leads?/i.test(all)) d.leads = 1;
  if (/kapazitive[nr]? Teiler|capacitive divider/i.test(all)) d.ck = 1;
  if (d.box && !d.box[0] && d.w) d.box[0] = d.w;
  // Außenmaße aus Einzelangaben ergänzen
  if (!d.box && (d.w || d.h || d.t)) {
    const h = d.h?.length ? Math.min(...d.h) : null;
    const t = d.t?.length ? Math.min(...d.t) : null;
    if (d.w && h && t) d.box = [d.w, h, t];
  }
  // offensichtliche Fehlgriffe verwerfen
  if (d.inner) d.inner = [...new Set(d.inner.filter((x) => x >= 4 && x <= 800))].sort((a, b) => a - b);
  if (d.inner && !d.inner.length) delete d.inner;
  if (d.bar && (!d.bar[0] || !d.bar[1] || d.bar[0] > 400)) delete d.bar;
  if (d.win && (!d.win[0] || !d.win[1])) delete d.win;
  for (const k of ['w', 'h', 't']) if (d[k] !== undefined && (!d[k] || (Array.isArray(d[k]) && !d[k].length))) delete d[k];
  return Object.keys(d).length ? d : null;
}

// Lesbare Maßzeilen (für Datenblatt-Tabelle und Zeichnung)
export function dimRows(d, L, fmt) {
  if (!d) return [];
  const rows = [];
  const mm = (v) => `${fmt(v)} mm`;
  if (d.box) rows.push([L.box, `${d.box.map((v, i) => (v ? fmt(v) : '–') + (i === 2 && d.box2 ? `…${fmt(d.box2)}` : '')).join(' / ')} mm`]);
  else if (d.h?.length) rows.push([L.height, d.h.length > 1 ? `${fmt(Math.min(...d.h))}…${fmt(Math.max(...d.h))} mm` : mm(d.h[0])]);
  if (d.inner) rows.push([L.inner, d.inner.length > 3 ? `${fmt(d.inner[0])}…${fmt(d.inner[d.inner.length - 1])} mm` : `${d.inner.map(fmt).join(', ')} mm`]);
  if (d.win) rows.push([L.win, `${fmt(d.win[0])} × ${fmt(d.win[1])} mm`]);
  if (d.bar) rows.push([L.bar, `${d.nbar && d.nbar > 1 ? d.nbar + ' × ' : ''}${fmt(d.bar[0])} × ${fmt(d.bar[1])} mm`]);
  if (d.cable) rows.push([L.cable, `Ø ${mm(d.cable)}`]);
  if (d.din) rows.push([L.din, 'TH 35 (DIN EN 60715)']);
  return rows;
}
