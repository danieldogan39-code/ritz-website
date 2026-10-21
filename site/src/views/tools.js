// Werkzeuge: Übersicht, Spezifikations-Check, Wandler-Rechner (Seitengerüste; Logik im Browser)
import { esc, icon, fmtNum, tpl } from '../lib/util.js';
import { phead, sectionHead } from './layout.js';
import { parsePosition } from '../lib/spec.js';
import { markedText } from '../lib/reqfmt.js';
export { markedText };
import { CALCS, FIELDS, SWITCH } from '../lib/calcdef.js';

const ICON = {
  scan: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M14 3H6v18h7"/><path d="M14 3v4h4v4"/><path d="M9 9h3M9 13h2"/><circle cx="17" cy="17" r="3.2"/><path d="m21.5 21.5-2.2-2.2"/></svg>',
  calc: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3M8 18h4"/></svg>',
  folder: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h6l2 2h10v11H3z"/><path d="M7 13h10M7 16h6"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="5" y="10" width="14" height="10" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  upload: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>',
};
export const toolIcon = (k) => ICON[k] || '';

// kleine, echte Vorschau des Checks (Parser läuft beim Erzeugen der Seite)
export function specPreview(ctx, text) {
  const A = ctx.t.x.assist;
  const p = parsePosition(text);
  return `<p class="mini-spec__text">${markedText(text, p.marks, A)}</p>`;
}

// ---------------- Übersicht ----------------
export function toolsPage(ctx) {
  const { t, href, lang } = ctx;
  const X = t.x, H = X.hub;
  const card = (id, key, demo) => {
    const c = H.cards[key];
    const url = href(id);
    return `<article class="tool" data-reveal="head">
      <div class="tool__demo" aria-hidden="true">${demo}</div>
      <div class="tool__body">
        <span class="tool__icon">${ICON[{ assistant: 'scan', calculators: 'calc', inquiry: 'folder' }[key]]}</span>
        <h2 class="h3"><a href="${url}">${esc(c.title)}</a></h2>
        <p>${esc(c.text)}</p>
        <p class="tool__saves">${ICON.clock}<span>${esc(c.saves)}</span></p>
        <a class="btn${key === 'assistant' ? ' btn--red' : ''}" href="${url}">${esc(c.cta)}</a>
      </div>
    </article>`;
  };
  const f = (v, d = 2) => fmtNum(v, lang, { maximumFractionDigits: d });
  const calcDemo = `<div class="mini-calc"><div class="mini-calc__f"><var>S</var><sub>L</sub> = <var>I</var>² · <var>R</var><sub>L</sub></div><div class="mini-calc__v">(5 A)² · ${f(0.28)} Ω = <b>${f(7, 1)} VA</b></div>
    <div class="mini-calc__bar"><span style="--w:.95"></span></div><div class="mini-calc__legend"><span>${f(9.5, 1)} VA</span><span>10 VA</span></div></div>`;
  const weeks = [[6, 10, '1.10'], [8, 12, '1.20'], [3, 6, '1.30']];
  const planDemo = `<div class="mini-plan">${weeks.map(([a, b, r]) => `<div class="mini-plan__row"><span>${esc(r)}</span><div class="mini-plan__track"><i style="--a:${a / 14};--b:${b / 14}"></i></div></div>`).join('')}<div class="mini-plan__due"><span>${esc(X.mappe.due)}</span></div></div>`;
  return `${phead(ctx, { title: H.h1, lead: H.lead, image: 'mimg/2022__11__intro_home_slider_2.webp', crumbs: [[H.title]] })}
<section class="section section--tight">
  <div class="wrap">
    <div class="tools">
      ${card('assistant', 'assistant', `<div class="mini-spec">${specPreview(ctx, X.home.sample)}<div class="mini-spec__hit"><span>${esc(X.assist.best)}</span><b>ASS</b><em>96&nbsp;%</em></div></div>`)}
      ${card('calculators', 'calculators', calcDemo)}
      ${card('inquiry', 'inquiry', planDemo)}
    </div>
    <p class="tools__privacy">${ICON.lock}<span>${esc(H.privacy)}</span></p>
  </div>
</section>
<section class="section section--porcelain">
  <div class="wrap">
    ${sectionHead(H.flowTitle, '', '', { reveal: true })}
    <ol class="flow">${H.flow.map((s) => `<li><span>${esc(s)}</span></li>`).join('')}</ol>
  </div>
</section>
<section class="section section--tight">
  <div class="wrap split split--even">
    <div class="stack" style="--s:1rem"><h2 class="h3">${esc(H.staffTitle)}</h2><p class="prose">${esc(H.staffText)}</p></div>
    <div class="stack" style="--s:1rem"><h2 class="h3">${esc(H.moreTitle)}</h2>
      <ul class="tools__more">
        <li><a href="${href('finder')}"><b>${esc(t.nav.finder)}</b><span>${esc(H.more.finder)}</span></a></li>
        <li><a href="${href('compare')}"><b>${esc(t.compare.title)}</b><span>${esc(H.more.compare)}</span></a></li>
        <li><a href="${href('downloads')}"><b>${esc(t.nav.downloads)}</b><span>${esc(H.more.downloads)}</span></a></li>
      </ul>
    </div>
  </div>
</section>`;
}

