// Produktabgleich: bewertet Produkte gegen geparste Anforderungen (lib/spec.js), begründet jede Prüfung
// und belegt den Konfigurator automatisch vor. Nutzt die Konfiguratordaten (Rollen/Werte aus lib/roles.js),
// wo vorhanden, sonst die Kenndaten des Produktindex.

import { makeModel, visibleOptions, visibleValues, prune, isText, isMulti, missingRequired, selectionLines } from './cfgcore.js';
import { cmpCode } from './util.js';

const GROUP = {
  ct: ['ct', 'electronic-ct', 'current-sensor', 'combi-sensor'],
  vt: ['vt', 'electronic-vt', 'voltage-sensor', 'ccvt', 'combi-sensor'],
  combined: ['combined', 'combi-sensor'],
};
const SENSOR = ['current-sensor', 'voltage-sensor', 'combi-sensor', 'electronic-ct', 'electronic-vt'];
const OK = 1, GOOD = 0.85, PART = 0.5, WEAK = 0.25, NO = 0;

// Fähigkeiten eines Produkts aus Konfigurator (cf) und Index (p)
export function capabilities(p, cf) {
  const c = { um: new Set(p.um || []), ipr: [], iprRange: p.ipr || null, iprOther: false, isr: new Set(p.isr || []), cores: 0, coresOther: false, en: false,
    cls: {}, clsOther: {}, va: {}, vaOther: {}, ith: [], ithOther: false, freq: new Set(p.freq || []), std: new Set(p.std || []),
    upr: [], uprRange: p.upr || null, usr: [], usrEn: [], vf: [], size: [], sw: new Set(), weeks: p.weeks || null };
  if (!cf) {
    for (const k of p.classes || []) (c.cls[1] ||= []).push({ c: k });
    if (p.burden) c.va[1] = [{ n: p.burden[0] }, { n: p.burden[1] }];
    if (p.ith) c.ith.push({ ka: p.ith[1] });
    // Sekundärspannungen aus dem Index ("100/√3", "110/3", "100")
    for (const u of p.usr || []) { const m = /^(\d+(?:[.,]\d+)?)(?:\/(√3|3))?$/.exec(String(u).trim()); if (m) c.usr.push({ n: parseFloat(m[1].replace(',', '.')), ...(m[2] ? { d: m[2] === '√3' ? 'r3' : '3' } : {}) }); }
    return c;
  }
  for (const o of cf.o) {
    const [role, n = 1] = cf.r[o.id] || ['other'];
    for (const [vid] of o.v || []) {
      const x = cf.x[vid];
      if (!x) continue;
      if (x.other) {
        if (role === 'ipr') c.iprOther = true;
        else if (role === 'cores') c.coresOther = true;
        else if (role === 'cls') c.clsOther[n] = true;
        else if (role === 'burden') c.vaOther[n] = true;
        else if (role === 'ith') c.ithOther = true;
        continue;
      }
      switch (role) {
        case 'um': c.um.add(x.n); break;
        case 'ipr': c.ipr.push(x); break;
        case 'isr': c.isr.add(x.n); break;
        case 'cores': if (x.en) c.en = true; else c.cores = Math.max(c.cores, x.n || 0); break;
        case 'cls': (c.cls[n] ||= []).push(x); break;
        case 'clsva': (x.combo || [x]).forEach((cx, i) => { (c.cls[i + 1] ||= []).push(cx); if (cx.va) (c.va[i + 1] ||= []).push({ n: cx.va }); }); if (x.combo) c.cores = Math.max(c.cores, x.combo.length); break;
        case 'burden': (c.va[n] ||= []).push(x); break;
        case 'ith': c.ith.push(x); break;
        case 'freq': c.freq.add(x.n); break;
        case 'std': for (const s of x.s) c.std.add(s); break;
        case 'upr': c.upr.push(x); break;
        case 'usr': c.usr.push(x); break;
        case 'usr_en': c.usrEn.push(x); c.en = true; break;
        case 'cls_en': case 'burden_en': c.en = true; break;
        case 'vf': c.vf.push(x); break;
        case 'size': c.size.push(x.n); break;
        case 'switch': c.sw.add(x.sw); break;
        default: break;
      }
    }
  }
  return c;
}

