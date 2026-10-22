// Startseite
import { esc, icon, imgTag, tpl, fmtDate, axisPos, AXIS_TICKS, fmtNum, htmlText, UM_STEPS } from '../lib/util.js';
import { shorten } from './layout.js';
import { projectLL, countryName, locAddress } from '../lib/geo.js';
import { HISTORY_IMG, AREA_IMG, SECTOR_IMG } from '../lib/catalog.js';
import { coversUm } from '../lib/product.js';

export { AREA_IMG, SECTOR_IMG };
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

// Intro (beim ersten Aufruf und dann bei jedem dritten Neuladen, jederzeit zu überspringen): das Messwandler-Prinzip. Ein großer Primärstrom läuft
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

// Kennzahlen aus den Stammdaten (Standorte, Mitarbeitende, Vertretungen)
export function groupStats(ctx) {
  const locs = ctx.data.contacts.locations;
  const plants = locs.filter((l) => l.type === 'production');
  const staff = locs.reduce((s, l) => s + (+l.employees || 0), 0);
  const repCountries = new Set((ctx.data.contacts.reps || []).map((r) => r.country).filter(Boolean)).size;
  return { plants: plants.length, plantCountries: new Set(plants.map((l) => l.country)).size, staff, staffRound: Math.floor(staff / 100) * 100, repCountries };
}

