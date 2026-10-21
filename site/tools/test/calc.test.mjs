// Tests für die Auslegungsrechnungen: node tools/test/calc.test.mjs
import { leadBurden, effFactor, shortCircuit, ikFromTrafo, ikFromSk, primaryCurrent, vtDesign, iprUp, iprDown, rho } from '../../src/lib/calc.js';
let pass = 0, fail = 0;
const near = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
function eq(name, got, exp, tol) {
  const ok = typeof exp === 'number' ? near(got, exp, tol) : JSON.stringify(got) === JSON.stringify(exp);
  if (ok) pass++; else { fail++; console.log('✗', name, 'erwartet', exp, 'bekommen', got); }
}
// Leiterwiderstand
eq('ρ Cu 20 °C', rho('cu', 20), 0.0175);
eq('ρ Cu 75 °C', rho('cu', 75), 0.0175 * (1 + 0.00393 * 55));
// Leitungsbürde: 5 A, 20 m, 2,5 mm², Hin- und Rückleiter → 0,28 Ω, 7 VA
let b = leadBurden({ isr: 5, len: 20, area: 2.5, dev: 2.5 });
eq('R Leitung', b.rLead, 0.28);
eq('S Leitung', b.sLead, 7);
eq('S gesamt', b.sTot, 9.5);
eq('Bemessungsleistung', b.sr, 10);
eq('1 A Vergleich', b.alt.sLead, 0.28);
eq('max. Länge bei 10 VA', b.lenMax, (10 - 2.5) * 2.5 / (25 * 2 * 0.0175));
b = leadBurden({ isr: 1, len: 100, area: 2.5, dev: 1 });
eq('1 A: 100 m', b.sLead, 1.4);
eq('1 A: Bemessung', b.sr, 2.5);
eq('unter 25 %', leadBurden({ isr: 1, len: 1, area: 4, dev: 0.5 }).low25, false);
eq('unter 25 % (0,4 VA an 2,5 VA)', leadBurden({ isr: 1, len: 1, area: 4, dev: 0.3 }).sr, 1);
// Überstromfaktor: FS5, 15 VA, Betriebsbürde 2 VA, Rct 0,1 Ω bei 5 A (Si = 2,5 VA) → 5·17,5/4,5 = 19,44
let f = effFactor({ n: 5, sr: 15, sb: 2, rct: 0.1, isr: 5 });
eq('Si', f.si, 2.5);
eq('FS wirksam', f.nEff, 19.444, 1e-3);
eq('Zusatzbürde für FS5', f.add, 15 - 2);
f = effFactor({ n: 20, sr: 10, sb: 5, rct: 2, isr: 1, ikMax: 16, ipr: 1000 });
eq('ALF wirksam', f.nEff, 20 * 12 / 7);
eq('ALF ausreichend', f.ok, true);
// Kurzschluss: 25 kA 1 s; 20 kA 3 s → 34,64 kA (1 s)
let k = shortCircuit({ ik: 25, tk: 1, ipr: 400 });
eq('Ith 1 s', k.ith1, 25);
eq('ip κ 1,8', k.ip, 1.8 * Math.SQRT2 * 25);
eq('Idyn Norm', k.idynStd, 62.5);
eq('Vielfaches', k.mult, 62.5);
eq('3 s', shortCircuit({ ik: 20, tk: 3 }).ith1, 20 * Math.sqrt(3));
eq('60 Hz Faktor', shortCircuit({ ik: 10, f: 60 }).idynStd, 26);
eq('Ik Trafo 630 kVA', ikFromTrafo({ s: 630, u: 0.4, uk: 4 }), 22.733, 1e-3);
eq('Ik aus Sk 500 MVA 20 kV', ikFromSk({ sk: 500, u: 20 }), 14.434, 1e-3);
// Primärstrom: 630 kVA bei 0,4 kV → 909,3 A; +20 % → 1091 A → 1250 A
let pc = primaryCurrent({ s: 630, u: 0.4, margin: 20 });
eq('Ib', pc.ib, 909.33, 1e-3);
eq('Ipr Norm', pc.ipr, 1250);
eq('Auslastung', pc.load, 909.33 / 1250, 1e-3);
eq('Ipr kleiner', pc.lower, 1000);
pc = primaryCurrent({ p: 400, cos: 0.8, u: 20, margin: 0 });
eq('Ib MS', pc.ib, 500 / (Math.sqrt(3) * 20), 1e-3);
eq('Ipr MS 15 A', pc.ipr, 15);
eq('erweiterter Strom 150 %', primaryCurrent({ s: 630, u: 0.4, margin: 20, ext: 1.5 }).ipr, 750);
eq('Normreihe hoch', iprUp(437), 500);
eq('Normreihe klein', iprUp(8), 10);
eq('Normreihe 12,5', iprUp(11), 12.5);
eq('Normreihe runter', iprDown(1250), 1000);
eq('Normreihe runter 750', iprDown(1000), 750);
// Spannungswandler: 20 kV einpolig isoliert → 11547 V, 57,7 V, e-n 33,3 V, 1,9 · 8 h
let v = vtDesign({ un: 20, pole: 1, earthing: 'isolated', usr: 100, sdev: 30, len: 50, area: 2.5, cls: '0.5' });
eq('Upr', v.upr, 20000 / Math.sqrt(3), 1e-6);
eq('Usr', v.us, 100 / Math.sqrt(3), 1e-6);
eq('Uen', v.uen, 100 / 3, 1e-6);
eq('Spannungsfaktor', v.vf, [1.9, '8h']);
eq('Strom', v.i, 30 / (100 / Math.sqrt(3)), 1e-6);
eq('Spannungsfall %', v.duPct, (v.i * 0.7) / (100 / Math.sqrt(3)) * 100, 1e-6);
eq('Bemessung VT', v.sr, 50);
eq('starr geerdet', vtDesign({ un: 110, earthing: 'effective' }).vf, [1.5, '30s']);
eq('zweipolig', vtDesign({ un: 20, pole: 2 }).vf, [1.2, 'cont']);
console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
