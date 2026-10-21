// Tests für den Spezifikations-Parser: node tools/test/spec.test.mjs
import fs from 'node:fs';
import { parseSpec, setProductCodes } from '../../src/lib/spec.js';
const idx = JSON.parse(fs.readFileSync(new URL('../../dist/data/index.json', import.meta.url))).products;
setProductCodes(idx);
let fail = 0, pass = 0;
const like = (got, exp, path = '') => {
  if (exp === undefined) return [];
  if (exp && typeof exp === 'object' && !Array.isArray(exp)) return Object.entries(exp).flatMap(([k, v]) => like(got?.[k], v, path + '.' + k));
  if (Array.isArray(exp)) {
    if (!Array.isArray(got)) return [`${path}: erwartet ${JSON.stringify(exp)}, bekommen ${JSON.stringify(got)}`];
    if (exp.length && typeof exp[0] === 'object') return exp.flatMap((e, i) => like(got[i], e, `${path}[${i}]`));
    return JSON.stringify([...got].sort()) === JSON.stringify([...exp].sort()) || exp.every((e) => got.includes(e)) ? [] : [`${path}: erwartet ${JSON.stringify(exp)}, bekommen ${JSON.stringify(got)}`];
  }
  return got === exp ? [] : [`${path}: erwartet ${JSON.stringify(exp)}, bekommen ${JSON.stringify(got)}`];
};
function t(name, text, exp) {
  const r = parseSpec(text);
  const errs = [];
  if (exp.n !== undefined && r.positions.length !== exp.n) errs.push(`Positionen: erwartet ${exp.n}, bekommen ${r.positions.length}`);
  (exp.p || []).forEach((pe, i) => { const pos = r.positions[i]; if (!pos) { errs.push(`Position ${i + 1} fehlt`); return; } errs.push(...like(pos, pe, `[${i}]`)); });
  if (errs.length) { fail++; console.log('✗', name, '\n   ' + errs.join('\n   ')); console.log('   →', JSON.stringify(r.positions.map((p) => ({ qty: p.qty, ref: p.ref, req: p.req })))); }
  else pass++;
}

t('DE Ausschreibung MS-Stromwandler', 'Pos. 1.1 Stromwandler für Innenraum, Stützerbauform nach DIN 42600-8, Um 24 kV, Isolationspegel 24/50/125 kV, Übersetzung 400/5/5 A, Kern 1: Kl. 0,5 FS5, 15 VA; Kern 2: 5P20, 10 VA, Ith = 25 kA/1 s, Idyn 62,5 kA, 50 Hz, IEC 61869-2, eichfähig. Menge: 3 Stück', {
  n: 1, p: [{ qty: 3, req: { kind: 'ct', um: 24, ipr: [400], isr: 5, coreCount: 2, cores: [{ c: '0.5', fs: 5, va: 15 }, { c: '5P', alf: 20, va: 10 }], ith: { ka: 25, t: 1 }, idyn: { ka: 62.5 }, freq: 50, std: ['IEC'], install: 'indoor', forms: ['support', 'narrow'], apps: ['verifiable'] } }] });
