// Produktlogik (isomorph): Bezeichnung, Facetten, Karten, Spannungsbalken, Gruppen
import { esc, icon, fmtKv, fmtRange, fmtList, fmtNum, axisPos, imgTag, productGlyph, nbsp, UM_STEPS, fmtCls, fmtClasses, cmpCode } from './util.js';
import { dataLang } from './routes.js';
import { productVisual } from './visual.js';
import { dimRows } from './dims.js';

export const KIND_GROUP = {
  ct: 'ct', vt: 'vt', combined: 'combined', ccvt: 'vt', 'current-sensor': 'sensor', 'voltage-sensor': 'sensor', 'combi-sensor': 'sensor',
  'electronic-ct': 'electronic', 'electronic-vt': 'electronic', damping: 'other', busbar: 'other', bushing: 'other', 'cast-resin': 'other',
  electronics: 'other', accessory: 'other',
};

// Lokalisierte Kurzbezeichnung
export function descriptor(p, t, lang) {
  if (p.catalog || !p.dk) return p.name?.[lang] || p.name?.[dataLang(lang)] || p.name?.en || p.name?.de || '';
  const d = t.lbl.dk;
  const base = d[p.dk.n] || t.lbl.kind[p.kind] || '';
  const q = (p.dk.q || []).map((k) => d[k]).filter(Boolean);
  return q.length ? `${base}, ${q.join(', ')}` : base;
}

// Sprache der Kurzbezeichnung (Katalogtexte liegen nur auf Deutsch/Englisch vor)
export function descriptorLang(p, lang) {
  if (!(p.catalog || !p.dk)) return lang;
  return p.name?.[lang] ? lang : p.name?.[dataLang(lang)] ? dataLang(lang) : p.name?.en ? 'en' : 'de';
}
export const langAttr = (l, lang) => (l && l !== lang ? ` lang="${l}"` : '');

export const productTitle = (p) => p.code;

// Spannungsbalken (log): Bereich min–max Um
export function vmini(p, lang) {
  const um = p.um || [];
  if (!um.length) return '<div class="vmini vmini--none" aria-hidden="true"></div>';
  const lo = Math.min(...um), hi = Math.max(...um);
  const a = axisPos(lo) * 100, b = axisPos(hi) * 100;
  const point = lo === hi;
  return `<div class="vmini" role="img" aria-label="Um ${esc(fmtKv(um, lang))}"><div class="vmini__bar"><span class="vmini__fill${point ? ' is-point' : ''}" style="left:${a.toFixed(1)}%;width:${point ? 0 : Math.max(1.5, b - a).toFixed(1)}%"></span></div><div class="vmini__labels"><span>${esc(fmtKv(um, lang, { max: 1 }) || '')}</span></div></div>`;
}

// Weißer Hintergrund → eingepasst (multipliziert auf die Bühne), sonst bildfüllend
export const imgFit = (ctx, key) => (ctx.img[key]?.bg === 'w' ? 'is-contain' : 'is-cover');

export function productImage(ctx, p, { sizes = '(max-width: 600px) 50vw, 240px', eager = false, max = 640 } = {}) {
  const key = (p.images || []).find((k) => ctx.img[k]);
  // Familienbilder der Hauptseite (Graustufen-Studio, Querformat) füllen die Bühne, Einzelfreisteller werden eingepasst
  if (key) return imgTag(ctx, key, { alt: `${p.code}`, sizes, eager, max, cls: imgFit(ctx, key) });
  return productDrawing(ctx, p, { label: true });
}

// Schemazeichnung für Produkte ohne Foto (Bühne mit Zeichenpapier-Raster)
export const fmtDim = (lang) => (v) => fmtNum(+(+v).toFixed(1), lang);
export function productDrawing(ctx, p, { label = false, small = false, detail = false } = {}) {
  const T = ctx.t.product.pv || {};
  const svg = productVisual(p, { detail, label: label ? `${T.tag || 'Schema'}: ${p.code}` : '', fmt: fmtDim(ctx.lang), ...(small ? { ratio: 1, tight: true } : {}) });
  return `<span class="pvw${small ? ' pvw--sm' : ''}">${svg}</span>`;
}
// Kleines Vorschaubild (Suche, Projektmappe, Vergleich, Check): Foto oder Schemazeichnung
export function productThumb(ctx, p, { sizes = '48px', max = 320 } = {}) {
  const k = (p.images || []).find((x) => ctx.img[x]);
  return k ? imgTag(ctx, k, { alt: '', sizes, max, cls: imgFit(ctx, k) }) : productDrawing(ctx, p, { small: true });
}
// Maßangaben aus dem Datenblatt als Tabellenzeilen
export function dimSpecRows(ctx, p) {
  return dimRows(p.dm, ctx.t.lbl.dim || {}, fmtDim(ctx.lang));
}