const near = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a));
// geforderter thermischer Kurzzeitstrom als 1-s-Wert in kA
export function ithNeed(req) {
  if (!req.ith) return null;
  if (req.ith.ka) return req.ith.ka * Math.sqrt(req.ith.t || 1);
  if (req.ith.mult && req.ipr?.length) return (req.ith.mult * Math.max(...req.ipr)) / 1000 * Math.sqrt(req.ith.t || 1);
  return null;
}
function clsFit(want, have) {
  if (!have || have.c !== want.c) return want.p && have?.c === want.p ? PART : NO;
  if (want.p && have.p !== want.p) return PART;
  if (want.fs != null && have.fs) return want.fs >= have.fs[0] && want.fs <= have.fs[1] ? OK : PART;
  if (want.alf != null && have.alf != null) return have.alf === want.alf ? OK : have.alf > want.alf ? GOOD : PART;
  return OK;
}
const usrFit = (w, h) => near(w.v, h.n) && (w.d || null) === (h.d || null);

// Einzelprüfungen: [Schlüssel, Gewicht, Ergebnis (0…1), harter Ausschluss, Hinweis]
// Fähigkeiten hängen nur vom Produkt ab – einmal berechnen
const capCache = new WeakMap();
function capOf(p, cf) {
  const key = cf || p;
  let c = capCache.get(key);
  if (!c) { c = capabilities(p, cf); capCache.set(key, c); }
  return c;
}

