// Weltkarte „Weltweit vernetzt“: Modell und Markup für die Startseite (home), die Standorte (locations, nur
// RITZ-Standorte) und die Kontaktseite (contact, alle Standorte und Vertretungen mit Suche, Liste und allen Angaben).
// Ohne JavaScript: Punktkarte als Bild (img/world-dots.svg) mit den Markern in Prozentlage und – auf den Unterseiten –
// der vollständigen Liste. Mit JavaScript zeichnet src/client/netmap.js Punkte und Netz auf eine Leinwand. Knoten,
// Bögen, Zeitplan und Texte stehen als JSON in der Seite, damit Ansicht und Skript dieselben Daten nutzen.
import { esc, icon, tpl, fmtNum, htmlText } from '../lib/util.js';
import { projectLL, countryName, locAddress } from '../lib/geo.js';
import { MAP_STORIES, LOC_IMG } from '../lib/catalog.js';
import { shorten } from './layout.js';

const GENERIC_FN = /^(vertrieb|controlling|it$|personal|konstruktion|zwei gesellschaften)/i;
export function plantFunctions(l, lang, dl) {
  const de = l.functions?.de || [];
  const list = (l.functions && (l.functions[lang] || l.functions[dl] || l.functions.en)) || [];
  return list.filter((f, i) => !GENERIC_FN.test(de[i] || f));
}
// Knoten, von denen die Verbindungen zu den Vertretungen ausgehen (nächster Standort, sonst „servedFrom“).
// Die Linien sind ein Bild für das Netz, keine Zuständigkeitsangabe.
const NM_HUBS = ['hamburg', 'kirchaich', 'dresden', 'wirges', 'marchtrenk', 'kecskemet', 'lavonia', 'shanghai', 'dubai'];
const NM_SHORT = { kirchaich: 'Kirchaich', dresden: 'Dresden', lavonia: 'Lavonia', waynesboro: 'Waynesboro' };
const NM_REGIONS = { europe: [-11, 35, 33, 62], americas: [-125, -42, -32, 52], apac: [62, -42, 155, 48], africa: [-18, -36, 60, 40] };
const NM_PSEUDO = {
  CARIB: { de: 'Karibik (weitere Länder)', en: 'Caribbean (other)', fr: 'Caraïbes (autres pays)', hu: 'Karib-térség (további országok)', es: 'Caribe (otros países)' },
  LATAM: { de: 'Lateinamerika', en: 'Latin America', fr: 'Amérique latine', hu: 'Latin-Amerika', es: 'Latinoamérica' },
};
const TYPE_ORDER = { hq: 0, production: 1, site: 2, sales: 3 };
const gcDeg = (a, b) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / r;
};
const routeUrl = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
// Anriss eines Beitrags: erster Absatz mit Fließtext – keine reinen Dokument-Links, keine Zeilen in Versalien; sonst leer
function teaser(h) {
  for (const m of String(h || '').matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)) {
    const tx = htmlText(m[1]);
    if (/^\s*<a\b[^>]*data-doc/.test(m[1]) && !/<\/a>\s*[^\s<]/.test(m[1])) continue;
    const letters = tx.replace(/[^\p{L}]/gu, '');
    if (tx.length < 25 || (letters && letters.replace(/[^\p{Lu}]/gu, '').length / letters.length > 0.6)) continue;
    return shorten(tx, 150);
  }
  return '';
}
// Foto für die angeheftete Karte (Standort oder Beitrag): das erste ausreichend große Bild (die Karte ist gut 300 px
// breit, auf scharfen Bildschirmen doppelt) – kleine Altbilder (z. B. 260 px) würden unscharf, dann bleibt die Karte ohne Foto
const picUrl = (ctx, ...keys) => { const k = keys.flat().find((x) => x && ctx.img[x] && ctx.img[x].w >= 400); return k ? ctx.imgUrl(k, 640) : ''; };

