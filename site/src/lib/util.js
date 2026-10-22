// Hilfsfunktionen (isomorph)
import { LOCALES } from './routes.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Doppelpunkt mit Abstand nach Sprachregel (Französisch: schmales geschütztes Leerzeichen davor)
export const colon = (lang) => (lang === 'fr' ? '\u202f: ' : ': ');
// Fließtext aus HTML (Tags entfernen, Entitäten wie &nbsp; auflösen) – für Anrisse und Meta-Beschreibungen
const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', bdquo: '„', euro: '€', shy: '' };
export const htmlText = (h) => String(h || '').replace(/<[^>]+>/g, ' ')
  .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (ENT[e.toLowerCase()] ?? m)))
  .replace(/\s+/g, ' ').trim();
export const attr = esc;
export const cls = (...a) => a.filter(Boolean).join(' ');
export const join = (arr, sep = '') => arr.filter((x) => x !== null && x !== undefined && x !== false).join(sep);
export const when = (c, f) => (c ? (typeof f === 'function' ? f() : f) : '');

const nfCache = {};
export function fmtNum(v, lang, opts = {}) {
  if (v === null || v === undefined || v === '') return '';
  const key = lang + JSON.stringify(opts);
  nfCache[key] ||= new Intl.NumberFormat(LOCALES[lang] || 'de-DE', { maximumFractionDigits: 2, ...opts });
  return nfCache[key].format(v);
}
export const nbsp = ' ';
export const thin = ' ';

export function fmtKv(list, lang, { max = 4 } = {}) {
  if (!list || !list.length) return '';
  const vals = [...new Set(list)].sort((a, b) => a - b);
  if (vals.length === 1) return `${fmtNum(vals[0], lang)}${nbsp}kV`;
  if (vals.length <= max) return vals.map((v) => fmtNum(v, lang)).join(' / ') + `${nbsp}kV`;
  return `${fmtNum(vals[0], lang)}–${fmtNum(vals[vals.length - 1], lang)}${nbsp}kV`;
}
export function fmtRange(r, lang, unit) {
  if (!r) return '';
  const [a, b] = r;
  const u = unit ? `${nbsp}${unit}` : '';
  return a === b ? `${fmtNum(a, lang)}${u}` : `${fmtNum(a, lang)}–${fmtNum(b, lang)}${u}`;
}
// Genauigkeitsklassen („0.2S“) mit Dezimalkomma außer im Englischen; Liste ohne mehrdeutige Kommas
export const fmtCls = (c, lang) => (lang === 'en' ? String(c) : String(c).replace(/(\d)\.(\d)/g, '$1,$2'));
export const fmtClasses = (list, lang) => (list || []).map((c) => fmtCls(c, lang)).join(lang === 'en' ? ', ' : ' / ');
export function fmtList(list, lang, unit) {
  if (!list || !list.length) return '';
  const u = unit ? `${nbsp}${unit}` : '';
  return list.map((v) => fmtNum(v, lang)).join(' / ') + u;
}
export function fmtBytes(n, lang) {
  if (!n) return '';
  if (n < 1024 * 1024) return `${fmtNum(Math.max(1, Math.round(n / 1024)), lang)}${nbsp}KB`;
  return `${fmtNum(n / 1024 / 1024, lang, { maximumFractionDigits: 1 })}${nbsp}MB`;
}
export function fmtDate(iso, lang, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00Z' : ''));
  return new Intl.DateTimeFormat(LOCALES[lang] || 'de-DE', { ...opts, timeZone: 'UTC' }).format(d);
}
export function slugify(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}
export function telHref(phone) {
  return 'tel:' + String(phone || '').replace(/\(0\)/g, '').replace(/[^\d+]/g, '');
}
export function tpl(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}
export function plural(lang, n, forms) {
  // forms: { one, other }
  const r = new Intl.PluralRules(LOCALES[lang] || 'de-DE').select(n);
  return tpl(forms[r] ?? forms.other, { n: fmtNum(n, lang) });
}

