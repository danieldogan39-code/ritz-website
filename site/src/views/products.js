// Produkte: Übersicht, Bereich, Produktdetail, Produktfinder, Vergleich, Anfrage
import { esc, icon, imgTag, imgSrcset, tpl, fmtKv, fmtRange, fmtList, fmtNum, productGlyph, phoneTxt } from '../lib/util.js';
import { AREAS, SECTORS } from '../lib/routes.js';
import { phead, sectionHead, personCard, docRow, ctaBand, anchorId, ticks, crumbs } from './layout.js';
import { productCard, descriptor, descriptorLang, langAttr, groupProducts, keySpecs, KIND_GROUP, vmini, specRows, ratingPlate, imgFit, productDrawing, dimSpecRows } from '../lib/product.js';
export { specRows };
import { AREA_IMG, voltageAxis } from './home.js';
import { classifyOptions, markMulti } from '../lib/roles.js';

const DOC_ORDER = ['datasheet', 'drawing', 'manual', 'catalog', 'knowledge', 'document', 'certificate', 'terms', 'compliance', 'press', 'career'];
export function sortDocs(ctx, docs) {
  const pref = { de: ['de', 'de+en', 'en'], en: ['en', 'de+en', 'de'] }[ctx.dl] || ['en', 'de+en', 'de'];
  const rank = (d) => { const i = pref.indexOf(d.lang); return i < 0 ? 9 : i; };
  return docs.slice().sort((a, b) => DOC_ORDER.indexOf(a.type) - DOC_ORDER.indexOf(b.type) || rank(a) - rank(b));
}
export function peopleFor(ctx, area) {
  return ctx.data.contacts.people.filter((p) => p.areas.includes(area));
}
const locById = (ctx, id) => ctx.data.contacts.locations.find((l) => l.id === id);

// ---------------- Übersicht ----------------
export function productsPage(ctx) {
  const { t, href } = ctx;
  const P = t.pages.products;
  const counts = {};
  for (const p of ctx.data.products) counts[p.area] = (counts[p.area] || 0) + 1;
  const knowledge = sortDocs(ctx, ctx.data.docs.filter((d) => d.type === 'knowledge' && (d.lang === ctx.dl || d.lang === 'de+en' || (ctx.dl !== 'de' && d.lang === 'en'))));
  return `${phead(ctx, { title: P.h1, lead: P.lead, image: 'mimg/ritz_header-unternehmen.webp', crumbs: [[t.nav.products]] })}
<section class="section section--tight">
  <div class="wrap">
    <p class="prose muted">${esc(P.intro)}</p>
    ${voltageAxis(ctx, { dark: false })}
  </div>
</section>
<section class="section section--tight">
  <div class="wrap stack" style="--s:clamp(40px,6vw,88px)">
    ${AREAS.map((a, i) => `<article class="arow${i % 2 ? ' arow--flip' : ''}" id="${a}">
      <a class="arow__img" href="${href('area', { area: a })}" tabindex="-1" aria-hidden="true">${imgTag(ctx, AREA_IMG[a], { alt: '', sizes: '(max-width: 900px) 100vw, 55vw', max: 1920, cover: 2.2 })}</a>
      <div class="arow__body stack" style="--s:.9rem">
        <span class="area__kv">${esc(t.lbl.areaRange[a])}</span>
        <h2><a href="${href('area', { area: a })}">${esc(t.lbl.areaLong[a])}</a></h2>
        <p class="lead">${esc(t.lbl.areaShort[a])}</p>
        <p class="muted">${esc(ctx.plural(counts[a] || 0, t.ui.productCount))}</p>
        <div class="cluster"><a class="btn" href="${href('area', { area: a })}">${esc(t.ui.toArea)}</a><a class="btn btn--ghost" href="${href('finder', {}, { area: a })}">${esc(t.nav.finder)}</a></div>
      </div>
    </article>`).join('')}
  </div>
</section>
${knowledge.length ? `<section class="section section--porcelain">
  <div class="wrap">
    ${sectionHead(P.knowledgeTitle, P.knowledgeLead)}
    <div class="docs docs--cols">${knowledge.slice(0, 8).map((d) => docRow(ctx, d)).join('')}</div>
  </div>
</section>` : ''}
<section class="section section--tight"><div class="wrap">${ctaBand(ctx, P.finderTitle, P.finderText, t.ui.openFinder, href('finder'))}</div></section>`;
}

