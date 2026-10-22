// Karte: Andocken, Zoom folgt, Rückflug, Anheften, Unterseiten, Touch, Stresstest
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] || (process.env.QA_OUT || 'qa-shots');
mkdirSync(out, { recursive: true });
const only = process.argv[3] || 'all';
const B = 'http://localhost:8080';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const errs = [];
const log = (...a) => console.log(...a);
async function open(url, { w = 1440, h = 900, mob = false } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: mob ? 2 : 1, isMobile: mob, hasTouch: mob });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${url} ${w}: ${m.text()}`); });
  page.on('pageerror', (e) => errs.push(`${url} ${w}: ${e}`));
  await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
  await page.goto(B + url, { waitUntil: 'networkidle' });
  return page;
}
const state = (page) => page.evaluate(() => {
  const el = document.querySelector('[data-nm]');
  const fr = el.querySelector('[data-nm-frame]').getBoundingClientRect();
  const mk = [...el.querySelectorAll('.nm__mk')].map((b) => { const [x, y] = (b.style.translate || '0px 0px').split(' ').map(parseFloat); return { x, y, lbl: b.querySelector('.nm__lbl')?.textContent || '', k: b.className, on: b.classList.contains('is-on') }; });
  const card = el.querySelector('[data-nm-card]');
  const ret = el.querySelector('[data-nm-ret]');
  return { cls: el.className, fr: { x: fr.left, y: fr.top, w: fr.width, h: fr.height }, mk, card: { hidden: card.hidden, cls: card.className, text: card.innerText.slice(0, 80) }, ret: { cls: ret.className, tr: ret.style.translate } };
});
const dist = (s, a, b) => { const A = s.mk.find((m) => m.lbl === a), Bm = s.mk.find((m) => m.lbl === b); return Math.hypot(A.x - Bm.x, A.y - Bm.y); };
const toStage = async (page) => { await page.evaluate(() => { const s = document.querySelector('[data-nm-stage]'); scrollTo(0, s.getBoundingClientRect().top + scrollY - 110); }); };
const waitDone = (page) => page.waitForFunction(() => document.querySelector('[data-nm]')?.classList.contains('is-done'), null, { timeout: 15000 });

if (only === 'all' || only === 'home') {
  const page = await open('/de/');
  await toStage(page);
  await waitDone(page);
  await page.waitForTimeout(400);
  let s = await state(page);
  log('home frame', s.fr, 'Marker', s.mk.length);
  const d0 = dist(s, 'Hamburg', 'Kirchaich');
  await page.screenshot({ path: `${out}/h-base.png` });
  // Andocken neben Hamburg (nicht genau darauf)
  const hq = s.mk.find((m) => m.lbl === 'Hamburg');
  await page.mouse.move(s.fr.x + hq.x + 60, s.fr.y + hq.y + 60);
  await page.mouse.move(s.fr.x + hq.x + 24, s.fr.y + hq.y + 16, { steps: 6 });
  await page.waitForTimeout(120);
  s = await state(page);
  log('snap', s.ret.cls, 'card', s.card.hidden, s.card.cls, s.card.text.replace(/\n/g, ' | '));
  await page.screenshot({ path: `${out}/h-snap.png` });
  await page.waitForTimeout(1100);
  s = await state(page);
  const d1 = dist(s, 'Hamburg', 'Kirchaich');
  log('Zoom folgt: Abstand Hamburg–Kirchaich', d0.toFixed(1), '→', d1.toFixed(1));
  await page.screenshot({ path: `${out}/h-follow.png` });
  // weiter zu einem Nachbarn
  const kir = s.mk.find((m) => m.lbl === 'Kirchaich');
  await page.mouse.move(s.fr.x + kir.x + 6, s.fr.y + kir.y + 5, { steps: 10 });
  await page.waitForTimeout(1200);
  s = await state(page);
  log('auf Kirchaich: Abstand', dist(s, 'Hamburg', 'Kirchaich').toFixed(1), 'ret', s.ret.cls, 'card', s.card.text.split('\n')[1]);
  await page.screenshot({ path: `${out}/h-follow2.png` });
  // Klick heftet an
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(500);
  s = await state(page);
  log('pin', s.card.cls, s.card.text.replace(/\n/g, ' | ').slice(0, 80));
  await page.screenshot({ path: `${out}/h-pin.png` });
  await page.keyboard.press('Escape');
  // Karte verlassen → Rückflug
  await page.mouse.move(20, 20, { steps: 4 });
  await page.waitForTimeout(1800);
  s = await state(page);
  log('Rückflug: Abstand', dist(s, 'Hamburg', 'Kirchaich').toFixed(1), '(Ausgang', d0.toFixed(1) + ')', 'card hidden', s.card.hidden, 'ret', s.ret.cls);
  // Lavonia anklicken (vereinzelt)
  const lav = s.mk.find((m) => m.lbl === 'Lavonia');
  await page.mouse.move(s.fr.x + lav.x + 10, s.fr.y + lav.y - 8, { steps: 8 });
  await page.waitForTimeout(150);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(900);
  s = await state(page);
  log('Lavonia pin', s.card.cls, s.card.text.split('\n').slice(0, 3).join(' | '));
  await page.screenshot({ path: `${out}/h-lavonia.png` });
  // Stresstest: zufällige Bewegungen, Klicks, Regionen, Zoom
  const t0 = Date.now();
  const regs = ['europe', 'americas', 'apac', 'africa', 'world'];
  for (let i = 0; i < 260; i++) {
    const r = Math.random();
    const x = s.fr.x + Math.random() * s.fr.w, y = s.fr.y + 10 + Math.random() * (s.fr.h - 20);
    if (r < 0.55) await page.mouse.move(x, y, { steps: 2 });
    else if (r < 0.7) { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.up(); }
    else if (r < 0.78) { await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 80, y + 30, { steps: 4 }); await page.mouse.up(); }
    else if (r < 0.84) { await page.keyboard.down('Control'); await page.mouse.move(x, y); await page.mouse.wheel(0, Math.random() < 0.5 ? -120 : 120); await page.keyboard.up('Control'); }
    else if (r < 0.9) await page.locator(`[data-nm-region="${regs[i % 5]}"]`).click();
    else if (r < 0.94) await page.locator('[data-nm-z="in"]').click();
    else if (r < 0.97) await page.locator('[data-nm-layer]').nth(i % 3).click();
    else await page.mouse.dblclick(x, y);
    if (i % 40 === 0) await page.waitForTimeout(200);
  }
  await page.waitForTimeout(1200);
  s = await state(page);
  const vis = s.mk.filter((m) => m.on).length;
  log('Stress', ((Date.now() - t0) / 1000).toFixed(1) + 's', 'aktive Marker', vis, 'card', s.card.hidden ? 'zu' : s.card.cls, 'ret', s.ret.cls);
  // Frame-Zeiten während eines Fluges
  const ft = await page.evaluate(async () => {
    const ts = [];
    let last = performance.now();
    const stop = performance.now() + 1500;
    document.querySelector('[data-nm-region="europe"]').click();
    setTimeout(() => document.querySelector('[data-nm-region="world"]').click(), 800);
    await new Promise((res) => { const f = (t) => { ts.push(t - last); last = t; if (t < stop) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    ts.sort((a, b) => a - b);
    return { n: ts.length, p50: ts[ts.length >> 1].toFixed(1), p95: ts[Math.floor(ts.length * 0.95)].toFixed(1), max: ts[ts.length - 1].toFixed(1) };
  });
  log('Frames im Flug', ft);
  // Größen
  for (const [w, h] of [[2560, 1440], [1920, 1080], [1280, 800], [1024, 768], [820, 1180]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    await toStage(page);
    await page.waitForTimeout(500);
    const st = await state(page);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    log('Größe', w, 'Rahmen', Math.round(st.fr.w) + 'x' + Math.round(st.fr.h), 'Überlauf', ov);
    await page.screenshot({ path: `${out}/h-${w}.png` });
  }
  await page.close();
}

if (only === 'all' || only === 'mob') {
  const page = await open('/de/', { w: 390, h: 844, mob: true });
  await toStage(page);
  await waitDone(page);
  await page.waitForTimeout(300);
  let s = await state(page);
  log('mobil Rahmen', s.fr);
  await page.screenshot({ path: `${out}/m-base.png` });
  const d0 = dist(s, 'Hamburg', 'Kirchaich');
  const hq = s.mk.find((m) => m.lbl === 'Hamburg');
  await page.touchscreen.tap(s.fr.x + hq.x + 3, s.fr.y + hq.y + 2);
  await page.waitForTimeout(900);
  s = await state(page);
  log('Tippen dicht: Abstand', d0.toFixed(1), '→', dist(s, 'Hamburg', 'Kirchaich').toFixed(1), 'card', s.card.hidden ? 'zu' : s.card.cls);
  await page.screenshot({ path: `${out}/m-tap1.png` });
  const hq2 = s.mk.find((m) => m.lbl === 'Hamburg');
  await page.touchscreen.tap(s.fr.x + hq2.x, s.fr.y + hq2.y);
  await page.waitForTimeout(900);
  s = await state(page);
  log('Tippen 2', s.card.hidden ? 'zu' : s.card.cls, s.card.text.split('\n').slice(0, 2).join(' | '));
  await page.screenshot({ path: `${out}/m-tap2.png` });
  for (const w of [360, 414, 600]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.waitForTimeout(500);
    const st = await state(page);
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    log('mobil', w, 'Rahmen', Math.round(st.fr.w) + 'x' + Math.round(st.fr.h), 'Überlauf', ov);
  }
  await page.close();
}

if (only === 'all' || only === 'sub') {
  for (const [url, name] of [['/de/unternehmen/standorte/', 'loc'], ['/de/kontakt/', 'con']]) {
    for (const [w, h, mob] of [[1440, 900, false], [390, 844, true]]) {
      const page = await open(url, { w, h, mob });
      await toStage(page);
      await page.waitForTimeout(400);
      await toStage(page);
      await waitDone(page);
      await page.waitForTimeout(500);
      let s = await state(page);
      const reps = s.mk.filter((m) => m.k.includes('--rep')).length;
      log(name, w, 'Marker', s.mk.length, 'Vertretungen', reps, 'Rahmen', Math.round(s.fr.w) + 'x' + Math.round(s.fr.h), 'Labels', await page.locator('.nm__mk.is-lbl').count());
      await page.evaluate(() => scrollTo(0, document.querySelector('[data-nm]').getBoundingClientRect().top + scrollY - 90));
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/${name}-${w}-base.png` });
      if (name === 'con') {
        await page.fill('[data-nm-q]', 'bras');
        await page.waitForTimeout(1300);
        s = await state(page);
        log('Suche bras:', await page.locator('[data-nm-count]').innerText(), 'card', s.card.hidden ? 'zu' : s.card.text.split('\n').slice(0, 2).join(' | '));
        await page.screenshot({ path: `${out}/${name}-${w}-search.png` });
        await page.fill('[data-nm-q]', '');
        await page.waitForTimeout(1200);
        log('Suche leer:', await page.locator('[data-nm-count]').innerText());
      }
      const entry = page.locator('.nm__entry', { hasText: name === 'loc' ? 'Shanghai' : 'Lavonia' }).first();
      await entry.scrollIntoViewIfNeeded();
      if (!mob) { await entry.hover(); await page.waitForTimeout(250); s = await state(page); log('Listen-Hover ret', s.ret.cls, 'card', s.card.hidden ? 'zu' : 'offen'); }
      await entry.click();
      await page.waitForTimeout(1200);
      s = await state(page);
      log('Listen-Klick', s.card.cls, s.card.text.split('\n').slice(0, 3).join(' | '));
      await page.screenshot({ path: `${out}/${name}-${w}-pick.png` });
      await page.close();
    }
  }
}
log(errs.length ? 'FEHLER:\n' + errs.join('\n') : 'keine Konsolenfehler');
await browser.close();