export function keySpecs(p, t, lang, { short = false } = {}) {
  const s = [];
  const L = short && t.lbl.specShort ? { ...t.lbl.spec, ...t.lbl.specShort } : { ...t.lbl.spec, um: t.lbl.spec.um.replace(/ Um$/, '') };
  if (p.um?.length) s.push([L.um, fmtKv(p.um, lang)]);
  if (p.ipr) s.push([L.ipr, fmtRange(p.ipr, lang, 'A')]);
  if (p.isr?.length) s.push([L.isr, fmtList(p.isr, lang, 'A')]);
  if (p.usr?.length && !p.isr?.length) s.push([L.usr, p.usr.slice(0, 2).join(' / ')]);
  if (p.classes?.length) s.push([L.classes, fmtClasses(p.classes.slice(0, 4), lang) + (p.classes.length > 4 ? ' …' : '')]);
  return s;
}

export function productCard(ctx, p, { list = false } = {}) {
  const { t, lang } = ctx;
  const url = ctx.href('product', { area: p.area, slug: p.id });
  const specs = keySpecs(p, t, lang, { short: true }).slice(0, 3);
  const tags = [];
  if (p.isNew) tags.push(`<span class="tag tag--red">${esc(t.ui.newBadge)}</span>`);
  if (p.catalog) tags.push(`<span class="tag tag--line">${esc(t.product.catalogBadge)}</span>`);
  return `<article class="pcard" data-pid="${esc(p.id)}">
  <div class="pcard__stage">${productImage(ctx, p)}${p.made ? `<span class="pcard__made">${esc(t.ui.madeIn)} ${esc(t.lbl.made[p.made] || p.made)}</span>` : ''}</div>
  <div class="pcard__body">
    <h3 class="pcard__code"><a href="${url}">${esc(p.code)}</a></h3>
    <p class="pcard__name"${langAttr(descriptorLang(p, lang), lang)}>${esc(descriptor(p, t, lang))}</p>
    ${tags.length ? `<div class="cluster">${tags.join('')}</div>` : ''}
    ${specs.length ? `<dl class="pcard__specs">${specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
  </div>
  <div class="pcard__foot">
    ${vmini(p, lang)}
    <div class="pcard__actions">
      <button type="button" data-compare-toggle="${esc(p.id)}" aria-pressed="false" aria-label="${esc(t.ui.compare)}: ${esc(p.code)}" title="${esc(t.ui.compare)}">${icon('compare')}</button>
      <button type="button" data-basket-add="${esc(p.id)}" aria-label="${esc(t.ui.addInquiry)}: ${esc(p.code)}" title="${esc(t.ui.addInquiry)}">${icon('clipboardAdd')}</button>
    </div>
  </div>
</article>`;
}

// Gruppenzuordnung auf Bereichsseiten
export const GROUPS = {
  mittelspannung: [
    ['ms.new', (p) => p.isNew && p.catalog],
    ['ms.pq', (p) => p.apps.includes('power-quality')],
    ['ms.metalclad', (p) => p.form.includes('metal-clad') || p.apps.includes('touch-proof')],
    ['ms.rail', (p) => p.apps.includes('rail')],
    ['ms.generator', (p) => p.apps.includes('generator')],
    ['ms.combined', (p) => p.kind === 'combined'],
    ['ms.special', (p) => p.form.includes('high-current') || p.apps.includes('ex-protection') || p.apps.includes('auxiliary-supply') || (p.form.includes('bar') && p.form.includes('bushing'))],
    ['ms.indoor.ct', (p) => p.kind === 'ct' && p.install.includes('indoor')],
    ['ms.indoor.vt', (p) => p.kind === 'vt' && p.install.includes('indoor')],
    ['ms.outdoor.ct', (p) => p.kind === 'ct'],
    ['ms.outdoor.vt', (p) => true],
  ],
  niederspannung: [
    ['ns.accessory', (p) => p.kind === 'damping' || p.kind === 'accessory'],
    ['ns.vt', (p) => p.kind === 'vt'],
    ['ns.splitcore', (p) => p.form.includes('split-core')],
    ['ns.bushing', (p) => p.dk?.n === 'ct.bushing.lv'],
    ['ns.window', (p) => ['ct.window', 'ct.windowring', 'ct.frame'].includes(p.dk?.n)],
    ['ns.special', (p) => true],
  ],
  'elektronik-sensoren': [
    ['es.electronic', (p) => p.kind === 'electronic-ct' || p.kind === 'electronic-vt'],
    ['es.current', (p) => p.kind === 'current-sensor'],
    ['es.voltage', (p) => p.kind === 'voltage-sensor'],
    ['es.combi', (p) => p.kind === 'combi-sensor'],
    ['es.accessory', (p) => true],
  ],
  hochspannung: [['hv.all', () => true]],
  'stromschienen-sis': [['sis.all', () => true]],
  'giessharzteile-duromer': [['dur.all', () => true]],
};
export function groupProducts(area, products) {
  const defs = GROUPS[area] || [];
  const out = defs.map(([key]) => ({ key, items: [] }));
  for (const p of products) {
    const i = defs.findIndex(([, f]) => f(p));
    if (i >= 0) out[i].items.push(p);
  }
  return out.filter((g) => g.items.length);
}

// ---------- Filter (Produktfinder) ----------
export const FACETS = ['area', 'kindGroup', 'install', 'app', 'form', 'classes', 'isr', 'std', 'freq', 'made'];
export function parseQuery(qs) {
  const q = {};
  const sp = new URLSearchParams(qs || '');
  for (const [k, v] of sp.entries()) {
    if (['q', 'um', 'ipr', 'weeks', 'sort', 'view'].includes(k)) q[k] = v;
    else q[k] = v.split(',').filter(Boolean);
  }
  return q;
}
export function buildQuery(q) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    sp.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  return sp.toString();
}
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const compact = (s) => norm(s).replace(/[^a-z0-9]/g, '');

export function facetValues(p, f) {
  switch (f) {
    case 'area': return [p.area];
    case 'kindGroup': return [KIND_GROUP[p.kind] || 'other'];
    case 'install': return p.install || [];
    case 'app': return [...(p.apps || []), ...(p.form?.includes('high-current') ? ['high-current'] : [])];
    case 'form': return p.form || [];
    case 'classes': return p.classes || [];
    case 'isr': return (p.isr || []).map(String);
    case 'std': return p.std || [];
    case 'freq': return [...new Set((p.freq || []).map((x) => (x === 16.7 ? '16.7' : x === 50 || x === 60 ? String(x) : 'broad')))];
    case 'made': return p.made ? [p.made] : [];
    default: return [];
  }
}

// Suche und Finder vergleichen bei jedem Tastendruck alle Produkte: die normalisierte Anfrage einmal je Anfrage, die
// normalisierten Texte eines Produkts einmal je Produkt (und Sprache) berechnen – das Ergebnis bleibt dasselbe.
let lastQ = null;
function queryParts(q) {
  if (lastQ?.q !== q) {
    const qs = norm(q).trim();
    lastQ = { q, qs, qc: compact(q), kv: qs.match(/^(\d+(?:[.,]\d+)?)\s*kv$/), words: qs.split(/\s+/).filter(Boolean) };
  }
  return lastQ;
}
const MT = new WeakMap();
function productTexts(p) {
  let d = MT.get(p);
  if (!d) { d = { code: compact(p.code), alias: (p.aliases || []).map(compact), hay: {} }; MT.set(p, d); }
  return d;
}
export function matchText(p, q, t) {
  if (!q) return 1;
  const { qs, qc, kv, words } = queryParts(q);
  if (!qs) return 1;
  const d = productTexts(p);
  const code = d.code;
  const alias = d.alias;
  if (code === qc || alias.includes(qc)) return 100;
  if (qc.length >= 2 && (code.startsWith(qc) || alias.some((a) => a.startsWith(qc)))) return 60;
  // Spannung "24 kV" / "24kv"
  if (kv) {
    const v = parseFloat(kv[1].replace(',', '.'));
    return (p.um || []).some((u) => Math.abs(u - v) < 0.01) ? 50 : 0;
  }
  const lk = t ? t.meta.lang : '';
  const hay = (d.hay[lk] ??= norm([p.code, ...(p.aliases || []), p.name?.de, p.name?.en, t ? descriptor(p, t, t.meta.lang) : '', p.search || ''].join(' ')));
  if (words.every((w) => hay.includes(w))) return 20 + (code.includes(qc) ? 10 : 0);
  if (code.includes(qc) && qc.length >= 3) return 15;
  return 0;
}

// sort: false liefert die Treffer unsortiert (für Trefferzahlen, bei denen die Reihenfolge keine Rolle spielt)
export function filterProducts(products, q, t, { except = null, sort: sorted = true } = {}) {
  const um = q.um ? parseFloat(q.um) : null;
  const ipr = q.ipr ? parseFloat(q.ipr) : null;
  const weeks = q.weeks ? parseFloat(q.weeks) : null;
  const res = [];
  for (const p of products) {
    let ok = true;
    for (const f of FACETS) {
      if (f === except) continue;
      const sel = q[f];
      if (sel && sel.length) {
        const vals = facetValues(p, f);
        if (!sel.some((s) => vals.includes(s))) { ok = false; break; }
      }
    }
    if (!ok) continue;
    if (except !== 'um' && um && !coversUm(p, um)) continue;
    if (except !== 'ipr' && ipr && !(p.ipr && p.ipr[0] <= ipr && p.ipr[1] >= ipr)) continue;
    if (except !== 'weeks' && weeks && !(p.weeks && p.weeks[0] <= weeks)) continue;
    const score = matchText(p, q.q, t);
    if (!score) continue;
    res.push([p, score]);
  }
  if (!sorted) return res.map((x) => x[0]);
  const sort = q.sort || (q.q ? 'relevance' : 'code');
  const byCode = (a, b) => cmpCode(a[0].code, b[0].code);
  if (sort === 'relevance') res.sort((a, b) => b[1] - a[1] || byCode(a, b));
  else if (sort === 'um') res.sort((a, b) => (Math.min(...(a[0].um.length ? a[0].um : [1e9])) - Math.min(...(b[0].um.length ? b[0].um : [1e9]))) || byCode(a, b));
  else if (sort === 'weeks') res.sort((a, b) => ((a[0].weeks?.[0] ?? 99) - (b[0].weeks?.[0] ?? 99)) || byCode(a, b));
  else res.sort(byCode);
  return res.map((x) => x[0]);
}

// Spannung passt: Produkt hat die gewählte Isolationsspannung oder die nächsthöhere Normstufe
export function coversUm(p, v) {
  if (!p.um?.length) return false;
  const next = UM_STEPS.find((s) => s > v + 1e-9) || v;
  return p.um.some((u) => u >= v - 1e-6 && u <= next + 1e-6);
}

// Primärspannung: Shopdaten in V (≥ 1000) oder kV (Sensoren, Mittelspannung < 1000); Niederspannung in V
export function fmtUpr(p, lang) {
  if (!p.upr) return '';
  const [a, b] = p.upr;
  if (b >= 1000) return fmtRange([a / 1000, b / 1000], lang, 'kV');
  return fmtRange(p.upr, lang, p.area === 'niederspannung' ? 'V' : 'kV');
}

// Typenschild als Platzhalter, wenn kein Produktfoto vorliegt (Kenndaten wie auf dem Leistungsschild)
export function ratingPlate(ctx, p) {
  const { t, lang } = ctx;
  const P = t.product.plate || { type: 'Typ', cls: 'Kl.', std: 'Norm' };
  const rows = [];
  if (p.um?.length) rows.push(['U<sub>m</sub>', fmtKv(p.um, lang, { max: 3 })]);
  if (p.ipr) rows.push(['I<sub>pr</sub>', fmtRange(p.ipr, lang, 'A')]);
  if (p.isr?.length) rows.push(['I<sub>sr</sub>', fmtList(p.isr, lang, 'A')]);
  if (p.upr) rows.push(['U<sub>pr</sub>', fmtUpr(p, lang)]);
  if (p.usr?.length) rows.push(['U<sub>sr</sub>', (p.usr.length > 2 ? `${p.usr[0]} … ${p.usr[p.usr.length - 1]}` : p.usr.join(', ')) + '\u00a0V']);
  if (p.classes?.length) rows.push([esc(P.cls), esc(p.classes.slice(0, 5).map((c) => fmtCls(c, lang)).join(' / ')) + (p.classes.length > 5 ? ' …' : '')]);
  if (p.burden) rows.push(['S<sub>r</sub>', fmtRange(p.burden, lang, 'VA')]);
  if (p.ith) rows.push(['I<sub>th</sub>', fmtRange(p.ith, lang, 'kA')]);
  if (p.freq?.length) rows.push(['f', fmtList(p.freq, lang, 'Hz')]);
  if (p.std?.length) rows.push([esc(P.std), p.std.slice(0, 3).join(', ')]);
  const shown = rows.slice(0, 7);
  return `<div class="plate" aria-hidden="true">
    <div class="plate__head"><svg class="plate__logo" viewBox="0 0 120 64" width="54" height="29"><path d="M60 3 116 32 60 61 4 32Z" fill="none" stroke="currentColor" stroke-width="5"/><text x="60" y="41" text-anchor="middle" font-size="25" font-weight="800" fill="currentColor" font-family="Archivo, Arial, sans-serif">RITZ</text></svg><span>RITZ Instrument Transformers</span></div>
    <div class="plate__type"><span>${esc(P.type)}</span><b>${esc(p.code)}</b></div>
    ${shown.length ? `<dl class="plate__grid">${shown.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    <div class="plate__foot"><span>${p.made ? `${esc(t.ui.madeIn)} ${esc(t.lbl.made[p.made] || p.made)}` : ''}</span><span>${esc(t.lbl.kind[p.kind] || '')}</span></div>
    <i class="plate__rivet"></i><i class="plate__rivet"></i><i class="plate__rivet"></i><i class="plate__rivet"></i>
  </div>`;
}

export function specRows(ctx, p) {
  const { t, lang } = ctx;
  const L = t.lbl.spec;
  const rows = [];
  rows.push([L.kind, t.lbl.kind[p.kind] || '']);
  if (p.install?.length) rows.push([L.install, p.install.map((i) => t.lbl.install[i]).join(', ')]);
  if (p.form?.length) rows.push([L.form, p.form.map((f) => t.lbl.form[f]).filter(Boolean).join(', ')]);
  if (p.um?.length) rows.push([L.um, fmtList(p.um, lang, 'kV')]);
  if (p.ipr) rows.push([L.ipr, fmtRange(p.ipr, lang, 'A')]);
  if (p.isr?.length) rows.push([L.isr, fmtList(p.isr, lang, 'A')]);
  if (p.upr) rows.push([L.upr, fmtUpr(p, lang)]);
  if (p.usr?.length) rows.push([L.usr, p.usr.map((v) => String(v).replace(/\//g, '/\u2060')).join(', ')]); // kein Umbruch in „150/√3“
  if (p.classes?.length) rows.push([L.classes, fmtClasses(p.classes, lang)]);
  if (p.burden) rows.push([L.burden, fmtRange(p.burden, lang, 'VA')]);
  if (p.ith) rows.push([L.ith, fmtRange(p.ith, lang, 'kA')]);
  if (p.freq?.length) rows.push([L.freq, fmtList(p.freq, lang, 'Hz')]);
  if (p.std?.length) rows.push([L.std, p.std.join(', ')]);
  if (p.specs?.mount) rows.push([L.mount, t.lbl.mount[p.specs.mount] || '']);
  if (p.specs?.imax) rows.push([L.imax, `${fmtNum(p.specs.imax, lang)} A`]);
  rows.push(...dimSpecRows(ctx, p));
  if (p.weeks) rows.push([L.weeks, `${fmtRange(p.weeks, lang)} ${t.ui.weeks}`]);
  if (p.made) rows.push([L.made, t.lbl.made[p.made] || p.made]);
  return rows.filter((r) => r[1]);
}

export { fmtKv, fmtRange, fmtList, fmtNum, nbsp };
