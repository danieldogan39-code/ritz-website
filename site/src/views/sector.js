// Anwendungsseiten. Leitidee: „Wo RITZ in Ihrer Anlage sitzt.“ Jede Branche beginnt mit dem Schaltbild ihrer typischen
// Anlage (Leitwartentafel, sectormaps.js); rot und nummeriert die Einbauorte der RITZ-Produkte. Dieselben Nummern tragen
// die Legende, die Anforderungen mit unserer Lösung und die Produktgruppen weiter unten – die Seite liest sich als
// Weg vom Einbauort zum passenden Produkt. Kennwerte (Produktzahl, Spannungsebenen, Lieferzeit, Herstellungsorte)
// werden aus den Produktdaten der Gruppen berechnet. Texte je Sprache in pages.sectors.items.<branche>.
import { esc, icon, imgTag, fmtNum, tpl } from '../lib/util.js';
import { SECTORS } from '../lib/routes.js';
import { crumbs, sectionHead, docRow, personCard, langDocs } from './layout.js';
import { newsCard } from './home.js';
import { sortDocs, peopleFor } from './products.js';
import { SECTOR_LINKS, SECTOR_IMG, SECTOR_NEEDS } from '../lib/catalog.js';
import { filterProducts, parseQuery, productCard } from '../lib/product.js';
import { sectorMap } from './sectormaps.js';

const docByFile = (ctx, f) => ctx.data.docs.find((d) => d.file === f);
const newsByPrefix = (ctx, pre) => ctx.data.news.find((n) => n.id.startsWith(pre));
// Spannungsachse wie auf der Startseite: 0,72 … 550 kV logarithmisch
const AX = [0.72, 550];
const axPos = (v) => (Math.log10(v / AX[0]) / Math.log10(AX[1] / AX[0])) * 100;
const AX_TICKS = [1, 10, 100];

function groupsOf(ctx, it) {
  return it.groups.map(([label, qs], i) => {
    const q = parseQuery(qs);
    const list = filterProducts(ctx.data.products, q, ctx.t);
    return { n: i + 1, label, qs, list, finder: Object.fromEntries(new URLSearchParams(qs)) };
  });
}

// Kennwerte aus den Produkten aller Gruppen
function facts(ctx, S, groups) {
  const { t, lang } = ctx;
  const all = [...new Map(groups.flatMap((g) => g.list).map((p) => [p.id, p])).values()];
  const um = all.flatMap((p) => p.um || []).filter((v) => v > 0);
  const weeks = all.map((p) => (p.weeks || [])[0]).filter((v) => v > 0);
  const made = ['DE', 'AT', 'HU', 'US', 'CN'].filter((c) => all.some((p) => p.made === c));
  const lo = um.length ? Math.min(...um) : 0, hi = um.length ? Math.max(...um) : 0;
  const F = S.facts;
  const range = lo ? `${fmtNum(lo, lang)}–${fmtNum(hi, lang)} kV` : '';
  const axis = lo ? `<span class="sc-axis" aria-hidden="true">${AX_TICKS.map((v) => `<b style="left:${axPos(v).toFixed(2)}%"></b>`).join('')}<i style="left:${axPos(lo).toFixed(2)}%;width:${Math.max(1.5, axPos(hi) - axPos(lo)).toFixed(2)}%"></i></span>` : '';
  const rows = [
    [F.products, esc(fmtNum(all.length, lang)), esc(tpl(F.productsNote, { n: fmtNum(groups.length, lang) }))],
    range ? [F.voltage, esc(range), axis] : null,
    weeks.length ? [F.weeks, esc(tpl(S.weeksFrom, { n: fmtNum(Math.min(...weeks), lang) })), esc(F.weeksNote)] : null,
    made.length ? [F.made, esc(made.map((c) => t.lbl.made[c] || c).join(', ')), ''] : null,
  ].filter(Boolean);
  return `<dl class="sc-facts">${rows.map(([a, b, c]) => `<div><dt>${esc(a)}</dt><dd>${b}${c ? `<small>${c}</small>` : ''}</dd></div>`).join('')}</dl>`;
}

