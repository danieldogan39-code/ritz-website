// Produktkonfigurator: abhängige Optionen, Mehrfachauswahl, Ausfüllen aus Anforderungstext,
// Live-Typenschild, Kennzeichnung, Link teilen, Ausschreibungstext, Bearbeiten von Positionen der Projektmappe
import { $, $$, getT, getX, clientCtx, toast, readQuery, writeQuery, CFG } from './core.js';
import { esc, icon, tpl, colon } from '../lib/util.js';
import { basket, copyText } from './basket.js';
import { makeModel, visibleOptions, visibleValues, prune, isText, isMulti, isSet, selVals, activeOptions, missingRequired, selectionLines } from '../lib/cfgcore.js';
import { techFromSel, platePreview, tenderText } from '../lib/tech.js';
import { packSync, unpackSync } from '../lib/share.js';

const clamp = (q) => Math.max(1, Math.min(99999, parseInt(q, 10) || 1));

export async function initConfigurators(root) {
  for (const box of $$('[data-config]', root)) {
    if (box.__cfg) continue;
    const json = $(`[data-config-json="${box.dataset.config}"]`, root);
    if (!json) continue;
    const data = JSON.parse(json.textContent);
    const [t, X, ctx] = await Promise.all([getT(), getX(), clientCtx()]);
    box.__cfg = new Configurator(box, data, t, X, ctx);
  }
}

class Configurator {
  constructor(box, data, t, X, ctx) {
    this.box = box; this.d = data; this.t = t; this.X = X; this.ctx = ctx;
    this.m = makeModel(data);
    this.cf = { o: data.options, d: data.deps || {}, r: data.r || {}, x: data.x || {} };
    this.sel = {}; this.qty = 1; this.ref = ''; this.special = ''; this.editKey = null; this.fromSpec = new Set(); this.msg = '';
    this.specialId = Object.keys(this.cf.r).find((id) => this.cf.r[id][0] === 'special' && this.m.byId[id] && isText(this.m.byId[id])) || null;
    this.readPreset();
    this.skeleton();
    this.render();
  }
  // Datensprache der Optionstexte auszeichnen, wenn sie von der Seitensprache abweicht
  get la() { return this.ctx.dl && this.ctx.dl !== this.ctx.lang ? ` lang="${this.ctx.dl}"` : ''; }

  readPreset() {
    const raw = new URLSearchParams(readQuery()).get('cfg');
    if (!raw) return;
    let p;
    try { p = unpackSync(raw); } catch (e) { return; }
    if (p.s && typeof p.s === 'object') {
      for (const [id, v] of Object.entries(p.s)) if (this.m.byId[id]) this.sel[id] = Array.isArray(v) ? v.map(String) : String(v);
      prune(this.m, this.sel);
    }
    if (p.q) this.qty = clamp(p.q);
    if (p.r) this.ref = String(p.r).slice(0, 60);
    if (p.n) this.addSpecial(String(p.n));
    if (p.e && basket.get(p.e)) this.editKey = p.e;
    if (p.f) { this.msg = this.X.cfg.presetSpec; this.fromSpec = new Set(Object.keys(this.sel)); }
    else if (p.l || p.e) this.msg = this.X.cfg.preset;
  }
  addSpecial(text) {
    if (!text) return;
    if (this.specialId) { const cur = String(this.sel[this.specialId] || '').trim(); if (!cur.includes(text)) this.sel[this.specialId] = cur ? `${cur}; ${text}` : text; }
    else if (!this.special.includes(text)) this.special = this.special ? `${this.special}; ${text}` : text;
  }
  // Optionen, deren Auswahl Werte dieser Option freischaltet
  controllers(id) {
    if (!this._ctrl) {
      this._ctrl = {};
      const owner = {};
      for (const o of this.m.opts) for (const [v] of o.v || []) owner[String(v)] = String(o.id);
      for (const [src, list] of Object.entries(this.m.showV)) {
        const so = owner[String(src)];
        if (!so) continue;
        for (const v of list.map(String)) { const to = owner[v]; if (to && to !== so) (this._ctrl[to] ||= new Set()).add(so); }
      }
    }
    return [...(this._ctrl[id] || [])];
  }