// ---------------- Bereich ----------------
export function areaPage(ctx, area) {
  const { t, href } = ctx;
  const A = t.pages.areas[area];
  const items = ctx.data.products.filter((p) => p.area === area);
  const groups = groupProducts(area, items);
  const people = peopleFor(ctx, area);
  const locs = (ctx.data.contacts.areaLocations[area] || []).map((x) => locById(ctx, x.location)).filter(Boolean);
  const uniqLocs = [...new Map(locs.map((l) => [l.id, l])).values()];
  const areaDocs = sortDocs(ctx, ctx.data.docs.filter((d) => d.areas.includes(area) && ['catalog', 'knowledge', 'document', 'press'].includes(d.type) && !d.products.length));
  const facts = A.facts || [];
  return `${phead(ctx, { title: A.title, lead: A.lead, image: AREA_IMG[area], crumbs: [[t.nav.products, href('products')], [t.lbl.area[area]]],
    aside: `<div class="cluster"><a class="btn btn--light" href="${href('finder', {}, { area })}">${esc(t.nav.finder)}</a></div>` })}
<section class="section">
  <div class="wrap split">
    <div class="stack" style="--s:1.4rem">
      <div class="prose">${(A.body || []).map((x) => `<p>${esc(x)}</p>`).join('')}</div>
      ${facts.length ? `<div class="kfacts">${facts.map(([a, b]) => `<div><strong>${esc(a)}</strong><span>${esc(b)}</span></div>`).join('')}</div>` : ''}
      ${groups.length > 1 ? `<nav class="anchor-nav" aria-label="${esc(t.lbl.areaLong[area])}">${groups.map((g) => `<a class="chip" href="#${anchorId(g.key)}">${esc(t.lbl.group[g.key])} <span class="faint">${g.items.length}</span></a>`).join('')}</nav>` : ''}
    </div>
    <aside class="stack" style="--s:1rem">
      <h2 class="h4">${esc(people.length > 1 ? t.ui.contactPersons : t.ui.contactPerson)}</h2>
      <div class="people people--stack">${people.map((p) => personCard(ctx, p)).join('')}</div>
      ${uniqLocs.length ? `<div class="locs-mini"><h3 class="h5">${esc(t.nav.locations)}</h3><ul>${uniqLocs.map((l) => `<li><a href="${ctx.hrefA('locations', {}, l.id)}">${esc(l.city)}</a><span>${esc(t.lbl.made[l.country] || l.country)}</span></li>`).join('')}</ul></div>` : ''}
    </aside>
  </div>
</section>
${areaExtras(ctx, area)}
${groups.map((g, i) => `<section class="section section--tight${i % 2 === 0 ? '' : ''}" id="${anchorId(g.key)}">
  <div class="wrap">
    ${sectionHead(t.lbl.group[g.key], t.lbl.groupText[g.key] || '', `<a class="link" href="${href('finder', {}, { area })}">${esc(ctx.plural(g.items.length, t.ui.productCount))}</a>`)}
    <div class="pgrid">${g.items.map((p) => productCard(ctx, p)).join('')}</div>
  </div>
</section>`).join('')}
${areaDocs.length ? `<section class="section section--porcelain">
  <div class="wrap">
    ${sectionHead(A.downloadsTitle || t.ui.allDownloads, '', `<a class="btn btn--ghost" href="${href('downloads', {}, { area })}">${esc(t.ui.allDownloads)}</a>`)}
    <div class="docs docs--cols">${areaDocs.slice(0, 12).map((d) => docRow(ctx, d)).join('')}</div>
  </div>
</section>` : ''}
<section class="section section--tight"><div class="wrap">${ctaBand(ctx, t.pages.home.ctaTitle, t.pages.home.ctaText, t.pages.home.ctaBtn, href('inquiry'))}</div></section>`;
}

