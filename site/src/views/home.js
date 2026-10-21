// Startseite
import { esc, icon, imgTag, tpl, fmtDate, axisPos, AXIS_TICKS, fmtNum, htmlText, UM_STEPS } from '../lib/util.js';
import { parsePosition } from '../lib/spec.js';
import { matchProducts } from '../lib/match.js';
import { reqChipsHtml, markedText, homeHitsHtml } from '../lib/reqfmt.js';
import { AREAS, SECTORS } from '../lib/routes.js';
import { sectionHead, ctaBand, shorten } from './layout.js';
import { projectLL } from '../lib/geo.js';
import { CERT_FILES, LOC_IMG, HISTORY_IMG } from '../lib/catalog.js';
import { coversUm } from '../lib/product.js';

export const AREA_IMG = {
  niederspannung: 'mimg/ritz_header-niederspannung.webp', mittelspannung: 'mimg/ritz_header-mittelspannung.webp',
  hochspannung: 'mimg/Hochspannungswandler-Intro2.webp', 'elektronik-sensoren': 'mimg/ritz_header-elektronik.webp',
  'stromschienen-sis': 'mimg/SIS_Slider.webp', 'giessharzteile-duromer': 'mimg/ritz_header-duromer.webp',
};
export const SECTOR_IMG = {
  netze: 'mimg/2022__06__image_empowering_the_future.webp', schaltanlagenbau: 'mimg/2022__07__unternehmen_qualitaetsmanagement_wandler_pruefung.webp',
  industrie: 'mimg/Kundenreferenz-SIS-Projekt-BSW-3.webp', bahn: 'mimg/2022__07__sonderwandler_bahnwandler_gsefb.webp',
  erneuerbare: 'mimg/wind-energy-sq.webp', kraftwerke: 'mimg/IRBT-1.webp', messtechnik: 'mimg/2022__07__unternehmen_qualitaetsmanagement_schienen_pruefung.webp',
};
// Bänder der Spannungsachse
export const AXIS_BANDS = [
  ['niederspannung', 0.72, 3.6], ['mittelspannung', 3.6, 72.5], ['hochspannung', 72.5, 550], ['elektronik-sensoren', 0.72, 90], ['stromschienen-sis', 3.6, 72.5],
];

// Spannungsachse: logarithmische Skala, Bänder je Produktbereich, Sonde mit Trefferpunkten.
// Reines HTML (Prozent-Positionen), damit Schrift und Kreise bei jeder Breite unverzerrt bleiben.
const pct = (v) => `${(axisPos(v) * 100).toFixed(3)}%`;
export function voltageAxisPlot(ctx, { value = 24 } = {}) {
  const { t, lang } = ctx;
  const rowH = 20, gap = 6, top = 4;
  const axisY = top + AXIS_BANDS.length * (rowH + gap) + 4;
  const on = (lo, hi) => value >= lo - 1e-6 && value <= hi + 1e-6;
  const bands = AXIS_BANDS.map(([a, lo, hi], i) => {
    const y = top + i * (rowH + gap);
    const st = on(lo, hi) ? ' is-on' : ' is-dim';
    return `<span class="vaxis__band${st}" data-band="${a}" data-lo="${lo}" data-hi="${hi}" style="--bi:${i};left:${pct(lo)};width:${((axisPos(hi) - axisPos(lo)) * 100).toFixed(3)}%;top:${y}px;height:${rowH}px"><span>${esc(t.lbl.area[a])}</span></span>`;
  }).join('');
  const hits = AXIS_BANDS.map(([a, lo, hi], i) => `<i class="vaxis__hit${on(lo, hi) ? ' is-on' : ''}" data-lo="${lo}" data-hi="${hi}" style="top:${top + i * (rowH + gap) + rowH / 2}px"></i>`).join('');
  const ticks = AXIS_TICKS.map((v, i) => `<span class="vaxis__tick" style="left:${pct(v)}"><span>${esc(fmtNum(v, lang))}${i === AXIS_TICKS.length - 1 ? '&nbsp;kV' : ''}</span></span>`).join('');
  return `<div class="vaxis__scale" aria-hidden="true" style="--ay:${axisY}px;height:${axisY + 24}px">
    ${ticks}<span class="vaxis__line"></span>${bands}
    <span class="vaxis__probe" data-probe style="--p:${axisPos(value).toFixed(4)}">${hits}</span>
  </div>`;
}