function head(ctx, S, it, sector, groups) {
  const { t, href } = ctx;
  const M = S.map;
  const legend = groups.map((g) => `<li><a href="#gruppe-${g.n}" data-pt="${g.n}"><span class="sc-n">${g.n}</span><b>${esc(g.label)}</b><small>${esc(ctx.plural(g.list.length, t.ui.productCount))}</small></a></li>`).join('');
  return `<section class="phead sc-hero">
  <div class="wrap">${crumbs(ctx, [[S.title, href('sectors')], [it.title]])}
    <div class="sc-hero__top">
      <h1>${shy(it.title, ctx.lang)}</h1>
      <div class="sc-hero__side">
        <p class="lead">${esc(it.lead)}</p>
        <div class="cluster sc-hero__cta"><a class="btn" href="#produkte">${esc(S.ctaProducts)}</a><a class="btn btn--ghost" href="${href('inquiry')}">${icon('mail')}${esc(S.ctaInquiry)}</a></div>
      </div>
    </div>
    ${facts(ctx, S, groups)}
    <div class="mp" data-mp>
      <div class="mp__main">
        <div class="mp__head"><b class="mp__t">${esc(M.kicker)}</b><span class="mp__s">${esc(it.map.title)}</span></div>
        <div class="mp__scroll" tabindex="0" role="group" aria-label="${esc(tpl(M.aria, { title: it.map.title }))}">${sectorMap(sector, it.map.l)}</div>
        <p class="mp__hint" aria-hidden="true">${esc(M.hint)}</p>
        <p class="mp__keys" aria-hidden="true"><span><i class="k-hv"></i>${esc(M.keyHv)}</span><span><i></i>${esc(M.keyMv)}</span><span><i class="k-sec"></i>${esc(M.keySec)}</span><span><i class="k-r"></i>${esc(M.keyRitz)}</span></p>
      </div>
      <nav class="mp__legend" aria-label="${esc(M.legend)}"><h2>${esc(M.legend)}</h2><ol>${legend}</ol></nav>
    </div>
  </div>
</section>`;
}

// Weiche Trennstellen in langen Wörtern der Überschrift (nur dort; Titel, Menü und Suche bleiben unverändert)
const SHY = {
  de: ['Energie|versorgung', 'Schalt|anlagen|bau', 'Infra|struktur', 'Zähler|technik', 'Kraft|werke', 'Gene|ratoren', 'Erneuer|bare', 'Bahn|technik'],
  en: ['infra|structure', 'Switch|gear', 'manu|facturers', 'gene|rators', 'Renew|ables'],
  fr: ['appa|reillages', 'infra|structures', 'renou|velables', 'géné|rateurs', 'Fournis|seurs', 'Construc|teurs', 'électri|ques'],
  hu: ['Kapcsoló|berendezés', 'infra|struktúra', 'Energia|ellátás', 'Mérés|technika', 'Vasút|technika', 'generá|torok'],
  es: ['infra|estructura', 'genera|dores', 'Renova|bles', 'Suminis|tro', 'Fabri|cantes', 'Ferro|carril'],
};
function shy(title, lang) {
  let s = esc(title);
  for (const w of SHY[lang] || []) s = s.replace(w.replace(/\|/g, ''), w.replace(/\|/g, '&shy;'));
  return s;
}

// ---------- Worauf es ankommt ----------
function needs(ctx, S, it, sector, groups) {
  const map = SECTOR_NEEDS[sector] || [];
  const rows = it.needs.map(([need, answer], i) => {
    const g = groups[(map[i] || 1) - 1];
    return `<li class="sc-need">
        <div class="sc-need__b"><h3>${esc(need)}</h3><p>${esc(answer)}</p></div>
        ${g ? `<a class="sc-need__go" href="#gruppe-${g.n}" data-pt="${g.n}"><span class="sc-n">${g.n}</span><span>${esc(g.label)}</span>${icon('arrow', 'width="16" height="16"')}</a>` : ''}
      </li>`;
  }).join('');
  const img = SECTOR_IMG[sector] && ctx.img[SECTOR_IMG[sector]] ? imgTag(ctx, SECTOR_IMG[sector], { alt: '', sizes: '(max-width: 900px) 100vw, 34vw', max: 1280, cover: 4 / 5 }) : '';
  return `<section class="section sc-needs" aria-labelledby="sc-needs-t">
  <div class="wrap sc-needs__grid">
    ${img ? `<div class="sc-needs__img">${img}</div>` : ''}
    <div class="sc-needs__body">
      <h2 id="sc-needs-t">${esc(S.challenges)}</h2>
      <ul class="sc-needs__list">${rows}</ul>
      <p class="sc-needs__more"><a class="link" href="${ctx.href('quality')}">${esc(S.qualityLink)}${icon('arrow', 'width="16" height="16"')}</a></p>
    </div>
  </div>
</section>`;
}

