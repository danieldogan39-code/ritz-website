// Stellen der Karriereseite: Bereiche entlang des Wegs eines Wandlers und die ausschreibenden Standorte (isomorph)
//
// Bereich einer Stelle: aus dem Feld `area` der Stellendaten (z. B. Abteilung aus dem Personio-Feed), sonst aus dem
// Stellentitel abgeleitet. Reihenfolge der Regeln zählt: „Vertriebsingenieur“ ist Vertrieb, „Qualitätsingenieur“ Prüfen.
import { esc, fmtNum, pluralRule } from './util.js';

export const JOB_AREAS = ['sales', 'dev', 'make', 'test', 'log', 'org'];
// die ersten fünf sind Stationen auf dem Weg des Wandlers, „org“ begleitet sie
export const FLOW_AREAS = JOB_AREAS.slice(0, 5);

const RULES = [
  ['test', /prüf|test|qualit|\bQM\b|energy|energie|umwelt/i],
  ['log', /lager|logisti|warehouse|versand|spedition|kommission/i],
  ['sales', /vertrieb|sales|verkauf|key account|kundenbetreu|application/i],
  ['dev', /konstru|engineer|ingenieur|entwickl|design|forschung/i],
  ['org', /\bERP\b|\bHR\b|personal|kaufm|finanz|controll|buchhalt|rechnungswesen|informati|einkauf|assistenz|office|marketing|recht/i],
  ['org', /\bIT\b/],
];
export function jobArea(j) {
  if (j.area && JOB_AREAS.includes(j.area)) return j.area;
  const s = String(j.title || '');
  for (const [k, re] of RULES) if (re.test(s)) return k;
  return 'make'; // Fertigung, Technik, Instandhaltung, Mechatronik
}

// Ausschreibende Standorte: Standort-ID der Kontaktdaten und Postfach des Personalteams
export const JOB_SITES = [
  { id: 'hamburg', city: 'Hamburg', mail: 'personal.hamburg@ritz-international.com' },
  { id: 'kirchaich', city: 'Kirchaich', mail: 'personal.kirchaich@ritz-international.com' },
  { id: 'dresden', city: 'Ottendorf-Okrilla', mail: 'personal.dresden@ritz-international.com' },
];
export const jobSite = (id) => JOB_SITES.find((s) => s.id === id) || null;

// Titel ohne die Geschlechterangabe „(m/w/d)“ (wird klein dahinter gesetzt)
export function splitJobTitle(title) {
  const m = /^(.*?)\s*(\((?:m|w|f|d)\/(?:m|w|f|d)\/(?:m|w|f|d)\))\s*(.*)$/i.exec(String(title || ''));
  if (!m) return [String(title || ''), ''];
  return [(m[1] + (m[3] ? ' ' + m[3] : '')).trim(), m[2]];
}

// Suchtext einer Stelle (klein, ohne Akzente, ß als ss)
export const normJob = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

// Anzahl mit hervorgehobener Zahl („<b>3</b> offene Stellen“), Pluralregel der Sprache
export function countHtml(lang, n, forms) {
  const r = pluralRule(lang, n);
  const f = forms[r] ?? forms.other;
  return esc(f).replace('{n}', `<b>${esc(fmtNum(n, lang))}</b>`);
}