export function voltageAxis(ctx, { dark = true, sweep = false } = {}) {
  const { t } = ctx;
  const H = t.pages.home;
  // Trefferzahl schon im HTML (sonst verschiebt das spätere Nachladen das Layout)
  const n0 = (ctx.data.products || []).filter((p) => coversUm(p, 24)).length;
  const nAll = UM_STEPS.map((v) => (ctx.data.products || []).filter((p) => coversUm(p, v)).length).join(',');
  return `<div class="vaxis${dark ? '' : ' vaxis--light'}" data-vaxis data-counts="${nAll}"${sweep ? ' data-vaxis-sweep' : ''}>
  <div class="vaxis__head">
    <span class="vaxis__title" id="vaxis-title">${esc(H.axisTitle)}</span>
    <span class="vaxis__readout"><strong data-vaxis-value>24&nbsp;kV</strong><span data-vaxis-count aria-live="polite">${n0 ? esc(tpl(H.axisMatches, { n: n0 })) : ''}</span></span>
  </div>
  <div class="vaxis__plot" data-vaxis-plot>
    ${voltageAxisPlot(ctx)}
    <input class="vaxis__range" type="range" min="0" max="1000" step="1" value="${Math.round(axisPos(24) * 1000)}" aria-labelledby="vaxis-title" aria-valuetext="24 kV" data-vaxis-range>
    <span class="vaxis__focus" aria-hidden="true"></span>
  </div>
  <div class="vaxis__foot"><span>${esc(H.axisHelp)}</span><a class="btn btn--light btn--small" data-vaxis-go href="${ctx.href('finder', {}, { um: '24' })}">${esc(H.axisOpen)}</a></div>
</div>`;
}

export function worldTeaser(ctx) {
  const locs = ctx.data.contacts.locations.filter((l) => l.lat);
  const W = ctx.data.worldmeta.W, Hh = ctx.data.worldmeta.H;
  const P = Object.fromEntries(locs.map((l) => [l.id, projectLL(ctx.data.worldmeta, l.lng, l.lat)]));
  const hq = locs.find((l) => l.type === 'hq');
  // Netzlinien: Bögen von der Zentrale zu jedem Werk und Standort (Reihenfolge nach Entfernung)
  const others = locs.filter((l) => l !== hq).sort((a, b) => Math.hypot(P[a.id][0] - P[hq.id][0], P[a.id][1] - P[hq.id][1]) - Math.hypot(P[b.id][0] - P[hq.id][0], P[b.id][1] - P[hq.id][1]));
  const arcs = hq ? others.map((l, i) => {
    const [x0, y0] = P[hq.id], [x1, y1] = P[l.id];
    const d = Math.hypot(x1 - x0, y1 - y0);
    const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - Math.max(10, d * 0.32);
    return `<path class="wt__arc" style="--i:${i}" pathLength="1" d="M${x0.toFixed(1)} ${y0.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`;
  }).join('') : '';
  const order = hq ? [hq, ...others] : locs;
  const dots = order.map((l, i) => {
    const [x, y] = P[l.id];
    return `<span class="wt__dot wt__dot--${l.type}" style="--i:${i};left:${((x / W) * 100).toFixed(2)}%;top:${((y / Hh) * 100).toFixed(2)}%" title="${esc(l.city)}"></span>`;
  }).join('');
  return `<div class="wt" data-reveal="net" aria-hidden="true"><img class="wl-lt" src="${ctx.base}img/world-lite.svg" alt="" width="1000" height="520" loading="lazy"><img class="wl-dk" src="${ctx.base}img/world-lite-dark.svg" alt="" width="1000" height="520" loading="lazy"><svg class="wt__net" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" focusable="false">${arcs}</svg>${dots}</div>`;
}