  skeleton() {
    const C = this.X.cfg;
    this.box.innerHTML = `${this.msg ? `<p class="notice small cfg__notice" role="status">${esc(this.msg)}</p>` : ''}<details class="cfg__spec">
        <summary>${icon('sliders', 'width="18" height="18"')}${esc(C.fromSpec)}</summary>
        <div class="cfg__spec-body">
          <label class="small muted" for="cfg-spec-${esc(this.d.id)}">${esc(C.fromSpecHint)}</label>
          <textarea class="textarea" id="cfg-spec-${esc(this.d.id)}" data-cfg-spec rows="2" spellcheck="false" placeholder="${esc(C.fromSpecPh)}"></textarea>
          <div class="cluster"><button class="btn btn--small" type="button" data-cfg-apply>${esc(C.apply)}</button></div>
          <div class="cfg__spec-msg" data-cfg-msg role="status" aria-live="polite"></div>
        </div>
      </details>
      <div class="cfg__steps" data-cfg-steps></div>
      <aside class="cfg__summary" data-cfg-sum aria-label="${esc(this.t.product.cfgSummary)}"></aside>`;
    this.stepsEl = $('[data-cfg-steps]', this.box);
    this.sumEl = $('[data-cfg-sum]', this.box);
    this.bind();
  }

  render(focusId = null) {
    const t = this.t, T = t.product, C = this.X.cfg, la = this.la;
    const vis = visibleOptions(this.m, this.sel);
    const prevVis = this._vis || vis;
    const rows = vis.map((id) => {
      const o = this.m.byId[id];
      const req = this.m.req.has(id);
      const cls = `cfg__opt${!prevVis.includes(id) ? ' is-new' : ''}${this.fromSpec.has(id) ? ' is-set-from-spec' : ''}`;
      const star = req ? `<span class="req" title="${esc(T.cfgRequired)}">*</span>` : '';
      if (isText(o)) {
        const isSpecial = id === this.specialId;
        return `<div class="${cls}"><label class="cfg__label" for="cfg-${id}"${la}>${esc(o.t)}${star}</label>
          <div><textarea class="textarea textarea--small" id="cfg-${id}" data-text="${id}" rows="2" placeholder="${isSpecial ? esc(T.cfgSpecialPh) : ''}">${esc(this.sel[id] || '')}</textarea></div></div>`;
      }
      const vals = visibleValues(this.m, this.sel, id, vis);
      if (!vals.length) {
        const wait = this.controllers(id).filter((c) => vis.includes(c) && !isSet(this.sel, c));
        if (!wait.length) return '';
        return `<div class="${cls} is-wait"><span class="cfg__label"${la}>${esc(o.t)}${star}</span><div class="cfg__wait">${esc(tpl(T.cfgDepends || '{list}', { list: wait.map((c) => this.m.byId[c].t).join(', ') }))}</div></div>`;
      }
      const label = Object.fromEntries(o.v.map(([v, l]) => [String(v), l]));
      // Reine Zahlenwerte aufsteigend (Shopdaten teils unsortiert, z. B. 3,6 / 17,5 / 7,2)
      const num = (l) => { l = String(l).trim(); return l.includes(',') ? parseFloat(l.replace(/\./g, '').replace(',', '.')) : parseFloat(l); };
      if (vals.every((v) => /^\d+(?:[.,]\d+)?$/.test(String(label[v]).trim()))) vals.sort((a, b) => num(label[a]) - num(label[b]));
      const name = `cfg-${this.d.id}-${id}`;
      const chosen = selVals(this.sel, id);
      if (isMulti(o)) {
        return `<div class="${cls}"><span class="cfg__label" id="${name}-l"${la}>${esc(o.t)}${star}<span class="cfg__badge">${esc(C.multi)}</span></span>
          <div class="cfg__vals cfg__vals--multi" role="group" aria-labelledby="${name}-l"${la}>${vals.map((v) => `<label class="chip${chosen.includes(v) ? ' is-on' : ''}"><input class="vh" type="checkbox" value="${v}" data-check="${id}"${chosen.includes(v) ? ' checked' : ''}>${esc(label[v])}</label>`).join('')}</div></div>`;
      }
      const many = vals.length > 28;
      const cur = chosen[0];
      const control = many
        ? `<select class="select" id="${name}" data-sel="${id}"${req ? ' aria-required="true"' : ''}><option value="">–</option>${vals.map((v) => `<option value="${v}"${cur === v ? ' selected' : ''}>${esc(label[v])}</option>`).join('')}</select>`
        : `<div class="cfg__vals" role="radiogroup" aria-labelledby="${name}-l">${vals.map((v) => `<label class="chip${cur === v ? ' is-on' : ''}"><input class="vh" type="radio" name="${name}" value="${v}" data-radio="${id}"${cur === v ? ' checked' : ''}>${esc(label[v])}</label>`).join('')}</div>`;
      return `<div class="${cls}"><span class="cfg__label" id="${name}-l"${la}>${many ? `<label for="${name}">${esc(o.t)}</label>` : esc(o.t)}${star}</span><div${la}>${control}</div></div>`;
    }).join('');
    this._vis = vis;
    this.stepsEl.innerHTML = rows;
    this.renderSummary(vis);
    if (focusId) {
      const f = $(`[data-radio="${focusId}"]:checked`, this.box) || $(`[data-check="${focusId}"]:focus`, this.box) || $(`[data-sel="${focusId}"]`, this.box) || $(`[data-text="${focusId}"]`, this.box);
      f?.focus({ preventScroll: true });
    }
  }

