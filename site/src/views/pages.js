// Inhaltsseiten: Anwendungen, Unternehmen, Standorte, Qualität, Verantwortung, Referenzen, Downloads,
// Kontakt, Karriere, News, Rechtliches, Suche, 404
import { esc, icon, imgTag, tpl, fmtDate, fmtNum, phoneTxt } from '../lib/util.js';
import { SECTORS, AREAS } from '../lib/routes.js';
import { phead, sectionHead, personCard, docRow, ctaBand, ticks, crumbs, shorten, langDocs, docIn } from './layout.js';
import { SECTOR_IMG, newsCard } from './home.js';
import { docVisible, dedupeCopies } from '../lib/doclang.js';
import { SECTOR_LINKS, HISTORY_IMG, personImg, REFERENCE_IMG, REFERENCE_DOC, REFERENCE_NEWS, FEATURED_DOCS, FEATURED_DOCS_EN, LOC_IMG } from '../lib/catalog.js';
import { filterProducts, parseQuery, productCard, imgFit } from '../lib/product.js';
import { projectLL, locAddress } from '../lib/geo.js';
import { netMapBlock } from './netmap.js';
import { newsCover } from './newscover.js';
import { sortDocs, peopleFor, countryOptions } from './products.js';

const docByFile = (ctx, f) => ctx.data.docs.find((d) => d.file === f);
// Downloadcenter: alle Dokumente, die die Sprachfassung zeigt (Hauptseite je Sprache, Produktfinder überall), Kopien einmal
export const dlDocs = (ctx) => dedupeCopies(ctx.data.docs.filter((d) => docVisible(d, ctx.lang)));
// Dokumente in der Sprache des Nutzers bevorzugen; andere Sprache nur, wenn es für den Typ keine Alternative gibt
// Paare (gleiche Datei in DE/EN) erkennen und nur die passende Sprache zeigen; Einzelstücke bleiben
const newsByPrefix = (ctx, pre) => ctx.data.news.find((n) => n.id.startsWith(pre));

// ---------------- Anwendungen ----------------
export function sectorsPage(ctx) {
  const { t, href } = ctx;
  const S = t.pages.sectors;
  return `${phead(ctx, { title: S.h1, lead: S.lead, image: 'mimg/4-Konen-Adapter-in-Anlage-1.webp', figure: true, crumbs: [[S.title]] })}
<section class="section section--tight"><div class="wrap">
  <div class="scards">${SECTORS.map((s) => {
    const it = S.items[s];
    return `<a class="scard" href="${href('sector', { sector: s })}"><span class="scard__img">${imgTag(ctx, SECTOR_IMG[s], { alt: '', sizes: '(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw', max: 960 })}</span><span class="scard__body"><strong>${esc(it.title)}</strong><span>${esc(it.short)}</span></span></a>`;
  }).join('')}
    <div class="scard scard--cta"><h2 class="h3">${esc(t.pages.home.ctaTitle)}</h2><p>${esc(t.pages.home.ctaText)}</p><div class="cluster"><a class="btn btn--light" href="${href('inquiry')}">${esc(t.pages.home.ctaBtn)}</a><a class="btn btn--ghost-light" href="${href('contact')}">${esc(t.nav.contact)}</a></div></div>
  </div>
</div></section>`;
}

export function sectorPage(ctx, sector) {
  const { t, href } = ctx;
  const S = t.pages.sectors;
  const it = S.items[sector];
  const L = SECTOR_LINKS[sector];
  const docsShown = sortDocs(ctx, langDocs(ctx, L.docs.map((f) => docByFile(ctx, f)).filter(Boolean)));
  const news = L.news.map((p) => newsByPrefix(ctx, p)).filter(Boolean);
  const people = [...new Map(L.areas.flatMap((a) => peopleFor(ctx, a)).filter((p) => p.email).map((p) => [p.id, p])).values()].slice(0, 4);
  const groups = it.groups.map(([label, qs]) => {
    const q = parseQuery(qs);
    const n = filterProducts(ctx.data.products, q, t).length;
    return { label, qs, n, q };
  });
  // Erste Gruppe direkt als Produktkarten zeigen
  const g0 = groups[0];
  const top = g0 ? filterProducts(ctx.data.products, g0.q, t).slice(0, 8) : [];
  const finderQ = (g) => Object.fromEntries(new URLSearchParams(g.qs));
  return `${phead(ctx, { title: it.title, lead: it.lead, image: SECTOR_IMG[sector], figure: true, crumbs: [[S.title, href('sectors')], [it.title]] })}
<section class="section">
  <div class="wrap split">
    <div class="stack" style="--s:1rem"><h2 class="h3">${esc(S.challenges)}</h2>${ticks(it.challenges)}</div>
    <div class="prose">${it.text.map((x) => `<p>${esc(x)}</p>`).join('')}</div>
  </div>
</section>
<section class="section section--porcelain">
  <div class="wrap">
    ${sectionHead(S.solutions)}
    <div class="sgroups">${groups.map((g) => `<a class="sgroup" href="${href('finder', {}, finderQ(g))}"><strong>${esc(g.label)}</strong><span>${esc(ctx.plural(g.n, t.ui.productCount))}</span>${icon('right')}</a>`).join('')}</div>
    ${top.length ? `<h3 class="h4 mt">${esc(g0.label)}</h3><div class="pgrid pgrid--sector">${top.map((p) => productCard(ctx, p)).join('')}</div>
    ${g0.n > top.length ? `<p class="mt"><a class="btn btn--ghost" href="${href('finder', {}, finderQ(g0))}">${esc(S.toFinder)} (${g0.n})</a></p>` : ''}` : ''}
  </div>
</section>
${news.length ? `<section class="section"><div class="wrap">${sectionHead(S.proof)}<div class="news-grid">${news.map((n) => newsCard(ctx, n)).join('')}</div></div></section>` : ''}
${docsShown.length ? `<section class="section section--tight"><div class="wrap">${sectionHead(S.docs)}<div class="docs docs--cols">${docsShown.map((d) => docRow(ctx, d)).join('')}</div></div></section>` : ''}
${people.length ? `<section class="section section--porcelain"><div class="wrap">${sectionHead(t.ui.contactPersons)}<div class="people">${people.map((p) => personCard(ctx, p)).join('')}</div></div></section>` : ''}`;
}

