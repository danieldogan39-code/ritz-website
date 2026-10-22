// Karte: Zentrieren beim Verweilen, Folge-Zoom (Lupe, 4 s heraus), Länderwahl (Desktop, Telefon als Blatt, dunkel), Listen der Unterseiten
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] || (process.env.QA_OUT || 'qa-shots');
mkdirSync(out, { recursive: true });
const only = process.argv[3] || 'all';
const B = process.env.QA_BASE || 'http://localhost:8080';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const errs = [];
let fails = 0;
const log = (...a) => console.log(...a);
const check = (ok, msg) => { if (!ok) fails++; log(ok ? '  ok  ' : '  FAIL', msg); };
async function open(url, { w = 1440, h = 900, mob = false, dark = false } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: mob ? 2 : 1, isMobile: mob, hasTouch: mob, colorScheme: dark ? 'dark' : 'light' });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${url} ${w}: ${m.text()}`); });
  page.on('pageerror', (e) => errs.push(`${url} ${w}: ${e}`));
  await page.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
  await page.goto(B + url, { waitUntil: 'networkidle' });
  return page;
}
const state = (page, sel = '[data-nm]') => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  const fr = el.querySelector('[data-nm-frame]').getBoundingClientRect();
  const mk = [...el.querySelectorAll('.nm__mk')].map((b) => { const [x, y] = (b.style.translate || '0px 0px').split(' ').map(parseFloat); return { x, y, lbl: b.querySelector('.nm__lbl')?.textContent || b.getAttribute('aria-label') || '', k: b.className, on: b.classList.contains('is-on') }; });
  const card = el.querySelector('[data-nm-card]');
  const ret = el.querySelector('[data-nm-ret]');
  const [rx, ry] = (ret.style.translate || '0px 0px').split(' ').map(parseFloat);
  return { cls: el.className, fr: { x: fr.left, y: fr.top, w: fr.width, h: fr.height }, mk, card: { hidden: card.hidden, cls: card.className, text: card.innerText.slice(0, 120) }, ret: { cls: ret.className, x: rx, y: ry } };
}, sel);
const find = (s, lbl) => s.mk.find((m) => m.lbl === lbl || m.lbl.startsWith(lbl));
const off = (s, m) => ({ dx: (m.x - s.fr.w / 2) / s.fr.w, dy: (m.y - s.fr.h / 2) / s.fr.h });
const pct = (v) => (v * 100).toFixed(1) + '%';
const toStage = async (page) => { await page.evaluate(() => { const s = document.querySelector('[data-nm-stage]'); scrollTo(0, s.getBoundingClientRect().top + scrollY - 140); }); };
const waitDone = (page) => page.waitForFunction(() => document.querySelector('[data-nm]')?.classList.contains('is-done'), null, { timeout: 15000 });
const scale = (s, a, b) => { const A = find(s, a), Bm = find(s, b); return Math.hypot(A.x - Bm.x, A.y - Bm.y); };

if (only === 'all' || only === 'center') {
  log('— Zentrieren beim Überfahren (1440)');
  const page = await open('/de/');
  await toStage(page);
  await waitDone(page);
  await page.waitForTimeout(500);
  let s = await state(page);
  const d0 = scale(s, 'Hamburg', 'Kirchaich');
  await page.screenshot({ path: `${out}/c-0-base.png` });
  // Lavonia liegt weit links: kurz darauf zeigen, dann verweilen
  const lav = find(s, 'Lavonia');
  log('  Lavonia vorher', pct(off(s, lav).dx), pct(off(s, lav).dy));
  await page.mouse.move(s.fr.x + lav.x + 80, s.fr.y + lav.y + 60);
  await page.mouse.move(s.fr.x + lav.x + 8, s.fr.y + lav.y + 6, { steps: 8 });
  await page.waitForTimeout(140);
  s = await state(page);
  check(/is-on/.test(s.ret.cls), 'Fadenkreuz dockt an Lavonia an');
  await page.waitForTimeout(1500);
  s = await state(page);
  const l1 = find(s, 'Lavonia');
  const o1 = off(s, l1);
  log('  Lavonia nachher', pct(o1.dx), pct(o1.dy), 'ret', s.ret.cls);
  check(Math.abs(o1.dx) < 0.06 && Math.abs(o1.dy) < 0.08, 'Lavonia steht nach dem Verweilen in der Mitte');
  check(/is-lock/.test(s.ret.cls) || /is-on/.test(s.ret.cls), 'Fadenkreuz bleibt auf dem Punkt');
  await page.screenshot({ path: `${out}/c-1-lavonia.png` });
  // kleine Mausbewegung: bleibt auf Lavonia (Halten)
  const mp = await page.evaluate(() => ({}));
  await page.mouse.move(s.fr.x + l1.x + 20, s.fr.y + l1.y - 12, { steps: 4 });
  await page.waitForTimeout(200);
  s = await state(page);
  check(/Lavonia/.test(s.card.text), 'kleine Bewegung: Karte zeigt weiter Lavonia');
  // weiter nach Europa: Hamburg
  s = await state(page);
  let hh = find(s, 'Hamburg');
  log('  Hamburg vor dem Wechsel', pct(off(s, hh).dx), pct(off(s, hh).dy), 'sichtbar', hh.on);
  if (hh.x > 0 && hh.x < s.fr.w && hh.y > 0 && hh.y < s.fr.h) {
    await page.mouse.move(s.fr.x + hh.x + 6, s.fr.y + hh.y + 4, { steps: 16 });
    await page.waitForTimeout(1700);
    s = await state(page);
    hh = find(s, 'Hamburg');
    const o2 = off(s, hh);
    log('  Hamburg nachher', pct(o2.dx), pct(o2.dy), 'Abstand HH–Kirchaich', d0.toFixed(1), '→', scale(s, 'Hamburg', 'Kirchaich').toFixed(1));
    check(Math.abs(o2.dx) < 0.07 && Math.abs(o2.dy) < 0.1, 'Hamburg steht danach in der Mitte');
    await page.screenshot({ path: `${out}/c-2-hamburg.png` });
  } else log('  Hamburg außerhalb des Bildes');
  // Karte verlassen → Rückflug in die Ausgangsansicht
  await page.mouse.move(20, 20, { steps: 4 });
  await page.waitForTimeout(2200);
  s = await state(page);
  const d3 = scale(s, 'Hamburg', 'Kirchaich');
  log('  Rückflug Abstand', d3.toFixed(1), '(Ausgang', d0.toFixed(1) + ')');
  check(Math.abs(d3 - d0) / d0 < 0.06, 'nach dem Verlassen zurück in der Ausgangsansicht');
  await page.screenshot({ path: `${out}/c-3-back.png` });
  // Schnelles Überstreichen ohne Verweilen: keine Kamerafahrt
  s = await state(page);
  const a = find(s, 'Lavonia'), b2 = find(s, 'Hamburg');
  await page.mouse.move(s.fr.x + a.x, s.fr.y + a.y + 40);
  await page.mouse.move(s.fr.x + b2.x, s.fr.y + b2.y + 40, { steps: 12 });
  await page.waitForTimeout(80);
  await page.mouse.move(20, 20, { steps: 2 });
  await page.waitForTimeout(300);
  s = await state(page);
  check(Math.abs(scale(s, 'Hamburg', 'Kirchaich') - d0) / d0 < 0.06, 'schnelles Überstreichen bewegt die Karte nicht');
  await page.close();
}

if (only === 'all' || only === 'center') {
  log('— Zentrieren: Punkte am Rand der Welt (1440)');
  const page = await open('/de/');
  await toStage(page);
  await waitDone(page);
  await page.waitForTimeout(500);
  let s0 = await state(page);
  const dBase = scale(s0, 'Hamburg', 'Kirchaich');
  const reps = s0.mk.filter((m) => /rep/.test(m.k));
  const east = reps.reduce((a, b) => (b.x > a.x ? b : a)), south = reps.reduce((a, b) => (b.y > a.y ? b : a)), west = reps.reduce((a, b) => (b.x < a.x ? b : a));
  for (const [name, pick] of [['Shanghai', (s) => find(s, 'Shanghai')], ['Dubai', (s) => find(s, 'Dubai')], ['östlichste Vertretung', (s) => s.mk.find((m) => m.lbl === east.lbl)], ['südlichste Vertretung', (s) => s.mk.find((m) => m.lbl === south.lbl)], ['westlichste Vertretung', (s) => s.mk.find((m) => m.lbl === west.lbl)]]) {
    let s = await state(page);
    const m = pick(s);
    await page.mouse.move(s.fr.x + m.x + 50, s.fr.y + m.y - 40);
    await page.mouse.move(s.fr.x + m.x + 3, s.fr.y + m.y + 2, { steps: 6 });
    await page.waitForTimeout(1600);
    s = await state(page);
    const r = s.ret;
    const o = { dx: (r.x - s.fr.w / 2) / s.fr.w, dy: (r.y - s.fr.h / 2) / s.fr.h };
    log(`  ${name} (${m.lbl.slice(0, 40)}): Zielring`, pct(o.dx), pct(o.dy));
    check(Math.abs(o.dx) < 0.06 && Math.abs(o.dy) < 0.08, `${name} rückt in die Mitte`);
    await page.screenshot({ path: `${out}/c-edge-${name.split(' ')[0]}.png` });
    await page.mouse.move(20, 20, { steps: 3 });
    await page.waitForTimeout(1900);
  }
  s0 = await state(page);
  check(Math.abs(scale(s0, 'Hamburg', 'Kirchaich') - dBase) < 1.5, 'danach wieder Ausgangsansicht');
  await page.close();
}

if (only === 'all' || only === 'lupe') {
  log('— Folge-Zoom: Ansicht folgt dem Zeiger, nach 4 s ohne Punkt heraus (1440)');
  const page = await open('/de/');
  await toStage(page);
  await waitDone(page);
  await page.waitForTimeout(500);
  let s = await state(page);
  const d0 = scale(s, 'Hamburg', 'Kirchaich');
  const du = find(s, 'Dubai');
  let px = s.fr.x + du.x + 3, py = s.fr.y + du.y + 2;
  await page.mouse.move(px + 40, py + 40);
  await page.mouse.move(px, py, { steps: 6 });
  await page.waitForTimeout(1500);
  s = await state(page);
  const z1 = scale(s, 'Hamburg', 'Kirchaich');
  log('  Abstand Hamburg–Kirchaich', d0.toFixed(1), '→', z1.toFixed(1));
  check(z1 > d0 * 1.3, 'Verweilen auf Dubai: Karte zoomt hinein');
  await page.waitForTimeout(5000);
  s = await state(page);
  check(Math.abs(scale(s, 'Hamburg', 'Kirchaich') - z1) < 1 && /is-on/.test(s.ret.cls), 'auf dem Punkt: nach 5 s weiter gezoomt (kein Herauszoomen)');
  // freie Stelle suchen (weit weg von allen sichtbaren Markern) und dorthin fahren
  const vis = s.mk.filter((m) => m.x > 0 && m.x < s.fr.w && m.y > 0 && m.y < s.fr.h);
  let best = null;
  for (let x = 60; x < s.fr.w - 60; x += 40) for (let y = 60; y < s.fr.h - 60; y += 40) {
    const dmin = Math.min(...vis.map((m) => Math.hypot(m.x - x, m.y - y)), 1e9);
    const far = Math.hypot(s.fr.x + x - px, s.fr.y + y - py);
    if (far > 180 && dmin > 110 && (!best || dmin > best.d)) best = { x, y, d: dmin };
  }
  const ref = find(s, 'Dubai');
  const tx = s.fr.x + best.x, ty = s.fr.y + best.y;
  const tLeave = Date.now(); // ab hier „ohne Punkt“: die 4 s zählen ab dem Verlassen des Punkts, nicht ab dem Ende der Bewegung
  await page.mouse.move(tx, ty, { steps: 24 });
  await page.waitForTimeout(500);
  s = await state(page);
  const moved = find(s, 'Dubai');
  const mx = moved.x - ref.x, my = moved.y - ref.y, ux = tx - px, uy = ty - py;
  const along = -(mx * ux + my * uy) / Math.hypot(ux, uy); // Inhalt wandert dem Zeiger entgegen
  log('  Zeiger', Math.round(ux), Math.round(uy), '→ Inhalt', Math.round(mx), Math.round(my), 'gegen die Zeigerrichtung', Math.round(along), 'px', 'ret', s.ret.cls);
  check(along > 40, 'Ansicht folgt dem Zeiger (Inhalt wandert entgegen)');
  await page.screenshot({ path: `${out}/l-follow.png` });
  const zNow = scale(s, 'Hamburg', 'Kirchaich');
  await page.waitForTimeout(Math.max(0, tLeave + 3000 - Date.now()));
  s = await state(page);
  check(Math.abs(scale(s, 'Hamburg', 'Kirchaich') - zNow) < 1, 'nach 3 s ohne Punkt noch gezoomt');
  await page.waitForTimeout(Math.max(0, tLeave + 5600 - Date.now()));
  s = await state(page);
  const d4 = scale(s, 'Hamburg', 'Kirchaich');
  log('  nach gut 4 s ohne Punkt: Abstand', d4.toFixed(1), '(Ausgang', d0.toFixed(1) + ')');
  check(Math.abs(d4 - d0) / d0 < 0.06, 'nach 4 s ohne Punkt: Karte zoomt von selbst heraus');
  await page.screenshot({ path: `${out}/l-out.png` });
  // ungezoomt folgt die Ansicht nicht
  s = await state(page);
  const r0 = find(s, 'Hamburg');
  await page.mouse.move(tx - 160, ty + 30, { steps: 12 });
  await page.waitForTimeout(400);
  s = await state(page);
  const r1 = find(s, 'Hamburg');
  check(Math.hypot(r1.x - r0.x, r1.y - r0.y) < 2 || /is-on/.test(s.ret.cls), 'Ausgangsansicht: Karte bleibt beim Bewegen stehen');
  await page.close();
}

if (only === 'all' || only === 'wheel') {
  log('— Mausrad (1440)');
  const page = await open('/de/');
  await toStage(page);
  await waitDone(page);
  await page.waitForTimeout(500);
  let s = await state(page);
  const d0 = scale(s, 'Hamburg', 'Kirchaich');
  // frei liegende Stelle über dem Atlantik (keine Punkte in der Nähe)
  const cx = s.fr.x + s.fr.w * 0.36, cy = s.fr.y + s.fr.h * 0.55;
  // 1) gerade erst hineingefahren: das Rad rollt die Seite
  await page.mouse.move(cx, cy - 300);
  await page.mouse.move(cx, cy, { steps: 4 });
  const y0 = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(400);
  const y1 = await page.evaluate(() => scrollY);
  s = await state(page);
  check(y1 > y0 && Math.abs(scale(s, 'Hamburg', 'Kirchaich') - d0) < 0.5, `ohne Verweilen: Seite rollt (${y0} → ${y1}), Karte bleibt`);
  await page.evaluate((y) => scrollTo(0, y), y0);
  await page.waitForTimeout(300);
  // 2) kurz ruhen lassen, dann zoomt das Rad
  await page.mouse.move(cx + 4, cy + 3, { steps: 2 });
  await page.waitForTimeout(900);
  const y2 = await page.evaluate(() => scrollY);
  for (let k = 0; k < 3; k++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(60); }
  await page.waitForTimeout(700);
  const y3 = await page.evaluate(() => scrollY);
  s = await state(page);
  const d1 = scale(s, 'Hamburg', 'Kirchaich');
  log('  nach 3 Rasten hinein: Abstand', d0.toFixed(1), '→', d1.toFixed(1), 'Seite', y2, '→', y3);
  check(d1 > d0 * 1.6 && y3 === y2, 'nach kurzem Verweilen zoomt das Rad, die Seite bleibt stehen');
  await page.screenshot({ path: `${out}/w-in.png` });
  // 3) wieder heraus bis ganz außen, dann rollt die Seite weiter
  for (let k = 0; k < 14; k++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(40); }
  await page.waitForTimeout(800);
  const y4 = await page.evaluate(() => scrollY);
  log('  ganz heraus, Seite', y3, '→', y4);
  check(y4 > y3, 'ganz herausgezoomt: weiteres Drehen rollt die Seite');
  // 4) Klick weckt sofort
  await page.evaluate((y) => scrollTo(0, y), y2);
  await page.mouse.move(20, 20);
  await page.waitForTimeout(300);
  s = await state(page);
  const d5 = scale(s, 'Hamburg', 'Kirchaich');
  await page.mouse.move(cx, cy, { steps: 3 });
  await page.mouse.down(); await page.mouse.up();
  await page.mouse.wheel(0, -100);
  await page.waitForTimeout(600);
  s = await state(page);
  check(scale(s, 'Hamburg', 'Kirchaich') > d5 * 1.15, 'nach einem Klick zoomt das Rad sofort');
  await page.close();
}

if (only === 'all' || only === 'pick') {
  log('— Länderauswahl (1440)');
  const page = await open('/de/');
  await toStage(page);
  await waitDone(page);
  await page.waitForTimeout(400);
  const btn = page.locator('[data-nm-pickbtn]');
  await page.screenshot({ path: `${out}/p-0-closed.png`, clip: await page.locator('.nm__bar').boundingBox().then((b) => ({ x: 0, y: b.y - 20, width: 1440, height: 90 })) });
  await btn.hover();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}/p-0-hover.png`, clip: await page.locator('.nm__bar').boundingBox().then((b) => ({ x: 0, y: b.y - 20, width: 1440, height: 90 })) });
  await btn.click();
  await page.waitForTimeout(260);
  let st = await page.evaluate(() => ({ exp: document.querySelector('[data-nm-pickbtn]').getAttribute('aria-expanded'), pop: !document.querySelector('[data-nm-pop]').hidden, focus: document.activeElement?.matches('[data-nm-pickq]'), n: document.querySelectorAll('.nm__opt:not([hidden])').length }));
  check(st.exp === 'true' && st.pop, 'Klick öffnet die Auswahl');
  check(st.focus, 'Suchfeld hat den Fokus');
  log('  Länder in der Liste', st.n);
  await page.screenshot({ path: `${out}/p-1-open.png` });
  await page.keyboard.type('ung');
  await page.waitForTimeout(120);
  st = await page.evaluate(() => [...document.querySelectorAll('.nm__opt:not([hidden])')].map((o) => o.textContent));
  log('  Treffer für "ung":', st.join(', '));
  check(st.length >= 1 && st.some((t) => /Ungarn/.test(t)), 'Filter findet Ungarn');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(1300);
  let s = await state(page);
  const act = await page.evaluate(() => ({ ad: document.querySelector('[data-nm-pickq]').getAttribute('aria-activedescendant'), txt: document.querySelector('.nm__opt.is-active')?.textContent }));
  log('  aktiv', act.ad, act.txt, '| Karte', s.card.text.split('\n').slice(0, 2).join(' | '));
  check(!!act.ad && /Ungarn/.test(act.txt), 'Pfeiltaste wählt die Option vor (aria-activedescendant)');
  await page.screenshot({ path: `${out}/p-2-filter.png` });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  s = await state(page);
  st = await page.evaluate(() => ({ exp: document.querySelector('[data-nm-pickbtn]').getAttribute('aria-expanded'), pop: !document.querySelector('[data-nm-pop]').hidden, lbl: document.querySelector('[data-nm-picklbl]').textContent, focus: document.activeElement?.matches('[data-nm-pickbtn]'), cls: document.querySelector('[data-nm-pick]').className }));
  log('  gewählt', st.lbl, st.cls, '| Karte', s.card.cls, s.card.text.split('\n').slice(0, 2).join(' | '));
  check(!st.pop && st.exp === 'false', 'Enter schließt die Auswahl');
  check(/Ungarn/.test(st.lbl), 'Knopf zeigt das gewählte Land');
  check(st.focus, 'Fokus zurück auf dem Knopf');
  check(/is-pin/.test(s.card.cls) && !s.card.hidden, 'Land ist angeheftet (Karte offen)');
  await page.screenshot({ path: `${out}/p-3-chosen.png` });
  // erneut öffnen, Escape schließt ohne Änderung
  await btn.click();
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(220);
  st = await page.evaluate(() => ({ pop: !document.querySelector('[data-nm-pop]').hidden, lbl: document.querySelector('[data-nm-picklbl]').textContent, focus: document.activeElement?.matches('[data-nm-pickbtn]') }));
  check(!st.pop && /Ungarn/.test(st.lbl) && st.focus, 'Escape schließt, Auswahl bleibt, Fokus auf dem Knopf');
  // Maus: öffnen, über Optionen fahren, außerhalb klicken
  await btn.click();
  await page.waitForTimeout(200);
  const opt = page.locator('.nm__opt', { hasText: 'Indien' }).first();
  if (await opt.count()) {
    await opt.scrollIntoViewIfNeeded();
    await opt.hover();
    await page.waitForTimeout(1300);
    s = await state(page);
    log('  Vorschau Indien', s.card.text.split('\n').slice(0, 2).join(' | '));
    await page.screenshot({ path: `${out}/p-4-preview.png` });
  }
  check(/Indien/.test(s.card.text), 'Vorschau zeigt Indien, obwohl Ungarn angeheftet ist');
  await page.mouse.click(30, 300);
  await page.waitForTimeout(1000);
  st = await page.evaluate(() => ({ pop: !document.querySelector('[data-nm-pop]').hidden, lbl: document.querySelector('[data-nm-picklbl]').textContent }));
  s = await state(page);
  check(!st.pop, 'Klick außerhalb schließt die Auswahl');
  check(/Ungarn/.test(st.lbl) && /Kecskem/.test(s.card.text) && /is-pin/.test(s.card.cls), 'ohne Wahl: Ungarn bleibt angeheftet, Karte kehrt zurück');
  await page.screenshot({ path: `${out}/p-4b-restored.png` });
  // Maus-Klick auf eine Option wählt
  await btn.click();
  await page.waitForTimeout(200);
  await page.locator('.nm__opt', { hasText: 'China' }).first().click();
  await page.waitForTimeout(1200);
  st = await page.evaluate(() => ({ lbl: document.querySelector('[data-nm-picklbl]').textContent }));
  s = await state(page);
  check(/China/.test(st.lbl) && /is-pin/.test(s.card.cls), 'Klick auf Option wählt China');
  await page.screenshot({ path: `${out}/p-5-china.png` });
  await page.screenshot({ path: `${out}/p-5-btn.png`, clip: await page.locator('.nm__bar').boundingBox().then((b) => ({ x: 700, y: b.y - 12, width: 740, height: 70 })) });
  // Gruppen und Suche nach Orten
  await btn.click();
  await page.waitForTimeout(200);
  const g = await page.evaluate(() => [...document.querySelectorAll('.nm__opth')].map((h) => h.textContent + ' ' + h.parentElement.querySelectorAll('[role=option]').length));
  log('  Gruppen', g.join(' | '));
  check(g.length === 2, 'Liste in zwei Gruppen (eigene Standorte, Vertretungen)');
  await page.keyboard.type('kirch');
  await page.waitForTimeout(120);
  st = await page.evaluate(() => ({ hits: [...document.querySelectorAll('.nm__opt:not([hidden])')].map((o) => o.textContent), groups: [...document.querySelectorAll('.nm__optg')].map((x) => x.hidden) }));
  log('  "kirch" →', st.hits.join(', '), 'Gruppen verborgen', st.groups.join(','));
  check(st.hits.length === 1 && /Deutschland/.test(st.hits[0]) && st.groups[1] === true, 'Ort „Kirchaich“ findet Deutschland, leere Gruppe verschwindet');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  // Kreuz hebt die Wahl auf
  const x = page.locator('[data-nm-pickx]');
  check(await x.isVisible(), 'Kreuz zum Aufheben sichtbar');
  await x.click();
  await page.waitForTimeout(1200);
  st = await page.evaluate(() => ({ lbl: document.querySelector('[data-nm-picklbl]').textContent, cls: document.querySelector('[data-nm-pick]').className, x: document.querySelector('[data-nm-pickx]').hidden, world: document.querySelector('[data-nm-region="world"]').getAttribute('aria-pressed'), focus: document.activeElement?.matches('[data-nm-pickbtn]') }));
  s = await state(page);
  log('  aufgehoben', st.lbl, st.cls, 'Welt', st.world);
  check(/wählen/.test(st.lbl) && !/has-value/.test(st.cls) && st.x && st.world === 'true' && s.card.hidden && st.focus, 'Kreuz: Platzhalter, keine Karte, Region Welt, Fokus auf dem Knopf');
  // Klick auf einen Punkt der Karte: Knopf nennt das Land
  s = await state(page);
  const lav = find(s, 'Lavonia');
  await page.mouse.move(s.fr.x + lav.x + 3, s.fr.y + lav.y + 2, { steps: 4 });
  await page.waitForTimeout(100);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(900);
  st = await page.evaluate(() => ({ lbl: document.querySelector('[data-nm-picklbl]').textContent }));
  log('  nach Klick auf Lavonia:', st.lbl);
  check(/Vereinigte Staaten|USA/.test(st.lbl), 'Knopf folgt dem angehefteten Punkt (USA)');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  st = await page.evaluate(() => ({ lbl: document.querySelector('[data-nm-picklbl]').textContent }));
  check(/wählen/.test(st.lbl), 'Escape auf der Karte: Knopf zurück auf den Platzhalter');
  await page.close();
}

