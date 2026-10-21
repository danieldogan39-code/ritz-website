// Inhaltsseiten: Anwendungen, Unternehmen, Standorte, Qualität, Verantwortung, Referenzen, Downloads,
// Kontakt, Karriere, News, Rechtliches, Suche, 404
import { esc, icon, imgTag, tpl, fmtDate, fmtNum, phoneTxt } from '../lib/util.js';
import { SECTORS, AREAS } from '../lib/routes.js';
import { phead, sectionHead, personCard, docRow, ctaBand, ticks, crumbs, shorten } from './layout.js';
import { SECTOR_IMG, newsCard } from './home.js';
import { SECTOR_LINKS, HISTORY_IMG, personImg, REFERENCE_IMG, REFERENCE_DOC, REFERENCE_NEWS, CERT_FILES, RESP_DOCS, FEATURED_DOCS, FEATURED_DOCS_EN, LOC_IMG } from '../lib/catalog.js';
import { filterProducts, parseQuery, productCard, imgFit } from '../lib/product.js';
import { projectLL, locAddress } from '../lib/geo.js';
import { sortDocs, peopleFor, countryOptions } from './products.js';

const docByFile = (ctx, f) => ctx.data.docs.find((d) => d.file === f);
// Dokumente in der Sprache des Nutzers bevorzugen; andere Sprache nur, wenn es für den Typ keine Alternative gibt
// Paare (gleiche Datei in DE/EN) erkennen und nur die passende Sprache zeigen; Einzelstücke bleiben
const pairKey = (d) => d.file.toLowerCase().replace(/(^|[_\-])(de|en|eng|ger|dtsch|engl)(?=[_\-.])/g, '$1').replace(/hinweisgebersystem|code-of-conduct|verhaltenskodex_lieferanten.*|supplier-code-of-conduct.*/g, (m) => (m.startsWith('verhaltens') || m.startsWith('supplier') ? 'supplier-coc' : m));
export function preferLang(ctx, docs) {
  const mine = (d) => d.lang === ctx.dl || d.lang === 'de+en';
  return docs.filter((d) => mine(d) || !docs.some((x) => x !== d && mine(x) && pairKey(x) === pairKey(d)));
}
const newsByPrefix = (ctx, pre) => ctx.data.news.find((n) => n.id.startsWith(pre));

