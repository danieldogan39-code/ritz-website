// Karriereseite. Leitidee: „Jeder Wandler geht durch viele Hände.“ Die Seite folgt dem Weg eines RITZ-Wandlers –
// Beraten, Entwickeln, Fertigen, Prüfen, Liefern, dazu Organisieren – und jede Station ist zugleich Filter der
// Stellenliste darunter (mit Standort, Einstieg und Suche; Zahlen live). Danach: Einstiegswege nach Lebensphase,
// die Leistungen als Leistungsschild (Angaben aus den eigenen Stellenanzeigen), Einblicke aus den News und die
// ausschreibenden Standorte mit Personal-Postfach. Ohne Skript bleibt alles lesbar: die Liste zeigt dann alle Stellen.
import { esc, icon, imgTag, tpl, fmtDate, fmtNum, LOGO } from '../lib/util.js';
import { crumbs, sectionHead } from './layout.js';
import { JOB_AREAS, FLOW_AREAS, jobArea, JOB_SITES, splitJobTitle, normJob, countHtml } from '../lib/jobs.js';
import { CAREER_HERO, CAREER_NEWS, LOC_IMG } from '../lib/catalog.js';

// Linienzeichen der Stationen (24er-Raster, Strich wie die übrigen Symbole); Fertigen zeigt einen Ringkern-Stromwandler
const STATION_ICON = {
  sales: '<path d="M3.5 5h10.5a1.2 1.2 0 0 1 1.2 1.2v5.6a1.2 1.2 0 0 1-1.2 1.2H8.3L5 15.6V13H3.5a1.2 1.2 0 0 1-1.2-1.2V6.2A1.2 1.2 0 0 1 3.5 5Z"/><path d="M17.6 9h2.7a1.2 1.2 0 0 1 1.2 1.2v5.6a1.2 1.2 0 0 1-1.2 1.2h-1.4v2.6L15.6 17h-4.2a1.2 1.2 0 0 1-1.2-1.2V15.4"/>',
  dev: '<path d="M12 1.6v1.4"/><circle cx="12" cy="4.6" r="1.6"/><path d="M11.1 6 6.4 18.6M12.9 6 17.6 18.6"/><path d="M4.2 21.2c4.9-2.4 10.7-2.4 15.6 0" stroke-dasharray="1.6 2.2"/>',
  make: '<circle cx="12" cy="13.8" r="7.3"/><circle cx="12" cy="13.8" r="3.2"/><path d="M8.7 7.3V3.6h6.6v3.7"/><path d="M10.6 3.6V2.2M13.4 3.6V2.2"/>',
  test: '<path d="M3.6 16.6a8.6 8.6 0 0 1 16.8 0"/><path d="M5.6 11.2 6.9 12M12 7.9v1.5M18.4 11.2l-1.3.8"/><path d="m12 16.4 4.3-5.6"/><circle cx="12" cy="16.4" r="1.4"/><path d="M3 19.6h18"/>',
  log: '<path d="M12 3.2 20 7.6v8.8L12 20.8l-8-4.4V7.6Z"/><path d="M4 7.6 12 12l8-4.4M12 12v8.8M8 5.4l8 4.4"/>',
  org: '<rect x="9" y="3.2" width="6" height="4.6" rx=".6"/><rect x="2.8" y="16.2" width="6" height="4.6" rx=".6"/><rect x="15.2" y="16.2" width="6" height="4.6" rx=".6"/><path d="M12 7.8v4.2M5.8 16.2V12h12.4v4.2"/>',
};
const stationIcon = (k) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${STATION_ICON[k] || ''}</svg>`;


// Stellen mit Bereich und Standort (für Ansicht und Zählung)
export function careerJobs(ctx) {
  return ctx.data.jobs.map((j) => ({ ...j, area: jobArea(j), loc: j.location }));
}
// Ortsname der Standorte in der Sprachfassung (aus den Ausbildungsangaben, sonst wie in den Stellendaten)
const siteName = (ctx, s) => (ctx.t.pages.training.sites.find(([, m]) => m === s.mail) || [s.city])[0];

export function careerPage(ctx) {
  const { t, href, lang } = ctx;
  const K = t.pages.career;
  const jobs = careerJobs(ctx);
  const st = Object.fromEntries(K.stations.map(([k, verb, dept, text, roles]) => [k, { verb, dept, text, roles }]));
  const hero = ctx.data.news.find((n) => n.id === CAREER_HERO.news);
  return [hero_(ctx, K, jobs, hero), flow(ctx, K, st, jobs), entry(ctx, K, jobs), plate(ctx, K), insights(ctx, K), sites(ctx, K, jobs)].join('\n');
}

// ---------- Kopf ----------
function hero_(ctx, K, jobs, news) {
  const { t, href } = ctx;
  const cap = news ? `<a href="${href('article', { slug: ctx.newsSlug(news) })}">${esc(K.heroCap)}</a>` : esc(K.heroCap);
  return `<section class="phead cr-hero">
  <div class="wrap">${crumbs(ctx, [[K.title]])}
    <div class="cr-hero__grid">
      <div class="cr-hero__copy">
        <h1>${esc(K.h1)}</h1>
        <p class="lead">${esc(K.lead)}</p>
        <div class="cluster cr-hero__cta">
          <a class="btn btn--red" href="#stellen">${esc(K.ctaJobs)}<span class="cr-badge">${esc(fmtNum(jobs.length, ctx.lang))}</span></a>
          <a class="btn btn--ghost" href="${href('training')}">${esc(t.nav.training)}</a>
          <a class="btn btn--ghost" href="${href('internships')}">${esc(t.nav.internships)}</a>
        </div>
      </div>
      <figure class="cr-hero__fig">
        <div class="cr-hero__img">${imgTag(ctx, CAREER_HERO.img, { alt: K.heroAlt, sizes: '(max-width: 900px) 100vw, 46vw', eager: true })}</div>
        <figcaption>${cap}</figcaption>
      </figure>
    </div>
  </div>
