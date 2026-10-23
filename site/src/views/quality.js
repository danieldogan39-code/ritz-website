// Qualität und Zertifikate. Leitidee: „Kein Wandler verlässt das Werk ungeprüft.“ – und gemessen wird mit Abstand.
// Kopf: die Fehlergrenze eines Stromwandlers der Klasse 0,2S (IEC 61869-2) auf halblogarithmischem Papier, maßstäblich
// dazu die Messunsicherheit des akkreditierten Kalibrierlabors (±0,010 %, k = 2): ein schmales rotes Band um die Nulllinie.
// Beim Laden zieht sich das Band von der engsten Fehlergrenze (±0,2 %) auf seine wahre Breite zusammen – Faktor 20.
// Darunter die Prüfkette (Gießharz, Stückprüfung mit Prüffeldern, Beglaubigung und Eichung), der Akkreditierungsumfang
// des Labors, eine Matrix der Zertifikate und Zulassungen je Standort und drei Belege von Zertifizierern und Kunden.
// Zahlen und Gültigkeiten stehen in catalog.js (mit Quellenangabe), Texte je Sprache in pages.quality.
import { esc, icon, imgTag, fmtDate, fmtNum, tpl } from '../lib/util.js';
import { crumbs, sectionHead, ctaBand, docIn } from './layout.js';
import { CT_CLASS, LAB_SCOPE, QUALITY_SITES, QUALITY_CERTS, QUALITY_REC, QUALITY_IMG } from '../lib/catalog.js';

const docByFile = (ctx, f) => ctx.data.docs.find((d) => d.file === f);
// erste Fassung einer Dateiliste, die diese Sprachfassung zeigt
const pickDoc = (ctx, files) => { for (const f of files || []) { const d = docIn(ctx, docByFile(ctx, f)); if (d) return d; } return null; };
const SITE_NAME = { kirchaich: 'Kirchaich', dresden: 'Ottendorf-Okrilla' };
const loc = (ctx, id) => ctx.data.contacts.locations.find((x) => x.id === id) || {};
const siteName = (ctx, id) => SITE_NAME[id] || (loc(ctx, id).city || id).replace(/\s*\(.*\)$/, '');
const day = (ctx, iso) => fmtDate(iso, ctx.lang);
const NB = ' ';
// Zahl mit fester Nachkommastellenzahl; Prozentwerte mit ±
const num = (ctx, v, d) => fmtNum(v, ctx.lang, d === undefined ? {} : { minimumFractionDigits: d, maximumFractionDigits: d });
const pm = (ctx, v, d) => `±${num(ctx, v, d)}${NB}%`;
const cls = (ctx) => `${num(ctx, CT_CLASS.cls)}${CT_CLASS.s ? 'S' : ''}`;
// Beschriftung „Wort {v}“: das Wort darf auf schmalen Bildschirmen entfallen, der Wert bleibt
const word = (t, v) => t.split('{v}').map((x) => (x.trim() ? `<span class="fg__w">${esc(x)}</span>` : esc(x))).join(esc(v));

// ---------- Kopf ----------
// Diagrammraum: Strom logarithmisch 0,8 … 150 % des Bemessungsstroms, Messabweichung linear ±0,9 %
const XD = [0.8, 150], YD = 0.9;
const r2 = (v) => Math.round(v * 100) / 100;
const xp = (i) => r2((Math.log10(i / XD[0]) / Math.log10(XD[1] / XD[0])) * 100);
const yp = (v) => r2(((YD - v) / (2 * YD)) * 100);
// Rasterlinien wie auf halblogarithmischem Papier: Dekaden kräftiger, Zwischenwerte fein
const LOG_MINOR = [2, 3, 4, 5, 6, 7, 8, 9, 20, 30, 40, 50, 60, 70, 80, 90];
const LOG_MAJOR = [1, 10, 100];
const Y_GRID = [0.8, 0.6, 0.4, 0.2, -0.2, -0.4, -0.6, -0.8];
const Y_LABEL = [0.8, 0.4, 0, -0.4, -0.8];
const X_LABEL = [1, 5, 20, 100];

