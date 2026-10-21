// Intro und Startseiten-Bewegung prüfen: Einzelbilder des Intros (angehalten), echter Ablauf mit Flug ins Logo,
// zweiter Aufruf ohne Intro, reduzierte Bewegung, Überspringen, Konsolenfehler.
// node tools/qa/intro.mjs [basis-url] [ausgabeordner]
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
const base = process.argv[2] || 'http://localhost:8080';
const out = process.argv[3] || 'qa-intro';
mkdirSync(out, { recursive: true });
const exe = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browser = await chromium.launch(existsSync(exe) ? { executablePath: exe } : { channel: 'chrome' });
const errors = [];
const watch = (page, tag) => {
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${tag}: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
};
const VIEWS = { desk: { viewport: { width: 1440, height: 900 } }, mob: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };
const path = process.env.P || '/de/';

// 1) Einzelbilder: Intro-Animationen anhalten und auf feste Zeitpunkte setzen
for (const [name, opt] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext(opt);
  const page = await ctx.newPage();
  watch(page, `frames-${name}`);
  await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.intro');
  await page.evaluate(() => { for (const a of document.getAnimations()) a.pause(); });
  for (const t of [0.25, 0.7, 1.15, 1.5, 1.9, 2.3, 2.56]) {
    await page.evaluate((ms) => {
      for (const a of document.getAnimations()) {
        const el = a.effect?.target;
        if (el && el.closest && el.closest('.intro, .intro__skip')) a.currentTime = ms;
      }
    }, t * 1000);
    await page.screenshot({ path: `${out}/${name}-f${String(Math.round(t * 100)).padStart(3, '0')}.png` });
  }
  await ctx.close();
}

// 2) Echter Ablauf mit Flug, danach Hero-Choreografie; dann zweiter Aufruf (kein Intro)
for (const [name, opt] of Object.entries(VIEWS)) {
  const ctx = await browser.newContext(opt);
  const page = await ctx.newPage();
  watch(page, `real-${name}`);
  const t0 = Date.now();
  await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  const shots = [2650, 2850, 3100, 3500, 4200];
  for (const ms of shots) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: `${out}/${name}-real-${ms}.png` });
  }
  const st = await page.evaluate(() => ({ intro: document.documentElement.getAttribute('data-intro'), overlay: !!document.querySelector('.intro'), logo: getComputedStyle(document.querySelector('.hdr .logo')).opacity, rv: document.documentElement.className }));
  console.log(name, 'nach Ablauf', JSON.stringify(st));
  // zweiter Aufruf in derselben Sitzung
  await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  const st2 = await page.evaluate(() => ({ intro: document.documentElement.getAttribute('data-intro') }));
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${out}/${name}-again-450.png` });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${name}-again-1950.png` });
  console.log(name, 'zweiter Aufruf', JSON.stringify(st2));
  // Scrollen: Einblenden, Zählwerk, Netz
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0, i = 0; y < H; y += opt.viewport.height * 0.8, i++) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(1600);
    if (i % 1 === 0) await page.screenshot({ path: `${out}/${name}-scroll-${String(i).padStart(2, '0')}.png` });
  }
  const hidden = await page.evaluate(() => [...document.querySelectorAll('[data-reveal]')].filter((e) => !e.classList.contains('is-in')).map((e) => e.className || e.tagName));
  console.log(name, 'nicht eingeblendet nach Scrollen:', hidden.length, hidden.slice(0, 5));
  const counts = await page.evaluate(() => [...document.querySelectorAll('[data-count]')].map((e) => e.textContent));
  console.log(name, 'Zahlen:', JSON.stringify(counts));
  await ctx.close();
}

// 3) Überspringen per Taste
{
  const ctx = await browser.newContext(VIEWS.desk);
  const page = await ctx.newPage();
  watch(page, 'skip');
  await page.goto(base + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(420);
  const st = await page.evaluate(() => ({ intro: document.documentElement.getAttribute('data-intro'), overlay: !!document.querySelector('.intro'), focus: document.activeElement?.className || document.activeElement?.tagName }));
  console.log('Überspringen (Tab)', JSON.stringify(st));
  await page.screenshot({ path: `${out}/skip-tab.png` });
  await ctx.close();
}

// 4) Reduzierte Bewegung: kein Intro, alles sofort sichtbar
{
  const ctx = await browser.newContext({ ...VIEWS.desk, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  watch(page, 'reduced');
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => ({ intro: document.documentElement.getAttribute('data-intro'), cls: document.documentElement.className,
    hidden: [...document.querySelectorAll('[data-reveal], [data-reveal] *')].filter((e) => getComputedStyle(e).opacity === '0').length }));
  console.log('Reduzierte Bewegung', JSON.stringify(st));
  await page.screenshot({ path: `${out}/reduced.png` });
  await ctx.close();
}
console.log('Konsolenfehler:', errors.length ? errors : 'keine');
await browser.close();
