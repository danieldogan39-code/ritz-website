// Bedeutung der Konfiguratoroptionen: Aus den deutschen Optionsnamen wird eine Rolle abgeleitet
// (Isolationsniveau, Primärstrom, Klasse von Kern 2 …), aus den Wertetexten ein maschinenlesbarer Wert.
// Grundlage für Spezifikations-Assistent, automatische Konfiguration, Typenschild und Ausschreibungstexte.
// Läuft im Build (Node) und im Browser.

const low = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

// Zahl aus deutschem Text: "0,72" → 0.72, "17,5" → 17.5, "1.000" → 1000
export function deNum(s) {
  const m = String(s).replace(/ /g, ' ').match(/\d{1,3}(?:\.\d{3})+(?![\d,])|\d+(?:,\d+)?|\d+(?:\.\d+)?/);
  if (!m) return null;
  let t = m[0];
  if (/^\d{1,3}(?:\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  return parseFloat(t.replace(',', '.'));
}

// Rolle einer Option anhand des (deutschen) Titels; n = Kern- bzw. Wicklungsnummer
export function optionRole(title, type = 'select') {
  const t = low(title);
  const idx = t.match(/(?:kern|wi)\s*(\d)/);
  const n = idx ? Number(idx[1]) : 1;
  if (type === 'text' && /sonderw|extras/.test(t)) return ['special', 0];
  if (/übersetzung primär-\/sekundärstrom/.test(t)) return ['ratio', 0];
  if (/sonderausf|zusatzoption|sonderausstattung|special features|^sonderwünsche$/.test(t)) return ['extras', 0];
  if (/sonderw|extras/.test(t)) return ['special', 0];
  if (/wunschliefer|lieferzeit|time of delivery/.test(t)) return ['delivery', 0];
  if (/da-dn/.test(t)) {
    if (/sekundärspannung/.test(t)) return ['usr_en', 0];
    if (/leistung|bürde/.test(t)) return ['burden_en', 0];
    if (/genauigkeitskla/.test(t)) return ['cls_en', 0];
  }
  if (/isolationsniveau an sekund/.test(t)) return ['secins', 0];
  if (/isolations(niveau|pegel|level)|spannungsreihe|spannungsebene|isoionspegel/.test(t)) return ['um', 0];
  if (/kurzschlussdauer/.test(t)) return ['tk', 0];
  if (/stoßstrom|stossstrom|idyn/.test(t)) return ['idyn', 0];
  if (/dauerstrom/.test(t)) return ['icth', 0];
  if (/langzeitstrom/.test(t)) return ['ie', 0];
  if (/kurzzeitstrom|\bith\b|icth/.test(t)) return ['ith', 0];
  if (/genauigkeitskla/.test(t) && /leistung/.test(t)) return ['clsva', n];
  if (/primärstrom|primärsrtrom|primary current/.test(t)) return ['ipr', 0];
  if (/sekundärstrom/.test(t)) return ['isr', 0];
  if (/primärspannung/.test(t)) return ['upr', 0];
  if (/sekundärspannung/.test(t)) return ['usr', n];
  if (/anzahl (der )?(kern|sekundärwicklung)/.test(t)) return ['cores', 0];
  if (/genauigkeitskla/.test(t)) return ['cls', n];
  if (/bemessungsbürde/.test(t)) return ['rbr', 0];
  if (/leistung|bürde/.test(t)) return ['burden', n];
  if (/spannungsfaktor/.test(t)) return ['vf', 0];
  if (/frequenz/.test(t)) return ['freq', 0];
  if (/norm|standard/.test(t)) return ['std', 0];
  if (/umschaltung|angezapft|übersetzung/.test(t)) return ['switch', 0];
  if (/innendurchmesser|außen-|aussen-/.test(t)) return ['size', 0];
  if (/^typ|^type/.test(t)) return ['type', 0];
  if (/dämpfungsleistung/.test(t)) return ['damping', 0];
  if (/kpcr/.test(t)) return ['kpcr', 0];
  return ['other', 0];
}

const OTHER = /andere|weitere|im feld|auf anfrage|bitte |kleinere|mehr kern|in sonderw|ohne klasse|werte im/;

// Genauigkeitsklasse mit Überstrom-Begrenzungsfaktor (FS) bzw. Genauigkeitsgrenzfaktor (ALF)
export function parseClass(label) {
  const s = String(label).replace(/,/g, '.').replace(/\s+/g, ' ').replace(/(^|[^\d.])1\.0(?![\d])/g, '$11').trim();
  const u = s.toUpperCase();
  const out = {};
  let m = u.match(/\b(5|10)\s*P\s*R?\s*(\d{1,2})?\b/);
  if (m && !/^0\./.test(u)) {
    out.c = m[1] + 'P';
    if (m[2]) out.alf = Number(m[2]);
  } else if ((m = u.match(/^(0\.1|0\.2|0\.5|1|3)\s*\/\s*(3|6)\s*P\b/))) {
    out.c = m[1]; out.p = m[2] + 'P'; // Doppelklasse Spannungswandler ("0,5/3P")
  } else if (!/^0\./.test(u) && (m = u.match(/(?:^|[^\d.\/])(3|6)\s*P\b/))) {
    out.c = m[1] + 'P'; // Schutzklassen der Spannungswandler
  } else if ((m = u.match(/(?:^|[^\d.])(0\.1|0\.2\s?S|0\.2|0\.5\s?S|0\.5|1|3)(?![\d.])/))) {
    out.c = m[1].replace(/\s/g, '');
  }
  if (!out.c && (m = u.match(/\b(PX|PR|TPX|TPY|TPZ)\b/))) out.c = m[1];
  // zusätzlicher Schutzklassen-Teil bei Spannungswandlern ("0,5/3P")
  const p2 = u.match(/[\/\s]\s*(3|6)\s*P\b/);
  if (p2 && out.c && !/P$/.test(out.c) && !out.p) out.p = p2[1] + 'P';
  const fs = u.match(/FS\s*(\d{1,2})(?:\s*(?:…|\.\.\.|-|–)\s*(?:FS\s*)?(\d{1,2}))?/);
  if (fs) out.fs = fs[2] ? [Number(fs[1]), Number(fs[2])] : [Number(fs[1]), Number(fs[1])];
  const le = u.match(/≤\s*FS\s*(\d{1,2})/);
  if (le) out.fs = [1, Number(le[1])];
  if (/BÜRDENABH/.test(u) && out.fs) out.dep = 1;
  return out.c ? out : null;
}

// Wert einer Option in maschinenlesbarer Form
export function parseValue(role, label) {
  const raw = String(label || '');
  const l = low(raw);
  if (!raw.trim()) return null;
  if (OTHER.test(l)) return { other: 1 };
  switch (role) {
    case 'um': case 'freq': case 'tk': case 'isr': case 'delivery': case 'idyn': case 'ie': {
      const n = deNum(raw);
      return n == null ? null : { n };
    }
    case 'ipr': {
      if (/x\s*in/.test(l)) return null;
      const r = raw.match(/(\d[\d.,]*)\s*[-–]\s*(\d[\d.,]*)\s*A/);
      if (r) return { n: deNum(r[1]), n2: deNum(r[2]) };
      const n = deNum(raw);
      return n == null ? null : { n };
    }
    case 'cores': {
      const n = deNum(raw);
      if (/da-dn/.test(l)) return { n: n || 0, en: 1 };
      return n == null ? null : { n, ...(/pq/.test(l) ? { pq: 1 } : {}) };
    }
    case 'cls': case 'cls_en': return parseClass(raw);
    case 'clsva': {
      // "Kl. 0,5 | 10 VA" oder für zwei Kerne "Kl. 0,5 | 10 VA / 5P20 | 10 VA"
      const parts = raw.split(/\s+\/\s+/).map((part) => {
        const c = parseClass(part.replace(/\|.*$/, ''));
        const va = part.match(/(\d+(?:,\d+)?)\s*VA/i);
        return c ? { ...c, ...(va ? { va: deNum(va[1]) } : {}) } : null;
      }).filter(Boolean);
      if (!parts.length) return null;
      return parts.length > 1 ? { ...parts[0], combo: parts } : parts[0];
    }
    case 'burden': case 'burden_en': {
      const r = raw.match(/(\d+(?:,\d+)?)\s*(?:…|\.\.\.|-|–)\s*(\d+(?:,\d+)?)/);
      if (r) return { n: deNum(r[1]), n2: deNum(r[2]) };
      const n = deNum(raw);
      return n == null ? null : { n };
    }
    case 'usr': case 'usr_en': {
      const mv = raw.match(/(\d+(?:,\d+)?)\s*mV/i);
      if (mv) return { n: deNum(mv[1]) / 1000, mv: 1 };
      const n = deNum(raw);
      if (n == null) return null;
      return { n, ...(/√\s*3|\/\s*v3|wurzel/i.test(raw) ? { d: 'r3' } : /\/\s*3\b/.test(raw) ? { d: '3' } : {}) };
    }
    case 'upr': {
      const kv = /kv/.test(l) ? 1000 : 1;
      const r = raw.match(/(\d[\d.,]*)\s*[-–]\s*(\d[\d.,]*)/);
      const r3 = /√\s*3|\/\s*v3/i.test(raw);
      if (r) return { n: deNum(r[1]) * kv, n2: deNum(r[2]) * kv, ...(r3 ? { d: 'r3' } : {}) };
      const n = deNum(raw);
      return n == null ? null : { n: n * kv, ...(r3 ? { d: 'r3' } : {}) };
    }
    case 'ith': {
      const mult = raw.match(/(\d+(?:,\d+)?)\s*[x×*]\s*(?:in|ipr|i)/i);
      if (mult) return { mult: deNum(mult[1]) };
      const ka = raw.match(/(\d+(?:,\d+)?)\s*kA(?:\s*\/\s*(\d+(?:,\d+)?)\s*s)?/i);
      if (ka) return { ka: deNum(ka[1]), ...(ka[2] ? { t: deNum(ka[2]) } : {}) };
      const n = deNum(raw);
      return n == null ? null : { ka: n };
    }
    case 'vf': {
      const f = deNum(raw);
      if (f == null) return null;
      const h = raw.match(/\/\s*(\d+(?:,\d+)?)\s*(std|h|s|min)/i);
      return { f, t: /dauernd|cont/i.test(raw) ? 'cont' : h ? deNum(h[1]) + (/std|h/i.test(h[2]) ? 'h' : h[2].toLowerCase().startsWith('m') ? 'min' : 's') : null };
    }
    case 'std': {
      const out = [];
      for (const s of ['IEC', 'IEEE', 'ANSI', 'AS', 'GOST', 'ÖVE', 'EN', 'VDE', 'DIN', 'BS', 'CSA', 'GB']) if (new RegExp('(^|[^A-ZÄÖÜ])' + s + '([^A-ZÄÖÜ]|$)').test(raw.toUpperCase())) out.push(s);
      return out.length ? { s: out } : null;
    }
    case 'switch': {
      if (/keine/.test(l)) return { sw: 'none' };
      if (/prim/.test(l)) return { sw: 'primary' };
      if (/sek|anzapf/.test(l)) return { sw: 'secondary' };
      const r = raw.match(/(\d[\d.,]*)\s*[-–;]\s*(\d[\d.,]*)/);
      return r ? { sw: 'primary', n: deNum(r[1]), n2: deNum(r[2]) } : null;
    }
    case 'size': {
      const mm = raw.match(/(\d+(?:,\d+)?)\s*mm/);
      const n = mm ? deNum(mm[1]) : deNum(raw);
      return n == null ? null : { n };
    }
    default: return null;
  }
}

// Alle Optionen eines Produkts: Rollen je Option-ID, geparste Werte je Wert-ID
export function classifyOptions(options) {
  const r = {}, x = {};
  for (const o of options || []) {
    const [role, n] = optionRole(o.t, o.type);
    r[o.id] = n ? [role, n] : [role];
    for (const [vid, label] of o.v || []) {
      const pv = parseValue(role, label);
      if (pv) x[vid] = pv;
    }
  }
  return { r, x };
}

// Mehrfachauswahl nur, wo sie fachlich Sinn ergibt (Wicklungen + e-n-Wicklung, Zusatzoptionen) –
// andere „checkbox“-Optionen der Shopdaten (z. B. Spannungsreihe) bleiben Einfachauswahl
const MULTI_ROLES = new Set(['cores', 'extras']);
export function markMulti(options, r) {
  return (options || []).map((o) => ((o.type === 'checkbox' || o.type === 'multiple') && MULTI_ROLES.has((r[o.id] || [])[0]) ? { ...o, m: 1 } : o));
}