function limitChart(ctx, F) {
  const lim = CT_CLASS.pts;
  const first = lim[0], last = lim[lim.length - 1];
  const tight = Math.min(...lim.map((p) => p[1]));
  const u = LAB_SCOPE.rows.find((r) => r[0] === 'ct')[4];
  const up = lim.map(([i, e]) => `${xp(i)} ${yp(e)}`).join(' L');
  const lo = lim.map(([i, e]) => `${xp(i)} ${yp(-e)}`).join(' L');
  const poly = [...lim.map(([i, e]) => `${xp(i)}% ${yp(e)}%`), ...lim.slice().reverse().map(([i, e]) => `${xp(i)}% ${yp(-e)}%`)].join(', ');
  const vline = (i, c) => `<path class="${c}" d="M${xp(i)} 0V100"/>`;
  const hline = (v, c) => `<path class="${c}" d="M0 ${yp(v)}H100"/>`;
  const fmtY = (v) => (v === 0 ? '0' : `${v > 0 ? '+' : '−'}${num(ctx, Math.abs(v), 1)}`);
  const C = cls(ctx);
  const aria = tpl(F.aria, { cls: C, e1: pm(ctx, first[1]), e5: pm(ctx, lim[1][1]), e20: pm(ctx, tight), u: pm(ctx, u, 3) });
  // Band: Höhe = 2 × Messunsicherheit; Startmaßstab = engste Fehlergrenze / Messunsicherheit
  const bandTop = yp(u), bandH = r2(yp(-u) - yp(u));
  const k = r2(tight / u);
  return `<div class="fg__plot" role="img" aria-label="${esc(aria)}">
          <span class="fg__yt" aria-hidden="true">${esc(F.y)}</span>
          <div class="fg__ya" aria-hidden="true">${Y_LABEL.map((v) => `<span style="top:${yp(v)}%">${esc(fmtY(v))}</span>`).join('')}</div>
          <div class="fg__area" aria-hidden="true" style="--k:${k}">
            <svg class="fg__grid" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
              ${LOG_MINOR.map((i) => vline(i, 'fg__g1')).join('')}${LOG_MAJOR.map((i) => vline(i, 'fg__g2')).join('')}
              ${Y_GRID.map((v) => hline(v, 'fg__g1')).join('')}${hline(0, 'fg__g0')}
            </svg>
            <div class="fg__draw">
              <div class="fg__zone" style="clip-path: polygon(${poly})"></div>
              <svg class="fg__lim" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
                <path d="M${up}"/><path d="M${lo}"/>
                <path class="fg__end" d="M${xp(first[0])} ${yp(first[1])}V${yp(-first[1])}M${xp(last[0])} ${yp(last[1])}V${yp(-last[1])}"/>
              </svg>
            </div>
            <i class="fg__band" style="left:${xp(first[0])}%;right:${r2(100 - xp(last[0]))}%;top:${bandTop}%;height:${bandH}%"></i>
            <span class="fg__n fg__n--e1" style="left:${xp(first[0])}%;top:${yp(first[1])}%">${esc(pm(ctx, first[1]))}</span>
            <span class="fg__n fg__n--e5" style="left:${xp(lim[1][0])}%;top:${yp(lim[1][1])}%">${esc(pm(ctx, lim[1][1]))}</span>
            <span class="fg__n fg__n--lim" style="right:${r2(100 - xp(last[0]))}%;top:${yp(tight)}%">${word(F.limit, pm(ctx, tight))}</span>
            <span class="fg__n fg__n--u" style="right:${r2(100 - xp(last[0]))}%;top:50%">${esc(tpl(F.unc, { v: pm(ctx, u, 3) }))}</span>
          </div>
          <div class="fg__xa" aria-hidden="true">${X_LABEL.map((i) => `<span style="left:${xp(i)}%">${esc(num(ctx, i))}</span>`).join('')}</div>
          <span class="fg__xt" aria-hidden="true">${esc(F.x)}</span>
        </div>`;
}

function head(ctx, Q) {
  const { t, href } = ctx;
  const F = Q.fig;
  const C = cls(ctx);
  const u = LAB_SCOPE.rows.find((r) => r[0] === 'ct')[4];
  const doc = pickDoc(ctx, [LAB_SCOPE.file]);
  const tb = F.tb.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(tpl(b, { cls: C, u: pm(ctx, u, 3) }))}</dd></div>`).join('');
  return `<section class="phead qu-hero">
  <div class="wrap">${crumbs(ctx, [[t.nav.company, href('company')], [Q.title]])}
    <div class="qu-hero__grid">
      <div class="qu-hero__copy">
        <h1>${esc(Q.h1)}</h1>
        <p class="lead">${esc(Q.lead)}</p>
        <div class="cluster qu-hero__cta"><a class="btn" href="#zertifikate">${icon('download')}${esc(Q.ctaCerts)}</a><a class="btn btn--ghost" href="${href('contact', {}, { topic: 2 })}">${icon('mail')}${esc(Q.ctaAsk)}</a></div>
      </div>
      <figure class="fg">
        <div class="fg__head"><b class="fg__t">${esc(F.title)}</b><span class="fg__s">${esc(tpl(F.sub, { cls: C }))}</span></div>
        ${limitChart(ctx, F)}
        <dl class="fg__tb">${tb}</dl>
        <figcaption class="fg__cap"><span>${esc(tpl(F.src, { id: LAB_SCOPE.id }))}</span>${doc ? `<a class="fg__doc" ${ctx.docAttrs(doc)}>${icon(ctx.docHref(doc) ? 'download' : 'mail', 'width="15" height="15"')}<span>${esc(F.doc)}</span></a>` : ''}</figcaption>
      </figure>
    </div>
  </div>
