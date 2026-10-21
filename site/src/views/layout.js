// Seitenrahmen: Kopf, Mega-Menüs, Drawer, Fuß, Seitenkopf, Bausteine
import { esc, icon, LOGO, tpl, cls, imgTag, fmtNum, phoneTxt } from '../lib/util.js';
import { LANGS, LANG_NAMES, AREAS, SECTORS } from '../lib/routes.js';

export const GROUP_ANCHORS = {
  mittelspannung: ['ms.indoor.ct', 'ms.indoor.vt', 'ms.outdoor.ct', 'ms.metalclad', 'ms.pq'],
  niederspannung: ['ns.window', 'ns.bushing', 'ns.splitcore', 'ns.vt'],
  hochspannung: [],
  'elektronik-sensoren': ['es.electronic', 'es.current', 'es.voltage'],
  'stromschienen-sis': [],
  'giessharzteile-duromer': [],
};
export const anchorId = (g) => 'g-' + g.replace(/\./g, '-');

export function header(ctx) {
  const { t, href } = ctx;
  const n = t.nav;
  const cur = ctx.route?.id || '';
  const active = (ids) => (ids.includes(cur) ? ' is-active' : '');
  const megaBtn = (key, label, ids) =>
    `<div class="nav__item"><button class="nav__link${active(ids)}" type="button" aria-expanded="false" aria-controls="mega-${key}" data-mega="${key}">${esc(label)}${icon('down')}</button></div>`;
  const link = (id, label) => `<div class="nav__item"><a class="nav__link${active([id, id === 'news' ? 'article' : id, id === 'career' ? 'training' : '', id === 'career' ? 'internships' : ''])}" href="${href(id)}"${cur === id ? ' aria-current="page"' : ''}>${esc(label)}</a></div>`;
  return `<header class="hdr" data-hdr>
  <div class="wrap hdr__bar">
    <a class="logo" href="${href('home')}" aria-label="RITZ – ${esc(t.ui.home)}">${LOGO}</a>
    <nav class="nav" aria-label="${esc(t.ui.mainNav)}">
      ${megaBtn('products', n.products, ['products', 'area', 'product', 'finder', 'compare'])}
      ${megaBtn('sectors', n.sectors, ['sectors', 'sector'])}
      <div class="nav__item"><a class="nav__link${active(['tools', 'assistant', 'calculators'])}" href="${href('tools')}"${cur === 'tools' ? ' aria-current="page"' : ''}>${esc(n.tools)}</a></div>
      ${link('downloads', n.downloads)}
      ${megaBtn('company', n.company, ['company', 'locations', 'quality', 'responsibility', 'references'])}
      ${link('career', n.career)}
      ${link('news', n.news)}
    </nav>
    <div class="hdr__tools">
      <button class="icon-btn" type="button" data-search-open aria-label="${esc(t.ui.search)} (Ctrl+K)" title="${esc(t.ui.search)}">${icon('search')}</button>
      <a class="icon-btn" href="${href('inquiry')}" data-basket-link aria-label="${esc(t.ui.inquiryList)}" title="${esc(t.ui.inquiryList)}">${icon('clipboard')}<span class="badge-count" data-basket-count hidden>0</span></a>
      ${langSwitch(ctx)}
      <a class="btn btn--small hdr__cta" href="${href('contact')}">${esc(t.ui.contactCta)}</a>
      <button class="icon-btn burger" type="button" data-drawer-open aria-label="${esc(t.ui.menu)}" aria-expanded="false" aria-controls="drawer">${icon('menu')}</button>
    </div>
  </div>
  ${megaProducts(ctx)}
  ${megaSectors(ctx)}
  ${megaCompany(ctx)}
</header>`;
}

function langSwitch(ctx) {
  const { lang, t } = ctx;
  return `<div class="lang" data-lang>
    <button class="lang__btn" type="button" aria-expanded="false" aria-controls="lang-menu" aria-label="${esc(t.ui.lang)}: ${esc(LANG_NAMES[lang])}">${icon('globe', 'width="16" height="16"')}${lang.toUpperCase()}</button>
    <div class="lang__menu" id="lang-menu" hidden>
      ${LANGS.map((l) => `<a href="${ctx.langHref(l)}" hreflang="${l}" lang="${l}" data-lang-link="${l}"${l === lang ? ' aria-current="true"' : ''}>${esc(LANG_NAMES[l])}<span>${l.toUpperCase()}</span></a>`).join('')}
    </div>
  </div>`;
}