if (only === 'all' || only === 'mob') {
  log('— Länderauswahl Telefon (390)');
  const page = await open('/de/', { w: 390, h: 844, mob: true });
  await toStage(page);
  await waitDone(page);
  await page.waitForTimeout(400);
  const bb = await page.locator('[data-nm-pickbtn]').boundingBox();
  log('  Knopf', Math.round(bb.x), Math.round(bb.width), 'x', Math.round(bb.height));
  check(bb.x >= 15 && bb.x + bb.width <= 375 && bb.height >= 44, 'Knopf passt in die Breite, Tippfläche ≥ 44 px');
  await page.locator('[data-nm-pickbtn]').tap();
  await page.waitForTimeout(300);
  const pb = await page.locator('[data-nm-pop]').boundingBox();
  log('  Popover', Math.round(pb.x), Math.round(pb.y), Math.round(pb.width), 'x', Math.round(pb.height));
  check(pb.x === 0 && Math.round(pb.width) === 390 && Math.abs(pb.y + pb.height - 844) < 2, 'Auswahl als Blatt am unteren Rand');
  const fo = await page.evaluate(() => document.activeElement?.matches('[data-nm-pop]'));
  check(fo, 'Finger: Fokus im Blatt, keine Tastatur');
  const top = await page.evaluate(() => { const r = document.querySelector('[data-nm-pop]').getBoundingClientRect(); const e = document.elementFromPoint(195, r.top + 30); return e?.closest('[data-nm-pop]') ? 'Blatt' : e?.className; });
  check(top === 'Blatt', 'Blatt liegt über App-Leiste und Karte (' + top + ')');
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check(sw <= 390, 'kein seitliches Scrollen (' + sw + ')');
  await page.screenshot({ path: `${out}/m-1-open.png` });
  // Schleier antippen schließt
  await page.touchscreen.tap(195, 120);
  await page.waitForTimeout(400);
  check(await page.evaluate(() => document.querySelector('[data-nm-pop]').hidden), 'Antippen des Schleiers schließt das Blatt');
  await page.locator('[data-nm-pickbtn]').tap();
  await page.waitForTimeout(400);
  await page.locator('.nm__opt', { hasText: 'Ungarn' }).first().tap();
  await page.waitForTimeout(1200);
  const s = await state(page);
  check(/is-pin/.test(s.card.cls), 'Tippen wählt Ungarn');
  await page.screenshot({ path: `${out}/m-2-chosen.png` });
  await page.close();
}