</section>`;
}

// ---------- Prüfung ----------
function testing(ctx, Q) {
  const img = (k, alt, sizes, opt = {}) => (ctx.img[QUALITY_IMG[k]] ? imgTag(ctx, QUALITY_IMG[k], { alt, sizes, max: 960, ...opt }) : '');
  const steps = Q.chain.map(([title, text], i) => {
    const more = i === 1 ? `
          <dl class="qu-specs">${Q.specs.map(([v, l]) => `<div><dt>${esc(v)}</dt><dd>${esc(l)}</dd></div>`).join('')}</dl>
          <p class="qu-pd">${esc(Q.pd)}</p>
          <div class="qu-shots">
            <figure>${img('transformer', Q.imgTransformer, '(max-width: 480px) 46vw, 220px')}<figcaption>${esc(Q.imgTransformer)}</figcaption></figure>
            <figure>${img('busbar', Q.imgBusbar, '(max-width: 480px) 46vw, 220px')}<figcaption>${esc(Q.imgBusbar)}</figcaption></figure>
          </div>` : '';
    return `<li class="qu-chain__i">
        <span class="qu-chain__n" aria-hidden="true">${i + 1}</span>
        <div class="qu-chain__b"><h3>${esc(title)}</h3><p>${esc(text)}</p>${more}</div>
      </li>`;
  }).join('');
  return `<section class="section section--porcelain qu-test" id="pruefung" aria-labelledby="qu-test-t">
  <div class="wrap">
    ${sectionHead(Q.testTitle, Q.testLead, '', { id: 'qu-test-t' })}
    <div class="qu-test__grid">
      <div class="qu-test__img">${img('inspect', Q.imgInspect, '(max-width: 900px) 100vw, 40vw', { cover: 4 / 5 })}</div>
      <ol class="qu-chain">${steps}</ol>
    </div>
  </div>
</section>`;
}

// ---------- Kalibrierlabor ----------
function lab(ctx, Q) {
  const S = Q.scope;
  const q = (v, unit) => `${typeof v === 'number' ? num(ctx, v) : v}${NB}${unit}`;
  const rows = LAB_SCOPE.rows.map(([obj, f, a, b, e, w]) => {
    const range = tpl(a[2] === 'gt' ? S.gt : S.to, { a: q(a[0], a[1]), b: q(b[0], b[1]) });
    return `<tr><th scope="row">${esc(S[obj])}<span>${esc(num(ctx, f))}${NB}Hz</span></th><td>${esc(range)}</td><td class="qu-scope__u" data-l="${esc(S.err)}">${esc(num(ctx, e, 3))}${NB}%</td><td class="qu-scope__u" data-l="${esc(S.ang)}">${esc(num(ctx, w, 2))}${NB}${esc(S.min)}</td></tr>`;
  }).join('');
  const doc = pickDoc(ctx, [LAB_SCOPE.file]);
  const facts = Q.labFacts.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(tpl(b, { id: LAB_SCOPE.id, date: day(ctx, LAB_SCOPE.since) }))}</dd></div>`).join('');
  return `<section class="section qu-lab" id="kalibrierlabor" aria-labelledby="qu-lab-t">
  <div class="wrap qu-lab__grid">
    <div class="qu-lab__copy">
      <h2 id="qu-lab-t">${esc(Q.labTitle)}</h2>
      <p class="lead">${esc(Q.labText)}</p>
      <dl class="qu-lab__facts">${facts}</dl>
      ${doc ? `<a class="link" ${ctx.docAttrs(doc)}>${esc(Q.labDoc)}${icon(ctx.docHref(doc) ? 'download' : 'mail', 'width="16" height="16"')}</a>` : ''}
    </div>
    <div class="qu-scope">
      <table>
        <caption>${esc(S.cap)}</caption>
        <thead><tr><th scope="col">${esc(S.obj)}</th><th scope="col">${esc(S.range)}</th><th scope="col">${esc(S.err)}</th><th scope="col">${esc(S.ang)}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="qu-scope__note">${esc(Q.labNote)}</p>
    </div>
  </div>
</section>`;
}