  renderSummary(vis = visibleOptions(this.m, this.sel)) {
    const t = this.t, T = t.product, C = this.X.cfg, la = this.la;
    const reqVis = activeOptions(this.m, this.sel, vis).filter((id) => this.m.req.has(id));
    const done = reqVis.filter((id) => (isText(this.m.byId[id]) ? String(this.sel[id] || '').trim() : isSet(this.sel, id))).length;
    const lines = this.lines();
    const tc = techFromSel(this.cf, this.sel);
    const made = this.d.made ? `${t.ui.madeIn} ${t.lbl.made[this.d.made] || this.d.made}` : '';
    const hasTech = tc.um != null || tc.ipr || tc.upr || tc.cores.length;
    const tenderOpen = this._tender;
    this.sumEl.innerHTML = `${hasTech ? `<div title="${esc(C.plate)}">${platePreview(this.d.code, tc, this.X.tech, this.ctx.lang, this.d.kind, made)}</div>` : ''}
      <h3>${esc(T.cfgSummary)}${colon(this.ctx.lang)}${esc(this.d.code)}</h3>
      <div class="cfg__progress" role="progressbar" aria-valuemin="0" aria-valuemax="${reqVis.length}" aria-valuenow="${done}" aria-label="${esc(tpl(T.cfgProgress, { done, total: reqVis.length }))}"><span style="width:${reqVis.length ? (done / reqVis.length) * 100 : 100}%"></span></div>
      <p class="muted">${esc(tpl(T.cfgProgress, { done, total: reqVis.length }))}</p>
      <div data-cfg-lines>${this.linesHtml(lines)}</div>
      ${!this.specialId && this.special ? `<p class="small"><b>${esc(T.cfgSpecial)}${colon(this.ctx.lang)}</b>${esc(this.special)}</p>` : ''}
      <div class="cluster"><span class="small">${esc(T.quantity)}</span><div class="qty"><button type="button" data-q="-1" aria-label="−">−</button><input type="number" min="1" value="${this.qty}" data-qty aria-label="${esc(T.quantity)}"><button type="button" data-q="1" aria-label="+">+</button></div></div>
      <div class="cfg__ref"><label for="cfg-ref-${esc(this.d.id)}">${esc(C.ref)}</label><input class="input" id="cfg-ref-${esc(this.d.id)}" data-ref maxlength="60" value="${esc(this.ref)}" placeholder="${esc(C.refPh)}" autocomplete="off"></div>
      <div class="err" data-cfg-err role="alert" hidden></div>
      <button class="btn btn--red btn--block" type="button" data-cfg-add>${icon(this.editKey ? 'check' : 'plus')}${esc(this.editKey ? C.update : t.ui.addInquiry)}</button>
      <div class="cfg__more">
        <button class="btn btn--ghost-light btn--small" type="button" data-cfg-share>${icon('external')}${esc(C.share)}</button>
        <button class="btn btn--ghost-light btn--small" type="button" data-cfg-tender aria-expanded="${!!tenderOpen}">${icon('file')}${esc(C.tender)}</button>
      </div>
      ${tenderOpen ? `<pre class="cfg__tender" tabindex="0" data-cfg-tender-text>${esc(this.tender())}</pre><button class="link small" type="button" data-cfg-tender-copy>${esc(C.tenderCopy)}</button>` : ''}
      <button class="link small" type="button" data-cfg-reset>${esc(T.cfgReset)}</button>`;
  }
  linesHtml(lines) {
    const la = this.la;
    return lines.length ? `<dl>${lines.map(([k, v]) => `<div><dt${la}>${esc(k)}</dt><dd${la}>${esc(v)}</dd></div>`).join('')}</dl>` : `<p class="muted">${esc(this.t.product.cfgEmpty)}</p>`;
  }
  lines() { return selectionLines(this.m, this.sel); }
  tender() {
    const t = this.t, d = this.d;
    const tc = techFromSel(this.cf, this.sel);
    const notes = [this.specialId ? String(this.sel[this.specialId] || '').trim() : this.special].filter(Boolean).join('; ');
    return tenderText({ T: this.X.tech, lang: this.ctx.lang, code: d.code, kindLabel: t.lbl.kind[d.kind] || '', installLabel: (d.install || []).map((i) => t.lbl.install[i]).join(' / '), formLabel: (d.form || []).slice(0, 2).map((f) => t.lbl.form[f]).filter(Boolean).join(', '), kind: d.kind, tc, qty: this.qty, ref: this.ref, notes });
  }
  link() {
    const special = this.specialId ? '' : this.special;
    const payload = { s: this.sel, q: this.qty, ...(this.ref ? { r: this.ref } : {}), ...(special ? { n: special } : {}), l: 1 };
    const href = this.ctx.hrefA('product', { area: this.d.area, slug: this.d.id }, 'konfigurator', 'cfg=' + packSync(payload));
    return CFG.mode === 'spa' ? location.href.split('#')[0] + href : location.origin + href;
  }
  saveState() {
    const has = Object.keys(this.sel).length;
    writeQuery(has ? 'cfg=' + packSync({ s: this.sel, q: this.qty, ...(this.ref ? { r: this.ref } : {}), ...(this.editKey ? { e: this.editKey } : {}) }) : '');
  }