t('EN', '3 pcs current transformer, indoor, 12 kV, ratio 600/1 A, class 0.2S FS5 10VA, 50Hz, IEC 61869-2', { n: 1, p: [{ qty: 3, req: { kind: 'ct', um: 12, ipr: [600], isr: 1, cores: [{ c: '0.2S', fs: 5, va: 10 }], freq: 50, install: 'indoor' } }] });
t('FR', 'Transformateur de courant intérieur 24 kV, rapport 300/5 A, classe 0,5 FS5 15 VA + 5P20 10 VA, 50 Hz, quantité : 6', { n: 1, p: [{ qty: 6, req: { kind: 'ct', um: 24, ipr: [300], isr: 5, cores: [{ c: '0.5', fs: 5, va: 15 }, { c: '5P', alf: 20, va: 10 }], install: 'indoor' } }] });
t('HU', 'Áramváltó beltéri, 24 kV, 200/5 A, 0,5 FS5 10 VA, 5P20 15 VA, 50 Hz, 3 db', { n: 1, p: [{ qty: 3, req: { kind: 'ct', um: 24, ipr: [200], isr: 5, cores: [{ c: '0.5', fs: 5, va: 10 }, { c: '5P', alf: 20, va: 15 }], install: 'indoor' } }] });
t('ES', 'Transformador de corriente para interior, 36 kV, relación 1000/1 A, clase 0,2S 5 VA y 5P20 15 VA, 50 Hz, 3 uds.', { n: 1, p: [{ qty: 3, req: { kind: 'ct', um: 36, ipr: [1000], isr: 1, cores: [{ c: '0.2S', va: 5 }, { c: '5P', alf: 20, va: 15 }], install: 'indoor' } }] });
t('NS Aufsteckwandler', 'Niederspannungs-Aufsteckstromwandler 1500/5 A Kl. 0,5 10 VA für Schiene 60x10, eichfähig (MID), 12 Stk.', { n: 1, p: [{ qty: 12, req: { kind: 'ct', um: 0.72, ipr: [1500], isr: 5, cores: [{ c: '0.5', va: 10 }], apps: ['verifiable'], size: { bar: [60, 10] } } }] });
t('Spannungswandler DE', 'Spannungswandler einpolig, Innenraum, 20000/√3 / 100/√3 / 100/3 V, 0,5/3P 30 VA, Spannungsfaktor 1,9 Un / 8 h, Um 24 kV, 50 Hz, 3 Stück', { n: 1, p: [{ qty: 3, req: { kind: 'vt', um: 24, upr: { v: 20000, d: 'r3' }, usr: { v: 100, d: 'r3' }, usrEn: { v: 100, d: '3' }, vf: { f: 1.9, t: '8h' }, forms: ['single-pole'] } }] });
t('Spannungswandler FR', 'Transformateur de tension 20 kV/√3 / 100 V/√3, classe 0,5 30 VA, 1,9 Un 8h, intérieur', { n: 1, p: [{ req: { kind: 'vt', upr: { v: 20000, d: 'r3' }, usr: { v: 100, d: 'r3' }, cores: [{ c: '0.5', va: 30 }], vf: { f: 1.9 }, install: 'indoor' } }] });
t('Klappwandler', 'Klappwandler zum Nachrüsten, 400/1 A, Klasse 1, 2,5 VA, Innendurchmesser 42 mm', { n: 1, p: [{ req: { kind: 'ct', ipr: [400], isr: 1, cores: [{ c: '1', va: 2.5 }], forms: ['split-core'], size: { d: 42 } } }] });
t('Kabelumbau Erdschluss', 'Kabelumbau-Stromwandler für Erdschlusserfassung 60/1 A, 5P10 2,5 VA, Innendurchmesser 120 mm', { n: 1, p: [{ req: { kind: 'ct', ipr: [60], isr: 1, cores: [{ c: '5P', alf: 10, va: 2.5 }], apps: ['earth-fault'], forms: ['window'], size: { d: 120 } } }] });
t('IEEE', 'CT 1200:5 A, C200, 0.3B-0.5, 60 Hz, IEEE C57.13, outdoor', { n: 1, p: [{ req: { kind: 'ct', ipr: [1200], isr: 5, freq: 60, std: ['IEEE'], install: 'outdoor', cores: [{ c: 'C200' }, { c: '0.3', va: 12.5 }] } }] });
t('20-kV-Netz, 2x200', 'Stromwandler für 20-kV-Netz, Übersetzung 2x200/1/1 A, Klasse 0,2S FS5 5 VA, 5P20 10 VA', { n: 1, p: [{ req: { um: 24, ipr: [200, 400], isr: 1, coreCount: 2, cores: [{ c: '0.2S', fs: 5, va: 5 }, { c: '5P', alf: 20, va: 10 }] } }] });
t('Excel-Tabelle', 'Pos\tMenge\tÜbersetzung\tKlasse\tBürde\n1\t3\t400/5\t0,5 FS5\t15 VA\n2\t6\t200/5\t0,2S FS5\t10 VA', { n: 2, p: [{ qty: 3, req: { ipr: [400], isr: 5, cores: [{ c: '0.5', fs: 5, va: 15 }] } }, { qty: 6, req: { ipr: [200], cores: [{ c: '0.2S', fs: 5, va: 10 }] } }] });
t('Liste mit Vorspann', 'Allgemein: Innenraum, 24 kV, 50 Hz, IEC 61869.\n1. Stromwandler 400/5 A 0,5 FS5 15 VA, 3 Stück\n2. Stromwandler 200/5/5 A 0,5 FS5 10 VA / 5P20 10 VA, 6 Stück\n3. Spannungswandler 20000/√3/100/√3 V 0,5 30 VA, 3 Stück', {
  n: 3, p: [{ ref: '1', qty: 3, req: { kind: 'ct', um: 24, freq: 50, install: 'indoor', ipr: [400] } }, { ref: '2', qty: 6, req: { ipr: [200], coreCount: 2, cores: [{ c: '0.5', fs: 5, va: 10 }, { c: '5P', alf: 20, va: 10 }] } }, { ref: '3', qty: 3, req: { kind: 'vt', upr: { v: 20000 }, usr: { v: 100 }, um: 24 } }] });