</section>`;
}

// ---------- Stationen und Stellenliste ----------
function flow(ctx, K, st, jobs) {
  const { t, lang } = ctx;
  const n = (f) => jobs.filter(f).length;
  const stations = JOB_AREAS.map((k) => {
    const s = st[k];
    const c = n((j) => j.area === k);
    return `<li class="stn__i stn__i--${k}${FLOW_AREAS.includes(k) ? '' : ' stn__i--aside'}" data-stn="${k}">
      <span class="stn__node" aria-hidden="true">${stationIcon(k)}</span>
      <h3 class="stn__v">${esc(s.verb)}</h3>
      <p class="stn__d">${esc(s.dept)}</p>
      <p class="stn__x">${esc(s.text)}</p>
      <p class="stn__r">${esc(K.rolesLabel)} ${esc(s.roles)}</p>
      <button class="stn__b${c ? '' : ' is-zero'}" type="button" data-stn-b="${k}" data-dept="${esc(s.dept)}" aria-pressed="false"><span class="stn__c" data-stn-c>${countHtml(lang, c, t.ui.jobCount)}</span><span class="vh">: ${esc(s.dept)}</span></button>
    </li>`;
  }).join('');
  const sites = JOB_SITES.filter((s) => jobs.some((j) => j.loc === s.id));
  const chip = (attr, val, label, c) => `<button class="chip${val ? '' : ' is-on'}" type="button" ${attr}="${val}" aria-pressed="${val ? 'false' : 'true'}">${esc(label)}${val ? ` <span class="chip__n" data-n>${c}</span>` : ''}</button>`;
  const types = Object.keys(t.lbl.jobType).filter((k) => jobs.some((j) => j.type === k));
  const newTab = tpl(t.footer.newTab, { name: '' }).trim();
  const groups = JOB_AREAS.map((k) => {
    const list = jobs.filter((j) => j.area === k);
    if (!list.length) return '';
    return `<section class="jg" data-jg="${k}" aria-labelledby="jg-${k}">
      <h3 class="jg__h" id="jg-${k}"><span class="jg__v">${esc(st[k].verb)}</span><span class="jg__d">${esc(st[k].dept)}</span><span class="jg__n" data-jg-n>${list.length}</span></h3>
      <ul class="jg__list">${list.map((j) => {
        const [main, g] = splitJobTitle(j.title);
        const site = JOB_SITES.find((s) => s.id === j.loc);
        const city = site ? siteName(ctx, site) : j.city;
        const typ = `${t.lbl.jobType[j.type] || ''}${t.lbl.jobTime[j.time] ? `, ${t.lbl.jobTime[j.time]}` : ''}`;
        const q = normJob([j.title, j.city, city, st[k].verb, st[k].dept, st[k].roles, t.lbl.jobType[j.type]].join(' '));
        return `<li data-job data-area="${k}" data-loc="${esc(j.loc)}" data-type="${esc(j.type)}" data-q="${esc(q)}"><a class="jr" href="${esc(j.url)}" target="_blank" rel="noopener">
          <span class="jr__t" lang="de"><b>${esc(main)}</b>${g ? ` <span class="jr__g">${esc(g)}</span>` : ''}</span>
          <span class="jr__meta"><span class="jr__loc">${icon('pin', 'width="16" height="16"')}${esc(city)}</span><span class="jr__type">${esc(typ)}</span></span>
          <span class="jr__go"><span class="jr__gol">${esc(K.apply)}</span>${icon('arrowUpRight', 'width="18" height="18"')}<span class="vh"> ${esc(newTab)}</span></span>
        </a></li>`;
      }).join('')}</ul>
    </section>`;
  }).join('');
  const hrMail = JOB_SITES[0].mail;
  return `<section class="section cr-flow" id="stellen" aria-labelledby="cr-flow-t" data-career>
  <div class="wrap">
    ${sectionHead(K.flowTitle, K.flowLead, '', { id: 'cr-flow-t' })}
    <ol class="stn" aria-label="${esc(K.flowLabel)}">${stations}</ol>
    <div class="jb" data-jb>
      <div class="jb__bar">
        <div class="jb__q">${icon('search', 'width="18" height="18"')}<label class="vh" for="jb-q">${esc(K.searchLabel)}</label><input class="input" id="jb-q" type="search" placeholder="${esc(K.searchPh)}" autocomplete="off" spellcheck="false" data-jb-q></div>
        <div class="jb__f" role="group" aria-labelledby="jb-loc-l"><span class="jb__fl" id="jb-loc-l">${esc(K.locLabel)}</span>${chip('data-jb-loc', '', K.all, 0)}${sites.map((s) => chip('data-jb-loc', s.id, siteName(ctx, s), jobs.filter((j) => j.loc === s.id).length)).join('')}</div>
        <div class="jb__f" role="group" aria-labelledby="jb-type-l"><span class="jb__fl" id="jb-type-l">${esc(K.typeLabel)}</span>${chip('data-jb-type', '', K.all, 0)}${types.map((k) => chip('data-jb-type', k, t.lbl.jobType[k], jobs.filter((j) => j.type === k).length)).join('')}</div>
      </div>
      <div class="jb__status">
        <p class="jb__count" aria-live="polite" data-jb-count>${countHtml(ctx.lang, jobs.length, t.ui.jobCount)}</p>
        <span class="jb__area" data-jb-area hidden><span>${esc(K.areaLabel)}: <b data-jb-area-l></b></span><button class="icon-btn icon-btn--small" type="button" data-jb-area-x aria-label="${esc(K.areaRemove)}">${icon('close', 'width="14" height="14"')}</button></span>
        <button class="jb__reset" type="button" data-jb-reset hidden>${icon('reset', 'width="15" height="15"')}${esc(K.reset)}</button>
      </div>
      <div class="jb__groups" data-jb-groups>${groups}</div>
      <div class="jb__empty" data-jb-empty hidden>
        <p class="jb__empty-t">${esc(K.empty)}</p>
        <p>${esc(K.emptyText)}</p>
        <div class="cluster"><a class="btn btn--red" href="mailto:${esc(hrMail)}?subject=${encodeURIComponent(K.initiativeSubject)}" data-jb-mail data-subject="${esc(K.initiativeSubject)}">${icon('mail')}${esc(K.initiative)}</a><button class="btn btn--ghost" type="button" data-jb-reset>${esc(K.reset)}</button></div>
      </div>
      <p class="jb__note small">${esc(K.jobsNote)} <a href="https://ritz.jobs.personio.de/" target="_blank" rel="noopener">${esc(K.portal)}<span class="vh"> ${esc(newTab)}</span></a></p>
    </div>
  </div>