function areaExtras(ctx, area) {
  const { t } = ctx;
  const A = t.pages.areas[area];
  if (area === 'elektronik-sensoren') {
    return `<section class="section section--tight"><div class="wrap">${sectionHead(A.specTitle)}
      <table class="spec spec--wide"><tbody>${A.specs.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div></section>`;
  }
  if (area === 'stromschienen-sis') {
    return `<section class="section section--porcelain"><div class="wrap">
      ${sectionHead(A.advTitle)}
      <div class="grid g-4">${A.adv.map(([h, x]) => `<div class="feature"><h3>${esc(h)}</h3><p>${esc(x)}</p></div>`).join('')}</div>
    </div></section>
    <section class="section section--tight"><div class="wrap split">
      <div>${sectionHead(A.techTitle)}</div>
      <div class="acc">${A.tech.map(([h, x]) => `<details class="acc__item"><summary>${esc(h)}${icon('down')}</summary><p>${esc(x)}</p></details>`).join('')}</div>
    </div></section>`;
  }
  if (area === 'giessharzteile-duromer') {
    return `<section class="section section--porcelain"><div class="wrap">
      ${sectionHead(A.servicesTitle)}
      <div class="grid g-4">${A.services.map(([h, x]) => `<div class="feature"><h3>${esc(h)}</h3><p>${esc(x)}</p></div>`).join('')}</div>
    </div></section>
    <section class="section section--tight"><div class="wrap split split--even">
      <div class="stack" style="--s:1rem"><h2 class="h3">${esc(A.whatTitle)}</h2><p>${esc(A.what)}</p></div>
      <div class="stack" style="--s:1rem"><h2 class="h3">${esc(A.equipTitle)}</h2>${ticks(A.equip)}
        <address class="addr-card">${A.address.map((l) => (/@/.test(l) ? `<a href="mailto:${esc(l)}">${esc(l)}</a>` : /^\+/.test(l) ? `<a href="tel:${esc(l.replace(/[^\d+]/g, ''))}">${phoneTxt(l)}</a>` : esc(l))).join('<br>')}</address>
      </div>
    </div></section>`;
  }
  if (area === 'niederspannung') {
    const std = [['KS 50-02', 'KS_50-02_d-1.pdf', 'M005585_I06-1.pdf'], ['KS 60-03', 'KS_60-03_d-1.pdf', 'M005587_I05-1.pdf'], ['KS 70-04', 'KS_70-04_d-1-1.pdf', 'M005588_I05-1.pdf'],
      ['KS 79-05', 'KS_79-05_d-2.pdf', 'M005589_I05-1.pdf'], ['KS 95-06', 'KS_95-06_d-2.pdf', 'M005590_I06.pdf'], ['KS 120-08', 'KS_120-08_d-2.pdf', 'M005591_I06-1.pdf'],
      ['KS 160-12', 'KS_160-12_d-1.pdf', 'M005592_I06-1.pdf'], ['KSO 311', 'KSO_311_d-1.pdf', 'M006681I2-1.pdf'], ['KSW 52', 'KSW_52_d-1.pdf', 'M003651I5-1.pdf']];
    const U = 'https://ritz-international.com/wp-content/uploads/';
    const doc = (f) => ctx.data.docs.find((d) => d.file === f);
    return `<section class="section section--porcelain"><div class="wrap">
      ${sectionHead(A.standardTitle, A.standardLead)}
      <div class="table-wrap"><table class="spec spec--grid"><thead><tr><th scope="col">${esc(t.lbl.spec.code)}</th><th scope="col">${esc(t.lbl.docTypeOne.datasheet)}</th><th scope="col">${esc(t.lbl.docTypeOne.drawing)}</th></tr></thead>
      <tbody>${std.map(([code, ds, dr]) => { const a = doc(ds), b = doc(dr); return `<tr><th scope="row">${esc(code)}</th><td>${a ? docCell(ctx, a) : '–'}</td><td>${b ? docCell(ctx, b) : '–'}</td></tr>`; }).join('')}</tbody></table></div>
    </div></section>`;
  }
  return '';
}

// ---------------- Produktdetail ----------------
// Dokumentzelle (Tabelle der Standardbaugrößen): Download oder Anforderung
function docCell(ctx, d) {
  const h = ctx.docHref(d);
  return `<a ${ctx.docAttrs(d)}>${icon(h ? 'download' : 'mail', 'width="16" height="16"')} ${h ? 'PDF' : esc(ctx.t.downloads.req.doc)}</a>`;
}
// Noch nicht auf der Seite liegende Unterlagen gesammelt anfordern
function docsRequestAll(ctx, p, docs) {
  const miss = docs.filter((d) => !ctx.docHref(d));
  if (!miss.length) return '';
  const R = ctx.t.downloads.req;
  const msg = [tpl(R.allMsg, { code: p.code }), ...miss.slice(0, 15).map((d) => `– ${ctx.docTitle(d)} (${d.file})`), miss.length > 15 ? '…' : ''].filter(Boolean).join('\n');
  return `<div class="docreq"><p>${esc(R.note)}</p><a class="btn btn--ghost btn--small" href="${ctx.href('contact', {}, { topic: 2, msg })}">${icon('mail')}${esc(R.all)}</a></div>`;
}