// ---------------- Spezifikations-Check ----------------
export function assistantPage(ctx) {
  const { t, href } = ctx;
  const X = t.x, A = X.assist;
  return `${phead(ctx, { title: A.title, lead: A.lead, crumbs: [[X.hub.title, href('tools')], [A.title]], cls: 'phead--compact' })}
<section class="section section--tight">
  <div class="wrap sc" data-assist>
    <div class="sc__in">
      <div class="sc__drop" data-sc-drop>
        <label class="label" for="sc-text">${esc(A.inputLabel)}</label>
        <textarea class="textarea sc__text" id="sc-text" data-sc-text spellcheck="false" autocomplete="off" placeholder="${esc(A.placeholder)}"></textarea>
        <div class="sc__bar">
          <label class="btn btn--ghost btn--small sc__file">${ICON.upload}<span>${esc(A.file)}</span><input class="vh" type="file" data-sc-file accept=".pdf,.docx,.xlsx,.xlsm,.csv,.tsv,.txt,.eml,.x81,.x83,.x84,.x86,.d83,.xml,text/plain,application/pdf"></label>
          <span class="small muted">${esc(A.fileHint)}</span>
          <button class="link small sc__clear" type="button" data-sc-clear hidden>${esc(A.clear)}</button>
        </div>
        <div class="sc__dropzone" aria-hidden="true"><span>${ICON.upload}${esc(A.drop)}</span></div>
      </div>
      <p class="sc__status small" data-sc-status role="status" aria-live="polite"></p>
      <div class="sc__examples"><span class="small">${esc(A.examples)}:</span>${A.ex.map((e, i) => `<button class="chip" type="button" data-sc-example="${i}">${esc(e.label)}</button>`).join('')}</div>
      <label class="check sc__assume"><input type="checkbox" data-sc-assume checked><span>${esc(A.assume)}</span></label>
      <p class="sc__privacy small">${ICON.lock}<span>${esc(A.privacy)}</span></p>
    </div>
    <div class="sc__out" data-sc-out>
      <div class="sc__empty">
        <h2 class="h4">${esc(A.emptyTitle)}</h2>
        <ol class="sc__steps">${A.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        <div class="sc__legend"><span class="small">${esc(A.legend)}:</span>${['ratio', 'um', 'cls', 'va', 'ith', 'qty'].map((k) => `<mark class="mk mk--${k}">${esc(A.mark[k])}</mark>`).join('')}</div>
      </div>
      <noscript><p class="notice">${esc(t.ui.error)}</p></noscript>
    </div>
  </div>
</section>`;
}