// ---------------- Unternehmen ----------------
// Firmenstruktur: Stiftung → Gruppe → Gesellschaften (Namen wie im Organigramm der bisherigen Website), darunter die Marken
const ORG = [
  { cc: 'AT', name: 'RITZ Messwandler GmbH', sites: ['marchtrenk'], sub: { cc: 'HU', name: 'RITZ Mérőtranszformátor Kft.', sites: ['kecskemet'] } },
  { cc: 'DE', name: 'RITZ Instrument Transformers GmbH', sites: ['hamburg', 'kirchaich', 'wirges', 'dresden'] },
  { cc: 'CN', name: 'RITZ Instrument Transformers Shanghai Co., Ltd.', sites: ['shanghai'] },
  { cc: 'CN', name: 'RITZ Instrument Transformers Shanghai Co., Ltd. Sales APAC', sites: [] },
  { cc: 'US', name: 'RITZ Instrument Transformers Inc.', sites: ['lavonia', 'waynesboro'] },
];
const ORG_SITE = { kirchaich: 'Kirchaich', dresden: 'Dresden', lavonia: 'Hartwell', waynesboro: 'Waynesboro' };
const BRANDS = [['ritz', '1945'], ['wtw', '1989'], ['tur', '1991'], ['mwb', '1999']];
function groupStructure(ctx) {
  const { t, lang } = ctx;
  const C = t.pages.company;
  let region = (c) => c;
  try { const dn = new Intl.DisplayNames([lang], { type: 'region' }); region = (c) => dn.of(c) || c; } catch (e) { /* Kürzel */ }
  const locs = Object.fromEntries(ctx.data.contacts.locations.map((l) => [l.id, l]));
  const card = (o) => `<div class="org__card">
      <span class="org__cc"><b>${esc(o.cc)}</b>${esc(region(o.cc))}</span>
      <strong class="org__name">${esc(o.name)}</strong>
      ${o.sites.length ? `<ul class="org__sites" aria-label="${esc(C.orgSites)}">${o.sites.filter((id) => locs[id]).map((id) => `<li><a href="${ctx.hrefA('locations', {}, id)}">${esc(ORG_SITE[id] || locs[id].city.replace(/\s*\(.*\)$/, ''))}</a></li>`).join('')}</ul>` : ''}
    </div>`;
  const group = ctx.img['misc/ritz-group'] ? imgTag(ctx, 'misc/ritz-group', { alt: '', sizes: '96px', max: 320 }) : '';
  const hist = (y) => C.history.find(([yy]) => yy === y);
  return `<section class="section" aria-labelledby="org-title">
  <div class="wrap">
    ${sectionHead(C.structureTitle, C.structureText, '', { id: 'org-title' })}
    <div class="org" data-reveal="org" data-org>
      <div class="org__node org__node--foundation"><span class="org__mark" aria-hidden="true"></span><strong>${esc(C.foundationTitle)}</strong><span>${esc(C.orgOwner)}</span></div>
      <span class="org__stem" aria-hidden="true"></span>
      <div class="org__node org__node--group"><span class="org__logo" aria-hidden="true">${group}</span><strong>${esc(C.orgGroup)}</strong><span>${esc(C.orgHq)}</span></div>
      <span class="org__stem" aria-hidden="true"></span>
      <ul class="org__cos">${ORG.map((o) => `<li class="org__co">${card(o)}${o.sub ? `<div class="org__sub">${card(o.sub)}</div>` : ''}</li>`).join('')}</ul>
    </div>
    <h3 class="org__brands-title">${esc(C.brandsTitle)}</h3>
    <ul class="brands">${BRANDS.map(([k, y]) => {
      const h = hist(y);
      const txt = h ? h[2].split(/;\s*/)[0].replace(/[.]?$/, '.') : '';
      return `<li class="brand"><span class="brand__logo">${ctx.img['misc/brand-' + k] ? imgTag(ctx, 'misc/brand-' + k, { alt: k === 'tur' ? 'TuR' : k.toUpperCase(), sizes: '200px', max: 640 }) : ''}</span><span class="brand__year">${esc(tpl(C.since, { y }))}</span><span class="brand__text">${esc(txt)}</span></li>`;
    }).join('')}</ul>
  </div>
</section>`;
}