</section>`;
}

// ---------- Einstiegswege nach Lebensphase ----------
function entry(ctx, K, jobs) {
  const { t, href, lang } = ctx;
  const open = { training: jobs.filter((j) => j.type === 'training').length, jobs: jobs.filter((j) => j.type !== 'training').length, internships: 0 };
  return `<section class="section cr-entry" aria-labelledby="cr-entry-t">
  <div class="wrap">
    ${sectionHead(K.entryTitle, K.entryLead, '', { id: 'cr-entry-t' })}
    <ol class="entry">${K.entries.map(([stage, title, text, link, to]) => `<li class="entry__i">
      <span class="entry__stage">${esc(stage)}</span>
      <h3 class="entry__t">${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${open[to] ? `<p class="entry__open">${countHtml(lang, open[to], t.ui.jobCount)}</p>` : ''}
      <a class="link entry__go" href="${to === 'jobs' ? '#stellen' : href(to)}">${esc(link)}${icon('arrow', 'width="16" height="16"')}</a>
    </li>`).join('')}</ol>
  </div>
</section>`;
}

// ---------- Leistungsschild ----------
// dasselbe Schild wie in der Produktansicht (Kopf, Typ, Kenndaten, Fuß, Nieten) – hier mit RITZ als Arbeitgeber
function plate(ctx, K) {
  const row = ([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`;
  return `<section class="section section--resin cr-plate" aria-labelledby="cr-plate-t">
  <div class="wrap cr-plate__grid">
    <div class="cr-plate__copy">
      <h2 id="cr-plate-t">${esc(K.plateTitle)}</h2>
      <p class="lead">${esc(K.plateLead)}</p>
      <p>${esc(K.plateText)}</p>
      <p class="small cr-plate__note">${esc(K.plateNote)}</p>
    </div>
    <div class="plate plate--career">
      <div class="plate__head"><span class="plate__logo">${LOGO.replace('role="img" aria-label="RITZ"', 'aria-hidden="true" focusable="false"')}</span><span>${esc(K.plateMaker)}: RITZ Instrument Transformers</span></div>
      <p class="plate__type"><span>${esc(K.plateType)}</span><b>${esc(K.plateTypeV)}</b></p>
      <dl class="plate__grid">${K.plate.map(row).join('')}</dl>
      <p class="plate__foot"><span>${esc(K.plateYear)} 1945</span><span>${esc(K.plateOwner)}: ${esc(K.plateOwnerV)}</span></p>
      <i class="plate__rivet"></i><i class="plate__rivet"></i><i class="plate__rivet"></i><i class="plate__rivet"></i>
    </div>
  </div>
</section>`;
}

