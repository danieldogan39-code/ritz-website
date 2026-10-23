// Titelkarten für Beiträge ohne Foto (Kartenraster und Kopf der Beitragsseite): statt einer Musterfläche ein
// Schlagwort (Typenbezeichnung, Abkürzung, Ort oder Verordnungsnummer) mit Unterzeile und ein Motiv im Stil einer
// technischen Zeichnung auf Millimeterpapier – Ringkernwandler als Maßzeichnung, Gleichrichter-Schaltzeichen (HGÜ),
// Schreiben mit Siegel, Kalenderblatt mit dem Datum des Beitrags oder Punktkarte mit dem Ort.
// Kuratierte Angaben stehen in NEWS_COVERS (src/lib/catalog.js). Ohne Eintrag wird das Schlagwort aus dem Titel
// gewonnen (Typen, Abkürzungen, Nummern; sonst die Kategorie) und das Motiv nach Kategorie oder Kartenlage gewählt.
// Farben nur über Tokens, damit die Karten im hellen und dunklen Modus stimmen; keine Bewegung außer beim Zeigen.
import { esc } from '../lib/util.js';
import { NEWS_COVERS, MAP_STORIES } from '../lib/catalog.js';
import { projectLL } from '../lib/geo.js';

const f1 = (v) => (Math.round(v * 10) / 10).toString();
const pick = (v, lang) => (v && typeof v === 'object' ? v[lang] || v.en || v.de || Object.values(v)[0] : v || '');
const STOP = new Set(['RITZ', 'GMBH', 'INC', 'AG', 'KG', 'CO', 'USA']);

// Schlagwort aus dem Titel: Verordnungsnummer, sonst Typenbezeichnungen und Abkürzungen (höchstens zwei)
export function coverKeyword(title) {
  const reg = /\(EU\)\s*\d{4}\/\d+/.exec(title);
  if (reg) return reg[0].replace(/\s+/, '\n');
  const codes = title.split(/\s+/).map((w) => w.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, ''))
    .filter((w) => /^\p{Lu}[\p{Lu}\d]{2,}(?:[-/][\p{Lu}\d]+)*$/u.test(w) && !STOP.has(w));
  return [...new Set(codes)].slice(0, 2).join('\n');
}

