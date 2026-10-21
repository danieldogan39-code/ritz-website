// Spezifikations-Parser: liest technische Anforderungen an Messwandler aus freiem Text
// (Ausschreibung, E-Mail, Typenschild, aus Excel kopierte Tabellen, PDF-Text) in DE/EN/FR/HU/ES.
// Ergebnis: Positionen mit Menge, Kennzeichnung und Anforderungen (Um, Übersetzung, Kerne mit Klasse/FS/ALF/VA,
// Ith, Frequenz, Norm, Einbau, Bauform, Anwendung, Spannungswandler-Daten) samt Fundstellen für die Markierung.
// Läuft im Browser und in Node (Tests).

import { UM_STEPS } from './util.js';

// ---------- Hilfen ----------
const NUM = String.raw`\d{1,3}(?:[.   ]\d{3})+(?![\d,]|\.\d)|\d+(?:[.,]\d+)?`;
export function toNum(s) {
  if (s == null) return null;
  const t = String(s).trim();
  if (/^\d{1,3}(?:[.   ]\d{3})+$/.test(t)) return parseFloat(t.replace(/[.   ]/g, ''));
  return parseFloat(t.replace(',', '.'));
}
// Netzspannung → Bemessungs-Isolationsniveau (höchste Spannung für Betriebsmittel)
const SYS_UM = { 0.23: 0.72, 0.4: 0.72, 0.5: 0.72, 0.69: 0.72, 1: 1.2, 3: 3.6, 3.3: 3.6, 6: 7.2, 6.6: 7.2, 10: 12, 11: 12, 13.8: 17.5, 15: 17.5, 20: 24, 22: 24, 25: 36, 30: 36, 33: 36, 35: 40.5, 45: 52, 60: 72.5, 66: 72.5, 69: 72.5, 110: 123, 132: 145, 150: 170, 220: 245, 380: 420, 400: 420 };
export const umForSystem = (kv) => SYS_UM[kv] ?? UM_STEPS.find((s) => s >= kv - 1e-9) ?? null;
const umStep = (kv) => (UM_STEPS.some((s) => Math.abs(s - kv) < 1e-6) ? kv : null);

// Länge erhaltende Normalisierung (Fundstellen bleiben gültig)
function normalize(s) {
  return s.replace(/[   \t]/g, ' ').replace(/[–—−]/g, '-').replace(/[’‘]/g, "'").replace(/[×]/g, 'x').replace(/[≙]/g, '=');
}

// Wortgrenzen auch neben Umlauten und Akzenten: JavaScripts \b kennt nur ASCII-Buchstaben, sonst stünde
// in „áttétel“ ein „tt“ (Spannungswandler) und in „mégis“ ein „gis“ (gasisoliert) für sich.
const WCH = String.raw`[\p{L}\p{N}_]`;
const UB = String.raw`(?:(?<=${WCH})(?!${WCH})|(?<!${WCH})(?=${WCH}))`;
const U = (rx) => new RegExp(rx.source.replaceAll('\\b', UB), rx.flags.includes('u') ? rx.flags : rx.flags + 'u');
const uAll = (o) => Object.fromEntries(Object.entries(o).map(([k, rx]) => [k, U(rx)]));