// Geschichte als Zeitreise: chronologisch, links (Desktop) eine mitlaufende Bühne mit rollender Jahreszahl, Bild und
// Zeitskala zum Springen, rechts die Etappen; die Etappe in der Bildschirmmitte ist aktiv. Ohne JavaScript eine schlichte
// Liste mit Bildern (Bühne nur mit .is-live sichtbar); alle Inhalte stehen in den Etappen, die Bühne ist Schmuck.
function historyJourney(ctx) {
  const { t } = ctx;
  const C = t.pages.company;
  const items = C.history.slice().sort((a, b) => +a[0] - +b[0]);
  const first = +items[0][0], last = +items[items.length - 1][0];
  const imgsOf = (y) => (HISTORY_IMG[y] || []).filter((k) => ctx.img[k]);
  const reel = '<span class="hx__reel">' + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => `<span>${d}</span>`).join('') + '</span>';
  const y0 = String(items[0][0]);
  const pos = (i) => ((i / (items.length - 1)) * 100).toFixed(3);
  return `<section class="hx" id="geschichte" aria-labelledby="hx-title" data-hx>
  <div class="wrap">
    <div class="hx__head" data-reveal="head"><h2 class="hx__title" id="hx-title">${esc(C.historyTitle)}</h2><p class="hx__lead">${esc(C.historyLead)}</p></div>
    <div class="hx__grid">
      <div class="hx__stage">
        <div class="hx__top">
          <p class="hx__year" aria-hidden="true" data-hx-year>${[...y0].map((c) => `<span class="hx__dig" style="--d:${c}">${reel}</span>`).join('')}</p>
          <p class="hx__count" aria-hidden="true"><b data-hx-n>01</b><span>/ ${String(items.length).padStart(2, '0')}</span></p>
        </div>
        <div class="hx__frame" aria-hidden="true">
          ${items.map(([year, title], i) => { const [k, k2] = imgsOf(year); return `<figure class="hx__shot${i ? '' : ' is-on'}${k ? '' : ' hx__shot--none'}" data-hx-shot="${i}">${k ? imgTag(ctx, k, { alt: '', sizes: '(max-width: 1000px) 0px, 46vw', max: 1280, eager: false }) + (k2 ? `<span class="hx__pip">${imgTag(ctx, k2, { alt: '', sizes: '(max-width: 1000px) 0px, 17vw', max: 640, eager: false })}</span>` : '') + (year === '1986' ? '<span class="hx__credit">Illustration ©UKE</span>' : '') : `<span class="hx__ghost">${esc(year)}</span><span class="hx__ghost-t">${esc(title)}</span>`}</figure>`; }).join('')}
          <span class="hx__corner hx__corner--tl"></span><span class="hx__corner hx__corner--tr"></span><span class="hx__corner hx__corner--bl"></span><span class="hx__corner hx__corner--br"></span>
          <span class="hx__scan"></span>
        </div>
        <nav class="hx__ruler" aria-label="${esc(C.hxNav)}" data-hx-ruler>
          <button class="hx__step-btn hx__step-btn--prev" type="button" data-hx-prev aria-label="${esc(t.ui.back)}">${icon('arrow')}</button>
          <div class="hx__scale">
            <span class="hx__track"></span><span class="hx__fill"></span><span class="hx__needle"><span data-hx-label>${esc(y0)}</span></span>
            ${items.map(([year, title], i) => `<button class="hx__mark" type="button" style="--x:${pos(i)}%" data-hx-go="${i}" aria-label="${esc(year)} – ${esc(title)}"${i ? '' : ' aria-current="step"'}><i></i><span class="hx__tip">${esc(year)}</span></button>`).join('')}
            <span class="hx__end hx__end--a">${first}</span><span class="hx__end hx__end--b">${last}</span>
          </div>
          <button class="hx__step-btn hx__step-btn--next" type="button" data-hx-next aria-label="${esc(t.ui.next)}">${icon('arrow')}</button>
        </nav>
      </div>
      <ol class="hx__steps">
        ${items.map(([year, title, text], i) => { const ks = imgsOf(year); return `<li class="hx__step${i ? '' : ' is-on'}" id="g-${esc(year)}" data-hx-step="${i}" data-year="${esc(year)}">
          <span class="hx__y">${esc(year)}</span>
          <h3>${esc(title)}</h3>
          <p>${esc(text)}</p>
          ${ks.length ? `<figure class="hx__inline${ks.length > 1 ? ' hx__inline--duo' : ''}">${ks.slice(0, 2).map((k) => imgTag(ctx, k, { alt: '', sizes: ks.length > 1 ? '(max-width: 1000px) 46vw, 0px' : '(max-width: 1000px) 92vw, 0px', max: 960 })).join('')}${year === '1986' ? '<figcaption>Illustration ©UKE</figcaption>' : ''}</figure>` : ''}
        </li>`; }).join('')}
      </ol>
    </div>
  </div>
</section>`;
}

export function companyPage(ctx) {
  const { t, href } = ctx;
  const C = t.pages.company;
  // Porträtkarte: Foto immer in Farbe, darunter das Namensschild mit Name und Funktion (wörtlich wie auf der bisherigen
  // Website; roleLang nennt ihre Sprache, z. B. Englisch auf der deutschen Seite).
  // Alle Porträts einer Gruppe sind gleich groß. Beim Zeigen zieht sich ein roter Fokusrahmen um das Foto (CSS).
  const rl = C.roleLang || '';
  const mgr = (name, role, { board = false, sizes = '(max-width: 900px) 50vw, 25vw' } = {}) => {
    const k = personImg(name, board);
    return `<figure class="mgr"><div class="mgr__img">${k && ctx.img[k] ? imgTag(ctx, k, { alt: name, sizes, max: 1280 }) : ''}</div><figcaption><b>${esc(name)}</b>${role ? `<span${rl ? ` lang="${rl}"` : ''}>${esc(role)}</span>` : ''}</figcaption></figure>`;
  };
  return `${phead(ctx, { title: C.h1, lead: C.lead, image: 'mimg/ritz_header-unternehmen.webp', crumbs: [[C.title]] })}
<section class="section">
  <div class="wrap split">
    <div class="media-cover media-cover--tall">${imgTag(ctx, 'mimg/2022__07__unternehmen_historie_1.webp', { alt: 'RITZ', sizes: '(max-width: 900px) 100vw, 40vw', max: 960 })}</div>
    <div class="stack" style="--s:1.2rem">
      <h2>${esc(C.visionTitle)}</h2>
      <p class="pull">${esc(C.vision)}</p>
      ${C.visionText.map((x) => `<p class="muted">${esc(x)}</p>`).join('')}
    </div>
  </div>
</section>
<section class="section section--resin">
  <div class="wrap">${sectionHead(C.factsTitle)}<div class="facts" data-reveal="facts">${C.facts.map(([a, b]) => `<div class="fact"><strong data-count>${esc(a)}</strong><span>${esc(b)}</span></div>`).join('')}</div></div>
</section>
${historyJourney(ctx)}
<section class="section section--porcelain" id="management">
  <div class="wrap">
    ${sectionHead(C.mgmtTitle)}
    <div class="mgmt" data-reveal="team">${C.mgmt.map(([n, r]) => mgr(n, r)).join('')}</div>
    <h2 class="h3 mt-xl mb">${esc(C.boardTitle)}</h2>
    <div class="mgmt mgmt--board" data-reveal="team">${C.board.map(([n, r]) => mgr(n, r, { board: true, sizes: '(max-width: 600px) 50vw, (max-width: 1239px) 25vw, 15vw' })).join('')}</div>
  </div>
</section>
${groupStructure(ctx)}
<section class="section section--porcelain" id="stiftung">
  <div class="wrap split split--even foundation">
    <div class="stack" style="--s:1rem"><h2>${esc(C.foundationTitle)}</h2><p class="lead">${esc(C.foundationText)}</p></div>
    <figure class="figure">${imgTag(ctx, 'mimg/image3.webp', { alt: '', sizes: '(max-width: 900px) 100vw, 50vw', max: 960 })}<figcaption>Illustration ©UKE</figcaption></figure>
  </div>
</section>
<section class="section"><div class="wrap">${sectionHead(C.linksTitle)}
  <div class="grid g-4">${[['locations', t.nav.locations, t.pages.locations.lead], ['quality', t.nav.quality, t.pages.quality.lead], ['responsibility', t.nav.responsibility, t.pages.responsibility.lead], ['references', t.nav.references, t.pages.references.lead]].map(([id, a, b]) => `<a class="mega__card mega__card--page" href="${href(id)}"><strong>${esc(a)}</strong><span>${esc(shorten(b, 120))}</span></a>`).join('')}</div>
</div></section>`;
}

