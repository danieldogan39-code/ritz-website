// Logik des Produktkonfigurators ohne Oberfläche: sichtbare Optionen und Werte, abhängige Optionen,
// Bereinigen ungültiger Auswahl. Gemeinsam genutzt von Konfigurator, Spezifikations-Assistent und Projektmappe.
// Optionen vom Typ "checkbox"/"multiple" erlauben mehrere Werte (z. B. Messwicklung + da-dn-Wicklung):
// ihre Auswahl ist ein Array von Wert-IDs.

export function makeModel(data) {
  const opts = data.options || [];
  const byId = Object.fromEntries(opts.map((o) => [String(o.id), o]));
  const deps = data.deps || {};
  const order = (deps.order && deps.order.length ? deps.order.map(String) : opts.map((o) => String(o.id))).filter((id) => byId[id]);
  for (const o of opts) if (!order.includes(String(o.id))) order.push(String(o.id));
  const req = new Set([...(deps.req || []).map(String), ...opts.filter((o) => o.req).map((o) => String(o.id))]);
  const showO = deps.showO || {};
  const showV = deps.showV || {};
  return {
    opts, byId, order, req, free: deps.free || {}, showO, showV,
    childOpts: new Set(Object.values(showO).flat().map(String)),
    depVals: new Set(Object.values(showV).flat().map(String)),
  };
}

export const isText = (o) => !(o.v && o.v.length);
export const isMulti = (o) => !!o?.m; // gesetzt beim Aufbereiten (lib/roles.js markMulti)
// ausgewählte Werte einer Option als Liste
export const selVals = (sel, id) => { const v = sel[id]; return v === undefined || v === '' ? [] : Array.isArray(v) ? v.map(String) : [String(v)]; };
export const isSet = (sel, id) => selVals(sel, id).length > 0;

export function visibleOptions(m, sel) {
  const vis = new Set(m.order.filter((id) => !m.childOpts.has(id)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...vis]) {
      if (isText(m.byId[id])) continue;
      for (const v of selVals(sel, id)) {
        if (!m.showO[v]) continue;
        for (const c of m.showO[v].map(String)) if (!vis.has(c) && m.byId[c]) { vis.add(c); changed = true; }
      }
    }
  }
  return m.order.filter((id) => vis.has(id));
}

export function visibleValues(m, sel, id, visible = visibleOptions(m, sel)) {
  const o = m.byId[id];
  const all = (o.v || []).map((x) => String(x[0]));
  const freeList = m.free[id] ? m.free[id].map(String) : all.filter((v) => !m.depVals.has(v));
  const enabled = new Set(freeList);
  for (const oid of visible) {
    if (isText(m.byId[oid])) continue;
    for (const sv of selVals(sel, oid)) if (m.showV[sv]) for (const v of m.showV[sv].map(String)) enabled.add(v);
  }
  return all.filter((v) => enabled.has(v));
}

// Ungültige Auswahl entfernen (Option nicht mehr sichtbar oder Wert nicht mehr freigeschaltet)
export function prune(m, sel) {
  let changed = true;
  while (changed) {
    changed = false;
    const vis = visibleOptions(m, sel);
    for (const id of Object.keys(sel)) {
      if (!vis.includes(id)) { delete sel[id]; changed = true; continue; }
      const o = m.byId[id];
      if (isText(o)) continue;
      const ok = visibleValues(m, sel, id, vis);
      if (isMulti(o)) {
        const keep = selVals(sel, id).filter((v) => ok.includes(v));
        if (keep.length !== selVals(sel, id).length) { changed = true; if (keep.length) sel[id] = keep; else delete sel[id]; }
      } else if (!ok.includes(String(sel[id]))) { delete sel[id]; changed = true; }
    }
  }
  return sel;
}

// Auswählbar = Textfeld oder mindestens ein freigeschalteter Wert
export const activeOptions = (m, sel, vis = visibleOptions(m, sel)) => vis.filter((id) => isText(m.byId[id]) || visibleValues(m, sel, id, vis).length);

export function missingRequired(m, sel) {
  return activeOptions(m, sel).filter((id) => m.req.has(id) && !(isText(m.byId[id]) ? String(sel[id] || '').trim() : isSet(sel, id)));
}

export function selectionLines(m, sel) {
  const out = [];
  for (const id of visibleOptions(m, sel)) {
    const o = m.byId[id];
    if (isText(o)) { const v = String(sel[id] || '').trim(); if (v) out.push([o.t, v]); continue; }
    const labels = selVals(sel, id).map((v) => o.v.find((y) => String(y[0]) === v)?.[1]).filter(Boolean);
    if (labels.length) out.push([o.t, labels.join(', ')]);
  }
  return out;
}