// Intro (einmal je Sitzung, jederzeit zu überspringen): das Messwandler-Prinzip. Ein großer Primärstrom läuft
// in den Ringkern, heraus kommt ein kleiner, proportionaler Sekundärstrom; dann setzt sich das RITZ-Zeichen
// Buchstabe für Buchstabe zusammen und fliegt an seinen Platz im Seitenkopf. Den Ablauf steuert das kleine
// Skript im Kopf der Startseite (build.mjs, introScript) über data-intro am Wurzelelement.
const LOGO_FRAME = 'M74.74,103.3h109.25l-54.62,29.99-54.62-29.99ZM12.89,70.11l51.17-28.1H194.66l51.17,28.1-51.17,27.57H64.06L12.89,70.11ZM129.36,6.64l54.62,29.76H74.74L129.36,6.64Zm.05-6.64L0,70.11l129.31,69.98,129.41-69.98L129.41,0Z';
const LOGO_LETTERS = [
  'M84.2,57.19c4.75,0,7.08,.9,7.08,5.06s-2.33,5.12-7.08,5.12h-9.78v-10.18h9.78ZM66.45,49.99v40.37h7.98v-15.85h9.4l8.35,15.85h8.98l-9.46-16.87c4.91-1.12,7.66-5.12,7.66-11.36,0-8.49-4.28-12.14-13.26-12.14h-19.66Z',
  'M117.12,49.99h-8.35v40.37h8.35V49.99Z',
  'M135.93,57.07v33.28h8.24V57.08h12.31v-7.03h-32.81v7.03h12.26Z',
  'M172.99,83.46l19.27-33.73h-29.93v6.9h16.36l-19.33,33.73h31.85v-6.9h-18.23Z',
];
function introWave(u0, u1, A, flip) {
  // Primärstrom endet, Sekundärstrom beginnt im Ringkern (u = 525 bzw. 675 liegen unter dem Kernband)
  let d = '';
  for (let u = u0; u <= u1; u += 4) {
    const v = A * Math.sin((2 * Math.PI * u) / 150);
    d += `${u === u0 ? 'M' : 'L'}${flip ? `${(250 + v).toFixed(1)} ${u}` : `${u} ${(250 + v).toFixed(1)}`}`;
  }
  return d;
}
function introDrawing(flip) {
  const p1 = introWave(0, 524, 132, flip), p2 = introWave(676, 1200, 16, flip);
  const [cx, cy] = flip ? [250, 600] : [600, 250];
  const L = flip
    ? [[30, 64, 'start'], [30, 1150, 'start'], [362, 611, 'start']]
    : [[96, 84, 'start'], [1104, 206, 'end'], [600, 398, 'middle']];
  return `<svg class="intro__svg intro__svg--${flip ? 'p' : 'l'}" viewBox="0 0 ${flip ? '500 1200' : '1200 500'}" preserveAspectRatio="xMidYMid meet" focusable="false">
  <g class="intro__draw">
    <line class="intro__axis" ${flip ? 'x1="250" y1="0" x2="250" y2="1200"' : 'x1="0" y1="250" x2="1200" y2="250"'}/>
    <path class="intro__w intro__w1" d="${p1}" pathLength="1"/><path class="intro__w intro__w2" d="${p2}" pathLength="1"/>
    <path class="intro__pulse intro__p1" d="${p1}" pathLength="1"/><path class="intro__pulse intro__p2" d="${p2}" pathLength="1"/>
    <circle class="intro__ring" cx="${cx}" cy="${cy}" r="74"/><circle class="intro__winding" cx="${cx}" cy="${cy}" r="74"/>
    <circle class="intro__edge intro__e1" cx="${cx}" cy="${cy}" r="56" pathLength="1"/><circle class="intro__edge intro__e2" cx="${cx}" cy="${cy}" r="92" pathLength="1"/>
    <text class="intro__l intro__l1" x="${L[0][0]}" y="${L[0][1]}" text-anchor="${L[0][2]}">2000 A</text>
    <text class="intro__l intro__l2" x="${L[1][0]}" y="${L[1][1]}" text-anchor="${L[1][2]}">5 A</text>
    <text class="intro__l intro__l3" x="${L[2][0]}" y="${L[2][1]}" text-anchor="${L[2][2]}">2000/5 A</text>
  </g>
</svg>`;
}
function introOverlay(ctx) {
  const letters = LOGO_LETTERS.map((d, i) => `<path class="intro__ch" style="--i:${i}" d="${d}"/>`).join('');
  return `<div class="intro" aria-hidden="true">
  ${introDrawing(false)}${introDrawing(true)}
  <div class="intro__logo"><svg viewBox="0 0 258.72 140.09" focusable="false"><polygon class="intro__diamond" points="129.4,0 258.7,70.1 129.3,140.1 0,70.1" pathLength="1"/><path class="intro__frame" d="${LOGO_FRAME}"/><g class="intro__mark">${letters}</g></svg><p class="intro__tag">${esc(ctx.t.ui.introLine)}</p></div>
</div>
<button class="intro__skip" type="button" data-intro-skip>${esc(ctx.t.ui.skipIntro)}</button>`;
}

