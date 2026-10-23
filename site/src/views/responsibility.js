// Verantwortung. Leitidee: „Verantwortung, die sich messen lässt.“ Ein Unternehmen, das Energie messbar macht, legt
// auch die eigene Wirkung offen – mit Messwerten und Nachweisen statt Absichtserklärungen.
// Kopf: Messprotokoll der CO₂-Reduktion 2021–2024 je Standort (Scope 1 und 2, aus dem RITZ-Dokument vom Juli 2025;
// die Balken schrumpfen beim Laden vom Stand 2021 auf den Stand 2024). Darunter Umwelt (Maßnahmen, zertifizierte
// Managementsysteme, EFRE-gefördertes LED-Projekt mit Pflichthinweis), die Vision, Gesellschaft (RITZ Stiftung und
// Engagement vor Ort), Unternehmensführung (Kodizes, Konfliktmineralien, AEO, Hinweisgebersystem) und alle Nachweise.
// Dokumente nur in den Sprachfassungen, in denen die bisherige Website sie zeigte (docIn wählt die Fassung).
import { esc, icon, imgTag, fmtDate, fmtNum, tpl } from '../lib/util.js';
import { crumbs, sectionHead, docRow, docIn } from './layout.js';
import { CO2_CUT, CO2_MEASURES, CERT_SCOPE, CERT_FILES, LED_PROJECT, FOUNDATION, ENGAGE, GOV_DOCS, RESP_EVIDENCE, WB_FORM } from '../lib/catalog.js';

const docByFile = (ctx, f) => ctx.data.docs.find((d) => d.file === f);
// erste Fassung einer Dateiliste, die diese Sprachfassung zeigt
const pickDoc = (ctx, files) => { for (const f of files) { const d = docIn(ctx, docByFile(ctx, f)); if (d) return d; } return null; };
const SITE_NAME = { kirchaich: 'Kirchaich', dresden: 'Ottendorf-Okrilla' };
const siteName = (ctx, id) => {
  const l = ctx.data.contacts.locations.find((x) => x.id === id);
  return SITE_NAME[id] || (l ? l.city.replace(/\s*\(.*\)$/, '') : id);
};
const siteCountry = (ctx, id) => (ctx.data.contacts.locations.find((x) => x.id === id) || {}).country || '';
const pct = (ctx, v) => `${v < 0 ? '−' : '+'}${fmtNum(Math.abs(v), ctx.lang)} %`;
const day = (ctx, iso) => fmtDate(iso, ctx.lang);
const month = (ctx, iso) => fmtDate(iso, ctx.lang, { month: 'long', year: 'numeric' });

