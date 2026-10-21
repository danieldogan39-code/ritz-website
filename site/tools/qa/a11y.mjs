// Barrierefreiheit: axe-core (WCAG 2.1 A/AA) über repräsentative Seiten, hell und dunkel, Desktop und Telefon
// node tools/qa/a11y.mjs [basis-url]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { existsSync } from 'node:fs';
const base = process.argv[2] || 'http://localhost:8080';
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : { channel: 'chrome' });
const axe = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const PAGES = [
  '/de/', '/de/produkte/', '/de/produkte/mittelspannung/', '/de/produkte/mittelspannung/gsef-10-45/', '/de/produktfinder/',
  '/de/anwendungen/', '/de/anwendungen/bahntechnik/', '/de/unternehmen/', '/de/unternehmen/standorte/', '/de/unternehmen/qualitaet/',
  '/de/downloads/', '/de/news/', '/de/kontakt/', '/de/anfrage/', '/de/karriere/', '/de/suche/', '/de/vergleich/',
  '/en/', '/en/products/low-voltage/kso-103/', '/fr/', '/hu/', '/es/', '/es/productos/media-tension/gbw/',
  '/de/produkte/niederspannung/kso-50/', '/de/produkte/niederspannung/rku-2012/', '/de/werkzeuge/', '/de/werkzeuge/spezifikations-check/', '/de/werkzeuge/wandler-rechner/',
];
const all = {};
for (const scheme of ['light', 'dark']) {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    for (const path of PAGES) {
      const r = await page.goto(base + path, { waitUntil: 'networkidle' }).catch(() => null);
      if (!r || r.status() >= 400) { console.log('skip', path, r?.status()); continue; }
      await page.addScriptTag({ content: axe });
      const res = await page.evaluate(async () => {
        // eslint-disable-next-line no-undef
        const out = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
        return out.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target.join(' '), summary: (n.failureSummary || '').split('\n').slice(1, 3).join(' ') })), count: v.nodes.length }));
      });
      for (const v of res) {
        const key = `${v.id}`;
        (all[key] ||= { help: v.help, impact: v.impact, hits: [] }).hits.push({ path, scheme, w: vp.width, count: v.count, nodes: v.nodes });
      }
    }
    await ctx.close();
  }
}
await browser.close();
const ids = Object.keys(all);
if (!ids.length) console.log('Keine axe-Verstöße (WCAG 2.1 A/AA) gefunden.');
for (const id of ids) {
  const a = all[id];
  console.log(`\n${id} [${a.impact}] ${a.help} – ${a.hits.length} Seitenansichten`);
  for (const h of a.hits.slice(0, 6)) console.log(`  ${h.path} ${h.scheme} ${h.w}px (${h.count}): ${h.nodes.map((n) => n.target + (n.summary ? ' → ' + n.summary : '')).join(' | ').slice(0, 400)}`);
}
