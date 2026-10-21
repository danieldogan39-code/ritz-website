// Seiteninitialisierung (statisch und Vorschau)
import { initGallery, initTabs, initFilters, initContactFinder, initForms, initHero, initGotoSearch } from './ui.js';
import { initCompareToggles } from './basket.js';
import { $ } from './core.js';
import { initMotion } from './motion.js';

export async function initPage(root = document) {
  initCompareToggles(root);
  initGallery(root);
  initTabs(root);
  initFilters(root);
  initHero(root);
  initGotoSearch(root);
  initMotion(root);
  const has = (s) => !!$(s, root);
  const jobs = [];
  if (has('[data-vaxis]')) jobs.push(import('./vaxis.js').then((m) => m.initVaxis(root)));
  if (has('[data-finder]')) jobs.push(import('./finder.js').then((m) => m.initFinder(root)));
  if (has('[data-config]')) jobs.push(import('./config.js').then((m) => m.initConfigurators(root)));
  if (has('[data-map]')) jobs.push(import('./map.js').then((m) => m.initMaps(root).then(() => {
    const id = location.hash.slice(1);
    const box = $('[data-map="locations"]', root);
    if (id && box?.__selectById) box.__selectById(id);
  })));
  if (has('[data-downloads]')) jobs.push(import('./downloads.js').then((m) => m.initDownloads(root)));
  if (has('[data-basket-list]')) jobs.push(import('./basket.js').then((m) => m.initInquiry(root)));
  if (has('[data-compare]')) jobs.push(import('./basket.js').then((m) => m.initComparePage(root)));
  if (has('[data-search-page]')) jobs.push(import('./search.js').then((m) => m.initSearchPage(root)));
  if (has('[data-contact-finder]')) jobs.push(initContactFinder(root));
  if (has('[data-contact-form]')) jobs.push(initForms(root));
  await Promise.allSettled(jobs);
}

