// Technische Zusammenfassung einer Konfiguration (aus Optionsrollen) – für Live-Typenschild,
// Ausschreibungstexte und Projektmappe. Sprachunabhängig über Rollen, beschriftet mit den Wörterbuchtexten.

import { selVals, isText } from './cfgcore.js';
import { esc, fmtNum } from './util.js';

const fmt = (n, lang) => fmtNum(Math.round(n * 1000) / 1000, lang);
const fmtCl = (c, lang) => (lang === 'en' ? c : String(c).replace(/(\d)\.(\d)/g, '$1,$2'));

// Konfiguration → { um, ipr, isr, cores[], ith, freq, std[], upr, usr[], usrEn, vf, special, weeks }
export function techFromSel(cfg, sel) {
  const t = { cores: [] };
  const byId = Object.fromEntries((cfg.o || cfg.options || []).map((o) => [String(o.id), o]));
  const R = cfg.r || {}, X = cfg.x || {};
  const core = (n) => (t.cores[n - 1] ||= {});
  for (const [id, raw] of Object.entries(sel || {})) {
    const o = byId[id];
    if (!o) continue;
    const [role, n = 1] = R[id] || ['other'];
    if (isText(o)) { if (role === 'special' && String(raw).trim()) t.special = String(raw).trim(); continue; }
    for (const v of selVals(sel, id)) {
      const x = X[v];
      if (!x || x.other) { if (x?.other) (t.other ||= []).push(role); continue; }
      switch (role) {
        case 'um': t.um = x.n; break;
        case 'ipr': t.ipr = x.n2 != null ? [x.n, x.n2] : [x.n]; break;
        case 'isr': t.isr = x.n; break;
        case 'cores': if (x.en) t.en = true; else t.nCores = x.n; break;
        case 'cls': Object.assign(core(n), { c: x.c, ...(x.fs ? { fs: x.fs } : {}), ...(x.alf ? { alf: x.alf } : {}), ...(x.p ? { p: x.p } : {}) }); break;
        case 'clsva': (x.combo || [x]).forEach((cx, i) => Object.assign(core(i + 1), { c: cx.c, ...(cx.fs ? { fs: cx.fs } : {}), ...(cx.alf ? { alf: cx.alf } : {}), ...(cx.va != null ? { va: cx.va } : {}) })); break;
        case 'burden': core(n).va = x.n2 != null ? [x.n, x.n2] : x.n; break;
        case 'usr': (t.usr ||= [])[n - 1] = x; break;
        case 'usr_en': t.usrEn = x; break;
        case 'cls_en': t.clsEn = x.c; break;
        case 'burden_en': t.vaEn = x.n; break;
        case 'upr': t.upr = x; break;
        case 'ith': t.ith = x; break;
        case 'tk': t.tk = x.n; break;
        case 'freq': t.freq = x.n; break;
        case 'std': t.std = x.s; break;
        case 'vf': t.vf = x; break;
        case 'delivery': t.weeks = x.n; break;
        case 'size': t.size = x.n; break;
        default: break;
      }
    }
  }
  t.cores = t.cores.filter(Boolean);
  return t;
}

const STD_NO = { ct: 'IEC 61869-2', vt: 'IEC 61869-3', combined: 'IEC 61869-4', 'current-sensor': 'IEC 61869-10', 'voltage-sensor': 'IEC 61869-11', 'electronic-ct': 'IEC 61869-14', 'electronic-vt': 'IEC 61869-15' };
export const stdLabel = (std, kind) => (std || []).map((s) => (s === 'IEC' ? STD_NO[kind] || 'IEC 61869' : s === 'IEEE' ? 'IEEE C57.13' : s)).join(', ');

const fmtV = (n, lang) => fmtNum(Math.round(n * 1000) / 1000, lang, { useGrouping: false });
const volt = (x, lang) => (x ? `${fmtV(x.n ?? x.v, lang)}${x.n2 != null ? '–' + fmtV(x.n2, lang) : ''}${x.d === 'r3' ? '/√3' : x.d === '3' ? '/3' : ''}` : '');
export const clsText = (c, lang) => {
  if (!c?.c) return '';
  let s = fmtCl(c.c, lang);
  if (c.alf && /P$/.test(c.c)) s += c.alf;
  if (c.p) s += '/' + c.p;
  if (c.fs) s += ` FS${c.fs[0]}${c.fs[1] && c.fs[1] !== c.fs[0] ? '…' + c.fs[1] : ''}`;
  return s;
};
const vaText = (va, lang) => (va == null ? '' : Array.isArray(va) ? `${fmt(va[0], lang)}…${fmt(va[1], lang)} VA` : `${fmt(va, lang)} VA`);

