// Vorschau (Hash-Routing) testen: Routen laden, Konsolenfehler, Navigation per Klick
import { chromium } from 'playwright-core';
import { existsSync as __exists, mkdirSync as __mkdir } from 'node:fs';
// Browser: CHROMIUM_PATH, sonst vorinstallierte Headless-Shell, sonst installiertes Google Chrome
function launchOpts() { const p = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'; return __exists(p) ? { executablePath: p } : { channel: 'chrome' }; }
if (!process.argv[3]) __mkdir(process.env.QA_OUT || 'qa-shots/', { recursive: true });
const base = process.argv[2] || 'http://localhost:8081/index.html';
const out = process.argv[3] || (process.env.QA_OUT || 'qa-shots/') + 'spa_';
const browser = await chromium.launch(launchOpts());
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.text()); });
page.on('pageerror', (e) => logs.push('pageerror ' + e.message));
page.on('requestfailed', (r) => logs.push('failed ' + r.url()));
page.on('response', (r) => { if (r.status() >= 400) logs.push(r.status() + ' ' + r.url()); });
await page.goto(base, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
console.log('Start:', page.url(), await page.title());
await page.screenshot({ path: out + 'home.png' });
// Klickpfad: Produkte → Mittelspannung → erstes Produkt
const clickText = async (sel, label) => { await page.click(sel); await page.waitForTimeout(700); console.log(label, '→', page.url().split('#')[1], '|', await page.title()); };
await page.goto(base + '#de.produkte', { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
console.log('Produkte:', await page.title());
await clickText('main a[href*="produkte.mittelspannung"]', 'Bereich');
await clickText('.pcard__code a', 'Produkt');
await page.screenshot({ path: out + 'product.png' });
// In-Page-Anker (Tabs)
await page.click('.pd-tabs__list a[href="#daten"]'); await page.waitForTimeout(400);
console.log('Anker ok, URL:', page.url().split('#')[1]);
// Finder mit Filter
await page.goto(base + '#de.produktfinder', { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
await page.check('input[value="hochspannung"]').catch((e) => logs.push('check ' + e.message));
await page.waitForTimeout(500);
console.log('Finder:', page.url().split('#')[1], await page.textContent('[data-count]').catch(() => '?'));
// Karte
await page.goto(base + '#de.kontakt', { waitUntil: 'networkidle' }); await page.waitForTimeout(1200);
console.log('Karte Marker:', await page.locator('.nm__mk').count(), 'Liste:', await page.locator('.nm__entry').count());
// Sprachwechsel
await page.goto(base + '#en', { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
console.log('EN:', await page.title(), await page.textContent('h1'));
await page.goto(base + '#hu.termekek', { waitUntil: 'networkidle' }).catch(() => {}); await page.waitForTimeout(800);
console.log('HU products:', await page.title());
await page.screenshot({ path: out + 'hu.png' });
console.log(logs.slice(0, 20).join('\n'));
await browser.close();
