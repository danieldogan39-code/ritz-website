// Einstieg für die statische Website (eine HTML-Datei je Seite)
import { initHeader, initDrawer, initTheme, initCopy } from './ui.js';
import { initBadges, initBasketButtons, initTray } from './basket.js';
import { initSearchOverlay } from './search.js';
import { initPage } from './app-page.js';

function boot() {
  initTheme();
  initHeader();
  initDrawer();
  initCopy();
  initSearchOverlay();
  initBadges();
  initBasketButtons(document);
  initTray();
  initPage(document);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