t('Typcode', 'Wir benötigen 10 Stück GSO 1910 1000/5 A Kl. 0,5 5 VA', { n: 1, p: [{ qty: 10, req: { code: 'gso-1910', ipr: [1000], cores: [{ c: '0.5', va: 5 }] } }] });
t('Ith Vielfaches', 'Stromwandler 300/5 A, 0,5 FS5 5 VA, Ith 100 x In', { n: 1, p: [{ req: { ith: { mult: 100 } } }] });
t('Ik', 'Stromwandler 600/1 A 5P20 15 VA, Ik\'\' = 20 kA', { n: 1, p: [{ req: { ith: { ka: 20 } } }] });
t('Bahn', 'Bahnstromwandler 16,7 Hz 300/1 A 5P10 15 VA', { n: 1, p: [{ req: { freq: 16.7, apps: ['rail'], cores: [{ c: '5P', alf: 10, va: 15 }] } }] });
t('Kein Wandlertext', 'Liefertermin KW 45, Ansprechpartner Herr Müller, Telefon 040 123456', { n: 0 });
t('Klasse 1 mit Schlüsselwort', 'Stromwandler 100/5 A Kl. 1 5 VA', { n: 1, p: [{ req: { cores: [{ c: '1', va: 5 }] } }] });
t('Tausenderpunkt', 'Stromwandler 1.500/5 A Klasse 0,5S 10 VA', { n: 1, p: [{ req: { ipr: [1500], cores: [{ c: '0.5S', va: 10 }] } }] });
t('Um 0,72', 'Stromwandler Um = 0,72 kV, 250/5 A, 0,5 5 VA', { n: 1, p: [{ req: { um: 0.72, ipr: [250] } }] });
t('Netzspannung 400 V', 'Stromwandler für Netzspannung 400 V, 800/5 A, Kl. 0,5 10 VA', { n: 1, p: [{ req: { um: 0.72, ipr: [800] } }] });
t('VT kV/V', 'Spannungswandler 22 kV / 110 V, Klasse 0,5, 50 VA', { n: 1, p: [{ req: { kind: 'vt', upr: { v: 22000 }, usr: { v: 110 } } }] });
t('Kombiwandler', 'Kombiwandler 20000/√3/100/√3 V und 100/5 A, Um 24 kV', { n: 1, p: [{ req: { kind: 'combined', ipr: [100], upr: { v: 20000 } } }] });
t('ES Spannungswandler', 'Transformador de tensión 22000:√3/110:√3 V clase 0,5 25 VA', { n: 1, p: [{ req: { kind: 'vt', upr: { v: 22000, d: 'r3' }, usr: { v: 110, d: 'r3' }, cores: [{ c: '0.5', va: 25 }] } }] });
t('Zwei Absätze', 'Stromwandler 24 kV 400/5 A 0,5 FS5 10 VA\n\nSpannungswandler 24 kV 20000/√3/100/√3 V 0,5 30 VA', { n: 2, p: [{ req: { kind: 'ct' } }, { req: { kind: 'vt' } }] });
t('Zeilenweise', '3x Stromwandler 400/5 A 0,5 FS5 10 VA\n6x Stromwandler 600/5 A 0,2S FS5 5 VA', { n: 2, p: [{ qty: 3, req: { ipr: [400] } }, { qty: 6, req: { ipr: [600] } }] });
t('Primärstrom-Stichwort', 'Primärstrom 750 A, Sekundärstrom 1 A, Genauigkeitsklasse 0,5 FS5, Bürde 5 VA', { n: 1, p: [{ req: { ipr: [750], isr: 1, cores: [{ c: '0.5', fs: 5, va: 5 }] } }] });
t('Klassen dann VA', 'Stromwandler 400/5/5 A, Klasse 0,5 FS5 / 5P20, Leistung 15 / 10 VA', { n: 1, p: [{ req: { cores: [{ c: '0.5', fs: 5, va: 15 }, { c: '5P', alf: 20, va: 10 }] } }] });
t('HU VT', 'Feszültségváltó beltéri 22000/√3 / 100/√3 V, 0,5 osztály 30 VA, 3P 50 VA', { n: 1, p: [{ req: { kind: 'vt', cores: [{ c: '0.5', va: 30 }, { c: '3P', va: 50 }], install: 'indoor' } }] });
t('FS kleiner gleich', 'Stromwandler 200/5 A Kl. 0,5 FS ≤ 5, 10 VA', { n: 1, p: [{ req: { cores: [{ c: '0.5', fs: 5, va: 10 }] } }] });
t('E-Mail mit zwei Anforderungen', 'Hello RITZ team,\nplease quote 12 pcs low voltage current transformers for busbar 60x10 mm, ratio 1500/5 A, class 0.5 10 VA, MID verifiable, and 3 pcs split-core CTs 400/1 A class 1 2.5 VA, inner diameter 42 mm for retrofitting.\nBest regards', {
  n: 2, p: [{ qty: 12, req: { um: 0.72, ipr: [1500], isr: 5, apps: ['verifiable'], size: { bar: [60, 10] } } }, { qty: 3, req: { ipr: [400], isr: 1, forms: ['split-core'], size: { d: 42 } } }] });