// ---------- Spannungsachse (logarithmisch) ----------
export const AXIS = { min: 0.5, max: 800 };
export const AXIS_TICKS = [0.72, 1.2, 3.6, 12, 36, 72.5, 145, 245, 550];
export const axisPos = (v) => (Math.log10(v) - Math.log10(AXIS.min)) / (Math.log10(AXIS.max) - Math.log10(AXIS.min));
export const axisVal = (t) => 10 ** (Math.log10(AXIS.min) + t * (Math.log10(AXIS.max) - Math.log10(AXIS.min)));
// gängige Isolationsspannungen Um (IEC) für das Einrasten
export const UM_STEPS = [0.72, 1.2, 3.6, 7.2, 12, 17.5, 24, 36, 40.5, 52, 72.5, 123, 145, 170, 245, 362, 420, 550];
export const snapUm = (v) => UM_STEPS.reduce((best, x) => (Math.abs(Math.log(x) - Math.log(v)) < Math.abs(Math.log(best) - Math.log(v)) ? x : best), UM_STEPS[0]);

// ---------- Icons (24er Raster, Linien) ----------
const P = {
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  menu: '<path d="M3 7h18M3 12h18M3 17h18"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 7 9 6 9-6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  compare: '<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
  clipboardAdd: '<rect x="5" y="4" width="14" height="17" rx="1"/><path d="M9 4V3h6v1M12 9.5v7M8.5 13h7"/>',
  list: '<path d="M9 6h12M9 12h12M9 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01" stroke-width="3"/>',
  grid: '<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="1"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="1"/><path d="M8 7V4h8v3M3 13h18"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  zoomin: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2M8 11h6M11 8v6"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  print: '<path d="M7 9V3h10v6M7 18H4v-8h16v8h-3M7 14h10v7H7z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  ruler: '<path d="M3 16.5 16.5 3 21 7.5 7.5 21z"/><path d="m7 13 2 2M10 10l1.5 1.5M13 7l2 2"/>',
  arrowUpRight: '<path d="M8 16 17 7M10 7h7v7"/>',
};
export function icon(name, extra = '') {
  // eigene Größe (extra) ersetzt die Standardgröße – doppelte Attribute würden ignoriert
  const size = /\bwidth=/.test(extra) ? '' : ' width="24" height="24"';
  return `<svg viewBox="0 0 24 24"${size} fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extra ? ' ' + extra : ''}>${P[name] || ''}</svg>`;
}
// Telefonnummer zur Anzeige: geschützte Leerzeichen, damit sie nicht umbricht
export const phoneTxt = (s) => `<span class="nw">${esc(s).replace(/ /g, '&nbsp;').replace(/-/g, '&#8209;')}</span>`;

// RITZ-Logo (Raute mit Schriftzug), Farbe über currentColor
export const LOGO = '<svg viewBox="0 0 258.72 140.09" width="84" height="45" role="img" aria-label="RITZ"><path fill="currentColor" d="M172.99,83.46l19.27-33.73h-29.93v6.9h16.36l-19.33,33.73h31.85v-6.9h-18.23Zm-37.06-26.39v33.28h8.24V57.08h12.31v-7.03h-32.81v7.03h12.26Zm-18.81-7.08h-8.35v40.37h8.35V49.99Zm-32.92,7.2c4.75,0,7.08,.9,7.08,5.06s-2.33,5.12-7.08,5.12h-9.78v-10.18h9.78Zm-17.75-7.2v40.37h7.98v-15.85h9.4l8.35,15.85h8.98l-9.46-16.87c4.91-1.120,7.66-5.12,7.66-11.36,0-8.49-4.28-12.14-13.26-12.14h-19.66Z"/><path fill="currentColor" d="M74.74,103.3h109.25l-54.62,29.99-54.62-29.99ZM12.89,70.11l51.17-28.1H194.66l51.17,28.1-51.17,27.57H64.06L12.89,70.11ZM129.36,6.64l54.62,29.76H74.74L129.36,6.64Zm.05-6.64L0,70.11l129.31,69.98,129.41-69.98L129.41,0Z"/></svg>';

