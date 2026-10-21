// Projektmappe: Positionen mit Kennzeichnung, Notiz und Sonderwünschen, Terminplanung rückwärts vom Liefertermin,
// Ausschreibungstexte, CSV, Teilen per Link (komplette Mappe im Link), Import geteilter Mappen, strukturierte Anfrage
import { $, $$, bus, getT, getX, getIndex, clientCtx, getCfgAll, readQuery, writeQuery, toast, saveFile, CFG } from './core.js';
import { basket, project, bindForm, copyText } from './basket.js';
import { esc, icon, tpl, imgTag, productGlyph, colon, fmtDate } from '../lib/util.js';
import { descriptor, imgFit, productThumb } from '../lib/product.js';
import { makeModel, selectionLines, prune } from '../lib/cfgcore.js';
import { techFromSel, tenderText } from '../lib/tech.js';
import { pack, unpack, packSync } from '../lib/share.js';

const DAY = 86400000;
export function isoWeek(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil(((x - y0) / DAY + 1) / 7);
}
const parseDate = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null; };
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export async function initMappe(root) {
  const box = $('[data-mappe]', root);
  if (!box || box.__init) return;
  box.__init = true;
  const [idx, t, X, ctx] = await Promise.all([getIndex(), getT(), getX(), clientCtx()]);
  const I = t.inquiry, M = X.mappe, lang = ctx.lang;
  const list = $('[data-basket-list]', box), emptyHtml = list.innerHTML;
  const planEl = $('[data-pm-plan]', box), countEl = $('[data-pm-count]', box), actions = $('[data-pm-actions]', box);
  const tenderBox = $('[data-pm-tenderbox]', box), tenderText_ = $('[data-pm-tendertext]', box), tenderBtn = $('[data-pm-tender]', box);
  const open = new Set();
  const fmtD = (d) => fmtDate(isoDate(d), lang, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const prodOf = (it) => (it.id ? idx._byId[it.id] : null);
  const weeksOf = (it) => { if (it.weeks) return it.weeks; const p = prodOf(it); return p?.weeks ? p.weeks[p.weeks.length - 1] : null; };

  // ---------- Projektangaben ----------
  const metaEls = $$('[data-pm]', box);
  const fillMeta = () => { const pj = project.get(); for (const el of metaEls) { const k = el.dataset.pm; el.value = pj[k] ?? (k === 'buffer' ? '1' : ''); } };
  fillMeta();
  for (const el of metaEls) el.addEventListener('change', () => { project.set({ [el.dataset.pm]: el.value.trim() }); render(); });

  // ---------- Termine ----------
  function plan(items) {
    const pj = project.get();
    const due = parseDate(pj.due);
    const buffer = Number(pj.buffer ?? 1) || 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const rows = {};
    let earliest = null, late = 0;
    for (const it of items) {
      const w = weeksOf(it);
      if (!due || !w) { rows[it.key] = { weeks: w }; continue; }
      const d = new Date(due.getTime() - (w + buffer) * 7 * DAY);
      const isLate = d < today;
      if (isLate) late++;
      if (!earliest || d < earliest) earliest = d;
      rows[it.key] = { weeks: w, date: d, late: isLate };
    }
    return { due, buffer, rows, earliest, late };
  }

  // ---------- Darstellung ----------
  function itemHtml(it, pl, i, n) {
    const p = prodOf(it) || { code: it.code, area: it.area, kind: 'ct' };
    const url = it.id && p.area ? ctx.href('product', { area: p.area, slug: it.id }) : null;
    const img = productThumb(ctx, p, { sizes: '72px' });
    const edit = it.id && p.area && p.cfg ? ctx.hrefA('product', { area: p.area, slug: it.id }, 'konfigurator', 'cfg=' + packSync({ s: it.sel || {}, q: it.qty, ...(it.ref ? { r: it.ref } : {}), ...(it.special ? { n: it.special } : {}), e: it.key })) : null;
    const r = pl.rows[it.key] || {};
    const la = ctx.dl !== lang ? ` lang="${ctx.dl}"` : '';
    const lines = it.lines || [];
    const isOpen = open.has(it.key);
    return `<div class="pmi" data-key="${esc(it.key)}">
      <div class="pmi__img">${img}</div>
      <div class="pmi__main">
        <div class="pmi__top">
          <span class="pmi__ref"><label class="vh" for="ref-${esc(it.key)}">${esc(M.ref)}</label><input id="ref-${esc(it.key)}" data-f="ref" value="${esc(it.ref || '')}" placeholder="${esc(M.mail.pos)}" maxlength="40" autocomplete="off"></span>
          ${url ? `<a class="pmi__code" href="${url}">${esc(it.code)}</a>` : `<b class="pmi__code">${esc(it.code)}</b>`}
          ${it.id && p.id ? `<span class="pmi__desc">${esc(descriptor(p, t, lang))}</span>` : ''}
        </div>
        ${lines.length ? `<div class="pmi__cfg"${it.custom ? '' : la}>${lines.map(([k, v]) => `<span>${esc(k)}${colon(lang)}<b>${esc(v)}</b></span>`).join('')}</div>` : `<div class="pmi__cfg"><span class="faint">${esc(I.unconfigured)}</span></div>`}
        <div class="cluster">
          ${r.date ? `<span class="pmi__date${r.late ? ' is-late' : ''}">${icon('calendar', 'width="14" height="14"')}${esc(tpl(M.orderBy, { date: fmtD(r.date) }))} · ${esc(tpl(M.week, { w: isoWeek(r.date) }))}</span>` : ''}
          <span class="small faint">${esc(r.weeks ? tpl(M.leadTime, { n: r.weeks }) : M.noWeeks)}</span>
          ${it.missing?.length ? `<span class="small" style="color:var(--warn)"${la}>${esc(tpl(X.assist.cfgOpen, { list: it.missing.join(', ') }))}</span>` : ''}
          ${r.late ? `<span class="small" style="color:var(--red-ink)">${esc(M.late)}</span>` : ''}
        </div>
        <details class="pmi__more" data-more${isOpen ? ' open' : ''}><summary>${esc(M.details)}${it.special || it.note ? ' •' : ''}</summary>
          <div class="pmi__fields">
            <div class="field"><label for="sp-${esc(it.key)}">${esc(M.special)}</label><textarea class="textarea" id="sp-${esc(it.key)}" data-f="special" placeholder="${esc(M.specialPh)}">${esc(it.special || '')}</textarea></div>
            <div class="field"><label for="no-${esc(it.key)}">${esc(M.note)}</label><textarea class="textarea" id="no-${esc(it.key)}" data-f="note" placeholder="${esc(M.notePh)}">${esc(it.note || '')}</textarea></div>
            ${it.src ? `<div class="pmi__src">${esc(it.src)}</div>` : ''}
          </div>
        </details>
      </div>
      <div class="pmi__side">
        <div class="qty"><button type="button" data-qty="-1" aria-label="−">−</button><input type="number" min="1" value="${it.qty || 1}" aria-label="${esc(t.product.quantity)}" data-qty-input><button type="button" data-qty="1" aria-label="+">+</button></div>
        <div class="pmi__tools">
          ${edit ? `<a class="icon-btn" href="${edit}" title="${esc(I.edit)}" aria-label="${esc(I.edit)}: ${esc(it.code)}">${icon('sliders')}</a>` : ''}
          <button class="icon-btn" type="button" data-act="dup" title="${esc(M.duplicate)}" aria-label="${esc(M.duplicate)}: ${esc(it.code)}">${icon('copy')}</button>
          <button class="icon-btn" type="button" data-act="up" title="${esc(M.up)}" aria-label="${esc(M.up)}"${i === 0 ? ' disabled' : ''}>${icon('left', 'style="transform:rotate(90deg)"')}</button>
          <button class="icon-btn" type="button" data-act="down" title="${esc(M.down)}" aria-label="${esc(M.down)}"${i === n - 1 ? ' disabled' : ''}>${icon('right', 'style="transform:rotate(90deg)"')}</button>
          <button class="icon-btn" type="button" data-act="rm" title="${esc(t.ui.remove)}" aria-label="${esc(t.ui.remove)}: ${esc(it.code)}">${icon('trash')}</button>
        </div>
      </div>
    </div>`;
  }

  function render() {
    const items = basket.all();
    const pl = plan(items);
    actions.hidden = !items.length;
    countEl.textContent = items.length ? `${items.length} · ${ctx.plural(items.reduce((s, i) => s + (i.qty || 1), 0), M.pieces)}` : '';
    if (!items.length) { list.innerHTML = emptyHtml; planEl.textContent = M.planHint; tenderBox.hidden = true; return; }
    list.innerHTML = items.map((it, i) => itemHtml(it, pl, i, items.length)).join('');
    if (pl.earliest) planEl.innerHTML = `${icon('calendar', 'width="16" height="16"')}<span>${esc(tpl(M.planAll, { date: fmtD(pl.earliest), w: tpl(M.week, { w: isoWeek(pl.earliest) }) }))}</span>${pl.late ? `<span class="is-late">${esc(tpl(M.planLate, { n: pl.late }))}</span>` : ''}`;
    else planEl.textContent = M.planHint;
    if (!tenderBox.hidden) tenderText_.textContent = tenderAll(items);
  }

  // ---------- Ausschreibungstexte, CSV ----------
  function tenderAll(items) {
    return items.map((it, i) => {
      const p = prodOf(it);
      if (!it.id || !p) return [it.ref ? tpl(X.tech.pos, { ref: it.ref }) : `${i + 1}.`, `${it.code}${it.src ? ': ' + it.src.replace(/\s+/g, ' ') : ''}`, `${X.tech.qty}: ${it.qty} ${X.tech.pcs}`].join('\n');
      return tenderText({ T: X.tech, lang, code: it.code, kindLabel: t.lbl.kind[p.kind] || '', installLabel: (p.install || []).map((x) => t.lbl.install[x]).join(' / '), formLabel: (p.form || []).slice(0, 2).map((f) => t.lbl.form[f]).filter(Boolean).join(', '), kind: p.kind, tc: it.tc || { cores: [] }, qty: it.qty, ref: it.ref || String(i + 1), notes: [it.tc?.special, it.special, ...(it.tc ? [] : (it.lines || []).map(([k, v]) => `${k}: ${v}`))].filter(Boolean).join('; ') });
    }).join('\n\n');
  }
  function csv(items) {
    const pl = plan(items);
    const q = (v) => { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = items.map((it, i) => { const r = pl.rows[it.key] || {}; return [it.ref || i + 1, it.qty, it.code, it.area ? t.lbl.area[it.area] || it.area : '', (it.lines || []).map(([k, v]) => `${k}: ${v}`).join('; '), it.special || '', it.note || '', r.weeks || '', r.date ? isoDate(r.date) : '']; });
    return '﻿' + [M.csvHead, ...rows].map((r) => r.map(q).join(';')).join('\r\n');
  }

  // ---------- Teilen und Übernehmen ----------
  const compact = (it) => (it.id ? { i: it.id, q: it.qty, s: it.sel || {}, ...(it.ref ? { r: it.ref } : {}), ...(it.special ? { n: it.special } : {}), ...(it.note ? { o: it.note } : {}) }
    : { c: it.code, q: it.qty, l: it.lines || [], ...(it.ref ? { r: it.ref } : {}), ...(it.src ? { x: it.src.slice(0, 600) } : {}), ...(it.special ? { n: it.special } : {}), ...(it.note ? { o: it.note } : {}) });
  async function shareUrl() {
    const pj = project.get();
    const payload = { v: 1, p: { ...(pj.name ? { n: pj.name } : {}), ...(pj.ref ? { r: pj.ref } : {}), ...(pj.due ? { d: pj.due } : {}), ...(pj.buffer ? { b: pj.buffer } : {}) }, i: basket.all().map(compact) };
    const href = ctx.href('inquiry', {}, 'm=' + (await pack(payload)));
    return CFG.mode === 'spa' ? location.href.split('#')[0] + href : location.origin + href;
  }
  async function expand(payload) {
    const need = (payload.i || []).some((x) => x.i);
    const cfgAll = need ? await getCfgAll(ctx.dl).catch(() => ({})) : {};
    return (payload.i || []).map((x) => {
      if (!x.i) return { id: null, custom: true, code: String(x.c || X.assist.customCode).slice(0, 80), qty: x.q || 1, lines: Array.isArray(x.l) ? x.l.slice(0, 40) : [], ref: x.r || '', src: x.x || '', special: x.n || '', note: x.o || '' };
      const p = idx._byId[x.i];
      if (!p) return null;
      const cf = cfgAll[x.i];
      const sel = {};
      let lines = [], tc = null;
      if (cf) {
        const m = makeModel({ options: cf.o, deps: cf.d });
        for (const [id, v] of Object.entries(x.s || {})) if (m.byId[id]) sel[id] = Array.isArray(v) ? v.map(String) : String(v);
        prune(m, sel);
        lines = selectionLines(m, sel);
        tc = techFromSel(cf, sel);
      }
      return { id: p.id, code: p.code, area: p.area, qty: x.q || 1, sel, lines, tc, weeks: tc?.weeks ?? (p.weeks ? p.weeks[p.weeks.length - 1] : null), ref: x.r || '', special: x.n || '', note: x.o || '' };
    }).filter(Boolean);
  }
  async function checkImport() {
    const raw = new URLSearchParams(readQuery()).get('m');
    if (!raw) return;
    const banner = $('[data-pm-import]', box);
    let payload;
    try { payload = await unpack(raw); } catch (e) { banner.hidden = false; banner.innerHTML = `<p>${esc(M.importBad)}</p>`; return; }
    const items = await expand(payload);
    const n = items.length;
    banner.hidden = false;
    banner.innerHTML = `<p><b>${esc(M.importTitle)}</b>${payload.p?.n ? ` – ${esc(payload.p.n)}` : ''}</p><p>${esc(tpl(M.importText, { n: ctx.plural(n, M.count) }))}</p>
      <div class="cluster"><button class="btn btn--red btn--small" type="button" data-imp="replace">${esc(M.importReplace)}</button>${basket.all().length ? `<button class="btn btn--small" type="button" data-imp="append">${esc(M.importAppend)}</button>` : ''}<button class="btn btn--ghost btn--small" type="button" data-imp="cancel">${esc(M.importCancel)}</button></div>`;
    banner.addEventListener('click', (e) => {
      const b = e.target.closest('[data-imp]');
      if (!b) return;
      if (b.dataset.imp !== 'cancel') {
        if (b.dataset.imp === 'replace') basket.replaceAll(items); else basket.addMany(items, { merge: false });
        const pp = payload.p || {};
        if (b.dataset.imp === 'replace' || !project.get().name) project.set({ name: pp.n || '', ref: pp.r || '', due: pp.d || '', buffer: pp.b ?? '1' });
        fillMeta();
        toast(M.imported);
      }
      banner.hidden = true;
      banner.innerHTML = '';
      writeQuery('');
      render();
    });
    banner.querySelector('button')?.focus();
  }

  // ---------- Ereignisse ----------
  bus.on('store:ritz-basket', render);
  list.addEventListener('click', (e) => {
    const row = e.target.closest('[data-key]');
    if (!row) return;
    const key = row.dataset.key;
    const q = e.target.closest('[data-qty]');
    if (q) { const it = basket.get(key); basket.update(key, (it?.qty || 1) + Number(q.dataset.qty)); return; }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'rm') basket.remove(key);
    else if (act === 'dup') basket.duplicate(key);
    else if (act === 'up' || act === 'down') { basket.move(key, act === 'up' ? -1 : 1); requestAnimationFrame(() => $(`[data-key="${key}"] [data-act="${act}"]`, list)?.focus()); }
  });
  list.addEventListener('change', (e) => {
    const row = e.target.closest('[data-key]');
    if (!row) return;
    const inp = e.target.closest('[data-qty-input]');
    if (inp) { basket.update(row.dataset.key, parseInt(inp.value, 10)); return; }
    const f = e.target.closest('[data-f]');
    if (f) basket.patch(row.dataset.key, { [f.dataset.f]: f.value.trim() });
  });
  list.addEventListener('toggle', (e) => {
    const d = e.target.closest?.('[data-more]');
    if (!d) return;
    const key = d.closest('[data-key]').dataset.key;
    if (d.open) open.add(key); else open.delete(key);
  }, true);
  box.addEventListener('click', async (e) => {
    if (e.target.closest('[data-pm-renumber]')) { basket.all().forEach((it, i) => basket.patch(it.key, { ref: String(i + 1) })); return; }
    if (e.target.closest('[data-pm-tender]')) {
      tenderBox.hidden = !tenderBox.hidden;
      tenderBtn.setAttribute('aria-expanded', String(!tenderBox.hidden));
      if (!tenderBox.hidden) { tenderBox.open = true; tenderText_.textContent = tenderAll(basket.all()); tenderBox.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' }); }
      return;
    }
    if (e.target.closest('[data-pm-tendercopy]')) { copyText(tenderAll(basket.all()), t); return; }
    if (e.target.closest('[data-pm-csv]')) {
      const data = csv(basket.all());
      const name = `${(project.get().name || 'RITZ-Projektmappe').replace(/[^\w\-äöüÄÖÜß]+/g, '-')}-${isoDate(new Date())}.csv`;
      if (!saveFile(name, data, 'text/csv')) { copyText(data, t); toast(M.csvCopied); }
      return;
    }
    if (e.target.closest('[data-pm-share]')) {
      const url = await shareUrl();
      try { await navigator.clipboard.writeText(url); toast(M.linkCopied); } catch (err) { copyText(url, t); }
      return;
    }
    if (e.target.closest('[data-pm-print]')) { window.print(); return; }
    // Leeren mit Rückfrage auf der Seite (kein Browser-Dialog)
    const cb = $('[data-pm-clearbox]', box);
    if (e.target.closest('[data-basket-clear]')) { cb.innerHTML = `<span>${esc(M.clearAsk)}</span><button class="btn btn--red btn--small" type="button" data-pm-clear-yes>${esc(M.clearYes)}</button><button class="link small" type="button" data-pm-clear-no>${esc(M.clearNo)}</button>`; $('[data-pm-clear-no]', cb).focus(); return; }
    if (e.target.closest('[data-pm-clear-yes]') || e.target.closest('[data-pm-clear-no]')) {
      if (e.target.closest('[data-pm-clear-yes]')) { basket.clear(); project.clear(); fillMeta(); }
      cb.innerHTML = `<button class="link small" type="button" data-basket-clear>${esc(I.clear)}</button>`;
    }
  });

  // Anfrage: Projektangaben, Termine und Link zur Mappe gehen mit
  const form = $('[data-inquiry-form]', root);
  if (form) bindForm(form, t, ctx, 'inquiry', () => {
    const items = basket.all();
    const pl = plan(items);
    return items.map((it) => ({ ...it, orderBy: pl.rows[it.key]?.date ? isoDate(pl.rows[it.key].date) : '' }));
  }, async () => {
    const pj = project.get();
    const extra = {};
    if (pj.name) extra[M.mail.project] = pj.name;
    if (pj.ref) extra[M.mail.ref] = pj.ref;
    if (pj.due) extra[M.mail.due] = pj.due;
    let link = '';
    try { link = basket.all().length ? await shareUrl() : ''; } catch (e) { /* ohne Link */ }
    return { extra, link, project: { name: pj.name || '', ref: pj.ref || '', due: pj.due || '' }, labels: M.mail };
  });

  render();
  checkImport();
}
