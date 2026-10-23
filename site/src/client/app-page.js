// Seiteninitialisierung (statisch und Vorschau)
import { initGallery, initTabs, initFilters, initContactFinder, initForms, initHero, initGotoSearch } from './ui.js';
import { initCompareToggles } from './basket.js';
import { $ } from './core.js';
import { initMotion, initHero2, initStage } from './motion.js';

export async function initPage(root = document) {
  initCompareToggles(root);
  initGallery(root);
  initTabs(root);
  initFilters(root);
  initHero(root);
  initGotoSearch(root);
  initMotion(root);
  initHero2(root);
  initStage(root);
  const has = (s) => !!$(s, root);
  const jobs = [];
  if (has('[data-vaxis]')) jobs.push(import('./vaxis.js').then((m) => m.initVaxis(root)));
  if (has('[data-finder]')) jobs.push(import('./finder.js').then((m) => m.initFinder(root)));
  if (has('[data-config]')) jobs.push(import('./config.js').then((m) => m.initConfigurators(root)));
  if (has('[data-downloads]')) jobs.push(import('./downloads.js').then((m) => m.initDownloads(root)));
  if (has('[data-mappe]')) jobs.push(import('./mappe.js').then((m) => m.initMappe(root)));
  if (has('[data-compare]')) jobs.push(import('./basket.js').then((m) => m.initComparePage(root)));
  if (has('[data-search-page]')) jobs.push(import('./search.js').then((m) => m.initSearchPage(root)));
  if (has('[data-assist]')) jobs.push(import('./assistant.js').then((m) => m.initAssist(root)));
  if (has('[data-calc]')) jobs.push(import('./calc.js').then((m) => m.initCalc(root)));
  if (has('[data-home-spec]')) jobs.push(import('./homespec.js').then((m) => m.initHomeSpec(root)));
  if (has('[data-hx]')) jobs.push(import('./history.js').then((m) => m.initHistory(root)));
  if (has('[data-nm]')) jobs.push(import('./netmap.js').then((m) => m.initNetMap(root)));
  if (has('[data-org]')) jobs.push(import('./org.js').then((m) => m.initOrg(root)));
  if (has('[data-rig]')) jobs.push(import('./rig.js').then((m) => m.initRig(root)));
  if (has('[data-career]')) jobs.push(import('./career.js').then((m) => m.initCareer(root)));
  if (has('[data-sector]')) jobs.push(import('./sector.js').then((m) => m.initSector(root)));
  if (has('[data-contact-finder]')) jobs.push(initContactFinder(root));
  if (has('[data-contact-form]')) jobs.push(initForms(root));
  await Promise.allSettled(jobs);
}

