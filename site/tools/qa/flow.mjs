// Ablauf: Vergleich, Anfrageliste, Formularprüfung, Suche
import { chromium } from 'playwright-core';
import { existsSync as __exists, mkdirSync as __mkdir } from 'node:fs';
// Browser: CHROMIUM_PATH, sonst vorinstallierte Headless-Shell, sonst installiertes Google Chrome
function launchOpts() { const p = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'; return __exists(p) ? { executablePath: p } : { channel: 'chrome' }; }
if (!process.argv[3]) __mkdir(process.env.QA_OUT || 'qa-shots/', { recursive: true });
const base = process.argv[2] || 'http://localhost:8080';
const out = process.argv[3] || (process.env.QA_OUT || 'qa-shots/');
const browser = await chromium.launch(launchOpts());
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.text()); });
page.on('pageerror', (e) => logs.push('pageerror ' + e.message));
const ok = (c, msg) => console.log((c ? 'OK   ' : 'FAIL ') + msg);
// 1) Finder: Filter Mittelspannung + 24 kV
await page.goto(base + '/de/produktfinder/', { waitUntil: 'networkidle' });
const total0 = await page.textContent('[data-count]').catch(() => '');
await page.check('input[value="mittelspannung"]').catch(() => {});
await page.waitForTimeout(400);
const t1 = await page.textContent('[data-count]').catch(() => '');
ok(t1 && t1 !== total0, `Finder-Filter Bereich: ${total0} → ${t1}`);
console.log('URL', page.url());
// Vergleich: zwei Karten
const cmpBtns = page.locator('[data-compare-toggle]');
await cmpBtns.nth(0).click(); await cmpBtns.nth(1).click();
await page.waitForTimeout(300);
ok(await page.locator('.tray').isVisible(), 'Vergleichsleiste sichtbar');
await page.click('.tray a');
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);
const cols = await page.locator('.cmp [data-pid], .cmp__head').count();
ok(cols >= 2, 'Vergleichsseite zeigt Produkte: ' + cols);
await page.screenshot({ path: out + 'flow_compare.png' });
// 2) Anfrageliste: Produkt ohne Konfigurator hinzufügen
await page.goto(base + '/de/produkte/niederspannung/', { waitUntil: 'networkidle' });
const add = page.locator('[data-basket-add]').first();
await add.click(); await page.waitForTimeout(500);
const urlAfter = page.url();
console.log('nach Klick:', urlAfter);
const badge = await page.textContent('[data-basket-count]').catch(() => '');
ok(Number(badge) >= 1 || urlAfter.includes('konfigurator'), 'Anfrageliste/Konfigurator erreicht, Badge=' + badge);
// 3) Anfrageseite: Liste + Pflichtfelder
await page.evaluate(() => localStorage.setItem('ritz-basket', JSON.stringify([{ id: 'gsef-10-45', code: 'GSEF 10…45', area: 'mittelspannung', sel: {}, lines: [['Spannungsreihe', '24']], qty: 2, key: 'k1' }])));
await page.goto(base + '/de/anfrage/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
ok(await page.locator('.bitem').count() === 1, 'Anfrageliste zeigt Eintrag');
await page.click('form [type="submit"]'); await page.waitForTimeout(300);
const invalid = await page.$$eval('form [aria-invalid="true"], form :invalid', (els) => els.length);
ok(invalid > 0, 'Pflichtfeldprüfung greift: ' + invalid);
await page.screenshot({ path: out + 'flow_inquiry.png', fullPage: false });
// Formular vollständig ausfüllen und senden (lokal ohne PHP: Fehlerhinweis und Text zum Kopieren erwartet)
const form = page.locator('form').filter({ has: page.locator('[type="submit"]') }).first();
for (const el of await form.locator('input[required]:not([type="checkbox"]), textarea[required]').all()) {
  const type = await el.getAttribute('type');
  await el.fill(type === 'email' ? 'test@example.com' : 'Test');
}
for (const sel of await form.locator('select[required]').all()) { const v = await sel.evaluate((s) => [...s.options].map((x) => x.value).filter(Boolean)[0]); if (v) await sel.selectOption(v); }
await form.locator('input[type="checkbox"][required]').check();
await form.locator('[type="submit"]').click();
await page.waitForTimeout(1200);
const copyVisible = await page.locator('.copybox').isVisible().catch(() => false);
const errText = await page.locator('[data-form-error]').first().textContent().catch(() => '');
ok(copyVisible, 'Nach dem Senden: Text zum Kopieren sichtbar');
console.log('Hinweis:', (errText || '').trim().slice(0, 120));
// 4) Suche-Overlay
await page.goto(base + '/de/', { waitUntil: 'networkidle' });
await page.keyboard.press('Control+k'); await page.waitForTimeout(300);
await page.keyboard.type('GSO 1910'); await page.waitForTimeout(600);
const hits = await page.locator('.search [data-hit], .search a').count();
ok(hits > 0, 'Suche liefert Treffer: ' + hits);
await page.screenshot({ path: out + 'flow_search.png' });
await page.keyboard.press('Escape');
// 5) Hero-Suche mit exaktem Typ
await page.fill('#hero-q', 'GSO 1910'); await page.press('#hero-q', 'Enter');
await page.waitForLoadState('networkidle'); await page.waitForTimeout(300);
console.log('Hero-Suche →', page.url());
// 6) Sprachwechsel
await page.goto(base + '/de/produkte/mittelspannung/gsef-10-45/', { waitUntil: 'networkidle' });
const en = await page.$eval('a[hreflang="en"]', (a) => a.getAttribute('href')).catch(() => null);
console.log('EN-Link:', en);
console.log(logs.join('\n'));
await browser.close();
