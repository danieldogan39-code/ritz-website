// Anfrageliste und Vergleich
import { store, bus, $, $$, toast, getIndex, getT, clientCtx, CFG } from './core.js';
import { esc, icon, tpl, imgTag, productGlyph, fmtKv, fmtRange, fmtList, colon } from '../lib/util.js';
import { descriptor, specRows, imgFit } from '../lib/product.js';

const BK = 'ritz-basket', CK = 'ritz-compare';
export const basket = {
  all: () => store.get(BK, []),
  count: () => basket.all().reduce((s, i) => s + (i.qty || 1), 0),
  add(item) {
    const list = basket.all();
    const key = item.id + '|' + JSON.stringify(item.sel || {}) + '|' + (item.special || '');
    const ex = list.find((i) => i.key === key);
    if (ex) ex.qty = (ex.qty || 1) + (item.qty || 1);
    else list.push({ ...item, key, qty: item.qty || 1, ts: Date.now() });
    store.set(BK, list);
  },
  update(key, qty) { const list = basket.all(); const it = list.find((i) => i.key === key); if (it) { it.qty = Math.max(1, Math.min(99999, qty | 0 || 1)); store.set(BK, list); } },
  remove(key) { store.set(BK, basket.all().filter((i) => i.key !== key)); },
  clear() { store.set(BK, []); },
};
export const compare = {
  all: () => store.get(CK, []),
  has: (id) => compare.all().includes(id),
  toggle(id) {
    let l = compare.all();
    if (l.includes(id)) l = l.filter((x) => x !== id);
    else { if (l.length >= 4) return false; l = [...l, id]; }
    store.set(CK, l);
    return true;
  },
  clear() { store.set(CK, []); },
};

export function initBadges() {
  const upd = () => {
    const n = basket.count();
    $$('[data-basket-count]').forEach((el) => { el.textContent = n > 99 ? '99+' : String(n); el.hidden = n === 0; });
    $$('[data-basket-link]').forEach((a) => a.setAttribute('aria-label', a.getAttribute('aria-label').replace(/\s*\(\d+\)$/, '') + (n ? ` (${n})` : '')));
  };
  upd();
  bus.on('store:' + BK, upd);
}

// Vergleichs-Schalter: ein einziger Klick-Listener für das ganze Dokument (verhindert doppeltes Umschalten)
let cmpBound = false;
export function initCompareToggles() {
  const sync = () => {
    const l = compare.all();
    $$('[data-compare-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(l.includes(b.dataset.compareToggle))));
  };
  sync();
  if (cmpBound) return;
  cmpBound = true;
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-compare-toggle]');
    if (!b) return;
    e.preventDefault();
    const t = await getT();
    if (!compare.toggle(b.dataset.compareToggle)) toast(t.finder.compareMax);
    sync();
  });
  bus.on('store:' + CK, sync);
}

export function initBasketButtons(root = document) {
  if (root.__bkBound) return;
  root.__bkBound = true;
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-basket-add]');
    if (!b) return;
    e.preventDefault();
    const [idx, t] = await Promise.all([getIndex(), getT()]);
    const p = idx._byId[b.dataset.basketAdd];
    if (!p) return;
    // Produkte mit Konfigurator: auf der Karte direkt zur Konfiguration führen
    if (p.cfg && !b.closest('.pd') && !b.closest('#anfrage')) {
      const ctx = await clientCtx();
      location.href = ctx.hrefA('product', { area: p.area, slug: p.id }, 'konfigurator');
      return;
    }
    basket.add({ id: p.id, code: p.code, area: p.area, sel: {}, lines: [] });
    const ctx = await clientCtx();
    toast(t.ui.added, { label: t.ui.inquiryList, href: ctx.href('inquiry') });
  });
}

// ---- Vergleichsleiste ----
export function initTray() {
  let tray = null;
  const render = async () => {
    const l = compare.all();
    if (!l.length) { tray?.remove(); tray = null; return; }
    const [idx, t, ctx] = await Promise.all([getIndex(), getT(), clientCtx()]);
    if (!tray) { tray = document.createElement('div'); tray.className = 'tray'; tray.setAttribute('role', 'region'); document.body.appendChild(tray); }
    tray.setAttribute('aria-label', t.finder.compareTray);
    tray.innerHTML = `<div class="tray__items">${l.map((id) => { const p = idx._byId[id]; return p ? `<span class="tray__item">${esc(p.code)}<button type="button" data-tray-rm="${esc(id)}" aria-label="${esc(t.ui.remove)}: ${esc(p.code)}">×</button></span>` : ''; }).join('')}</div>
      <a class="btn btn--red btn--small" href="${ctx.href('compare')}">${icon('compare')}${esc(t.ui.compareNow)} (${l.length})</a>`;
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tray-rm]');
    if (b) { compare.toggle(b.dataset.trayRm); }
  });
  bus.on('store:' + CK, render);
  if (CFG.route?.id !== 'compare') render();
}