// ---------- Wortlisten (5 Sprachen) ----------
const W = uAll({
  ct: /stromwandler|strom-?wandler|current[- ]transformers?|\bc\.?t\.?s?\b|transformateurs? de courant|\btcs?\b|áramváltó|aramvalto|transformador(?:es)? de (?:corriente|intensidad)|\bt\.?i\.?\b|ringkern|kabelumbau|summenstromwandler|aufsteckstromwandler|durchsteckwandler|stromsensor|current sensor|rogowski/i,
  vt: /spannungswandler|spannungs-?wandler|voltage[- ]transformers?|potential[- ]transformers?|\bv\.?t\.?s?\b|\bp\.?t\.?s?\b|transformateurs? de tension|feszültségváltó|feszultsegvalto|transformador(?:es)? de tensi[oó]n|\btt\b|spannungssensor|voltage sensor|capteur de tension/i,
  combined: /kombiwandler|kombi-?wandler|combined (?:instrument )?transformer|transformateurs? combin[ée]s?|kombinált mérőváltó|transformador(?:es)? combinados?|combi[- ]sensor/i,
  sensor: /\bsensor(?:en)?\b|\blpit\b|rogowski|capteurs?\b|érzékelő|\bsensores?\b/i,
  indoor: /innenraum|innenaufstellung|\binnen\b(?!\s*-?\s*(?:ø|durchmesser))|indoor|(?<!diam[eè]tre\s)int[ée]rieur|beltéri|bels[őo]téri|(?<!di[aá]metro\s)\binterior\b|para interior/i,
  outdoor: /freiluft|au(?:ß|ss)enaufstellung|\bau(?:ß|ss)en\b|outdoor|ext[ée]rieur|kültéri|kulteri|\bexterior\b|intemperie|para exterior/i,
  verifiable: /eichf[äa]hig|beglaubigungsf[äa]hig|geeicht|\bmid\b|\bptb\b|verrechnung|abrechnung|revenue|billing|fiscal|tarif|comptage|facturaci[oó]n|hiteles[ií]t|elszámol|konformit[äa]tsbewert/i,
  protection: /\bschutz(?:kern|zwecke|wandler|ger[äa]t)?\b|protection|protecci[oó]n|v[ée]delm|relais|relay|rel[ée]s?\b/i,
  metering: /mess(?:kern|zwecke|ung)|metering|measuring|mesure|comptage|mérés|medici[oó]n|medida/i,
  earth: /erdschluss|earth[- ]fault|ground[- ]fault|d[ée]faut (?:à la )?terre|földzárlat|falta a tierra|kabelumbau|core balance|nullstrom|summenstrom/i,
  rail: /\bbahn|railway|ferroviaire|vasút|ferrocarril|16[.,]7\s*hz|16\s*2\/3/i,
  generator: /generator|générateur|generátor|generador/i,
  pq: /power quality|netzqualit[äa]t|oberschwingung|harmonic|qualit[ée] (?:du|de l'?)? ?(?:réseau|énergie)|harmonik|calidad de (?:la )?(?:red|energ[ií]a)|armónic/i,
  dc: /gleichstrom|\bdc\b|courant continu|egyenáram|corriente continua/i,
  touch: /berührungssicher|touch[- ]proof|finger[- ]safe/i,
  lab: /\blabor|laborator|prüffeld|test field|étalon/i,
  ex: /\bex-?schutz|\batex\b|explosion/i,
  aux: /hilfsspannung|eigenbedarf|auxiliary supply|alimentation auxiliaire|segédfeszültség|tensi[oó]n auxiliar/i,
});
const FORMS = [
  ['split-core', /klappwandler|klapp-?stromwandler|aufklappbar|teilbar|split[- ]?core|ouvrant|à noyau ouvrant|bontható|n[uú]cleo (?:partido|abierto)|abatible|nachr[üu]st/i],
  ['window', /kabelumbau|ringkern|durchsteck|window[- ]type|toro[iï]da?l?|ring[- ]type|core balance|à tore|gyűrűs|kábelátfűz|toroidal|tipo ventana/i],
  ['support', /stützer|st[üu]tzerwandler|support[- ]type|post[- ]type|\bsupport\b|támszigetelő|tipo soporte/i],
  ['bushing', /durchführung|bushing|travers[ée]e|átvezető|pasatapas|aufsteck|aufsteckbar|schienen-?(?:strom)?wandler|für (?:strom)?schienen?\b|busbar[- ]type|for (?:a )?busbars?|(?:sur|pour) (?:(?:le |un )?jeu de )?barres?\b|para (?:juego de )?barras?\b|gyűjtősínre|gyűjtősínes/i],
  ['block', /blockwandler|block[- ]type|\bbloc\b|blokk|tipo bloque/i],
  ['single-pole', /einpolig|single[- ]pole|unipolaire|egypólusú|unipolar/i],
  ['two-pole', /zweipolig|double[- ]pole|two[- ]pole|bipolaire|kétpólusú|bipolar/i],
  ['metal-clad', /metallgekapselt|gasisoliert|\bgis\b|metal[- ]clad|blind[ée]|fémtokozott|blindad/i],
  ['narrow', /schmalbauform|schmale bauform|narrow[- ]type|din\s*42\s*600|étroit/i],
  ['summation', /summen(?:strom)?wandler|summation/i],
  ['interposing', /zwischen(?:strom)?wandler|interposing|anpassungswandler/i],
  ['wound', /gewickelt|wound[- ]primary|primärwicklung|à primaire bobiné/i],
  ['three-phase', /dreiphasig|drei-?phasig|three[- ]phase|triphas[ée]|háromfázisú|trif[áa]sico/i],
  ['tube-bar', /rohrstab|tube[- ]bar/i],
].map(([k, rx]) => [k, U(rx)]);

// ---------- Teilaufgaben ----------
function addMark(marks, s, e, k) { if (e > s) marks.push({ s, e, k }); }

function findKind(s) {
  if (W.combined.test(s)) return 'combined';
  const ct = W.ct.test(s), vt = W.vt.test(s);
  if (ct && !vt) return W.sensor.test(s) && /rogowski|sensor|capteur|érzékelő/i.test(s) ? 'sensor-ct' : 'ct';
  if (vt && !ct) return W.sensor.test(s) && /sensor|capteur|érzékelő/i.test(s) ? 'sensor-vt' : 'vt';
  if (ct && vt) return 'combined';
  return null;
}

// Übersetzung Stromwandler: 400/5 A, 2x200/1 A, 200-400/5/5 A, 1200:5, 400/1/1/1A
const RX_RATIO = new RegExp(String.raw`(?<![\w.,/])((?:\d\s*x\s*)?(?:${NUM})(?:\s*-\s*(?:${NUM}))*)\s*(?:a\s*)?[/:]\s*(1|5|2|0[.,]5)((?:\s*(?:a\s*)?[/:]\s*(?:1|5|2))*)\s*(a(?:mp)?\b)?(?!\s*(?:k?v\b|/\s*√|\d))`, 'giu');
function findRatios(s, marks) {
  const out = [];
  RX_RATIO.lastIndex = 0;
  let m;
  while ((m = RX_RATIO.exec(s))) {
    const primRaw = m[1].replace(/\s/g, '');
    const sec = toNum(m[2]);
    const more = (m[3].match(/[/:]\s*(?:a\s*)?(1|5|2)/gi) || []).length;
    let prims = [];
    const xm = primRaw.match(/^(\d)x(.+)$/i);
    if (xm) { const base = toNum(xm[2]); prims = [base, base * Number(xm[1])]; }
    else prims = primRaw.split('-').map(toNum).filter((x) => x > 0);
    if (!prims.length || prims.some((p) => !(p > sec)) || prims[0] < 1) continue;
    // ohne "A" nur mit Stromwandler-Bezug oder typischem Sekundärstrom
    const ctx = s.slice(Math.max(0, m.index - 60), m.index + m[0].length + 20);
    if (!m[4] && !(W.ct.test(ctx) || /übersetzung|ratio|rapport|áttétel|relaci[oó]n|prim[äa]r|\bi1n|\bipn|strom|current|courant|áram|corriente/i.test(ctx)) && !(sec === 1 || sec === 5)) continue;
    out.push({ prims, sec, cores: 1 + more, s: m.index, e: m.index + m[0].length });
    addMark(marks, m.index, m.index + m[0].length, 'ratio');
  }
  return out;
}

// Spannungswerte für Spannungswandler: 20000/√3 / 100/√3 / 100/3 V, 20 kV/√3 : 110 V/√3
const VTOK = String.raw`(${NUM})\s*(k?v)?\s*((?:[/:]\s*(?:√\s*3|v3|sqrt\s*3|1[.,]73|wurzel\s*3))|(?:/\s*3(?![\d.,])))?`;
const RX_VT = new RegExp(`(?<![\\w.,])${VTOK}\\s*(?:[/:]|//)\\s*${VTOK}(?:\\s*(?:[/:]|//)\\s*${VTOK})?(?=\\s|$|[,;)])`, 'giu');
function vtVal(n, unit, div) {
  if (n == null) return null;
  let v = toNum(n);
  if (/^kv$/i.test(unit || '')) v *= 1000;
  const d = !div ? null : /√|v3|sqrt|1[.,]73|wurzel/i.test(div) ? 'r3' : '3';
  return { v, d, unit: unit ? unit.toUpperCase() : null };
}
// alle gültigen Spannungsverhältnisse (Primärspannung ≥ 100 V, Sekundärseite kleiner)
function vtAll(s) {
  const out = [];
  RX_VT.lastIndex = 0;
  let m;
  while ((m = RX_VT.exec(s))) {
    const a = vtVal(m[1], m[2], m[3]), b = vtVal(m[4], m[5], m[6]), c = m[7] ? vtVal(m[7], m[8], m[9]) : null;
    const anyV = [m[2], m[5], m[8]].some((u) => u);
    const anyRoot = [m[3], m[6], m[9]].some((x) => x && /√|v3|sqrt|1[.,]73|wurzel/i.test(x));
    if (!anyV && !anyRoot) continue;
    // Primärspannung in V (Einheit der Sekundärseite gilt mit, wenn vorn keine steht)
    if (!m[2] && m[5] && /^kv$/i.test(m[5])) a.v *= 1000;
    if (!(a.v >= 100 && b.v > 0 && b.v < a.v)) continue;
    if (/^v$/i.test(m[5] || '') && b.v > 1000) continue;
    out.push({ upr: a, usr: b, usr2: c, s: m.index, e: m.index + m[0].length });
  }
  return out;
}
function findVt(s, marks) {
  const all = vtAll(s);
  if (all.length) { const v = all[0]; addMark(marks, v.s, v.e, 'vt'); return { upr: v.upr, usr: v.usr, usr2: v.usr2 }; }
  // einzelne Sekundärspannung "100/√3 V" bzw. "110 V/√3"
  const one = /(?<![\w.,/])(100|110|120|150|200|220|230)\s*(?:v\s*)?(?:[/:]\s*(√\s*3|v3|3))\s*v?\b/i.exec(s);
  if (one && /sekund|secondary|secondaire|szekunder|secundari/i.test(s.slice(Math.max(0, one.index - 40), one.index))) {
    addMark(marks, one.index, one.index + one[0].length, 'vt');
    return { usr: { v: Number(one[1]), d: /√|v3/i.test(one[2]) ? 'r3' : '3' } };
  }
  return null;
}

// Isolationsniveau Um, Netzspannung, Isolationspegel
function findUm(s, marks) {
  let m = /\bU\s*m\s*[=:]?\s*(\d+(?:[.,]\d+)?)\s*kV/i.exec(s);
  if (m) { addMark(marks, m.index, m.index + m[0].length, 'um'); return { um: umStep(toNum(m[1])) || toNum(m[1]), how: 'um' }; }
  m = /(?<![\w.,/])(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)\s*kV/i.exec(s);
  if (m && toNum(m[2]) > toNum(m[1]) && toNum(m[3]) > toNum(m[2])) { addMark(marks, m.index, m.index + m[0].length, 'um'); return { um: toNum(m[1]), how: 'level', level: `${m[1]}/${m[2]}/${m[3]} kV` }; }
  m = /(isolationsniveau|isolationspegel|spannungsreihe|bemessungsspannung|h[öo]chste spannung f[üu]r betriebsmittel|highest (?:system )?voltage(?: for equipment)?|insulation level|rated voltage|tension (?:assign[ée]e|la plus [ée]lev[ée]e)|niveau d'isolement|szigetelési szint|legnagyobb (?:üzemi )?feszültség|tensi[oó]n m[aá]s elevada|nivel de aislamiento|tensi[oó]n asignada)\s*(?:u\s*m)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*kV/i.exec(s);
  if (m) { addMark(marks, m.index, m.index + m[0].length, 'um'); const v = toNum(m[2]); return { um: umStep(v) || umForSystem(v), how: 'kw' }; }
  m = /(netzspannung|betriebsspannung|nennspannung(?: des netzes)?|system voltage|network voltage|nominal voltage|service voltage|tension (?:du r[ée]seau|nominale|de service)|hálózati feszültség|névleges feszültség|üzemi feszültség|tensi[oó]n (?:de (?:la )?red|nominal|de servicio))\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(kV|V)\b/i.exec(s);
  if (m) { addMark(marks, m.index, m.index + m[0].length, 'um'); const v = toNum(m[2]) / (/^v$/i.test(m[3]) ? 1000 : 1); return { um: umForSystem(v), how: 'system', sys: v }; }
  m = /\breihe\s*(\d+)\b/i.exec(s);
  if (m) { addMark(marks, m.index, m.index + m[0].length, 'um'); const v = toNum(m[1]); return { um: umStep(v) || umForSystem(v), how: 'reihe' }; }
  // freies "24 kV" (nicht Teil eines Spannungsverhältnisses)
  const rx = /(?<![\w.,/])(\d+(?:[.,]\d+)?)\s*-?\s*kV\b(?!\s*[/:]\s*(?:√|\d)|\s*\/\s*√)/gi;
  while ((m = rx.exec(s))) {
    const before = s.slice(Math.max(0, m.index - 3), m.index);
    if (/[/:]\s*$/.test(before)) continue;
    const v = toNum(m[1]);
    if (!(v > 0 && v <= 800)) continue;
    addMark(marks, m.index, m.index + m[0].length, 'um');
    return { um: umStep(v) || umForSystem(v), how: umStep(v) ? 'kv' : 'system', ...(umStep(v) ? {} : { sys: v }) };
  }
  if (/niederspannung|low[- ]voltage|basse tension|kisfeszültség|baja tensi[oó]n|\b(?:400|230|690)\s*V\s*(?:netz|network|r[ée]seau|hálózat|red)/i.test(s)) return { um: 0.72, how: 'lv' };
  return null;
}

// Klassen, FS/ALF, Bürden → Kerne
function findCores(s, marks) {
  const toks = [];
  const push = (t, m, k) => { toks.push({ ...t, s: m.index, e: m.index + m[0].length }); addMark(marks, m.index, m.index + m[0].length, k); };
  let m;
  const rxP = /(?<![\w.,])(5|10)\s*P\s*R?\s*(\d{1,2})?(?![\w]|[.,]\d)/gi;
  while ((m = rxP.exec(s))) push({ t: 'cls', c: m[1] + 'P', ...(m[2] ? { alf: Number(m[2]) } : {}) }, m, 'cls');
  // Doppelklasse bei Spannungswandlern: 0,5/3P
  const rxDual = /(?<![\w.,])(0[.,][125]|1|3)\s*\/\s*(3|6)\s*P(?![\w])/gi;
  while ((m = rxDual.exec(s))) push({ t: 'cls', c: m[1].replace(',', '.'), p: m[2] + 'P' }, m, 'cls');
  const rxTP = /(?<![\w])(TP[XYZ]|PXR|PX|PR)(?![\w])/g;
  while ((m = rxTP.exec(s))) push({ t: 'cls', c: m[1].toUpperCase() }, m, 'cls');
  const rxVP = /(?<![\w.,\d])(3|6)\s*P(?![\w])/gi;
  while ((m = rxVP.exec(s))) if (!toks.some((x) => x.s <= m.index && x.e > m.index)) push({ t: 'cls', c: m[1] + 'P' }, m, 'cls');
  // IEEE: C200, 0.3B-0.5
  const rxC = /(?<![\w.])C\s?(100|200|400|800)(?![\w.])/g;
  while ((m = rxC.exec(s))) push({ t: 'cls', c: 'C' + m[1], ieee: 1 }, m, 'cls');
  const rxB = /(?<![\w.,])(0[.,][36]|1[.,]2)\s*B\s*-?\s*(0[.,]\d|1(?:[.,]0)?|2(?:[.,]0)?|4(?:[.,]0)?|8(?:[.,]0)?)(?![\d])/gi;
  while ((m = rxB.exec(s))) push({ t: 'cls', c: m[1].replace(',', '.'), ieee: 1, va: Math.round(toNum(m[2]) * 25 * 10) / 10 }, m, 'cls');
  // Messklassen: 0,2S / 0,5 / mit Schlüsselwort auch 1 und 3
  const covered = (i) => toks.some((x) => x.s <= i && x.e > i);
  const rxM = /(?:(kl(?:asse)?\.?|class(?:e)?|cl\.?|osztály(?:ú)?|clase|genauigkeit(?:sklasse)?|accuracy(?: class)?|pr[ée]cision)\s*[:=]?\s*)?(?<![\w.,/])(0[.,]1|0[.,]2\s*s|0[.,]2|0[.,]5\s*s|0[.,]5|1(?:[.,]0)?|3)(?![\d]|[.,]\d|\s*(?:x|×|[/:]\s*\d|a\b|kv|v\b|kA|hz|mm|s\b|sec|st|kern|core|pcs|stk|m\b|db|p\b))/gi;
  while ((m = rxM.exec(s))) {
    const at = m.index + m[0].length - m[2].length;
    if (covered(at)) continue;
    const c = m[2].replace(',', '.').replace(/\s/g, '').toUpperCase().replace(/^1\.0$/, '1');
    const after = s.slice(m.index + m[0].length, m.index + m[0].length + 14);
    const before = s.slice(Math.max(0, m.index - 14), m.index);
    const strong = !!m[1] || /^\s*(fs|va|\/\s*(?:5|10)\s*p|\/\s*[36]p)/i.test(after) || /(va|fs\s*\d+)\s*[/,]?\s*$/i.test(before) || c.startsWith('0');
    if (!strong) continue;
    push({ t: 'cls', c }, m, 'cls');
  }
  const rxFS = /\b(?:FS|fs|instrument security factor|überstrom-?begrenzungsfaktor|facteur de s[ée]curit[ée])\s*[:=]?\s*(?:<|≤|<=)?\s*(\d{1,2})\b/g;
  while ((m = rxFS.exec(s))) push({ t: 'fs', v: Number(m[1]) }, m, 'fs');
  const rxALF = /\b(?:ALF|genauigkeitsgrenzfaktor|accuracy limit factor|facteur limite de pr[ée]cision|pontossági határtényező)\s*[:=]?\s*(\d{1,2})\b/gi;
  while ((m = rxALF.exec(s))) push({ t: 'alf', v: Number(m[1]) }, m, 'cls');
  const rxVA = new RegExp(String.raw`(?<![\w.,])((?:${NUM})(?:\s*[/;]\s*(?:${NUM}))*)\s*VA\b`, 'giu');
  while ((m = rxVA.exec(s))) {
    const vals = m[1].split(/[/;]/).map((x) => toNum(x)).filter((x) => x > 0 && x <= 300);
    if (vals.length) push({ t: 'va', vals }, m, 'va');
  }
  toks.sort((a, b) => a.s - b.s);
  // FS/ALF gehören zur unmittelbar davorstehenden Klasse
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t !== 'fs' && t.t !== 'alf') continue;
    const prev = toks.slice(0, i).reverse().find((x) => x.t === 'cls' || x.t === 'va');
    if (prev && prev.t === 'cls') { prev[t.t] = t.v; t.used = 1; }
  }
  // Paarung
  const cls = toks.filter((x) => x.t === 'cls');
  const vas = toks.filter((x) => x.t === 'va').flatMap((x) => x.vals.map((v) => ({ v, s: x.s })));
  const cores = [];
  if (cls.length > 1 && vas.length === cls.length && (cls[cls.length - 1].s < vas[0].s || vas[vas.length - 1].s < cls[0].s)) {
    cls.forEach((c, i) => cores.push({ c: c.c, ...(c.p ? { p: c.p } : {}), ...(c.alf ? { alf: c.alf } : {}), ...(c.fs ? { fs: c.fs } : {}), ...(c.ieee ? { ieee: 1 } : {}), va: c.va || vas[i].v }));
  } else {
    let cur = null, pendingVa = null;
    for (const t of toks) {
      if (t.t === 'cls') {
        if (cur && cur.c) { cores.push(cur); cur = null; }
        cur = { ...(cur || {}), c: t.c, ...(t.p ? { p: t.p } : {}), ...(t.alf ? { alf: t.alf } : {}), ...(t.fs ? { fs: t.fs } : {}), ...(t.ieee ? { ieee: 1 } : {}), ...(t.va ? { va: t.va } : {}) };
        if (pendingVa != null && cur.va == null) { cur.va = pendingVa; pendingVa = null; }
      } else if (t.t === 'va') {
        for (const v of t.vals) {
          if (cur && cur.va == null) cur.va = v;
          else if (cur && cur.c) { cores.push(cur); cur = { va: v }; }
          else if (!cur) cur = { va: v };
          else pendingVa = v;
        }
      } else if (t.used) {
        continue;
      } else if (t.t === 'fs') {
        if (cur) cur.fs = t.v; else cur = { fs: t.v };
      } else if (t.t === 'alf') {
        if (cur && /P$/.test(cur.c || '')) cur.alf = t.v; else if (cur) cur.alf = t.v; else cur = { alf: t.v };
      }
    }
    if (cur && (cur.c || cur.va != null)) cores.push(cur);
  }
  return cores.filter((c) => c.c || c.va != null);
}