// Linienzeichen der Maßnahmen (24er-Raster)
const MEASURE_ICON = {
  eff: '<path d="M3.6 16.6a8.6 8.6 0 0 1 16.8 0"/><path d="m12 16.4-4-4.6"/><circle cx="12" cy="16.4" r="1.4"/><path d="M3 19.6h18M16.8 9.4l1-1"/>',
  elec: '<path d="M7.5 3.5c1.6 2 .2 3.3.2 5 0 1.5 1.1 2.4 2.3 2.4s2.2-1 2.2-2.4c0-2.6-2.2-3.4-1.7-5.6" /><path d="M5 14h4M7 12v4"/><path d="m14.6 11.8-2.6 4.6h3.6L13 21"/><path d="M17 8h3.2M18.6 6.4 20.2 8l-1.6 1.6"/>',
  pv: '<path d="M4.6 12.2h14.8l2 7.4H2.6Z"/><path d="M3.6 15.9h16.8M9.5 12.2l-.7 7.4M14.5 12.2l.7 7.4"/><circle cx="12" cy="5.2" r="2"/><path d="M12 1.4v.8M8.3 5.2h-.8M16.5 5.2h-.8M9.4 2.6l.5.5M14.6 2.6l-.5.5"/>',
  green: '<path d="M8.5 3v4.2M15.5 3v4.2"/><path d="M6.4 7.2h11.2v3.6a5.6 5.6 0 0 1-11.2 0Z"/><path d="M12 16.4V21"/><path d="M10.2 12.6c.4-1.8 2.2-2.6 4-2.2-.3 1.8-2 2.8-4 2.2Z"/>',
};
const mIcon = (k) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${MEASURE_ICON[k] || ''}</svg>`;

export function responsibilityPage(ctx) {
  const R = ctx.t.pages.responsibility;
  const ids = ['umwelt', 'gesellschaft', 'unternehmensfuehrung', 'nachweise'];
  const tabs = `<nav class="pd-tabs pd-tabs--page" aria-label="${esc(R.tabsLabel)}"><div class="wrap pd-tabs__list" data-tabs>${R.tabs.map((x, i) => `<a href="#${ids[i]}"${i === 0 ? ' class="is-active"' : ''}>${esc(x)}</a>`).join('')}</div></nav>`;
  return [head(ctx, R), tabs, env(ctx, R), vision(ctx, R), society(ctx, R), governance(ctx, R), evidence(ctx, R)].join('\n');
}

// ---------- Kopf mit Messprotokoll ----------
function head(ctx, R) {
  const { t, href } = ctx;
  const P = R.proto;
  const doc = pickDoc(ctx, [CO2_CUT.doc]);
  const news = ctx.data.news.find((n) => n.id === CO2_CUT.news);
  const proof = doc ? `<a class="proto__proof" ${ctx.docAttrs(doc)}>${icon('download', 'width="15" height="15"')}<span>${esc(P.proof)}: ${esc(P.doc)}</span></a>`
    : news ? `<a class="proto__proof" href="${href('article', { slug: ctx.newsSlug(news) })}">${icon('arrow', 'width="15" height="15"')}<span>${esc(P.proof)}: ${esc(P.doc)}${esc(P.docLang)}</span></a>` : '';
  const rows = CO2_CUT.sites.map(([id, v], i) => `<tr style="--v:${((100 + v) / 100).toFixed(2)};--i:${i}">
        <th scope="row"><span class="proto__site">${esc(siteName(ctx, id))}</span><span class="proto__cc">${esc(siteCountry(ctx, id))}</span></th>
        <td><span class="proto__row"><span class="proto__bar" aria-hidden="true"><i></i></span><b class="proto__v">${esc(pct(ctx, v))}</b></span></td>
      </tr>`).join('');
  return `<section class="phead rs-hero">
  <div class="wrap">${crumbs(ctx, [[t.nav.company, href('company')], [R.title]])}
    <div class="rs-hero__grid">
      <div class="rs-hero__copy">
        <h1>${esc(R.h1)}</h1>
        <p class="lead">${esc(R.lead)}</p>
        <div class="cluster rs-hero__cta"><a class="btn btn--ghost" href="#nachweise">${icon('download')}${esc(R.ctaEvidence)}</a><a class="btn btn--ghost" href="#melden">${icon('mail')}${esc(R.ctaReport)}</a></div>
      </div>
      <figure class="proto">
        <div class="proto__head"><span class="proto__k">${esc(P.kicker)}</span><b class="proto__t">${esc(P.title)}</b><span class="proto__s">${esc(P.sub)}</span></div>
        <table class="proto__tab">
          <caption class="vh">${esc(P.cap)}</caption>
          <thead class="vh"><tr><th scope="col">${esc(P.site)}</th><th scope="col">${esc(P.change)}</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot aria-hidden="true"><tr><td></td><td><span class="proto__row"><span class="proto__scale"><span>0</span><span>${esc(P.scale)}</span></span><span class="proto__pad"></span></span></td></tr></tfoot>
        </table>
        <figcaption class="proto__foot">
          <span class="proto__legend" aria-hidden="true"><span><i class="proto__k24"></i>${esc(P.k24)}</span><span><i class="proto__ksv"></i>${esc(P.kSaved)}</span></span>
          <span class="proto__scope">${esc(R.scope)}</span>
          ${proof}
        </figcaption>
      </figure>
    </div>
  </div>