// ---- Anfrageseite ----
export async function initInquiry(root) {
  const list = $('[data-basket-list]', root);
  if (!list) return;
  const [idx, t, ctx] = await Promise.all([getIndex(), getT(), clientCtx()]);
  const I = t.inquiry;
  const empty = list.innerHTML;
  const clearBtn = $('[data-basket-clear]', root);
  const render = () => {
    const items = basket.all();
    if (clearBtn) clearBtn.hidden = !items.length;
    if (!items.length) { list.innerHTML = empty; return; }
    list.innerHTML = items.map((it) => {
      const p = idx._byId[it.id] || { code: it.code, area: it.area, kind: 'ct' };
      const url = p.id ? ctx.href('product', { area: p.area, slug: p.id }) : '#';
      const img = p.images?.[0] && ctx.img[p.images[0]] ? imgTag(ctx, p.images[0], { alt: '', sizes: '88px', max: 320, cls: imgFit(ctx, p.images[0]) }) : productGlyph(p.kind);
      return `<div class="bitem" data-key="${esc(it.key)}">
        <div class="bitem__img">${img}</div>
        <div><a class="bitem__code" href="${url}">${esc(it.code)}</a><div class="small muted">${esc(p.id ? descriptor(p, t, ctx.lang) : '')}</div>
          <div class="bitem__cfg">${(it.lines || []).length ? it.lines.map(([k, v]) => `<span>${esc(k)}${colon(CFG.lang)}<b>${esc(v)}</b></span>`).join('') : `<span class="faint">${esc(I.unconfigured)}</span>`}${it.special ? `<span>${esc(t.product.cfgSpecial)}${colon(CFG.lang)}<b>${esc(it.special)}</b></span>` : ''}</div>
          ${p.cfg ? `<a class="link small" href="${ctx.hrefA('product', { area: p.area, slug: p.id }, 'konfigurator')}">${esc(I.edit)}</a>` : ''}
        </div>
        <div class="bitem__side">
          <div class="qty"><button type="button" data-qty="-1" aria-label="−">−</button><input type="number" min="1" value="${it.qty || 1}" aria-label="${esc(t.product.quantity)}" data-qty-input><button type="button" data-qty="1" aria-label="+">+</button></div>
          <button class="link small" type="button" data-rm>${icon('trash', 'width="15" height="15"')}${esc(t.ui.remove)}</button>
        </div>
      </div>`;
    }).join('');
  };
  render();
  bus.on('store:ritz-basket', render);
  list.addEventListener('click', (e) => {
    const row = e.target.closest('[data-key]');
    if (!row) return;
    const key = row.dataset.key;
    if (e.target.closest('[data-rm]')) basket.remove(key);
    const q = e.target.closest('[data-qty]');
    if (q) { const it = basket.all().find((i) => i.key === key); basket.update(key, (it?.qty || 1) + Number(q.dataset.qty)); }
  });
  list.addEventListener('change', (e) => {
    const inp = e.target.closest('[data-qty-input]');
    if (inp) basket.update(inp.closest('[data-key]').dataset.key, parseInt(inp.value, 10));
  });
  clearBtn?.addEventListener('click', () => basket.clear());
  const form = $('[data-inquiry-form]', root);
  if (form) bindForm(form, t, ctx, 'inquiry', () => basket.all());
}

export function inquiryText(t, items, fields) {
  const I = t.inquiry;
  const lines = [];
  lines.push(`${I.title} – RITZ Instrument Transformers`, '');
  for (const [k, v] of Object.entries(fields)) if (v && !['privacy', 'website'].includes(k)) lines.push(`${k}: ${v}`);
  if (items?.length) {
    lines.push('', I.listTitle + ':');
    for (const it of items) {
      lines.push(`- ${it.qty || 1} × ${it.code}`);
      for (const [k, v] of it.lines || []) lines.push(`    ${k}: ${v}`);
      if (it.special) lines.push(`    ${t.product.cfgSpecial}: ${it.special}`);
    }
  }
  return lines.join('\n');
}