// ---------- Produktgruppen ----------
function products(ctx, S, groups) {
  const { t, href } = ctx;
  const tabs = groups.map((g) => `<button type="button" class="sc-tab" data-sc-tab="${g.n}"><span class="sc-n">${g.n}</span><span class="sc-tab__l">${esc(g.label)}</span><small>${esc(fmtNum(g.list.length, ctx.lang))}</small></button>`).join('');
  const panels = groups.map((g) => {
    const top = g.list.slice(0, 8);
    return `<div class="sc-panel" id="gruppe-${g.n}" data-sc-panel="${g.n}">
        <h3 class="sc-panel__h"><span class="sc-n">${g.n}</span>${esc(g.label)} <small>${esc(ctx.plural(g.list.length, t.ui.productCount))}</small></h3>
        ${top.length ? `<div class="pgrid pgrid--sector">${top.map((p) => productCard(ctx, p)).join('')}</div>` : ''}
        <p class="sc-panel__more"><a class="btn btn--ghost" href="${href('finder', {}, g.finder)}">${esc(tpl(S.groupAll, { n: fmtNum(g.list.length, ctx.lang) }))}</a></p>
      </div>`;
  }).join('');
  return `<section class="section section--porcelain sc-prod" id="produkte" aria-labelledby="sc-prod-t">
  <div class="wrap">
    ${sectionHead(S.solutions, '', '', { id: 'sc-prod-t' })}
    <div class="sc-tabs" data-sc-tabs hidden aria-label="${esc(S.solutions)}">${tabs}</div>
    ${panels}
  </div>
</section>`;
}

// ---------- Praxis, Unterlagen, Ansprechpartner, weitere Anwendungen ----------
function rest(ctx, S, sector) {
  const { t, href } = ctx;
  const Lk = SECTOR_LINKS[sector];
  const news = Lk.news.map((p) => newsByPrefix(ctx, p)).filter(Boolean).slice(0, 3);
  const docsShown = sortDocs(ctx, langDocs(ctx, Lk.docs.map((f) => docByFile(ctx, f)).filter(Boolean)));
  const people = [...new Map(Lk.areas.flatMap((a) => peopleFor(ctx, a)).filter((p) => p.email).map((p) => [p.id, p])).values()].slice(0, 4);
  const others = SECTORS.filter((s) => s !== sector).map((s) => {
    const o = t.pages.sectors.items[s];
    return `<li><a class="sc-other" href="${href('sector', { sector: s })}"><span class="sc-other__img">${ctx.img[SECTOR_IMG[s]] ? imgTag(ctx, SECTOR_IMG[s], { alt: '', sizes: '120px', max: 640, cover: 1 }) : ''}</span><span class="sc-other__b"><b>${esc(o.title)}</b><span>${esc(o.short)}</span></span></a></li>`;
  }).join('');
  return `${news.length ? `<section class="section sc-proof"><div class="wrap">${sectionHead(S.proof)}<div class="news-grid">${news.map((n) => newsCard(ctx, n)).join('')}</div></div></section>` : ''}
${docsShown.length ? `<section class="section section--tight"><div class="wrap">${sectionHead(S.docs)}<div class="docs docs--cols">${docsShown.map((d) => docRow(ctx, d)).join('')}</div></div></section>` : ''}
${people.length ? `<section class="section section--porcelain"><div class="wrap">${sectionHead(t.ui.contactPersons)}<div class="people">${people.map((p) => personCard(ctx, p)).join('')}</div></div></section>` : ''}
<section class="section sc-more" aria-labelledby="sc-more-t"><div class="wrap">
  <h2 class="h3" id="sc-more-t">${esc(S.others)}</h2>
  <ul class="sc-others">${others}</ul>
</div></section>`;
}

export function sectorPage(ctx, sector) {
  const S = ctx.t.pages.sectors;
  const it = S.items[sector];
  const groups = groupsOf(ctx, it);
  return `<div class="sc-page" data-sector>${head(ctx, S, it, sector, groups)}
${needs(ctx, S, it, sector, groups)}
${products(ctx, S, groups)}
${rest(ctx, S, sector)}</div>`;
}
