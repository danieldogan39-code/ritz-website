// Bericht: Wie gut werden die Konfiguratoroptionen aller Produkte verstanden?
import fs from 'node:fs';
import { optionRole, parseValue, classifyOptions } from '../../src/lib/roles.js';
const P = JSON.parse(fs.readFileSync(new URL('../../src/data/build/products.json', import.meta.url)));
const roles = {}, unparsed = {}, other = {};
for (const p of P) {
  for (const o of p.options?.de || []) {
    const [role, n] = optionRole(o.t, o.type);
    roles[role] = (roles[role] || 0) + 1;
    if (role === 'other') (other[o.t] = (other[o.t] || 0) + 1);
    for (const [, label] of o.v || []) {
      const pv = parseValue(role, label);
      if (!pv && !['special', 'extras', 'other', 'type', 'damping', 'kpcr', 'secins', 'rbr', 'ratio'].includes(role)) {
        const k = role + ' | ' + label.replace(/\d+(?:[.,]\d+)?/g, '#');
        unparsed[k] = (unparsed[k] || 0) + 1;
      }
    }
  }
}
console.log('Rollen', Object.entries(roles).sort((a, b) => b[1] - a[1]));
console.log('Sonstige Titel', Object.entries(other).sort((a, b) => b[1] - a[1]).slice(0, 30));
console.log('Nicht gelesene Werte', Object.entries(unparsed).sort((a, b) => b[1] - a[1]).slice(0, 40));
// Stichprobe Klassen
const cls = {};
for (const p of P) for (const o of p.options?.de || []) { const [role] = optionRole(o.t, o.type); if (role === 'cls') for (const [, l] of o.v || []) { const pv = parseValue('cls', l); const k = l + ' → ' + JSON.stringify(pv); cls[k] = (cls[k] || 0) + 1; } }
console.log(Object.entries(cls).sort((a, b) => b[1] - a[1]).slice(0, 45).map(([k, n]) => n + '  ' + k).join('\n'));
