// Spezifikations-Check: Text/Datei → Positionen → passende Typen mit Begründung → Vorkonfiguration → Projektmappe
import { $, $$, getT, getX, getIndex, clientCtx, getCfgAll, debounce, toast, handoff, saveFile, vendorBase } from './core.js';
import { basket, copyText } from './basket.js';
import { parseSpec, setProductCodes } from '../lib/spec.js';
import { bestConfigured } from '../lib/match.js';
import { reqChipsHtml, reqItems, checkText, noteText, INFO_NOTES, markedText } from '../lib/reqfmt.js';
import { techFromSel } from '../lib/tech.js';
import { esc, icon, tpl, imgTag, productGlyph, fmtNum } from '../lib/util.js';
import { descriptor, imgFit, productThumb } from '../lib/product.js';
import { packSync } from '../lib/share.js';

const DRAFT = 'ritz-sc-draft';
const yieldMain = () => new Promise((r) => setTimeout(r, 0));

export async function initAssist(root) {
  const box = $('[data-assist]', root);
  if (!box || box.__init) return;
  box.__init = true;
  const [t, X, ctx, idx] = await Promise.all([getT(), getX(), clientCtx(), getIndex()]);
  const A = X.assist, lang = ctx.lang;
  setProductCodes(idx.products);
  let cfgAll = null;
  const cfgP = getCfgAll(ctx.dl).then((c) => (cfgAll = c)).catch(() => (cfgAll = {}));
  const ta = $('[data-sc-text]', box), out = $('[data-sc-out]', box), status = $('[data-sc-status]', box);
  const assumeEl = $('[data-sc-assume]', box), clearBtn = $('[data-sc-clear]', box), drop = $('[data-sc-drop]', box);
  const emptyHtml = out.innerHTML;
  const S = { results: [], override: {}, qty: {}, open: new Set(), run: 0, cache: new Map() };
  const setStatus = (msg, err = false) => { status.textContent = msg || ''; status.classList.toggle('is-err', !!err); };
  const nf = (v, d = 0) => fmtNum(v, lang, { maximumFractionDigits: d });

  // ---------- Analyse ----------
  const keyOf = (pos, i) => `${i}:${pos.text.slice(0, 60)}`;
  async function analyze() {
    const my = ++S.run;
    const text = ta.value;
    clearBtn.hidden = !text.trim();
    try { if (text.length < 400000) sessionStorage.setItem(DRAFT, text); } catch (e) { /* ohne Entwurf */ }
    if (!text.trim()) { out.innerHTML = emptyHtml; S.results = []; setStatus(''); return; }
    if (!cfgAll) { setStatus(A.loadingData); await cfgP; if (my !== S.run) return; }
    const spec = parseSpec(text);
    const assume = assumeEl.checked;
    const results = [];
    const n = spec.positions.length;
    for (let i = 0; i < n; i++) {
      const pos = spec.positions[i];
      const key = keyOf(pos, i);
      const ck = `${assume}|${JSON.stringify(pos.req)}`;
      let res = S.cache.get(ck);
      if (!res) { res = bestConfigured(pos.req, idx.products, cfgAll, { limit: 4, pool: 8, assume }); S.cache.set(ck, res); }
      results.push({ pos, res, key });
      if (i % 6 === 5 && i < n - 1) { setStatus(`${A.analyzing} ${i + 1}/${n}`); await yieldMain(); if (my !== S.run) return; }
    }
    S.results = results;
    S.spec = spec;
    render();
  }
  const chosenOf = (r) => (S.override[r.key] && r.res.best.find((m) => m.p.id === S.override[r.key])) || r.res.best[0] || null;
  const qtyOf = (r) => S.qty[r.key] ?? r.pos.qty;
  function statusOf(r) {
    const m = chosenOf(r);
    if (!m) return 'none';
    if (m.ac && !m.ac.complete) return 'open';
    if ((m.ac && m.ac.notes.some((x) => !INFO_NOTES.has(x[0]))) || m.cfgScore < 0.999) return 'notes';
    return 'ok';
  }
  const specialOf = (m) => (m?.ac ? m.ac.notes.filter((x) => !INFO_NOTES.has(x[0])).map((x) => noteText(x, A, lang)).join('; ') : '');
  const cfgLink = (r, m) => {
    const sp = specialOf(m);
    const payload = { s: m.ac.sel, q: qtyOf(r), ...(sp ? { n: sp } : {}), ...(r.pos.ref ? { r: r.pos.ref } : {}), f: 1 };
    return ctx.hrefA('product', { area: m.p.area, slug: m.p.id }, 'konfigurator', 'cfg=' + packSync(payload));
  };

  // ---------- Darstellung ----------
  function render() {
    const R = S.results;
    if (!R.length) {
      out.innerHTML = `<div class="sc__none"><p><b>${esc(A.none)}</b></p>${S.spec?.ignored ? `<p class="small muted">${esc(ctx.plural(S.spec.ignored, A.ignored))}</p>` : ''}${emptyHtml}</div>`;
      setStatus('');
      return;
    }
    const st = R.map(statusOf);
    const cnt = (k) => st.filter((x) => x === k).length;
    const parts = [ctx.plural(R.length, A.summary)];
    if (cnt('ok')) parts.push(tpl(A.sumComplete, { n: cnt('ok') }));
    if (cnt('notes') + cnt('open')) parts.push(tpl(A.sumCheck, { n: cnt('notes') + cnt('open') }));
    if (cnt('none')) parts.push(tpl(A.sumNone, { n: cnt('none') }));
    setStatus(parts.join(' · '));
    const pre = S.spec.preamble;
    out.innerHTML = `<div class="sc__sum">
        <p class="sc__counts"><b>${esc(parts[0])}</b>${parts.slice(1).map((x, i) => `<span class="sc__count sc__count--${['ok', 'notes', 'none'][i] || 'ok'}">${esc(x)}</span>`).join('')}</p>
        <div class="sc__acts">
          <button class="btn btn--red btn--small" type="button" data-sc-addall>${icon('plus')}${esc(tpl(A.addAll, { n: R.length }))}</button>
          <button class="btn btn--ghost btn--small" type="button" data-sc-csv>${icon('download')}${esc(A.exportCsv)}</button>
          <button class="btn btn--ghost btn--small" type="button" data-sc-copy>${icon('copy')}${esc(A.copySummary)}</button>
        </div>
        ${S.spec.ignored ? `<p class="small muted">${esc(ctx.plural(S.spec.ignored, A.ignored))}</p>` : ''}
      </div>
      ${pre ? `<div class="scp scp--pre"><p class="scp__lbl">${esc(A.preamble)}</p><div class="scp__req">${reqChipsHtml(pre.req, t, A, lang)}</div></div>` : ''}
      ${R.map((r, i) => card(r, i, st[i])).join('')}`;
  }

  function card(r, i, st) {
    const { pos } = r;
    const m = chosenOf(r);
    const ref = pos.ref ? tpl(A.posRef, { ref: pos.ref }) : tpl(A.pos, { n: i + 1 });
    const long = pos.text.length > 260 || (pos.text.match(/\n/g) || []).length > 3;
    const isOpen = S.open.has(r.key);
    return `<article class="scp scp--${st}" data-i="${i}">
      <header class="scp__head">
        <h3 class="scp__ref">${esc(ref)}</h3>
        <label class="scp__qty"><span>${esc(A.qty)}</span><input class="input input--small" type="number" min="1" max="99999" value="${qtyOf(r)}" data-sc-qty="${i}"></label>
        <span class="scp__st scp__st--${st}">${esc(A.status[st])}</span>
      </header>
      <div class="scp__src${long ? ' is-long' : ''}${isOpen ? ' is-open' : ''}"><p>${markedText(pos.text.trim(), pos.marks, A)}</p>${long ? `<button class="link small" type="button" data-sc-more="${i}" aria-expanded="${isOpen}">${esc(isOpen ? A.less : A.more)}</button>` : ''}</div>
      <div class="scp__req"><span class="scp__lbl">${esc(A.recognized)}</span>${reqChipsHtml(pos.req, t, A, lang, { inheritedTitle: A.inherited })}</div>
      ${m ? matchBlock(r, i, m) : noneBlock(r, i)}
    </article>`;
  }

  function prodImg(p, size = '88px') {
    return productThumb(ctx, p, { sizes: size });
  }

  function matchBlock(r, i, m) {
    const p = m.p, ac = m.ac;
    const score = Math.round((m.cfgScore ?? m.score) * 100);
    const url = ctx.href('product', { area: p.area, slug: p.id });
    const checks = (m.checks || []).filter((c) => c.k !== 'kind').map((c) => ({ c, ...checkText(c, A, lang, t) }));
    checks.sort((a, b) => ({ no: 0, part: 1, ok: 2 }[a.level] - { no: 0, part: 1, ok: 2 }[b.level]));
    const special = ac ? ac.notes.filter((x) => !INFO_NOTES.has(x[0])).map((x) => noteText(x, A, lang)) : [];
    const infos = ac ? ac.notes.filter((x) => INFO_NOTES.has(x[0])).map((x) => noteText(x, A, lang)) : [];
    const alts = r.res.best.filter((x) => x.p.id !== p.id).slice(0, 3);
    const inList = basket.all().some((b) => b.srcKey === r.key && b.id === p.id);
    return `<div class="scp__match">
        <a class="scp__prod" href="${url}">
          <span class="scp__img">${prodImg(p)}</span>
          <span class="scp__name"><span class="scp__kicker">${esc(A.best)}</span><b>${esc(p.code)}</b><span>${esc(descriptor(p, t, lang))}</span></span>
        </a>
        <div class="scp__score" style="--s:${score / 100}"><b>${score}&nbsp;%</b><span class="scp__meter"><i></i></span><span class="vh">${esc(tpl(A.match, { n: score }))}</span></div>
      </div>
      ${checks.length ? `<ul class="scp__checks" aria-label="${esc(A.checks)}">${checks.map((c) => `<li class="ck ck--${c.level}">${icon(c.level === 'ok' ? 'check' : c.level === 'part' ? 'minus' : 'close', 'width="15" height="15"')}<span>${esc(c.label)}${c.note ? ` <em>${esc(c.note)}</em>` : ''}</span></li>`).join('')}</ul>` : ''}
      ${ac ? `<details class="scp__cfg"><summary><span>${esc(A.config)}</span><span class="small muted">${esc(ctx.plural(ac.lines.length, A.cfgLines))} · ${esc(ac.complete ? A.cfgComplete : tpl(A.cfgOpen, { list: ac.missing.join(', ') }))}</span></summary>
          <dl${ctx.dl !== lang ? ` lang="${ctx.dl}"` : ''}>${ac.lines.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></details>` : `<p class="small muted">${esc(A.noCfg)}</p>`}
      ${special.length ? `<div class="scp__notes"><b>${esc(A.notesTitle)}</b><ul>${special.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${infos.length ? `<div class="scp__notes scp__notes--info"><b>${esc(A.infoTitle)}</b><ul>${infos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${ac?.assumed.length ? `<div class="scp__notes scp__notes--assumed"><b>${esc(A.assumedTitle)}</b><ul${ctx.dl !== lang ? ` lang="${ctx.dl}"` : ''}>${ac.assumed.map(([, label, title]) => `<li>${esc(title)}: ${esc(label)}</li>`).join('')}</ul></div>` : ''}
      <div class="scp__actions">
        <button class="btn btn--red btn--small" type="button" data-sc-add="${i}">${icon(inList ? 'check' : 'plus')}${esc(inList ? A.inList : A.add)}</button>
        ${ac ? `<a class="btn btn--ghost btn--small" href="${cfgLink(r, m)}">${icon('sliders')}${esc(A.openCfg)}</a>` : ''}
      </div>
      ${alts.length ? `<div class="scp__alts"><span class="small muted">${esc(A.alternatives)}:</span>${alts.map((x) => `<button class="chip" type="button" data-sc-alt="${i}" data-pid="${esc(x.p.id)}" aria-label="${esc(tpl(A.choose, { code: x.p.code }))}">${esc(x.p.code)} <span class="faint">${Math.round((x.cfgScore ?? x.score) * 100)}&nbsp;%</span></button>`).join('')}</div>` : ''}`;
  }

  function noneBlock(r, i) {
    const f = r.res.fallback;
    const hard = f ? f.checks.filter((c) => c.hard).map((c) => checkText(c, A, lang, t).label) : [];
    return `<div class="scp__none">
      <p><b>${esc(A.none)}</b> ${esc(A.noneHint)}</p>
      ${f ? `<p class="small muted">${esc(tpl(A.nearest, { code: f.p.code }))}${hard.length ? ' – ' + esc(tpl(A.because, { list: hard.join(', ') })) : ''}</p>` : ''}
      <div class="scp__actions"><button class="btn btn--ghost btn--small" type="button" data-sc-custom="${i}">${icon('plus')}${esc(A.addCustom)}</button></div>
    </div>`;
  }

  // ---------- Übernehmen ----------
  function itemFor(r) {
    const m = chosenOf(r);
    const base = { qty: qtyOf(r), ref: r.pos.ref || '', src: r.pos.text.trim().slice(0, 3000), srcKey: r.key };
    if (!m) {
      return { ...base, id: null, custom: true, code: A.customCode, lines: reqItems(r.pos.req, t, A, lang).map(([l, v]) => [l || '–', v]), special: '' };
    }
    const p = m.p, ac = m.ac, cf = cfgAll?.[p.id];
    return {
      ...base, id: p.id, code: p.code, area: p.area, sel: ac?.sel || {}, lines: ac?.lines || [], special: specialOf(m),
      tc: ac && cf ? techFromSel(cf, ac.sel) : null, weeks: p.weeks ? p.weeks[p.weeks.length - 1] : null, missing: ac && !ac.complete ? ac.missing : undefined, score: Math.round((m.cfgScore ?? m.score) * 100),
    };
  }
  function addOne(i) {
    const r = S.results[i];
    if (!r) return;
    basket.add(itemFor(r), { merge: false });
    toast(A.added, { label: t.ui.inquiryList, href: ctx.href('inquiry') });
    render();
  }
  function addAll() {
    basket.addMany(S.results.map(itemFor), { merge: false });
    toast(tpl(A.addedAll, { n: S.results.length }), { label: t.ui.inquiryList, href: ctx.href('inquiry') });
    render();
  }

  // ---------- Export ----------
  const lineOf = (r) => {
    const m = chosenOf(r);
    return {
      ref: r.pos.ref || '', qty: qtyOf(r), text: r.pos.text.replace(/\s+/g, ' ').trim(), code: m ? m.p.code : A.customCode,
      score: m ? Math.round((m.cfgScore ?? m.score) * 100) + ' %' : '', cfg: m?.ac ? m.ac.lines.map(([k, v]) => `${k}: ${v}`).join('; ') : '',
      special: specialOf(m), assumed: m?.ac ? m.ac.assumed.map(([, l, tt]) => `${tt}: ${l}`).join('; ') : '', missing: m?.ac && !m.ac.complete ? m.ac.missing.join(', ') : '',
    };
  };
  function csv() {
    const q = (v) => { const s = String(v ?? ''); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = S.results.map((r, i) => { const l = lineOf(r); return [l.ref || i + 1, l.qty, l.text, l.code, l.score, l.cfg, l.special, l.assumed, l.missing]; });
    return '﻿' + [A.csvHead, ...rows].map((r) => r.map(q).join(';')).join('\r\n');
  }
  function summaryText() {
    const lines = [A.textHead, ''];
    S.results.forEach((r, i) => {
      const l = lineOf(r);
      lines.push(`${l.ref ? tpl(A.posRef, { ref: l.ref }) : tpl(A.pos, { n: i + 1 })}: ${l.qty} × ${l.code}${l.score ? ` (${tpl(A.match, { n: parseInt(l.score, 10) })})` : ''}`);
      if (l.cfg) lines.push(`  ${A.config}: ${l.cfg}`);
      if (l.special) lines.push(`  ${A.notesTitle}: ${l.special}`);
      if (l.assumed) lines.push(`  ${A.assumedTitle}: ${l.assumed}`);
      if (l.missing) lines.push(`  ${tpl(A.cfgOpen, { list: l.missing })}`);
      lines.push('');
    });
    return lines.join('\n');
  }

  // ---------- Dateien ----------
  async function loadFile(file) {
    if (!file) return;
    setStatus(A.reading);
    try {
      const { readFile } = await import('./filetext.js');
      const res = await readFile(file, { vendor: vendorBase() });
      ta.value = res.text;
      S.override = {}; S.qty = {};
      await analyze();
      setStatus(tpl(A.fileDone, { name: file.name, n: nf(res.text.length) }) + (res.truncated ? ' ' + tpl(A.truncated, { n: res.truncated }) : '') + (status.textContent ? ' · ' + status.textContent : ''));
    } catch (e) {
      const c = e.code;
      setStatus(c === 'xls' ? A.xls : c === 'unsupported' ? A.unsupported : c === 'scanned' ? A.scanned : tpl(A.readErr, { msg: e.detail || e.message || String(e) }), true);
    }
  }

  // ---------- Ereignisse ----------
  const run = debounce(analyze, 380);
  ta.addEventListener('input', () => { S.override = {}; run(); });
  assumeEl.addEventListener('change', analyze);
  clearBtn.addEventListener('click', () => { ta.value = ''; S.override = {}; S.qty = {}; analyze(); ta.focus(); });
  box.addEventListener('click', (e) => {
    const ex = e.target.closest('[data-sc-example]');
    if (ex) { ta.value = A.ex[Number(ex.dataset.scExample)].text; S.override = {}; S.qty = {}; analyze(); return; }
    const alt = e.target.closest('[data-sc-alt]');
    if (alt) { const r = S.results[Number(alt.dataset.scAlt)]; S.override[r.key] = alt.dataset.pid; render(); $(`[data-i="${alt.dataset.scAlt}"] .scp__prod`, out)?.focus(); return; }
    const add = e.target.closest('[data-sc-add]');
    if (add) { addOne(Number(add.dataset.scAdd)); return; }
    const cu = e.target.closest('[data-sc-custom]');
    if (cu) { addOne(Number(cu.dataset.scCustom)); return; }
    if (e.target.closest('[data-sc-addall]')) { addAll(); return; }
    if (e.target.closest('[data-sc-copy]')) { copyText(summaryText(), t); return; }
    if (e.target.closest('[data-sc-csv]')) {
      const data = csv();
      const name = `RITZ-Spezifikations-Check-${new Date().toISOString().slice(0, 10)}.csv`;
      if (!saveFile(name, data, 'text/csv')) { copyText(data, t); toast(A.csvCopied); }
      return;
    }
    const more = e.target.closest('[data-sc-more]');
    if (more) {
      const r = S.results[Number(more.dataset.scMore)];
      if (S.open.has(r.key)) S.open.delete(r.key); else S.open.add(r.key);
      const src = more.closest('.scp__src');
      const open = S.open.has(r.key);
      src.classList.toggle('is-open', open);
      more.setAttribute('aria-expanded', String(open));
      more.textContent = open ? A.less : A.more;
    }
  });
  box.addEventListener('change', (e) => {
    const q = e.target.closest('[data-sc-qty]');
    if (q) { const r = S.results[Number(q.dataset.scQty)]; S.qty[r.key] = Math.max(1, Math.min(99999, parseInt(q.value, 10) || 1)); q.value = S.qty[r.key]; const card = q.closest('.scp'); const a = card && $('.scp__actions a', card); if (a) a.href = cfgLink(r, chosenOf(r)); }
    const f = e.target.closest('[data-sc-file]');
    if (f && f.files[0]) { loadFile(f.files[0]); f.value = ''; }
  });
  // Ziehen und Ablegen
  let depth = 0;
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
  drop.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; drop.classList.add('is-drag'); });
  drop.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
  drop.addEventListener('dragleave', () => { depth = Math.max(0, depth - 1); if (!depth) drop.classList.remove('is-drag'); });
  drop.addEventListener('drop', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth = 0; drop.classList.remove('is-drag'); loadFile(e.dataTransfer.files[0]); });

  // Übergabe von Startseite, Suche oder Rechner – sonst Entwurf dieser Sitzung
  const h = handoff.take('spec');
  let draft = '';
  try { draft = sessionStorage.getItem(DRAFT) || ''; } catch (e) { /* ohne Entwurf */ }
  if (h?.text) { ta.value = h.text; analyze(); }
  else if (draft) { ta.value = draft; analyze(); }
}