export function evaluate(req, p, cf) {
  const c = capOf(p, cf);
  const checks = [];
  const add = (k, w, v, hard = false, note = null, extra = {}) => checks.push({ k, w, v, hard: hard && v === NO, note, ...extra });
  // Art
  if (req.kind) {
    const okKind = (GROUP[req.kind] || []).includes(p.kind);
    if (!okKind) return { p, checks: [{ k: 'kind', w: 3, v: NO, hard: true }], score: 0, unsuitable: true };
    add('kind', 1, req.sensor ? (SENSOR.includes(p.kind) ? OK : PART) : (SENSOR.includes(p.kind) ? PART : OK));
  } else if (!['ct', 'vt', 'combined', 'electronic-ct', 'electronic-vt', 'current-sensor', 'voltage-sensor', 'combi-sensor'].includes(p.kind)) {
    return { p, checks: [{ k: 'kind', w: 3, v: NO, hard: true }], score: 0, unsuitable: true };
  }
  // Isolationsniveau
  if (req.um != null) {
    const ums = [...c.um].sort((a, b) => a - b);
    if (!ums.length) add('um', 3, PART, false, 'unknown');
    else if (ums.some((u) => near(u, req.um))) add('um', 3, OK, false, null, { val: req.um });
    else if (ums.some((u) => u > req.um)) add('um', 3, GOOD, false, 'higher', { val: ums.find((u) => u > req.um) });
    else add('um', 3, NO, true, 'lower', { val: ums[ums.length - 1] });
  }
  // Primärstrom
  if (req.ipr?.length) {
    const want = req.ipr;
    const exact = want.every((w) => c.ipr.some((x) => near(x.n, w) || (x.n2 != null && (near(x.n2, w) || (w >= x.n && w <= x.n2)))));
    const inRange = c.iprRange && want.every((w) => w >= c.iprRange[0] - 1e-9 && w <= c.iprRange[1] + 1e-9);
    if (exact) add('ipr', 3, OK);
    else if (inRange && (c.iprOther || !cf)) add('ipr', 3, cf ? GOOD : OK, false, cf ? 'special' : null);
    else if (inRange) add('ipr', 3, PART, false, 'special');
    else add('ipr', 3, NO, true, 'range', { range: c.iprRange });
    if (want.length > 1 && cf && !c.sw.has('primary') && !c.ipr.some((x) => x.n2 != null)) add('switch', 1, PART, false, 'switch');
  }
  if (req.isr != null) {
    if (!c.isr.size) add('isr', 2, PART, false, 'unknown');
    else add('isr', 2, c.isr.has(req.isr) ? OK : NO, true);
  }
  // Kerne / Wicklungen
  const nCores = Math.max(req.coreCount || 0, req.cores?.length || 0);
  if (nCores > 1) {
    if (!cf) add('cores', 1.5, PART, false, 'unknown');
    else if (c.cores >= nCores) add('cores', 1.5, OK);
    else if (c.coresOther) add('cores', 1.5, PART, false, 'special');
    else add('cores', 1.5, NO, true, null, { val: c.cores });
  }
  (req.cores || []).forEach((core, i) => {
    const n = i + 1;
    if (core.c) {
      const list = c.cls[n] || c.cls[1] || [];
      let best = NO;
      for (const h of list) best = Math.max(best, clsFit(core, h));
      if (best === NO && /^C\d+$|^0\.3$|^0\.6$|^1\.2$/.test(core.c) && core.ieee) best = c.std.has('IEEE') ? PART : WEAK;
      if (best === NO && (c.clsOther[n] || c.clsOther[1])) best = WEAK;
      add('cls', 2, best, false, best === WEAK ? 'special' : null, { core: n, want: core });
    }
    if (core.va != null) {
      const list = (c.va[n] || c.va[1] || []).map((x) => x.n2 ?? x.n);
      let v = NO;
      if (list.some((x) => near(x, core.va))) v = OK;
      else if (list.some((x) => x > core.va)) v = cf ? GOOD : OK;
      else if (c.vaOther[n] || c.vaOther[1]) v = WEAK;
      add('va', 1.5, v, false, v === GOOD ? 'higher' : v === WEAK ? 'special' : null, { core: n, want: core.va });
    }
  });
  // Kurzzeitstrom
  const need = ithNeed(req);
  if (need != null) {
    const ipr = req.ipr?.length ? Math.max(...req.ipr) : null;
    const caps = c.ith.map((x) => (x.ka != null ? x.ka : x.mult && ipr ? (x.mult * ipr) / 1000 : null)).filter((x) => x != null);
    if (!caps.length) add('ith', 1.5, c.ithOther ? PART : PART, false, 'unknown');
    else if (caps.some((x) => x >= need - 1e-6)) add('ith', 1.5, OK, false, null, { need });
    else add('ith', 1.5, c.ithOther ? WEAK : NO, false, c.ithOther ? 'special' : 'low', { need, max: Math.max(...caps) });
  } else if (req.ith?.mult) {
    const ok = c.ith.some((x) => x.mult >= req.ith.mult);
    add('ith', 1.5, ok ? OK : c.ith.length ? PART : PART, false, ok ? null : 'unknown');
  }
  if (req.freq != null) {
    if (!c.freq.size) add('freq', 1.5, PART, false, 'unknown');
    else add('freq', 1.5, [...c.freq].some((f) => near(f, req.freq)) ? OK : NO, true);
  }
  if (req.std?.length) add('std', 1, req.std.some((s) => c.std.has(s)) ? OK : PART, false, null);
  if (req.install) {
    const has = (p.install || []).includes(req.install);
    if (has) add('install', 1.5, OK);
    else add('install', 1.5, req.install === 'indoor' ? PART : NO, req.install === 'outdoor');
  }
  if (req.forms?.length) {
    const map = { window: ['window', 'ring-core', 'frame', 'split-core'], 'split-core': ['split-core'], support: ['support'], bushing: ['bushing', 'busbar'], block: ['block'], 'single-pole': ['single-pole'], 'two-pole': ['two-pole'], 'metal-clad': ['metal-clad'], narrow: ['narrow'], summation: ['summation'], interposing: ['interposing'], wound: ['wound'], 'three-phase': ['three-phase'], 'tube-bar': ['tube-bar'] };
    const forms = p.form || [];
    for (const f of req.forms) {
      const ok = (map[f] || [f]).some((x) => forms.includes(x));
      add('form', f === 'split-core' || f === 'metal-clad' ? 2 : 1, ok ? OK : f === 'narrow' || f === 'support' ? PART : NO, f === 'split-core', null, { want: f });
    }
  }
  for (const a of req.apps || []) {
    const has = (p.apps || []).includes(a);
    if (a === 'verifiable') add('app', 2, has ? OK : NO, true, null, { want: a });
    else if (a === 'rail') add('app', 1.5, has || [...c.freq].some((f) => near(f, 16.7)) ? OK : NO, true, null, { want: a });
    else if (a === 'earth-fault') add('app', 1, has ? OK : (p.form || []).some((x) => ['window', 'split-core'].includes(x)) ? PART : WEAK, false, null, { want: a });
    else add('app', 1, has ? OK : PART, false, null, { want: a });
  }
  // Spannungswandler
  if (req.upr) {
    const w = req.upr;
    const ok = c.upr.some((x) => (near(x.n, w.v) || (x.n2 != null && w.v >= x.n && w.v <= x.n2)) && (!w.d || !x.d || x.d === w.d));
    const inRange = c.uprRange && w.v >= c.uprRange[0] && w.v <= c.uprRange[1] * (c.uprRange[1] < 1000 && w.v >= 1000 ? 1000 : 1);
    add('upr', 3, ok ? OK : inRange ? (cf ? PART : OK) : c.upr.length || c.uprRange ? NO : PART, !ok && !inRange && (c.upr.length > 0 || !!c.uprRange), ok || (inRange && !cf) ? null : inRange ? 'special' : 'range');
  }
  if (req.usr) add('usr', 2, c.usr.some((x) => usrFit(req.usr, x)) ? OK : c.usr.length ? WEAK : PART, false, null);
  if (req.usrEn) add('usrEn', 1, c.en || c.usrEn.length ? OK : NO, false);
  if (req.vf) add('vf', 1, c.vf.some((x) => near(x.f, req.vf.f)) ? OK : c.vf.length ? WEAK : PART, false);
  if (req.size?.d) add('size', 1.5, c.size.length ? (c.size.some((d) => d >= req.size.d) ? OK : NO) : PART, false, c.size.length ? null : 'unknown', { want: req.size.d });
  if (req.code) add('code', 4, req.code === p.id ? OK : WEAK, false);
  const sw = checks.reduce((s, x) => s + x.w, 0);
  const score = sw ? checks.reduce((s, x) => s + x.w * x.v, 0) / sw : 0;
  return { p, checks, score, unsuitable: checks.some((x) => x.hard) };
}