// ---------------- Wandler-Rechner ----------------
export function calculatorsPage(ctx) {
  const { t, href, lang } = ctx;
  const X = t.x, C = X.calc;
  const optLabel = (calc, [v, l]) => (C[calc][l] ? C[calc][l] : /^[\d.,]+$/.test(l) ? fmtNum(Number(v), lang) : l);
  const field = (calc, f) => {
    const L = C[calc];
    const id = `c-${calc}-${f.name}`;
    const label = L[f.name] || f.name;
    const sw = SWITCH[calc];
    const only = f.only ? ` data-only="${f.only}"` : '';
    const hint = f.hint ? `<span class="hint" id="${id}-h">${esc(L[f.hint])}</span>` : '';
    const desc = f.hint ? ` aria-describedby="${id}-h"` : '';
    const opt = f.optional ? ` <span class="faint">(${esc(C.optional)})</span>` : '';
    if (f.type === 'seg') {
      return `<fieldset class="cf cf--seg${f.name === sw ? ' cf--switch' : ''}"${only}><legend>${esc(label)}</legend><div class="seg">${f.opts.map((o) => `<label><input type="radio" name="${f.name}" value="${o[0]}"${o[0] === f.def ? ' checked' : ''}><span>${esc(optLabel(calc, o))}</span></label>`).join('')}</div></fieldset>`;
    }
    if (f.type === 'select') {
      return `<div class="cf"${only}><label for="${id}">${esc(label)}${opt}</label><div class="cf__in"><select class="select" id="${id}" name="${f.name}"${desc}>${f.opts.map((o) => `<option value="${o[0]}"${o[0] === f.def ? ' selected' : ''}>${esc(optLabel(calc, o))}</option>`).join('')}</select>${f.unit ? `<span class="cf__unit">${esc(f.unit)}</span>` : ''}</div>${hint}</div>`;
    }
    const def = f.def === '' ? '' : fmtNum(Number(f.def), lang, { maximumFractionDigits: 4, useGrouping: false });
    const labelBy = f.labelBy ? ` data-label-by='${esc(JSON.stringify(Object.fromEntries(Object.entries(f.labelBy).map(([k, v]) => [k, L[v]]))))}'` : '';
    return `<div class="cf"${only}><label for="${id}"${labelBy}>${esc(label)}${opt}</label><div class="cf__in"><input class="input" id="${id}" name="${f.name}" type="text" inputmode="decimal" autocomplete="off" value="${esc(def)}" data-min="${f.min}" data-max="${f.max}"${f.optional ? ' data-optional' : ''}${desc}>${f.unit ? `<span class="cf__unit">${esc(f.unit)}</span>` : ''}</div>${hint}</div>`;
  };
  return `${phead(ctx, { title: C.title, lead: C.lead, crumbs: [[X.hub.title, href('tools')], [C.title]], cls: 'phead--compact' })}
<section class="section section--tight">
  <div class="wrap calc" data-calc>
    <div class="calc__tabs" role="tablist" aria-label="${esc(C.title)}">
      ${CALCS.map((c, i) => `<button class="calc__tab" type="button" role="tab" id="ct-${c}" aria-controls="cp-${c}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-tab="${c}"><b>${esc(C.tabs[c])}</b><span>${esc(C.tabText[c])}</span></button>`).join('')}
    </div>
    ${CALCS.map((c, i) => `<section class="calc__panel" role="tabpanel" id="cp-${c}" aria-labelledby="ct-${c}" data-panel="${c}"${i === 0 ? '' : ' hidden'}>
      <form class="calc__form" data-form="${c}" novalidate>${FIELDS[c].map((f) => field(c, f)).join('')}</form>
      <div class="calc__out" data-out="${c}"><p class="muted small">${esc(t.ui.loading)}</p></div>
    </section>`).join('')}
  </div>
</section>`;
}