// ---------- Einblicke aus den News ----------
function insights(ctx, K) {
  const { href, lang } = ctx;
  const items = CAREER_NEWS.map(([id, img]) => [ctx.data.news.find((n) => n.id === id), img]).filter(([n, img]) => n && ctx.img[img]);
  if (!items.length) return '';
  return `<section class="section cr-ins" aria-labelledby="cr-ins-t">
  <div class="wrap">
    ${sectionHead(K.insightsTitle, K.insightsLead, '', { id: 'cr-ins-t' })}
    <ul class="ins">${items.map(([n, img], i) => {
      const vl = n.v[lang] ? lang : n.v[ctx.dl] ? ctx.dl : n.v.de ? 'de' : Object.keys(n.v)[0];
      const v = n.v[vl];
      const tl = v.contentLang || vl;
      return `<li class="ins__i${i === 0 ? ' ins__i--big' : ''}"><a href="${href('article', { slug: ctx.newsSlug(n) })}">
        <span class="ins__img">${imgTag(ctx, img, { alt: '', sizes: i === 0 ? '(max-width: 760px) 100vw, 50vw' : '(max-width: 760px) 50vw, 25vw', max: i === 0 ? 1280 : 960 })}</span>
        <span class="ins__cap"><time datetime="${n.date}">${esc(fmtDate(n.date, lang, { month: 'long', year: 'numeric' }))}</time><b${tl !== lang ? ` lang="${tl}"` : ''}>${esc(v.title)}</b></span>
      </a></li>`;
    }).join('')}</ul>
  </div>
</section>`;
}