// ---------------- Standorte ----------------
export function locationsPage(ctx) {
  const { t, href } = ctx;
  const L = t.pages.locations;
  const locs = ctx.data.contacts.locations;
  return `${phead(ctx, { title: L.h1, lead: L.lead, image: 'mimg/Luftbild_Kirchaich_2014_klein.webp', crumbs: [[t.nav.company, href('company')], [L.title]] })}
<section class="section section--tight" id="karte">
  <div class="wrap">${sectionHead(L.mapTitle)}${netMapBlock(ctx, { mode: 'locations' })}</div>
</section>
<section class="section">
  <div class="wrap">
    ${sectionHead(L.listTitle)}
    <div class="locs">${locs.map((l) => locCard(ctx, l)).join('')}</div>
  </div>
</section>`;
}

// Kartenausschnitt als Standortbild: eigener Standort rot, übrige RITZ-Standorte grau
function locMap(ctx, l) {
  const wm = ctx.data.worldmeta;
  if (!l.lat || !wm) return '';
  const [x, y] = projectLL(wm, l.lng, l.lat);
  const w = 170, h = (w * 9) / 16;
  const others = ctx.data.contacts.locations.filter((o) => o.lat && o.id !== l.id).map((o) => {
    const [ox, oy] = projectLL(wm, o.lng, o.lat);
    return `<circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="1.7" class="loc__o"/>`;
  }).join('');
  return `<svg class="loc__map" viewBox="${(x - w / 2).toFixed(1)} ${(y - h / 2).toFixed(1)} ${w} ${h.toFixed(1)}" aria-hidden="true" focusable="false"><use class="loc__land" href="${ctx.base}img/world-land.svg#land"/>${others}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.5" class="loc__halo"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.1" class="loc__dot"/></svg>`;
}

export function locCard(ctx, l) {
  const { t, lang } = ctx;
  const img = LOC_IMG[l.id];
  const fn = (l.functions && (l.functions[lang] || l.functions.en)) || [];
  const addr = locAddress(l, lang);
  return `<article class="loc" id="${l.id}">
  <div class="loc__img">${img && ctx.img[img] ? imgTag(ctx, img, { alt: l.city, sizes: '(max-width: 700px) 100vw, 33vw', max: 1600 }) : locMap(ctx, l)}</div>
  <div class="loc__body">
    <span class="loc__type loc__type--${l.type}">${esc(t.lbl.locType[l.type] || '')}</span>
    <h3>${esc(l.city)}</h3>
    <p class="loc__co">${esc(l.company)}</p>
    <address>${addr.map(esc).join('<br>')}</address>
    <div class="lines">
      ${l.phone ? `<a href="tel:${esc(l.phone.replace(/[^\d+]/g, ''))}">${icon('phone')}<span>${phoneTxt(l.phone)}</span></a>` : ''}
      ${l.email ? `<a href="mailto:${esc(l.email)}">${icon('mail')}<span>${esc(l.email)}</span></a>` : ''}
      ${l.lat ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}" target="_blank" rel="noopener">${icon('route')}<span>${esc(t.ui.route)}</span></a>` : ''}
    </div>
    ${l.employees ? `<p class="small muted">${esc(fmtNum(l.employees, lang))} ${esc(t.ui.employees)}</p>` : ''}
    ${fn.length ? `<details class="loc__fn"><summary>${esc(t.ui.functions)}${icon('down')}</summary>${ticks(fn)}</details>` : ''}
  </div>
</article>`;
}

// ---------------- Qualität ----------------
// eigene Datei (quality.js)
export { qualityPage } from './quality.js';

// ---------------- Verantwortung ----------------
// eigene Datei (responsibility.js)
export { responsibilityPage } from './responsibility.js';

// ---------------- Referenzen ----------------
export function referencesPage(ctx) {
  const { t, href } = ctx;
  const R = t.pages.references;
  return `${phead(ctx, { title: R.h1, lead: R.lead, image: 'mimg/JKI0984-2-2048x1366.webp', figure: true, crumbs: [[t.nav.company, href('company')], [R.title]] })}
