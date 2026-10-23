// Karriereseite: Stationen als Filter der Stellenliste, dazu Standort, Einstieg und Suche. Jede Zahl (Stationen,
// Standorte, Einstieg) zählt die Stellen, die bei den übrigen Filtern übrig bleiben. Zustand steht in der Adresse
// (?area=…&loc=…&type=…&q=…), damit Links aus Standortkarten, Startseite und Menü vorgefiltert öffnen.
import { $, $$, getT, readQuery, writeQuery, debounce, CFG } from './core.js';
import { JOB_AREAS, JOB_SITES, normJob, countHtml } from '../lib/jobs.js';

const TYPES = ['training', 'permanent'];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export async function initCareer(root) {
  const box = $('[data-career]', root);
  if (!box) return;
  const t = await getT();
  if (!box.isConnected) return;
  const lang = CFG.lang;
  // Texte aus dem Markup (das Wörterbuch im Browser enthält keine Seitentexte)
  const dept = Object.fromEntries($$('[data-stn-b]', box).map((b) => [b.dataset.stnB, b.dataset.dept || '']));
  const jobs = $$('[data-job]', box).map((el) => ({ el, area: el.dataset.area, loc: el.dataset.loc, type: el.dataset.type, q: el.dataset.q || '' }));
  const q = $('[data-jb-q]', box), board = $('[data-jb]', box), list = $('[data-jb-groups]', box), empty = $('[data-jb-empty]', box);
  const pill = $('[data-jb-area]', box), pillL = $('[data-jb-area-l]', box), mail = $('[data-jb-mail]', box);
  const ok = { area: (v) => JOB_AREAS.includes(v), loc: (v) => JOB_SITES.some((s) => s.id === v), type: (v) => TYPES.includes(v) };
  const st = { area: '', loc: '', type: '', q: '' };
  const init = new URLSearchParams(readQuery());
  for (const k of ['area', 'loc', 'type']) { const v = init.get(k) || ''; st[k] = ok[k](v) ? v : ''; }
  st.q = (init.get('q') || '').slice(0, 80);
  q.value = st.q;

  let words = [];
  const match = (j, skip) => (skip === 'area' || !st.area || j.area === st.area)
    && (skip === 'loc' || !st.loc || j.loc === st.loc)
    && (skip === 'type' || !st.type || j.type === st.type)
    && (!words.length || words.every((w) => j.q.includes(w)));
  const chipName = (sel, v) => { const c = $(`[${sel}="${v}"]`, box); return c ? c.firstChild.textContent.trim() : ''; };

  // write: Zustand in die Adresse schreiben (nicht beim ersten Zeichnen – sonst ginge ein Sprungziel wie #stellen verloren)
  const render = (write = true) => {
    words = normJob(st.q).split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const j of jobs) { const on = match(j); j.el.hidden = !on; if (on) shown++; }
    for (const g of $$('[data-jg]', box)) {
      const n = jobs.filter((j) => j.area === g.dataset.jg && !j.el.hidden).length;
      g.hidden = !n;
      const c = $('[data-jg-n]', g); if (c) c.textContent = n;
    }
    // Stationen: Zahl je Bereich bei den übrigen Filtern
    for (const b of $$('[data-stn-b]', box)) {
      const k = b.dataset.stnB, n = jobs.filter((j) => j.area === k && match(j, 'area')).length, on = st.area === k;
      $('[data-stn-c]', b).innerHTML = countHtml(lang, n, t.ui.jobCount);
      b.classList.toggle('is-zero', !n);
      b.setAttribute('aria-pressed', String(on));
      b.closest('.stn__i')?.classList.toggle('is-on', on);
    }
    $('.stn', box)?.classList.toggle('has-sel', !!st.area);
    for (const [sel, key] of [['data-jb-loc', 'loc'], ['data-jb-type', 'type']]) {
      for (const c of $$(`[${sel}]`, box)) {
        const v = c.getAttribute(sel), on = st[key] === v;
        c.classList.toggle('is-on', on);
        c.setAttribute('aria-pressed', String(on));
        if (!v) continue;
        const n = jobs.filter((j) => j[key] === v && match(j, key)).length;
        const nEl = $('[data-n]', c); if (nEl) nEl.textContent = n;
        c.classList.toggle('is-zero', !n);
      }
    }
    $('[data-jb-count]', box).innerHTML = countHtml(lang, shown, t.ui.jobCount);
    pill.hidden = !st.area;
    pillL.textContent = st.area ? dept[st.area] || '' : '';
    const any = !!(st.area || st.loc || st.type || st.q);
    for (const r of $$('.jb__reset', box)) r.hidden = !any;
    list.hidden = !shown;
    empty.hidden = !!shown;
    // Initiativbewerbung an das Personalteam des gewählten Standorts (sonst Zentrale), Betreff mit Bereich und Ort
    const site = JOB_SITES.find((s) => s.id === st.loc) || JOB_SITES[0];
    const subj = [mail?.dataset.subject, st.area && dept[st.area], st.loc && chipName('data-jb-loc', st.loc)].filter(Boolean).join(' – ');
    if (mail) mail.href = `mailto:${site.mail}?subject=${encodeURIComponent(subj)}`;
    if (write) writeQuery(new URLSearchParams(Object.entries(st).filter(([, v]) => v)).toString());
  };

  // Liste in Sicht holen, wenn sie nach einer Auswahl unterhalb des sichtbaren Bereichs beginnt
  const reveal = (el) => {
    const r = el.getBoundingClientRect();
    if (r.top > innerHeight - 140 || r.top < 0) el.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  };

  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-stn-b]');
    if (b) { st.area = st.area === b.dataset.stnB ? '' : b.dataset.stnB; render(); if (st.area) reveal(board); return; }
    const l = e.target.closest('[data-jb-loc]');
    if (l) { st.loc = l.dataset.jbLoc; render(); return; }
    const ty = e.target.closest('[data-jb-type]');
    if (ty) { st.type = ty.dataset.jbType; render(); return; }
    if (e.target.closest('[data-jb-area-x]')) { st.area = ''; render(); return; }
    if (e.target.closest('[data-jb-reset]')) { st.area = st.loc = st.type = st.q = ''; q.value = ''; render(); q.blur(); }
  });
  q.addEventListener('input', debounce(() => { st.q = q.value.trim().slice(0, 80); render(); }, 140));
  q.addEventListener('search', () => { st.q = q.value.trim(); render(); });

  // Standortkarten (außerhalb des Abschnitts): Standort wählen, übrige Filter lösen, zur Liste
  for (const a of $$('[data-jb-goto]', root)) {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      st.area = st.type = st.q = ''; q.value = '';
      st.loc = ok.loc(a.dataset.jbGoto) ? a.dataset.jbGoto : '';
      render();
      board.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    });
  }
  render(false);
}
