// Mega-Menü prüfen: Vorschau per Zeiger (mit Absichtsverzögerung) und Tastatur, Tab-Reihenfolge, Schließen beim Verlassen,
// axe (WCAG 2.1 A/AA) auf den geöffneten Panels, hell und dunkel.   node tools/qa/menu.mjs [basis-url] [pfad]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const base = process.argv[2] || 'http://localhost:8080';
const path = process.argv[3] || '/de/downloads/';
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : { channel: 'chrome' });
const axe = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const fail = [];
const ok = (cond, msg) => { if (!cond) fail.push(msg); };
for (const scheme of ['light', 'dark']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' });
  await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  const keys = await page.$$eval('header nav button[data-mega]', (bs) => bs.map((b) => b.dataset.mega));
  for (const key of keys) {
    await page.mouse.move(700, 880);
    await page.keyboard.press('Escape');
    await page.click(`header nav button[data-mega="${key}"]`);
    await page.waitForTimeout(250);
    const rows = await page.$$(`#mega-${key} .mg__row`);
    ok(rows.length > 1, `${key}: keine Einträge`);
    // Zeiger auf den dritten Eintrag: nach kurzer Verweildauer aktiv
    if (rows.length > 2) {
      await page.hover(`#mega-${key} .mg__item >> nth=2`);
      await page.waitForTimeout(200);
      const on = await page.$$eval(`#mega-${key} .mg__row`, (rs) => rs.findIndex((r) => r.classList.contains('is-on')));
      ok(on === 2, `${key}: Zeiger wählt Eintrag 3 nicht (aktiv: ${on})`);
      const pane = await page.$eval(`#mega-${key}`, (m) => { const l = m.querySelector('.mg__list'); const p = m.querySelector('.mg__row.is-on .mg__pane'); return { list: l.offsetHeight, pane: p.offsetHeight, vis: getComputedStyle(p).display }; });
      ok(pane.vis !== 'none' && pane.list >= pane.pane, `${key}: Vorschau unsichtbar oder höher als die Liste (${JSON.stringify(pane)})`);
    }
    if (scheme === 'light') {
      // Tastatur: vom Knopf in das Panel, nur Einträge und Unterpunkte (keine doppelten Links), beim Verlassen schließen
      await page.keyboard.press('Escape');
      await page.focus(`header nav button[data-mega="${key}"]`);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(150);
      await page.keyboard.press('Tab');
      const first = await page.evaluate(() => document.activeElement.closest('.mg__row')?.classList.contains('is-on') && document.activeElement.classList.contains('mg__item'));
      ok(first, `${key}: Tab führt nicht zum ersten Eintrag`);
      let guard = 0;
      while (guard++ < 60 && await page.evaluate((k) => !!document.activeElement.closest(`#mega-${k}`), key)) await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      ok(await page.$eval(`#mega-${key}`, (m) => m.hidden), `${key}: Panel bleibt nach dem Verlassen per Tab offen`);
    }
    await page.click(`header nav button[data-mega="${key}"]`).catch(() => {});
    await page.waitForTimeout(150);
    if (await page.$eval(`#mega-${key}`, (m) => m.hidden)) { await page.click(`header nav button[data-mega="${key}"]`); await page.waitForTimeout(150); }
    await page.addScriptTag({ content: axe });
    const v = await page.evaluate(async (k) => (await axe.run(document.querySelector(`#mega-${k}`), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] })).violations.map((x) => `${x.id} (${x.nodes.length})`), key);
    ok(!v.length, `${scheme} ${key}: axe ${v.join(', ')}`);
  }
  await page.close();
}
await browser.close();
console.log(fail.length ? fail.join('\n') : 'Mega-Menü: Zeiger, Tastatur und axe in Ordnung.');
process.exit(fail.length ? 1 : 0);