<section class="section section--tight"><div class="wrap stack" style="--s:clamp(32px,5vw,64px)">
  ${R.items.map(([who, what, text], i) => {
    const doc = REFERENCE_DOC[i] && docIn(ctx, docByFile(ctx, REFERENCE_DOC[i]));
    const n = REFERENCE_NEWS[i] && newsByPrefix(ctx, REFERENCE_NEWS[i]);
    return `<article class="ref${i % 2 ? ' ref--flip' : ''}">
      <div class="ref__img">${ctx.img[REFERENCE_IMG[i]] ? imgTag(ctx, REFERENCE_IMG[i], { alt: '', sizes: '(max-width: 900px) 100vw, 40vw', max: 960, cls: imgFit(ctx, REFERENCE_IMG[i]), lowres: 500 }) : ''}</div>
      <div class="ref__body stack" style="--s:.8rem"><span class="area__kv">${esc(who)}</span><h2 class="h3">${esc(what)}</h2><p>${esc(text)}</p>
        <div class="cluster">${doc ? `<a class="btn btn--ghost btn--small" ${ctx.docAttrs(doc)}>${ctx.docHref(doc) ? `${icon('download')}PDF` : `${icon('mail')}${esc(t.downloads.req.doc)}`}</a>` : ''}${n ? `<a class="link" href="${href('article', { slug: ctx.newsSlug(n) })}">${esc(t.ui.readArticle)}</a>` : ''}</div>
      </div>
    </article>`;
  }).join('')}
  <p class="lead">${esc(R.more)}</p>
</div></section>
<section class="section section--tight"><div class="wrap">${ctaBand(ctx, t.pages.home.ctaTitle, t.pages.home.ctaText, t.nav.contact, href('contact'))}</div></section>`;
}

// ---------------- Downloads ----------------
export function downloadsPage(ctx) {
  const { t, href } = ctx;
  const D = t.downloads;
  const featured = langDocs(ctx, (ctx.dl === 'de' ? FEATURED_DOCS : FEATURED_DOCS_EN).map((f) => docByFile(ctx, f)).filter(Boolean));
  const types = Object.keys(t.lbl.docType);
  const counts = {};
  for (const d of dlDocs(ctx)) counts[d.type] = (counts[d.type] || 0) + 1;
  return `${phead(ctx, { title: D.title, lead: D.lead, image: 'mimg/JKI1013-2048x1366.webp', figure: true, crumbs: [[D.title]], cls: 'phead--compact' })}
<section class="section section--tight">
  <div class="wrap dl" data-downloads>
    <aside class="dl__filters">
      <div class="finder__search">${icon('search')}<label class="vh" for="dl-q">${esc(D.searchPh)}</label><input class="input" id="dl-q" type="search" placeholder="${esc(D.searchPh)}" data-dl-q></div>
      <div class="field"><label for="dl-type">${esc(D.type)}</label><select class="select" id="dl-type" data-dl-type><option value="">${esc(t.ui.all)}</option>${types.filter((k) => counts[k]).map((k) => `<option value="${k}">${esc(t.lbl.docType[k])} (${counts[k]})</option>`).join('')}</select></div>
      <div class="field"><label for="dl-area">${esc(D.area)}</label><select class="select" id="dl-area" data-dl-area><option value="">${esc(t.ui.all)}</option>${AREAS.map((a) => `<option value="${a}">${esc(t.lbl.area[a])}</option>`).join('')}</select></div>
      <div class="field"><label for="dl-lang">${esc(D.language)}</label><select class="select" id="dl-lang" data-dl-lang><option value="">${esc(t.ui.all)}</option><option value="de">${esc(t.ui.lang_de)}</option><option value="en">${esc(t.ui.lang_en)}</option><option value="de+en">${esc(t.ui.lang_deen)}</option><option value="fr">${esc(t.ui.lang_fr)}</option><option value="es">${esc(t.ui.lang_es)}</option><option value="hu">${esc(t.ui.lang_hu)}</option></select></div>
      <p class="small faint">${esc(D.note)}</p>
    </aside>
    <div>
      <div data-dl-featured>${sectionHead(D.featured, '', '', { level: 2 })}<div class="docs docs--cols">${featured.map((d) => docRow(ctx, d)).join('')}</div></div>
      <div class="finder__bar"><p class="finder__count" aria-live="polite"><b data-dl-count>${dlDocs(ctx).length}</b> ${esc(D.count)}</p></div>
      <div data-dl-results><div class="dl__groups">${types.filter((k) => counts[k]).map((k) => `<a class="dlcat" href="${href('downloads', {}, { type: k })}" data-dl-cat="${k}"><strong>${esc(t.lbl.docType[k])}</strong><span>${esc(ctx.plural(counts[k], t.ui.docCount))}</span></a>`).join('')}</div></div>
    </div>
  </div>
</section>`;
}

// ---------------- Kontakt ----------------
export function contactPage(ctx) {
  const { t, href } = ctx;
  const C = t.pages.contact;
  const CF = t.contactFinder;
  const people = ctx.data.contacts.people.filter((p) => !p.areas.includes('karriere'));
  const byArea = AREAS.map((a) => [a, people.filter((p) => p.areas.includes(a))]).filter(([, l]) => l.length);
  return `${phead(ctx, { title: C.title, h1: C.h1, lead: C.lead, image: 'mimg/JKI1069-2048x1366.webp', figure: true, crumbs: [[C.title]] })}