export function netModel(ctx, { mode = 'home' } = {}) {
  const { t, lang } = ctx;
  const meta = ctx.data.worldmeta;
  const C = ctx.data.contacts;
  const N = t.pages.home.net;
  const withReps = mode !== 'locations';
  const full = mode !== 'home'; // Unterseiten: Route und vollständige Angaben
  const cname = (code, r) => NM_PSEUDO[code]?.[lang] || (code && code.length === 2 ? countryName(code, lang) : (lang === 'de' ? r?.country_de : r?.country_en) || code);
  const r1 = (v) => Math.round(v * 10) / 10;
  const nodes = [];
  const near = (x, y) => nodes.find((n) => Math.hypot(n.x - x, n.y - y) < 1.2);
  const locs = C.locations.filter((l) => l.lat);
  const cityOf = Object.fromEntries(locs.map((l) => [l.id, NM_SHORT[l.id] || l.city.replace(/\s*\(.*\)$/, '').replace(/,.*$/, '')]));
  const siteHref = (id) => (mode === 'locations' ? `#${id}` : ctx.hrefA('locations', {}, id));
  for (const l of locs) {
    const [x, y] = projectLL(meta, l.lng, l.lat);
    const fn = plantFunctions(l, lang, ctx.dl).slice(0, full ? 6 : 3).join(', ');
    nodes.push({ id: l.id, kind: l.type, x, y, lat: l.lat, lng: l.lng, cc: l.country, label: cityOf[l.id], items: [{
      k: 'l', cc: l.country, ty: l.type, ti: l.city, su: l.company, co: cname(l.country), ad: locAddress(l, lang),
      te: l.phone || '', ma: l.email || '', fn, st: l.employees ? tpl(t.pages.home.plants.staff, { n: fmtNum(l.employees, lang) }) : '',
      h: siteHref(l.id), rt: full ? routeUrl(l.lat, l.lng) : '', im: picUrl(ctx, LOC_IMG[l.id]),
    }] });
  }
  if (withReps) {
    for (const r of [...C.reps, ...(C.repsDE || [])].filter((r) => r.lat)) {
      const [x, y] = projectLL(meta, r.lng, r.lat);
      const sf = r.servedFrom === 'roswell' ? 'lavonia' : r.servedFrom;
      const it = { k: 'r', cc: r.country, ti: r.company, co: cname(r.country, r), ad: (lang === 'de' ? r.address : r.address_en || r.address) || [],
        te: r.phone || '', ma: r.email || '', sv: sf && cityOf[sf] ? `${t.map.servedBy} RITZ ${cityOf[sf]}` : '', rt: full ? routeUrl(r.lat, r.lng) : '', sf };
      const n = near(x, y);
      if (n) { n.items.push(it); continue; }
      nodes.push({ id: 'r' + r.pid, kind: 'rep', x, y, lat: r.lat, lng: r.lng, cc: r.country, label: cname(r.country, r), items: [it] });
    }
  }
  // Beiträge aus der Karte der bisherigen Startseite (nur dort): Projekte, neue Produkte, Neuigkeiten, Einsatzgebiete.
  // Liegt ein Beitrag auf einem eigenen Standort (neues Werk in Waynesboro, Gießharz in Dresden), steht er in dessen
  // Karte unter „Ebenfalls hier“ – zwei Punkte auf derselben Stelle ließen sich nicht getrennt wählen.
  const stories = [];
  if (mode === 'home') {
    const news = ctx.data.news || [];
    MAP_STORIES.forEach((s, si) => {
      const n = news.find((x) => x.id === s.news || Object.values(x.v).some((v) => v?.slug === s.news));
      if (!n) return;
      const vf = n.v[lang] ? lang : n.v[ctx.dl] ? ctx.dl : n.v.de ? 'de' : Object.keys(n.v)[0];
      const v = n.v[vf];
      const vl = v.contentLang || vf;
      const it = { k: 's', ca: N.storyCats[s.cat] || '', ti: v.title, tl: vl !== lang ? vl : '', tx: teaser(v.html),
        im: picUrl(ctx, n.image, n.images || []), h: ctx.href('article', { slug: ctx.newsSlug(n) }) };
      const [x, y] = projectLL(meta, s.lng, s.lat);
      const site = nodes.find((m) => m.kind !== 'rep' && Math.hypot(m.x - x, m.y - y) < 1.2);
      if (site) { site.items.push(it); return; }
      const node = { id: 's' + si, kind: 'story', x, y, lat: s.lat, lng: s.lng, cc: '', label: v.title, items: [it] };
      nodes.push(node);
      stories.push(node);
    });
  }
  // Verbindungen und Zeitplan des Netzaufbaus (ms ab Start): Zentrale → Standorte, Standort → Vertretungen
  const hq = nodes.find((n) => n.kind === 'hq');
  const hubs = nodes.filter((n) => NM_HUBS.includes(n.id));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const arcs = [];
  hq.t = 160;
  nodes.filter((n) => n.kind !== 'rep' && n.kind !== 'story' && n !== hq).sort((a, b) => dist(hq, a) - dist(hq, b)).forEach((n, i) => {
    const d = dist(hq, n), t0 = 520 + i * 80, dur = Math.round(520 + Math.min(1, d / 320) * 660);
    arcs.push({ a: hq, b: n, t0, dur, s: 1 });
    n.t = t0 + dur;
  });
  const reps = nodes.filter((n) => n.kind === 'rep');
  for (const n of reps) {
    const sf = n.items.map((it) => it.sf).find(Boolean);
    n.hub = hubs.find((h) => h.id === sf) || hubs.reduce((b, h) => (gcDeg(h, n) < gcDeg(b, n) ? h : b));
  }
  for (const h of hubs) {
    const mine = reps.filter((n) => n.hub === h).sort((a, b) => dist(h, a) - dist(h, b));
    const far = Math.max(1, ...mine.map((n) => dist(h, n)));
    mine.forEach((n, i) => {
      const d = dist(h, n), t0 = Math.round(h.t + 140 + 760 * (d / far) * (h.id === 'hamburg' ? 0.8 : 1) + (i % 3) * 45), dur = Math.round(360 + Math.min(1, d / 240) * 480);
      arcs.push({ a: h, b: n, t0, dur, s: 0 });
      n.t = t0 + dur;
    });
  }
  // Beiträge erscheinen nach dem Netz, nacheinander von West nach Ost
  const tNet = Math.max(0, ...nodes.map((n) => n.t || 0));
  stories.sort((a, b) => a.x - b.x).forEach((n, i) => { n.t = tNet + 160 + i * 110; });
  // Reihenfolge: Vertretungen unten, Beiträge darüber, dann Standorte, Zentrale oben
  const rank = { rep: 0, story: 0.5, site: 1, sales: 1, production: 2, hq: 3 };
  nodes.sort((a, b) => rank[a.kind] - rank[b.kind]);
  const idx = new Map(nodes.map((n, i) => [n, i]));
  const regions = {};
  for (const [k, [lo0, la0, lo1, la1]] of Object.entries(NM_REGIONS)) {
    const a = projectLL(meta, lo0, la1), b = projectLL(meta, lo1, la0), c = projectLL(meta, lo0, la0), d = projectLL(meta, lo1, la1);
    regions[k] = [Math.min(a[0], c[0]), Math.min(a[1], d[1]), Math.max(b[0], d[0]), Math.max(b[1], c[1])].map(r1);
  }
  // Länderliste (Startseite): je Land der wichtigste eigene Standort, sonst die Vertretung; dazu die Orte der
  // eigenen Standorte (Suche nach „Hamburg“ findet Deutschland) und alle Punkte des Landes (Abgleich mit der Karte)
  const byCc = new Map();
  nodes.forEach((n, i) => {
    for (const it of n.items) {
      if (it.k === 's') continue; // Beiträge gehören zu keinem Land der Auswahl
      const pr = it.k === 'l' ? 10 + rank[n.kind] : 0;
      let cur = byCc.get(it.cc);
      if (!cur) { cur = { n: i, pr, name: it.co, cities: [], ns: [] }; byCc.set(it.cc, cur); } else if (pr > cur.pr) Object.assign(cur, { n: i, pr, name: it.co });
      if (!cur.ns.includes(i)) cur.ns.push(i);
      if (it.k === 'l' && !cur.cities.some((c) => c.l === n.label)) cur.cities.push({ l: n.label, r: rank[n.kind] });
    }
  });
  const coll = new Intl.Collator(lang);
  const countries = [...byCc.values()].sort((a, b) => coll.compare(a.name, b.name))
    .map(({ n, name, pr, cities, ns }) => ({ n, name, site: pr >= 10, ns, cities: cities.sort((a, b) => b.r - a.r || coll.compare(a.l, b.l)).map((c) => c.l) }));
  const repCountries = new Set((C.reps || []).map((r) => r.country).filter(Boolean)).size;
  const clean = (it) => Object.fromEntries(Object.entries(it).filter(([k, v]) => k !== 'sf' && k !== 'cc' && v !== '' && !(Array.isArray(v) && !v.length)));
  return {
    mode,
    nodes: nodes.map((n) => ({ x: r1(n.x), y: r1(n.y), k: n.kind, t: n.t || 0, label: n.label, items: n.items.map(clean) })),
    arcs: arcs.map((a) => ({ a: idx.get(a.a), b: idx.get(a.b), t0: a.t0, dur: a.dur, s: a.s })),
    hq: idx.get(hq), regions, _countries: countries,
    stats: { sites: locs.length, cc: new Set(locs.map((l) => l.country)).size, reps: repCountries },
    L: {
      types: { ...t.lbl.locType, rep: t.map.legendRep }, site: N.site, rep: mode === 'home' ? N.rep : '', repHref: mode === 'home' ? ctx.hrefA('contact', {}, 'karte') : '', more: t.ui.more,
      alsoHere: N.alsoHere, close: t.ui.close, route: t.ui.route, count1: t.map.count1, countN: t.map.countN, none: t.ui.noResults,
    },
    // Rohdaten für die Liste (nur Unterseiten)
    _list: nodes.flatMap((n, ni) => n.items.map((it, ii) => ({ ni, ii, it, kind: n.kind }))),
  };
}