if (only === 'all' || only === 'dark') {
  const page = await open('/de/', { dark: true });
  await toStage(page);
  await waitDone(page);
  await page.locator('[data-nm-pickbtn]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/d-1-open.png` });
  await page.close();
}

if (only === 'all' || only === 'sub') {
  log('— Unterseiten: Liste überfahren zentriert den Punkt');
  for (const [url, sel] of [['/de/unternehmen/standorte/', '.nm--locations'], ['/de/kontakt/', '.nm--contact']]) {
    const page = await open(url);
    await page.evaluate((sel) => { const el = document.querySelector(sel); scrollTo(0, el.getBoundingClientRect().top + scrollY - 120); }, sel);
    await page.waitForFunction((sel) => document.querySelector(sel)?.classList.contains('is-done'), sel, { timeout: 15000 });
    await page.waitForTimeout(400);
    const items = page.locator(`${sel} .nm__entry`);
    const n = await items.count();
    const pickI = Math.min(n - 1, 4);
    const label = (await items.nth(pickI).locator('b').textContent()).trim();
    await items.nth(pickI).hover();
    await page.waitForTimeout(1500);
    const s = await state(page, sel);
    const on = await page.evaluate((sel) => { const r = document.querySelector(`${sel} [data-nm-ret]`); const [x, y] = (r.style.translate || '0px 0px').split(' ').map(parseFloat); const fr = document.querySelector(`${sel} [data-nm-frame]`).getBoundingClientRect(); return { dx: (x - fr.width / 2) / fr.width, dy: (y - fr.height / 2) / fr.height, cls: r.className }; }, sel);
    log(`  ${url}: Eintrag "${label}" → Fadenkreuz`, pct(on.dx), pct(on.dy), on.cls);
    check(Math.abs(on.dx) < 0.07 && Math.abs(on.dy) < 0.1, `${url}: Punkt des Listeneintrags steht in der Mitte`);
    await page.screenshot({ path: `${out}/s-${sel.slice(5)}.png` });
    await page.close();
  }
}

await browser.close();
log(errs.length ? 'Konsole:\n' + errs.join('\n') : 'Konsole sauber');
log(fails ? `${fails} Prüfung(en) fehlgeschlagen` : 'alle Prüfungen ok');
process.exit(fails ? 1 : 0);
