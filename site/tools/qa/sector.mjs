// Anwendungsseiten prüfen (statische Seiten, alle Sprachen): Schaltbild und Legende passen zusammen, Beschriftungen im
// Schaltbild liegen innerhalb der Zeichenfläche und kreuzen weder Leitungen noch Symbole noch einander, Texte in Kästen
// passen hinein; Kennziffern der Anforderungen führen zu einer Produktgruppe; Reiter mit Tastatur, Legendenklick und
// Sprungadresse #gruppe-n.   Aufruf: node tools/qa/sector.mjs [Basis-URL]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8080';
const exe = process.env.CHROME || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const ROOT = path.resolve('dist');
const SEG = { de: 'anwendungen', en: 'applications', fr: 'applications', hu: 'alkalmazasok', es: 'aplicaciones' };
const browser = await chromium.launch({ executablePath: exe });
let fail = 0, pass = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log(`FEHL ${msg}`); } };
const errs = [];

// Geometrie im Schaltbild (Einheiten der Zeichenfläche)
const geometry = () => {
  const svg = document.querySelector('.mp__svg');
  const vb = svg.viewBox.baseVal;
  // Textkasten ohne Ober- und Unterlänge, damit Linien knapp unter der Grundlinie nicht als Berührung zählen
  const core = (t) => { const b = t.getBBox(); return { x0: b.x + 1, x1: b.x + b.width - 1, y0: b.y + b.height * 0.24, y1: b.y + b.height * 0.84, s: t.textContent }; };
  const hit = (r, x, y, pad = 0) => x >= r.x0 - pad && x <= r.x1 + pad && y >= r.y0 - pad && y <= r.y1 + pad;
  const labels = [...svg.querySelectorAll('.mp-labels text')].map(core);
  const out = { outside: [], cross: [], overlap: [], boxed: [], vb: [vb.x, vb.y, vb.width, vb.height] };
  for (const t of svg.querySelectorAll('text')) {
    const b = t.getBBox();
    if (b.x < vb.x - 0.5 || b.x + b.width > vb.x + vb.width + 0.5 || b.y < vb.y - 0.5 || b.y + b.height > vb.y + vb.height + 0.5) out.outside.push(t.textContent);
  }
  // Leitungen, Hinweislinien, Rahmen: Punkte entlang der Pfade
  const shapes = [...svg.querySelectorAll('.mp-wires path, .mp-secs path, .mp-pts path, .mp-eqs path, .mp-eqs rect, .mp-pts rect, .mp-eqs circle, .mp-pts circle')];
  for (const sh of shapes) {
    const pts = [];
    if (sh.tagName === 'circle') {
      const cx = sh.cx.baseVal.value, cy = sh.cy.baseVal.value, r = sh.r.baseVal.value;
      for (let a = 0; a < 360; a += 6) pts.push([cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]);
    } else if (sh.tagName === 'rect') {
      const x = sh.x.baseVal.value, y = sh.y.baseVal.value, w = sh.width.baseVal.value, h = sh.height.baseVal.value;
      for (let i = 0; i <= w; i += 2) pts.push([x + i, y], [x + i, y + h]);
      for (let i = 0; i <= h; i += 2) pts.push([x, y + i], [x + w, y + i]);
    } else {
      const len = sh.getTotalLength();
      for (let d = 0; d <= len; d += 1.5) { const p = sh.getPointAtLength(d); pts.push([p.x, p.y]); }
    }
    for (const l of labels) if (pts.some(([x, y]) => hit(l, x, y))) out.cross.push(`„${l.s}“ × ${sh.tagName}.${sh.getAttribute('class')}`);
  }
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
    const a = labels[i], b = labels[j];
    if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) out.overlap.push(`„${a.s}“ / „${b.s}“`);
  }
  // Texte in Kästen: ganz im vorangehenden Rechteck
  for (const t of svg.querySelectorAll('text.mp-sym--b, text.mp-sym--r')) {
    let r = t.previousElementSibling;
    while (r && r.tagName !== 'rect') r = r.previousElementSibling;
    if (!r) continue;
    const b = t.getBBox(), x = r.x.baseVal.value, y = r.y.baseVal.value, w = r.width.baseVal.value, h = r.height.baseVal.value;
    if (b.x < x + 2 || b.x + b.width > x + w - 2 || b.y + b.height * 0.2 < y || b.y + b.height * 0.85 > y + h) out.boxed.push(t.textContent);
  }
  return out;
};