const kindCls = (k) => (k === 'hq' ? 'hq' : k === 'rep' ? 'rep' : k === 'story' ? 'story' : 'site');
function marksHTML(m) {
  return m.nodes.map((n, i) => {
    const label = n.items.map((it) => (it.k === 's' ? `${it.ca}: ${it.ti}` : `${m.L.types[it.k === 'l' ? it.ty : 'rep']} ${it.k === 'l' ? n.label : it.ti}, ${it.co}`)).join('; ');
    return `<button type="button" class="nm__mk nm__mk--${kindCls(n.k)}${n.items.length > 1 ? ' nm__mk--multi' : ''}" data-n="${i}" style="--x:${(n.x / 10).toFixed(2)}%;--y:${(n.y / 5.2).toFixed(2)}%;--d:${n.t}ms" aria-label="${esc(label)}"${i === m.hq ? '' : ' tabindex="-1"'}><i></i>${n.k !== 'rep' && n.k !== 'story' ? `<span class="nm__lbl" aria-hidden="true">${esc(n.label)}</span>` : ''}</button>`;
  }).join('');
}
function stageHTML(ctx, m, N) {
  const { t } = ctx;
  return `<div class="nm__stage" data-nm-stage role="region" aria-label="${esc(m.mode === 'locations' ? N.mapSites : N.map)}" aria-describedby="nm-help-${m.mode}">
    <div class="nm__frame" data-nm-frame>
      <img class="nm__img" src="${ctx.base}img/world-dots.svg" alt="" width="1000" height="520" loading="lazy" decoding="async">
      <canvas class="nm__cv" data-nm-base aria-hidden="true"></canvas>
      <canvas class="nm__cv nm__cv--fx" data-nm-fx aria-hidden="true"></canvas>
      <span class="nm__ret" data-nm-ret aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <div class="nm__hint2" data-nm-hint2 aria-hidden="true"><span>${esc(t.map.twoFinger)}</span></div>
      <div class="nm__zoom" data-nm-zoom hidden>
        <button type="button" data-nm-z="in" aria-label="${esc(t.map.zoomIn)}">${icon('plus')}</button>
        <button type="button" data-nm-z="out" aria-label="${esc(t.map.zoomOut)}">${icon('minus')}</button>
        <button type="button" data-nm-z="reset" aria-label="${esc(t.map.reset)}">${icon('reset')}</button>
      </div>
      <div class="nm__marks" role="group" aria-label="${esc(m.mode === 'locations' ? N.sites : m.mode === 'home' ? N.marksAll : N.marks)}" data-nm-marks>${marksHTML(m)}</div>
    </div>
    <div class="nm__card" data-nm-card hidden></div>
    <p class="vh" id="nm-help-${m.mode}">${esc(N.help)}</p>
  </div>`;
}
const modelJSON = (m) => JSON.stringify(Object.fromEntries(Object.entries(m).filter(([k]) => k[0] !== '_'))).replace(/</g, '\\u003c');
function regionsHTML(ctx, N) {
  const { t } = ctx;
  const regions = [['world', N.world], ['europe', t.lbl.region.europe], ['americas', t.lbl.region.americas], ['apac', t.lbl.region.apac], ['africa', t.lbl.region.africa]];
  return `<div class="nm__regions" role="group" aria-label="${esc(N.region)}">${regions.map(([k, l], i) => `<button type="button" class="nm__reg" data-nm-region="${k}" aria-pressed="${i === 0}">${esc(l)}</button>`).join('')}</div>`;
}
// Ebenen und Regionen. Breit stehen sie in der Leiste (der Rahmen ist dort display: contents); auf dem Telefon liegen sie
// als Blatt hinter dem Knopf „Ansicht“, damit über der Karte nur eine Zeile bleibt.
function viewHTML(ctx, N, mode, all = true, stories = false) {
  const id = `nm-view-${mode}`;
  return `<div class="nm__view" id="${id}" tabindex="-1" data-nm-view>
      <div class="nm__viewhead"><span aria-hidden="true">${esc(N.viewTitle)}</span><button type="button" class="nm__popx" aria-label="${esc(ctx.t.ui.close)}" data-nm-viewx>${icon('close')}</button></div>
      <p class="nm__viewlbl" aria-hidden="true">${esc(N.layers)}</p>
      ${layersHTML(N, all, stories)}
      <p class="nm__viewlbl" aria-hidden="true">${esc(N.region)}</p>
      ${regionsHTML(ctx, N)}
    </div>
    <button type="button" class="nm__viewbtn" aria-expanded="false" aria-controls="${id}" data-nm-viewbtn>${icon('layers')}<span>${esc(N.view)}</span></button>`;
}
function layersHTML(N, all = true, stories = false) {
  return `<div class="nm__layers" role="group" aria-label="${esc(N.layers)}">
      <button type="button" class="nm__tog" data-nm-layer="sites" aria-pressed="true"><i class="nm__key nm__key--site" aria-hidden="true"></i>${esc(N.sites)}</button>
      <button type="button" class="nm__tog" data-nm-layer="reps" aria-pressed="true"><i class="nm__key nm__key--rep" aria-hidden="true"></i>${esc(N.reps)}</button>
      ${stories ? `<button type="button" class="nm__tog" data-nm-layer="stories" aria-pressed="true"><i class="nm__key nm__key--story" aria-hidden="true"></i>${esc(N.stories)}</button>` : ''}
      ${all ? `<button type="button" class="nm__tog" data-nm-layer="net" aria-pressed="true"><i class="nm__key nm__key--net" aria-hidden="true"></i>${esc(N.net)}</button>` : ''}
    </div>`;
}