function findIth(s, marks) {
  const out = {};
  let m = /(?:\bI\s*_?\s*c?th\b|\bIth\b|thermische[rn]?\s+(?:bemessungs-?)?kurzzeitstrom|kurzzeitstrom|thermal short[- ]time current|short[- ]time (?:thermal )?(?:withstand )?current|courant (?:de courte dur[ée]e|thermique(?: de courte dur[ée]e)?)|rövid idejű (?:termikus )?(?:határ)?áram|termikus határáram|corriente (?:t[ée]rmica )?de corta duraci[oó]n|kurzschlussstrom|short[- ]circuit (?:current|level|rating)|courant de court-circuit|zárlati áram|corriente de cortocircuito|\bI\s*k\s*''?|\bIk\b)\s*[:=]?\s*(?:≥|>=|min\.?)?\s*(\d+(?:[.,]\d+)?)\s*(kA|x\s*I\s*[np]{1,2}|x\s*In|x\s*Ipr|x\s*I1n)(?:\s*[/,;]?\s*(?:für|for|pour|während|durant|alatt|durante)?\s*(\d+(?:[.,]\d+)?)\s*(?:s\b|sec|sek|seconds?|secondes?|mp|seg|segundos?))?/i.exec(s);
  if (!m) m = /(?<![\w.,])(\d+(?:[.,]\d+)?)\s*(kA)\s*[/,]?\s*(?:für|for|pour)?\s*(\d+(?:[.,]\d+)?)\s*(?:s\b|sec|sek|seconds?|secondes?|mp|seg)/i.exec(s);
  if (m) {
    addMark(marks, m.index, m.index + m[0].length, 'ith');
    if (/^kA$/i.test(m[2])) out.ith = { ka: toNum(m[1]), t: m[3] ? toNum(m[3]) : 1 };
    else out.ith = { mult: toNum(m[1]), t: m[3] ? toNum(m[3]) : 1 };
  } else {
    m = /(?<![\w.,])(\d{2,3})\s*x\s*I\s*(?:n|pn|pr|1n)\b/i.exec(s);
    if (m) { addMark(marks, m.index, m.index + m[0].length, 'ith'); out.ith = { mult: toNum(m[1]), t: 1 }; }
  }
  m = /(?:\bI\s*_?\s*dyn\b|dynamische[rn]?\s+(?:bemessungs-?)?(?:grenz)?strom|sto(?:ß|ss)strom|dynamic (?:withstand )?current|peak withstand current|courant dynamique|dinamikus (?:határ)?áram|corriente din[aá]mica)\s*[:=]?\s*(\d+(?:[.,]\d+)?)\s*(kA|x\s*Ith)/i.exec(s);
  if (m) { addMark(marks, m.index, m.index + m[0].length, 'ith'); out.idyn = /kA/i.test(m[2]) ? { ka: toNum(m[1]) } : { mult: toNum(m[1]) }; }
  return out;
}