// Formular: Prüfen, Senden (live: PHP-Endpunkt; Vorschau: nur Anzeige)
export function bindForm(form, t, ctx, kind, getItems = () => []) {
  const I = t.inquiry;
  const err = $('[data-form-error]', form), ok = $('[data-form-success]', form);
  const setErr = (el, msg) => {
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
    let m = el.parentElement.querySelector('.err');
    if (msg) { if (!m) { m = document.createElement('span'); m.className = 'err'; m.id = el.id + '-err'; el.parentElement.appendChild(m); el.setAttribute('aria-describedby', m.id); } m.textContent = msg; }
    else m?.remove();
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let first = null;
    for (const el of $$('input[required], select[required], textarea[required]', form)) {
      let msg = '';
      if (el.type === 'checkbox') msg = el.checked ? '' : I.errPrivacy;
      else if (!el.value.trim()) msg = I.errRequired;
      else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim())) msg = I.errEmail;
      if (el.type === 'checkbox') { const lab = el.closest('label'); lab?.classList.toggle('is-invalid', !!msg); if (msg && err) { err.hidden = false; err.textContent = msg; } }
      else setErr(el, msg);
      if (msg && !first) first = el;
    }
    if (first) { if (err && first.type !== 'checkbox') { err.hidden = false; err.textContent = t.forms.submitError; } first.focus(); return; }
    if (err) err.hidden = true;
    const fields = Object.fromEntries(new FormData(form).entries());
    if (fields.website) return; // Honeypot
    const items = getItems();
    const text = inquiryText(t, items, fields);
    const btn = $('button[type="submit"]', form);
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = I.sending;
    let sent = false;
    if (CFG.mode !== 'spa' && CFG.api) {
      try {
        const r = await fetch(CFG.api + (kind === 'inquiry' ? 'anfrage.php' : 'kontakt.php'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, lang: CFG.lang, fields, items, page: location.href }) });
        sent = r.ok;
      } catch (e2) { sent = false; }
    }
    btn.disabled = false; btn.textContent = label;
    const copy = `<pre class="copybox" tabindex="0">${esc(text)}</pre><button class="btn btn--ghost btn--small" type="button" data-copy-text>${icon('copy')}${esc(I.copyText)}</button>`;
    ok.hidden = false;
    if (sent) {
      if (kind === 'inquiry') basket.clear();
      ok.innerHTML = `<div class="notice notice--ok" role="status"><b>${esc(I.success)}</b><p>${esc(I.successText)}</p></div>${copy}`;
    } else if (CFG.mode === 'spa' || CFG.preview) {
      // Vorschau: nichts wird versendet – das ehrlich sagen und den Text zum Kopieren anbieten
      ok.innerHTML = `<div class="notice" role="status"><p>${esc(I.previewNote)}</p></div>${copy}`;
    } else {
      // Versand fehlgeschlagen (z. B. ohne PHP): Hinweis mit Adresse und Text zum Kopieren
      if (err) { err.hidden = false; err.textContent = tpl(I.errSend, { mail: 'info@ritz-international.com' }); }
      ok.innerHTML = copy;
    }
    ok.querySelector('[data-copy-text]').addEventListener('click', () => copyText(text, t));
    if (sent) form.reset();
    ok.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

export async function copyText(text, t) {
  try { await navigator.clipboard.writeText(text); toast(t.ui.copied); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(t.ui.copied); } catch (e2) { /* ignore */ }
    ta.remove();
  }
}

// ---- Vergleichsseite ----
export async function initComparePage(root) {
  const box = $('[data-compare]', root);
  if (!box) return;
  const [idx, t, ctx] = await Promise.all([getIndex(), getT(), clientCtx()]);
  const empty = box.innerHTML;
  let onlyDiff = false;
  const render = () => {
    const items = compare.all().map((id) => idx._byId[id]).filter(Boolean);
    if (!items.length) { box.innerHTML = empty; return; }
    const rowsBy = items.map((p) => Object.fromEntries(specRows(ctx, p)));
    const keys = [...new Set(rowsBy.flatMap((r) => Object.keys(r)))];
    const head = `<tr><th scope="col"><span class="vh">${esc(t.lbl.spec.code)}</span></th>${items.map((p) => `<th scope="col"><div class="cmp__head"><div class="cmp__img">${p.images?.[0] && ctx.img[p.images[0]] ? imgTag(ctx, p.images[0], { alt: '', sizes: '120px', max: 320, cls: imgFit(ctx, p.images[0]) }) : productGlyph(p.kind)}</div><a class="pcard__code" href="${ctx.href('product', { area: p.area, slug: p.id })}">${esc(p.code)}</a><span class="small muted">${esc(descriptor(p, t, ctx.lang))}</span><button class="link small" type="button" data-cmp-rm="${esc(p.id)}">${esc(t.ui.remove)}</button></div></th>`).join('')}</tr>`;
    const body = keys.map((k) => {
      const vals = rowsBy.map((r) => r[k] || '–');
      const diff = new Set(vals).size > 1;
      if (onlyDiff && !diff) return '';
      return `<tr class="${diff ? 'diff' : ''}"><th scope="row">${esc(k)}</th>${vals.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`;
    }).join('');
    box.innerHTML = `<div class="finder__bar"><label class="check"><input type="checkbox" data-only-diff ${onlyDiff ? 'checked' : ''}><span>${esc(t.compare.onlyDiff)}</span></label><div class="cluster"><button class="btn btn--ghost btn--small" type="button" data-cmp-clear>${esc(t.compare.clear)}</button><a class="btn btn--small" href="${ctx.href('finder')}">${esc(t.ui.openFinder)}</a></div></div>
      <div class="cmp"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
  };
  render();
  bus.on('store:' + CK, render);
  box.addEventListener('click', (e) => {
    const r = e.target.closest('[data-cmp-rm]');
    if (r) compare.toggle(r.dataset.cmpRm);
    if (e.target.closest('[data-cmp-clear]')) compare.clear();
  });
  box.addEventListener('change', (e) => { if (e.target.matches('[data-only-diff]')) { onlyDiff = e.target.checked; render(); } });
}