// Produkte ohne Foto: Schemazeichnung (mit Bemaßung aus dem Datenblatt) und Typenschild als zweite Ansicht
function drawingGallery(ctx, p) {
  const { t } = ctx;
  const V = t.product.pv;
  const hasDims = dimSpecRows(ctx, p).length > 0;
  const ask = ctx.href('contact', {}, { topic: 1, msg: tpl(V.askMsg, { code: p.code }) });
  return `<div class="gallery__main gallery__main--pv" data-gallery-views>
        <div class="gv" data-view="0">${productDrawing(ctx, p, { label: true, detail: true })}<span class="pvw__tag">${icon('ruler', 'width="14" height="14"')}${esc(V.tag)}</span></div>
        <div class="gv gv--plate" data-view="1" hidden>${ratingPlate(ctx, p)}</div>
      </div>
      <div class="gallery__thumbs" role="list" aria-label="${esc(t.product.gallery)}">
        <button type="button" role="listitem" data-gallery-view="0" aria-current="true" aria-label="${esc(V.tag)}">${productDrawing(ctx, p, { small: true })}</button>
        <button type="button" role="listitem" data-gallery-view="1" aria-current="false" aria-label="${esc(V.plate)}"><span class="plate-mini" aria-hidden="true"><b>RITZ</b><i></i><i></i><i></i></span></button>
      </div>
      <p class="pv-note">${esc(hasDims ? V.note : V.noteNone)} <a href="${ask}">${esc(V.ask)}</a></p>`;
}