function findFreq(s, marks) {
  const m = /(?<![\w.,])(16\s*2\s*\/\s*3|\d+(?:[.,]\d+)?)\s*Hz\b/i.exec(s);
  if (!m) return null;
  addMark(marks, m.index, m.index + m[0].length, 'freq');
  return /2\s*\/\s*3/.test(m[1]) ? 16.7 : Math.round(toNum(m[1]) * 10) / 10;
}

const RX_STD = U(/\b(IEC|EN|DIN EN|VDE)\s*6(?:1869|0044)(?:\s*-\s*(\d{1,2}))?|\bIEEE\s*C\s*57\.13(?:\.\d)?|\bANSI\s*C\s*57\.13|\bIEEE\b|\bANSI\b|\bGOST\b|ГОСТ|\bAS(?:\/NZS)?\s*6?\d{4}\b|\bÖVE\b|\bIEC\b/g);
function findStd(s, marks) {
  const out = new Set();
  const rx = RX_STD;
  rx.lastIndex = 0;
  let m;
  while ((m = rx.exec(s))) {
    const t = m[0].toUpperCase();
    if (/IEEE|ANSI/.test(t)) out.add('IEEE');
    else if (/GOST|ГОСТ/.test(t)) out.add('GOST');
    else if (/^AS/.test(t)) out.add('AS');
    else if (/ÖVE/.test(t)) out.add('ÖVE');
    else if (/^(EN|DIN EN|VDE)/.test(t)) { out.add('EN'); out.add('IEC'); }
    else out.add('IEC');
    addMark(marks, m.index, m.index + m[0].length, 'std');
  }
  return [...out];
}

