// Produktkonfigurator mit abhängigen Optionen (Logik wie im bisherigen Produktfinder)
import { $, $$, getT, clientCtx, toast } from './core.js';
import { esc, icon, tpl, colon } from '../lib/util.js';
import { basket } from './basket.js';

export async function initConfigurators(root) {
  for (const box of $$('[data-config]', root)) {
    const json = $(`[data-config-json="${box.dataset.config}"]`, root);
    if (!json) continue;
    const data = JSON.parse(json.textContent);
    const [t, ctx] = await Promise.all([getT(), clientCtx()]);
    new Configurator(box, data, t, ctx);
  }
}

class Configurator {
  constructor(box, data, t, ctx) {
    this.box = box; this.d = data; this.t = t; this.ctx = ctx;
    this.opts = data.options;
    this.byId = Object.fromEntries(this.opts.map((o) => [String(o.id), o]));
    const deps = data.deps || {};
    this.order = (deps.order && deps.order.length ? deps.order.map(String) : this.opts.map((o) => String(o.id))).filter((id) => this.byId[id]);
    for (const o of this.opts) if (!this.order.includes(String(o.id))) this.order.push(String(o.id));
    this.req = new Set([...(deps.req || []).map(String), ...this.opts.filter((o) => o.req).map((o) => String(o.id))]);
    this.free = deps.free || {};
    this.showO = deps.showO || {};
    this.showV = deps.showV || {};
    // Kind-Optionen und abhängige Werte
    this.childOpts = new Set(Object.values(this.showO).flat().map(String));
    this.depVals = new Set(Object.values(this.showV).flat().map(String));
    this.sel = {}; this.qty = 1; this.special = '';
    this.render();
  }
  visibleOptions() {
    const vis = new Set(this.order.filter((id) => !this.childOpts.has(id)));
    let changed = true;
    while (changed) {
      changed = false;
      for (const id of [...vis]) {
        const v = this.sel[id];
        if (v === undefined || !this.showO[v]) continue;
        for (const c of this.showO[v].map(String)) if (!vis.has(c) && this.byId[c]) { vis.add(c); changed = true; }
      }
    }
    return this.order.filter((id) => vis.has(id));
  }
  visibleValues(id, visible) {
    const o = this.byId[id];
    const all = (o.v || []).map((x) => String(x[0]));
    const freeList = this.free[id] ? this.free[id].map(String) : all.filter((v) => !this.depVals.has(v));
    const enabled = new Set(freeList);
    for (const oid of visible) {
      const sv = this.sel[oid];
      if (sv !== undefined && this.showV[sv]) for (const v of this.showV[sv].map(String)) enabled.add(v);
    }
    return all.filter((v) => enabled.has(v));
  }
  prune() {
    let changed = true;
    while (changed) {
      changed = false;
      const vis = this.visibleOptions();
      for (const id of Object.keys(this.sel)) {
        if (!vis.includes(id)) { delete this.sel[id]; changed = true; continue; }
        const o = this.byId[id];
        if (o.type === 'select' || o.type === 'drop_down' || o.type === 'radio') {
          if (!this.visibleValues(id, vis).includes(String(this.sel[id]))) { delete this.sel[id]; changed = true; }
        }
      }
    }
  }
  isText(o) { return !(o.v && o.v.length); }
  // Optionen, deren Auswahl Werte dieser Option freischaltet
  controllers(id) {
    if (!this._ctrl) {
      this._ctrl = {};
      const owner = {};
      for (const o of this.opts) for (const [v] of o.v || []) owner[String(v)] = String(o.id);
      for (const [src, list] of Object.entries(this.showV)) {
        const so = owner[String(src)];
        if (!so) continue;
        for (const v of list.map(String)) { const to = owner[v]; if (to && to !== so) (this._ctrl[to] ||= new Set()).add(so); }
      }
    }
    return [...(this._ctrl[id] || [])];
  }
  // Auswählbar = Textfeld oder mindestens ein freigeschalteter Wert
  active(vis) { return vis.filter((id) => this.isText(this.byId[id]) || this.visibleValues(id, vis).length); }
  render(focusId = null) {
    const t = this.t, T = t.product;
    // Optionstexte stammen aus den Produktdaten (Deutsch/Englisch): Sprache auszeichnen, wenn sie abweicht
    const la = this.ctx.dl && this.ctx.dl !== this.ctx.lang ? ` lang="${this.ctx.dl}"` : '';
    const vis = this.visibleOptions();
    const prevVis = this._vis || vis;
    const rows = vis.map((id) => {
      const o = this.byId[id];
      const req = this.req.has(id);
      const isNew = !prevVis.includes(id);
      if (this.isText(o)) {
        const isSpecial = /sonderw|special/i.test(o.t);
        return `<div class="cfg__opt${isNew ? ' is-new' : ''}"><label class="cfg__label" for="cfg-${id}"${la}>${esc(o.t)}${req ? `<span class="req" aria-hidden="true">*</span>` : ''}</label>
          <div><textarea class="textarea textarea--small" id="cfg-${id}" data-text="${id}" rows="2" placeholder="${isSpecial ? esc(T.cfgSpecialPh) : ''}">${esc(this.sel[id] || '')}</textarea></div></div>`;
      }
      const vals = this.visibleValues(id, vis);
      if (!vals.length) {
        const wait = this.controllers(id).filter((c) => vis.includes(c) && (this.sel[c] === undefined || this.sel[c] === ''));
        if (!wait.length) return '';
        return `<div class="cfg__opt is-wait${isNew ? ' is-new' : ''}"><span class="cfg__label"${la}>${esc(o.t)}${req ? `<span class="req" title="${esc(T.cfgRequired)}">*</span>` : ''}</span><div class="cfg__wait">${esc(tpl(T.cfgDepends || '{list}', { list: wait.map((c) => this.byId[c].t).join(', ') }))}</div></div>`;
      }
      const opts = Object.fromEntries(o.v.map(([v, l]) => [String(v), l]));
      // Reine Zahlenwerte aufsteigend (Shopdaten teils unsortiert, z. B. 3,6 / 17,5 / 7,2)
      const num = (l) => { l = String(l).trim(); return l.includes(',') ? parseFloat(l.replace(/\./g, '').replace(',', '.')) : parseFloat(l); };
      if (vals.every((v) => /^\d+(?:[.,]\d+)?$/.test(String(opts[v]).trim()))) vals.sort((a, b) => num(opts[a]) - num(opts[b]));
      const many = vals.length > 28;
      const name = `cfg-${this.d.id}-${id}`;
      const control = many
        ? `<select class="select" id="${name}" data-sel="${id}" ${req ? 'aria-required="true"' : ''}><option value="">–</option>${vals.map((v) => `<option value="${v}"${String(this.sel[id]) === v ? ' selected' : ''}>${esc(opts[v])}</option>`).join('')}</select>`
        : `<div class="cfg__vals" role="radiogroup" aria-labelledby="${name}-l">${vals.map((v) => `<label class="chip${String(this.sel[id]) === v ? ' is-on' : ''}"><input class="vh" type="radio" name="${name}" value="${v}" data-radio="${id}"${String(this.sel[id]) === v ? ' checked' : ''}>${esc(opts[v])}</label>`).join('')}</div>`;
      return `<div class="cfg__opt${isNew ? ' is-new' : ''}"><span class="cfg__label" id="${name}-l"${la}>${many ? `<label for="${name}">${esc(o.t)}</label>` : esc(o.t)}${req ? `<span class="req" title="${esc(T.cfgRequired)}">*</span>` : ''}</span><div${la}>${control}</div></div>`;
    }).join('');
    this._vis = vis;
    const reqVis = this.active(vis).filter((id) => this.req.has(id));
    const done = reqVis.filter((id) => this.sel[id] !== undefined && this.sel[id] !== '').length;
    const lines = this.lines();
    this.box.innerHTML = `<div class="cfg__steps">${rows}</div>
      <aside class="cfg__summary" aria-label="${esc(T.cfgSummary)}">
        <h3>${esc(T.cfgSummary)}${colon(this.ctx.lang)}${esc(this.d.code)}</h3>
        <div class="cfg__progress" role="progressbar" aria-valuemin="0" aria-valuemax="${reqVis.length}" aria-valuenow="${done}" aria-label="${esc(tpl(T.cfgProgress, { done, total: reqVis.length }))}"><span style="width:${reqVis.length ? (done / reqVis.length) * 100 : 100}%"></span></div>
        <p class="muted">${esc(tpl(T.cfgProgress, { done, total: reqVis.length }))}</p>
        ${lines.length ? `<dl>${lines.map(([k, v]) => `<div><dt${la}>${esc(k)}</dt><dd${la}>${esc(v)}</dd></div>`).join('')}</dl>` : `<p class="muted">${esc(T.cfgEmpty)}</p>`}
        <div class="cluster"><span class="small">${esc(T.quantity)}</span><div class="qty"><button type="button" data-q="-1" aria-label="−">−</button><input type="number" min="1" value="${this.qty}" data-qty aria-label="${esc(T.quantity)}"><button type="button" data-q="1" aria-label="+">+</button></div></div>
        <div class="err" data-cfg-err role="alert" hidden></div>
        <button class="btn btn--red btn--block" type="button" data-cfg-add>${icon('plus')}${esc(t.ui.addInquiry)}</button>
        <button class="link small" type="button" data-cfg-reset>${esc(T.cfgReset)}</button>
      </aside>`;
    if (!this.bound) this.bind();
    if (focusId) {
      const f = this.box.querySelector(`[data-radio="${focusId}"]:checked`) || this.box.querySelector(`[data-sel="${focusId}"]`) || this.box.querySelector(`[data-text="${focusId}"]`);
      f?.focus({ preventScroll: true });
    }
  }
  lines() {
    const out = [];
    for (const id of this.visibleOptions()) {
      const o = this.byId[id], v = this.sel[id];
      if (v === undefined || v === '') continue;
      if (this.isText(o)) out.push([o.t, String(v)]);
      else { const m = o.v.find((x) => String(x[0]) === String(v)); if (m) out.push([o.t, m[1]]); }
    }
    return out;
  }
  bind() {
    this.bound = true;
    this.box.addEventListener('change', (e) => {
      const r = e.target.closest('[data-radio]');
      if (r) { this.sel[r.dataset.radio] = r.value; this.prune(); this.render(r.dataset.radio); return; }
      const s = e.target.closest('[data-sel]');
      if (s) { if (s.value) this.sel[s.dataset.sel] = s.value; else delete this.sel[s.dataset.sel]; this.prune(); this.render(s.dataset.sel); return; }
      const q = e.target.closest('[data-qty]');
      if (q) { this.qty = Math.max(1, parseInt(q.value, 10) || 1); }
    });
    this.box.addEventListener('input', (e) => {
      const tx = e.target.closest('[data-text]');
      if (tx) { const v = tx.value; if (v.trim()) this.sel[tx.dataset.text] = v; else delete this.sel[tx.dataset.text]; this.updateSummaryOnly(); }
    });
    this.box.addEventListener('click', (e) => {
      const q = e.target.closest('[data-q]');
      if (q) { this.qty = Math.max(1, this.qty + Number(q.dataset.q)); const i = this.box.querySelector('[data-qty]'); if (i) i.value = this.qty; return; }
      if (e.target.closest('[data-cfg-reset]')) { this.sel = {}; this.qty = 1; this.render(); return; }
      if (e.target.closest('[data-cfg-add]')) this.add();
    });
  }
  updateSummaryOnly() {
    const dl = this.box.querySelector('.cfg__summary dl, .cfg__summary p.muted:not(:first-of-type)');
    const lines = this.lines();
    const html = lines.length ? `<dl>${lines.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : `<p class="muted">${esc(this.t.product.cfgEmpty)}</p>`;
    const sum = this.box.querySelector('.cfg__summary');
    const old = sum.querySelector('dl') || [...sum.querySelectorAll('p.muted')].pop();
    if (old) old.outerHTML = html;
  }
  add() {
    const t = this.t, T = t.product;
    const vis = this.active(this.visibleOptions());
    const missing = vis.filter((id) => this.req.has(id) && (this.sel[id] === undefined || this.sel[id] === '')).map((id) => this.byId[id].t);
    const err = this.box.querySelector('[data-cfg-err]');
    if (missing.length) {
      err.hidden = false;
      err.textContent = tpl(T.cfgMissing, { list: missing.join(', ') });
      const first = vis.find((id) => this.req.has(id) && (this.sel[id] === undefined || this.sel[id] === ''));
      const target = this.box.querySelector(`[data-radio="${first}"], [data-sel="${first}"], [data-text="${first}"]`);
      target?.closest('.cfg__opt')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target?.focus({ preventScroll: true });
      return;
    }
    err.hidden = true;
    basket.add({ id: this.d.id, code: this.d.code, sel: { ...this.sel }, lines: this.lines(), qty: this.qty });
    toast(T.cfgAdded, { label: t.ui.inquiryList, href: this.ctx.href('inquiry') });
  }
}
