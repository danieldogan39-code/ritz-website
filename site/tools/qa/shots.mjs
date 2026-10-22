// Bildschirmfotos einzelner Seiten: node tools/qa/shots.mjs <outdir> <breite> <pfad>[#name] [<pfad> …]
// Beispiel: node tools/qa/shots.mjs /tmp/s 1440 /de/ /de/produkte/niederspannung/
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const [out = '/tmp/shots', width = '1440', ...paths] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const exe = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
const w = +width;
const page = await browser.newPage({ viewport: { width: w, height: w < 700 ? 860 : 1000 }, deviceScaleFactor: w < 700 ? 2 : 1 });
await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) { /* */ } });
const logs = [];
page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') logs.push('[console] ' + m.text()); });
page.on('response', (r) => { if (r.status() >= 400) logs.push(`[${r.status()}] ${r.url()}`); });
for (const pth of paths) {
  const [url, name, mode] = pth.split('#');
  await page.goto('http://localhost:8080' + url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.classList.add('no-intro'));
  await page.waitForTimeout(700);
  // alle Einblendungen sofort sichtbar machen (Bildschirmfoto ganzer Seiten)
  await page.addStyleTag({ content: '[data-reveal],[data-reveal] *{opacity:1!important;transform:none!important;clip-path:none!important;filter:none!important;transition:none!important;animation:none!important}' });
  if (mode !== 'top') {
    // einmal durchscrollen: verzögert geladene Bilder und Einblendungen auslösen
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(900);
  }
  const file = path.join(out, (name || url.replace(/\W+/g, '_') || 'root') + `-${w}.png`);
  await page.screenshot({ path: file, fullPage: mode !== 'top' });
  console.log(file);
}
console.log(logs.join('\n') || 'keine Fehler');
await browser.close();