function findQty(s, marks) {
  let m = /(?:^|[\s(|;:,])(\d{1,5})\s*(?:st(?:ü|ue)ck|stk\.?|st\.(?=\s)|pcs?\.?|pieces?|units?|sätze?|satz|sets?|db\b|darab|uds?\.?|unid\.?|unidad(?:es)?|unidades?|unit[ée]s?|pi[eè]ces?|piezas?|pzas?\.?|ea\.?)(?=\W|$)/i.exec(s);
  if (m) { const i = m.index + m[0].indexOf(m[1]); addMark(marks, i, m.index + m[0].length, 'qty'); return Number(m[1]); }
  m = /(?:menge|stückzahl|anzahl(?!\s*(?:der\s*)?(?:kern|wicklung|sekund))|qty|quantity|quantit[ée]|qt[ée]|mennyiség|cantidad)\s*[:=]?\s*(\d{1,5})\b(?!\s*(?:kern|core|wicklung|winding))/i.exec(s);
  if (m) { addMark(marks, m.index, m.index + m[0].length, 'qty'); return Number(m[1]); }
  m = /^\s*(\d{1,4})\s*x\s+(?=\D)/i.exec(s);
  if (m) { addMark(marks, m.index, m.index + m[0].length, 'qty'); return Number(m[1]); }
  // „bitte 12 Stromwandler …“, „12 low voltage current transformers“, „12 transformateurs de courant“, „12 áramváltóra“
  m = RX_QTY_NOUN.exec(s);
  if (m) { const i = m.index + m[0].indexOf(m[1]); addMark(marks, i, i + m[1].length, 'qty'); return Number(m[1]); }
  return null;
}
const RX_QTY_NOUN = U(/(?:^|[\s(,;:])(?<!\b(?:pos(?:ition)?|nr|no|item|tétel|réf|ref|oz|lfd|feld|bay|iec|en|din|vde|ieee|ansi|öve|typ|type|tipo|típus)\.?\s*)(\d{1,4})[ \t]+(?!(?:k?v|k?a|va|kva|mva|hz|mm|s)\b)(?:(?!(?:k?v|k?a|va|kva|mva|hz|mm)\b)\p{L}[\p{L}-]{2,}[ \t]+){0,2}(?:[\p{L}-]*wandler(?:n)?|(?:current |voltage |instrument |combined )?transformers?|transformateurs?|transformador(?:es)?|\p{L}*váltó\p{L}*|c\.?t\.?s?|v\.?t\.?s?|p\.?t\.?s?|t\.?c\.?s?|t\.?i\.?)(?![\p{L}\p{N}])/i);

function findCoreCount(s, marks) {
  const words = { ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, one: 1, two: 2, three: 3, four: 4, un: 1, deux: 2, trois: 3, egy: 1, kettő: 2, két: 2, három: 3, uno: 1, dos: 2, tres: 3 };
  const m = /(?:(\d|ein|eine|zwei|drei|vier|one|two|three|four|deux|trois|két|kettő|három|dos|tres)\s*(?:-?\s*)(?:kern(?:e|ig)?|cores?|noyaux?|mag(?:os|ú)?|n[uú]cleos?|wicklungen|secondary windings|enroulements secondaires|tekercs(?:ek)?|devanados?))|(?:anzahl (?:der )?(?:kerne|sekundärwicklungen)|number of (?:cores|secondary windings)|nombre de noyaux|magok száma|n[uú]mero de n[uú]cleos)\s*[:=]?\s*(\d)/i.exec(s);
  if (!m) return null;
  addMark(marks, m.index, m.index + m[0].length, 'cls');
  const v = m[1] ? (Number(m[1]) || words[m[1].toLowerCase()]) : Number(m[2]);
  return v || null;
}

function findIprIsr(s, marks) {
  const out = {};
  let m = /(?:\bI\s*_?\s*(?:1n|pn|pr)\b|primärstrom|prim[äa]rer bemessungsstrom|bemessungs-?prim[äa]rstrom|rated primary current|primary current|courant primaire|primer áram|primáráram|corriente primaria)\s*[:=]?\s*(\d[\d.,]*)\s*A\b/i.exec(s);
  if (m) { out.ipr = [toNum(m[1])]; addMark(marks, m.index, m.index + m[0].length, 'ratio'); }
  m = /(?:\bI\s*_?\s*(?:2n|sn|sr)\b|sekundärstrom|bemessungs-?sekund[äa]rstrom|rated secondary current|secondary current|courant secondaire|szekunder áram|corriente secundaria)\s*[:=]?\s*(1|5)\s*A\b/i.exec(s);
  if (m) { out.isr = toNum(m[1]); addMark(marks, m.index, m.index + m[0].length, 'ratio'); }
  return out;
}

function findVf(s, marks) {
  const m = /(?:spannungsfaktor|voltage factor|facteur de tension|feszültségtényező|factor de tensi[oó]n)?\s*(1[.,][259])\s*(?:x\s*)?(?:u\s*[nr]|u\s*pn|upr)?\s*[/,]?\s*(?:für|for|pour|während)?\s*(\d+\s*(?:h|std|stunden|hours?|heures?|óra|horas?)|30\s*s|dauernd|kontinuierlich|continuous(?:ly)?|cont\.|permanent|tart[óo]san|continuo)/i.exec(s);
  if (!m) return null;
  addMark(marks, m.index, m.index + m[0].length, 'vt');
  const f = toNum(m[1]);
  const t = /dauernd|kontinu|cont|perman|tart|continuo/i.test(m[2]) ? 'cont' : (m[2].match(/\d+/)?.[0] || '') + (/s$/i.test(m[2].trim()) && !/h/i.test(m[2]) ? 's' : 'h');
  return { f, t };
}

// Innen-Ø (nicht Außen-Ø) und Schienenmaß (nicht Hut-/Tragschiene TH35)
const RX_DIA = U(/(?:innendurchmesser|innen-?[ø⌀]|(?<!au(?:ß|ss)en-?)durchmesser|inner diameter|inside diameter|diam[eè]tre int[ée]rieur|belső átmérő|di[aá]metro interior|(?<![\p{L}\p{N}_])(?<!au(?:ß|ss)en-?\s?)[ø⌀]|\bd\s*=)\s*[:=]?\s*(?:≥|>=|min\.?)?\s*(\d+(?:[.,]\d+)?)\s*mm/i);
const RX_BAR = U(/(?<!(?:hut|trag)-?)(?:schiene|stromschiene|busbar|bar|barre|sín|barra)\s*[:=]?\s*(\d+)\s*x\s*(\d+)\s*(?:mm)?/i);
function findSize(s, marks) {
  let m = RX_DIA.exec(s);
  if (m) { addMark(marks, m.index, m.index + m[0].length, 'size'); return { d: toNum(m[1]) }; }
  m = RX_BAR.exec(s);
  if (m) { addMark(marks, m.index, m.index + m[0].length, 'size'); return { bar: [Number(m[1]), Number(m[2])] }; }
  return null;
}

// Typcodes von RITZ-Produkten im Text (z. B. "GSO 1910", "ASN 24")
let codeRx = null, codeIdx = null;
export function setProductCodes(products) {
  codeIdx = [];
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const p of products) {
    for (const c of [p.code, ...(p.aliases || [])]) {
      const compact = String(c).replace(/[^A-Za-z0-9]/g, '');
      if (compact.length < 4 || /^\d+$/.test(compact)) continue;
      const parts = String(c).match(/[A-Za-z]+|\d+/g);
      if (!parts) continue;
      codeIdx.push({ id: p.id, rx: new RegExp(`(?<![A-Za-z0-9])${parts.map(esc).join('[\\s-]*')}(?![A-Za-z0-9])`, 'i') });
    }
  }
  codeRx = true;
}
function findCode(s, marks) {
  if (!codeRx) return null;
  for (const c of codeIdx) {
    const m = c.rx.exec(s);
    if (m) { addMark(marks, m.index, m.index + m[0].length, 'code'); return c.id; }
  }
  return null;
}

// ---------- eine Position lesen ----------
export function parsePosition(text) {
  const s = normalize(text);
  const marks = [];
  const req = {};
  const kind = findKind(s);
  if (kind) req.kind = kind;
  const um = findUm(s, marks);
  if (um) { req.um = um.um; if (um.level) req.level = um.level; if (um.sys) req.sys = um.sys; req.umHow = um.how; }
  const vt = findVt(s, marks);
  if (vt) { if (vt.upr) req.upr = vt.upr; if (vt.usr) req.usr = vt.usr; if (vt.usr2) req.usrEn = vt.usr2; if (!req.kind) req.kind = 'vt'; }
  const ratios = findRatios(s, marks);
  if (ratios.length) {
    const r = ratios[0];
    req.ipr = r.prims; req.isr = r.sec;
    if (r.cores > 1) req.coreCount = r.cores;
    if (!req.kind || req.kind === 'vt') req.kind = req.kind === 'vt' ? 'combined' : 'ct';
  }
  const pi = findIprIsr(s, marks);
  if (pi.ipr && !req.ipr) req.ipr = pi.ipr;
  if (pi.isr && !req.isr) req.isr = pi.isr;
  const cores = findCores(s, marks);
  if (cores.length) req.cores = cores;
  const cc = findCoreCount(s, marks);
  if (cc) req.coreCount = Math.max(cc, req.coreCount || 0);
  Object.assign(req, findIth(s, marks));
  const f = findFreq(s, marks);
  if (f) req.freq = f;
  const std = findStd(s, marks);
  if (std.length) req.std = std;
  if (W.outdoor.test(s)) req.install = 'outdoor';
  else if (W.indoor.test(s)) req.install = 'indoor';
  const forms = FORMS.filter(([, rx]) => rx.test(s)).map(([k]) => k);
  if (forms.length) req.forms = forms;
  const apps = [];
  if (W.verifiable.test(s)) apps.push('verifiable');
  if (W.earth.test(s)) apps.push('earth-fault');
  if (W.rail.test(s) || req.freq === 16.7) apps.push('rail');
  if (W.generator.test(s)) apps.push('generator');
  if (W.pq.test(s)) apps.push('power-quality');
  if (W.dc.test(s)) apps.push('dc-measurement');
  if (W.touch.test(s)) apps.push('touch-proof');
  if (W.ex.test(s)) apps.push('ex-protection');
  if (W.aux.test(s)) apps.push('auxiliary-supply');
  if (apps.length) req.apps = apps;
  const vf = findVf(s, marks);
  if (vf) req.vf = vf;
  const size = findSize(s, marks);
  if (size) req.size = size;
  const code = findCode(s, marks);
  if (code) req.code = code;
  // Art aus den Klassen ableiten (3P/6P nur bei Spannungswandlern)
  if (!req.kind && req.cores?.some((c) => /^[36]P$/.test(c.c))) req.kind = 'vt';
  if (!req.kind && (req.cores?.some((c) => /^(5P|10P|PX|TP.|C\d+)$/.test(c.c)) || req.ith?.mult)) req.kind = 'ct';
  // Sensoren
  if (req.kind === 'sensor-ct' || req.kind === 'sensor-vt') { req.sensor = 1; req.kind = req.kind === 'sensor-ct' ? 'ct' : 'vt'; }
  // Isolationsniveau aus der Primärspannung ableiten (20000/√3 V → 20-kV-Netz → Um 24 kV)
  if (req.upr && req.um == null) {
    const kv = Math.round((req.upr.v / 1000) * 100) / 100; // Primärspannung 20000/√3 V gehört zum 20-kV-Netz
    const u = umForSystem(kv);
    if (u) { req.um = u; req.umHow = 'upr'; req.sys = kv; }
  }
  const qty = findQty(s, marks);
  return { req, qty, marks: mergeMarks(marks) };
}

function mergeMarks(marks) {
  marks.sort((a, b) => a.s - b.s || b.e - a.e);
  const out = [];
  for (const m of marks) {
    const last = out[out.length - 1];
    if (last && m.s < last.e) { if (m.e > last.e) last.e = m.e; continue; }
    out.push({ ...m });
  }
  return out;
}

// Zahl technischer Merkmale (Menge/Referenz zählen nicht)
export function reqWeight(req) {
  let n = 0;
  for (const k of ['um', 'ipr', 'isr', 'upr', 'usr', 'ith', 'freq', 'code', 'vf', 'size']) if (req[k] != null) n++;
  n += (req.cores || []).length;
  if (req.kind) n += 0.5;
  return n;
}

// ---------- Text in Positionen zerlegen ----------
const HEAD = uAll({
  qty: /^(menge|anzahl|stück(?:zahl)?|stk\.?|qty|quantity|pcs|quantit[ée]|qt[ée]|mennyiség|db|cantidad|uds?\.?)$/i,
  ref: /^(pos(?:ition)?\.?|nr\.?|item|oz|kennz(?:eichnung)?\.?|bmk|feld|bay|tag|referen[cz]e?|réf\.?|tétel|tag-?nr\.?|elemento)$/i,
  ratio: /übersetzung|ratio|rapport|áttétel|relaci[oó]n|übers\./i,
  cls: /klasse|class|classe|osztály|clase|genauigkeit|accuracy/i,
  va: /bürde|leistung|burden|\bva\b|puissance|terhelés|potencia|charge/i,
  um: /^u\s*m$|isolation|spannungsebene|spannungsreihe|insulation|voltage level|tension|feszültség|tensi[oó]n/i,
  type: /^(typ|type|tipo|típus|bauform|ausführung|design)$/i,
  ipr: /prim[äa]r|primary|primaire|primer|primari/i,
  isr: /sekund|secondary|secondaire|szekunder|secundari/i,
});
function splitTable(lines, sep) {
  const rows = lines.map((l) => l.split(sep).map((c) => c.trim()));
  const head = rows[0];
  const isHead = head.filter((c) => Object.values(HEAD).some((rx) => rx.test(c))).length >= 2 && !head.some((c) => /\d+\s*[/:]\s*[15]\b/.test(c));
  const body = isHead ? rows.slice(1) : rows;
  return { head: isHead ? head : null, body };
}

export function segment(text) {
  const src = String(text || '').replace(/\r\n?/g, '\n');
  const lines = src.split('\n');
  const nonEmpty = lines.filter((l) => l.trim());
  // Tabelle (aus Excel kopiert: Tabulatoren; CSV: Semikolon)
  for (const sep of ['\t', ';']) {
    const withSep = nonEmpty.filter((l) => l.split(sep).length >= 3);
    // Tabulator-Tabellen auch mit Begleittext (z. B. Word: Einleitung, Tabelle, Gruß) – Text davor gilt als Vorspann
    if ((nonEmpty.length >= 2 && withSep.length >= nonEmpty.length * 0.6) || (sep === '\t' && withSep.length >= 3)) {
      const { head, body } = splitTable(withSep, sep);
      const segs = [];
      let off = 0;
      for (const l of lines) {
        const start = src.indexOf(l, off);
        off = start + l.length;
        if (!l.trim() || l.split(sep).length < 3) continue;
        const cells = l.split(sep).map((c) => c.trim());
        if (head && cells.join('|') === head.join('|')) continue;
        if (!body.some((b) => b.join('|') === cells.join('|'))) continue;
        const labelled = head ? cells.map((c, i) => (c ? `${head[i] || ''}: ${c}` : '')).filter(Boolean).join(' | ') : cells.filter(Boolean).join(' | ');
        // Zellpositionen in der Zeile (für Markierungen), Kennzeichnungsspalte aus dem Kopf
        const raw = l.split(sep);
        const cellAt = [];
        let o = 0;
        for (const c of raw) { const lead = c.length - c.trimStart().length; cellAt.push([o + lead, c.trim()]); o += c.length + sep.length; }
        const refCol = head ? head.findIndex((h) => HEAD.ref.test(h)) : -1;
        const qtyCol = head ? head.findIndex((h) => HEAD.qty.test(h)) : -1;
        segs.push({ text: l, start, end: start + l.length, parseText: labelled, head, cells, cellAt, ref: refCol >= 0 && cells[refCol] ? cells[refCol] : null, qtyCol });
      }
      if (segs.length) {
        const first = src.indexOf(withSep[0]);
        const pre = first > 0 && src.slice(0, first).trim() ? { text: src.slice(0, first), start: 0 } : null;
        return { kind: 'table', segs, preamble: pre };
      }
    }
  }
  // Positionsnummern am Zeilenanfang
  const posRx = /^\s*(?:(?:pos(?:ition)?|oz|item|poz|tétel|art(?:ikel)?)\.?\s*[:\-]?\s*)?(\d{1,4}(?:[.]\d{1,4}){0,4})[.)]?\s+(?=\S)/i;
  const starts = [];
  let off = 0;
  for (const l of lines) {
    const start = src.indexOf(l, off);
    off = start + l.length;
    const m = posRx.exec(l);
    if (m && l.trim().length > m[0].trim().length + 2 && !/^\s*\d+(?:[.,]\d+)?\s*(?:kv|v|a|va|hz|ka|x|mm|%|st(?:ü|ue)ck|stk|st\.|pcs?|pieces?|units?|db|darab|uds?|unidades|pi[eè]ces?|sets?|s[äa]tze?|kerne?|cores?|wicklung(?:en)?|windings?|jahre?|years?|wochen|weeks?|tage?|days?)\b/i.test(l)) starts.push({ start, ref: m[1] });
  }
  if (starts.length >= 2) {
    const segs = starts.map((st, i) => ({ text: src.slice(st.start, i + 1 < starts.length ? starts[i + 1].start : src.length).replace(/\s+$/, ''), start: st.start, ref: st.ref }));
    for (const sg of segs) sg.end = sg.start + sg.text.length;
    const pre = starts[0].start > 0 ? { text: src.slice(0, starts[0].start), start: 0 } : null;
    return { kind: 'numbered', segs, preamble: pre };
  }
  // Absätze
  const paras = [];
  const rxPara = /[^\n]+(?:\n(?!\s*\n)[^\n]*)*/g;
  let m;
  while ((m = rxPara.exec(src))) if (m[0].trim()) paras.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  if (paras.length >= 2) return { kind: 'paragraphs', segs: paras, preamble: null };
  // je Zeile eine Position, wenn mehrere Zeilen eigene Übersetzungen enthalten
  const lineSegs = [];
  off = 0;
  for (const l of lines) {
    const start = src.indexOf(l, off);
    off = start + l.length;
    if (l.trim()) lineSegs.push({ text: l, start, end: start + l.length });
  }
  const withRatio = lineSegs.filter((x) => ratioCount(x.text) > 0);
  if (withRatio.length >= 2) return { kind: 'lines', segs: lineSegs, preamble: null };
  return { kind: 'single', segs: src.trim() ? [{ text: src, start: 0, end: src.length }] : [], preamble: null };
}

