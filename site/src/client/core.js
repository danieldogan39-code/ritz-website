// Browser-Kern: Konfiguration, Speicher, Ereignisse, Daten, Hinweise
import { makeCtx } from '../lib/ctx.js';

export const CFG = (typeof window !== 'undefined' && window.__RITZ__) || {};

// ---- Speicher (localStorage, mit Fallback im Speicher) ----
const mem = {};
export const store = {
  get(k, d = null) {
    try { const v = window.localStorage.getItem(k); return v === null ? (k in mem ? mem[k] : d) : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; }
  },
  set(k, v) {
    mem[k] = v;
    try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privat/gesperrt: nur im Speicher */ }
    bus.emit('store:' + k, v);
  },
};

// ---- Ereignisse ----
const handlers = {};
export const bus = {
  on(ev, fn) { (handlers[ev] ||= new Set()).add(fn); return () => handlers[ev].delete(fn); },
  emit(ev, data) { (handlers[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },
};

// ---- Daten ----
const cache = {};
export function getData(name) {
  if (!cache[name]) {
    const url = (CFG.dataBase || 'data/') + name + '.json' + (CFG.v ? '?v=' + CFG.v : '');
    cache[name] = fetch(url).then((r) => { if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); }).catch((e) => { delete cache[name]; throw e; });
  }
  return cache[name];
}
export function setData(name, value) { cache[name] = Promise.resolve(value); }

// Text-Wörterbuch des Clients
let T = null;
export async function getT(lang = CFG.lang) {
  if (CFG.t && CFG.t.meta?.lang === lang) return CFG.t;
  if (T && T.meta?.lang === lang) return T;
  T = await getData('t-' + lang);
  return T;
}

// Texte der Werkzeuge (Spezifikations-Check, Rechner, Projektmappe) – eigene Datei, nur bei Bedarf geladen
export async function getX(lang = CFG.lang) {
  if (CFG.t?.x && CFG.t.meta?.lang === lang) return CFG.t.x;
  return getData('x-' + lang);
}
export const vendorBase = () => (CFG.mode === 'spa' ? 'vendor/' : (CFG.base || '/') + 'assets/vendor/');
// Konfiguratordaten aller Produkte (Optionen, Abhängigkeiten, Rollen) in der Datensprache
export const getCfgAll = (dl) => getData('cfg-' + dl);
// Datei zum Herunterladen anbieten (Vorschau: nicht möglich → false, dann Kopieren anbieten)
export function saveFile(name, text, type = 'text/plain') {
  if (CFG.mode === 'spa') return false;
  try {
    const url = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (e) { return false; }
}
// Übergabe zwischen Werkzeugen (z. B. Startseite → Spezifikations-Check) über sessionStorage
export const handoff = {
  put(k, v) { try { sessionStorage.setItem('ritz-h-' + k, JSON.stringify(v)); } catch (e) { mem['h-' + k] = v; } },
  take(k) {
    let v = null;
    try { const s = sessionStorage.getItem('ritz-h-' + k); if (s) { v = JSON.parse(s); sessionStorage.removeItem('ritz-h-' + k); } } catch (e) { v = mem['h-' + k] ?? null; delete mem['h-' + k]; }
    return v;
  },
};

// Index: Produkte + Bildmanifest für Karten
export async function getIndex() {
  const idx = await getData('index');
  if (!idx._img) {
    idx._img = {};
    for (const p of idx.products) if (p.im) idx._img[p.images[0]] = { n: p.im[0], w: p.im[1], h: p.im[2], ws: p.im[3], ...(p.im[4] ? { bg: p.im[4] } : {}) };
    idx._byId = Object.fromEntries(idx.products.map((p) => [p.id, p]));
  }
  return idx;
}

export async function clientCtx(extra = {}) {
  const [t, idx] = await Promise.all([getT(), getIndex()]);
  return makeCtx({ lang: CFG.lang, mode: CFG.mode, base: CFG.base, t, data: { products: idx.products }, img: { ...idx._img, ...(CFG.img || {}) }, route: CFG.route, docBase: CFG.docBase || null, ...extra });
}

// ---- Hinweise (Toasts) ----
export function toast(msg, link = null) {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  if (link) { const a = document.createElement('a'); a.href = link.href; a.textContent = link.label; el.appendChild(a); }
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 3800);
}

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export function debounce(fn, ms = 160) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// URL-Zustand (Query) – statisch: ?a=b ; SPA: im Hash-Token
import { spaHash, parseSpaHash } from '../lib/ctx.js';
export function readQuery() {
  if (CFG.mode === 'spa') return parseSpaHash(location.hash)?.qs || '';
  return location.search.replace(/^\?/, '');
}
export function writeQuery(qs) {
  if (CFG.mode === 'spa') {
    const cur = parseSpaHash(location.hash);
    if (!cur) return;
    const h = spaHash(cur.lang, cur.path, qs);
    if (h !== location.hash) history.replaceState(null, '', h);
  } else {
    const url = location.pathname + (qs ? '?' + qs : '') + location.hash;
    history.replaceState(null, '', url);
  }
}