// Überschrift Wort für Wort (Maske), damit der Einstieg ohne Layoutverschiebung läuft
const words = (text) => String(text).split(' ').map((w, i) => `<span class="h1w"><span style="--i:${i}">${esc(w)}</span></span>`).join(' ');

// Bühne der Startseite: Bilder aus den Werken (Überblendung, langsamer Zoom), Leitsatz, Suche und Kennzahlen
export const HERO_SLIDES = [
  ['mimg/intro_home_slider_7.webp', '62% 50%'],
  ['mimg/stellenangebote_intro_slider_2_Produktion.webp', '68% 35%'],
  ['mimg/intro_home_slider_6.webp', '58% 50%'],
  ['mimg/intro_home_slider_4.webp', '60% 50%'],
];
// Kennzahlen aus den Stammdaten (Standorte, Mitarbeitende, Vertretungen)
export function groupStats(ctx) {
  const locs = ctx.data.contacts.locations;
  const plants = locs.filter((l) => l.type === 'production');
  const staff = locs.reduce((s, l) => s + (+l.employees || 0), 0);
  const repCountries = new Set((ctx.data.contacts.reps || []).map((r) => r.country).filter(Boolean)).size;
  return { plants: plants.length, plantCountries: new Set(plants.map((l) => l.country)).size, staff, staffRound: Math.floor(staff / 100) * 100, repCountries };
}
function heroStage(ctx) {
  const { t, href, lang } = ctx;
  const H = t.pages.home, Hs = H.hero2, St = H.stats;
  const g = groupStats(ctx);
  const facts = [
    ['1945', St.founded],
    [`${fmtNum(g.staffRound, lang)}+`, St.staff],
    [String(g.plants), tpl(St.plants, { n: g.plantCountries })],
    [`${fmtNum(0.72, lang)}–550`, St.range, 'kV'],
    ...(g.repCountries ? [[String(g.repCountries), St.reps]] : []),
  ];
  const slides = HERO_SLIDES.filter(([k]) => ctx.img[k]);
  return `<section class="hero2 hero--anim" data-hero2 aria-label="${esc(Hs.slides)}">
  <div class="hero2__media">${slides.map(([k, pos], i) => `<figure class="hero2__slide${i ? '' : ' is-on'}" data-slide="${i}" style="--pos:${pos}">${imgTag(ctx, k, { alt: '', sizes: '(max-width: 700px) 1800px, (max-width: 1100px) 150vw, 100vw', eager: i === 0 })}</figure>`).join('')}</div>
  <div class="wrap hero2__inner">
    <h1>${words(H.h1)}</h1>
    <p class="lead">${esc(H.lead)}</p>
    <form class="hero__search" role="search" action="${href('search')}" data-hero-search>
      <label class="vh" for="hero-q">${esc(H.searchLabel)}</label>
      <input id="hero-q" name="q" type="search" placeholder="${esc(H.searchPh)}" autocomplete="off">
      <button type="submit">${icon('search')}<span>${esc(H.searchBtn)}</span></button>
    </form>
    <p class="hero__hint">${esc(H.hint)} ${H.hints.map((h) => `<button type="button" data-hint="${esc(h)}">${esc(h)}</button>`).join(', ')}</p>
    <div class="hero2__cta"><a class="btn btn--red" href="${href('products')}">${esc(Hs.cta1)}</a><a class="btn btn--light" href="${href('inquiry')}">${esc(Hs.cta2)}</a></div>
  </div>
  ${slides.length > 1 ? `<div class="hero2__ctl wrap" data-hero2-ctl>
    <div class="hero2__dots">${slides.map((_, i) => `<button type="button" data-goto="${i}" aria-label="${esc(tpl(Hs.slide, { n: i + 1, total: slides.length }))}"${i ? '' : ' aria-current="true"'}><i></i></button>`).join('')}</div>
    <button class="hero2__pause" type="button" data-hero2-pause aria-pressed="false" aria-label="${esc(Hs.pause)}" data-l-pause="${esc(Hs.pause)}" data-l-play="${esc(Hs.play)}">${icon('pause', 'width="16" height="16"')}${icon('play', 'width="16" height="16"')}</button>
  </div>` : ''}
  <div class="hero2__facts">
    <dl class="wrap hero2__fl" data-reveal="facts">${facts.map(([a, b, unit]) => `<div class="hero2__fact"><dt>${esc(b)}</dt><dd><strong${unit ? '' : ' data-count'}>${esc(a)}${unit ? `<small>${esc(unit)}</small>` : ''}</strong></dd></div>`).join('')}</dl>
  </div>
</section>`;
}

