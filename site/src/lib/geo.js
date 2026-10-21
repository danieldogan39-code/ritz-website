// Equal-Earth-Projektion (identisch zu d3.geoEqualEarth) für Kartenpunkte
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
const RAD = Math.PI / 180;
export function equalEarthRaw(lambda, phi) {
  const l = Math.asin(M * Math.sin(phi)), l2 = l * l, l6 = l2 * l2 * l2;
  return [
    (lambda * Math.cos(l)) / (M * (A1 + 3 * A2 * l2 + l6 * (7 * A3 + 9 * A4 * l2))),
    l * (A1 + A2 * l2 + l6 * (A3 + A4 * l2)),
  ];
}
// meta: { scale, translate:[tx,ty] }
export function projectLL(meta, lng, lat) {
  const [x, y] = equalEarthRaw(lng * RAD, lat * RAD);
  return [meta.translate[0] + meta.scale * x, meta.translate[1] - meta.scale * y];
}

// Ländername in der Seitensprache (USA bleibt in Postanschriften international üblich „USA“)
const COUNTRY_FIXED = { US: 'USA' };
const dnCache = {};
export function countryName(code, lang) {
  if (!code) return '';
  if (COUNTRY_FIXED[code]) return COUNTRY_FIXED[code];
  try { return (dnCache[lang] ||= new Intl.DisplayNames([lang], { type: 'region' })).of(code) || code; } catch (e) { return code; }
}
// Anschrift eines RITZ-Standorts: Adresszeilen plus Land in der Seitensprache
export const locAddress = (l, lang) => [...(l.address || []), countryName(l.country, lang)].filter(Boolean);