<section class="section section--tight">
  <div class="wrap split">
    <div class="stack" style="--s:1rem">
      <h2 class="h3">${esc(C.hqTitle)}</h2>
      <address class="addr-card">${C.hq.map(esc).join('<br>')}</address>
      <div class="lines lines--big">
        <a href="tel:+4940511230">${icon('phone')}<span>${phoneTxt(C.hqPhone)}</span></a>
        <span class="line-mail"><a href="mailto:${esc(C.hqMail)}">${icon('mail')}<span>${esc(C.hqMail)}</span></a><button class="copy" type="button" data-copy="${esc(C.hqMail)}" aria-label="${esc(t.ui.copy)}">${icon('copy', 'width="15" height="15"')}</button></span>
        <a href="https://www.google.com/maps/dir/?api=1&destination=53.5753,10.0782" target="_blank" rel="noopener">${icon('route')}<span>${esc(t.ui.route)}</span></a>
      </div>
    </div>
    <div class="cfind-wrap" data-contact-finder>
      <h2 class="h3">${esc(CF.title)}</h2><p class="muted">${esc(CF.lead)}</p>
      <div class="cfind">
        <div class="field"><label for="cf-area">${esc(CF.area)}</label><select class="select" id="cf-area" data-cf-area><option value="">${esc(CF.any)}</option>${AREAS.map((a) => `<option value="${a}">${esc(t.lbl.area[a])}</option>`).join('')}</select></div>
        <div class="field"><label for="cf-country">${esc(CF.country)}</label><select class="select" id="cf-country" data-cf-country><option value="">${esc(CF.any)}</option>${countryOptions(ctx)}</select></div>
      </div>
      <div data-cf-result aria-live="polite"></div>
    </div>
  </div>
</section>
<section class="section section--porcelain">
  <div class="wrap">
    ${sectionHead(C.peopleTitle)}
    ${byArea.map(([a, list]) => `<div class="pgroup"><h3 class="h4"><a href="${href('area', { area: a })}">${esc(t.lbl.area[a])}</a></h3><div class="people">${list.map((p) => personCard(ctx, p)).join('')}</div></div>`).join('')}
  </div>
</section>
<section class="section" id="karte">
  <div class="wrap">${sectionHead(C.mapTitle)}${netMapBlock(ctx, { mode: 'contact' })}</div>
</section>
<section class="section section--tight" id="vertretungen-de">
  <div class="wrap">${sectionHead(C.repsDeTitle)}
    <div class="people">${ctx.data.contacts.repsDE.map((r) => `<article class="person"><h3>${esc(r.company)}</h3>${r.address?.length ? `<address class="addr">${r.address.map(esc).join('<br>')}</address>` : ''}<div class="lines">${r.phone ? `<a href="tel:${esc(r.phone.replace(/[^\d+]/g, ''))}">${icon('phone')}<span>${phoneTxt(r.phone)}</span></a>` : ''}${r.email ? `<a href="mailto:${esc(r.email)}">${icon('mail')}<span>${esc(r.email)}</span></a>` : ''}</div></article>`).join('')}</div>
  </div>
</section>
<section class="section section--porcelain">
  <div class="wrap split">
    <div class="stack" style="--s:1rem"><h2>${esc(C.formTitle)}</h2><p class="lead">${esc(C.formLead)}</p></div>
    <form class="basket__form basket__form--static" data-contact-form novalidate>
      ${ctx.mode === 'spa' ? `<p class="notice small">${esc(t.inquiry.previewNote)}</p>` : ''}
      <div class="form-grid">
        <div class="field full"><label for="c-topic">${esc(C.topic)}</label><select class="select" id="c-topic" name="topic">${C.topics.map((x) => `<option>${esc(x)}</option>`).join('')}</select></div>
        <div class="field"><label for="c-name">${esc(t.inquiry.name)} *</label><input class="input" type="text" id="c-name" name="name" required autocomplete="name"></div>
        <div class="field"><label for="c-company">${esc(t.inquiry.company)}</label><input class="input" type="text" id="c-company" name="company" autocomplete="organization"></div>
        <div class="field"><label for="c-email">${esc(t.inquiry.email)} *</label><input class="input" id="c-email" name="email" type="email" required autocomplete="email"></div>
        <div class="field"><label for="c-phone">${esc(t.inquiry.phone)}</label><input class="input" id="c-phone" name="phone" type="tel" autocomplete="tel"></div>
        <div class="field full"><label for="c-msg">${esc(t.inquiry.message)} *</label><textarea class="textarea" id="c-msg" name="message" required></textarea></div>
        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="check full"><input type="checkbox" name="privacy" required><span>${tpl(esc(t.inquiry.privacy), { link: `<a href="${href('privacy')}" target="_blank">${esc(t.inquiry.privacyLink)}</a>` })}</span></label>
      </div>
      <div class="err" data-form-error role="alert" hidden></div>
      <button class="btn btn--red" type="submit">${esc(t.inquiry.submit)}</button>
      <div data-form-success hidden></div>
    </form>
  </div>
</section>`;
}

// ---------------- Karriere ----------------
// Hauptseite in career.js; Ausbildung und Praktika hier
export { careerPage } from './career.js';

export function trainingPage(ctx) {
  const { t, href } = ctx;
  const T = t.pages.training;
  const open = ctx.data.jobs.filter((j) => j.type === 'training');
  return `${phead(ctx, { title: T.title, h1: T.h1, lead: T.lead, image: 'mimg/2022__06__stellenangebote_ausbildung_images_1.webp', crumbs: [[t.nav.career, href('career')], [T.title]] })}
<section class="section">
  <div class="wrap">
    <p class="lead mb">${esc(T.how)}</p>
    <div class="grid g-3">${T.sites.map(([site, mail, list]) => `<article class="feature feature--card"><h2 class="h3">${esc(site)}</h2>
      <ul class="plain">${list.map(([title, file]) => { const d = docIn(ctx, docByFile(ctx, file)); return `<li>${d ? `<a ${ctx.docAttrs(d)}>${esc(title)} ${icon(ctx.docHref(d) ? 'download' : 'mail', 'width="15" height="15"')}</a>` : esc(title)}</li>`; }).join('')}</ul>
      <p><a href="mailto:${esc(mail)}">${icon('mail', 'width="16" height="16"')} ${esc(mail)}</a></p></article>`).join('')}</div>
  </div>