// Zeilen [Bezeichnung, Wert] in der Seitensprache (T = t.tech)
export function techRows(tc, T, lang, kind) {
  const rows = [];
  if (tc.um != null) rows.push([T.um, `${fmt(tc.um, lang)} kV`]);
  if (tc.ipr) rows.push([T.ratio, `${tc.ipr.map((v) => fmt(v, lang)).join('–')}/${tc.isr != null ? fmt(tc.isr, lang) : '…'} A`]);
  else if (tc.isr != null) rows.push([T.isr, `${fmt(tc.isr, lang)} A`]);
  if (tc.upr) rows.push([T.vtRatio, `${volt(tc.upr, lang)} / ${(tc.usr || []).filter(Boolean).map((u) => volt(u, lang)).join(' / ') || '…'}${tc.usrEn ? ' / ' + volt(tc.usrEn, lang) : ''} V`]);
  const isVt = !!tc.upr || /vt|voltage/.test(kind || '');
  tc.cores.forEach((c, i) => {
    const parts = [clsText(c, lang), vaText(c.va, lang)].filter(Boolean);
    if (parts.length) rows.push([(isVt ? T.winding : T.core).replace('{n}', i + 1), parts.join(', ')]);
  });
  if (tc.en || tc.clsEn || tc.vaEn) rows.push([T.enWinding, [tc.clsEn ? fmtCl(tc.clsEn, lang) : '', tc.vaEn ? vaText(tc.vaEn, lang) : ''].filter(Boolean).join(', ') || '✓']);
  if (tc.ith) rows.push([T.ith, tc.ith.mult ? `${fmt(tc.ith.mult, lang)} × I${lang === 'de' ? 'pr' : 'pr'}` : `${fmt(tc.ith.ka, lang)} kA${tc.tk || tc.ith.t ? ' / ' + fmt(tc.tk || tc.ith.t, lang) + ' s' : ''}`]);
  if (tc.vf) rows.push([T.vf, `${fmt(tc.vf.f, lang)} × Un${tc.vf.t ? ' / ' + (tc.vf.t === 'cont' ? T.cont : tc.vf.t) : ''}`]);
  if (tc.freq != null) rows.push([T.freq, `${fmt(tc.freq, lang)} Hz`]);
  if (tc.std?.length) rows.push([T.std, stdLabel(tc.std, kind)]);
  return rows;
}

// Live-Typenschild aus der Konfiguration
export function platePreview(code, tc, T, lang, kind, made) {
  const rows = [];
  if (tc.um != null) rows.push(['U<sub>m</sub>', `${fmt(tc.um, lang)} kV`]);
  if (tc.ipr) rows.push(['I<sub>pr</sub>/I<sub>sr</sub>', `${tc.ipr.map((v) => fmt(v, lang)).join('–')}/${tc.isr != null ? fmt(tc.isr, lang) : '…'} A`]);
  if (tc.upr) rows.push(['U<sub>pr</sub>/U<sub>sr</sub>', `${volt(tc.upr, lang)}/${(tc.usr || []).filter(Boolean).map((u) => volt(u, lang))[0] || '…'} V`]);
  tc.cores.forEach((c, i) => { const s = [clsText(c, lang), vaText(c.va, lang)].filter(Boolean).join(' · '); if (s) rows.push([`${i + 1}`, s]); });
  if (tc.ith) rows.push(['I<sub>th</sub>', tc.ith.mult ? `${fmt(tc.ith.mult, lang)} I<sub>pr</sub>` : `${fmt(tc.ith.ka, lang)} kA`]);
  if (tc.freq != null) rows.push(['f', `${fmt(tc.freq, lang)} Hz`]);
  if (tc.std?.length) rows.push(['', esc(stdLabel(tc.std, kind))]);
  return `<div class="plate plate--live" aria-hidden="true">
    <div class="plate__head"><svg class="plate__logo" viewBox="0 0 120 64" width="54" height="29"><path d="M60 3 116 32 60 61 4 32Z" fill="none" stroke="currentColor" stroke-width="5"/><text x="60" y="41" text-anchor="middle" font-size="25" font-weight="800" fill="currentColor" font-family="Archivo, Arial, sans-serif">RITZ</text></svg><span>RITZ Instrument Transformers</span></div>
    <div class="plate__type"><span>${esc(T.type)}</span><b>${esc(code)}</b></div>
    <dl class="plate__grid">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('') || `<div><dt>&nbsp;</dt><dd>…</dd></div>`}</dl>
    <div class="plate__foot"><span>${made ? esc(made) : ''}</span><span>${esc(T.plateNote)}</span></div>
    <i class="plate__rivet"></i><i class="plate__rivet"></i><i class="plate__rivet"></i><i class="plate__rivet"></i>
  </div>`;
}

// Ausschreibungstext (Leistungsverzeichnis) für eine Position
export function tenderText({ T, lang, code, kindLabel, installLabel, formLabel, kind, tc, qty, ref, notes }) {
  const head = [kindLabel, installLabel, formLabel].filter(Boolean).join(', ');
  const lines = [];
  if (ref) lines.push(T.pos.replace('{ref}', ref));
  lines.push(head.charAt(0).toUpperCase() + head.slice(1));
  lines.push(T.make.replace('{code}', code));
  for (const [k, v] of techRows(tc, T, lang, kind)) lines.push(`– ${k}: ${v.replace(/<[^>]+>/g, '')}`);
  if (notes) lines.push(`– ${T.extra}: ${notes}`);
  if (qty) lines.push(`${T.qty}: ${qty} ${T.pcs}`);
  return lines.join('\n');
}