function megaProducts(ctx) {
  const { t, href } = ctx;
  const col = (areas) => `<div class="mega__col">${areas.map((a) => `
      <a class="mega__title" href="${href('area', { area: a })}">${esc(t.lbl.area[a])}<span class="kv">${esc(t.lbl.areaRange[a])}</span></a>
      <ul class="mega__list">${(GROUP_ANCHORS[a] || []).map((g) => `<li><a href="${ctx.hrefA('area', { area: a }, anchorId(g))}">${esc(t.lbl.group[g])}</a></li>`).join('')}
      ${(GROUP_ANCHORS[a] || []).length ? '' : `<li><a href="${href('area', { area: a })}">${esc(t.lbl.areaShort[a])}</a></li>`}</ul>`).join('')}</div>`;
  return `<div class="mega" id="mega-products" data-mega-panel="products" hidden>
    <div class="wrap mega__inner">
      ${col(['mittelspannung', 'niederspannung'])}
      ${col(['hochspannung', 'elektronik-sensoren'])}
      ${col(['stromschienen-sis', 'giessharzteile-duromer'])}
      <div class="mega__feature">
        <strong class="h4">${esc(t.nav.megaFinderTitle)}</strong>
        <p>${esc(t.nav.megaFinderText)}</p>
        <a class="btn btn--light btn--small" href="${href('finder')}">${esc(t.ui.openFinder)}</a>
        <a class="link link--light" href="${href('assistant')}">${esc(t.x.assist.title)}</a>
        <a class="link link--light" href="${href('products')}">${esc(t.ui.allProducts)}</a>
      </div>
    </div>
  </div>`;
}

function megaSectors(ctx) {
  const { t, href } = ctx;
  const S = t.pages.sectors.items;
  return `<div class="mega" id="mega-sectors" data-mega-panel="sectors" hidden>
    <div class="wrap mega__simple">
      ${SECTORS.map((s) => `<a class="mega__card" href="${href('sector', { sector: s })}"><strong>${esc(S[s].title)}</strong><span>${esc(S[s].short)}</span></a>`).join('')}
      <a class="mega__card" href="${href('sectors')}"><strong>${esc(t.nav.sectors)}</strong><span>${esc(t.pages.sectors.lead)}</span></a>
    </div>
  </div>`;
}

function megaCompany(ctx) {
  const { t, href } = ctx;
  const P = t.pages;
  const items = [['company', t.nav.about, t.nav.megaCompanyText], ['locations', t.nav.locations, P.locations.lead], ['quality', t.nav.quality, P.quality.lead],
    ['responsibility', t.nav.responsibility, P.responsibility.lead], ['references', t.nav.references, P.references.lead], ['career', t.nav.career, t.nav.megaCareerText],
    ['news', t.nav.news, P.news.lead], ['contact', t.nav.contact, P.contact.lead]];
  return `<div class="mega" id="mega-company" data-mega-panel="company" hidden>
    <div class="wrap mega__simple">
      ${items.map(([id, title, text]) => `<a class="mega__card" href="${href(id)}"><strong>${esc(title)}</strong><span>${esc(shorten(text, 110))}</span></a>`).join('')}
    </div>
  </div>`;
}

export function shorten(s, n) {
  s = String(s || '');
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:–-]$/, '') + ' …';
}