</section>
${open.length ? `<section class="section section--porcelain"><div class="wrap">${sectionHead(T.openTitle)}<div class="jobs">${open.map((j) => `<a class="job" href="${esc(j.url)}" target="_blank" rel="noopener"><b>${esc(j.title)}</b><span>${esc(j.city)}</span><span>${esc(t.lbl.jobType[j.type])}</span>${icon('external')}</a>`).join('')}</div></div></section>` : ''}`;
}

export function internshipsPage(ctx) {
  const { t, href } = ctx;
  const I = t.pages.internships;
  const sites = t.pages.training.sites;
  return `${phead(ctx, { title: I.title, h1: I.h1, lead: I.lead, image: 'mimg/praktika_intro_Bild_links.webp', crumbs: [[t.nav.career, href('career')], [I.title]] })}
<section class="section"><div class="wrap grid g-2">${I.blocks.map(([h, x]) => `<div class="feature feature--card"><h2 class="h3">${esc(h)}</h2><p>${esc(x)}</p></div>`).join('')}</div></section>
<section class="section section--porcelain"><div class="wrap">${sectionHead(I.contactsTitle)}
  <div class="people">${sites.map(([site, mail]) => `<article class="person"><h3>${esc(site)}</h3><div class="lines"><a href="mailto:${esc(mail)}">${icon('mail')}<span>${esc(mail)}</span></a></div></article>`).join('')}</div>
</div></section>`;
}

// ---------------- News ----------------
export function newsPage(ctx) {
  const { t, href, lang } = ctx;
  const N = t.pages.news;
  const cats = Object.keys(t.lbl.newsCat);
  const all = ctx.data.news;
  // Im Fokus: die drei jüngsten Beiträge mit Foto; darunter alle Beiträge als ruhige Liste, nach Jahren gegliedert
  const feat = all.filter((n) => { const k = n.image || n.images?.[0]; return k && ctx.img[k] && ctx.img[k].w >= 600; }).slice(0, 3);
  const featIds = new Set(feat.map((n) => n.id));
  const years = [...new Set(all.map((n) => n.date.slice(0, 4)))];
  const row = (n) => {
    const vf = n.v[lang] ? lang : n.v[ctx.dl] ? ctx.dl : n.v.de ? 'de' : Object.keys(n.v)[0];
    const v = n.v[vf];
    const vl = v.contentLang || vf;
    return `<li data-cat="${n.cat}"${featIds.has(n.id) ? ' data-feat hidden' : ''}><a class="nl__item" href="${href('article', { slug: ctx.newsSlug(n) })}"><time datetime="${n.date}">${esc(fmtDate(n.date, lang, { day: 'numeric', month: 'long' }))}</time><span class="nl__cat">${esc(t.lbl.newsCat[n.cat] || '')}</span><b${vl !== lang ? ` lang="${vl}"` : ''}>${esc(v.title)}</b>${icon('arrow')}</a></li>`;
  };
  return `${phead(ctx, { title: N.title, lead: N.lead, crumbs: [[N.title]], cls: 'phead--compact' })}
<section class="section section--tight"><div class="wrap" data-news>
  <div class="nx__filter" role="group" aria-label="${esc(N.filterLabel)}"><button class="chip is-on" type="button" data-news-cat="" aria-pressed="true">${esc(N.filterAll)}</button>${cats.map((c) => `<button class="chip" type="button" data-news-cat="${c}" aria-pressed="false">${esc(t.lbl.newsCat[c])}</button>`).join('')}</div>
  <div class="nx__feat" data-news-feat>
    <h2 class="vh">${esc(N.featured)}</h2>
    <div class="news-grid news-grid--feat">${feat.map((n) => newsCard(ctx, n, { excerpt: false })).join('')}</div>
  </div>
  ${years.map((y) => `<section class="nx__year" data-year="${y}" aria-labelledby="ny-${y}"><h2 class="nx__y" id="ny-${y}">${y}</h2><ul class="nl nl--compact">${all.filter((n) => n.date.startsWith(y)).map(row).join('')}</ul></section>`).join('')}
</div></section>`;
}

export function articlePage(ctx, n) {
  const { t, href, lang } = ctx;
  const N = t.pages.news;
  const vl = n.v[lang] ? lang : n.v[ctx.dl] ? ctx.dl : n.v.de ? 'de' : Object.keys(n.v)[0];
  const v = n.v[vl];
  // Sprache des angezeigten Inhalts (unübersetzte Kopien des deutschen Beitrags gelten als deutsch)
  const cl = v.contentLang || (v.untranslated ? 'de' : vl);
  const la = cl !== lang ? ` lang="${cl}"` : '';
  let langName = cl;
  try { langName = new Intl.DisplayNames([lang], { type: 'language' }).of(cl) || cl; } catch (e) { /* Kürzel */ }
  const body = (v.html || '').replace(/<img data-img="([^"]+)" alt="">/g, (m, k) => (ctx.img[k] ? `<figure class="figure">${imgTag(ctx, k, { alt: '', sizes: '(max-width: 900px) 100vw, 680px', max: 1600, lowres: 560 })}</figure>` : ''))
    .replace(/<a data-doc="([^"]+)" href="[^"]*">/g, (m, id) => { const x = ctx.data.docsById[id]; const d = docIn(ctx, x) || x; return d ? `<a ${ctx.docAttrs(d)}>` : '<a>'; })
    // Verweise auf Seiten der alten Website (beim Build in Routen übersetzt)
    .replace(/<a data-route="article" data-news="([^"]+)">/g, (m, id) => { const x = ctx.data.news.find((k) => k.id === id); return x ? `<a href="${href('article', { slug: ctx.newsSlug(x) })}">` : '<a>'; })
    .replace(/<a data-route="([a-z-]+)"(?: data-p="([^"]*)")?(?: data-anchor="([^"]*)")?>/g, (m, id, p, anchor) => { let prm = {}; try { prm = p ? JSON.parse(p.replace(/&quot;/g, '"')) : {}; } catch (e) { /* ohne Parameter */ } try { return `<a href="${ctx.hrefA(id, prm, anchor || '')}">`; } catch (e) { return '<a>'; } })
    // Verweise der Altbeiträge auf Seiten der alten Website: auf die neuen Seiten umstellen, sonst als Text belassen
    .replace(/<a\b[^>]*?href="https?:\/\/(?:www\.)?ritz-international\.com(\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (m, p, inner) => {
      if (/^\/(wp-content|media)\//.test(p) || /\.(pdf|zip|dwg|dxf|stp|step|docx?|xlsx?)$/i.test(p)) return m;
      const to = { '/?page_id=673': href('quality'), '/kontakt/kontakt-2/': ctx.hrefA('locations', {}, 'wirges') }[p];
      return to ? `<a href="${to}">${inner}</a>` : inner;
    });
  const docs = langDocs(ctx, (n.docs || []).map((id) => ctx.data.docsById[id]).filter(Boolean));
  const more = ctx.data.news.filter((x) => x !== n && x.cat === n.cat).slice(0, 3);
  const heroImg = n.image && ctx.img[n.image] && !(v.html || '').includes(n.image) ? n.image : null;
  return `<div class="wrap pd-top">${crumbs(ctx, [[N.title, href('news')], [v.title, null, cl !== lang ? cl : null]])}</div>