// ---------- Bühne: ein Ringkern-Stromwandler im Detail, darüber das Messwerk ----------
// Foto und Einblendungen teilen ein Koordinatensystem (Pixel des Fotos, 1800 × 813): Die Fläche hat das
// Seitenverhältnis des Fotos und wird wie ein Titelbild beschnitten, so liegen Skala und Hinweise bei jeder
// Fenstergröße genau auf dem Ring.
const STAGE_IMG = 'mimg/intro_home_slider_6.webp';
const STAGE = { w: 1800, h: 813, cx: 1172, cy: 437, r: 292 };
const P = (x, y) => `left:${((x / STAGE.w) * 100).toFixed(2)}%;top:${((y / STAGE.h) * 100).toFixed(2)}%`;
function arcPath(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}
function stageHud() {
  const { cx, cy, r } = STAGE;
  let ticks = '', major = '';
  for (let a = 0; a < 360; a += 3) {
    const long = a % 15 === 0;
    const r1 = r + 22, r2 = r1 + (long ? 18 : 8);
    const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180);
    const seg = `M${(cx + c * r1).toFixed(1)} ${(cy + s * r1).toFixed(1)}L${(cx + c * r2).toFixed(1)} ${(cy + s * r2).toFixed(1)}`;
    if (long) major += seg; else ticks += seg;
  }
  const cross = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => `M${cx + dx * 18} ${cy + dy * 18}L${cx + dx * 46} ${cy + dy * 46}`).join('');
  return `<svg class="hud" viewBox="0 0 ${STAGE.w} ${STAGE.h}" preserveAspectRatio="none" focusable="false">
    <circle class="hud__glow" cx="${cx}" cy="${cy}" r="${r + 8}"/>
    <circle class="hud__ring" cx="${cx}" cy="${cy}" r="${r + 8}" pathLength="1"/>
    <path class="hud__ticks" d="${ticks}"/><path class="hud__major" d="${major}"/>
    <g class="hud__rot"><path class="hud__scan" d="${arcPath(cx, cy, r + 50, -70, -18)}"/><path class="hud__scan hud__scan--2" d="${arcPath(cx, cy, r + 50, 110, 162)}"/></g>
    <g class="hud__rot hud__rot--rev"><path class="hud__flow" d="${arcPath(cx, cy, r + 64, 200, 232)}"/><path class="hud__flow" d="${arcPath(cx, cy, r + 64, 20, 52)}"/></g>
    <path class="hud__cross" d="${cross}"/>
    <path class="hud__lead hud__lead--1" d="M${cx} ${cy}L${cx - 84} ${cy + 84}L${cx - 136} ${cy + 84}" pathLength="1"/>
    <path class="hud__lead hud__lead--2" d="M${cx + 270} ${cy - 226}L${cx + 208} ${cy - 297}L${cx + 120} ${cy - 297}" pathLength="1"/>
    <circle class="hud__dot" cx="${cx}" cy="${cy}" r="5"/><circle class="hud__dot hud__dot--2" cx="${cx + 270}" cy="${cy - 226}" r="5"/>
  </svg>`;
}
// kleine Messkurve (zwei Perioden, doppelt lang zum Durchlaufen)
function trace(amp) {
  let d = '';
  for (let x = 0; x <= 240; x += 4) d += `${x ? 'L' : 'M'}${x} ${(20 - amp * Math.sin((2 * Math.PI * x) / 60)).toFixed(1)}`;
  return `<svg viewBox="0 0 120 40" preserveAspectRatio="none" focusable="false"><path d="${d}"/></svg>`;
}
function stage(ctx) {
  const { t, href, lang } = ctx;
  const H = t.pages.home, S = H.st;
  const g = groupStats(ctx);
  const facts = [
    ['1945', H.stats.founded],
    [`${fmtNum(g.staffRound, lang)}+`, H.stats.staff],
    [String(g.plants), tpl(H.stats.plants, { n: g.plantCountries })],
    [`${fmtNum(0.72, lang)}–550`, H.stats.range, 'kV'],
    ...(g.repCountries ? [[String(g.repCountries), H.stats.reps]] : []),
  ];
  const { cx, cy, r } = STAGE;
  const photo = ctx.img[STAGE_IMG] ? imgTag(ctx, STAGE_IMG, { alt: '', sizes: '(max-aspect-ratio: 9/4) 230vh, 100vw', eager: true, cls: 'st__photo' }) : '';
  return `<section class="st hero--anim" data-stage aria-labelledby="st-title">
  <div class="st__media" aria-hidden="true">
    <div class="st__frame">
      ${photo}
      ${stageHud()}
      <span class="st__chip st__chip--a" style="${P(cx - 142, cy + 84)}">${esc(S.hudWindow)}</span>
      <span class="st__chip st__chip--b" style="${P(cx + 114, cy - 297)}">${esc(S.hudCore)}</span>
      <span class="st__read" style="${P(cx + 70, cy + 214)}">
        <span class="st__trace"><b>${esc(S.primary)}</b><i>2000 A</i>${trace(15)}</span>
        <span class="st__trace st__trace--s"><b>${esc(S.secondary)}</b><i>5 A</i>${trace(4)}</span>
      </span>
    </div>
  </div>
  <div class="wrap st__inner">
    <h1 class="st__title" id="st-title">${words(H.h1)}</h1>
    <p class="st__lead">${esc(S.lead)}</p>
    <div class="st__links"><a class="btn btn--light" href="#prinzip">${esc(S.cta1)}</a><a class="link link--light" href="${href('products')}">${esc(S.cta2)}</a></div>
  </div>
  <div class="st__foot">
    <dl class="wrap st__ruler" data-reveal="facts">${facts.map(([a, b, unit]) => `<div class="st__fact"><dt>${esc(b)}</dt><dd><strong${unit ? '' : ' data-count'}>${esc(a)}${unit ? `<small>${esc(unit)}</small>` : ''}</strong></dd></div>`).join('')}</dl>
  </div>
</section>`;
}