// Länderwahl: Knopf mit Aufklapper (Suchfeld und nach Art gruppierte Liste, wie das Muster „Listbox with grouped
// options“ der WAI-ARIA-Praxis); erst mit JavaScript sichtbar (die ganze Leiste ist es). Daneben das Kreuz zum Aufheben.
const normQ = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
function countryPick(ctx, m, N) {
  const id = `nm-pick-${m.mode}`;
  const opt = (c) => {
    const sub = c.site ? c.cities.slice(0, 2).join(', ') + (c.cities.length > 2 ? ` +${c.cities.length - 2}` : '') : '';
    return `<li class="nm__opt" role="option" id="${id}-o${c.n}" data-n="${c.n}" data-ns="${c.ns.join(' ')}" data-q="${esc(normQ([c.name, ...c.cities].join(' ')))}" aria-selected="false"><i class="nm__key nm__key--${c.site ? 'site' : 'rep'}" aria-hidden="true"></i><span>${esc(c.name)}</span>${sub ? `<small>${esc(sub)}</small>` : ''}</li>`;
  };
  const group = (k, label, list) => (list.length ? `<ul class="nm__optg" role="group" aria-labelledby="${id}-g${k}"><li class="nm__opth" role="presentation" id="${id}-g${k}">${esc(label)}</li>${list.map(opt).join('')}</ul>` : '');
  const all = m._countries;
  return `<div class="nm__pick" data-nm-pick>
      <button type="button" class="nm__pickbtn" aria-haspopup="dialog" aria-expanded="false" aria-controls="${id}" data-nm-pickbtn>${icon('pin')}<span class="nm__picklbl" data-nm-picklbl>${esc(N.countryPh)}</span>${icon('down')}</button>
      <button type="button" class="nm__pickx" aria-label="${esc(N.countryClear)}" data-nm-pickx hidden>${icon('close')}</button>
      <div class="nm__pop" id="${id}" role="dialog" aria-label="${esc(N.country)}" tabindex="-1" data-nm-pop hidden>
        <div class="nm__pophead"><span aria-hidden="true">${esc(N.country)}</span><button type="button" class="nm__popx" aria-label="${esc(ctx.t.ui.close)}" data-nm-popx>${icon('close')}</button></div>
        <div class="nm__popq">${icon('search')}<input type="text" role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="${id}-list" aria-label="${esc(N.country)}" placeholder="${esc(N.countrySearch)}" autocomplete="off" spellcheck="false" data-nm-pickq></div>
        <div class="nm__opts" id="${id}-list" role="listbox" aria-label="${esc(N.country)}" data-nm-opts>${group('s', N.pickSites, all.filter((c) => c.site))}${group('r', N.pickReps, all.filter((c) => !c.site))}</div>
        <p class="nm__nohit" data-nm-nohit hidden>${esc(ctx.t.ui.noResults)}</p>
      </div>
    </div>`;
}