</section>`;
}

// ---------- Umwelt ----------
function env(ctx, R) {
  const { t, lang } = ctx;
  const tags = (list) => (list.length ? `<span class="rs-tags">${list.map((id) => `<span>${esc(siteName(ctx, id))}</span>`).join('')}</span>` : '');
  const measures = R.measures.map(([k, title, text]) => `<li class="meas__i">
        <span class="meas__ic">${mIcon(k)}</span>
        <div><h4>${esc(title)}</h4><p>${esc(text)}</p>${tags(CO2_MEASURES[k] || [])}</div>
      </li>`).join('');
  const certs = Object.entries(CERT_SCOPE).map(([key, c]) => {
    const doc = pickDoc(ctx, [CERT_FILES[key]]);
    return `<article class="ms">
        <div class="ms__top"><b class="ms__std">${esc(c.std)}</b><span class="ms__kind">${esc(R.certs[key])}</span></div>
        <p class="ms__sites"><span>${esc(tpl(R.certSites, { n: c.sites.length }))}</span>${c.sites.map((id) => esc(siteName(ctx, id))).join(', ')}</p>
        <p class="ms__valid">${esc(tpl(R.certValid, { date: day(ctx, c.valid) }))}<span>${esc(R.certBy)}</span></p>
        ${doc ? `<a class="ms__doc" ${ctx.docAttrs(doc)}>${icon(ctx.docHref(doc) ? 'download' : 'mail', 'width="15" height="15"')}<span>${esc(R.certDoc)}</span></a>` : ''}
      </article>`;
  }).join('');
  const led = pickDoc(ctx, [LED_PROJECT.doc]);
  const fund = ctx.img[LED_PROJECT.img] ? `<figure class="led__fund">${imgTag(ctx, LED_PROJECT.img, { alt: R.fundAlt, sizes: '(max-width: 760px) 90vw, 360px', max: 1280 }).replace('<img ', '<img lang="de" ')}</figure>` : '';
  return `<section class="section section--porcelain rs-env" id="umwelt" aria-labelledby="rs-env-t">
  <div class="wrap">
    ${sectionHead(R.envTitle, R.envLead, '', { id: 'rs-env-t' })}
    <div class="rs-env__grid">
      <div class="rs-env__m"><h3 class="rs-h">${esc(R.measuresTitle)}</h3><ul class="meas">${measures}</ul></div>
      <div class="rs-env__c"><h3 class="rs-h">${esc(R.certsTitle)}</h3><div class="ms-list">${certs}</div></div>
    </div>
    <article class="led" aria-labelledby="rs-led-t">
      <div class="led__body">
        <h3 id="rs-led-t">${esc(R.ledTitle)}</h3>
        <p>${esc(R.ledText)}</p>
        <dl class="led__facts">${R.ledFacts.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
        <p class="led__note">${esc(R.ledFund)}</p>
        ${led ? `<a class="link" ${ctx.docAttrs(led)}>${esc(R.ledDoc)}${icon('download', 'width="16" height="16"')}</a>` : ''}
      </div>
      ${fund}
    </article>
  </div>
</section>`;
}

// ---------- Vision: Strom als Energie der Zukunft ----------
function vision(ctx, R) {
  const { href } = ctx;
  return `<section class="section section--resin rs-vision" aria-labelledby="rs-vision-t">
  <div class="wrap rs-vision__grid">
    <h2 id="rs-vision-t">${esc(R.visionTitle)}</h2>
    <div class="rs-vision__body">
      <p>${esc(R.visionText)}</p>
      <div class="cluster"><a class="btn btn--light" href="${href('sector', { sector: 'erneuerbare' })}">${esc(ctx.t.pages.sectors.items.erneuerbare?.title || R.visionLinks[0])}</a><a class="btn btn--line" href="${href('quality')}">${esc(R.visionLinks[1])}</a></div>
    </div>
  </div>
</section>`;
}

// ---------- Gesellschaft ----------
function society(ctx, R) {
  const { href, lang } = ctx;
  const fn = ctx.data.news.find((n) => n.id === FOUNDATION.news);
  const fdoc = pickDoc(ctx, [FOUNDATION.doc]);
  const cards = ENGAGE.map(([id, img], i) => {
    const n = ctx.data.news.find((x) => x.id === id);
    const e = R.engage[i];
    if (!n || !e) return '';
    return `<li class="eng__i"><a href="${href('article', { slug: ctx.newsSlug(n) })}">
        <span class="eng__img">${ctx.img[img] ? imgTag(ctx, img, { alt: '', sizes: '(max-width: 760px) 100vw, (max-width: 1100px) 50vw, 25vw', max: 960, cover: 4 / 3 }) : ''}</span>
        <span class="eng__body"><time datetime="${n.date}">${esc(month(ctx, n.date))}</time><b>${esc(e[0])}</b><span>${esc(e[1])}</span></span>
      </a></li>`;
  }).join('');
  return `<section class="section rs-soc" id="gesellschaft" aria-labelledby="rs-soc-t">
  <div class="wrap">
    ${sectionHead(R.socTitle, R.socLead, '', { id: 'rs-soc-t' })}
    <article class="fdn" aria-labelledby="rs-fdn-t">
      <figure class="fdn__fig">${ctx.img[FOUNDATION.img] ? `<div class="fdn__img">${imgTag(ctx, FOUNDATION.img, { alt: R.fdnAlt, sizes: '(max-width: 900px) 100vw, 48vw', max: 1280 })}</div>` : ''}<figcaption>${esc(R.fdnCap)}</figcaption></figure>
      <div class="fdn__body">
        <h3 id="rs-fdn-t">${esc(R.fdnTitle)}</h3>
        ${R.fdnText.map((x) => `<p>${esc(x)}</p>`).join('')}
        <dl class="fdn__facts">${R.fdnFacts.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
        <div class="cluster">${fn ? `<a class="link" href="${href('article', { slug: ctx.newsSlug(fn) })}">${esc(R.fdnLink)}${icon('arrow', 'width="16" height="16"')}</a>` : ''}${fdoc ? `<a class="link" ${ctx.docAttrs(fdoc)}>${esc(R.fdnDoc)}${icon('download', 'width="16" height="16"')}</a>` : ''}<a class="link" href="${ctx.hrefA('company', {}, 'stiftung')}">${esc(R.fdnBoard)}${icon('arrow', 'width="16" height="16"')}</a></div>
      </div>
    </article>
    <h3 class="rs-h rs-h--sec">${esc(R.engageTitle)}</h3>
    <ul class="eng">${cards}</ul>
    <p class="rs-people">${esc(R.peopleText)} <a class="link" href="${href('career')}">${esc(R.peopleLink)}${icon('arrow', 'width="16" height="16"')}</a></p>
  </div>
</section>`;
}

// ---------- Unternehmensführung ----------
function governance(ctx, R) {
  const { t } = ctx;
  const codes = R.codes.map(([k, title, text, tags]) => {
    const doc = pickDoc(ctx, GOV_DOCS[k] || []);
    return `<article class="rule">
        <h3>${esc(title)}</h3>
        <p>${esc(text)}</p>
        ${tags.length ? `<ul class="rule__tags">${tags.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${doc ? `<a class="rule__doc" ${ctx.docAttrs(doc)}>${icon(ctx.docHref(doc) ? 'download' : 'mail', 'width="15" height="15"')}<span>${esc(R.codeDoc)}</span></a>` : ''}
      </article>`;
  }).join('');
  const wb = pickDoc(ctx, GOV_DOCS.wb);
  const newTab = tpl(t.footer.newTab, { name: '' }).trim();
  return `<section class="section section--porcelain rs-gov" id="unternehmensfuehrung" aria-labelledby="rs-gov-t">
  <div class="wrap">
    ${sectionHead(R.govTitle, R.govLead, '', { id: 'rs-gov-t' })}
    <div class="rs-gov__grid">
      <div class="rules">${codes}</div>
      <aside class="wb" id="melden" aria-labelledby="rs-wb-t">
        <h3 id="rs-wb-t">${esc(R.whTitle)}</h3>
        <p>${esc(R.whText)}</p>
        <ul class="wb__ways">${R.whWays.map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('')}</ul>
        <div class="wb__cta">
          <a class="btn btn--light" href="${esc(WB_FORM[ctx.lang] || WB_FORM.en)}" target="_blank" rel="noopener">${esc(R.whCta)}${icon('arrowUpRight', 'width="18" height="18"')}<span class="vh"> ${esc(newTab)}</span></a>
          ${wb ? `<a class="link link--light" ${ctx.docAttrs(wb)}>${esc(R.whDoc)}${icon('download', 'width="16" height="16"')}</a>` : ''}
        </div>
      </aside>
    </div>
  </div>
</section>`;
}

// ---------- Nachweise ----------
function evidence(ctx, R) {
  const rows = RESP_EVIDENCE.map(([area, files, when]) => {
    const d = pickDoc(ctx, files);
    if (!d) return '';
    const stamp = when.valid ? tpl(R.evValid, { date: day(ctx, when.valid) }) : when.since ? tpl(R.evSince, { date: day(ctx, when.since) }) : when.date ? tpl(R.evDate, { date: month(ctx, when.date) }) : '';
    return docRow(ctx, d, { meta: [R.evArea[area], stamp].filter(Boolean) });
  }).join('');
  return `<section class="section rs-ev" id="nachweise" aria-labelledby="rs-ev-t">
  <div class="wrap">
    ${sectionHead(R.evTitle, R.evLead, '', { id: 'rs-ev-t' })}
    <div class="docs docs--cols">${rows}</div>
  </div>
</section>`;
}