// ---------- Prinzip ----------
function principle(ctx) {
  const Pr = ctx.t.pages.home.principle;
  return `<section class="ch" id="prinzip" aria-labelledby="pr-title">
  <div class="wrap ch__split">
    <h2 class="ch__title" id="pr-title" data-reveal="head">${esc(Pr.title)}</h2>
    <div class="ch__body" data-reveal="head"><p class="ch__text">${esc(Pr.text)}</p></div>
  </div>
  <div class="wrap ch__figs"><dl class="figs" data-reveal="facts">${Pr.facts.map(([v, l]) => `<div class="fig"><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>
</section>`;
}

// ---------- Spektrum: sechs Bereiche auf der Spannungsachse ----------
const BANDS = { niederspannung: [0.72, 3.6], mittelspannung: [3.6, 72.5], hochspannung: [72.5, 550], 'elektronik-sensoren': [0.72, 90], 'stromschienen-sis': [3.6, 40.5], 'giessharzteile-duromer': [0.72, 72.5] };
const pc = (v) => (axisPos(v) * 100).toFixed(2);
function spectrum(ctx) {
  const { t, href, lang } = ctx;
  const Sp = t.pages.home.spectrum;
  const order = ['niederspannung', 'mittelspannung', 'hochspannung', 'elektronik-sensoren', 'stromschienen-sis', 'giessharzteile-duromer'];
  const ticks = AXIS_TICKS.map((v, i) => `<span class="sp__tick" style="left:${pc(v)}%"><span>${esc(fmtNum(v, lang))}${i === AXIS_TICKS.length - 1 ? ' kV' : ''}</span></span>`).join('');
  return `<section class="ch ch--porcelain" aria-labelledby="sp-title">
  <div class="wrap">
    <div class="ch__head" data-reveal="head"><h2 class="ch__title" id="sp-title">${esc(Sp.title)}</h2><p class="ch__lead">${esc(Sp.lead)}</p></div>
    <div class="sp" data-spectrum>
      <div class="sp__chart" data-reveal="chart">
        <div class="sp__axis" aria-hidden="true">${ticks}</div>
        <ul class="sp__rows">${order.map((a, i) => {
          const [lo, hi] = BANDS[a];
          return `<li><a class="sp__row${i === 1 ? ' is-on' : ''}${a === 'giessharzteile-duromer' ? ' sp__row--part' : ''}" href="${href('area', { area: a })}" data-sp="${a}">
            <span class="sp__name">${esc(t.lbl.area[a])}</span><span class="sp__range">${esc(t.lbl.areaRange[a])}</span>
            <span class="sp__track" aria-hidden="true"><span class="sp__bar" style="--a:${pc(lo)}%;--b:${pc(hi)}%;--i:${i}"></span></span>
          </a></li>`;
        }).join('')}</ul>
      </div>
      <div class="sp__view" aria-hidden="true">${order.map((a, i) => `<figure class="sp__fig${i === 1 ? ' is-on' : ''}" data-sp-fig="${a}">${imgTag(ctx, AREA_IMG[a], { alt: '', sizes: '(max-width: 900px) 0px, 36vw', max: 1600, cover: 4 / 5 })}<figcaption><b>${esc(t.lbl.area[a])}</b><span>${esc(t.lbl.areaShort[a])}</span></figcaption></figure>`).join('')}</div>
    </div>
  </div>
</section>`;
}

// ---------- Fertigung: Bildband ----------
function making(ctx) {
  const M = ctx.t.pages.home.making;
  const k = 'mimg/intro_home_slider_5.webp';
  return `<section class="band" aria-labelledby="mk-title">
  <div class="band__media" aria-hidden="true">${ctx.img[k] ? imgTag(ctx, k, { alt: '', sizes: '100vw', max: 1920 }) : ''}</div>
  <div class="wrap band__inner" data-reveal="head"><h2 class="ch__title" id="mk-title">${esc(M.title)}</h2><p class="ch__text">${esc(M.text)}</p></div>
</section>`;
}

// ---------- Produktsuche: Bildwechsel aus den Werken, Suche nach Typ, Spannung oder Anwendung, Spannungsachse ----------
export const SEARCH_SLIDES = [
  ['mimg/intro_home_slider_7.webp', '62% 50%'],
  ['mimg/intro_home_slider_4.webp', '58% 50%'],
  ['mimg/2022__11__intro_home_slider_2.webp', '72% 40%'],
];
function finderSearch(ctx) {
  const { t, href } = ctx;
  const H = t.pages.home, Hs = H.hero2;
  const slides = SEARCH_SLIDES.filter(([k]) => ctx.img[k]);
  return `<section class="ps" data-hero2 aria-labelledby="ps-title">
  <div class="hero2__media" aria-hidden="true">${slides.map(([k, pos], i) => `<figure class="hero2__slide${i ? '' : ' is-on'}" data-slide="${i}" style="--pos:${pos}">${imgTag(ctx, k, { alt: '', sizes: '(max-width: 700px) 1800px, (max-width: 1100px) 150vw, 100vw', max: 1920 })}</figure>`).join('')}</div>
  <div class="wrap ps__inner">
    <div class="ps__copy" data-reveal="head">
      <h2 class="ch__title" id="ps-title">${esc(t.nav.megaFinderTitle)}</h2>
      <p class="ch__lead">${esc(t.nav.megaFinderText)}</p>
      <form class="hero__search" role="search" action="${href('search')}" data-hero-search>
        <label class="vh" for="ps-q">${esc(H.searchLabel)}</label>
        <input id="ps-q" name="q" type="search" placeholder="${esc(H.searchPh)}" autocomplete="off">
        <button type="submit">${icon('search')}<span>${esc(H.searchBtn)}</span></button>
      </form>
      <p class="hero__hint">${esc(H.hint)} ${H.hints.map((h) => `<button type="button" data-hint="${esc(h)}">${esc(h)}</button>`).join(', ')}</p>
    </div>
    <div class="ps__axis" data-reveal="chart">${voltageAxis(ctx, { dark: true, sweep: true })}</div>
    <p class="ps__cta"><a class="link link--light" href="${href('products')}">${esc(Hs.cta1)}${icon('arrow')}</a><a class="link link--light" href="${href('inquiry')}">${esc(Hs.cta2)}${icon('arrow')}</a></p>
  </div>
  ${slides.length > 1 ? `<div class="hero2__ctl wrap">
    <div class="hero2__dots">${slides.map((_, i) => `<button type="button" data-goto="${i}" aria-label="${esc(tpl(Hs.slide, { n: i + 1, total: slides.length }))}"${i ? '' : ' aria-current="true"'}><i></i></button>`).join('')}</div>
    <button class="hero2__pause" type="button" data-hero2-pause aria-pressed="false" aria-label="${esc(Hs.pause)}" data-l-pause="${esc(Hs.pause)}" data-l-play="${esc(Hs.play)}">${icon('pause', 'width="16" height="16"')}${icon('play', 'width="16" height="16"')}</button>
  </div>` : ''}
</section>`;
}

// ---------- Weltweit vernetzt: Karte mit allen RITZ-Standorten und Vertretungen ----------
// Ohne JavaScript: Punktkarte als Bild (img/world-dots.svg) mit den Markern in Prozentlage. Mit JavaScript
// (src/client/netmap.js) zeichnet eine Leinwand Punkte und Verbindungen; das Netz spannt sich beim Erscheinen von
// Hamburg aus über die Welt, dazu Zoom, Regionen, Länderwahl und Karten mit Anschrift. Knoten, Bögen, Zeitplan und
// Texte stehen als JSON in der Seite, damit Ansicht und Skript dieselben Daten nutzen.
const GENERIC_FN = /^(vertrieb|controlling|it$|personal|konstruktion|zwei gesellschaften)/i;
function plantFunctions(l, lang, dl) {
  const de = l.functions?.de || [];
  const list = (l.functions && (l.functions[lang] || l.functions[dl] || l.functions.en)) || [];
  return list.filter((f, i) => !GENERIC_FN.test(de[i] || f));
}
// Knoten, von denen die Verbindungen zu den Vertretungen ausgehen (nächster Standort, sonst „servedFrom“)
const NM_HUBS = ['hamburg', 'kirchaich', 'dresden', 'wirges', 'marchtrenk', 'kecskemet', 'lavonia', 'shanghai', 'dubai'];
const NM_SHORT = { kirchaich: 'Kirchaich', dresden: 'Dresden', lavonia: 'Lavonia', waynesboro: 'Waynesboro' };
const NM_REGIONS = { europe: [-11, 35, 33, 62], americas: [-125, -42, -32, 52], apac: [62, -42, 155, 48], africa: [-18, -36, 60, 40] };
const NM_PSEUDO = {
  CARIB: { de: 'Karibik (weitere Länder)', en: 'Caribbean (other)', fr: 'Caraïbes (autres pays)', hu: 'Karib-térség (további országok)', es: 'Caribe (otros países)' },
  LATAM: { de: 'Lateinamerika', en: 'Latin America', fr: 'Amérique latine', hu: 'Latin-Amerika', es: 'Latinoamérica' },
};
const gcDeg = (a, b) => {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return (2 * Math.asin(Math.min(1, Math.sqrt(h)))) / r;
};
export function netModel(ctx) {
  const { t, lang } = ctx;
  const meta = ctx.data.worldmeta;
  const C = ctx.data.contacts;
  const N = t.pages.home.net;
  const cname = (code, r) => NM_PSEUDO[code]?.[lang] || (code && code.length === 2 ? countryName(code, lang) : (lang === 'de' ? r?.country_de : r?.country_en) || code);
  const r1 = (v) => Math.round(v * 10) / 10;
  const nodes = [];
  const near = (x, y) => nodes.find((n) => Math.hypot(n.x - x, n.y - y) < 1.2);
  const locs = C.locations.filter((l) => l.lat);
  const cityOf = Object.fromEntries(locs.map((l) => [l.id, NM_SHORT[l.id] || l.city.replace(/\s*\(.*\)$/, '').replace(/,.*$/, '')]));
  for (const l of locs) {
    const [x, y] = projectLL(meta, l.lng, l.lat);
    const fn = plantFunctions(l, lang, ctx.dl).slice(0, 3).join(', ');
    nodes.push({ id: l.id, kind: l.type, x, y, lat: l.lat, lng: l.lng, cc: l.country, label: cityOf[l.id], items: [{
      k: 'l', cc: l.country, ty: l.type, ti: l.city, su: l.company, co: cname(l.country), ad: locAddress(l, lang),
      te: l.phone || '', ma: l.email || '', fn, st: l.employees ? tpl(t.pages.home.plants.staff, { n: fmtNum(l.employees, lang) }) : '',
      h: ctx.hrefA('locations', {}, l.id),
    }] });
  }
  const contact = ctx.hrefA('contact', {}, 'karte');
  for (const r of [...C.reps, ...(C.repsDE || [])].filter((r) => r.lat)) {
    const [x, y] = projectLL(meta, r.lng, r.lat);
    const sf = r.servedFrom === 'roswell' ? 'lavonia' : r.servedFrom;
    const it = { k: 'r', cc: r.country, ti: r.company, co: cname(r.country, r), ad: (lang === 'de' ? r.address : r.address_en || r.address) || [],
      te: r.phone || '', ma: r.email || '', sv: sf && cityOf[sf] ? `${t.map.servedBy} RITZ ${cityOf[sf]}` : '', sf };
    const n = near(x, y);
    if (n) { n.items.push(it); if (!n.cc) n.cc = r.country; continue; }
    nodes.push({ id: 'r' + r.pid, kind: 'rep', x, y, lat: r.lat, lng: r.lng, cc: r.country, label: cname(r.country, r), items: [it] });
  }
  // Verbindungen und Zeitplan des Netzaufbaus (ms ab Start): Zentrale → Standorte, Standort → Vertretungen
  const hq = nodes.find((n) => n.kind === 'hq');
  const hubs = nodes.filter((n) => NM_HUBS.includes(n.id));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const arcs = [];
  hq.t = 160;
  nodes.filter((n) => n.kind !== 'rep' && n !== hq).sort((a, b) => dist(hq, a) - dist(hq, b)).forEach((n, i) => {
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
      const d = dist(h, n), t0 = Math.round(h.t + 140 + 1000 * (d / far) * (h.id === 'hamburg' ? 0.8 : 1) + (i % 3) * 45), dur = Math.round(380 + Math.min(1, d / 240) * 560);
      arcs.push({ a: h, b: n, t0, dur, s: 0 });
      n.t = t0 + dur;
    });
  }
  // Reihenfolge: Vertretungen unten, Standorte darüber, Zentrale oben
  const rank = { rep: 0, site: 1, sales: 1, production: 2, hq: 3 };
  nodes.sort((a, b) => rank[a.kind] - rank[b.kind]);
  const idx = new Map(nodes.map((n, i) => [n, i]));
  // Regionen als Kartenrechtecke
  const regions = {};
  for (const [k, [lo0, la0, lo1, la1]] of Object.entries(NM_REGIONS)) {
    const a = projectLL(meta, lo0, la1), b = projectLL(meta, lo1, la0), c = projectLL(meta, lo0, la0), d = projectLL(meta, lo1, la1);
    regions[k] = [Math.min(a[0], c[0]), Math.min(a[1], d[1]), Math.max(b[0], d[0]), Math.max(b[1], c[1])].map(r1);
  }
  // Länderliste: je Land der wichtigste eigene Standort, sonst die Vertretung
  const byCc = new Map();
  nodes.forEach((n, i) => {
    for (const it of n.items) {
      const pr = it.k === 'l' ? 10 + rank[n.kind] : 0;
      const cur = byCc.get(it.cc);
      if (!cur || pr > cur.pr) byCc.set(it.cc, { n: i, pr, name: it.co });
    }
  });
  const coll = new Intl.Collator(lang);
  const countries = [...byCc.values()].sort((a, b) => coll.compare(a.name, b.name)).map(({ n, name }) => ({ n, name }));
  return {
    nodes: nodes.map((n) => ({ x: r1(n.x), y: r1(n.y), k: n.kind, t: n.t || 0, label: n.label, items: n.items.map(({ sf, cc, ...it }) => Object.fromEntries(Object.entries(it).filter(([, v]) => v !== '' && !(Array.isArray(v) && !v.length)))) })),
    arcs: arcs.map((a) => ({ a: idx.get(a.a), b: idx.get(a.b), t0: a.t0, dur: a.dur, s: a.s })),
    hq: idx.get(hq), regions, countries,
    stats: { sites: locs.length, cc: new Set(locs.map((l) => l.country)).size, reps: groupStats(ctx).repCountries },
    L: { types: { ...t.lbl.locType, rep: t.map.legendRep }, site: N.site, rep: N.rep, repHref: contact, alsoHere: N.alsoHere, close: t.ui.close, copy: t.ui.copy, route: t.ui.route },
  };
}
function netMap(ctx) {
  const { t } = ctx;
  const N = t.pages.home.net;
  const P = t.pages.home.plants;
  const m = netModel(ctx);
  const st = m.stats;
  const kindCls = (k) => (k === 'hq' ? 'hq' : k === 'rep' ? 'rep' : 'site');
  const marks = m.nodes.map((n, i) => {
    const label = n.items.map((it) => `${m.L.types[it.k === 'l' ? it.ty : 'rep']} ${it.k === 'l' ? n.label : it.ti}, ${it.co}`).join('; ');
    return `<button type="button" class="nm__mk nm__mk--${kindCls(n.k)}${n.items.length > 1 ? ' nm__mk--multi' : ''}" data-n="${i}" style="--x:${(n.x / 10).toFixed(2)}%;--y:${(n.y / 5.2).toFixed(2)}%;--d:${n.t}ms" aria-label="${esc(label)}"${i === m.hq ? '' : ' tabindex="-1"'}><i></i>${n.k !== 'rep' ? `<span class="nm__lbl" aria-hidden="true">${esc(n.label)}</span>` : ''}</button>`;
  }).join('');
  const regions = [['world', N.world], ['europe', t.lbl.region.europe], ['americas', t.lbl.region.americas], ['apac', t.lbl.region.apac], ['africa', t.lbl.region.africa]];
  const model = JSON.stringify(m).replace(/</g, '\\u003c');
  return `<section class="nm" data-nm aria-labelledby="nm-title">
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
  <div class="wrap nm__bar" data-nm-bar hidden>
    <div class="nm__layers" role="group" aria-label="${esc(N.layers)}">
      <button type="button" class="nm__tog" data-nm-layer="sites" aria-pressed="true"><i class="nm__key nm__key--site" aria-hidden="true"></i>${esc(N.sites)}</button>
      <button type="button" class="nm__tog" data-nm-layer="reps" aria-pressed="true"><i class="nm__key nm__key--rep" aria-hidden="true"></i>${esc(N.reps)}</button>
      <button type="button" class="nm__tog" data-nm-layer="net" aria-pressed="true"><i class="nm__key nm__key--net" aria-hidden="true"></i>${esc(N.net)}</button>
    </div>
    <div class="nm__regions" role="group" aria-label="${esc(N.region)}">${regions.map(([k, l], i) => `<button type="button" class="nm__reg" data-nm-region="${k}" aria-pressed="${i === 0}">${esc(l)}</button>`).join('')}</div>
    <label class="nm__find"><span class="vh">${esc(N.country)}</span><select data-nm-country><option value="">${esc(N.countryPh)}</option>${m.countries.map((c) => `<option value="${c.n}">${esc(c.name)}</option>`).join('')}</select></label>
  </div>
  <div class="nm__stage" data-nm-stage role="region" aria-label="${esc(N.map)}" aria-describedby="nm-help">
    <div class="nm__frame" data-nm-frame>
      <img class="nm__img" src="${ctx.base}img/world-dots.svg" alt="" width="1000" height="520" loading="lazy" decoding="async">
      <canvas class="nm__cv" data-nm-base aria-hidden="true"></canvas>
      <canvas class="nm__cv nm__cv--fx" data-nm-fx aria-hidden="true"></canvas>
      <div class="nm__zoom" data-nm-zoom hidden>
        <button type="button" data-nm-z="in" aria-label="${esc(t.map.zoomIn)}">${icon('plus')}</button>
        <button type="button" data-nm-z="out" aria-label="${esc(t.map.zoomOut)}">${icon('minus')}</button>
        <button type="button" data-nm-z="reset" aria-label="${esc(t.map.reset)}">${icon('reset')}</button>
      </div>
      <div class="nm__marks" role="group" aria-label="${esc(N.marks)}" data-nm-marks>${marks}</div>
    </div>
    <div class="nm__card" data-nm-card hidden></div>
    <p class="vh" id="nm-help">${esc(N.help)}</p>
  </div>
  <div class="wrap nm__foot">
    <p class="nm__legend" data-nm-legend><span><i class="nm__key nm__key--site" aria-hidden="true"></i>${esc(N.legendSite)}</span><span><i class="nm__key nm__key--rep" aria-hidden="true"></i>${esc(N.legendRep)}</span></p>
    <p class="cluster"><a class="btn btn--light" href="${ctx.href('locations')}">${esc(P.cta)}</a><a class="link link--light" href="${ctx.hrefA('contact', {}, 'karte')}">${esc(t.pages.home.worldCta2)}</a></p>
  </div>
  <script type="application/json" data-nm-model>${model}</script>
</section>`;
}

// ---------- Geschichte ----------
const HERITAGE_YEARS = ['1945', '1956', '1991', '2003', '2008', '2026'];
function heritage(ctx) {
  const { t, href } = ctx;
  const C = t.pages.company;
  const Hh = t.pages.home.heritage;
  const items = HERITAGE_YEARS.map((y) => C.history.find(([yy]) => yy === y)).filter(Boolean);
  return `<section class="ch" aria-labelledby="he-title">
  <div class="wrap">
    <div class="ch__head ch__head--row" data-reveal="head"><div><h2 class="ch__title" id="he-title">${esc(Hh.title)}</h2><p class="ch__lead">${esc(Hh.lead)}</p></div><a class="link" href="${href('company')}">${esc(Hh.cta)}${icon('arrow')}</a></div>
    <ol class="tl2" tabindex="0" aria-label="${esc(Hh.title)}">${items.map(([year, title, text]) => {
      const k = (HISTORY_IMG[year] || []).find((x) => ctx.img[x]);
      return `<li class="tl2__item"><span class="tl2__y">${esc(year)}</span>${k ? `<span class="tl2__img">${imgTag(ctx, k, { alt: '', sizes: '(max-width: 700px) 60vw, 16vw', max: 960 })}</span>` : '<span class="tl2__img tl2__img--none" aria-hidden="true"></span>'}<b>${esc(title)}</b><span>${esc(text)}</span></li>`;
    }).join('')}</ol>
  </div>
</section>`;
}

// ---------- Qualität ----------
function quality(ctx) {
  const { t, href } = ctx;
  const H = t.pages.home;
  return `<section class="ch ch--porcelain" aria-labelledby="qu-title">
  <div class="wrap ch__split">
    <h2 class="ch__title" id="qu-title" data-reveal="head">${esc(H.qTitle)}</h2>
    <div class="ch__body" data-reveal="head">
      <p class="ch__text">${esc(H.proofLead)}</p>
      <dl class="figs figs--2">${H.proofFacts.map(([v, l]) => `<div class="fig"><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <p><a class="link" href="${href('quality')}">${esc(H.proofCta)}${icon('arrow')}</a></p>
    </div>
  </div>
</section>`;
}

// ---------- News: ruhige Liste ----------
function newsList(ctx) {
  const { t, href, lang } = ctx;
  const H = t.pages.home;
  const items = ctx.data.news.slice(0, 4);
  return `<section class="ch" aria-labelledby="nw-title">
  <div class="wrap">
    <div class="ch__head ch__head--row" data-reveal="head"><h2 class="ch__title" id="nw-title">${esc(H.newsTitle)}</h2><a class="link" href="${href('news')}">${esc(t.ui.allNews)}${icon('arrow')}</a></div>
    <ul class="nl">${items.map((n) => {
      const vf = n.v[lang] ? lang : n.v[ctx.dl] ? ctx.dl : n.v.de ? 'de' : Object.keys(n.v)[0];
      const v = n.v[vf];
      const vl = v.contentLang || vf;
      return `<li><a class="nl__item" href="${href('article', { slug: ctx.newsSlug(n) })}"><time datetime="${n.date}">${esc(fmtDate(n.date, lang))}</time><span class="nl__cat">${esc(t.lbl.newsCat[n.cat] || '')}</span><b${vl !== lang ? ` lang="${vl}"` : ''}>${esc(v.title)}</b>${icon('arrow')}</a></li>`;
    }).join('')}</ul>
  </div>
</section>`;
}

// ---------- Karriere ----------
function career(ctx) {
  const { t, href, data } = ctx;
  const H = t.pages.home;
  const k = 'mimg/stellenangebote_intro_slider_2_Produktion.webp';
  return `<section class="ch ch--flush" aria-labelledby="ca-title">
  <div class="wrap career2">
    <div class="career2__img" data-reveal="img">${ctx.img[k] ? imgTag(ctx, k, { alt: '', sizes: '(max-width: 900px) 100vw, 58vw', max: 1800, cover: 4 / 3 }) : ''}</div>
    <div class="career2__copy" data-reveal="head">
      <h2 class="ch__title" id="ca-title">${esc(H.careerTitle)}</h2>
      <p class="ch__text">${esc(H.careerLead)}</p>
      <p class="cluster"><a class="btn" href="${href('career')}">${esc(H.careerCta)}</a><span class="muted">${esc(ctx.plural(data.jobs.length, t.ui.jobCount))}</span></p>
    </div>
  </div>
</section>`;
}

export function home(ctx) {
  return `
${introOverlay(ctx)}
${stage(ctx)}
${principle(ctx)}
${spectrum(ctx)}
${finderSearch(ctx)}
${heritage(ctx)}
${netMap(ctx)}
${making(ctx)}
${quality(ctx)}
${newsList(ctx)}
${career(ctx)}`;
}

export function newsCard(ctx, n, { reveal = false, excerpt = true } = {}) {
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
  <div class="card__img${small ? ' card__img--small' : ''}"${small ? ` style="--bgimg:url(${ctx.imgUrl(img, 320)})"` : ''}${reveal ? ' data-reveal="img"' : ''}>${img && ctx.img[img] ? imgTag(ctx, img, { alt: '', sizes: small ? `${ctx.img[img].w}px` : '(max-width: 560px) 100vw, (max-width: 900px) 50vw, 33vw', max: 1600 }) : `<span class="card__ph"><svg viewBox="0 0 80 40" width="80" height="40" aria-hidden="true"><path d="M40 2 78 20 40 38 2 20Z" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>${esc(t.lbl.newsCat[n.cat] || '')}</span></span>`}</div>
  <div class="card__meta"><time datetime="${n.date}">${esc(fmtDate(n.date, lang))}</time><span>${esc(t.lbl.newsCat[n.cat] || '')}</span>${other ? `<span class="card__lang" title="${esc(t.ui[vl] || vl)}">${esc(vl.toUpperCase())}</span>` : ''}</div>
  <h3${other ? ` lang="${vl}"` : ''}>${esc(v.title)}</h3>
  ${excerpt && text ? `<p${other ? ` lang="${vl}"` : ''}>${esc(shorten(text, 150))}</p>` : ''}
</a>`;
}
