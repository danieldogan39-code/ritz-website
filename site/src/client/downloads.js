// Downloadcenter: Suche und Filter über alle Dokumente
import { $, $$, getData, getT, clientCtx, readQuery, writeQuery, debounce } from './core.js';
import { esc, tpl } from '../lib/util.js';
import { docRow } from '../views/layout.js';

const ORDER = ['catalog', 'datasheet', 'drawing', 'manual', 'knowledge', 'certificate', 'terms', 'compliance', 'press', 'career', 'document'];
const CAP = 40;

export async function initDownloads(root) {
  const box = $('[data-downloads]', root);
  if (!box) return;
  const [docsC, t, ctx] = await Promise.all([getData('docs'), getT(), clientCtx()]);
  // kompaktes Format zurück in Dokumentobjekte
  const docs = docsC.map((d) => ({ id: d.id, title: d.t, local: !!d.lo, path: d.pa, file: d.f, type: d.ty, lang: d.l, size: d.s, areas: d.a || [], codes: d.c || '', ext: d.e || 'pdf' }));
  const q = $('[data-dl-q]', box), ty = $('[data-dl-type]', box), ar = $('[data-dl-area]', box), lg = $('[data-dl-lang]', box);
  const res = $('[data-dl-results]', box), cnt = $('[data-dl-count]', box), feat = $('[data-dl-featured]', box);
  const initial = new URLSearchParams(readQuery());
  q.value = initial.get('q') || ''; ty.value = initial.get('type') || ''; ar.value = initial.get('area') || ''; lg.value = initial.get('lang') || '';
  const expanded = new Set();
  const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
  const render = () => {
    const words = norm(q.value).split(/\s+/).filter(Boolean);
    const list = docs.filter((d) => (!ty.value || d.type === ty.value) && (!ar.value || d.areas.includes(ar.value)) && (!lg.value || d.lang === lg.value)
      && (!words.length || words.every((w) => norm(Object.values(d.title).join(' ') + ' ' + d.file + ' ' + d.codes).includes(w))));
    cnt.textContent = list.length;
    const filtered = q.value || ty.value || ar.value || lg.value;
    feat.hidden = !!filtered;
    writeQuery(new URLSearchParams(Object.entries({ q: q.value, type: ty.value, area: ar.value, lang: lg.value }).filter(([, v]) => v)).toString());
    if (!filtered) {
      const counts = {};
      for (const d of docs) counts[d.type] = (counts[d.type] || 0) + 1;
      res.innerHTML = `<div class="dl__groups">${ORDER.filter((k) => counts[k]).map((k) => `<button class="dlcat" type="button" data-dl-cat="${k}"><strong>${esc(t.lbl.docType[k])}</strong><span>${esc(ctx.plural(counts[k], t.ui.docCount))}</span></button>`).join('')}</div>`;
      return;
    }
    if (!list.length) { res.innerHTML = `<div class="empty"><p>${esc(t.downloads.empty)}</p></div>`; return; }
    const groups = ORDER.map((k) => [k, list.filter((d) => d.type === k)]).filter(([, l]) => l.length);
    res.innerHTML = groups.map(([k, l]) => `<div class="dl__group"><h3>${esc(t.lbl.docType[k])} <span>${l.length}</span></h3><div class="docs">${l.slice(0, expanded.has(k) ? l.length : CAP).map((d) => docRow(ctx, d)).join('')}</div>${l.length > CAP && !expanded.has(k) ? `<button class="btn btn--ghost btn--small mt" type="button" data-dl-more="${k}">${esc(tpl(t.downloads.showAll, { n: l.length }))}</button>` : ''}</div>`).join('');
  };
  render();
  q.addEventListener('input', debounce(render, 160));
  for (const s of [ty, ar, lg]) s.addEventListener('change', render);
  res.addEventListener('click', (e) => {
    const c = e.target.closest('[data-dl-cat]');
    if (c) { e.preventDefault(); ty.value = c.dataset.dlCat; render(); res.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const m = e.target.closest('[data-dl-more]');
    if (m) { expanded.add(m.dataset.dlMore); render(); }
  });
}
