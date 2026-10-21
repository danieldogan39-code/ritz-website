// Seiten-ID → Inhalt (für Build und Vorschau identisch)
import { home } from './home.js';
import { productsPage, areaPage, productPage, finderPage, comparePage, inquiryPage } from './products.js';
import * as P from './pages.js';
import { toolsPage, assistantPage, calculatorsPage } from './tools.js';
import { descriptor } from '../lib/product.js';
import { shorten } from './layout.js';
import { htmlText } from '../lib/util.js';

export function renderRoute(ctx, route) {
  const { t } = ctx;
  const pg = t.pages;
  const id = route.id;
  const r = (title, html, desc = '', extra = {}) => ({ title, html, desc: desc || t.meta.defaultDesc, ...extra });
  switch (id) {
    case 'home': return r(pg.home.title, home(ctx), t.meta.defaultDesc, { bodyClass: 'is-home' });
    case 'products': return r(pg.products.title, productsPage(ctx), pg.products.lead);
    case 'area': return r(pg.areas[route.p.area].title, areaPage(ctx, route.p.area), pg.areas[route.p.area].lead);
    case 'product': {
      const p = route.product;
      const d = descriptor(p, t, ctx.lang);
      const text = (p.desc?.[ctx.dl] || p.desc?.en || [])[0] || '';
      return r(`${p.code} – ${d}`, productPage(ctx, p), shorten(`${p.code}: ${d}. ${text}`, 158), { type: 'product' });
    }
    case 'finder': return r(t.finder.title, finderPage(ctx), t.finder.lead);
    case 'compare': return r(t.compare.title, comparePage(ctx), t.compare.lead, { noindex: true });
    case 'inquiry': return r(t.inquiry.title, inquiryPage(ctx), t.inquiry.lead, { noindex: true });
    case 'sectors': return r(pg.sectors.title, P.sectorsPage(ctx), pg.sectors.lead);
    case 'sector': { const s = pg.sectors.items[route.p.sector]; return r(s.title, P.sectorPage(ctx, route.p.sector), s.lead); }
    case 'company': return r(pg.company.title, P.companyPage(ctx), pg.company.lead);
    case 'locations': return r(pg.locations.title, P.locationsPage(ctx), pg.locations.lead);
    case 'quality': return r(pg.quality.title, P.qualityPage(ctx), pg.quality.lead);
    case 'responsibility': return r(pg.responsibility.title, P.responsibilityPage(ctx), pg.responsibility.lead);
    case 'references': return r(pg.references.title, P.referencesPage(ctx), pg.references.lead);
    case 'downloads': return r(t.downloads.title, P.downloadsPage(ctx), t.downloads.lead);
    case 'contact': return r(pg.contact.title, P.contactPage(ctx), pg.contact.lead);
    case 'career': return r(pg.career.title, P.careerPage(ctx), pg.career.lead);
    case 'training': return r(pg.training.title, P.trainingPage(ctx), pg.training.lead);
    case 'internships': return r(pg.internships.title, P.internshipsPage(ctx), pg.internships.lead);
    case 'news': return r(pg.news.title, P.newsPage(ctx), pg.news.lead);
    case 'article': {
      const n = route.news;
      const v = n.v[ctx.lang] || n.v[ctx.dl] || n.v.de || Object.values(n.v)[0];
      const text = htmlText(v.html);
      // Fallback = keine eigene Sprachfassung oder nur eine Kopie aus einer anderen Sprache → noindex, nicht in Sitemap/Suche
      const own = n.v[ctx.lang];
      const fallback = !own || own.untranslated || (own.contentLang && own.contentLang !== ctx.lang);
      return r(v.title, P.articlePage(ctx, n), shorten(text || v.title, 158), { type: 'article', fallback: !!fallback });
    }
    case 'imprint': return r(pg.imprint.title, P.imprintPage(ctx), `${pg.imprint.title}: RITZ Instrument Transformers GmbH, Wandsbeker Zollstraße 92–98, 22041 Hamburg`, { noindex: false });
    case 'privacy': return r(pg.privacy.title, P.privacyPage(ctx), pg.privacy.lead);
    case 'search': return r(t.search.title, P.searchPage(ctx), t.search.lead, { noindex: true });
    case 'tools': return r(t.x.hub.title, toolsPage(ctx), t.x.hub.lead);
    case 'assistant': return r(t.x.assist.title, assistantPage(ctx), t.x.assist.lead);
    case 'calculators': return r(t.x.calc.title, calculatorsPage(ctx), t.x.calc.lead);
    default: return r(pg.notFound.title, P.notFoundPage(ctx), pg.notFound.lead, { noindex: true });
  }
}