t('Satz mit Strom- und Spannungswandler', 'Für unser 20-kV-Netz benötigen wir 3 Stück Stromwandler 400/5 A 0,5 FS5 15 VA und 3 Stück Spannungswandler 20000/√3 / 100/√3 V 0,5 30 VA.', {
  n: 2, p: [{ qty: 3, req: { kind: 'ct', um: 24, ipr: [400] } }, { qty: 3, req: { kind: 'vt', um: 24, upr: { v: 20000, d: 'r3' } } }] });
t('Um aus Primärspannung', 'Spannungswandler 11000/√3 / 110/√3 V Klasse 0,5 25 VA', { n: 1, p: [{ req: { kind: 'vt', um: 12 } }] });
t('Tabelle mit Kennzeichnung', 'Pos\tMenge\tTyp\tÜbersetzung\tKlasse\tBürde\tUm\nA1\t3\tStromwandler\t600/1\t0,2S FS5\t10 VA\t12 kV\nA2\t3\tStromwandler\t600/1\t5P20\t15 VA\t12 kV', { n: 2, p: [{ ref: 'A1', qty: 3, req: { um: 12, ipr: [600] } }, { ref: 'A2', req: { cores: [{ c: '5P', alf: 20, va: 15 }] } }] });
t('Mengenzeile ist keine Positionsnummer', '3 Stück Stromwandler 400/5 A 0,5 FS5 10 VA\n6 Stück Stromwandler 600/5 A 0,2S FS5 5 VA', { n: 2, p: [{ qty: 3, ref: null, req: { ipr: [400] } }, { qty: 6, ref: null, req: { ipr: [600] } }] });
t('Abkürzungen trennen nicht', 'Pos. 4 Stromwandler Kl. 0,5 FS5 10 VA, Übers. 300/5 A, ca. 12 kV', { n: 1, p: [{ req: { ipr: [300], cores: [{ c: '0.5', fs: 5, va: 10 }], um: 12 } }] });
t('Word mit Tabelle und Begleittext', 'Anfrage Umspannwerk Süd – Innenraum, 50 Hz, IEC 61869\nBitte bieten Sie folgende Wandler an:\nPos\tMenge\tBeschreibung\n1\t3\tStromwandler 24 kV 300/5/5 A, 0,5 FS5 15 VA, 5P20 10 VA\n2\t3\tSpannungswandler einpolig 20000/√3 / 100/√3 / 100/3 V, 0,5 30 VA\nMit freundlichen Grüßen', {
  n: 2, p: [{ ref: '1', qty: 3, req: { install: 'indoor', freq: 50, um: 24, ipr: [300] } }, { ref: '2', qty: 3, req: { kind: 'vt', install: 'indoor' } }] });
console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