// Startseite: dunkles Kapitel über die volle Breite, mit Kennzahlen und Länderwahl
export function netMapHome(ctx) {
  const { t } = ctx;
  const N = t.pages.home.net;
  const P = t.pages.home.plants;
  const m = netModel(ctx, { mode: 'home' });
  const st = m.stats;
  return `<section class="nm nm--home" data-nm data-nm-mode="home" aria-labelledby="nm-title">
  <div class="wrap nm__head">
    <div class="nm__copy" data-reveal="head">
      <h2 class="ch__title" id="nm-title">${esc(N.title)}</h2>
      <p class="ch__lead">${esc(tpl(N.lead, { sites: st.sites, cc: st.cc, reps: st.reps }))}</p>
    </div>
    <dl class="nm__stats" data-reveal="facts">
      <div><dt>${esc(N.sites)}</dt><dd><strong data-count>${st.sites}</strong></dd></div>
      <div><dt>${esc(N.siteCountries)}</dt><dd><strong data-count>${st.cc}</strong></dd></div>
      <div><dt>${esc(N.repCountries)}</dt><dd><strong data-count>${st.reps}</strong></dd></div>
    </dl>
  </div>
  <div class="wrap nm__wrap">
    <div class="nm__tile">
      <div class="nm__bar nm__bar--sheet" data-nm-bar hidden>
        ${viewHTML(ctx, N, 'home', true, true)}
        ${countryPick(ctx, m, N)}
      </div>
      ${stageHTML(ctx, m, N)}
    </div>
  </div>
  <div class="wrap nm__foot">
    <p class="nm__legend" data-nm-legend><span><i class="nm__key nm__key--site" aria-hidden="true"></i>${esc(N.legendSite)}</span><span><i class="nm__key nm__key--rep" aria-hidden="true"></i>${esc(N.legendRep)}</span></p>
    <p class="cluster"><a class="btn btn--light" href="${ctx.href('locations')}">${esc(P.cta)}</a><a class="link link--light" href="${ctx.hrefA('contact', {}, 'karte')}">${esc(t.pages.home.worldCta2)}</a></p>
  </div>
  <script type="application/json" data-nm-model>${modelJSON(m)}</script>
</section>`;
}

