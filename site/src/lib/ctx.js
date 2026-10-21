// Render-Kontext (Build und Browser): Links, Bilder, Formatierung, Daten
import { pathFor, dataLang, LANGS } from './routes.js';
import { buildQuery } from './product.js';
import { plural, fmtBytes, slugify } from './util.js';

export const b64url = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return (typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export const unb64url = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = typeof atob === 'function' ? atob(s) : Buffer.from(s, 'base64').toString('binary');
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

// SPA-Hash: #de.produkte.mittelspannung~<b64 query>~~anker
export function spaHash(lang, path, q, anchor) {
  let h = '#' + lang + (path ? '.' + path.replace(/\//g, '.') : '');
  const qs = q ? (typeof q === 'string' ? q : buildQuery(q)) : '';
  if (qs) h += '~' + b64url(qs);
  if (anchor) h += '~~' + anchor;
  return h;
}
export function parseSpaHash(hash) {
  const m = /^#?(de|en|fr|hu|es)(?:\.([a-z0-9.\-]*))?(?:~([A-Za-z0-9_-]+))?(?:~~([A-Za-z0-9_-]+))?$/.exec(hash || '');
  if (!m) return null;
  return { lang: m[1], path: (m[2] || '').replace(/\./g, '/'), qs: m[3] ? unb64url(m[3]) : '', anchor: m[4] || '' };
}

export function makeCtx({ lang, mode = 'static', base = '/', t, data, img = {}, route = null, docBase = null }) {
  const dl = dataLang(lang);
  const ctx = {
    lang, mode, base, t, data, img, route, dl,
    href(id, p = {}, q = null) {
      const path = pathFor(lang, id, p);
      if (mode === 'spa') return spaHash(lang, path, q);
      const qs = q ? (typeof q === 'string' ? q : buildQuery(q)) : '';
      return `${base}${lang}/${path ? path + '/' : ''}${qs ? '?' + qs : ''}`;
    },
    hrefA(id, p = {}, anchor = '', q = null) {
      if (mode === 'spa') return spaHash(lang, pathFor(lang, id, p), q, anchor);
      return ctx.href(id, p, q) + (anchor ? '#' + anchor : '');
    },
    hrefLang(l, id, p = {}, q = null) {
      const path = pathFor(l, id, p);
      if (mode === 'spa') return spaHash(l, path, q);
      return `${base}${l}/${path ? path + '/' : ''}`;
    },
    langHref(l) {
      if (!route) return ctx.hrefLang(l, 'home');
      const p = { ...route.p };
      if (route.id === 'article' && route.news) p.slug = newsSlugFor(route.news, l);
      try { return ctx.hrefLang(l, route.id, p); } catch (e) { return ctx.hrefLang(l, 'home'); }
    },
    plural: (n, forms) => plural(lang, n, forms),
    fmtBytes: (n) => fmtBytes(n, lang),
    docHref: (d) => (docBase ? docBase + d.path.replace(/^\/dokumente\//, '') : d.url),
    newsSlug: (n) => newsSlugFor(n, lang),
    imgUrl(key, w = 640) {
      const m = key && ctx.img[key];
      if (!m) return '';
      const pick = m.ws.filter((x) => x <= w).pop() || m.ws[0];
      return `${base}img/${m.n}-${pick}.webp`;
    },
  };
  return ctx;
}

// Slug eines News-Beitrags pro Sprache (Fallback auf DE/EN)
export function newsSlugFor(n, lang) {
  const v = n.v[lang] || n.v[dataLang(lang)] || n.v.de || Object.values(n.v)[0];
  return v.slug || slugify(v.title).slice(0, 70);
}
export { LANGS };