// Beste Produkte für eine Anforderung
export function matchProducts(req, products, cfgAll = null, { limit = 3 } = {}) {
  const res = products.map((p) => evaluate(req, p, cfgAll?.[p.id]));
  const lvWanted = req.um != null && req.um <= 1.2;
  const area = (p) => (lvWanted ? (p.area === 'niederspannung' ? 0 : 1) : req.um >= 3.6 ? (p.area === 'niederspannung' ? 1 : 0) : 0);
  res.sort((a, b) => (a.unsuitable - b.unsuitable) || (b.score - a.score) || (area(a.p) - area(b.p)) || ((a.p.weeks?.[0] ?? 99) - (b.p.weeks?.[0] ?? 99)) || ((b.p.cfg ? 1 : 0) - (a.p.cfg ? 1 : 0)) || cmpCode(a.p.code, b.p.code));
  const ok = res.filter((r) => !r.unsuitable && r.score > 0.35);
  return { best: ok.slice(0, limit), fallback: ok.length ? null : res.find((r) => r.score > 0) || null, total: ok.length };
}

// ---------- automatische Konfiguration ----------
const fmt = (n) => String(Math.round(n * 1000) / 1000); // neutral (Punkt) – Anzeige lokalisiert in lib/reqfmt.js
export function autoConfigure(req, p, cf, { assume = true } = {}) {
  const m = makeModel({ options: cf.o, deps: cf.d });
  const sel = {};
  const notes = [];
  const assumed = [];
  const label = (id, v) => (m.byId[id]?.v || []).find((x) => String(x[0]) === String(v))?.[1] || '';
  const role = (id) => cf.r[id] || ['other'];
  const X = (v) => cf.x[v] || {};
  const otherOf = (vals) => vals.find((v) => X(v).other);
  const realOf = (vals) => vals.filter((v) => !X(v).other);
  const iprSel = () => {
    for (const [id, v] of Object.entries(sel)) if (role(id)[0] === 'ipr') return X(v).n2 ?? X(v).n ?? null;
    return req.ipr?.length ? Math.max(...req.ipr) : null;
  };
  const nCores = Math.max(req.coreCount || 0, req.cores?.length || 0);
  function choose(id, vals) {
    const [r, n = 1] = role(id);
    const real = realOf(vals);
    const pickMin = (f) => { const c = real.filter((v) => f(X(v))); c.sort((a, b) => (X(a).n ?? 0) - (X(b).n ?? 0)); return c[0]; };
    switch (r) {
      case 'um': if (req.um == null) return null; return real.find((v) => near(X(v).n, req.um)) || pickMin((x) => x.n >= req.um);
      case 'ipr': {
        if (!req.ipr?.length) return null;
        const w = req.ipr;
        const hit = w.length > 1 ? real.find((v) => X(v).n2 != null && near(X(v).n, Math.min(...w)) && near(X(v).n2, Math.max(...w))) : real.find((v) => near(X(v).n, w[0]) && X(v).n2 == null);
        if (hit) return hit;
        const o = otherOf(vals);
        if (o) notes.push(['ipr', w.map(fmt).join('-') + ' A']);
        return o || null;
      }
      case 'switch': {
        if (req.ipr?.length > 1) return real.find((v) => X(v).sw === 'primary') || null;
        return real.find((v) => X(v).sw === 'none') || null;
      }
      case 'isr': return req.isr != null ? real.find((v) => near(X(v).n, req.isr)) || null : null;
      case 'cores': {
        const multi = isMulti(m.byId[id]);
        const en = req.usrEn ? real.find((v) => X(v).en) : null;
        const want = nCores || (req.cores?.length || req.ipr || req.upr ? 1 : 0);
        const main = want ? real.find((v) => X(v).n === want && !X(v).en && !X(v).pq) : null;
        if (multi) { const pick = [main, en].filter(Boolean); if (pick.length) return pick; }
        else if (en && !main) return en;
        if (main) return main;
        if (!want) return null;
        const o = otherOf(vals);
        if (o) notes.push(['cores', String(want)]);
        return o || null;
      }
      case 'clsva': {
        if (!req.cores?.length) return null;
        let best = null, bv = 0;
        for (const v of real) {
          const parts = X(v).combo || [X(v)];
          if (parts.length !== Math.max(req.cores.length, nCores || 1)) continue;
          const f = parts.reduce((s, h, i) => s + (req.cores[i]?.c ? clsFit(req.cores[i], h) : 0.5) + (req.cores[i]?.va != null && h.va != null ? (near(h.va, req.cores[i].va) ? 0.5 : h.va > req.cores[i].va ? 0.3 : 0) : 0), 0);
          if (f > bv) { bv = f; best = v; }
        }
        if (best) {
          (X(best).combo || [X(best)]).forEach((h, i) => { const w = req.cores[i]; if (w?.va != null && h.va != null && h.va < w.va - 1e-9) notes.push(['va', `${i + 1}: ${fmt(w.va)} VA`]); if (w?.c && clsFit(w, h) < OK) notes.push(['cls', `${i + 1}: ${w.c}${w.p ? '/' + w.p : ''}${w.fs ? ' FS' + w.fs : ''}${w.alf && /P$/.test(w.c) ? w.alf : ''}`]); });
          return best;
        }
        const o = otherOf(vals);
        if (o) notes.push(['cls', req.cores.map((c, i) => `${i + 1}: ${c.c || ''}`).join(', ')]);
        return o || null;
      }
      case 'cls': {
        const core = req.cores?.[n - 1];
        if (!core?.c) return null;
        let best = null, bv = 0;
        for (const v of real) { const f = clsFit(core, X(v)); if (f > bv || (f === bv && f > 0 && X(v).dep && !X(best || v).dep)) { bv = f; best = v; } }
        if (best) { if (bv < OK) notes.push(['cls', `${n}: ${core.c}${core.p ? '/' + core.p : ''}${core.fs ? ' FS' + core.fs : ''}${core.alf && /P$/.test(core.c) ? core.alf : ''}`]); return best; }
        const o = otherOf(vals);
        if (o) notes.push(['cls', `${n}: ${core.c}${core.fs ? ' FS' + core.fs : ''}${core.alf && !/P\d/.test(core.c) ? core.alf : ''}`]);
        return o || null;
      }
      case 'burden': {
        const core = req.cores?.[n - 1];
        if (core?.va == null) return null;
        const hit = real.find((v) => near(X(v).n2 ?? X(v).n, core.va)) || pickMin((x) => (x.n2 ?? x.n) >= core.va);
        if (hit) { if (!near(X(hit).n2 ?? X(hit).n, core.va)) notes.push(['vaUp', `${n}: ${fmt(core.va)} VA`]); return hit; }
        const o = otherOf(vals);
        if (o) notes.push(['va', `${n}: ${fmt(core.va)} VA`]);
        return o || null;
      }
      case 'ith': {
        const need = ithNeed(req);
        const ipr = iprSel();
        if (need == null && !req.ith?.mult) return real.length === 1 ? real[0] : null;
        const cand = real.map((v) => ({ v, ka: X(v).ka != null ? X(v).ka : X(v).mult && ipr ? (X(v).mult * ipr) / 1000 : null, mult: X(v).mult })).filter((c) => (need != null ? c.ka != null && c.ka >= need - 1e-6 : c.mult >= req.ith.mult));
        cand.sort((a, b) => (a.ka ?? a.mult) - (b.ka ?? b.mult));
        if (cand[0]) return cand[0].v;
        const o = otherOf(vals);
        if (o) notes.push(['ith', need != null ? `${fmt(req.ith.ka || need)} kA / ${fmt(req.ith.t || 1)} s` : `${req.ith.mult} × In`]);
        return o || null;
      }
      case 'tk': return req.ith?.t ? real.find((v) => near(X(v).n, req.ith.t)) || null : real.find((v) => near(X(v).n, 1)) || null;
      case 'freq': if (req.freq == null) return real.length === 1 ? real[0] : null; return real.find((v) => near(X(v).n, req.freq)) || null;
      case 'std': if (!req.std?.length) return real.length === 1 ? real[0] : null; return real.find((v) => X(v).s?.some((s) => req.std.includes(s))) || null;
      case 'upr': {
        if (!req.upr) return null;
        const w = req.upr;
        const hit = real.find((v) => near(X(v).n, w.v) && X(v).n2 == null && (!w.d || !X(v).d || X(v).d === w.d)) || real.find((v) => X(v).n2 != null && w.v >= X(v).n && w.v <= X(v).n2);
        if (hit) return hit;
        const o = otherOf(vals);
        if (o) notes.push(['upr', `${fmt(w.v)}${w.d === 'r3' ? '/√3' : ''} V`]);
        return o || null;
      }
      case 'usr': { if (!req.usr) return null; return real.find((v) => usrFit(req.usr, X(v))) || null; }
      case 'usr_en': { if (!req.usrEn) return null; return real.find((v) => usrFit(req.usrEn, X(v))) || null; }
      case 'vf': { if (!req.vf) return null; return real.find((v) => near(X(v).f, req.vf.f) && (!req.vf.t || X(v).t === req.vf.t)) || real.find((v) => near(X(v).f, req.vf.f)) || null; }
      case 'size': { if (!req.size?.d) return null; return pickMin((x) => x.n >= req.size.d) || null; }
      case 'delivery': return m.req.has(id) ? pickMin(() => true) : null;
      default: return null;
    }
  }
  for (let pass = 0; pass < 40; pass++) {
    let changed = false;
    const vis = visibleOptions(m, sel);
    for (const id of vis) {
      if (sel[id] !== undefined) continue;
      const o = m.byId[id];
      if (isText(o)) continue;
      const vals = visibleValues(m, sel, id, vis);
      if (!vals.length) continue;
      const pick = choose(id, vals);
      if (pick != null && !(Array.isArray(pick) && !pick.length)) { sel[id] = Array.isArray(pick) ? pick.map(String) : isMulti(o) ? [String(pick)] : String(pick); prune(m, sel); changed = true; break; }
    }
    if (!changed) break;
  }
  // Übliche Annahmen für Pflichtangaben, die in der Spezifikation fehlen (sichtbar als „angenommen“ markiert)
  if (assume) {
    for (let pass = 0; pass < 20; pass++) {
      let changed = false;
      const vis = visibleOptions(m, sel);
      for (const id of missingRequired(m, sel)) {
        const o = m.byId[id];
        if (isText(o) || sel[id] !== undefined) continue;
        const [r] = role(id);
        const vals = realOf(visibleValues(m, sel, id, vis));
        let pick = null;
        if (r === 'freq') pick = vals.find((v) => near(X(v).n, 50)) || vals.find((v) => near(X(v).n, 60));
        else if (r === 'std') pick = vals.find((v) => X(v).s?.includes('IEC'));
        else if (r === 'um' && req.um == null && p.area === 'niederspannung') pick = vals.slice().sort((a, b) => X(a).n - X(b).n)[0];
        else if (r === 'delivery') pick = vals.slice().sort((a, b) => X(a).n - X(b).n)[0];
        else if (r === 'extras' || r === 'switch') pick = vals.find((v) => /^(keine|kein|ohne|none|no)\b/i.test(label(id, v)));
        else if (vals.length === 1) pick = vals[0];
        if (pick == null) continue;
        sel[id] = isMulti(o) ? [String(pick)] : String(pick);
        assumed.push([r, label(id, pick), o.t]);
        prune(m, sel);
        changed = true;
        break;
      }
      if (!changed) break;
    }
  }
  // Anforderungen ohne passende Option als Sonderwunsch
  if (req.level) notes.push(['level', req.level]);
  if (req.idyn?.ka) notes.push(['idyn', fmt(req.idyn.ka) + ' kA']);
  if (req.size?.bar) notes.push(['bar', req.size.bar.join(' × ') + ' mm']);
  for (const f of req.forms || []) if (f === 'narrow' && !(p.form || []).includes('narrow')) notes.push(['form', 'DIN 42600']);
  const specialId = Object.keys(cf.r).find((id) => cf.r[id][0] === 'special' && m.byId[id] && isText(m.byId[id]) && visibleOptions(m, sel).includes(id));
  const miss = missingRequired(m, sel).filter((id) => id !== specialId);
  return { sel, notes, assumed, specialId, missing: miss.map((id) => m.byId[id].t), missingIds: miss, lines: selectionLines(m, sel), complete: miss.length === 0 };
}