// ---------- Zertifikate und Zulassungen ----------
const MARK = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11"/><path d="m7 12.4 3.3 3.3L17.2 8.8"/></svg>';
function certs(ctx, Q) {
  const M = Q.cm;
  const cols = QUALITY_SITES.map((id) => `<th scope="col"><span class="certm__city">${esc(siteName(ctx, id))}</span><span class="certm__cc">${esc(loc(ctx, id).country || '')}</span></th>`).join('');
  const rows = QUALITY_CERTS.map((c) => {
    const R = M.rows[c.k];
    const name = c.std || R.name;
    const doc = pickDoc(ctx, c.files);
    const extra = pickDoc(ctx, c.extra);
    const when = c.valid ? tpl(M.valid, { date: day(ctx, c.valid) }) : c.since ? tpl(M.since, { date: day(ctx, c.since) }) : '';
    const dl = (d, label) => `<a class="certm__doc" ${ctx.docAttrs(d)}>${icon(ctx.docHref(d) ? 'download' : 'mail', 'width="15" height="15"')}<span>${esc(label)}<span class="vh"> ${esc(name)}</span></span></a>`;
    const cells = QUALITY_SITES.map((id) => (c.sites.includes(id)
      ? `<td class="is-on">${MARK}<span class="vh">${esc(M.yes)}</span><span class="certm__site" aria-hidden="true">${esc(siteName(ctx, id))}</span></td>`
      : `<td class="is-off"><i aria-hidden="true"></i><span class="vh">${esc(M.no)}</span></td>`)).join('');
    return `<tr>
          <th scope="row"><b>${esc(name)}</b><span class="certm__what">${esc(R.what)}</span>${R.by || c.no ? `<span class="certm__by">${R.by ? `<span>${esc(R.by)}</span>` : ''}${c.no ? `<span>${esc(tpl(M.num, { no: c.no }))}</span>` : ''}</span>` : ''}${R.note ? `<span class="certm__by"><span>${esc(R.note)}</span></span>` : ''}</th>
          ${cells}
          <td class="certm__st">${when ? `<span class="certm__when">${esc(when)}</span>` : ''}${doc ? dl(doc, M.doc) : ''}${extra ? dl(extra, M.silver) : ''}</td>
        </tr>`;
  }).join('');
  return `<section class="section section--porcelain qu-certs" id="zertifikate" aria-labelledby="qu-certs-t">
  <div class="wrap">
    ${sectionHead(M.title, M.lead, '', { id: 'qu-certs-t' })}
    <div class="certm">
      <table>
        <caption class="vh">${esc(M.cap)}</caption>
        <thead><tr><th scope="col">${esc(M.head)}</th>${cols}<th scope="col">${esc(M.status)}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="certm__foot"><p>${esc(M.qr)}</p><a class="link" href="${ctx.href('downloads', {}, { type: 'certificate' })}">${esc(M.all)}${icon('arrow', 'width="16" height="16"')}</a></div>
  </div>
</section>`;
}

// ---------- Unabhängig bestätigt ----------
function recognition(ctx, Q) {
  const { href } = ctx;
  const items = QUALITY_REC.map((id, i) => {
    const n = ctx.data.news.find((x) => x.id === id);
    const r = Q.rec[i];
    if (!r) return '';
    return `<li class="qu-rec__i">
        <span class="qu-rec__k">${esc(r[0])}</span>
        <b class="qu-rec__v">${esc(r[1])}</b>
        <p>${esc(r[2])}</p>
        ${n ? `<a class="link link--light" href="${href('article', { slug: ctx.newsSlug(n) })}">${esc(r[3])}${icon('arrow', 'width="16" height="16"')}</a>` : ''}
      </li>`;
  }).join('');
  return `<section class="section section--resin qu-rec" id="anerkennung" aria-labelledby="qu-rec-t">
  <div class="wrap">
    <div class="qu-rec__head"><h2 id="qu-rec-t">${esc(Q.recTitle)}</h2><p>${esc(Q.recLead)}</p></div>
    <ul class="qu-rec__list">${items}</ul>
  </div>
</section>`;
}

export function qualityPage(ctx) {
  const Q = ctx.t.pages.quality;
  const ids = ['pruefung', 'kalibrierlabor', 'anerkennung', 'zertifikate'];
  const tabs = `<nav class="pd-tabs pd-tabs--page" aria-label="${esc(Q.tabsLabel)}"><div class="wrap pd-tabs__list" data-tabs>${Q.tabs.map((x, i) => `<a href="#${ids[i]}"${i === 0 ? ' class="is-active"' : ''}>${esc(x)}</a>`).join('')}</div></nav>`;
  const ask = `<section class="section section--tight"><div class="wrap">${ctaBand(ctx, Q.askTitle, Q.askText, Q.askCta, ctx.href('contact', {}, { topic: 2 }))}</div></section>`;
  return [head(ctx, Q), tabs, testing(ctx, Q), lab(ctx, Q), recognition(ctx, Q), certs(ctx, Q), ask].join('\n');
}
