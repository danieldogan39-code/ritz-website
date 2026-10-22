// Dokumente je Sprachfassung – rein, ohne Abhängigkeiten (Build in Node und Browser).
//
// Felder der Hauptseiten-Dokumente (tools/prepare.py → src/data/build/docs.json):
//   vis  Sprachfassungen der alten Website, die das Dokument verlinkt haben (beliebige Seite, sortiert), z. B. ['de', 'es', 'fr']
//   tl   Titel je Sprachfassung (nur für Sprachen in vis), z. B. { de: 'Datenblatt GSW 12/0', fr: 'Fiche de données GSW 12/0' }
//   alt  Gegenstück je Sprache: das Dokument, das die anderssprachige Fassung derselben Seite an derselben Stelle zeigte,
//        z. B. { en: '<id von En_GSW.pdf>', hu: '<id von En_GSW.pdf>' }
//   areaLangs  je Bereich die Sprachen, deren Bereichsseite das Dokument verlinkte, z. B. { mittelspannung: ['es', 'hu'] }
//   same       nur bei byte-gleichen Kopien: ID der Hauptkopie
// Produktfinder-Dokumente haben diese Felder nicht und gelten in allen Sprachen als sichtbar.
// Kompakte Dokumentobjekte (t = Titel, f = Datei) werden ebenfalls verstanden, sofern vis/tl/alt gleich heißen.

/** Ist das Dokument in der Sprachfassung `lang` sichtbar? Ohne vis-Angabe: ja. */
export function docVisible(d, lang) {
  if (!d) return false;
  return !Array.isArray(d.vis) || d.vis.includes(lang);
}

const byId = (docsById, id) => (!id || !docsById ? null : typeof docsById.get === 'function' ? docsById.get(id) : docsById[id]);

/**
 * Dokumentliste für eine Sprachfassung: nicht sichtbare Dokumente durch ihr Gegenstück (alt[lang]) ersetzen,
 * Hauptseiten-Dokumente ohne Gegenstück weglassen, Produktfinder-Dokumente behalten, Dubletten entfernen, Reihenfolge erhalten.
 * `docs` darf Dokumente oder Dokument-IDs enthalten; `docsById` ist ein Objekt oder eine Map (ID → Dokument).
 */
export function docsForLang(docs, lang, docsById) {
  const out = [];
  const seen = new Set();
  for (const x of docs || []) {
    let d = typeof x === 'string' ? byId(docsById, x) : x;
    if (!d) continue;
    if (!docVisible(d, lang)) {
      const a = byId(docsById, d.alt && d.alt[lang]);
      if (!a || !docVisible(a, lang)) continue;
      d = a;
    }
    const key = d.id || d;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
}

/**
 * Dokumente eines Produktbereichs für eine Sprachfassung (`docs` = alle Dokumente oder eine Vorauswahl):
 * wie docsForLang über die Dokumente mit `area` in areas, aber ohne Dokumente, die in dieser Sprache zwar sichtbar sind,
 * deren Bereichsseite in dieser Sprache sie jedoch nicht verlinkt hat (areaLangs: Bereich → Sprachen der Bereichsseiten).
 * Beispiel: ein englischer Katalog, den die ungarische Bereichsseite und die englischen News-Downloads verlinkten,
 * erscheint auf der ungarischen Bereichsseite, nicht aber auf der englischen. Bereiche aus Produktzuordnungen gelten überall.
 */
export function docsForArea(docs, area, lang, docsById) {
  const cand = [];
  for (const x of docs || []) {
    const d = typeof x === 'string' ? byId(docsById, x) : x;
    if (!d || !(d.areas || d.a || []).includes(area)) continue;
    const langs = d.areaLangs && d.areaLangs[area];
    if (langs && docVisible(d, lang) && !langs.includes(lang)) continue;
    cand.push(d);
  }
  return docsForLang(cand, lang, docsById);
}

/** Byte-gleiche Kopien (same = ID der Hauptkopie) nur einmal zeigen; das erste Vorkommen bleibt, Reihenfolge bleibt erhalten. */
export function dedupeCopies(docs) {
  const seen = new Set();
  return (docs || []).filter((d) => {
    const k = (d && (d.same || d.id)) || d;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Titel eines Dokuments für die Sprachfassung `lang` (dl = Datensprache de/en als Rückfall). */
export function docTitleFor(d, lang, dl) {
  if (!d) return '';
  const tl = d.tl || {};
  const t = d.title || d.t || {};
  return tl[lang] || t[lang] || t[dl] || t.de || t.en || d.file || d.f || '';
}