  bind() {
    this.box.addEventListener('change', (e) => {
      const r = e.target.closest('[data-radio]');
      if (r) { this.sel[r.dataset.radio] = r.value; this.fromSpec.delete(r.dataset.radio); this.changed(r.dataset.radio); return; }
      const c = e.target.closest('[data-check]');
      if (c) {
        const id = c.dataset.check;
        const cur = new Set(selVals(this.sel, id));
        if (c.checked) cur.add(c.value); else cur.delete(c.value);
        if (cur.size) this.sel[id] = [...cur]; else delete this.sel[id];
        this.fromSpec.delete(id);
        this.changed(id);
        $(`[data-check="${id}"][value="${c.value}"]`, this.box)?.focus({ preventScroll: true });
        return;
      }
      const s = e.target.closest('[data-sel]');
      if (s) { if (s.value) this.sel[s.dataset.sel] = s.value; else delete this.sel[s.dataset.sel]; this.fromSpec.delete(s.dataset.sel); this.changed(s.dataset.sel); return; }
      const q = e.target.closest('[data-qty]');
      if (q) { this.qty = clamp(q.value); q.value = this.qty; this.saveState(); }
    });
    this.box.addEventListener('input', (e) => {
      const tx = e.target.closest('[data-text]');
      if (tx) { const v = tx.value; if (v.trim()) this.sel[tx.dataset.text] = v; else delete this.sel[tx.dataset.text]; this.updateLines(); return; }
      const rf = e.target.closest('[data-ref]');
      if (rf) { this.ref = rf.value.trim(); this.saveStateSoon(); }
    });
    this.box.addEventListener('click', (e) => {
      const q = e.target.closest('[data-q]');
      if (q) { this.qty = clamp(this.qty + Number(q.dataset.q)); const i = $('[data-qty]', this.box); if (i) i.value = this.qty; this.saveState(); return; }
      if (e.target.closest('[data-cfg-reset]')) { this.sel = {}; this.qty = 1; this.ref = ''; this.special = ''; this.fromSpec.clear(); this._tender = false; this.render(); this.saveState(); return; }
      if (e.target.closest('[data-cfg-add]')) { this.add(); return; }
      if (e.target.closest('[data-cfg-apply]')) { this.applySpec(); return; }
      if (e.target.closest('[data-cfg-share]')) { const url = this.link(); navigator.clipboard?.writeText(url).then(() => toast(this.X.cfg.linkCopied), () => copyText(url, this.t)) ?? copyText(url, this.t); return; }
      const tb = e.target.closest('[data-cfg-tender]');
      if (tb) { this._tender = !this._tender; this.renderSummary(); $('[data-cfg-tender]', this.box)?.focus(); return; }
      if (e.target.closest('[data-cfg-tender-copy]')) { copyText(this.tender(), this.t); }
    });
  }
  saveStateSoon() { clearTimeout(this._st); this._st = setTimeout(() => this.saveState(), 400); }
  changed(id) { prune(this.m, this.sel); this.render(id); this.saveState(); }
  updateLines() {
    const box = $('[data-cfg-lines]', this.box);
    if (box) box.innerHTML = this.linesHtml(this.lines());
    if (this._tender) { const pre = $('[data-cfg-tender-text]', this.box); if (pre) pre.textContent = this.tender(); }
  }

