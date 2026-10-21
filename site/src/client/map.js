// Weltkarte: RITZ-Standorte und Vertretungen (eigene SVG-Karte, ohne Drittanbieter)
import { $, $$, getData, getT, CFG, toast, debounce } from './core.js';
import { esc, icon, colon, phoneTxt } from '../lib/util.js';
import { projectLL, locAddress } from '../lib/geo.js';
import { copyText } from './basket.js';

const REGIONS = { europe: [-11, 35, 33, 62], americas: [-125, -42, -32, 52], apac: [62, -42, 155, 48], africa: [-18, -36, 60, 40] };
const REGION_OF = { DE: 'europe', AT: 'europe', HU: 'europe', CN: 'apac', US: 'americas', AE: 'africa' };
const TYPE_R = { hq: 7.5, production: 6.5, site: 5.5, sales: 5.5, rep: 4 };
const NS = 'http://www.w3.org/2000/svg';

export async function initMaps(root) {
  for (const box of $$('[data-map]', root)) {
    try { await buildMap(box); } catch (e) { console.error(e); const l = $('.map__loading', box); if (l) l.textContent = '–'; }
  }
}

async function buildMap(box) {
  const mode = box.dataset.map;
  const [world, contacts, t] = await Promise.all([getData('world'), getData('contacts'), getT()]);
  const M = t.map, lang = CFG.lang;
  let dn = null;
  try { dn = new Intl.DisplayNames([lang], { type: 'region' }); } catch (e) { /* alt */ }
  const cname = (r) => (r.country && r.country.length === 2 && dn ? dn.of(r.country) : (lang === 'de' ? r.country_de : r.country_en) || r.country);
  // Einträge
  const entries = [];
  for (const l of contacts.locations) if (l.lat) entries.push({ id: 'l-' + l.id, kind: 'loc', type: l.type, lat: l.lat, lng: l.lng, name: l.city, sub: l.company, country: l.country, region: REGION_OF[l.country] || 'europe', data: l });
  if (mode === 'all') for (const r of [...contacts.reps, ...contacts.repsDE]) if (r.lat) entries.push({ id: 'r-' + r.pid, kind: 'rep', type: 'rep', lat: r.lat, lng: r.lng, name: r.company, sub: cname(r), country: r.country, region: r.region === 'germany' ? 'europe' : r.region, data: r });
  for (const e of entries) [e.x, e.y] = projectLL(world, e.lng, e.lat);

  const canvas = $('[data-map-canvas]', box);
  $('.map__loading', box)?.remove();
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${world.W} ${world.H}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<g data-z><path class="map__land" d="${world.land}"/><path class="map__borders" d="${world.borders}"/><g class="map__links" data-links></g><g data-marks></g><g data-labels></g></g>`;
  canvas.insertBefore(svg, canvas.firstChild);
  const gz = svg.querySelector('[data-z]'), gm = svg.querySelector('[data-marks]'), gl = svg.querySelector('[data-labels]');
  // Verbindungslinien Zentrale → Werke
  const hq = entries.find((e) => e.type === 'hq');
  if (hq) svg.querySelector('[data-links]').innerHTML = entries.filter((e) => e.kind === 'loc' && e !== hq).map((e) => {
    const mx = (hq.x + e.x) / 2, my = Math.min(hq.y, e.y) - Math.abs(hq.x - e.x) * 0.18;
    return `<path d="M${hq.x.toFixed(1)},${hq.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${e.x.toFixed(1)},${e.y.toFixed(1)}"/>`;
  }).join('');
  // Marker: Vertretungen zuerst (unten), dann Standorte
  const order = [...entries].sort((a, b) => (a.kind === 'rep' ? 0 : 1) - (b.kind === 'rep' ? 0 : 1));
  for (const e of order) {
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'map__mk');
    g.dataset.id = e.id;
    g.innerHTML = `<circle cx="${e.x.toFixed(2)}" cy="${e.y.toFixed(2)}" r="${TYPE_R[e.type]}" class="dot-${e.type === 'rep' ? 'rep' : e.type === 'hq' ? 'hq' : e.type === 'production' ? 'prod' : 'sales'}"/>`;
    e.g = g; e.c = g.firstChild;
    gm.appendChild(g);
    if (e.kind === 'loc') {
      const tx = document.createElementNS(NS, 'text');
      tx.setAttribute('class', 'map__label'); tx.setAttribute('x', e.x + 9); tx.setAttribute('y', e.y + 4);
      tx.textContent = e.name.replace(/ \(.*\)$/, '').replace(/,.*$/, '');
      e.label = tx; gl.appendChild(tx);
    }
  }
  // Legende / Ebenen
  const legend = $('[data-map-legend]', box);
  const legendItems = [['hq', M.legendHq, 'var(--ink)'], ['production', M.legendProd, 'var(--red)'], ['sales', M.legendSales, 'var(--paper)']];
  if (mode === 'all') legendItems.push(['rep', M.legendRep, 'var(--copper)']);
  legend.innerHTML = legendItems.map(([k, l, c]) => `<span><i class="lg lg--${k}" style="background:${c}"></i>${esc(l)}</span>`).join('');
  // Regionen
  const regBox = $('[data-map-regions]', box);
  regBox.innerHTML = [['world', t.ui.all], ['europe', t.lbl.region.europe], ['americas', t.lbl.region.americas], ['apac', t.lbl.region.apac], ['africa', t.lbl.region.africa]]
    .map(([k, l], i) => `<button type="button" class="chip${i === 0 ? ' is-on' : ''}" data-region="${k}" aria-pressed="${i === 0}">${esc(l)}</button>`).join('');

  const typeOrder = { hq: 0, production: 1, site: 2, sales: 3, rep: 4 };
  // ---- Zoom/Pan ----
  const st = { k: 1, x: 0, y: 0 };
  const W = world.W, H = world.H;
  const clamp = () => {
    st.k = Math.max(1, Math.min(28, st.k));
    st.x = Math.min(0, Math.max(W - W * st.k, st.x));
    st.y = Math.min(0, Math.max(H - H * st.k, st.y));
  };
  let raf = 0;
  const apply = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      clamp();
      gz.setAttribute('transform', `translate(${st.x.toFixed(2)},${st.y.toFixed(2)}) scale(${st.k.toFixed(4)})`);
      // Größen in Bildschirmpixeln halten, unabhängig von Kartenbreite und Zoom
      const u = ppu();
      const s = 1 / (Math.pow(st.k, 0.85) * u), q = 1 / (st.k * u);
      for (const e of entries) e.c.setAttribute('r', (TYPE_R[e.type] * (e.active ? 1.5 : 1) * s).toFixed(3));
      // Beschriftungen: rechts, sonst links vom Punkt; bei Überschneidung ausblenden (Zentrale und Aktive zuerst)
      const placed = [];
      const hit = (b) => placed.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
      const labeled = entries.filter((e) => e.label).sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0) || typeOrder[a.type] - typeOrder[b.type]);
      for (const e of labeled) {
        const L = e.label;
        L.setAttribute('font-size', (12 * q).toFixed(3));
        L.style.strokeWidth = (3 * q).toFixed(3) + 'px';
        const show = (st.k >= 2.2 || e.type === 'hq' || e.active) && L.style.visibility !== 'hidden';
        if (!show) { L.style.display = 'none'; continue; }
        const px = (e.x * st.k + st.x) * u, py = (e.y * st.k + st.y) * u, w = L.textContent.length * 6.6 + 4, r = TYPE_R[e.type] + 4;
        const right = { x0: px + r, x1: px + r + w, y0: py - 9, y1: py + 7 }, left = { x0: px - r - w, x1: px - r, y0: py - 9, y1: py + 7 };
        let side = null;
        if (!hit(right)) side = 'r'; else if (!hit(left)) side = 'l';
        if (!side) { L.style.display = 'none'; continue; }
        placed.push(side === 'r' ? right : left);
        L.style.display = '';
        L.setAttribute('text-anchor', side === 'r' ? 'start' : 'end');
        L.setAttribute('x', (e.x + (side === 'r' ? 1 : -1) * (TYPE_R[e.type] + 4) * q).toFixed(2));
        L.setAttribute('y', (e.y + 4 * q).toFixed(2));
      }
    });
  };
  // Umrechnung Bildschirm ↔ Kartenkoordinaten (berücksichtigt viewBox und Seitenverhältnis)
  const toSvg = (cx, cy) => { const m = svg.getScreenCTM(); if (!m) return [0, 0]; const p = new DOMPoint(cx, cy).matrixTransform(m.inverse()); return [p.x, p.y]; };
  const toScreen = (x, y) => { const m = svg.getScreenCTM(); const p = new DOMPoint(x, y).matrixTransform(m); return [p.x, p.y]; };
  function ppu() { const m = svg.getScreenCTM(); return m && m.a > 0 ? m.a : 1; }
  const zoomAt = (px, py, f) => { const k2 = Math.max(1, Math.min(28, st.k * f)); const ff = k2 / st.k; st.x = px - (px - st.x) * ff; st.y = py - (py - st.y) * ff; st.k = k2; apply(); };
  const animateTo = (k, cx, cy) => {
    const from = { ...st }, to = { k, x: W / 2 - cx * k, y: H / 2 - cy * k };
    const t0 = performance.now(), dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
    const step = (now) => { const p = dur ? Math.min(1, (now - t0) / dur) : 1; const e = 1 - Math.pow(1 - p, 3); st.k = from.k + (to.k - from.k) * e; st.x = from.x + (to.x - from.x) * e; st.y = from.y + (to.y - from.y) * e; apply(); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const fitBox = (x0, y0, x1, y1) => { const k = Math.min(W / (x1 - x0), H / (y1 - y0)) * 0.92; animateTo(Math.max(1, k), (x0 + x1) / 2, (y0 + y1) / 2); };
  const fitRegion = (r) => {
    if (r === 'world') return animateTo(1, W / 2, H / 2);
    const [lo0, la0, lo1, la1] = REGIONS[r];
    const a = projectLL(world, lo0, la1), b = projectLL(world, lo1, la0), c = projectLL(world, lo0, la0), d = projectLL(world, lo1, la1);
    fitBox(Math.min(a[0], c[0]), Math.min(a[1], d[1]), Math.max(b[0], d[0]), Math.max(b[1], c[1]));
  };
  svg.addEventListener('wheel', (e) => { e.preventDefault(); const [px, py] = toSvg(e.clientX, e.clientY); zoomAt(px, py, Math.exp(-e.deltaY * 0.0022)); }, { passive: false });
  const ptrs = new Map();
  let lastPointer = 'mouse';
  svg.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType || 'mouse'; }, true);
  if ('ResizeObserver' in window) new ResizeObserver(() => apply()).observe(svg);
  let drag = null, moved = false, pinch0 = null;
  svg.addEventListener('pointerdown', (e) => { svg.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = false; if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, sx: st.x, sy: st.y }; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: st.k, c: toSvg((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), sx: st.x, sy: st.y }; } canvas.classList.add('is-panning'); });
  svg.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    const u = ppu();
    if (ptrs.size === 2 && pinch0) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const k2 = Math.max(1, Math.min(28, pinch0.k * (d / pinch0.d)));
      const ff = k2 / pinch0.k;
      st.k = k2; st.x = pinch0.c[0] - (pinch0.c[0] - pinch0.sx) * ff; st.y = pinch0.c[1] - (pinch0.c[1] - pinch0.sy) * ff; moved = true; apply();
    } else if (drag) {
      const dx = (e.clientX - drag.x) / u, dy = (e.clientY - drag.y) / u;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      st.x = drag.sx + dx; st.y = drag.sy + dy; apply();
    }
  });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null; if (!ptrs.size) { drag = null; canvas.classList.remove('is-panning'); } };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  svg.addEventListener('dblclick', (e) => { const [px, py] = toSvg(e.clientX, e.clientY); zoomAt(px, py, 2); });
  // Klick auf Marker (nächster Punkt im Umkreis)
  svg.addEventListener('click', (e) => {
    if (moved) return;
    const [px, py] = toSvg(e.clientX, e.clientY);
    const mx = (px - st.x) / st.k, my = (py - st.y) / st.k;
    let best = null, bd = Infinity;
    const u = ppu();
    for (const en of visibleEntries()) { const d = Math.hypot(en.x - mx, en.y - my) * st.k * u; if (d < bd) { bd = d; best = en; } }
    if (best && bd < (lastPointer === 'mouse' ? 14 : 24)) select(best, false);
  });
  // Tooltip
  const tip = document.createElement('div'); tip.className = 'map__tip'; tip.hidden = true; canvas.appendChild(tip);
  svg.addEventListener('pointermove', debounce((e) => {
    if (drag && moved) { tip.hidden = true; return; }
    const [px, py] = toSvg(e.clientX, e.clientY);
    const mx = (px - st.x) / st.k, my = (py - st.y) / st.k;
    let best = null, bd = Infinity;
    const u = ppu();
    for (const en of visibleEntries()) { const d = Math.hypot(en.x - mx, en.y - my) * st.k * u; if (d < bd) { bd = d; best = en; } }
    if (best && bd < 14) {
      const r = canvas.getBoundingClientRect();
      const [sx, sy] = toScreen(best.x * st.k + st.x, best.y * st.k + st.y);
      tip.hidden = false; tip.textContent = best.kind === 'rep' ? `${best.sub}${colon(lang)}${best.name}` : best.name;
      tip.style.left = sx - r.left + 'px';
      tip.style.top = sy - r.top + 'px';
      svg.style.cursor = 'pointer';
    } else { tip.hidden = true; svg.style.cursor = ''; }
  }, 10));
  svg.addEventListener('pointerleave', () => { tip.hidden = true; });
  $$('[data-map-zoom]', box).forEach((b) => b.addEventListener('click', () => {
    const z = b.dataset.mapZoom;
    if (z === 'reset') { $$('[data-region]', box).forEach((x) => { x.classList.toggle('is-on', x.dataset.region === 'world'); x.setAttribute('aria-pressed', String(x.dataset.region === 'world')); }); return fitRegion('world'); }
    zoomAt(W / 2, H / 2, z === 'in' ? 1.6 : 1 / 1.6);
  }));
  regBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-region]');
    if (!b) return;
    $$('[data-region]', box).forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    fitRegion(b.dataset.region);
    renderList();
  });

  // ---- Liste / Filter / Details ----
  const listEl = $('[data-map-list]', box), detail = $('[data-map-detail]', box), filter = $('[data-map-filter]', box);
  let layer = 'all';
  const region = () => $('[data-region].is-on', box)?.dataset.region || 'world';
  // Anschrift in der Seitensprache: Standorte mit Land aus dem Ländercode, Vertretungen DE/EN wie im Altbestand
  const addrOf = (e) => (e.kind === 'loc' ? locAddress(e.data, lang) : (lang === 'de' ? e.data.address : e.data.address_en || e.data.address) || []);
  const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  function visibleEntries() {
    const q = norm(filter?.value || '');
    return entries.filter((e) => (layer === 'all' || (layer === 'locations' ? e.kind === 'loc' : e.kind === 'rep')) && (!q || norm(e.name + ' ' + e.sub + ' ' + addrOf(e).join(' ')).includes(q)));
  }
  function renderList() {
    const vis = new Set(visibleEntries());
    for (const e of entries) e.g.style.display = vis.has(e) ? '' : 'none';
    for (const e of entries) if (e.label) e.label.style.visibility = vis.has(e) ? '' : 'hidden';
    const r = region();
    // Textsuche gilt weltweit, sonst filtert die gewählte Region die Liste
    const searching = !!(filter?.value || '').trim();
    const list = [...vis].filter((e) => searching || r === 'world' || e.region === r).sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || (a.kind === 'rep' ? a.sub.localeCompare(b.sub, lang) : a.name.localeCompare(b.name, lang)));
    listEl.innerHTML = list.map((e) => `<button type="button" class="map__entry${e.active ? ' is-active' : ''}" data-entry="${e.id}"><span class="kind">${esc(e.kind === 'rep' ? M.legendRep + ', ' + e.sub : t.lbl.locType[e.type])}</span><b>${esc(e.name)}</b><span>${esc(e.kind === 'rep' ? addrOf(e).slice(-1)[0] || '' : e.sub)}</span></button>`).join('') || `<p class="muted small" style="padding:16px">${esc(t.ui.noResults)}</p>`;
    apply();
  }
  function select(e, fromList = true) {
    for (const x of entries) x.active = false;
    e.active = true;
    e.g.parentNode.appendChild(e.g);
    const d = e.data;
    const addr = addrOf(e);
    const tel = d.phone ? `<a href="tel:${esc(d.phone.replace(/[^\d+]/g, ''))}">${icon('phone', 'width="16" height="16"')} ${phoneTxt(d.phone)}</a>` : '';
    const mail = d.email ? `<span class="line-mail"><a href="mailto:${esc(d.email)}">${icon('mail', 'width="16" height="16"')} ${esc(d.email)}</a><button class="copy" type="button" data-copy="${esc(d.email)}" aria-label="${esc(t.ui.copy)}">${icon('copy', 'width="15" height="15"')}</button></span>` : '';
    detail.hidden = false;
    detail.innerHTML = `<button type="button" class="map__close" data-map-close aria-label="${esc(t.ui.close)}">${icon('close', 'width="18" height="18"')}</button><span class="kind">${esc(e.kind === 'rep' ? M.legendRep + ', ' + e.sub : t.lbl.locType[e.type])}</span><h3>${esc(e.kind === 'rep' ? d.company : e.name)}</h3>${e.kind === 'loc' ? `<p class="small">${esc(d.company)}</p>` : ''}<p class="addr">${addr.map(esc).join('<br>')}</p><div class="lines">${tel}${mail}<a href="https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}" target="_blank" rel="noopener">${icon('route', 'width="16" height="16"')} ${esc(t.ui.route)}</a></div>`;
    renderList();
    apply();
    if (fromList || st.k < 3) animateTo(Math.max(st.k, e.kind === 'rep' ? 5 : 4), e.x, e.y);
    const btn = listEl.querySelector(`[data-entry="${e.id}"]`);
    if (!fromList) btn?.scrollIntoView({ block: 'nearest' });
  }
  listEl.addEventListener('click', (ev) => { const b = ev.target.closest('[data-entry]'); if (b) { const e = entries.find((x) => x.id === b.dataset.entry); if (e) select(e, true); detail.scrollIntoView({ block: 'nearest' }); } });
  filter?.addEventListener('input', debounce(renderList, 120));
  $$('[data-map-layer]', box).forEach((b) => b.addEventListener('click', () => {
    layer = b.dataset.mapLayer;
    $$('[data-map-layer]', box).forEach((x) => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    renderList();
  }));
  detail.addEventListener('click', (ev) => {
    const c = ev.target.closest('[data-copy]'); if (c) copyText(c.dataset.copy, t);
    if (ev.target.closest('[data-map-close]')) { for (const x of entries) x.active = false; detail.hidden = true; renderList(); apply(); listEl.focus({ preventScroll: true }); }
  });
  apply();
  renderList();
  // Sprungziel (#hamburg o. ä.) auf der Standortseite
  box.__selectById = (id) => { const e = entries.find((x) => x.id === 'l-' + id); if (e) select(e, true); };
}
