// Auslegungsrechnungen für Messwandler (isomorph, ohne Oberfläche).
// Grundlagen: IEC 61869-1/-2/-3, IEC 60909 (Kurzschlussströme), Leiterwiderstände nach IEC 60228 (20 °C).
// Alle Funktionen sind rein: Eingaben → Ergebnisobjekt mit Zwischenwerten (für den Rechenweg).

export const RHO20 = { cu: 0.0175, al: 0.0286 }; // Ω·mm²/m bei 20 °C
export const ALPHA = { cu: 0.00393, al: 0.00403 }; // 1/K
export const rho = (mat = 'cu', temp = 20) => RHO20[mat] * (1 + ALPHA[mat] * (temp - 20));

// Übliche Bemessungsleistungen (VA) – Stromwandler (IEC 61869-2 und gängige Zwischenwerte), Spannungswandler (IEC 61869-3)
export const CT_OUTPUTS = [1, 1.5, 2.5, 5, 7.5, 10, 15, 20, 30, 45, 60];
export const VT_OUTPUTS = [10, 15, 25, 30, 50, 75, 100, 150, 200];
// Normreihe der Bemessungs-Primärströme (IEC 61869-2): 10 – 12,5 – 15 – 20 – 25 – 30 – 40 – 50 – 60 – 75 A und dekadische Vielfache
const SERIES = [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5];
const r6 = (v) => Math.round(v * 1e6) / 1e6;
export function iprSeries(min, max) {
  const out = [];
  for (let e = -1; e <= 5; e++) for (const s of SERIES) { const v = r6(s * 10 ** e); if (v >= min && v <= max) out.push(v); }
  return out;
}
const ALL_IPR = iprSeries(0.1, 1e6);
export const iprUp = (min) => (min > 0 ? ALL_IPR.find((v) => v >= min - 1e-9) ?? null : null);
export const iprDown = (v) => [...ALL_IPR].reverse().find((x) => x < v - 1e-9) ?? null;
export const stepUp = (list, v) => list.find((s) => s >= v - 1e-9) ?? null;

// ---------- Bürde der Sekundärleitung (Stromwandler) ----------
// k: 2 = Hin- und Rückleiter (Einphasig, Erdfehler), 1 = Sternschaltung bei symmetrischer Last
export function leadBurden({ isr = 5, len = 0, area = 2.5, mat = 'cu', temp = 20, k = 2, dev = 0, rc = 0 }) {
  const r = rho(mat, temp);
  const rLead = (k * r * len) / area;
  const sLead = isr ** 2 * rLead;
  const sC = isr ** 2 * rc;
  const sTot = dev + sLead + sC;
  const sr = stepUp(CT_OUTPUTS, sTot);
  const lenMax = (S) => (S - dev - sC > 0 ? ((S - dev - sC) * area) / (isr ** 2 * k * r) : 0);
  const alt = isr === 5 ? { sLead: rLead } : null; // Leitungsanteil derselben Leitung bei 1 A Sekundärstrom (I² · R)
  return { rho: r, rLead, sLead, sC, sTot, sr, util: sr ? sTot / sr : null, low25: !!sr && sTot < 0.25 * sr, uTerm: isr ? sTot / isr : 0, lenMax: sr ? lenMax(sr) : null, alt, over: sTot > CT_OUTPUTS[CT_OUTPUTS.length - 1] };
}

// ---------- Überstrom-Begrenzungsfaktor / Genauigkeitsgrenzfaktor bei Betriebsbürde ----------
// n' = n · (S_i + S_r) / (S_i + S_b) mit S_i = I_sr² · R_ct (Eigenbürde)
export function effFactor({ n = 5, sr = 10, sb = 2.5, rct = 0.2, isr = 5, target = null, ikMax = null, ipr = null }) {
  const si = isr ** 2 * rct;
  const nEff = (n * (si + sr)) / (si + sb);
  const need = ikMax && ipr ? (ikMax * 1000) / ipr : null;
  // Zusatzbürde, damit der wirksame Faktor auf "target" sinkt (nur sinnvoll, wenn n' > target)
  const tgt = target || n;
  const sbFor = (n * (si + sr)) / tgt - si;
  const add = sbFor > sb + 1e-9 ? sbFor - sb : 0;
  return { si, nEff, need, ok: need != null ? nEff >= need - 1e-9 : null, add, tgt };
}