export function drawer(ctx) {
  const { t, href } = ctx;
  const sum = (label) => `<summary>${esc(label)}${icon('down')}</summary>`;
  return `<div class="drawer" id="drawer" data-drawer hidden>
  <div class="drawer__scrim" data-drawer-close></div>
  <div class="drawer__panel" role="dialog" aria-modal="true" aria-label="${esc(t.ui.menu)}">
    <div class="drawer__head"><a class="logo" href="${href('home')}" aria-label="RITZ">${LOGO}</a><button class="icon-btn" type="button" data-drawer-close aria-label="${esc(t.ui.close)}">${icon('close')}</button></div>
    <button class="btn btn--ghost btn--block" type="button" data-search-open>${icon('search')}${esc(t.ui.search)}</button>
    <ul class="mnav">
      <li><details>${sum(t.nav.products)}<ul>
        ${AREAS.map((a) => `<li><a href="${href('area', { area: a })}">${esc(t.lbl.area[a])}</a></li>`).join('')}
        <li><a href="${href('finder')}">${esc(t.nav.finder)}</a></li><li><a href="${href('products')}">${esc(t.ui.allProducts)}</a></li>
      </ul></details></li>
      <li><details>${sum(t.nav.sectors)}<ul>
        ${SECTORS.map((s) => `<li><a href="${href('sector', { sector: s })}">${esc(t.pages.sectors.items[s].title)}</a></li>`).join('')}
      </ul></details></li>
      <li><details>${sum(t.nav.tools)}<ul>
        <li><a href="${href('assistant')}">${esc(t.x.assist.title)}</a></li><li><a href="${href('calculators')}">${esc(t.x.calc.title)}</a></li>
        <li><a href="${href('inquiry')}">${esc(t.ui.inquiryList)}</a></li><li><a href="${href('tools')}">${esc(t.x.hub.title)}</a></li>
      </ul></details></li>
      <li><a href="${href('downloads')}">${esc(t.nav.downloads)}</a></li>
      <li><details>${sum(t.nav.company)}<ul>
        <li><a href="${href('company')}">${esc(t.nav.about)}</a></li><li><a href="${href('locations')}">${esc(t.nav.locations)}</a></li>
        <li><a href="${href('quality')}">${esc(t.nav.quality)}</a></li><li><a href="${href('responsibility')}">${esc(t.nav.responsibility)}</a></li>
        <li><a href="${href('references')}">${esc(t.nav.references)}</a></li>
      </ul></details></li>
      <li><details>${sum(t.nav.career)}<ul>
        <li><a href="${href('career')}">${esc(t.nav.jobs)}</a></li><li><a href="${href('training')}">${esc(t.nav.training)}</a></li><li><a href="${href('internships')}">${esc(t.nav.internships)}</a></li>
      </ul></details></li>
      <li><a href="${href('news')}">${esc(t.nav.news)}</a></li>
      <li><a href="${href('contact')}">${esc(t.nav.contact)}</a></li>
    </ul>
    <div class="cluster">${LANGS.map((l) => `<a class="chip${l === ctx.lang ? ' is-on' : ''}" href="${ctx.langHref(l)}" hreflang="${l}" lang="${l}" data-lang-link="${l}">${l.toUpperCase()}</a>`).join('')}</div>
    <a class="btn btn--red btn--block" href="${href('inquiry')}">${icon('clipboard')}${esc(t.ui.inquiryList)}<span class="badge-inline" data-basket-count hidden>0</span></a>
  </div>
</div>`;
}

export function footer(ctx) {
  const { t, href } = ctx;
  const F = t.footer;
  const year = new Date().getFullYear();
  return `<footer class="ftr">
  <div class="wrap">
    <div class="ftr__top">
      <div class="ftr__brand">
        <a class="logo" href="${href('home')}" aria-label="RITZ – ${esc(t.ui.home)}">${LOGO}</a>
        <p class="ftr__claim">${esc(F.claim)}</p>
        <p class="ftr__lead">${esc(F.lead)}</p>
        <address class="ftr__addr">RITZ Instrument Transformers GmbH<br>Wandsbeker Zollstraße 92–98<br>22041 Hamburg<br><a href="tel:+4940511230"><span class="nw">+49&nbsp;40&nbsp;51123&#8209;0</span></a><br><a href="mailto:info@ritz-international.com">info@ritz-international.com</a></address>
      </div>
      <nav aria-label="${esc(F.colProducts)}"><h2>${esc(F.colProducts)}</h2><ul>
        ${AREAS.map((a) => `<li><a href="${href('area', { area: a })}">${esc(t.lbl.area[a])}</a></li>`).join('')}
        <li><a href="${href('finder')}">${esc(t.nav.finder)}</a></li>
      </ul></nav>
      <nav aria-label="${esc(F.colService)}"><h2>${esc(F.colService)}</h2><ul>
        <li><a href="${href('downloads')}">${esc(t.nav.downloads)}</a></li><li><a href="${href('contact')}">${esc(t.nav.contact)}</a></li>
        <li><a href="${href('tools')}">${esc(t.nav.tools)}</a></li><li><a href="${href('assistant')}">${esc(t.x.assist.title)}</a></li>
        <li><a href="${href('inquiry')}">${esc(t.ui.inquiryList)}</a></li><li><a href="${href('sectors')}">${esc(t.nav.sectors)}</a></li>
        <li><a href="${href('quality')}">${esc(t.nav.quality)}</a></li>
      </ul></nav>
      <nav aria-label="${esc(F.colCompany)}"><h2>${esc(F.colCompany)}</h2><ul>
        <li><a href="${href('company')}">${esc(t.nav.about)}</a></li><li><a href="${href('locations')}">${esc(t.nav.locations)}</a></li>
        <li><a href="${href('responsibility')}">${esc(t.nav.responsibility)}</a></li><li><a href="${href('references')}">${esc(t.nav.references)}</a></li>
        <li><a href="${href('career')}">${esc(t.nav.career)}</a></li><li><a href="${href('news')}">${esc(t.nav.news)}</a></li>
      </ul></nav>
    </div>
    <div class="ftr__mid">
      ${ctx.img['misc/bmwi.png'] || ctx.img['misc/bmwi'] ? `<div class="ftr__funding">${imgTag(ctx, ctx.img['misc/bmwi'] ? 'misc/bmwi' : 'misc/bmwi.png', { alt: F.funding, sizes: '120px', max: 320 })}</div>` : ''}
      <p class="ftr__note">${icon('check', 'width="16" height="16"')}${esc(F.privacyNote)}</p>
    </div>
    <div class="ftr__bottom">
      <span>${esc(tpl(F.rights, { year }))}</span>
      <nav class="ftr__legal" aria-label="${esc(t.ui.footerNav)}">
        <a href="${href('imprint')}">${esc(t.nav.imprint)}</a><a href="${href('privacy')}">${esc(t.nav.privacy)}</a><a href="${href('search')}">${esc(t.nav.search)}</a>
      </nav>
      <div class="theme-toggle" role="group" aria-label="${esc(t.ui.theme)}" data-theme-toggle>
        <button type="button" data-theme-set="light" aria-pressed="false">${esc(t.ui.themeLight)}</button>
        <button type="button" data-theme-set="auto" aria-pressed="true">${esc(t.ui.themeAuto)}</button>
        <button type="button" data-theme-set="dark" aria-pressed="false">${esc(t.ui.themeDark)}</button>
      </div>
    </div>
  </div>
</footer>`;
}