// Standorte (nur RITZ-Standorte) und Kontakt (alle, mit Suche): Karte und Liste nebeneinander, auf schmalen Bildschirmen
// untereinander. Die Liste ist auch ohne JavaScript vollständig.
export function netMapBlock(ctx, { mode = 'contact' } = {}) {
  const { t, lang } = ctx;
  const N = t.pages.home.net;
  const m = netModel(ctx, { mode });
  const coll = new Intl.Collator(lang);
  const entries = m._list.slice().sort((a, b) => (a.it.k === b.it.k ? 0 : a.it.k === 'l' ? -1 : 1)
    || (a.it.k === 'l' ? TYPE_ORDER[a.it.ty] - TYPE_ORDER[b.it.ty] || coll.compare(m.nodes[a.ni].label, m.nodes[b.ni].label) : coll.compare(a.it.co, b.it.co) || coll.compare(a.it.ti, b.it.ti)));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const list = entries.map(({ ni, ii, it }) => {
    const title = it.k === 'l' ? m.nodes[ni].label : it.ti;
    const kind = m.L.types[it.k === 'l' ? it.ty : 'rep'];
    const q = norm([title, it.ti, it.su, it.co, ...(it.ad || [])].join(' '));
    return `<li><button type="button" class="nm__entry nm__entry--${it.k === 'l' ? 'site' : 'rep'}" data-n="${ni}" data-i="${ii}" data-q="${esc(q)}"><span class="nm__ek">${esc(kind)}</span><b>${esc(title)}</b><span class="nm__es">${esc(it.co)}</span></button></li>`;
  }).join('');
  const contact = mode === 'contact';
  return `<div class="nm nm--panel nm--${mode}" data-nm data-nm-mode="${mode}">
  <div class="nm__bar${contact ? ' nm__bar--sheet' : ''}" data-nm-bar hidden>
    ${contact ? viewHTML(ctx, N, mode, false) : regionsHTML(ctx, N)}
  </div>
  <div class="nm__body">
    ${stageHTML(ctx, m, N)}
    <div class="nm__panel" data-nm-panel>
      ${contact ? `<div class="nm__search"><label class="vh" for="nm-q-${mode}">${esc(t.map.filterPh)}</label>${icon('search')}<input id="nm-q-${mode}" type="search" placeholder="${esc(t.map.filterPh)}" autocomplete="off" data-nm-q></div>` : ''}
      <p class="nm__count" data-nm-count aria-live="polite">${esc(tpl(entries.length === 1 ? m.L.count1 : m.L.countN, { n: entries.length }))}</p>
      <ul class="nm__list" data-nm-list aria-label="${esc(contact ? N.marks : N.sites)}">${list}</ul>
    </div>
  </div>
  <script type="application/json" data-nm-model>${modelJSON(m)}</script>
</div>`;
}