// ---------- Bilder ----------
// manifest[key] = { n: 'name', w, h, ws: [320, 640, ...] }
export function imgTag(ctx, key, { alt = '', sizes = '100vw', cls: c = '', eager = false, max = 9999, fallback = '', cover = 0, lowres = 0 } = {}) {
  const m = key && ctx.img[key];
  if (!m) return fallback;
  // Gering aufgelöste Motive nicht über ihre natürliche Größe hinaus vergrößern (Rahmen bleibt, Bild mittig)
  // (sizes = natürliche Breite, sonst rechnet der Browser die Bildbreite aus srcset/sizes hoch)
  if (lowres && m.w < lowres) { c = `${c ? c + ' ' : ''}is-lowres`; sizes = `${Math.min(m.w, max)}px`; }
  // Bildfüllend beschnitten (object-fit: cover) in einem flacheren Rahmen: das Bild wird breiter gezeichnet als der Rahmen –
  // die Größenangabe entsprechend vergrößern, damit der Browser eine scharfe Variante wählt
  const f = cover ? (m.w / m.h) / cover : 1;
  if (f > 1.05) sizes = sizes.split(',').map((part) => { const x = part.trim(); const i = x.lastIndexOf(' '); const len = i < 0 ? x : x.slice(i + 1); const cond = i < 0 ? '' : x.slice(0, i + 1); return `${cond}calc(${len} * ${f.toFixed(2)})`; }).join(', ');
  const ws = m.ws.filter((w) => w <= max);
  const use = ws.length ? ws : [m.ws[0]];
  const src = (w) => `${ctx.base}img/${m.n}-${w}.webp`;
  const largest = use[use.length - 1];
  const h = Math.round((m.h / m.w) * largest);
  return `<img src="${src(largest)}" srcset="${use.map((w) => `${src(w)} ${w}w`).join(', ')}" sizes="${sizes}" width="${largest}" height="${h}" alt="${esc(alt)}"${c ? ` class="${c}"` : ''}${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}
// srcset aller Varianten bis max (für Bildwechsel per Skript)
export function imgSrcset(ctx, key, max = 9999) {
  const m = key && ctx.img[key];
  if (!m) return '';
  const ws = m.ws.filter((w) => w <= max);
  return (ws.length ? ws : [m.ws[0]]).map((w) => `${ctx.base}img/${m.n}-${w}.webp ${w}w`).join(', ');
}
export function imgUrl(ctx, key, w = 640) {
  const m = key && ctx.img[key];
  if (!m) return '';
  const pick = m.ws.filter((x) => x <= w).pop() || m.ws[0];
  return `${ctx.base}img/${m.n}-${pick}.webp`;
}

// Produkt-Platzhalter: technische Silhouette je Wandlerart
export function productGlyph(kind) {
  const g = {
    ct: '<circle cx="60" cy="58" r="30"/><circle cx="60" cy="58" r="13"/><path d="M38 92h44M44 92v8h32v-8"/>',
    vt: '<rect x="34" y="40" width="52" height="46" rx="3"/><path d="M48 40V22h24v18M44 22h32M42 86v10h36V86"/><path d="M52 28h16M52 34h16"/>',
    combined: '<rect x="30" y="46" width="60" height="42" rx="3"/><circle cx="60" cy="34" r="12"/><path d="M60 22v-8M38 88v8h44v-8"/>',
    sensor: '<path d="M48 96V40a12 12 0 0 1 24 0v56z"/><path d="M48 52h24M48 62h24M48 72h24"/><path d="M72 88c10 0 14 6 18 10"/>',
    electronics: '<rect x="26" y="40" width="68" height="40" rx="3"/><path d="M36 52h20M36 60h12M66 52h18v18H66z"/><path d="M40 80v10M80 80v10"/>',
    busbar: '<path d="M14 72h52a14 14 0 0 0 14-14V30"/><path d="M14 86h56a24 24 0 0 0 24-24V30"/><path d="M14 58h44a8 8 0 0 0 8-8V30"/>',
    resin: '<path d="M30 92h60l-8-50H38z"/><path d="M44 42c0-10 7-16 16-16s16 6 16 16"/><path d="M40 60h40M38 74h44"/>',
    damping: '<rect x="30" y="34" width="60" height="52" rx="3"/><path d="M40 60c5-10 10-10 15 0s10 10 15 0 10-10 15 0"/>',
  };
  const map = { ct: 'ct', 'electronic-ct': 'electronics', vt: 'vt', 'electronic-vt': 'electronics', ccvt: 'vt', combined: 'combined', 'current-sensor': 'sensor', 'voltage-sensor': 'sensor', 'combi-sensor': 'sensor', electronics: 'electronics', accessory: 'electronics', busbar: 'busbar', bushing: 'busbar', 'cast-resin': 'resin', damping: 'damping' };
  return `<svg class="glyph" viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${g[map[kind] || 'ct']}</svg>`;
}
