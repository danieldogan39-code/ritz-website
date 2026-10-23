// Mega-Menü per Maus: echte Zeigerbewegungen (auch von unten direkt auf einen Menüpunkt, nach dem Scrollen, schnelles
// Wischen, Vorbeistreifen, Klick kurz nach dem Öffnen), nach jedem Schritt prüfen, welches Panel offen ist.
// node tools/qa/menu-hover.mjs [basis-url] [pfad]   (deutsche Seiten; Werte für 1440 × 900)
import { chromium } from 'playwright-core';
const base = process.argv[2] || 'http://localhost:8080';
const path = process.argv[3] || '/de/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) {} });
const page = await ctx.newPage();
await page.goto(base + path, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const pos = async (key) => page.evaluate((k) => { const b = document.querySelector(k ? `[data-mega="${k}"]` : '.nav__link:not([data-mega])'); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.left, r.right, r.top, r.bottom]; }, key);
const linkPos = async () => page.evaluate(() => { const b = document.querySelector('.nav__link:not([data-mega])'); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
const state = async () => page.evaluate(() => { const o = [...document.querySelectorAll('[data-mega-panel]')].filter((p) => !p.hidden && !p.classList.contains('is-leaving')).map((p) => p.dataset.megaPanel); return o.join(',') || '–'; });
const log = async (label, want) => { const s = await state(); console.log((s === want ? 'ok  ' : 'FEHL') + ' ' + label + ' → ' + s + (s === want ? '' : ` (erwartet ${want})`)); };
let [x, y] = [700, 500];
await page.mouse.move(x, y);
const go = async (tx, ty, steps = 12) => { await page.mouse.move(tx, ty, { steps }); x = tx; y = ty; };
const P = await pos('products'), A = await pos('sectors'), C = await pos('company');
const W = await linkPos();
console.log('Knopf Produkte', P.map(Math.round).join(' '));
await go(P[0], P[1]); await page.waitForTimeout(400); await log('1 Maus auf Produkte', 'products');
await go(A[0], A[1], 8); await page.waitForTimeout(400); await log('2 weiter zu Anwendungen', 'sectors');
await go(A[0], A[1] + 160, 6); await page.waitForTimeout(300); await log('3 ins Panel', 'sectors');
await go(C[0], C[1], 10); await page.waitForTimeout(400); await log('4 zurück hoch zu Unternehmen', 'company');
await go(W[0], W[1], 6); await page.waitForTimeout(400); await log('5 auf einen Punkt ohne Menü', '–');
await go(P[0], P[1], 10); await page.waitForTimeout(400); await log('6 wieder Produkte', 'products');
await page.keyboard.press('Escape'); await page.waitForTimeout(250); await log('7a Escape', '–');
await go(P[0] + 6, P[1] + 2, 3); await page.waitForTimeout(400); await log('7b nach Escape: Maus ruht weiter auf Produkte (bleibt zu)', '–');
await go(P[0], P[1] + 300, 8); await page.waitForTimeout(500); await log('8a raus nach unten', '–');
await go(P[0], P[1], 8); await page.waitForTimeout(400); await log('8b wieder hoch auf Produkte', 'products');
await page.mouse.click(P[0], P[1]); await page.waitForTimeout(300); await log('9a Klick kurz nach dem Öffnen per Zeiger (bleibt offen)', 'products');
await page.waitForTimeout(500); await page.mouse.click(P[0], P[1]); await page.waitForTimeout(300); await log('9b späterer Klick schließt', '–');
await page.mouse.click(P[0], P[1]); await page.waitForTimeout(300); await log('9c Klick öffnet wieder', 'products');
await go(A[0], A[1], 8); await page.waitForTimeout(400); await log('9c weiter zu Anwendungen', 'sectors');
// Kante: unterer Rand des Knopfs, während ein anderes Panel offen ist
await go(C[0], C[5] - 3, 8); await page.waitForTimeout(400); await log('10 unterer Rand von Unternehmen', 'company');
await go(700, 600, 8); await page.waitForTimeout(500);
await page.mouse.wheel(0, 700); await page.waitForTimeout(600);
const P2 = await pos('products');
await go(P2[0], P2[1], 10); await page.waitForTimeout(400); await log('11 gescrollt, Produkte', 'products');
// schnell über alle Punkte wischen und auf Unternehmen stehen bleiben
await go(700, 600, 4); await page.waitForTimeout(500);
await go(P2[0] - 40, P2[1], 2); await go(C[0], C[1], 3); await page.waitForTimeout(400); await log('12 schnell gewischt, steht auf Unternehmen', 'company');
// nur vorbeistreifen: über Unternehmen hinweg zur Suche, es darf sich kein Menü öffnen
await go(700, 600, 4); await page.waitForTimeout(500);
const Q = await page.evaluate(() => { const r = document.querySelector('.hdr .icon-btn').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
await go(C[0], C[1], 4); await go(Q[0], Q[1], 3); await page.waitForTimeout(400); await log('13 über Unternehmen hinweg zur Suche', '–');
await browser.close();