for (const [lang, seg] of Object.entries(SEG)) {
  const dirs = fs.readdirSync(path.join(ROOT, lang, seg)).filter((d) => fs.statSync(path.join(ROOT, lang, seg, d)).isDirectory()).sort();
  ok(dirs.length === 7, `${lang}: sieben Anwendungsseiten (${dirs.length})`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('ritz-intro-skip', '1'); } catch (e) { /* */ } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(`${lang}: ${e}`));
  for (const d of dirs) {
    const url = `${BASE}/${lang}/${seg}/${d}/`;
    const id = `${lang}/${d}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    const s = await page.evaluate(() => {
      const legend = [...document.querySelectorAll('.mp__legend a[data-pt]')];
      const pts = [...new Set([...document.querySelectorAll('.mp__svg .mp-pt')].map((p) => p.dataset.pt))];
      const panels = [...document.querySelectorAll('[data-sc-panel]')];
      return {
        hidden: document.querySelector('.mp__svg')?.getAttribute('aria-hidden'),
        // Einzeichnen über stroke-dashoffset setzt pathLength="1" an jedem Leiter voraus
        noLen: document.querySelectorAll('.mp__svg :is(.mp-w, .mp-bus):not([pathLength="1"])').length,
        legend: legend.map((a) => a.dataset.pt), legendHref: legend.map((a) => a.getAttribute('href')),
        legendCount: legend.map((a) => a.querySelector('small').textContent),
        panelCount: panels.map((p) => p.querySelector('.sc-panel__h small')?.textContent),
        pts, panels: panels.map((p) => p.id), tabs: document.querySelectorAll('[data-sc-tab]').length,
        needs: [...document.querySelectorAll('.sc-need__go')].map((a) => a.getAttribute('href')),
        needRows: document.querySelectorAll('.sc-need').length,
        facts: document.querySelectorAll('.sc-facts > div').length,
        h1: document.querySelectorAll('h1').length,
        cards: panels.map((p) => p.querySelectorAll('.pcard').length),
      };
    });
    ok(s.hidden === 'true', `${id}: Schaltbild für Vorleseprogramme verborgen`);
    ok(s.noLen === 0, `${id}: alle Leiter mit pathLength="1" (${s.noLen} ohne)`);
    ok(s.legend.length >= 2 && s.legend.join() === s.pts.sort().join(), `${id}: jede Gruppe hat einen Einbauort im Schaltbild (Legende ${s.legend}, Schaltbild ${s.pts})`);
    ok(s.legendHref.every((h) => s.panels.includes(h.slice(1))), `${id}: Legendenlinks führen zu Produktgruppen`);
    ok(s.legendCount.join() === s.panelCount.join(), `${id}: Produktzahlen in Legende und Gruppen gleich`);
    ok(s.tabs === s.panels.length, `${id}: ein Reiter je Gruppe (${s.tabs}/${s.panels.length})`);
    ok(s.needRows >= 4 && s.needs.length === s.needRows && s.needs.every((h) => s.panels.includes(h.slice(1))), `${id}: jede Anforderung führt zu einer Gruppe (${s.needs.length}/${s.needRows})`);
    ok(s.facts >= 3, `${id}: Kennwerte (${s.facts})`);
    ok(s.h1 === 1, `${id}: genau eine Hauptüberschrift`);
    ok(s.cards.every((n) => n >= 1 && n <= 8), `${id}: 1–8 Produkte je Gruppe (${s.cards})`);
    const g = await page.evaluate(geometry);
    ok(!g.outside.length, `${id}: Beschriftungen innerhalb der Zeichenfläche ${g.outside.join(', ')}`);
    ok(!g.cross.length, `${id}: Beschriftungen frei von Leitungen und Symbolen – ${g.cross.slice(0, 4).join('; ')}`);
    ok(!g.overlap.length, `${id}: Beschriftungen überlappen nicht – ${g.overlap.join('; ')}`);
    ok(!g.boxed.length, `${id}: Kastentexte passen in ihren Kasten – ${g.boxed.join(', ')}`);

    // Reiter: Ausgangszustand, Tastatur, Legendenklick, Hervorhebung
    const t0 = await page.evaluate(() => ({
      role: document.querySelector('[data-sc-tabs]')?.getAttribute('role'),
      sel: [...document.querySelectorAll('[data-sc-tab]')].map((t) => t.getAttribute('aria-selected')),
      vis: [...document.querySelectorAll('[data-sc-panel]')].map((p) => !p.hidden),
    }));
    ok(t0.role === 'tablist' && t0.sel[0] === 'true' && t0.vis.filter(Boolean).length === 1 && t0.vis[0], `${id}: Reiter eingerichtet, erste Gruppe sichtbar`);
    await page.focus('[data-sc-tab]');
    await page.keyboard.press('ArrowRight');
    let st = await page.evaluate(() => ({ sel: document.activeElement.getAttribute('aria-selected'), i: [...document.querySelectorAll('[data-sc-tab]')].indexOf(document.activeElement), vis: [...document.querySelectorAll('[data-sc-panel]')].findIndex((p) => !p.hidden) }));
    ok(st.sel === 'true' && st.i === 1 && st.vis === 1, `${id}: Pfeiltaste wählt den nächsten Reiter`);
    await page.keyboard.press('End');
    st = await page.evaluate(() => ({ i: [...document.querySelectorAll('[data-sc-tab]')].indexOf(document.activeElement), n: document.querySelectorAll('[data-sc-tab]').length }));
    ok(st.i === st.n - 1, `${id}: Ende wählt den letzten Reiter`);
    await page.keyboard.press('Home');
    await page.evaluate(() => window.scrollTo(0, 0));
    const last = s.legend.length;
    await page.hover(`.mp__legend a[data-pt="${last}"]`);
    const hot = await page.evaluate((n) => ({ has: document.querySelector('.mp').classList.contains('has-hot'), pts: [...document.querySelectorAll('.mp-pt.is-hot')].map((p) => p.dataset.pt) }), String(last));
    ok(hot.has && hot.pts.length >= 1 && hot.pts.every((p) => p === String(last)), `${id}: Legende hebt den Einbauort hervor`);
    await page.click(`.mp__legend a[data-pt="${last}"]`);
    await page.waitForTimeout(900);
    st = await page.evaluate(() => ({ vis: [...document.querySelectorAll('[data-sc-panel]')].findIndex((p) => !p.hidden), top: document.getElementById('sc-prod-t').getBoundingClientRect().top }));
    ok(st.vis === last - 1 && st.top > 60 && st.top < 170, `${id}: Legendenklick wählt Gruppe ${last} und zeigt die Produkte (Überschrift bei ${Math.round(st.top)} px)`);
    // Sprungadresse beim Laden und als späterer Wechsel
    await page.evaluate(() => { location.hash = '#gruppe-1'; });
    await page.waitForTimeout(100);
    st = await page.evaluate(() => [...document.querySelectorAll('[data-sc-panel]')].findIndex((p) => !p.hidden));
    ok(st === 0, `${id}: Wechsel auf #gruppe-1 öffnet die erste Gruppe`);
    await page.goto('about:blank');
    await page.goto(`${url}#gruppe-2`, { waitUntil: 'networkidle' });
    st = await page.evaluate(() => [...document.querySelectorAll('[data-sc-panel]')].findIndex((p) => !p.hidden));
    ok(st === 1, `${id}: #gruppe-2 öffnet beim Laden die zweite Gruppe`);
  }
  await ctx.close();
}

// ohne Skript: alle Gruppen untereinander, Reiterleiste verborgen
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/de/anwendungen/energieversorgung-netze/`);
  const r = await page.evaluate(() => ({ bar: document.querySelector('[data-sc-tabs]')?.hidden, vis: [...document.querySelectorAll('[data-sc-panel]')].every((p) => !p.hidden) }));
  ok(r.bar === true && r.vis, 'ohne Skript: alle Gruppen sichtbar, keine Reiterleiste');
  await ctx.close();
}
ok(!errs.length, `keine Skriptfehler ${errs.join(' | ')}`);
await browser.close();
console.log(fail ? `${fail} Fehler, ${pass} ok` : `Alle ${pass} Prüfungen ok`);
process.exit(fail ? 1 : 0);