// Konfiguratordaten auf die getroffene Auswahl einschränken: nicht sichtbare Optionen entfallen,
// gewählte Optionen behalten nur die gewählten Werte, offene nur die noch freigeschalteten
export function restrictCf(cf, sel) {
  const m = makeModel({ options: cf.o, deps: cf.d });
  const visList = visibleOptions(m, sel);
  const vis = new Set(visList);
  return {
    ...cf,
    o: cf.o.map((o) => {
      const id = String(o.id);
      if (!vis.has(id)) return { ...o, v: [] };
      if (!o.v?.length) return o;
      const v = sel[id];
      const keep = new Set(v === undefined || v === '' ? visibleValues(m, sel, id, visList) : (Array.isArray(v) ? v : [v]).map(String));
      return { ...o, v: o.v.filter(([vid]) => keep.has(String(vid))) };
    }),
  };
}

// Beste Produkte nach tatsächlich erreichbarer Konfiguration: Kandidaten automatisch konfigurieren,
// die Konfiguration erneut gegen die Anforderung prüfen und danach ordnen.
export function bestConfigured(req, products, cfgAll, { limit = 3, pool = 6, assume = true } = {}) {
  const base = matchProducts(req, products, cfgAll, { limit: pool });
  const out = base.best.map((m) => {
    const cf = cfgAll?.[m.p.id];
    if (!cf) return { ...m, ac: null, cfgScore: m.score };
    const ac = autoConfigure(req, m.p, cf, { assume });
    const ev = evaluate(req, m.p, restrictCf(cf, ac.sel));
    return { ...m, ac, cfgScore: ev.unsuitable ? Math.min(ev.score, m.score) : ev.score, checks: ev.checks };
  });
  out.sort((a, b) => (b.cfgScore - a.cfgScore) || ((b.ac?.complete ? 1 : 0) - (a.ac?.complete ? 1 : 0)) || (b.score - a.score));
  return { best: out.slice(0, limit), fallback: base.fallback, total: base.total };
}