// Allgemeine Angaben aus dem Vorspann gelten für alle Positionen
const INHERIT = ['um', 'umHow', 'sys', 'level', 'freq', 'std', 'install', 'isr', 'kind', 'ith', 'apps'];

// Mehrere Anforderungen in einem Absatz (z. B. E-Mail: „12 Stück … 1500/5 A …, und 3 Stück … 400/1 A …“) in Teilpositionen trennen
const ratioCount = (s) => { const n = normalize(s); return findRatios(n, []).length + vtAll(n).length; };
const CLAUSE = U(/\r?\n+|;\s+|(?<=[^\d\s][.!?])(?<!\b(?:uds?|unid|stk|st|pcs?|pzas?|ca|bzw|inkl|zzgl|ggf|max|min|nr|pos|kl|gr|typ|vgl|evtl|approx|resp|env|kb|kb|aprox|p\. ?ej|z\. ?b|e\. ?g|i\. ?e)\.)\s+(?=\S)|,?\s+(?:and|as well as|und|sowie|plus|et|ainsi que|és|valamint|továbbá|y|así como)\s+(?=(?:\d{1,5}\s*(?:x\b|pcs?\b|pieces?|units?|stk|st(?:ü|ue)ck|st\.|db\b|darab|uds?\b|unidades|pi[eè]ces?|sets?)|[\wäöüéáó-]*(?:wandler|transformers?|transformateurs?|váltó|transformador(?:es)?|\bcts?\b)))/gi);
function subSplit(text) {
  const parts = [];
  let last = 0, m;
  CLAUSE.lastIndex = 0;
  while ((m = CLAUSE.exec(text))) { if (m.index > last) parts.push([last, text.slice(last, m.index)]); last = m.index + m[0].length; if (!m[0].length) CLAUSE.lastIndex++; }
  if (last < text.length) parts.push([last, text.slice(last)]);
  const groups = [];
  let cur = null, intro = '';
  for (const [s, t] of parts) {
    const has = ratioCount(t) > 0;
    if (!groups.length && !has) intro += t + ' ';
    if (!cur || (has && cur.has)) { cur = { s, e: s + t.length, has }; groups.push(cur); }
    else { cur.e = s + t.length; cur.has = cur.has || has; }
  }
  // führende Teile ohne Übersetzung gehören zur ersten Gruppe mit Übersetzung (Einleitung)
  while (groups.length > 1 && !groups[0].has) { groups[1].s = groups[0].s; groups.shift(); }
  return { intro: intro.trim(), groups: groups.filter((g) => g.has).map((g) => ({ s: g.s, text: text.slice(g.s, g.e) })) };
}
const SIBLING = ['um', 'umHow', 'sys', 'level', 'freq', 'std', 'install'];

