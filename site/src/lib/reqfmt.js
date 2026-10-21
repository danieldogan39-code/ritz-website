// Anforderungen (lib/spec.js) lesbar machen: Chips für „Erkannt“, Texte für Prüfungen, Hinweise und Annahmen.
import { fmtNum, fmtCls, tpl, esc, imgTag, productGlyph } from './util.js';
import { descriptor, imgFit, productThumb } from './product.js';

const n = (v, lang) => fmtNum(Math.round(v * 1000) / 1000, lang);
const volt = (x, lang) => (x ? `${fmtNum(Math.round(x.v * 1000) / 1000, lang, { useGrouping: false })}${x.d === 'r3' ? '/√3' : x.d === '3' ? '/3' : ''}` : '');

export function coreText(c, lang) {
  const parts = [];
  if (c.c) {
    let s = fmtCls(c.c, lang);
    if (c.alf && /^(5P|10P)$/.test(c.c)) s += c.alf;
    if (c.p) s += '/' + c.p;
    if (c.fs) s += ' FS' + c.fs;
    if (c.alf && !/^(5P|10P)$/.test(c.c)) s += ' ALF' + c.alf;
    parts.push(s);
  }
  if (c.va != null) parts.push(`${n(c.va, lang)} VA`);
  return parts.join(' · ');
}

// [Bezeichnung, Wert, Schlüssel, geerbt?] – t: Client-Wörterbuch (lbl), A: x.assist
export function reqItems(req, t, A, lang) {
  const L = A.req;
  const inh = new Set(req.inherited || []);
  const out = [];
  const push = (label, value, key, k = key) => out.push([label, value, key, inh.has(k)]);
  if (req.code) push(L.code, req.codeLabel || req.code, 'code');
  if (req.kind) push('', (t.lbl.kind[req.kind] || req.kind) + (req.sensor ? ` (${L.sensor})` : ''), 'kind');
  if (req.um != null) push(L.um, `${n(req.um, lang)} kV${req.sys != null && req.umHow !== 'um' ? ` (${L.sys} ${n(req.sys, lang)} kV)` : ''}`, 'um');
  if (req.level) push(L.level, req.level, 'level');
  if (req.ipr?.length) push(L.ratio, `${req.ipr.map((v) => n(v, lang)).join('–')}/${req.isr != null ? n(req.isr, lang) : '…'}${req.coreCount > 1 && !req.cores?.length ? '/' + n(req.isr, lang) : ''} A`, 'ratio', 'ipr');
  else if (req.isr != null) push(L.ratio, `…/${n(req.isr, lang)} A`, 'ratio', 'isr');
  if (req.upr || req.usr) push(L.vt, `${volt(req.upr, lang) || '…'} / ${volt(req.usr, lang) || '…'}${req.usrEn ? ' / ' + volt(req.usrEn, lang) : ''} V`, 'vt');
  if (req.coreCount > 1 && (req.cores?.length || 0) < req.coreCount) push(L.cores, String(req.coreCount), 'cores');
  (req.cores || []).forEach((c, i) => push(tpl(req.upr ? L.winding : L.core, { n: i + 1 }), coreText(c, lang), 'core'));
  if (req.ith) push(L.ith, req.ith.ka != null ? `${n(req.ith.ka, lang)} kA / ${n(req.ith.t || 1, lang)} s` : `${n(req.ith.mult, lang)} × In`, 'ith');
  if (req.idyn) push(L.idyn, req.idyn.ka != null ? `${n(req.idyn.ka, lang)} kA` : `${n(req.idyn.mult, lang)} × Ith`, 'idyn');
  if (req.vf) push(L.vf, `${n(req.vf.f, lang)} Un${req.vf.t ? ' / ' + (req.vf.t === 'cont' ? '∞' : req.vf.t.replace(/(\d)([hs])$/, '$1 $2')) : ''}`, 'vf');
  if (req.freq != null) push(L.freq, `${n(req.freq, lang)} Hz`, 'freq');
  if (req.std?.length) push(L.std, req.std.join(', '), 'std');
  if (req.install) push('', t.lbl.install[req.install] || req.install, 'install');
  for (const f of req.forms || []) push('', t.lbl.form[f] || f, 'form');
  for (const a of req.apps || []) push('', t.lbl.app[a] || a, 'app', 'apps');
  if (req.size?.d) push(L.size, `${n(req.size.d, lang)} mm`, 'size');
  if (req.size?.bar) push(L.bar, `${req.size.bar.join(' × ')} mm`, 'size');
  return out;
}

export function reqChipsHtml(req, t, A, lang, { inheritedTitle = '' } = {}) {
  return reqItems(req, t, A, lang).map(([label, value, key, inh]) => `<span class="rq rq--${key}${inh ? ' is-inh' : ''}"${inh && inheritedTitle ? ` title="${esc(inheritedTitle)}"` : ''}>${label ? `<i>${esc(label)}</i>` : ''}${esc(value)}</span>`).join('');
}

// Prüfung → Text: ✓/~/✗, Bezeichnung, Hinweis
export function checkText(c, A, lang, t = null) {
  const want = c.k === 'form' ? t?.lbl.form[c.want] : c.k === 'app' ? t?.lbl.app[c.want] : null;
  const label = want || tpl(A.chk[c.k] || c.k, { n: c.core || 1 });
  let note = '';
  if (c.note === 'higher') note = A.note.higher + (c.val != null ? ` (${n(c.val, lang)}${c.k === 'um' ? ' kV' : ''})` : '');
  else if (c.note === 'lower') note = tpl(A.note.lower, { v: c.val != null ? `${n(c.val, lang)} kV` : '' });
  else if (c.note === 'low') note = tpl(A.note.low, { v: c.max != null ? `${n(c.max, lang)} kA` : '' });
  else if (c.note && A.note[c.note]) note = A.note[c.note];
  const level = c.v >= 0.85 ? 'ok' : c.v > 0 ? 'part' : 'no';
  return { label, note, level };
}

// Hinweise der automatischen Konfiguration → Sonderwunsch-Text bzw. Info
export function noteText(note, A, lang) {
  const [k, v] = note;
  const val = lang === 'en' ? v : String(v).replace(/(\d)\.(\d)/g, '$1,$2');
  return tpl(A.acn[k] || k + ' {v}', { v: val });
}
export const INFO_NOTES = new Set(['vaUp']);

// Text mit Markierungen der erkannten Werte (Fundstellen aus lib/spec.js)
export function markedText(text, marks, A) {
  let out = '', at = 0;
  for (const m of marks || []) {
    if (m.s < at) continue;
    out += esc(text.slice(at, m.s)) + `<mark class="mk mk--${m.k}" title="${esc(A.mark[m.k] || '')}">${esc(text.slice(m.s, m.e))}</mark>`;
    at = m.e;
  }
  return out + esc(text.slice(at));
}

// Treffer für die Live-Vorschau (Startseite) – gleiche Darstellung im Build und im Browser
export function homeHitsHtml(ctx, best, X) {
  if (!best.length) return `<p class="hs__empty">${esc(X.home.empty)}</p>`;
  return best.map((m, i) => {
    const p = m.p;
    const img = productThumb(ctx, p, { sizes: '48px' });
    return `<a class="hs__hit" href="${ctx.href('product', { area: p.area, slug: p.id })}"><span class="scp__img">${img}</span><span>${i === 0 ? `<small>${esc(X.home.best)}</small>` : ''}<b>${esc(p.code)}</b><small>${esc(descriptor(p, ctx.t, ctx.lang))}</small></span><em>${Math.round(m.score * 100)}&nbsp;%</em></a>`;
  }).join('');
}
