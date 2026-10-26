// Auswahlreihen (Reiter, Abschnittsleisten, Regionen) auf dem Telefon als Aufklappliste: Passt die Reihe nicht in die
// Breite, erscheint statt der abgeschnittenen Reihe ein Auswahlfeld (natives <select>, auf dem Telefon das System-
// Auswahlblatt). Es zeigt den aktiven Eintrag; eine Wahl löst den Klick auf den ursprünglichen Eintrag aus – Reiter,
// Sprungmarken und Filter funktionieren also unverändert. Breitere Fenster behalten die Reihe.
const ROWS = '.sc-tabs, .pd-tabs__list, .calc__tabs, .nm__regions';
const ACTIVE = '[aria-selected="true"], [aria-pressed="true"], [aria-current]:not([aria-current="false"]), .is-active, .is-on';
const MQ = matchMedia('(max-width: 760px)');

const labelOf = (it) => {
  const n = it.querySelector('.sc-n')?.textContent.trim();
  const main = (it.querySelector('.sc-tab__l, b') || it).textContent.replace(/\s+/g, ' ').trim();
  const cnt = it.querySelector('small')?.textContent.trim();
  return `${n ? n + ' · ' : ''}${main}${cnt ? ` (${cnt})` : ''}`;
};

export function initPickers(root = document) {
  for (const row of root.querySelectorAll(ROWS)) {
    if (row.__pick || row.closest('.nm__view')) continue;
    const items = [...row.querySelectorAll(':scope > a, :scope > button, :scope > [role="tab"]')];
    if (items.length < 2) continue;
    row.__pick = true;
    const box = document.createElement('div');
    box.className = 'pick';
    box.hidden = true;
    const sel = document.createElement('select');
    sel.className = 'pick__sel';
    sel.setAttribute('aria-label', row.getAttribute('aria-label') || row.closest('[aria-label]')?.getAttribute('aria-label') || '');
    items.forEach((it, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = labelOf(it); sel.append(o); });
    box.append(sel);
    row.before(box);
    const sync = () => {
      const k = items.findIndex((it) => it.matches(ACTIVE));
      if (k >= 0 && sel.value !== String(k)) sel.value = String(k);
    };
    sel.addEventListener('change', () => { const it = items[+sel.value]; if (it) it.click(); sync(); });
    // Passt die Reihe? Nur auf dem Telefon wird umgeschaltet; gemessen wird an der sichtbaren Reihe
    const fit = () => {
      if (!row.isConnected) return;
      row.classList.remove('is-picked');
      const over = MQ.matches && !row.hidden && row.scrollWidth > row.clientWidth + 2;
      row.classList.toggle('is-picked', over);
      box.hidden = !over;
      sync();
    };
    new MutationObserver((ms) => { sync(); if (ms.some((m) => m.target === row && m.attributeName === 'hidden')) fit(); }).observe(row, { subtree: true, attributes: true, attributeFilter: ['aria-selected', 'aria-pressed', 'aria-current', 'class', 'hidden'] });
    let t = 0;
    const later = () => { clearTimeout(t); t = setTimeout(fit, 120); };
    addEventListener('resize', later, { passive: true });
    MQ.addEventListener?.('change', fit);
    document.fonts?.ready.then(fit);
    fit();
  }
}