export function productPage(ctx, p) {
  const { t, href, lang } = ctx;
  const T = t.product;
  const dl = ctx.dl;
  const docs = sortDocs(ctx, (p.docs || []).map((id) => ctx.data.docsById[id]).filter(Boolean));
  const datasheet = docs.find((d) => d.type === 'datasheet' && (d.lang === dl || d.lang === 'de+en')) || docs.find((d) => d.type === 'datasheet');
  const imgs = (p.images || []).filter((k) => ctx.img[k]);
  const people = peopleFor(ctx, p.area);
  const person = people.find((x) => x.phone && x.email) || people[0];
  const desc = descriptor(p, t, lang);
  const hasCfg = !p.catalog && p.options && (p.options[dl] || p.options.de || []).length;
  const tags = [];
  for (const i of p.install || []) tags.push(`<span class="tag">${esc(t.lbl.install[i])}</span>`);
  if (p.made) tags.push(`<span class="tag">${esc(t.ui.madeIn)} ${esc(t.lbl.made[p.made] || p.made)}</span>`);
  if (p.isNew) tags.push(`<span class="tag tag--red">${esc(t.ui.newBadge)}</span>`);
  if (p.catalog) tags.push(`<span class="tag tag--line">${esc(T.catalogBadge)}</span>`);
  for (const a of (p.apps || []).filter((x) => ['rail', 'generator', 'power-quality', 'touch-proof', 'ex-protection', 'dc-measurement', 'lpit'].includes(x))) tags.push(`<span class="tag tag--copper">${esc(t.lbl.app[a])}</span>`);
  const ks = summarySpecs(ctx, p);
  const related = relatedProducts(ctx, p);
  const textDesc = p.desc?.[dl] || p.desc?.en || p.desc?.de || [];
  const famText = p.family?.[dl] || p.family?.en || '';
  // Produktdaten liegen auf Deutsch/Englisch vor: abweichende Sprache für Screenreader auszeichnen
  const dla = langAttr(p.desc?.[dl] ? dl : p.desc?.en ? 'en' : 'de', lang);
  const fla = langAttr(p.family?.[dl] ? dl : 'en', lang);
  const nla = langAttr(dl, lang);
  const feats = (p.feats || []).map((f) => t.lbl.feat[f]).filter(Boolean);
  const tabs = [['ueberblick', T.overview], ['daten', T.specs], ...(hasCfg ? [['konfigurator', T.configurator]] : []), ['downloads', T.downloads], ...(related.length ? [['aehnlich', T.related]] : [])];
  let cfgData = null;
  if (hasCfg) {
    const cls = classifyOptions(p.options.de || p.options[dl]);
    cfgData = { id: p.id, code: p.code, area: p.area, kind: p.kind, install: p.install, form: p.form, made: p.made, options: markMulti(p.options[dl] || p.options.de, cls.r), deps: p.deps, weeks: p.weeks, ...cls };
  }
  return `<div class="wrap pd-top">${crumbs(ctx, [[t.nav.products, href('products')], [t.lbl.area[p.area], href('area', { area: p.area })], [p.code]])}</div>
<section class="section section--flush">
  <div class="wrap pd">
    <div class="gallery" data-gallery>
      ${imgs.length ? `<button class="gallery__main" type="button" data-gallery-main aria-label="${esc(T.zoom)}">
        ${imgTag(ctx, imgs[0], { alt: `${p.code} – ${desc}`, sizes: '(max-width: 900px) 100vw, 58vw', eager: true, max: 1600, cls: imgFit(ctx, imgs[0]), lowres: 760 })}
      </button>` : drawingGallery(ctx, p)}
      ${imgs.length > 1 ? `<div class="gallery__thumbs" role="list" aria-label="${esc(T.gallery)}">${imgs.map((k, i) => `<button type="button" role="listitem" data-gallery-thumb="${i}" data-full="${ctx.imgUrl(k, 1600)}" data-srcset="${imgSrcset(ctx, k, 1600)}"${ctx.img[k].w < 760 ? ` data-sizes="${ctx.img[k].w}px" data-lowres` : ''} aria-current="${i === 0}" aria-label="${esc(T.gallery)} ${i + 1}">${imgTag(ctx, k, { alt: '', sizes: '76px', max: 320 })}</button>`).join('')}</div>` : ''}
      ${imgs.length && !p.catalog && p.images.some((k) => k.startsWith('mimg/')) ? `<p class="small faint">${esc(T.imageNote)}</p>` : ''}
    </div>
    <div class="pd__summary">
      <div class="stack" style="--s:.5rem"><span class="area__kv">${esc(t.lbl.area[p.area])}</span><h1 class="pd__code">${esc(p.code)}</h1><p class="pd__name"${langAttr(descriptorLang(p, lang), lang)}>${esc(desc)}</p></div>
      <div class="pd__tags">${tags.join('')}</div>
      ${ks.length ? `<dl class="pd__keyspecs">${ks.map(([k, v]) => `<div class="ks"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      <div class="pd__actions">
        ${hasCfg ? `<a class="btn btn--red btn--block" href="#konfigurator">${icon('sliders')}${esc(t.ui.configure)}</a>` : `<button class="btn btn--red btn--block" type="button" data-basket-add="${esc(p.id)}">${icon('plus')}${esc(t.ui.addInquiry)}</button>`}
        <div class="row">
          ${datasheet ? `<a class="btn btn--ghost" ${ctx.docAttrs(datasheet)}>${ctx.docHref(datasheet) ? `${icon('download')}${esc(t.ui.datasheet)}` : `${icon('mail')}${esc(t.downloads.req.datasheet)}`}</a>` : ''}
          <button class="btn btn--ghost" type="button" data-compare-toggle="${esc(p.id)}" aria-pressed="false">${icon('compare')}${esc(t.ui.compare)}</button>
        </div>
      </div>
      ${person ? `<div class="pd__contact"><b>${esc(T.askTitle)}</b><span>${esc(T.askText)}</span><span>${esc(person.name)}${person.role ? ', ' + esc(person.role[lang] || person.role.en || '') : ''}</span>
        ${person.phone ? `<a href="tel:${esc(person.phone.replace(/[^\d+]/g, ''))}">${icon('phone', 'width="16" height="16"')} ${phoneTxt(person.phone)}</a>` : ''}
        ${person.email ? `<a href="mailto:${esc(person.email)}?subject=${encodeURIComponent(p.code)}">${icon('mail', 'width="16" height="16"')} ${esc(person.email)}</a>` : ''}</div>` : ''}
    </div>
  </div>
  <nav class="pd-tabs" aria-label="${esc(p.code)}"><div class="wrap pd-tabs__list" data-tabs>${tabs.map(([id, label], i) => `<a href="#${id}"${i === 0 ? ' class="is-active"' : ''}>${esc(label)}</a>`).join('')}</div></nav>
  <div class="wrap">
    <section class="pd-sec" id="ueberblick">
      <h2>${esc(T.overview)}</h2>
      <div class="split">
        <div class="prose">
          ${famText ? `<p class="pull"${fla}>${esc(famText)}</p>` : ''}
          ${textDesc.map((x) => `<p${dla}>${esc(x)}</p>`).join('')}
          ${p.news ? `<h3>${esc(T.newsTitle)}</h3><p${nla}>${esc(p.news[dl] || p.news.en)}</p>` : ''}
          ${p.railText ? `<h3>${esc(T.railTitle)}</h3><p${nla}>${esc(p.railText[dl] || p.railText.en)}</p>` : ''}
          ${ctx.lang !== dl ? `<p class="small faint">${esc(t.ui.dataLangNote)}</p>` : ''}
        </div>
        <div>${feats.length ? `<h3 class="h4">${esc(T.features)}</h3>${ticks(feats)}` : ''}</div>
      </div>
    </section>
    <section class="pd-sec" id="daten">
      <h2>${esc(T.specs)}</h2>
      ${specTable(ctx, p)}
    </section>
    ${hasCfg ? `<section class="pd-sec" id="konfigurator">
      <h2>${esc(T.configurator)}</h2>
      <p class="muted prose">${esc(T.cfgIntro)}</p>
      <div class="cfg" data-config="${esc(p.id)}"><noscript><p>${esc(T.noConfig)}</p></noscript><div class="loader" aria-hidden="true"></div></div>
      <script type="application/json" data-config-json="${esc(p.id)}">${JSON.stringify(cfgData).replace(/</g, '\\u003c')}</script>
    </section>` : `<section class="pd-sec" id="anfrage"><div class="notice">${esc(T.noConfig)}</div><p><button class="btn" type="button" data-basket-add="${esc(p.id)}">${icon('plus')}${esc(t.ui.addInquiry)}</button></p></section>`}
    <section class="pd-sec" id="downloads">
      <h2>${esc(T.downloads)}</h2>
      ${docs.length ? `${docsRequestAll(ctx, p, docs)}<div class="docs">${docs.map((d) => docRow(ctx, d)).join('')}</div>` : `<p class="muted">${esc(T.docsEmpty)}</p>`}
    </section>
    ${related.length ? `<section class="pd-sec" id="aehnlich"><h2>${esc(T.related)}</h2><div class="pgrid">${related.map((r) => productCard(ctx, r)).join('')}</div></section>` : ''}
  </div>
</section>
<section class="section section--tight"><div class="wrap">${ctaBand(ctx, t.pages.home.ctaTitle, t.pages.home.ctaText, t.pages.home.ctaBtn, href('inquiry'))}</div></section>`;
}

function summarySpecs(ctx, p) {
  const { t, lang } = ctx;
  const s = keySpecs(p, t, lang);
  if (p.ith) s.push([t.lbl.spec.ith, fmtRange(p.ith, lang, 'kA')]);
  if (p.weeks) s.push([t.lbl.spec.weeks, `${fmtRange(p.weeks, lang)} ${t.ui.weeks}`]);
  if (p.specs?.imax) s.push([t.lbl.spec.imax, `${fmtNum(p.specs.imax, lang)} A`]);
  return s.slice(0, 6);
}

function specTable(ctx, p) {
  const rows = specRows(ctx, p);
  const half = Math.ceil(rows.length / 2);
  const tbl = (rs) => `<table class="spec"><tbody>${rs.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>`;
  return `<div class="spec-cols">${tbl(rows.slice(0, half))}${tbl(rows.slice(half))}</div>${p.weeks ? `<p class="small faint">${esc(ctx.t.product.deliveryNote)}</p>` : ''}`;
}

function relatedProducts(ctx, p) {
  const same = ctx.data.products.filter((x) => x.id !== p.id && x.area === p.area && KIND_GROUP[x.kind] === KIND_GROUP[p.kind]);
  const score = (x) => (x.dk?.n === p.dk?.n ? 3 : 0) + (x.install.some((i) => p.install.includes(i)) ? 1 : 0) + ((x.um || []).some((u) => (p.um || []).includes(u)) ? 2 : 0) + (x.code.split(' ')[0] === p.code.split(' ')[0] ? 2 : 0);
  return same.map((x) => [x, score(x)]).sort((a, b) => b[1] - a[1] || a[0].code.localeCompare(b[0].code, 'de', { numeric: true })).slice(0, 4).map((x) => x[0]);
}

// ---------------- Produktfinder ----------------
export function finderPage(ctx) {
  const { t, href } = ctx;
  const F = t.finder;
  const initial = ctx.data.products.slice().sort((a, b) => a.code.localeCompare(b.code, 'de', { numeric: true })).slice(0, 24);
  return `${phead(ctx, { title: F.title, lead: F.lead, crumbs: [[t.nav.products, href('products')], [F.title]], cls: 'phead--compact' })}
<section class="section section--tight">
  <div class="wrap finder" data-finder>
    <aside class="filters" data-filters aria-label="${esc(t.ui.filters)}">
      <div class="filters__head"><h2>${esc(t.ui.filters)}</h2><button class="link" type="button" data-filters-reset>${esc(t.ui.resetFilters)}</button><button class="icon-btn filters__close" type="button" data-filters-close aria-label="${esc(t.ui.close)}">${icon('close')}</button></div>
      <div data-facets><p class="muted small">${esc(t.ui.loading)}</p></div>
      <div class="filters__apply"><button class="btn btn--block" type="button" data-filters-close>${esc(t.ui.show)} <span data-count-inline></span></button></div>
    </aside>
    <div class="finder__main">
      <div class="finder__search">${icon('search')}<label class="vh" for="finder-q">${esc(F.searchPh)}</label><input class="input" id="finder-q" type="search" placeholder="${esc(F.searchPh)}" data-finder-q autocomplete="off"></div>
      <div class="finder__bar">
        <p class="finder__count" aria-live="polite"><b data-count>${ctx.data.products.length}</b> ${esc(F.count)}</p>
        <div class="finder__controls">
          <button class="btn btn--ghost btn--small filters-open" type="button" data-filters-open>${icon('filter')}${esc(F.openFilters)} <span data-filters-active></span></button>
          <label class="vh" for="finder-sort">${esc(t.ui.sortBy)}</label>
          <select class="select" id="finder-sort" data-finder-sort>${Object.entries(F.sort).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>
          <div class="view-toggle" role="group" aria-label="${esc(t.ui.viewGrid)}"><button type="button" data-view="grid" aria-pressed="true" aria-label="${esc(t.ui.viewGrid)}">${icon('grid')}</button><button type="button" data-view="list" aria-pressed="false" aria-label="${esc(t.ui.viewList)}">${icon('list')}</button></div>
        </div>
      </div>
      <div class="active-filters" data-active-filters></div>
      <div class="pgrid" data-results>${initial.map((p) => productCard(ctx, p)).join('')}</div>
      <div class="finder__more" data-more></div>
      <noscript><p class="notice">${esc(F.lead)}</p></noscript>
    </div>
  </div>
</section>`;
}

// ---------------- Vergleich ----------------
export function comparePage(ctx) {
  const { t, href } = ctx;
  const C = t.compare;
  return `${phead(ctx, { title: C.title, lead: C.lead, crumbs: [[t.nav.products, href('products')], [C.title]], cls: 'phead--compact' })}
<section class="section section--tight"><div class="wrap" data-compare>
  <div class="empty"><h2 class="h3">${esc(C.empty)}</h2><p>${esc(C.emptyHint)}</p><a class="btn" href="${href('finder')}">${esc(t.ui.openFinder)}</a></div>
</div></section>`;
}

// ---------------- Projektmappe / Anfrage ----------------
export function inquiryPage(ctx) {
  const { t, href } = ctx;
  const I = t.inquiry, M = t.x.mappe;
  const countries = countryOptions(ctx);
  const btn = (attr, ic, label, extra = '') => `<button class="btn btn--ghost btn--small" type="button" ${attr}${extra}>${icon(ic)}${esc(label)}</button>`;
  return `${phead(ctx, { title: I.title, lead: I.lead, crumbs: [[t.x.hub.title, href('tools')], [I.title]], cls: 'phead--compact' })}
<section class="section section--tight">
  <div class="wrap pm" data-mappe>
    <div class="pm__main">
      <div class="pm__import" data-pm-import role="region" aria-label="${esc(M.importTitle)}" hidden></div>
      <div class="pm__meta">
        <div class="field"><label for="pm-name">${esc(M.projectName)}</label><input class="input" id="pm-name" data-pm="name" maxlength="120" autocomplete="off"></div>
        <div class="field"><label for="pm-ref">${esc(M.projectRef)}</label><input class="input" id="pm-ref" data-pm="ref" maxlength="80" autocomplete="off"></div>
        <div class="field"><label for="pm-due">${esc(M.due)}</label><input class="input" id="pm-due" data-pm="due" type="date"></div>
        <div class="field"><label for="pm-buffer">${esc(M.buffer)}</label><select class="select" id="pm-buffer" data-pm="buffer">${[0, 1, 2, 3, 4, 6].map((n) => `<option value="${n}"${n === 1 ? ' selected' : ''}>${esc(ctx.plural(n, M.weeks))}</option>`).join('')}</select></div>
      </div>
      <p class="pm__plan" data-pm-plan>${esc(M.planHint)}</p>
      <div class="pm__bar">
        <h2 class="h3">${esc(I.listTitle)} <span class="faint" data-pm-count></span></h2>
        <div class="cluster" data-pm-actions hidden>
          ${btn('data-pm-renumber', 'list', M.renumber)}${btn('data-pm-tender', 'file', M.tender, ' aria-expanded="false" aria-controls="pm-tender"')}${btn('data-pm-csv', 'download', M.csv)}${btn('data-pm-share', 'external', M.share)}${ctx.mode === 'spa' ? '' : btn('data-pm-print', 'print', M.print)}
          <span class="pm__confirm" data-pm-clearbox><button class="link small" type="button" data-basket-clear>${esc(I.clear)}</button></span>
        </div>
      </div>
      <div data-basket-list><div class="empty"><h3>${esc(I.empty)}</h3><p>${esc(I.emptyHint)}</p><div class="cluster" style="justify-content:center"><a class="btn" href="${href('finder')}">${esc(t.ui.openFinder)}</a><a class="btn btn--ghost" href="${href('assistant')}">${esc(t.x.assist.title)}</a></div></div></div>
      <details class="pm__tender" id="pm-tender" data-pm-tenderbox hidden><summary>${esc(M.tenderTitle)}</summary><p class="small muted" style="padding:0 14px">${esc(M.tenderHint)}</p><pre class="copybox" tabindex="0" data-pm-tendertext></pre><div class="cluster"><button class="btn btn--small" type="button" data-pm-tendercopy>${icon('copy')}${esc(M.copyAll)}</button></div></details>
    </div>
    <form class="basket__form" data-inquiry-form novalidate>
      <h2 class="h3">${esc(I.formTitle)}</h2>
      <p class="pm__form-intro">${esc(M.formIntro)}</p>
      ${ctx.mode === 'spa' ? `<p class="notice small">${esc(I.previewNote)}</p>` : ''}
      <div class="form-grid">
        <div class="field full"><label for="f-company">${esc(I.company)} *</label><input class="input" type="text" id="f-company" name="company" required autocomplete="organization"></div>
        <div class="field full"><label for="f-name">${esc(I.name)} *</label><input class="input" type="text" id="f-name" name="name" required autocomplete="name"></div>
        <div class="field"><label for="f-email">${esc(I.email)} *</label><input class="input" id="f-email" name="email" type="email" required autocomplete="email"></div>
        <div class="field"><label for="f-phone">${esc(I.phone)}</label><input class="input" id="f-phone" name="phone" type="tel" autocomplete="tel"></div>
        <div class="field full"><label for="f-country">${esc(I.country)} *</label><select class="select" id="f-country" name="country" required autocomplete="country"><option value="">–</option>${countries}</select></div>
        <div class="field full"><label for="f-msg">${esc(I.message)}</label><textarea class="textarea" id="f-msg" name="message" placeholder="${esc(I.messagePh)}"></textarea></div>
        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="check full"><input type="checkbox" name="privacy" required><span>${tpl(esc(I.privacy), { link: `<a href="${href('privacy')}" target="_blank">${esc(I.privacyLink)}</a>` })}</span></label>
      </div>
      <div class="err" data-form-error role="alert" hidden></div>
      <button class="btn btn--red btn--block" type="submit">${esc(I.submit)}</button>
      <div data-form-success hidden></div>
    </form>
  </div>
</section>`;
}

export function countryOptions(ctx) {
  const set = new Map();
  for (const r of ctx.data.contacts.reps) if (r.country && r.country.length === 2) set.set(r.country, ctx.lang === 'de' ? r.country_de : r.country_en);
  for (const [c, de, en] of [['DE', 'Deutschland', 'Germany'], ['AT', 'Österreich', 'Austria'], ['CH', 'Schweiz', 'Switzerland'], ['HU', 'Ungarn', 'Hungary'], ['CN', 'China', 'China'], ['US', 'USA', 'USA'], ['AE', 'Vereinigte Arabische Emirate', 'United Arab Emirates'], ['IT', 'Italien', 'Italy']]) if (!set.has(c)) set.set(c, ctx.lang === 'de' ? de : en);
  let dn = null;
  try { dn = new Intl.DisplayNames([ctx.lang], { type: 'region' }); } catch (e) { /* ignore */ }
  const list = [...set.entries()].map(([c, n]) => [c, (dn && dn.of(c)) || n]).sort((a, b) => a[1].localeCompare(b[1], ctx.lang));
  return list.map(([c, n]) => `<option value="${c}">${esc(n)}</option>`).join('') + `<option value="other">${esc(ctx.t.inquiry.countryOther || '…')}</option>`;
}
