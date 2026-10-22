// Rechenlast der Startbühne: Trace mit gedrosselter CPU (Faktor 4), zwei Fenster: Einstieg (0–4 s) und
// Dauerbetrieb (8–12 s). Summiert Hauptthread-Arbeit (Aufgaben, Paint, Stil/Layout); im Dauerbetrieb soll der
// Hauptthread fast frei sein (alle Schleifen im Compositor). node tools/qa/perf-hero.mjs [basis] [ausgabe.json]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const base = process.argv[2] || 'http://localhost:8080';
const out = process.argv[3];
const exe = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch({ executablePath: exe });
const VIEWS = {
  desk: { viewport: { width: 1440, height: 900 } },
  mob: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
};
const CATS = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'toplevel', 'blink', 'cc', 'disabled-by-default-devtools.timeline.frame'];
function analyse(json) {
  const ev = json.traceEvents || json;
  const names = {};
  for (const e of ev) if (e.ph === 'M' && e.name === 'thread_name') names[`${e.pid}:${e.tid}`] = e.args.name;
  const main = Object.entries(names).filter(([, n]) => n === 'CrRendererMain').map(([k]) => k);
  const raster = new Set(Object.entries(names).filter(([, n]) => /CompositorTileWorker/.test(n)).map(([k]) => k));
  const sum = {}; let busy = 0, rasterT = 0, frames = 0;
  for (const e of ev) {
    const k = `${e.pid}:${e.tid}`;
    if (e.ph !== 'X' || !e.dur) continue;
    if (main.includes(k)) {
      if (e.name === 'ThreadControllerImpl::RunTask' || e.name === 'RunTask') busy += e.dur;
      if (['Paint', 'PrePaint', 'Layerize', 'UpdateLayoutTree', 'Layout', 'UpdateLayer', 'CompositeLayers', 'FunctionCall', 'Commit', 'PaintImage'].includes(e.name)) sum[e.name] = (sum[e.name] || 0) + e.dur;
    }
    if (raster.has(k) && (e.name === 'RasterTask' || e.name === 'TaskGraphRunner::RunTask')) rasterT += e.dur;
  }
  for (const e of ev) if (e.name === 'DrawFrame' || e.name === 'Graphics.Pipeline.DrawAndSwap') frames++;
  const ms = (v) => Math.round(v / 1000);
  return { busy: ms(busy), raster: ms(rasterT), paint: ms(sum.Paint || 0), prepaint: ms(sum.PrePaint || 0), style: ms(sum.UpdateLayoutTree || 0), layout: ms(sum.Layout || 0), layerize: ms(sum.Layerize || 0), js: ms(sum.FunctionCall || 0), commit: ms(sum.Commit || 0) };
}
const res = {};
for (const [name, opt] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext(opt);
  await ctx.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // Fenster 1: Einstieg
  await browser.startTracing(page, { categories: CATS });
  await page.goto(base + '/de/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const a = JSON.parse((await browser.stopTracing()).toString());
  await page.waitForTimeout(4000);
  // Fenster 2: Dauerbetrieb (Schleifen), 4 s
  await browser.startTracing(page, { categories: CATS });
  await page.waitForTimeout(4000);
  const b = JSON.parse((await browser.stopTracing()).toString());
  res[name] = { start: analyse(a), steady: analyse(b) };
  console.log(name, 'Einstieg', JSON.stringify(res[name].start));
  console.log(name, 'Dauer   ', JSON.stringify(res[name].steady));
  await ctx.close();
}
await browser.close();
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