export function searchOverlay(ctx) {
  const { t } = ctx;
  return `<div class="search" data-search hidden>
  <div class="search__panel" role="dialog" aria-modal="true" aria-label="${esc(t.search.title)}">
    <div class="search__field">${icon('search')}<input type="search" data-search-input placeholder="${esc(t.ui.searchPh)}" aria-label="${esc(t.ui.search)}" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="search-results" aria-autocomplete="list"><button class="icon-btn" type="button" data-search-close aria-label="${esc(t.ui.close)}">${icon('close')}</button></div>
    <div class="search__results" id="search-results" role="listbox" data-search-results></div>
    <div class="search__foot"><span>${esc(t.search.keys)}</span><span><kbd>Esc</kbd></span></div>
  </div>
</div>`;
}

export function crumbs(ctx, items) {
  if (!items || !items.length) return '';
  const { t, href } = ctx;
  const all = [[t.ui.home, href('home')], ...items];
  return `<nav aria-label="${esc(t.ui.breadcrumb)}"><ol class="crumbs">${all.map(([label, url, l], i) =>
    i === all.length - 1 || !url ? `<li><span aria-current="page"${l ? ` lang="${l}"` : ''}>${esc(label)}</span></li>` : `<li><a href="${url}">${esc(label)}</a></li>`).join('')}</ol></nav>`;
}

// Überschriften mit sehr langen Wörtern (z. B. „Niederspannungswandler“) erhalten auf Telefonen eine schmalere Schnittbreite
export const lw = (text) => (/[^\s\-–/]{18,}/.test(String(text || '')) ? ' class="lw"' : '');

export function phead(ctx, { title, lead, crumbs: cr, aside = '', image = null, imageAlt = '', h1 = null, cls: c = '', figure = false }) {
  const H = h1 || title;
  const m = image && ctx.img[image];
  // Niedrig aufgelöste Motive nicht als Vollbild-Hintergrund strecken, sondern als gerahmtes Bild zeigen
  if (m && (figure || m.w < 1200)) {
    const fit = m.bg === 'w' ? 'is-contain' : 'is-cover';
    return `<section class="phead phead--figure ${c}">
  <div class="wrap">${crumbs(ctx, cr)}
    <div class="phead__grid phead__grid--figure"><div><h1${lw(H)}>${esc(H)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}${aside ? `<div class="phead__aside phead__aside--inline">${aside}</div>` : ''}</div>
    <figure class="phead__fig">${imgTag(ctx, image, { alt: imageAlt, sizes: '(max-width: 900px) 100vw, 42vw', eager: true, cls: fit })}</figure></div>
  </div>
</section>`;
  }
  if (image && m) {
    return `<section class="phead phead--image ${c}">
  <div class="phead__bg">${imgTag(ctx, image, { alt: imageAlt, sizes: '100vw', eager: true })}</div>
  <div class="wrap">${crumbs(ctx, cr)}
    <div class="phead__grid"><div><h1${lw(H)}>${esc(H)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>${aside ? `<div class="phead__aside">${aside}</div>` : ''}</div>
  </div>
</section>`;
  }
  return `<section class="phead ${c}">
  <div class="wrap">${crumbs(ctx, cr)}
    <div class="phead__grid"><div><h1${lw(H)}>${esc(H)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>${aside ? `<div class="phead__aside">${aside}</div>` : ''}</div>
  </div>
</section>`;
}

