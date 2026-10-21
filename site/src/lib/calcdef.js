// Felder der Wandler-Rechner (gemeinsam für Seitenaufbau und Browser-Logik).
// type: num (Zahl mit Einheit) | seg (Schaltfläche je Wert) | select; opts: [Wert, Textschlüssel oder fester Text]
export const CALCS = ['burden', 'factor', 'short', 'primary', 'vt'];

export const FIELDS = {
  burden: [
    { name: 'isr', type: 'seg', def: '5', opts: [['1', '1 A'], ['5', '5 A']] },
    { name: 'len', type: 'num', unit: 'm', def: '20', min: 0, max: 5000 },
    { name: 'area', type: 'select', unit: 'mm²', def: '2.5', opts: [['1.5', '1,5'], ['2.5', '2,5'], ['4', '4'], ['6', '6'], ['10', '10'], ['16', '16']] },
    { name: 'mat', type: 'seg', def: 'cu', opts: [['cu', 'cu'], ['al', 'al']] },
    { name: 'temp', type: 'num', unit: '°C', def: '20', min: -40, max: 120 },
    { name: 'k', type: 'select', def: '2', opts: [['2', 'k2'], ['1', 'k1']] },
    { name: 'dev', type: 'num', unit: 'VA', def: '2.5', min: 0, max: 200, hint: 'devHint' },
    { name: 'rc', type: 'num', unit: 'Ω', def: '0', min: 0, max: 5, hint: 'rcHint', optional: true },
  ],
  factor: [
    { name: 'kind', type: 'seg', def: 'm', opts: [['m', 'metering'], ['p', 'protection']] },
    { name: 'n', type: 'num', unit: '', def: '5', min: 1, max: 100, labelBy: { m: 'nFs', p: 'nAlf' } },
    { name: 'isr', type: 'seg', def: '5', opts: [['1', '1 A'], ['5', '5 A']] },
    { name: 'sr', type: 'num', unit: 'VA', def: '15', min: 0.5, max: 200 },
    { name: 'sb', type: 'num', unit: 'VA', def: '3', min: 0, max: 200, hint: 'sbHint' },
    { name: 'rct', type: 'num', unit: 'Ω', def: '0.2', min: 0, max: 100, hint: 'rctHint' },
    { name: 'ik', type: 'num', unit: 'kA', def: '', min: 0, max: 300, optional: true, only: 'p' },
    { name: 'ipr', type: 'num', unit: 'A', def: '', min: 1, max: 100000, optional: true, only: 'p' },
  ],
  short: [
    { name: 'mode', type: 'seg', def: 'direct', opts: [['direct', 'direct'], ['trafo', 'trafo'], ['grid', 'grid']] },
    { name: 'ik', type: 'num', unit: 'kA', def: '20', min: 0.1, max: 300, only: 'direct' },
    { name: 's', type: 'num', unit: 'kVA', def: '630', min: 1, max: 1e6, only: 'trafo' },
    { name: 'u', type: 'num', unit: 'kV', def: '0.4', min: 0.1, max: 800, only: 'trafo,grid' },
    { name: 'uk', type: 'num', unit: '%', def: '4', min: 0.5, max: 30, only: 'trafo' },
    { name: 'sk', type: 'num', unit: 'MVA', def: '500', min: 1, max: 1e5, only: 'grid' },
    { name: 'tk', type: 'num', unit: 's', def: '1', min: 0.05, max: 5 },
    { name: 'f', type: 'seg', def: '50', opts: [['50', '50 Hz'], ['60', '60 Hz']] },
    { name: 'kappa', type: 'num', unit: '', def: '1.8', min: 1, max: 2, hint: 'kappaHint' },
    { name: 'ipr', type: 'num', unit: 'A', def: '', min: 1, max: 100000, optional: true },
  ],
  primary: [
    { name: 'mode', type: 'seg', def: 's', opts: [['s', 'byS'], ['p', 'byP']] },
    { name: 's', type: 'num', unit: 'kVA', def: '630', min: 0.1, max: 1e7, only: 's' },
    { name: 'p', type: 'num', unit: 'kW', def: '500', min: 0.1, max: 1e7, only: 'p' },
    { name: 'cos', type: 'num', unit: '', def: '0.9', min: 0.1, max: 1, only: 'p' },
    { name: 'u', type: 'num', unit: 'kV', def: '0.4', min: 0.1, max: 800 },
    { name: 'phases', type: 'seg', def: '3', opts: [['3', 'ph3'], ['1', 'ph1']] },
    { name: 'margin', type: 'select', unit: '%', def: '20', opts: [['0', '0'], ['10', '10'], ['20', '20'], ['30', '30'], ['50', '50']] },
    { name: 'ext', type: 'select', def: '1', opts: [['1', 'extNone'], ['1.2', '120 %'], ['1.5', '150 %'], ['2', '200 %']] },
  ],
  vt: [
    { name: 'un', type: 'num', unit: 'kV', def: '20', min: 0.1, max: 800 },
    { name: 'pole', type: 'seg', def: '1', opts: [['1', 'pole1'], ['2', 'pole2']] },
    { name: 'earthing', type: 'select', def: 'isolated', opts: [['isolated', 'isolated'], ['auto', 'auto'], ['effective', 'effective']], only: '1', dep: 'pole' },
    { name: 'usr', type: 'seg', unit: 'V', def: '100', opts: [['100', '100'], ['110', '110'], ['120', '120']] },
    { name: 'cls', type: 'select', def: '0.5', opts: [['0.2', '0,2'], ['0.5', '0,5'], ['1', '1'], ['3', '3'], ['3P', '3P']] },
    { name: 'sdev', type: 'num', unit: 'VA', def: '30', min: 0, max: 500 },
    { name: 'len', type: 'num', unit: 'm', def: '30', min: 0, max: 5000 },
    { name: 'area', type: 'select', unit: 'mm²', def: '2.5', opts: [['1.5', '1,5'], ['2.5', '2,5'], ['4', '4'], ['6', '6'], ['10', '10']] },
  ],
};
// Feld abhängig von einem Umschalter (only: Werte des Felds "mode"/"kind"/"pole")
export const SWITCH = { factor: 'kind', short: 'mode', primary: 'mode', vt: 'pole' };