  // Anforderungstext → passende Optionen (gleiche Logik wie der Spezifikations-Check)
  async applySpec() {
    const C = this.X.cfg, A = this.X.assist;
    const ta = $('[data-cfg-spec]', this.box), msg = $('[data-cfg-msg]', this.box);
    const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    const [{ parsePosition, reqWeight }, { autoConfigure }, { noteText, INFO_NOTES }] = await Promise.all([import('../lib/spec.js'), import('../lib/match.js'), import('../lib/reqfmt.js')]);
    const { req, qty } = parsePosition(text);
    if (reqWeight(req) < 1) { msg.innerHTML = `<p>${esc(C.nothing)}</p>`; return; }
    const ac = autoConfigure(req, { area: this.d.area, form: this.d.form || [] }, this.cf, { assume: true });
    const keep = this.specialId ? this.sel[this.specialId] : null;
    this.sel = { ...ac.sel };
    if (keep) this.sel[this.specialId] = keep;
    prune(this.m, this.sel);
    const special = ac.notes.filter((n) => !INFO_NOTES.has(n[0])).map((n) => noteText(n, A, this.ctx.lang));
    const infos = ac.notes.filter((n) => INFO_NOTES.has(n[0])).map((n) => noteText(n, A, this.ctx.lang));
    if (special.length) this.addSpecial(special.join('; '));
    if (qty) this.qty = clamp(qty);
    this.fromSpec = new Set(Object.keys(ac.sel));
    this.render();
    this.saveState();
    const missing = missingRequired(this.m, this.sel).map((id) => this.m.byId[id].t);
    msg.innerHTML = `<p><b>${esc(tpl(C.applied, { n: Object.keys(ac.sel).length }))}</b></p>
      ${special.length ? `<p>${esc(C.notesAdded)}:</p><ul>${special.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${infos.length ? `<ul>${infos.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${ac.assumed.length ? `<p>${esc(A.assumedTitle)}:</p><ul${this.la}>${ac.assumed.map(([, l, tt]) => `<li>${esc(tt)}: ${esc(l)}</li>`).join('')}</ul>` : ''}
      ${missing.length ? `<p${this.la}>${esc(tpl(A.cfgOpen, { list: missing.join(', ') }))}</p>` : ''}`;
  }

  add() {
    const t = this.t, T = t.product, C = this.X.cfg;
    const missIds = missingRequired(this.m, this.sel);
    const err = $('[data-cfg-err]', this.box);
    if (missIds.length) {
      err.hidden = false;
      err.textContent = tpl(T.cfgMissing, { list: missIds.map((id) => this.m.byId[id].t).join(', ') });
      const first = missIds[0];
      const target = $(`[data-radio="${first}"], [data-check="${first}"], [data-sel="${first}"], [data-text="${first}"]`, this.box);
      target?.closest('.cfg__opt')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      target?.focus({ preventScroll: true });
      return;
    }
    err.hidden = true;
    const tc = techFromSel(this.cf, this.sel);
    const item = {
      id: this.d.id, code: this.d.code, area: this.d.area, sel: JSON.parse(JSON.stringify(this.sel)), lines: this.lines(), qty: this.qty, ref: this.ref,
      special: this.specialId ? '' : this.special, tc, weeks: tc.weeks ?? (this.d.weeks ? this.d.weeks[this.d.weeks.length - 1] : null),
    };
    const link = { label: t.ui.inquiryList, href: this.ctx.href('inquiry') };
    if (this.editKey && basket.get(this.editKey)) {
      basket.patch(this.editKey, item);
      toast(C.updated, link);
      this.editKey = null;
      this.renderSummary();
      this.saveState();
    } else {
      basket.add(item);
      toast(T.cfgAdded, link);
    }
  }
}