export function sectionHead(title, lead = '', right = '', { level = 2, id = '', reveal = false } = {}) {
  return `<div class="section-head${right ? ' section-head--row' : ''}"${reveal ? ' data-reveal="head"' : ''}><div class="stack" style="--s:.75rem"><h${level}${id ? ` id="${id}"` : ''}${lw(title)}>${esc(title)}</h${level}>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>${right}</div>`;
}

export function ctaBand(ctx, title, text, btnLabel, url) {
  return `<div class="ctaband"><div><h2>${esc(title)}</h2><p>${esc(text)}</p></div><a class="btn" href="${url}">${esc(btnLabel)}</a></div>`;
}

// Personenkarte
export function personCard(ctx, p, extra = '') {
  const { t } = ctx;
  const role = p.role?.[ctx.lang] || p.role?.en || p.role?.de || '';
  return `<article class="person">
  ${extra ? `<span class="person__kind">${esc(extra)}</span>` : ''}
  <h3>${esc(p.name)}</h3>
  ${role ? `<p class="role">${esc(role)}</p>` : ''}
  <div class="lines">
    ${p.phone ? `<a href="tel:${esc(p.phone.replace(/[^\d+]/g, ''))}">${icon('phone')}<span>${phoneTxt(p.phone)}</span></a>` : ''}
    ${p.email ? `<span class="line-mail"><a href="mailto:${esc(p.email)}">${icon('mail')}<span>${esc(p.email)}</span></a><button class="copy" type="button" data-copy="${esc(p.email)}" aria-label="${esc(t.ui.copy)}: ${esc(p.email)}">${icon('copy', 'width="15" height="15"')}</button></span>` : ''}
  </div>
</article>`;
}

// Dokumentzeile
export function docRow(ctx, d) {
  const { t, lang } = ctx;
  const title = d.title[lang] || d.title[ctx.dl] || d.title.de || d.title.en || d.file;
  const L = { de: 'DE', en: 'EN', 'de+en': 'DE/EN', fr: 'FR', es: 'ES', hu: 'HU' }[d.lang] || '';
  // Sprache des angezeigten Titels (für Screenreader), wenn sie von der Seitensprache abweicht
  const tl = d.title.de === title && d.title.en === title ? (/^(de|en|fr|es|hu)$/.test(d.lang || '') ? d.lang : lang)
    : d.title.de === title ? 'de' : d.title.en === title ? 'en' : lang;
  const size = d.size ? ctx.fmtBytes(d.size) : '';
  const local = !!ctx.docHref(d);
  const R = t.downloads.req;
  return `<a class="doc${local ? '' : ' doc--req'}" ${ctx.docAttrs(d)} data-doc-id="${d.id}">
  <span class="doc__icon" aria-hidden="true">${esc((d.ext || 'pdf').toUpperCase())}</span>
  <span><span class="doc__title"${tl !== lang ? ` lang="${tl}"` : ''}>${esc(title)}</span><span class="doc__meta"><span>${esc(t.lbl.docTypeOne[d.type] || '')}</span>${local ? (size ? `<span>${esc(size)}</span>` : '') : `<span>${esc(R.onRequest)}</span>`}</span></span>
  ${L ? `<span class="doc__lang" title="${esc(L)}">${esc(L)}</span>` : '<span></span>'}
  <span class="doc__go">${local ? `${icon('download')}<span class="vh">${esc(t.ui.download)}</span>` : `${icon('mail')}<span class="doc__req">${esc(R.doc)}</span>`}</span>
</a>`;
}

export function factsRow(facts, { dark = false } = {}) {
  return `<div class="facts${dark ? '' : ' facts--light'}">${facts.map(([a, b]) => `<div class="fact"><strong>${esc(a)}</strong><span>${esc(b)}</span></div>`).join('')}</div>`;
}

export function ticks(list) {
  return `<ul class="ticks">${list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
}

export { cls, fmtNum };