// ---------- Kurzschlussfestigkeit ----------
// Ik'' (kA), Dauer tk (s): thermisch gleichwertiger 1-s-Strom Ith = Ik·√tk; Stoßkurzschlussstrom ip = κ·√2·Ik''
export function shortCircuit({ ik = 20, tk = 1, f = 50, kappa = 1.8, ipr = null }) {
  const ith1 = ik * Math.sqrt(tk);
  const ip = kappa * Math.SQRT2 * ik;
  const fac = f === 60 ? 2.6 : 2.5; // Idyn = 2,5 · Ith (50 Hz) bzw. 2,6 · Ith (60 Hz), IEC 61869-1
  return { ith1, ip, fac, idynStd: fac * ith1, mult: ipr ? (ith1 * 1000) / ipr : null, ithReq: ith1, idynReq: ip };
}
export const ikFromTrafo = ({ s, u, uk }) => (s > 0 && u > 0 && uk > 0 ? s / (Math.sqrt(3) * u * (uk / 100)) / 1000 : null); // kVA, kV, % → kA
export const ikFromSk = ({ sk, u }) => (sk > 0 && u > 0 ? sk / (Math.sqrt(3) * u) : null); // MVA, kV → kA
// Normwerte Ith (kA) für die Empfehlung
export const ITH_STEPS = [1, 1.6, 2, 2.5, 3.15, 4, 5, 6.3, 8, 10, 12.5, 16, 20, 25, 31.5, 40, 50, 63, 80, 100];

// ---------- Primärstrom aus Last ----------
export function primaryCurrent({ s = null, p = null, cos = 0.9, u = 0.4, phases = 3, margin = 20, ext = 1 }) {
  const sva = s != null && s > 0 ? s : p != null && p > 0 && cos > 0 ? p / cos : null; // kVA
  if (!sva || !(u > 0)) return null;
  const ib = phases === 3 ? sva / (Math.sqrt(3) * u) : sva / u; // A
  const need = ib * (1 + margin / 100);
  const ipr = iprUp(need / ext);
  const load = ipr ? ib / ipr : null;
  const lower = ipr ? iprDown(ipr) : null;
  return { sva, ib, need, ipr, load, lower, lowerLoad: lower ? ib / lower : null, sClass: load != null && load < 0.2, over: load != null && load > ext + 1e-9 };
}

// ---------- Spannungswandler ----------
// earthing: 'effective' (starr geerdet) | 'auto' (nicht wirksam geerdet, mit Erdschlussabschaltung) | 'isolated' (isoliert/kompensiert, ohne Abschaltung)
const VF = { effective: [1.5, '30s'], auto: [1.9, '30s'], isolated: [1.9, '8h'] };
const CLASS_LIMIT = { '0.1': 0.1, '0.2': 0.2, '0.5': 0.5, '1': 1, '3': 3, '3P': 3, '6P': 6 };
export function vtDesign({ un = 20, pole = 1, earthing = 'isolated', usr = 100, sdev = 30, len = 0, area = 2.5, mat = 'cu', temp = 20, cls = '0.5' }) {
  const upr = pole === 1 ? (un * 1000) / Math.sqrt(3) : un * 1000; // V
  const us = pole === 1 ? usr / Math.sqrt(3) : usr; // V
  const vf = pole === 1 ? VF[earthing] : [1.2, 'cont'];
  const uen = earthing === 'effective' ? usr / Math.sqrt(3) : usr / 3; // e-n-Wicklung
  const i = sdev / us; // A
  const r = rho(mat, temp);
  const rLead = (2 * r * len) / area;
  const du = i * rLead; // V
  const duPct = (du / us) * 100;
  const pLead = i ** 2 * rLead;
  const sr = stepUp(VT_OUTPUTS, sdev + pLead);
  const lim = CLASS_LIMIT[cls] ?? 0.5;
  return { upr, us, usr, uen, enLabel: earthing === 'effective' ? 'r3' : '3', vf, i, rLead, du, duPct, pLead, sr, lim, share: duPct / lim, util: sr ? (sdev + pLead) / sr : null, low25: !!sr && sdev + pLead < 0.25 * sr };
}