export function parseSpec(text) {
  const seg = segment(text);
  const positions = [];
  let ignored = 0;
  let pre = null;
  if (seg.preamble && seg.preamble.text.trim()) {
    const p = parsePosition(seg.preamble.text);
    pre = { ...p, start: seg.preamble.start, text: seg.preamble.text };
  }
  const inherit = (req, from) => { for (const k of INHERIT) if (req[k] == null && from[k] != null) { req[k] = from[k]; (req.inherited ||= []).push(k); } };
  for (const sg of seg.segs) {
    // Tabellenzeile: beschriftet lesen, Markierungen je Zelle
    if (sg.parseText) {
      const p = parsePosition(sg.parseText);
      if (pre) inherit(p.req, pre.req);
      if (reqWeight(p.req) < 1) { ignored++; continue; }
      const marks = [];
      sg.cellAt.forEach(([o, c], i) => {
        if (!c) return;
        if (i === sg.qtyCol && /^\d{1,5}$/.test(c)) { marks.push({ s: o, e: o + c.length, k: 'qty' }); return; }
        for (const mk of parsePosition(c).marks) marks.push({ s: o + mk.s, e: o + mk.e, k: mk.k });
      });
      positions.push({ text: sg.text, start: sg.start, end: sg.end, ref: sg.ref || null, qty: p.qty || 1, qtyFound: !!p.qty, req: p.req, marks });
      continue;
    }
    const split = ratioCount(sg.text) >= 2 ? subSplit(sg.text) : null;
    const subs = split?.groups || [];
    if (subs.length >= 2) {
      // Angaben der Einleitung (vor der ersten Übersetzung) gelten für alle Teilpositionen
      const intro = split.intro ? parsePosition(split.intro).req : {};
      subs.forEach((sub, i) => {
        const p = parsePosition(sub.text);
        if (pre) inherit(p.req, pre.req);
        for (const k of SIBLING) if (p.req[k] == null && intro[k] != null) { p.req[k] = intro[k]; (p.req.inherited ||= []).push(k); }
        if (reqWeight(p.req) < 1) { ignored++; return; }
        positions.push({ text: sub.text, start: sg.start + sub.s, end: sg.start + sub.s + sub.text.length, ref: sg.ref ? `${sg.ref}${String.fromCharCode(97 + i)}` : null, qty: p.qty || 1, qtyFound: !!p.qty, req: p.req, marks: p.marks });
      });
      continue;
    }
    const p = parsePosition(sg.text);
    if (pre) inherit(p.req, pre.req);
    if (reqWeight(p.req) < 1) { ignored++; continue; }
    positions.push({ text: sg.text, start: sg.start, end: sg.end, ref: sg.ref || null, qty: p.qty || 1, qtyFound: !!p.qty, req: p.req, marks: p.marks });
  }
  return { kind: seg.kind, positions, ignored, preamble: pre && reqWeight(pre.req) >= 0.5 ? { text: pre.text, start: pre.start, req: pre.req, marks: pre.marks } : null };
}
