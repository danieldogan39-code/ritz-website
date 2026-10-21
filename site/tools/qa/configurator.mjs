// Konfigurator-Test: Auswahl treffen, Abhängigkeiten prüfen, zur Anfrageliste
import { chromium } from 'playwright-core';
import { existsSync as __exists, mkdirSync as __mkdir } from 'node:fs';
// Browser: CHROMIUM_PATH, sonst vorinstallierte Headless-Shell, sonst installiertes Google Chrome
function launchOpts() { const p = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'; return __exists(p) ? { executablePath: p } : { channel: 'chrome' }; }
if (!process.argv[3]) __mkdir(process.env.QA_OUT || 'qa-shots/', { recursive: true });
const browser = await chromium.launch(launchOpts());
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(m.text()); });
page.on('pageerror', (e) => logs.push('pageerror ' + e.message));
await page.goto('http://localhost:8080/de/produkte/mittelspannung/gsef-10-45/', { waitUntil: 'networkidle' });
await page.locator('#konfigurator').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
const S = (process.env.QA_OUT || 'qa-shots/');
const cfg = page.locator('[data-config]');
await cfg.screenshot({ path: S + 'cfg0.png' });
// Erste Option wählen: 24 kV
await page.locator('.cfg__vals label', { hasText: /^24$/ }).first().click();
await page.waitForTimeout(200);
await cfg.screenshot({ path: S + 'cfg1.png' });
const opts = await page.$$eval('.cfg__opt', (els) => els.map((e) => e.querySelector('.cfg__label')?.textContent.trim() + ' :: ' + (e.querySelectorAll('.chip').length || e.querySelector('select')?.options.length || e.querySelector('.cfg__wait')?.textContent || 'text')));
console.log(opts.join('\n'));
// Hinzufügen ohne Vollständigkeit → Fehlermeldung
await page.click('[data-cfg-add]');
await page.waitForTimeout(300);
console.log('err:', await page.textContent('[data-cfg-err]'));
// Alle Pflicht-Radiogruppen füllen
for (let i = 0; i < 12; i++) {
  const groups = await page.$$('.cfg__opt');
  let changed = false;
  for (const g of groups) {
    const req = await g.$('.req');
    const checked = await g.$('input:checked');
    const chip = await g.$('.chip');
    const sel = await g.$('select');
    if (req && !checked && chip) { await chip.click(); changed = true; break; }
    if (req && sel && !(await sel.inputValue())) { const v = await sel.$$eval('option', (o) => o.map((x) => x.value).filter(Boolean)[0]); await sel.selectOption(v); changed = true; break; }
  }
  if (!changed) break;
  await page.waitForTimeout(120);
}
await cfg.screenshot({ path: S + 'cfg2.png' });
await page.click('[data-cfg-add]');
await page.waitForTimeout(400);
console.log('toast:', await page.locator('.toast').first().textContent().catch(() => 'none'));
const basket = await page.evaluate(() => localStorage.getItem('ritz-basket'));
console.log('basket:', basket);
console.log('active tab:', await page.$eval('.pd-tabs__list a.is-active', (a) => a.textContent));
console.log(logs.join('\n'));
await browser.close();
