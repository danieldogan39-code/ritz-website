// axe auf der Karte in Zuständen: Ruhe, Vorschau (Andocken), angeheftete Karte, Länderwahl; Start, Standorte, Kontakt
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const axe = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
let bad = 0;
const run = (page) => page.evaluate(async () => (await axe.run(document.querySelector('[data-nm]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] })).violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ') + ' ' + (n.failureSummary || '').split('\n')[1]).join(' | ')}`));
for (const scheme of ['light', 'dark']) for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, hasTouch: vp.width < 700, isMobile: vp.width < 700 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
  for (const p of ['/de/', '/de/unternehmen/standorte/', '/de/kontakt/']) {
    await page.goto('http://localhost:8080' + p, { waitUntil: 'networkidle' });
    await page.evaluate(() => { const s = document.querySelector('[data-nm-stage]'); scrollTo(0, s.getBoundingClientRect().top + scrollY - 140); });
    await page.waitForTimeout(500);
    await page.evaluate(() => { const s = document.querySelector('[data-nm-stage]'); scrollTo(0, s.getBoundingClientRect().top + scrollY - 140); });
    await page.waitForFunction(() => document.querySelector('[data-nm]')?.classList.contains('is-done'), null, { timeout: 15000 });
    await page.addScriptTag({ content: axe });
    const res = [];
    res.push(...(await run(page)).map((r) => 'Ruhe ' + r));
    // Tastatur: zum Marker der Zentrale, Vorschau, dann anheften
    await page.focus('.nm__mk:not([tabindex="-1"])');
    await page.waitForTimeout(250);
    res.push(...(await run(page)).map((r) => 'Vorschau ' + r));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(700);
    res.push(...(await run(page)).map((r) => 'Karte ' + r));
    // Startseite: Länderwahl offen (mit Vorauswahl), danach gewählt
    if (p === '/de/') {
      await page.keyboard.press('Escape');
      await page.click('[data-nm-pickbtn]');
      await page.waitForTimeout(400);
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(300);
      res.push(...(await run(page)).map((r) => 'Länderwahl ' + r));
      await page.keyboard.press('Enter');
      await page.waitForTimeout(700);
      res.push(...(await run(page)).map((r) => 'Land gewählt ' + r));
    }
    if (res.length) { bad++; console.log(scheme, vp.width, p, '\n  ' + res.join('\n  ')); }
  }
  await ctx.close();
}
await browser.close();
console.log(bad ? `${bad} Ansichten mit Befund` : 'axe Karte: keine Verstöße');