<article class="section section--flush">
  <div class="wrap article">
    <div>
      <header class="stack mb" style="--s:.8rem"><div class="card__meta"><time datetime="${n.date}">${esc(fmtDate(n.date, lang))}</time><span>${esc(t.lbl.newsCat[n.cat])}</span></div><h1 class="h2${/[^\s\-–/]{18,}/.test(v.title) ? ' lw' : ''}"${la}>${esc(v.title)}</h1></header>
      ${cl !== lang ? `<p class="notice small">${esc(tpl(t.ui.untranslated, { lang: langName }))}</p>` : ''}
      ${heroImg ? `<figure class="article__hero">${imgTag(ctx, heroImg, { alt: '', sizes: '(max-width: 900px) 100vw, 760px', eager: true, max: 1600, lowres: 600 })}</figure>` : !n.image && !(n.images || []).length ? `<figure class="article__hero article__hero--cover" aria-hidden="true">${newsCover(ctx, n, { hero: true })}</figure>` : ''}
      <div class="prose"${la}>${body}</div>
      ${docs.length ? `<h2 class="h4 mt-xl">${esc(N.attachments)}</h2><div class="docs">${docs.map((d) => docRow(ctx, d)).join('')}</div>` : ''}
    </div>
    <aside class="article__aside"><a class="link" href="${href('news')}">${icon('left', 'width="16" height="16"')}${esc(N.back)}</a></aside>
  </div>
</article>
${more.length ? `<section class="section section--porcelain"><div class="wrap">${sectionHead(N.related)}<div class="news-grid">${more.map((x) => newsCard(ctx, x)).join('')}</div></div></section>` : ''}`;
}

// ---------------- Rechtliches ----------------
export function imprintPage(ctx) {
  const { t } = ctx;
  const I = t.pages.imprint;
  return `${phead(ctx, { title: I.h1, crumbs: [[I.title]], cls: 'phead--compact' })}
<section class="section section--tight"><div class="wrap wrap--narrow legal">
  <address class="addr-card">${I.company.map(esc).join('<br>')}</address>
  <dl class="deflist">${I.contact.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${/@/.test(v) ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : esc(v)}</dd></div>`).join('')}${I.legal.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  ${I.sections.map(([h, x]) => `<h2>${esc(h)}</h2><p>${esc(x)}</p>`).join('')}
  <p class="small muted mt-xl">${esc(I.credits)}</p>
</div></section>`;
}
export function privacyPage(ctx) {
  const { t } = ctx;
  const P = t.pages.privacy;
  return `${phead(ctx, { title: P.h1, lead: P.lead, crumbs: [[P.title]], cls: 'phead--compact' })}
<section class="section section--tight"><div class="wrap wrap--narrow legal">
  ${P.sections.map(([h, x], i) => `<h2>${i + 1}. ${esc(h)}</h2><p>${esc(x)}</p>`).join('')}
  <p class="small muted mt-xl">${esc(P.updated)}</p>
</div></section>`;
}

export function searchPage(ctx) {
  const { t } = ctx;
  const S = t.search;
  return `${phead(ctx, { title: S.title, lead: S.lead, crumbs: [[S.title]], cls: 'phead--compact' })}
<section class="section section--tight"><div class="wrap wrap--narrow" data-search-page>
  <form class="finder__search" role="search" data-search-page-form>${icon('search')}<label class="vh" for="sp-q">${esc(t.ui.search)}</label><input class="input" id="sp-q" name="q" type="search" placeholder="${esc(t.ui.searchPh)}" autocomplete="off"><button class="finder__go" type="submit" aria-label="${esc(t.ui.search)}">${icon('right')}</button></form>
  <div data-search-page-results></div>
</div></section>`;
}

export function notFoundPage(ctx) {
  const { t, href } = ctx;
  const N = t.pages.notFound;
  return `<section class="section"><div class="wrap wrap--narrow stack" style="--s:1.2rem">
  <p class="area__kv">404</p><h1>${esc(N.h1)}</h1><p class="lead">${esc(N.lead)}</p>
  <form class="finder__search" role="search" action="${href('search')}" data-goto-search>${icon('search')}<label class="vh" for="nf-q">${esc(t.ui.search)}</label><input class="input" id="nf-q" name="q" type="search" placeholder="${esc(t.ui.searchPh)}"><button class="finder__go" type="submit" aria-label="${esc(t.ui.search)}">${icon('right')}</button></form>
  <p><a class="btn" href="${href('home')}">${esc(N.home)}</a></p>
</div></section>`;
}