// ---------- Standorte und Ansprechpartner ----------
function sites(ctx, K, jobs) {
  const { t, href, lang } = ctx;
  const locs = ctx.data.contacts.locations;
  const hr = ctx.data.contacts.people.find((p) => p.id === 'maria-schunk');
  const cards = JOB_SITES.map((s) => {
    const l = locs.find((x) => x.id === s.id) || {};
    const name = siteName(ctx, s);
    const c = jobs.filter((j) => j.loc === s.id).length;
    const tr = (t.pages.training.sites.find(([, m]) => m === s.mail) || [])[2] || [];
    const img = LOC_IMG[s.id];
    return `<article class="csite">
      <div class="csite__img">${img && ctx.img[img] ? imgTag(ctx, img, { alt: '', sizes: '(max-width: 760px) 100vw, 33vw', max: 1280, cover: 16 / 9 }) : ''}</div>
      <div class="csite__body">
        <span class="loc__type loc__type--${l.type || 'production'}">${esc(t.lbl.locType[l.type] || '')}</span>
        <h3>${esc(name)}</h3>
        <p class="csite__fn">${esc(K.sites[s.id] || '')}</p>
        ${l.employees ? `<p class="small muted">${esc(fmtNum(l.employees, lang))} ${esc(t.ui.employees)}</p>` : ''}
        ${tr.length ? `<p class="csite__tr"><span>${esc(K.siteTraining)}</span>${tr.map(([x]) => esc(splitJobTitle(x)[0])).join(', ')}</p>` : ''}
        <div class="csite__foot">
          ${c ? `<a class="btn btn--small btn--ghost" href="#stellen" data-jb-goto="${s.id}">${esc(tpl(K.siteShow, { city: name }))}<span class="cr-badge cr-badge--ink">${c}</span></a>` : ''}
          <span class="line-mail"><a href="mailto:${esc(s.mail)}">${icon('mail')}<span>${esc(s.mail)}</span></a><button class="copy" type="button" data-copy="${esc(s.mail)}" aria-label="${esc(t.ui.copy)}: ${esc(s.mail)}">${icon('copy', 'width="15" height="15"')}</button></span>
        </div>
      </div>
    </article>`;
  }).join('');
  const hrCard = hr ? `<div class="cr-hr"><span class="person__kind">${esc(K.contactTitle)}</span><b>${esc(hr.name)}</b><span class="muted small">${esc(K.contactRole)}</span><span class="line-mail"><a href="mailto:${esc(hr.email)}">${icon('mail')}<span>${esc(hr.email)}</span></a><button class="copy" type="button" data-copy="${esc(hr.email)}" aria-label="${esc(t.ui.copy)}: ${esc(hr.email)}">${icon('copy', 'width="15" height="15"')}</button></span></div>` : '';
  return `<section class="section section--porcelain cr-sites" id="standorte" aria-labelledby="cr-sites-t">
  <div class="wrap">
    <div class="section-head section-head--row"><div class="stack" style="--s:.75rem"><h2 id="cr-sites-t">${esc(K.sitesTitle)}</h2><p class="lead">${esc(K.sitesLead)}</p></div>${hrCard}</div>
    <div class="csites">${cards}</div>
    <p class="cr-intl">${esc(K.intl)} <a class="link" href="${href('locations')}">${esc(K.intlLink)}${icon('arrow', 'width="16" height="16"')}</a></p>
  </div>
</section>`;
}
