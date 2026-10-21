// Wandler-Rechner: Formulare lesen, rechnen (lib/calc.js), Ergebnis mit Rechenweg zeigen,
// Zustand im Link, Ergebnisse untereinander übernehmen und als Spezifikation an den Check übergeben.
import { $, $$, getT, getX, clientCtx, readQuery, writeQuery, toast, handoff, debounce } from './core.js';
import { copyText } from './basket.js';
import * as K from '../lib/calc.js';
import { FIELDS, CALCS, SWITCH } from '../lib/calcdef.js';
import { umForSystem } from '../lib/spec.js';
import { esc, icon, tpl, fmtNum } from '../lib/util.js';

export async function initCalc(root) {
  const box = $('[data-calc]', root);
  if (!box || box.__init) return;
  box.__init = true;
  const [t, X, ctx] = await Promise.all([getT(), getX(), clientCtx()]);
  const C = X.calc, lang = ctx.lang;
  const nf = (v, d = 2) => (v == null || !Number.isFinite(v) ? '–' : fmtNum(v, lang, { maximumFractionDigits: d }));
  const sig = (v, s = 3) => { if (!Number.isFinite(v)) return '–'; const a = Math.abs(v); const d = a === 0 ? 0 : Math.max(0, Math.min(4, s - 1 - Math.floor(Math.log10(a)))); return fmtNum(v, lang, { maximumFractionDigits: d, minimumFractionDigits: d > 0 && a < 10 ? Math.min(d, 2) : 0 }); };
  const pct = (v, d = 0) => `${nf(v * 100, d)} %`;
  const tabs = $$('[data-tab]', box), panels = $$('[data-panel]', box);
  const design = {}; // Beiträge der Rechner zur gemeinsamen Auslegung
  let current = 'burden';

  // ---------- Werte ----------
  const form = (c) => $(`[data-form="${c}"]`, box);
  const num = (s) => {
    s = String(s ?? '').trim().replace(/[\s  ]/g, '');
    if (!s) return null;
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
    const v = Number(s.replace(',', '.'));
    return Number.isFinite(v) ? v : NaN;
  };
  const swVal = (c) => (SWITCH[c] ? form(c).querySelector(`input[name="${SWITCH[c]}"]:checked`)?.value : null);
  const shown = (c, f) => !f.only || f.only.split(',').includes(swVal(c));
  function read(c) {
    const fm = form(c);
    const o = {}, bad = [];
    for (const f of FIELDS[c]) {
      if (f.type === 'seg') { o[f.name] = fm.querySelector(`input[name="${f.name}"]:checked`)?.value; continue; }
      const el = fm.elements[f.name];
      if (f.type === 'select') { o[f.name] = el.value; continue; }
      if (!shown(c, f)) { el.removeAttribute('aria-invalid'); continue; }
      const v = num(el.value);
      const ok = v === null ? !!f.optional : Number.isFinite(v) && v >= f.min && v <= f.max;
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (!ok) bad.push(f.name);
      o[f.name] = v;
    }
    return { o, bad };
  }
  function syncSwitch(c) {
    const sv = swVal(c);
    for (const el of $$('[data-only]', form(c))) el.hidden = !el.dataset.only.split(',').includes(sv);
    for (const lab of $$('[data-label-by]', form(c))) { const m = JSON.parse(lab.dataset.labelBy); if (m[sv]) lab.firstChild.textContent = m[sv]; }
  }

  // ---------- Bausteine der Ausgabe ----------
  const v = (s) => `<var>${s}</var>`;
  const kpi = (label, value, sub = '', main = false) => `<div class="kpi${main ? ' kpi--main' : ''}"><span>${esc(label)}</span><b>${value}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
  const note = (text, kind = 'info') => `<p class="cnote cnote--${kind}">${icon(kind === 'warn' ? 'info' : kind === 'ok' ? 'check' : 'info', 'width="18" height="18"')}<span>${esc(text)}</span></p>`;
  const step = (lhs, expr, res) => `<li><span class="eq">${lhs} = ${expr}${res ? ` = <b>${res}</b>` : ''}</span></li>`;
  const frame = (kpis, notes, steps, basis, acts = []) => `<div class="calc__res">
      <h3 class="h5">${esc(C.result)}</h3>
      <div class="kpis">${[...kpis.filter((k) => k.includes('kpi--main')), ...kpis.filter((k) => !k.includes('kpi--main'))].join('')}</div>
      ${notes.length ? `<div class="calc__notes">${notes.join('')}</div>` : ''}
      <details class="calc__steps"><summary>${esc(C.steps)}</summary><ol>${steps.join('')}</ol><p class="small muted"><b>${esc(C.basis)}:</b> ${esc(basis)}</p></details>
      <div class="calc__acts">
        <button class="btn btn--ghost btn--small" type="button" data-calc-copy>${icon('copy')}${esc(C.copy)}</button>
        <button class="btn btn--ghost btn--small" type="button" data-calc-share>${icon('external')}${esc(C.share)}</button>
        ${acts.join('')}
      </div>
    </div>`;
  const findBtn = (kind) => `<button class="btn btn--red btn--small" type="button" data-calc-find="${kind}">${icon('search')}${esc(C.find)}</button>`;

  // ---------- Rechner ----------
  const R = {
    burden(o) {
      const L = C.burden;
      const r = K.leadBurden({ isr: Number(o.isr), len: o.len, area: Number(o.area), mat: o.mat, temp: o.temp, k: Number(o.k), dev: o.dev, rc: o.rc || 0 });
      design.isr = Number(o.isr); design.sr = r.sr;
      const notes = [];
      if (r.over) notes.push(note(L.over, 'warn'));
      if (r.low25) notes.push(note(L.low25, 'warn'));
      if (r.alt && r.sLead > 1) notes.push(note(tpl(L.alt1A, { v: `${sig(r.alt.sLead)} VA` })));
      const rhoTxt = `${o.mat === 'cu' ? '0,0175' : '0,0286'}`.replace(',', lang === 'en' ? '.' : ',');
      const steps = [];
      if (o.temp !== 20) steps.push(step(`${v('ρ')}<sub>θ</sub>`, `${rhoTxt} · (1 + ${nf(K.ALPHA[o.mat], 5)} · (${nf(o.temp, 1)} − 20))`, `${nf(r.rho, 5)} Ω·mm²/m`));
      steps.push(step(`${v('R')}<sub>L</sub>`, `${v('k')} · ${v('ρ')} · ${v('l')} / ${v('A')} = ${o.k} · ${nf(r.rho, 5)} · ${nf(o.len, 1)} m / ${nf(Number(o.area), 1)} mm²`, `${sig(r.rLead)} Ω`));
      steps.push(step(`${v('S')}<sub>L</sub>`, `${v('I')}<sub>sr</sub>² · ${v('R')}<sub>L</sub> = (${o.isr} A)² · ${sig(r.rLead)} Ω`, `${sig(r.sLead)} VA`));
      if (r.sC) steps.push(step(`${v('S')}<sub>Ü</sub>`, `(${o.isr} A)² · ${nf(o.rc, 3)} Ω`, `${sig(r.sC)} VA`));
      steps.push(step(`${v('S')}<sub>b</sub>`, `${nf(o.dev, 2)} VA + ${sig(r.sLead)} VA${r.sC ? ` + ${sig(r.sC)} VA` : ''}`, `${sig(r.sTot)} VA`));
      if (r.sr) steps.push(step(`${v('l')}<sub>max</sub>`, `(${v('S')}<sub>r</sub> − ${v('S')}<sub>Geräte</sub>) · ${v('A')} / (${v('I')}² · ${v('k')} · ${v('ρ')})`, `${nf(r.lenMax, 0)} m`));
      return {
        html: frame([
          kpi(L.sLead, `${sig(r.sLead)} VA`, `${v('R')}<sub>L</sub> = ${sig(r.rLead)} Ω`),
          kpi(L.sTot, `${sig(r.sTot)} VA`),
          kpi(L.sr, r.sr ? `${nf(r.sr, 1)} VA` : '> 60 VA', r.sr ? `${esc(L.util)}: ${pct(r.util)}` : '', true),
          ...(r.sr ? [kpi(tpl(L.lenMax, { sr: `${nf(r.sr, 1)} VA` }), `${nf(r.lenMax, 0)} m`)] : []),
          kpi(L.uTerm, `${sig(r.uTerm)} V`),
        ], notes, steps, L.basis, [`<button class="btn btn--ghost btn--small" type="button" data-calc-use="factor">${icon('arrow')}${esc(C.useBurden)}</button>`]),
        text: [`${C.tabs.burden}`, `${L.sLead}: ${sig(r.sLead)} VA`, `${L.sTot}: ${sig(r.sTot)} VA`, `${L.sr}: ${r.sr ? nf(r.sr, 1) + ' VA' : '> 60 VA'}`, r.sr ? `${tpl(L.lenMax, { sr: nf(r.sr, 1) + ' VA' })}: ${nf(r.lenMax, 0)} m` : ''],
        use: { factor: { sb: r.sTot, sr: r.sr, isr: String(o.isr) } },
      };
    },
    factor(o) {
      const L = C.factor;
      const prot = o.kind === 'p';
      const r = K.effFactor({ n: o.n, sr: o.sr, sb: o.sb, rct: o.rct, isr: Number(o.isr), ikMax: prot ? o.ik : null, ipr: prot ? o.ipr : null });
      design.isr = Number(o.isr); design.sr = o.sr;
      if (prot) design.alf = o.n; else design.fs = o.n;
      const notes = [];
      const sym = prot ? 'ALF' : 'FS';
      if (!prot) notes.push(r.nEff > o.n * 1.05 ? note(tpl(L.fsHigh, { v: nf(r.nEff, 1), add: `${sig(r.add)} VA` }), 'warn') : note(L.fsOk, 'ok'));
      else if (r.need == null) notes.push(note(L.alfInfo));
      else notes.push(r.ok ? note(L.alfOk, 'ok') : note(L.alfLow, 'warn'));
      const steps = [
        step(`${v('S')}<sub>i</sub>`, `${v('I')}<sub>sr</sub>² · ${v('R')}<sub>ct</sub> = (${o.isr} A)² · ${nf(o.rct, 3)} Ω`, `${sig(r.si)} VA`),
        step(`${v('n')}′`, `${v('n')} · (${v('S')}<sub>i</sub> + ${v('S')}<sub>r</sub>) / (${v('S')}<sub>i</sub> + ${v('S')}<sub>b</sub>) = ${nf(o.n, 1)} · (${sig(r.si)} + ${nf(o.sr, 2)}) / (${sig(r.si)} + ${nf(o.sb, 2)})`, nf(r.nEff, 1)),
      ];
      if (!prot && r.add > 0) steps.push(step(`${v('S')}<sub>Z</sub>`, `${v('S')}<sub>r</sub> − ${v('S')}<sub>b</sub> = ${nf(o.sr, 2)} VA − ${nf(o.sb, 2)} VA`, `${sig(r.add)} VA`));
      if (prot && r.need != null) steps.push(step(`${v('n')}<sub>erf</sub>`, `${v('I')}<sub>k,max</sub> / ${v('I')}<sub>pr</sub> = ${nf(o.ik * 1000, 0)} A / ${nf(o.ipr, 0)} A`, nf(r.need, 1)));
      return {
        html: frame([
          kpi(L.si, `${sig(r.si)} VA`),
          kpi(L.nEff, `${sym} ${nf(r.nEff, 1)}`, `${esc(L.n)}: ${sym} ${nf(o.n, 1)}`, true),
          ...(prot && r.need != null ? [kpi(L.need, `${sym} ≥ ${nf(r.need, 1)}`, r.ok ? '✓' : '✗')] : []),
          ...(!prot && r.add > 0 ? [kpi(tpl(L.add, { n: nf(o.n, 1) }), `${sig(r.add)} VA`)] : []),
        ], notes, steps, L.basis),
        text: [C.tabs.factor, `${L.si}: ${sig(r.si)} VA`, `${L.nEff}: ${sym} ${nf(r.nEff, 1)}`, prot && r.need != null ? `${L.need}: ${sym} ≥ ${nf(r.need, 1)}` : '', !prot && r.add > 0 ? `${tpl(L.add, { n: nf(o.n, 1) })}: ${sig(r.add)} VA` : ''],
      };
    },
    short(o) {
      const L = C.short;
      let ik = o.ik, ikStep = null;
      if (o.mode === 'trafo') { ik = K.ikFromTrafo({ s: o.s, u: o.u, uk: o.uk }); ikStep = step(`${v('I')}<sub>k</sub>″`, `${v('S')}<sub>rT</sub> / (√3 · ${v('U')} · ${v('u')}<sub>k</sub>) = ${nf(o.s, 0)} kVA / (√3 · ${nf(o.u, 2)} kV · ${nf(o.uk / 100, 3)})`, `${nf(ik, 2)} kA`); }
      if (o.mode === 'grid') { ik = K.ikFromSk({ sk: o.sk, u: o.u }); ikStep = step(`${v('I')}<sub>k</sub>″`, `${v('S')}<sub>k</sub>″ / (√3 · ${v('U')}) = ${nf(o.sk, 0)} MVA / (√3 · ${nf(o.u, 2)} kV)`, `${nf(ik, 2)} kA`); }
      const f = Number(o.f);
      const r = K.shortCircuit({ ik, tk: o.tk, f, kappa: o.kappa, ipr: o.ipr || null });
      const std = K.stepUp(K.ITH_STEPS, r.ith1);
      const idynStd = (std || r.ith1) * r.fac;
      design.ith = std || Math.ceil(r.ith1); design.f = f;
      if (o.mode !== 'direct' && o.u) design.um = umForSystem(o.u);
      if (o.ipr) design.ipr = o.ipr;
      const notes = [];
      const idynHigh = idynStd < r.ip - 1e-9;
      design.idyn = idynHigh ? Math.ceil(r.ip * 10) / 10 : null;
      notes.push(!idynHigh ? note(tpl(L.idynOk, { f: nf(r.fac, 1) }), 'ok') : note(tpl(L.idynLow, { f: nf(r.fac, 1), ip: `${nf(r.ip, 1)} kA` })));
      if (r.mult != null && r.mult > 100) notes.push(note(L.multHigh, 'warn'));
      if (o.mode !== 'direct') notes.push(note(L.trafoNote));
      const steps = [...(ikStep ? [ikStep] : []),
        step(`${v('I')}<sub>th</sub>(1 s)`, `${v('I')}<sub>k</sub>″ · √${v('t')}<sub>k</sub> = ${nf(ik, 2)} kA · √${nf(o.tk, 2)}`, `${nf(r.ith1, 2)} kA`),
        step(`${v('i')}<sub>p</sub>`, `${v('κ')} · √2 · ${v('I')}<sub>k</sub>″ = ${nf(o.kappa, 2)} · √2 · ${nf(ik, 2)} kA`, `${nf(r.ip, 1)} kA`),
        step(`${v('I')}<sub>dyn</sub>`, `${nf(r.fac, 1)} · ${v('I')}<sub>th</sub> = ${nf(r.fac, 1)} · ${nf(std || r.ith1, 2)} kA`, `${nf(idynStd, 1)} kA`)];
      if (r.mult != null) steps.push(step(`${v('I')}<sub>th</sub> / ${v('I')}<sub>pr</sub>`, `${nf(r.ith1 * 1000, 0)} A / ${nf(o.ipr, 0)} A`, `${nf(r.mult, 0)}`));
      return {
        html: frame([
          ...(o.mode !== 'direct' ? [kpi(L.ikCalc, `${nf(ik, 2)} kA`)] : []),
          kpi(L.ith, `${nf(r.ith1, 2)} kA`, std ? `${esc(L.std)}: ${nf(std, 2)} kA` : '', true),
          kpi(L.idyn, `${nf(r.ip, 1)} kA`, `${v('I')}<sub>dyn</sub> = ${nf(r.fac, 1)} · ${v('I')}<sub>th</sub> = ${nf(idynStd, 1)} kA`),
          ...(r.mult != null ? [kpi(L.mult, `${nf(r.mult, 0)} × ${v('I')}<sub>pr</sub>`)] : []),
        ], notes, steps, L.basis, [findBtn('ct')]),
        text: [C.tabs.short, o.mode !== 'direct' ? `${L.ikCalc}: ${nf(ik, 2)} kA` : '', `${L.ith}: ${nf(r.ith1, 2)} kA${std ? ` (${L.std}: ${nf(std, 2)} kA)` : ''}`, `${L.idyn}: ${nf(r.ip, 1)} kA`, r.mult != null ? `${L.mult}: ${nf(r.mult, 0)}` : ''],
      };
    },
    primary(o) {
      const L = C.primary;
      const ext = Number(o.ext);
      const r = K.primaryCurrent({ s: o.mode === 's' ? o.s : null, p: o.mode === 'p' ? o.p : null, cos: o.cos, u: o.u, phases: Number(o.phases), margin: Number(o.margin), ext });
      if (!r) return { html: `<p class="err">${esc(C.invalid)}</p>`, text: [] };
      design.ipr = r.ipr; design.um = umForSystem(o.u); design.cls = r.sClass ? '0.5S' : null;
      const notes = [r.over ? note(L.over, 'warn') : r.sClass ? note(L.sClass, 'warn') : note(L.ok, 'ok')];
      if (ext > 1) notes.push(note(tpl(L.extNote, { e: `${nf(ext * 100, 0)} %`, i: `${nf(r.ipr * ext, 0)} A` })));
      const ph3 = Number(o.phases) === 3;
      const steps = [];
      if (o.mode === 'p') steps.push(step(v('S'), `${v('P')} / cos ${v('φ')} = ${nf(o.p, 1)} kW / ${nf(o.cos, 2)}`, `${nf(r.sva, 1)} kVA`));
      steps.push(step(`${v('I')}<sub>b</sub>`, `${v('S')} / (${ph3 ? '√3 · ' : ''}${v('U')}) = ${nf(r.sva, 1)} kVA / (${ph3 ? '√3 · ' : ''}${nf(o.u, 3)} kV)`, `${nf(r.ib, 1)} A`));
      steps.push(step(`${v('I')}<sub>min</sub>`, `${v('I')}<sub>b</sub> · (1 + ${nf(Number(o.margin), 0)} %)${ext > 1 ? ` / ${nf(ext, 1)}` : ''}`, `${nf(r.need / ext, 1)} A`));
      steps.push(step(`${v('I')}<sub>pr</sub>`, `${esc(L.series)}`, `${nf(r.ipr, 2)} A`));
      steps.push(step(`${v('I')}<sub>b</sub> / ${v('I')}<sub>pr</sub>`, `${nf(r.ib, 1)} A / ${nf(r.ipr, 2)} A`, pct(r.load)));
      return {
        html: frame([
          kpi(L.ib, `${nf(r.ib, 1)} A`, o.mode === 'p' ? `${v('S')} = ${nf(r.sva, 1)} kVA` : ''),
          kpi(L.need, `${nf(r.need, 1)} A`),
          kpi(L.ipr, `${nf(r.ipr, 2)} A`, `${esc(L.load)}: ${pct(r.load)}`, true),
          ...(r.lower ? [kpi(L.lower, `${nf(r.lower, 2)} A`, `${esc(L.load)}: ${pct(r.lowerLoad)}`)] : []),
        ], notes, steps, L.basis, [findBtn('ct')]),
        text: [C.tabs.primary, `${L.ib}: ${nf(r.ib, 1)} A`, `${L.ipr}: ${nf(r.ipr, 2)} A (${L.load}: ${pct(r.load)})`],
      };
    },
    vt(o) {
      const L = C.vt;
      const pole = Number(o.pole);
      const earthing = pole === 1 ? o.earthing : 'effective';
      const r = K.vtDesign({ un: o.un, pole, earthing, usr: Number(o.usr), sdev: o.sdev, len: o.len, area: Number(o.area), cls: o.cls });
      const um = umForSystem(o.un);
      const uRaw = fmtNum(Math.round(o.un * 1000), lang, { useGrouping: false });
      const uprTxt = pole === 1 ? `${uRaw}/√3` : uRaw;
      const usrTxt = pole === 1 ? `${o.usr}/√3` : `${o.usr}`;
      const enTxt = pole === 1 ? `${o.usr}/${r.enLabel === 'r3' ? '√3' : '3'}` : '';
      const ratio = [uprTxt, usrTxt, enTxt].filter(Boolean).join(' / ');
      const vfTxt = r.vf[1] === 'cont' ? `${nf(r.vf[0], 1)} Un ${C.unit.cont}` : `${nf(r.vf[0], 1)} Un ${r.vf[1].replace(/(\d+)([hs])/, (m0, a, b) => `${a} ${C.unit[b]}`)}`;
      const cls = o.cls;
      const clsTxt = lang === 'en' ? cls : cls.replace('.', ',');
      design.vt = { um, ratio, cls: clsTxt, sr: r.sr, vf: vfTxt, pole };
      const notes = [note(tpl(L.shareNote, { v: pct(r.share), c: clsTxt }), r.share > 0.25 ? 'warn' : 'info')];
      if (r.share > 0.25) notes.push(note(L.shareHigh, 'warn'));
      if (pole === 1) notes.push(note(L.vfNote), note(L.enNote));
      const steps = [
        step(`${v('U')}<sub>pr</sub>`, pole === 1 ? `${v('U')}<sub>n</sub> / √3 = ${nf(o.un * 1000, 0)} V / √3` : `${v('U')}<sub>n</sub>`, `${nf(r.upr, 0)} V`),
        step(`${v('U')}<sub>sr</sub>`, pole === 1 ? `${o.usr} V / √3` : `${o.usr} V`, `${nf(r.us, 1)} V`),
        step(v('I'), `${v('S')} / ${v('U')}<sub>sr</sub> = ${nf(o.sdev, 1)} VA / ${nf(r.us, 1)} V`, `${sig(r.i)} A`),
        step(`${v('R')}<sub>L</sub>`, `2 · ${v('ρ')} · ${v('l')} / ${v('A')} = 2 · ${nf(K.RHO20.cu, 4)} · ${nf(o.len, 1)} m / ${nf(Number(o.area), 1)} mm²`, `${sig(r.rLead)} Ω`),
        step(`Δ${v('U')}`, `${v('I')} · ${v('R')}<sub>L</sub> = ${sig(r.i)} A · ${sig(r.rLead)} Ω`, `${sig(r.du)} V = ${nf(r.duPct, 3)} %`),
        step(`Δ${v('U')} / ${v('ε')}`, `${nf(r.duPct, 3)} % / ${nf(r.lim, 1)} %`, pct(r.share)),
      ];
      return {
        html: frame([
          kpi(L.ratio, `${ratio} V`, '', true),
          kpi(L.um, `${nf(um, 2)} kV`),
          kpi(L.vf, vfTxt),
          kpi(L.du, `${nf(r.duPct, 3)} %`, `${esc(L.share)}: ${pct(r.share)}`),
          kpi(L.sr, r.sr ? `${nf(r.sr, 0)} VA` : '–', r.sr ? `${esc(C.burden.util)}: ${pct(r.util)}` : ''),
        ], notes, steps, L.basis, [findBtn('vt')]),
        text: [C.tabs.vt, `${L.ratio}: ${ratio} V`, `${L.um}: ${nf(um, 2)} kV`, `${L.vf}: ${vfTxt}`, `${L.du}: ${nf(r.duPct, 3)} % (${pct(r.share)})`, `${L.sr}: ${r.sr ? nf(r.sr, 0) + ' VA' : '–'}`],
      };
    },
  };

  // ---------- Ablauf ----------
  const last = {};
  function compute(c, { write = true } = {}) {
    syncSwitch(c);
    const { o, bad } = read(c);
    const outEl = $(`[data-out="${c}"]`, box);
    if (bad.length) { outEl.innerHTML = `<p class="err" role="alert">${esc(C.invalid)}</p>`; last[c] = null; return; }
    let res;
    try { res = R[c](o); } catch (e) { console.error(e); outEl.innerHTML = `<p class="err" role="alert">${esc(C.invalid)}</p>`; return; }
    last[c] = res;
    const open = $('details.calc__steps', outEl)?.open;
    outEl.innerHTML = res.html;
    if (open) $('details.calc__steps', outEl).open = true;
    if (write) writeState(c);
  }
  function writeState(c) {
    const q = new URLSearchParams({ c });
    const fm = form(c);
    for (const f of FIELDS[c]) {
      const val = f.type === 'seg' ? fm.querySelector(`input[name="${f.name}"]:checked`)?.value : fm.elements[f.name]?.value;
      if (val != null && String(val) !== String(f.def) && !(f.type === 'num' && num(val) === Number(f.def))) q.set(f.name, String(val).replace(',', '.'));
    }
    writeQuery(q.toString());
  }
  function select(c, { focus = false, write = true } = {}) {
    current = c;
    tabs.forEach((b) => { const on = b.dataset.tab === c; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    panels.forEach((p) => { p.hidden = p.dataset.panel !== c; });
    compute(c, { write });
  }
  function setField(c, name, value) {
    const fm = form(c);
    const f = FIELDS[c].find((x) => x.name === name);
    if (!f || value == null) return;
    if (f.type === 'seg') { const r = fm.querySelector(`input[name="${name}"][value="${value}"]`); if (r) r.checked = true; return; }
    const el = fm.elements[name];
    if (f.type === 'select') { if ([...el.options].some((x) => x.value === String(value))) el.value = String(value); return; }
    el.value = typeof value === 'number' ? fmtNum(Math.round(value * 1000) / 1000, lang, { maximumFractionDigits: 3, useGrouping: false }) : String(value).replace('.', lang === 'en' ? '.' : ',');
  }

  // CT-Spezifikation aus allen Beiträgen (Primärstrom, Kurzschluss, Bürde)
  function specText(kind) {
    const S = C.spec;
    const fill = (tplStr, vals) => tplStr.split(', ').filter((seg) => (seg.match(/\{(\w+)\}/g) || []).every((m) => vals[m.slice(1, -1)] != null && vals[m.slice(1, -1)] !== '')).map((seg) => tpl(seg, vals)).join(', ');
    const n2 = (x) => (x == null ? null : fmtNum(x, lang, { maximumFractionDigits: 2, useGrouping: false }));
    if (kind === 'vt') {
      const d = design.vt;
      if (!d) return '';
      return fill(S.vt, { pole: S[d.pole === 1 ? 'pole1' : 'pole2'], um: n2(d.um), ratio: d.ratio, cls: d.cls, sr: d.sr, vf: d.vf, f: 50 });
    }
    const d = design;
    const cls = d.cls ? (lang === 'en' ? d.cls : d.cls.replace('.', ',')) + (d.fs ? ' FS' + d.fs : '') : d.fs ? `0${lang === 'en' ? '.' : ','}5 FS${d.fs}` : null;
    return fill(S.ct, { um: n2(d.um), ratio: d.ipr ? `${n2(d.ipr)}/${d.isr || 5}` : null, cls, sr: d.sr, ith: n2(d.ith), idyn: n2(d.idyn), f: d.f || null });
  }

  // ---------- Ereignisse ----------
  const live = debounce((c) => compute(c), 220);
  box.addEventListener('input', (e) => { const fm = e.target.closest('[data-form]'); if (fm) live(fm.dataset.form); });
  box.addEventListener('change', (e) => {
    const fm = e.target.closest('[data-form]');
    if (!fm) return;
    const c = fm.dataset.form;
    // FS/ALF: üblichen Startwert beim Umschalten setzen
    if (c === 'factor' && e.target.name === 'kind') { const n = fm.elements.n; if (e.target.value === 'p' && num(n.value) === 5) setField(c, 'n', 10); if (e.target.value === 'm' && num(n.value) === 10) setField(c, 'n', 5); }
    compute(c);
  });
  box.addEventListener('submit', (e) => e.preventDefault());
  box.addEventListener('click', (e) => {
    const tb = e.target.closest('[data-tab]');
    if (tb) { select(tb.dataset.tab); return; }
    if (e.target.closest('[data-calc-copy]')) { const r = last[current]; if (r) copyText(r.text.filter(Boolean).join('\n'), t); return; }
    if (e.target.closest('[data-calc-share]')) {
      const url = location.href;
      navigator.clipboard?.writeText(url).then(() => toast(C.linkCopied), () => copyText(url, t)) ?? copyText(url, t);
      return;
    }
    const use = e.target.closest('[data-calc-use]');
    if (use) { const r = last[current]?.use?.[use.dataset.calcUse]; if (r) { for (const [k, val] of Object.entries(r)) setField(use.dataset.calcUse, k, val); select(use.dataset.calcUse, { focus: true }); } return; }
    const find = e.target.closest('[data-calc-find]');
    if (find) { const text = specText(find.dataset.calcFind); if (text) { handoff.put('spec', { text }); location.href = ctx.href('assistant'); } }
  });
  // Pfeiltasten in der Registerleiste
  $('[role="tablist"]', box).addEventListener('keydown', (e) => {
    const i = CALCS.indexOf(current);
    let j = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % CALCS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + CALCS.length) % CALCS.length;
    else if (e.key === 'Home') j = 0;
    else if (e.key === 'End') j = CALCS.length - 1;
    if (j != null) { e.preventDefault(); select(CALCS[j], { focus: true }); }
  });

  // Zustand aus dem Link
  const q = new URLSearchParams(readQuery());
  const c0 = CALCS.includes(q.get('c')) ? q.get('c') : 'burden';
  for (const f of FIELDS[c0]) if (q.has(f.name)) setField(c0, f.name, f.type === 'num' ? num(q.get(f.name)) : q.get(f.name));
  // alle Rechner einmal rechnen (gemeinsame Auslegung), dann den gewünschten zeigen
  for (const c of CALCS) if (c !== c0) compute(c, { write: false });
  select(c0, { write: q.has('c') });
}
