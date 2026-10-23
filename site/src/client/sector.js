// Anwendungsseiten: Schaltbild und Legende heben gemeinsam hervor (Überfahren, Fokus), ein Klick auf einen Einbauort
// im Schaltbild folgt dem Legendenlink. Die Produktgruppen werden zu Reitern; Links auf #gruppe-n (Legende,
// Anforderungen) wählen den Reiter und führen zum Produktbereich. Ohne Skript stehen alle Gruppen untereinander.
import { $, $$ } from './core.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initSector(root) {
  const box = $('[data-sector]', root);
  if (!box || box.dataset.ready) return;
  box.dataset.ready = '1';

  // ---------- Schaltbild ↔ Legende ----------
  const mp = $('[data-mp]', box);
  const pts = mp ? $$('.mp-pt', mp) : [];
  const keys = $$('a[data-pt]', box);
  const hot = (n) => {
    if (!mp) return;
    mp.classList.toggle('has-hot', !!n);
    pts.forEach((p) => p.classList.toggle('is-hot', p.dataset.pt === n));
    keys.forEach((a) => a.classList.toggle('is-hot', a.dataset.pt === n));
  };
  for (const a of keys) {
    a.addEventListener('mouseenter', () => hot(a.dataset.pt));
    a.addEventListener('mouseleave', () => hot(''));
    a.addEventListener('focus', () => hot(a.dataset.pt));
    a.addEventListener('blur', () => hot(''));
  }
  for (const p of pts) {
    p.addEventListener('mouseenter', () => hot(p.dataset.pt));
    p.addEventListener('mouseleave', () => hot(''));
    p.addEventListener('click', () => { const a = keys.find((k) => k.dataset.pt === p.dataset.pt && k.closest('.mp__legend')); if (a) a.click(); });
  }

  // ---------- Produktgruppen als Reiter ----------
  const bar = $('[data-sc-tabs]', box);
  const tabs = bar ? $$('[data-sc-tab]', bar) : [];
  const panels = $$('[data-sc-panel]', box);
  if (!bar || tabs.length < 2 || tabs.length !== panels.length) return;
  bar.setAttribute('role', 'tablist');
  tabs.forEach((t, i) => {
    const p = panels[i];
    t.id = `sc-tab-${i + 1}`;
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-controls', p.id);
    p.setAttribute('role', 'tabpanel');
    p.setAttribute('aria-labelledby', t.id);
    p.tabIndex = 0;
  });
  box.classList.add('has-tabs');
  bar.hidden = false;
  let cur = -1;
  const select = (i, focus = false) => {
    if (i < 0 || i >= tabs.length) return;
    cur = i;
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    panels.forEach((p, k) => { p.hidden = k !== i; });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => t.addEventListener('click', () => select(i)));
  bar.addEventListener('keydown', (e) => {
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (k) { e.preventDefault(); select((cur + k + tabs.length) % tabs.length, true); }
    else if (e.key === 'Home') { e.preventDefault(); select(0, true); }
    else if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); }
  });
  // Links auf eine Gruppe: Reiter wählen, Produktbereich zeigen
  box.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#gruppe-"]');
    if (!a) return;
    const i = +a.getAttribute('href').slice(8) - 1;
    if (!tabs[i]) return;
    e.preventDefault();
    select(i);
    const sec = $('#produkte', box);
    if (sec) sec.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  });
  // Sprungadresse #gruppe-n beim Laden und bei späterem Wechsel (Verlauf, eingefügte Adresse); in der Vorschau
  // steht die Gruppe als Anker hinter der Seitenadresse (#de.anwendungen.bahntechnik~~gruppe-2)
  const fromHash = () => { const m = /(?:^#|~~)gruppe-(\d+)$/.exec(location.hash); return m ? Math.min(tabs.length, Math.max(1, +m[1])) - 1 : -1; };
  select(Math.max(0, fromHash()));
  addEventListener('hashchange', () => { if (box.isConnected && fromHash() >= 0) select(fromHash()); });
}