// ---------- Motive (Linienzeichnung; Klassen: l = Kontur, t = Hilfslinie, a = Akzent rot, f = Fläche rot) ----------
const arc = (cx, cy, r, a0, a1) => {
  const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${f1(x0)} ${f1(y0)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f1(x1)} ${f1(y1)}`;
};
const MOTIFS = {
  // Ringkern-Stromwandler von vorn: Mittellinien, Körper, Nut, Fenster mit Maßlinie, Klemmenkasten, roter Bogen
  ring: () => ({ vb: [124, 124], svg: `
    <path class="nc__t nc__dd" d="M62 2V122M2 62H122"/>
    <circle class="nc__l" cx="62" cy="62" r="46"/><circle class="nc__t" cx="62" cy="62" r="39"/><circle class="nc__l" cx="62" cy="62" r="23"/>
    <path class="nc__l" d="M53 16V8H71V16"/><path class="nc__t" d="M57 8V5M67 8V5"/>
    <path class="nc__a" d="${arc(62, 62, 46, -62, -22)}"/>
    <path class="nc__t" d="M39 64V118M85 64V118M39 113H85"/><path class="nc__l" d="M44 110.5 39 113 44 115.5M80 110.5 85 113 80 115.5"/>` }),
  // Metallgekapselter Blockwandler von vorn (Bauart der GB-Familie): Gehäuse mit abgeschrägtem Dach, Anschlusskonus
  // im Flansch (Primäranschluss rot), Klemmenkasten, Ringschrauben, Grundplatte, Mittellinien und Höhenmaß
  block: () => ({ vb: [124, 124], svg: `
    <path class="nc__t nc__dd" d="M60 2V122M8 50H112"/>
    <path class="nc__l" d="M22 108V30L34 18H86L98 30V108Z"/><path class="nc__l" d="M12 108H108V114H12Z"/><path class="nc__t" d="M18 111h6M96 111h6"/>
    <circle class="nc__l" cx="44" cy="11" r="4"/><circle class="nc__l" cx="76" cy="11" r="4"/><path class="nc__l" d="M44 15V18M76 15V18"/>
    <circle class="nc__l" cx="60" cy="50" r="17"/><circle class="nc__a" cx="60" cy="50" r="8.5"/>
    <path class="nc__t" d="M51 41.2a1.4 1.4 0 1 0 .1 0M69 41.2a1.4 1.4 0 1 0 .1 0M51 58.2a1.4 1.4 0 1 0 .1 0M69 58.2a1.4 1.4 0 1 0 .1 0"/>
    <rect class="nc__l" x="42" y="80" width="36" height="18"/><path class="nc__t" d="M50 86v6M60 86v6M70 86v6"/>
    <path class="nc__t" d="M100 18H118M110 18V108M100 108H118"/><path class="nc__l" d="M107.5 23 110 18 112.5 23M107.5 103 110 108 112.5 103"/>` }),
  // HGÜ: Wechselstrom läuft in den Stromrichter (Schaltzeichen mit Diagonale, ~ und =), heraus kommt Gleichstrom
  dc: () => {
    let s = '';
    for (let x = 0; x <= 52; x += 2) s += `${x ? 'L' : 'M'}${f1(4 + x)} ${f1(50 - 13 * Math.sin((x / 52) * 3 * Math.PI))}`;
    return { vb: [200, 100], right: true, svg: `
    <path class="nc__l" d="${s}"/>
    <rect class="nc__l" x="62" y="26" width="48" height="48"/><path class="nc__t" d="M62 74 110 26"/>
    <path class="nc__l" d="M68 40c2.5-4 5-4 7.5 0s5 4 7.5 0"/><path class="nc__l" d="M90 58H104"/><path class="nc__l nc__da" d="M90 64H104"/>
    <path class="nc__a" d="M110 44H200"/><path class="nc__a nc__da" d="M110 56H200"/>
    <path class="nc__t" d="M184 34v6M181 37h6M181 63h6"/>` };
  },
  // Schreiben: Blatt mit Eselsohr über einem zweiten Blatt, Zeilen, Siegel
  doc: () => ({ vb: [110, 124], svg: `
    <path class="nc__t" d="M24 10H86V100"/>
    <path class="nc__l" d="M14 18H66L80 32V112H14Z"/><path class="nc__t" d="M66 18V32H80"/>
    <path class="nc__t" d="M24 44H70M24 52H70M24 60H62M24 68H70M24 76H54"/>
    <circle class="nc__a" cx="64" cy="94" r="11"/><circle class="nc__a nc__da" cx="64" cy="94" r="7"/><path class="nc__a" d="M58 104l-3 13 5-3 3 4M70 104l3 13-5-3-3 4"/>` }),
  // Kalenderblatt des Monats, der Tag des Beitrags rot (Woche beginnt am Montag)
  cal: (n) => {
    const [y, m, d] = n.date.split('-').map(Number);
    const first = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    let cells = '', hit = '';
    for (let k = 1; k <= days; k++) {
      const i = first + k - 1, x = 13 + (i % 7) * 12, yy = 36 + Math.floor(i / 7) * 12;
      if (k === d) hit = `<rect class="nc__f" x="${x}" y="${yy}" width="9" height="9"/>`;
      else cells += `M${x} ${yy}h9v9h-9Z`;
    }
    return { vb: [110, 112], svg: `
    <rect class="nc__l" x="6" y="12" width="98" height="96" rx="2"/><path class="nc__l" d="M6 28H104"/><path class="nc__l nc__w" d="M28 6V18M82 6V18"/>
    <path class="nc__t" d="${cells}"/>${hit}` };
  },
};

// Punktkarte: Ausschnitt der Weltkarte (img/world-dots.svg als Maske) mit dem Ort an fester Stelle der Karte
const MAP = { z: 5.5, px: 0.68, py: 0.4 };
function mapLayer(ctx, at) {
  const meta = ctx.data.worldmeta;
  if (!meta) return '';
  const [x, y] = projectLL(meta, at[1], at[0]);
  const xr = x / meta.W, yr = y / meta.H, ar = meta.H / meta.W;
  const left = (MAP.px - xr * MAP.z) * 100;
  const st = `--dots:url('${ctx.base}img/world-dots.svg');width:${f1(MAP.z * 100)}%;left:${left.toFixed(2)}%;--py:${MAP.py};--yz:${(yr * MAP.z * ar).toFixed(4)}`;
  return `<span class="nc__map" aria-hidden="true"><span class="nc__dots" style="${st}"></span><i class="nc__pin" style="left:${MAP.px * 100}%;top:${MAP.py * 100}%"></i></span>`;
}

export function newsCover(ctx, n, { hero = false } = {}) {
  const { t, lang } = ctx;
  const c = NEWS_COVERS[n.id] || {};
  const v = n.v[lang] || n.v[ctx.dl] || n.v.de || Object.values(n.v)[0];
  const story = MAP_STORIES.find((s) => s.news === n.id);
  const at = c.at || (c.motif === 'map' && story ? [story.lat, story.lng] : null) || (!c.motif && story ? [story.lat, story.lng] : null);
  const motif = at ? 'map' : c.motif || { products: 'ring', events: 'cal', references: 'ring', company: 'doc' }[n.cat] || 'ring';
  const kw = pick(c.kw, lang) || coverKeyword(v.title) || t.lbl.newsCat[n.cat] || '';
  const sub = pick(c.sub, lang) || (c.kw || coverKeyword(v.title) ? t.lbl.newsCat[n.cat] || '' : '');
  const lines = kw.split('\n');
  const kl = Math.max(4, ...lines.map((x) => x.length));
  let art = '';
  if (motif === 'map') art = mapLayer(ctx, at);
  else {
    const m = MOTIFS[motif](n);
    art = `<svg class="nc__art${m.right ? ' nc__art--edge' : ''}" viewBox="0 0 ${m.vb[0]} ${m.vb[1]}" style="aspect-ratio:${m.vb[0]} / ${m.vb[1]}" aria-hidden="true" focusable="false">${m.svg}</svg>`;
  }
  // dekorativ: Schlagwort und Unterzeile wiederholen Titel und Kategorie, Vorleseprogramme überspringen die Karte
  return `<span class="nc nc--${motif}${hero ? ' nc--hero' : ''}" style="--kl:${kl}" aria-hidden="true">${art}<span class="nc__txt">${sub ? `<span class="nc__sub">${esc(sub)}</span>` : ''}<b class="nc__kw">${lines.map(esc).join('<br>')}</b></span></span>`;
}