// ---------------- Anwendungen ----------------
export function sectorsPage(ctx) {
  const { t, href } = ctx;
  const S = t.pages.sectors;
  return `${phead(ctx, { title: S.h1, lead: S.lead, crumbs: [[S.title]] })}
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
  const docsShown = sortDocs(ctx, preferLang(ctx, L.docs.map((f) => docByFile(ctx, f)).filter(Boolean)));
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
export function companyPage(ctx) {
  const { t, href } = ctx;
  const C = t.pages.company;
  const mgr = (name, role, board = false) => {
    const k = personImg(name, board);
    return `<figure class="mgr"><div class="mgr__img">${k && ctx.img[k] ? imgTag(ctx, k, { alt: name, sizes: '(max-width: 900px) 50vw, 25vw', max: 640 }) : ''}</div><figcaption><b>${esc(name)}</b><span>${esc(role)}</span></figcaption></figure>`;
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
  <div class="wrap">${sectionHead(C.factsTitle)}<div class="facts">${C.facts.map(([a, b]) => `<div class="fact"><strong>${esc(a)}</strong><span>${esc(b)}</span></div>`).join('')}</div></div>
</section>
<section class="section" id="geschichte">
  <div class="wrap wrap--narrow">
    ${sectionHead(C.historyTitle, C.historyLead)}
    <ol class="tl">${C.history.map(([year, title, text]) => `<li class="tl__item"><span class="tl__year">${esc(year)}</span><div class="tl__body"><h3>${esc(title)}</h3><p>${esc(text)}</p>${(HISTORY_IMG[year] || []).filter((k) => ctx.img[k]).length ? `<div class="tl__imgs">${HISTORY_IMG[year].filter((k) => ctx.img[k]).map((k) => imgTag(ctx, k, { alt: '', sizes: '180px', max: 640 })).join('')}</div>${year === '1986' ? '<p class="small faint">Illustration ©UKE</p>' : ''}` : ''}</div></li>`).join('')}</ol>
  </div>
</section>
<section class="section section--porcelain" id="management">
  <div class="wrap">
    ${sectionHead(C.mgmtTitle)}
    <div class="mgmt">${C.mgmt.map(([n, r]) => mgr(n, r)).join('')}</div>
    <h2 class="h3 mt-xl">${esc(C.boardTitle)}</h2>
    <div class="mgmt mgmt--small">${C.board.map(([n, r]) => mgr(n, r, true)).join('')}</div>
  </div>
</section>
<section class="section">
  <div class="wrap split split--even">
    <div class="stack" style="--s:1rem"><h2 class="h3">${esc(C.structureTitle)}</h2><p>${esc(C.structureText)}</p>
      <figure class="figure figure--dark">${imgTag(ctx, 'mimg/RTZ_Group-Organisation_grafik_V3-scaled_v2.webp', { alt: C.structureTitle, sizes: '(max-width: 900px) 100vw, 50vw', max: 1200 })}</figure>
      <figure class="figure figure--dark">${imgTag(ctx, 'mimg/RTZ_logo-anordnung-scaled.webp', { alt: 'RITZ, MWB, WTW, TuR', sizes: '(max-width: 900px) 100vw, 50vw', max: 1200 })}</figure>
    </div>
    <div class="stack" style="--s:1rem"><h2 class="h3">${esc(C.foundationTitle)}</h2><p>${esc(C.foundationText)}</p>
      <figure class="figure">${imgTag(ctx, 'mimg/image3.webp', { alt: '', sizes: '(max-width: 900px) 100vw, 50vw', max: 960 })}<figcaption>Illustration ©UKE</figcaption></figure>
    </div>
  </div>
</section>
<section class="section section--porcelain"><div class="wrap">${sectionHead(C.linksTitle)}
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
  <div class="wrap">${sectionHead(L.mapTitle)}${mapBox(ctx, { mode: 'locations' })}</div>
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
  <div class="loc__img">${img && ctx.img[img] ? imgTag(ctx, img, { alt: l.city, sizes: '(max-width: 700px) 100vw, 33vw', max: 960 }) : locMap(ctx, l)}</div>
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

export function mapBox(ctx, { mode = 'all' } = {}) {
  const { t } = ctx;
  const M = t.map;
  return `<div class="mapbox" data-map="${mode}">
  <a class="skip skip--inline" href="#map-list-${mode}">${esc(t.ui.mapSkip)}</a>
  <div class="map" data-map-canvas>
    <div class="map__regions" data-map-regions role="group" aria-label="${esc(M.title)}"></div>
    <div class="map__ctrl"><button type="button" data-map-zoom="in" aria-label="${esc(M.zoomIn)}">+</button><button type="button" data-map-zoom="out" aria-label="${esc(M.zoomOut)}">−</button><button type="button" data-map-zoom="reset" aria-label="${esc(M.reset)}">${icon('reset', 'width="18" height="18"')}</button></div>
    <div class="map__legend" data-map-legend></div>
    <div class="map__loading">${esc(t.ui.loading)}</div>
  </div>
  <div class="map__panel">
    <div class="map__panel-head">
      ${mode === 'all' ? `<div class="seg" role="group" aria-label="${esc(M.title)}"><button type="button" class="chip is-on" data-map-layer="all" aria-pressed="true">${esc(M.all)}</button><button type="button" class="chip" data-map-layer="locations" aria-pressed="false">${esc(M.locations)}</button><button type="button" class="chip" data-map-layer="reps" aria-pressed="false">${esc(M.reps)}</button></div>` : ''}
      <label class="vh" for="map-filter-${mode}">${esc(M.filterPh)}</label><input class="input input--small" id="map-filter-${mode}" type="search" placeholder="${esc(M.filterPh)}" data-map-filter>
    </div>
    <div class="map__detail" data-map-detail hidden></div>
    <div class="map__list" id="map-list-${mode}" data-map-list tabindex="-1"></div>
  </div>
</div>`;
}

// ---------------- Qualität ----------------
export function qualityPage(ctx) {
  const { t, href } = ctx;
  const Q = t.pages.quality;
  return `${phead(ctx, { title: Q.h1, lead: Q.lead, crumbs: [[t.nav.company, href('company')], [Q.title]] })}
<section class="section">
  <div class="wrap split">
    <div class="prose">${Q.body.map((x) => `<p class="lead">${esc(x)}</p>`).join('')}</div>
    <div class="certgrid">${Q.certs.map(([n, d, key]) => {
      const doc = docByFile(ctx, CERT_FILES[key]);
      return `<a class="certcard" href="${doc ? ctx.docHref(doc) : '#'}" target="_blank" rel="noopener"><b>${esc(n)}</b><span>${esc(d)}</span>${icon('download', 'width="18" height="18"')}</a>`;
    }).join('')}</div>
  </div>
</section>
<section class="section section--resin">
  <div class="wrap">
    ${sectionHead(Q.testTitle)}
    <div class="grid g-3">${Q.test.map(([h, x]) => `<div class="feature feature--dark"><h3>${esc(h)}</h3><p>${esc(x)}</p></div>`).join('')}</div>
  </div>
</section>
<section class="section">
  <div class="wrap grid g-2">
    <figure class="figure">${imgTag(ctx, 'mimg/2022__07__unternehmen_qualitaetsmanagement_wandler_pruefung.webp', { alt: Q.imgTransformer, sizes: '(max-width: 600px) 100vw, 50vw', max: 960 })}<figcaption>${esc(Q.imgTransformer)}</figcaption></figure>
    <figure class="figure">${imgTag(ctx, 'mimg/2022__07__unternehmen_qualitaetsmanagement_schienen_pruefung.webp', { alt: Q.imgBusbar, sizes: '(max-width: 600px) 100vw, 50vw', max: 960 })}<figcaption>${esc(Q.imgBusbar)}</figcaption></figure>
  </div>
</section>
<section class="section section--porcelain"><div class="wrap split split--even">
  <div class="stack" style="--s:1rem"><h2 class="h3">${esc(Q.aeoTitle)}</h2><p>${esc(Q.aeo)}</p></div>
  <div class="stack" style="--s:1rem">${ctaBand(ctx, t.nav.downloads, t.pages.home.tasks[0][1], t.ui.allDownloads, href('downloads', {}, { type: 'certificate' }))}</div>
</div></section>`;
}

// ---------------- Verantwortung ----------------
export function responsibilityPage(ctx) {
  const { t, href } = ctx;
  const R = t.pages.responsibility;
  const docs = sortDocs(ctx, preferLang(ctx, RESP_DOCS.map((f) => docByFile(ctx, f)).filter(Boolean)));
  const news = ctx.data.news.filter((n) => n.cat === 'responsibility').slice(0, 3);
  const block = ([title, paras], ic) => `<div class="esg"><span class="esg__icon">${icon(ic)}</span><h2 class="h3">${esc(title)}</h2>${paras.map((x) => `<p>${esc(x)}</p>`).join('')}</div>`;
  return `${phead(ctx, { title: R.h1, lead: R.lead, image: 'mimg/wind-energy-sq.webp', crumbs: [[t.nav.company, href('company')], [R.title]] })}
<section class="section"><div class="wrap grid g-3">${block(R.env, 'globe')}${block(R.soc, 'user')}${block(R.gov, 'check')}</div></section>
<section class="section section--porcelain"><div class="wrap">${sectionHead(R.docsTitle)}<div class="docs docs--cols">${docs.map((d) => docRow(ctx, d)).join('')}</div></div></section>
${news.length ? `<section class="section"><div class="wrap">${sectionHead(R.newsTitle)}<div class="news-grid">${news.map((n) => newsCard(ctx, n)).join('')}</div></div></section>` : ''}`;
}

// ---------------- Referenzen ----------------
export function referencesPage(ctx) {
  const { t, href } = ctx;
  const R = t.pages.references;
  return `${phead(ctx, { title: R.h1, lead: R.lead, crumbs: [[t.nav.company, href('company')], [R.title]] })}
<section class="section section--tight"><div class="wrap stack" style="--s:clamp(32px,5vw,64px)">
  ${R.items.map(([who, what, text], i) => {
    const doc = REFERENCE_DOC[i] && docByFile(ctx, REFERENCE_DOC[i]);
    const n = REFERENCE_NEWS[i] && newsByPrefix(ctx, REFERENCE_NEWS[i]);
    return `<article class="ref${i % 2 ? ' ref--flip' : ''}">
      <div class="ref__img">${ctx.img[REFERENCE_IMG[i]] ? imgTag(ctx, REFERENCE_IMG[i], { alt: '', sizes: '(max-width: 900px) 100vw, 40vw', max: 960, cls: imgFit(ctx, REFERENCE_IMG[i]) }) : ''}</div>
      <div class="ref__body stack" style="--s:.8rem"><span class="area__kv">${esc(who)}</span><h2 class="h3">${esc(what)}</h2><p>${esc(text)}</p>
        <div class="cluster">${doc ? `<a class="btn btn--ghost btn--small" href="${ctx.docHref(doc)}" target="_blank" rel="noopener">${icon('download')}PDF</a>` : ''}${n ? `<a class="link" href="${href('article', { slug: ctx.newsSlug(n) })}">${esc(t.ui.readArticle)}</a>` : ''}</div>
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
  const featured = (ctx.dl === 'de' ? FEATURED_DOCS : FEATURED_DOCS_EN).map((f) => docByFile(ctx, f)).filter(Boolean);
  const types = Object.keys(t.lbl.docType);
  const counts = {};
  for (const d of ctx.data.docs) counts[d.type] = (counts[d.type] || 0) + 1;
  return `${phead(ctx, { title: D.title, lead: D.lead, crumbs: [[D.title]], cls: 'phead--compact' })}
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
      <div class="finder__bar"><p class="finder__count" aria-live="polite"><b data-dl-count>${ctx.data.docs.length}</b> ${esc(D.count)}</p></div>
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
  return `${phead(ctx, { title: C.title, h1: C.h1, lead: C.lead, crumbs: [[C.title]] })}
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
  <div class="wrap">${sectionHead(C.mapTitle)}${mapBox(ctx, { mode: 'all' })}</div>
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
export function careerPage(ctx) {
  const { t, href, lang } = ctx;
  const K = t.pages.career;
  const jobs = ctx.data.jobs;
  const hr = ctx.data.contacts.people.find((p) => p.id === 'maria-schunk');
  return `${phead(ctx, { title: K.title, h1: K.h1, lead: K.lead, image: 'mimg/stellenangebote_intro_slider_4_International.webp', crumbs: [[K.title]] })}
<section class="section section--tight">
  <div class="wrap">
    ${sectionHead(K.benefitsTitle)}
    <ul class="benefits">${K.benefits.map((b) => `<li>${icon('check')}<span>${esc(b)}</span></li>`).join('')}</ul>
  </div>
</section>
<section class="section section--porcelain" id="stellen">
  <div class="wrap" data-jobs>
    ${sectionHead(K.jobsTitle, K.jobsLead, `<div class="cluster"><select class="select select--small" data-jobs-loc aria-label="${esc(K.jobsAll)}"><option value="">${esc(K.jobsAll)}</option>${[...new Set(jobs.map((j) => j.city))].map((c) => `<option>${esc(c)}</option>`).join('')}</select><select class="select select--small" data-jobs-type aria-label="${esc(K.jobsType)}"><option value="">${esc(K.jobsType)}</option>${Object.entries(t.lbl.jobType).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></div>`)}
    <div class="jobs" data-jobs-list>${jobs.map((j) => `<a class="job" href="${esc(j.url)}" target="_blank" rel="noopener" data-city="${esc(j.city)}" data-type="${j.type}"><b>${esc(j.title)}</b><span>${icon('pin', 'width="16" height="16"')} ${esc(j.city)}</span><span>${esc(t.lbl.jobType[j.type])}, ${esc(t.lbl.jobTime[j.time])}</span>${icon('external')}</a>`).join('')}</div>
    <p class="small faint mt">${esc(K.jobsNote)} <a href="https://ritz.jobs.personio.de/" target="_blank" rel="noopener">${esc(K.portal)}</a></p>
  </div>
</section>
<section class="section">
  <div class="wrap grid g-2">${K.paths.map(([h, x, id], i) => `<a class="pathcard" href="${href(id)}"><span class="pathcard__img">${imgTag(ctx, i === 0 ? 'mimg/2022__06__stellenangebote_ausbildung_images_1.webp' : 'mimg/praktika_intro_Bild_rechts.webp', { alt: '', sizes: '(max-width: 600px) 100vw, 50vw', max: 960 })}</span><span class="pathcard__body"><strong>${esc(h)}</strong><span>${esc(x)}</span></span></a>`).join('')}</div>
</section>
${hr ? `<section class="section section--tight"><div class="wrap"><div class="people people--one"><article class="person"><span class="person__kind">${esc(K.contactTitle)}</span><h3>${esc(hr.name)}</h3><p class="role">${esc(K.contactRole)}</p><div class="lines"><a href="mailto:${esc(hr.email)}">${icon('mail')}<span>${esc(hr.email)}</span></a></div></article></div></div></section>` : ''}`;
}

export function trainingPage(ctx) {
  const { t, href } = ctx;
  const T = t.pages.training;
  const open = ctx.data.jobs.filter((j) => j.type === 'training');
  return `${phead(ctx, { title: T.title, h1: T.h1, lead: T.lead, image: 'mimg/2022__06__stellenangebote_ausbildung_images_1.webp', crumbs: [[t.nav.career, href('career')], [T.title]] })}
<section class="section">
  <div class="wrap">
    <p class="lead mb">${esc(T.how)}</p>
    <div class="grid g-3">${T.sites.map(([site, mail, list]) => `<article class="feature feature--card"><h2 class="h3">${esc(site)}</h2>
      <ul class="plain">${list.map(([title, file]) => { const d = docByFile(ctx, file); return `<li>${d ? `<a href="${ctx.docHref(d)}" target="_blank" rel="noopener">${esc(title)} ${icon('download', 'width="15" height="15"')}</a>` : esc(title)}</li>`; }).join('')}</ul>
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
  const { t } = ctx;
  const N = t.pages.news;
  const cats = Object.keys(t.lbl.newsCat);
  return `${phead(ctx, { title: N.title, lead: N.lead, crumbs: [[N.title]], cls: 'phead--compact' })}
<section class="section section--tight"><div class="wrap" data-news>
  <div class="cluster mb" role="group" aria-label="${esc(N.filterAll)}"><button class="chip is-on" type="button" data-news-cat="" aria-pressed="true">${esc(N.filterAll)}</button>${cats.map((c) => `<button class="chip" type="button" data-news-cat="${c}" aria-pressed="false">${esc(t.lbl.newsCat[c])}</button>`).join('')}</div>
  <div class="news-grid">${ctx.data.news.map((n) => `<div data-cat="${n.cat}">${newsCard(ctx, n)}</div>`).join('')}</div>
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
  const body = (v.html || '').replace(/<img data-img="([^"]+)" alt="">/g, (m, k) => (ctx.img[k] ? `<figure class="figure">${imgTag(ctx, k, { alt: '', sizes: '(max-width: 900px) 100vw, 680px', max: 1200 })}</figure>` : ''))
    .replace(/<a data-doc="([^"]+)" href="[^"]*">/g, (m, id) => { const d = ctx.data.docsById[id]; return d ? `<a href="${ctx.docHref(d)}" target="_blank" rel="noopener">` : '<a>'; })
    // Verweise der Altbeiträge auf Seiten der alten Website: auf die neuen Seiten umstellen, sonst als Text belassen
    .replace(/<a\b[^>]*?href="https?:\/\/(?:www\.)?ritz-international\.com(\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (m, p, inner) => {
      if (/^\/(wp-content|media)\//.test(p) || /\.(pdf|zip|dwg|dxf|stp|step|docx?|xlsx?)$/i.test(p)) return m;
      const to = { '/?page_id=673': href('quality'), '/kontakt/kontakt-2/': ctx.hrefA('locations', {}, 'wirges') }[p];
      return to ? `<a href="${to}">${inner}</a>` : inner;
    });
  const docs = (n.docs || []).map((id) => ctx.data.docsById[id]).filter(Boolean);
  const more = ctx.data.news.filter((x) => x !== n && x.cat === n.cat).slice(0, 3);
  const heroImg = n.image && ctx.img[n.image] && !(v.html || '').includes(n.image) ? n.image : null;
  return `<div class="wrap pd-top">${crumbs(ctx, [[N.title, href('news')], [v.title, null, cl !== lang ? cl : null]])}</div>
<article class="section section--flush">
  <div class="wrap article">
    <div>
      <header class="stack mb" style="--s:.8rem"><div class="card__meta"><time datetime="${n.date}">${esc(fmtDate(n.date, lang))}</time><span>${esc(t.lbl.newsCat[n.cat])}</span></div><h1 class="h2${/[^\s\-–/]{18,}/.test(v.title) ? ' lw' : ''}"${la}>${esc(v.title)}</h1></header>
      ${cl !== lang ? `<p class="notice small">${esc(tpl(t.ui.untranslated, { lang: langName }))}</p>` : ''}
      ${heroImg ? `<figure class="article__hero">${imgTag(ctx, heroImg, { alt: '', sizes: '(max-width: 900px) 100vw, 760px', eager: true, max: 1200 })}</figure>` : ''}
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