// Werke der Gruppe: Zentrale und Fertigungsstandorte mit Foto (sonst Kartenausschnitt), Spezialitäten, Mitarbeitenden
function plantMap(ctx, l) {
  const wm = ctx.data.worldmeta;
  if (!l.lat || !wm) return '';
  const [x, y] = projectLL(wm, l.lng, l.lat);
  const w = 150, h = (w * 10) / 16;
  return `<svg class="plant__map" viewBox="${(x - w / 2).toFixed(1)} ${(y - h / 2).toFixed(1)} ${w} ${h.toFixed(1)}" aria-hidden="true" focusable="false"><use class="loc__land" href="${ctx.base}img/world-land.svg#land"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" class="loc__halo"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" class="loc__dot"/></svg>`;
}
// Allgemeine Funktionen (Vertrieb, Verwaltung, Konstruktion) ausblenden – erkannt an der deutschen Liste,
// die Sprachfassungen haben dieselbe Reihenfolge
const GENERIC_FN = /^(vertrieb|controlling|it$|personal|konstruktion|zwei gesellschaften)/i;
function plantFunctions(l, lang, dl) {
  const de = l.functions?.de || [];
  const list = (l.functions && (l.functions[lang] || l.functions[dl] || l.functions.en)) || [];
  return list.filter((f, i) => !GENERIC_FN.test(de[i] || f));
}
function plantsSection(ctx) {
  const { t, lang } = ctx;
  const P = t.pages.home.plants;
  const g = groupStats(ctx);
  const locs = ctx.data.contacts.locations.filter((l) => l.type === 'hq' || l.type === 'production');
  let region = (c) => c;
  try { const dn = new Intl.DisplayNames([lang], { type: 'region' }); region = (c) => dn.of(c) || c; } catch (e) { /* Kürzel */ }
  const cards = locs.map((l) => {
    const img = LOC_IMG[l.id];
    const fn = plantFunctions(l, lang, ctx.dl).slice(0, 2);
    return `<a class="plant" href="${ctx.hrefA('locations', {}, l.id)}">
    <div class="plant__img"${img && ctx.img[img] ? ' data-reveal="img"' : ''}>${img && ctx.img[img] ? imgTag(ctx, img, { alt: '', sizes: '(max-width: 600px) 80vw, (max-width: 1100px) 40vw, 25vw', max: 960 }) : plantMap(ctx, l)}</div>
    <div class="plant__body">
      <span class="plant__type">${esc(l.type === 'hq' ? P.hq : P.plant)} · ${esc(region(l.country))}</span>
      <h3>${esc(l.city.replace(/\s*\(.*\)$/, ''))}</h3>
      ${fn.length ? `<ul class="plant__fn">${fn.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
      ${l.employees ? `<span class="plant__staff">${esc(tpl(P.staff, { n: fmtNum(+l.employees, lang) }))}</span>` : ''}
    </div>
  </a>`;
  }).join('');
  return `<section class="section section--porcelain plants-sec">
  <div class="wrap">
    <div class="plants-head">
      <div class="stack" style="--s:1rem" data-reveal="head">
        <h2>${esc(tpl(P.title, { n: g.plants }))}</h2>
        <p class="lead">${esc(tpl(P.lead, { staff: fmtNum(g.staffRound, lang) }))}</p>
        <div class="cluster"><a class="btn" href="${ctx.href('locations')}">${esc(P.cta)}</a><a class="btn btn--ghost" href="${ctx.hrefA('contact', {}, 'karte')}">${esc(t.pages.home.worldCta2)}</a></div>
      </div>
      ${worldTeaser(ctx)}
    </div>
    <div class="plants" role="list">${cards.replace(/<a class="plant"/g, '<a role="listitem" class="plant"')}</div>
  </div>
</section>`;
}

// Geschichte in Etappen: Gründung bis heute (Texte aus der Unternehmensseite, Fotos aus der bisherigen Zeitleiste)
const HERITAGE_YEARS = ['1945', '1956', '1991', '2003', '2008', '2026'];
function heritageSection(ctx) {
  const { t, href } = ctx;
  const C = t.pages.company;
  const Hh = t.pages.home.heritage;
  const items = HERITAGE_YEARS.map((y) => C.history.find(([yy]) => yy === y)).filter(Boolean);
  return `<section class="section heritage">
  <div class="wrap">
    ${sectionHead(Hh.title, Hh.lead, `<a class="btn btn--ghost" href="${href('company')}">${esc(Hh.cta)}</a>`, { reveal: true })}
    <ol class="her" data-reveal="facts" tabindex="0" aria-label="${esc(Hh.title)}">${items.map(([year, title, text]) => {
      const k = (HISTORY_IMG[year] || []).find((x) => ctx.img[x]);
      return `<li class="her__item"><span class="her__year">${esc(year)}</span>${k ? `<span class="her__img">${imgTag(ctx, k, { alt: '', sizes: '(max-width: 700px) 60vw, 16vw', max: 640 })}</span>` : '<span class="her__img her__img--none" aria-hidden="true"></span>'}<b>${esc(title)}</b><span>${esc(text)}</span></li>`;
    }).join('')}</ol>
  </div>
</section>`;
}

export function home(ctx) {
  const { t, href, lang, data } = ctx;
  const H = t.pages.home;
  const counts = {};
  for (const p of data.products) counts[p.area] = (counts[p.area] || 0) + 1;
  const news = data.news.slice(0, 3);
  return `
${introOverlay(ctx)}
${heroStage(ctx)}

<nav class="wrap tasks-wrap" aria-labelledby="help-title">
  <h2 class="tasks__title" id="help-title">${esc(H.helpTitle)}</h2>
  <div class="tasks">${H.tasks.map(([title, text, id, ic]) => `<a class="task" href="${href(id)}"><strong>${icon(ic)}${esc(title)}</strong><span>${esc(text)}</span></a>`).join('')}</div>
</nav>

<section class="section">
  <div class="wrap">
    ${sectionHead(H.areasTitle, H.areasLead, `<a class="btn btn--ghost" href="${href('finder')}">${esc(t.ui.openFinder)}</a>`, { reveal: true })}
    <div class="areas-axis">${voltageAxis(ctx, { dark: false })}</div>
    <div class="areas">
      ${AREAS.map((a) => `<a class="area" href="${href('area', { area: a })}">
        <div class="area__img" data-reveal="img">${imgTag(ctx, AREA_IMG[a], { alt: '', sizes: '(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw', max: 1920, cover: 16 / 10 })}</div>
        <div class="area__body"><span class="area__kv">${esc(t.lbl.areaRange[a])}</span><h3>${esc(t.lbl.area[a])}</h3><p>${esc(t.lbl.areaShort[a])}</p></div>
        <div class="area__foot"><span>${esc(ctx.plural(counts[a] || 0, t.ui.productCount))}</span><span class="go">${esc(t.ui.more)}</span></div>
      </a>`).join('')}
    </div>
  </div>
</section>

${homeSpec(ctx)}

${plantsSection(ctx)}

<section class="section">
  <div class="wrap">
    ${sectionHead(H.sectorsTitle, H.sectorsLead, '', { reveal: true })}
    <div class="apps">
      ${SECTORS.map((s) => {
        const S = t.pages.sectors.items[s];
        return `<a class="app" href="${href('sector', { sector: s })}"><span class="app__img">${imgTag(ctx, SECTOR_IMG[s], { alt: '', sizes: '76px', max: 320, cover: 76 / 56 })}</span><span><strong>${esc(S.title)}</strong><span>${esc(S.short)}</span></span>${icon('right')}</a>`;
      }).join('')}
    </div>
  </div>
</section>

<section class="section section--resin">
  <div class="wrap">
    <div class="split">
      <div class="stack" style="--s:1.25rem" data-reveal="head">
        <h2>${esc(H.proofTitle)}</h2>
        <p class="lead">${esc(H.proofLead)}</p>
        <p><a class="btn btn--light" href="${href('quality')}">${esc(H.proofCta)}</a></p>
      </div>
      <div class="facts facts--2" data-reveal="facts">${H.proofFacts.map(([a, b]) => `<div class="fact"><strong data-count>${esc(a)}</strong><span>${esc(b)}</span></div>`).join('')}</div>
    </div>
    <div class="certs certs--row">${t.pages.quality.certs.slice(0, 6).map(([n, d, key]) => {
      const doc = data.docs.find((x) => x.file === CERT_FILES[key]);
      return `<a class="cert" ${doc ? ctx.docAttrs(doc) : `href="${href('quality')}"`}><b>${esc(n)}</b><span>${esc(d)}</span>${doc ? icon(ctx.docHref(doc) ? 'download' : 'mail', 'width="16" height="16"') : ''}</a>`;
    }).join('')}</div>
  </div>
</section>

${heritageSection(ctx)}

<section class="section section--porcelain">
  <div class="wrap">
    ${sectionHead(H.newsTitle, H.newsLead, `<a class="btn btn--ghost" href="${href('news')}">${esc(t.ui.allNews)}</a>`, { reveal: true })}
    <div class="news-grid">${news.map((n) => newsCard(ctx, n, { reveal: true })).join('')}</div>
  </div>
</section>

<section class="section career-sec">
  <div class="wrap split split--even">
    <div class="career-mosaic" data-reveal="img">
      ${['mimg/stellenangebote_intro_slider_2_Produktion.webp', 'mimg/stellenangebote_intro_slider_5_Logistik.webp', 'mimg/iStock-1146844837-2048x1366.webp'].filter((k) => ctx.img[k]).map((k, i) => `<span class="cm cm--${i}">${imgTag(ctx, k, { alt: '', sizes: i ? '(max-width: 900px) 50vw, 25vw' : '(max-width: 900px) 100vw, 50vw', max: i ? 960 : 1800 })}</span>`).join('')}
    </div>
    <div class="stack" style="--s:1.1rem" data-reveal="head">
      <h2>${esc(H.careerTitle)}</h2>
      <p class="lead">${esc(H.careerLead)}</p>
      <p class="muted">${esc(ctx.plural(data.jobs.length, t.ui.jobCount))}</p>
      <div class="cluster"><a class="btn" href="${href('career')}">${esc(H.careerCta)}</a><a class="btn btn--ghost" href="${href('training')}">${esc(t.nav.training)}</a></div>
    </div>
  </div>
</section>

<section class="section section--tight">
  <div class="wrap">${ctaBand(ctx, H.ctaTitle, H.ctaText, H.ctaBtn, href('inquiry'))}</div>
</section>`;
}

export function newsCard(ctx, n, { reveal = false } = {}) {
  const { t, lang } = ctx;
  const vf = n.v[lang] ? lang : n.v[ctx.dl] ? ctx.dl : n.v.de ? 'de' : Object.keys(n.v)[0];
  const v = n.v[vf];
  const vl = v.contentLang || vf; // Sprache des Inhalts (Kopien aus dem Altbestand)
  const other = vl !== lang;
  const text = htmlText(v.html);
  const url = ctx.href('article', { slug: ctx.newsSlug(n) });
  const img = n.image || n.images?.[0];
  // kleine Altbilder (z. B. 212 × 300) nicht strecken: eingepasst vor unscharfem Hintergrund
  const small = !!(img && ctx.img[img] && ctx.img[img].w < 600);
  return `<a class="card" href="${url}">
  <div class="card__img${small ? ' card__img--small' : ''}"${small ? ` style="--bgimg:url(${ctx.imgUrl(img, 320)})"` : ''}${reveal ? ' data-reveal="img"' : ''}>${img && ctx.img[img] ? imgTag(ctx, img, { alt: '', sizes: small ? `${ctx.img[img].w}px` : '(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw', max: 960 }) : `<span class="card__ph"><svg viewBox="0 0 80 40" width="80" height="40" aria-hidden="true"><path d="M40 2 78 20 40 38 2 20Z" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>${esc(t.lbl.newsCat[n.cat] || '')}</span></span>`}</div>
  <div class="card__meta"><time datetime="${n.date}">${esc(fmtDate(n.date, lang))}</time><span>${esc(t.lbl.newsCat[n.cat] || '')}</span>${other ? `<span class="card__lang" title="${esc(t.ui[vl] || vl)}">${esc(vl.toUpperCase())}</span>` : ''}</div>
  <h3${other ? ` lang="${vl}"` : ''}>${esc(v.title)}</h3>
  ${text ? `<p${other ? ` lang="${vl}"` : ''}>${esc(shorten(text, 150))}</p>` : ''}
</a>`;
}

// Live-Spezifikations-Check (Vorschau): Ergebnis für den Beispieltext schon im HTML, Aktualisierung im Browser
function homeSpec(ctx) {
  const { t, href, lang } = ctx;
  const X = t.x, Hx = X.home, A = X.assist;
  const p = parsePosition(Hx.sample);
  const best = matchProducts(p.req, ctx.data.products, null, { limit: 3 }).best;
  return `<section class="section" id="spezifikation">
  <div class="wrap hs" data-home-spec>
    <div class="hs__copy" data-reveal="head">
      <h2>${esc(Hx.title)}</h2>
      <p class="lead">${esc(Hx.lead)}</p>
      <ul class="hs__points">${Hx.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="cluster"><a class="btn btn--red" href="${href('assistant')}" data-hs-go>${esc(Hx.cta)}</a><a class="btn btn--ghost" href="${href('calculators')}">${esc(Hx.calc)}</a><a class="link" href="${href('tools')}">${esc(Hx.tools)}</a></div>
    </div>
    <div class="hs__panel">
      <label for="hs-text">${esc(Hx.label)}</label>
      <textarea class="textarea" id="hs-text" data-hs-text spellcheck="false" autocomplete="off" rows="3">${esc(Hx.sample)}</textarea>
      <p class="hs__marked" data-hs-marked aria-hidden="true">${markedText(Hx.sample, p.marks, A)}</p>
      <div class="scp__req" data-hs-req><span class="scp__lbl">${esc(Hx.result)}</span>${reqChipsHtml(p.req, t, A, lang)}</div>
      <div class="hs__res" data-hs-res aria-live="polite">${homeHitsHtml(ctx, best, X)}</div>
    </div>
  </div>
</section>`;
}
